const orderModel = require("../models/Order");
const productModel = require("../models/product");
const cartModel = require("../models/cart");

const addOrder = async (req, res) => {

  try {
    const {
      userId,
      paymentMethodType = "cash",
      shippingDetails,
      city,
      phoneNumber,
      isPaid
    } = req.body;
    //get cart
    const cart = await cartModel.findOne( { user: userId } ).populate("items.product");
    if (!cart) {
      return res.status(404).json({ message: "Cart not found for this user" });
    }
    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
  
    }));
    let shippingPrice=50;
    const Total_Order_Price = cart.totalPrice + shippingPrice;
    const newOrder = await orderModel.create({
      user: userId,
      items: orderItems,
      productPrice: cart.totalPrice,
      ShippingPrice:shippingPrice,
      Total_Order_Price,
      paymentMethodType,
      ShippingAddress: {
        details: shippingDetails,
        city,
        PhoneNumber: phoneNumber
      },
      isPaid,
    });
    // check & decrement product stock
    if (newOrder) {
      for (let item of cart.items) {
        if (item.quantity > item.product.stock) {
          return res.status(400).json({ message: `Only ${item.product.stock} of "${item.product.title}" available.` });
        }
        await productModel.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity }
        });
      }
      await cartModel.deleteOne({ user: userId }); //deleted cart User

    }

    res.status(201).json({ message: "Order created successfully", order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create order", error: err.message });
  }
};

const getOrder = async (req, res) => {
 const Id  = req.params.id;
  try {
const order = await orderModel.findOne({user:Id})
      .populate({
        path: "user",
        select: "username -_id",
      })
      .populate({
        path: "items.product",
        select: "title description price -_id"
      });
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Error fetching cart", error: err.message });
  }
};
const updateOrder = async (req, res) => {
  const { userId, productId, newQuantity, action = "update" } = req.body;

  try {
    const order = await orderModel.findOne({ user: userId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const product = await productModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const index = order.items.findIndex(item => item.product.toString() === productId);

    if (action === "remove") {
      if (index === -1) return res.status(404).json({ message: "Product not in order" });
      product.stock += order.items[index].quantity;
      order.items.splice(index, 1);
    }

    else if (action === "update") {
      if (index === -1) return res.status(404).json({ message: "Product not in order" });
      product.stock += order.items[index].quantity;
      if (newQuantity > product.stock)
        return res.status(400).json({ message: `Only ${product.stock} available` });
      order.items[index].quantity = newQuantity;
      product.stock -= newQuantity;
    }

    else if (action === "add") {
      if (index !== -1) return res.status(400).json({ message: "Product already in order" });
      if (newQuantity > product.stock)
        return res.status(400).json({ message: `Only ${product.stock} available` });
      order.items.push({ product: productId, quantity: newQuantity });
      product.stock -= newQuantity;
    }

    else return res.status(400).json({ message: "Invalid action" });

    await product.save();
    await order.populate("items.product");

    const productPrice = order.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity, 0
    );

    const shippingPrice = 50;
    order.productPrice = productPrice;
    order.ShippingPrice = shippingPrice;
    order.Total_Order_Price = productPrice + shippingPrice;

    await order.save();

    res.status(200).json({
      message: "Order updated",
      order,
      prices: {
        productPrice,
        shippingPrice,
        totalOrderPrice: order.Total_Order_Price
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};
const deleteOrder = async (req, res) => {
  const { userId } = req.body;

  try {
    const order = await orderModel.findOne({ user: userId }).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });
    for (const item of order.items) {
      const product = item.product;
      product.stock += item.quantity;
      await product.save();
    }
    await orderModel.deleteOne({ _id: order._id });
    res.status(200).json({ message: "Order deleted and stock updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting order", error: error.message });
  }
};

module.exports = { addOrder,getOrder,updateOrder,deleteOrder };
