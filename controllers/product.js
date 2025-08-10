const Productmodel = require("../models/product");
//add new product
const addProduct = async (req, res) => {
  const { title, brand, stock = 1, description, price, category } = req.body;

  try {
    const exist = await Productmodel.findOne({ title, brand });
    if (exist) {
      exist.stock += +stock;
      await exist.save();
      res.status(200).json({
        message: "Stock updated",
        product: exist,
      });
      if (req.user.role === "seller") {
        await sendmail(
          req.user.email,
          "Product updated Successfully",
          `        
hello :${req.user.name}
We are pleased to inform you that your product has been successfully added to our store.
Product Details:
- 🏷 Name: ${exist.title}
- 🏢 Brand: ${exist.brand}
- 🗂 Category: ${exist.category.name}
- 📝 Description: ${exist.description}
- 📦 Stock: ${exist.stock}
- 💰 Price: ${exist.price} EGP
- NOTE:we will take 10% from your price to publish your product on our web site
Thank you for trusting us and we wish you great sales`,
          null,
          req.user._id
        );
      }
    } else {
      const imageUrl = req.file ? `/images/${req.file.filename}` : "";
      const newProduct = await Productmodel.create({
        title,
        brand,
        stock,
        description,
        price,
        category,
        Images: { url: imageUrl },

        ownerId: req.user._id,

        ownerId: req.user._id

      });

      return res.status(201).json({
        message: "Product added successfully",
        product: newProduct,
      });
      if (req.user.role === "seller") {
        await sendmail(
          req.user.email,
          "Product added Successfully",
          `        
hello :${req.user.name}
We are pleased to inform you that your product has been successfully added to our store.
Product Details:
- 🏷 Name: ${newProduct.title}
- 🏢 Brand: ${newProduct.brand}
- 🗂 Category: ${newProduct.category.name}
- 📝 Description: ${newProduct.description}
- 📦 Stock: ${newProduct.stock}
- 💰 Price: ${newProduct.price} EGP
NOTE:we are  take 10% from your price to publish your product on our web site
Thank you for trusting us and we wish you great sales`,
          null,
          req.user._id
        );
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to add/update product",
      error: error.message,
    });
  }
};

// display ALL products function
const getAllProducts = async (req, res) => {
  try {
    const ALLproducts = await Productmodel.find();
    res.status(200).json(ALLproducts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};
// display the product by _ID function
const getProductById = async (req, res) => {
  const id = req.params.id;
  const product = await Productmodel.findOne({ _id: id });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  } else res.status(200).json(product);
};
//update the peoduct by _ID functiona
const updateProduct = async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    const product = await Productmodel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (userRole === "admin") {
      await Productmodel.findByIdAndUpdate(id, data, { new: true }); //new بيرجع اخر نسخة معدلة يعني بغد التحديث
      return res.status(200).json({ message: "Product updated by admin" });
    }

    // السماح للسيلر لو هو صاحب المنتج
    if (!product.ownerId || product.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this product" });
    }

    await Productmodel.findByIdAndUpdate(id, data, { new: true });
    return res.status(200).json({ message: "Product updated by seller" });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({
      message: "Cannot update product",
      error: err.message,
    });
  }
};

//delete the product by _ID function
const deleteProduct = async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    const product = await Productmodel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (userRole === "admin") {
      if (product.stock > 1) {
        product.stock -= 1;
        await product.save();
        return res.status(200).json({ message: "Stock decreased by 1" });
      } else {
        await Productmodel.findByIdAndDelete(id);
        return res
          .status(200)
          .json({ message: "Product deleted completely by (admin)" });
      }
    }
    if (!product.ownerId || product.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this product" });
    }
    if (product.stock > 1) {
      product.stock -= 1;
      await product.save();
      return res.status(200).json({ message: "Stock decreased by 1" });
    } else {
      await Productmodel.findByIdAndDelete(id);
      return res
        .status(200)
        .json({ message: "Product deleted completely by seller" });
    }
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      message: "Error deleting product",
      error: err.message,
    });
  }
};

// get products by seller ID (from params)
const getProductsBySellerId = async (req, res) => {
  const sellerId = req.params.id;

  try {
    const products = await Productmodel.find({ ownerId: sellerId });

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this seller" });
    }

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching seller's products:", error);
    return res.status(500).json({
      message: "Failed to fetch seller's products",
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySellerId,
};
