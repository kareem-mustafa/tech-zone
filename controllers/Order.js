const orderModel = require("../models/Order");
require("dotenv").config();
const stripe = require("stripe")(process.env.Stripe_SECRET);
STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const { sendmail } = require("../controllers/notification");
const productModel = require("../models/product");
const cartModel = require("../models/cart");
const userModel = require("../models/user");
const addOrder = async (req, res) => {
  try {
    const {
      userId,
      paymentMethodType = "cash",
      fullName,
      address,
      city,
      phone,
    } = req.body;

    // التحقق من وجود المستخدم
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // التحقق من وجود الكارت
    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.product");
    if (!cart) {
      return res.status(404).json({ message: "Cart not found for this user" });
    }

    // التحقق إن الكارت مش فاضي
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    // Check if user is ordering their own product
    if (cart.items.some((i) => i.product.ownerId == userId)) {
      return res.status(400).json({
        message: "You cannot order your own product.",
      });
    }

    // التحقق من المخزون
    for (let item of cart.items) {
      if (item.quantity > item.product.stock) {
        return res.status(400).json({
          message: `Only ${item.product.stock} of "${item.product.title}" available.`,
        });
      }
    }

    // تجهيز بيانات المنتجات في الأوردر
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    // حساب السعر الكلي
    const shippingPrice = 50; // سعر الشحن ثابت أو يمكن تعديله
    const totalOrderPrice = cart.totalPrice + shippingPrice;

    // إنشاء الأوردر
    const newOrder = await orderModel.create({
      user: userId,
      items: orderItems,
      shippingAddress: {
        fullName,
        address,
        city,
        phone,
      },
      paymentMethodType,
      totalOrderPrice,
      paymentStatus: "pending",
      isDelivered: false,
    });

    // تحديث المخزون
    for (let item of cart.items) {
      await productModel.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // حذف الكارت بعد إنشاء الأوردر
    await cartModel.deleteOne({ user: userId });
    await sendmail(
      user.email,
      "Order Confirmation",
      `  hello:${user.name}
    Product Details:
       -  Name:  "${cart.items
         .map((item) => item.product.title)
         .join("   ,   ")}" has been confirmed
       -  Price: ${newOrder.totalOrderPrice} EGP.
       -  shipping address is ${newOrder.shippingAddress.city}
    `,
      newOrder._id,
      userId
    );
    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to create order", error: err.message });
  }
};
const getOrder = async (req, res) => {
  const Id = req.params.id;
  try {
    const order = await orderModel
      .find({ user: Id })
      .populate({
        path: "user",
        select: "username -_id",
      })
      .populate({
        path: "items.product",
        select: "title description price -_id",
      });
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching cart", error: err.message });
  }
};
const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate("user")
      .populate("items.product");
    res.status(200).json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: err.message });
  }
};
const getOrdersBySeller = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const orders = await orderModel
      .find({
        "items.product": { $exists: true },
      })
      .populate({
        path: "items.product",
        select: "title price ownerId",
        match: { ownerId: sellerId },
      });
    const filteredOrders = orders.filter((order) =>
      order.items.some((item) => item.product !== null)
    );

    res.status(200).json(filteredOrders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: err.message });
  }
};
const updateOrder = async (req, res) => {
  const { userId, productId, newQuantity, action = "update" } = req.body;

  try {
    const order = await orderModel
      .findOne({ user: userId })
      .populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const index = order.items.findIndex(
      (item) => item.product._id.toString() === productId
    );

    // حذف منتج من الأوردر
    if (action === "remove") {
      if (index === -1)
        return res.status(404).json({ message: "Product not in order" });
      product.stock += order.items[index].quantity;
      order.items.splice(index, 1);
    }

    // تحديث الكمية
    else if (action === "update") {
      if (index === -1)
        return res.status(404).json({ message: "Product not in order" });
      product.stock += order.items[index].quantity; // رجّع المخزون القديم
      if (newQuantity > product.stock)
        return res
          .status(400)
          .json({ message: `Only ${product.stock} available` });
      order.items[index].quantity = newQuantity;
      order.items[index].price = product.price;
      product.stock -= newQuantity;
    }

    // إضافة منتج جديد
    else if (action === "add") {
      if (index !== -1)
        return res.status(400).json({ message: "Product already in order" });
      if (newQuantity > product.stock)
        return res
          .status(400)
          .json({ message: `Only ${product.stock} available` });
      order.items.push({
        product: productId,
        quantity: newQuantity,
        price: product.price,
      });
      product.stock -= newQuantity;
    } else return res.status(400).json({ message: "Invalid action" });

    // حفظ التغييرات
    await product.save();
    // حساب السعر الإجمالي
    const totalOrderPrice =
      order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
      50; // سعر الشحن

    order.totalOrderPrice = totalOrderPrice;
    if (req.body.shippingAddress) {
      order.shippingAddress = req.body.shippingAddress;
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Order updated successfully",
      order,
      prices: {
        totalOrderPrice,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

const deleteOrder = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await orderModel.findById(orderId).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // تحديث المخزون
    for (const item of order.items) {
      const product = item.product;
      if (product) {
        //  تحقق الأول أن المنتج موجود
        product.stock += item.quantity;
        await product.save();
      }
    }

    await orderModel.deleteOne({ _id: order._id });

    res
      .status(200)
      .json({ message: "Order deleted and stock updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting order", error: error.message });
  }
};
const checkoutSession = async (req, res) => {
  const userId = req.body.userid;
  try {
    const order = await orderModel.findOne({ user: userId }).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });
    // التحقق من طريقة الدفعs
    else if (order.paymentMethodType === "cash") {
      return res
        .status(404)
        .json({ message: "Cash payments are not supported" });
    } else if (order.paymentStatus === "paid") {
      return res.status(404).json({ message: "Order already paid" });
    }
    // جلب السعر الإجمالي
    const totalOrderPrice = order.totalOrderPrice;
    if (!totalOrderPrice || totalOrderPrice <= 0) {
      return res.status(400).json({ message: "Invalid order price" });
    }

    // إنشاء جلسة دفع Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Order #${order._id}`,
            },
            unit_amount: Math.round(totalOrderPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://tech-zoone.vercel.app/order`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel`,
      customer_email: order.user.email || undefined,
      metadata: {
        order_id: order._id.toString(),
      },
    });

    const confirmationMessage = ` Please review your order details before payment. 
Changes or refunds take time and are handled only by the admin.`;

    res.status(200).json({ message: confirmationMessage, url: session.url });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error creating checkout session",
        error: error.message,
      });
  }
};

module.exports = {
  addOrder,
  getOrder,
  updateOrder,
  deleteOrder,
  checkoutSession,
  getAllOrders,
  getOrdersBySeller,
};
