const Productmodel = require("../models/product");
const usermodel = require("../models/user");
const { sendmail } = require("../controllers/notification");
//add new product
const addProduct = async (req, res) => {
  const { title, brand, stock = 1, description, price, category } = req.body;
  try {
    const exist = await Productmodel.findOne({
      title,
      brand,
      ownerId: req.user._id,
    });
    // update stock
    if (exist) {
      exist.stock += stock;
      await exist.save();
      await sendmail(
        req.user.email,

        "Product updated Successfully",
        `        
hello :${req.user.name}
We are pleased to inform you that your product has been successfully added to our store.
Product Details:
-  Name: ${exist.title}
-  Store: ${user.storename}
-  Brand: ${exist.brand}
-  Category: ${exist.category.name}
-  Description: ${exist.description}
-  Stock: ${exist.stock}
-  Price: ${exist.price} EGP
-  NOTE:we will take 10% from your price to publish your product on our web site
Thank you for trusting us and we wish you great sales`,
        null,
        req.user._id
      );
      res.status(200).json({
        message: "Stock updated",
        product: exist,
      });
      if (req.user.role === "seller") {
        const user = await usermodel.findById(req.user._id);
        //send email product updated
      }
    } else {
      let imageUrl = "";

      if (req.file) {
        imageUrl = req.file.path;
      }

      const newProduct = await Productmodel.create({
        title,
        brand,
        stock,
        description,
        price,
        category,
        ownerId: req.user._id,
        Images: imageUrl,
      });

      await sendmail(
        req.user.email,
        "Product added Successfully",
        `        
hello :${req.user.name}
We are pleased to inform you that your product has been successfully added to our store.
Product Details:
-  Name: ${newProduct.title}
-  Brand: ${newProduct.brand}
-  Store: ${user.storename}
-  Category: ${newProduct.category.name}
-  Description: ${newProduct.description}
-  Stock: ${newProduct.stock}
-  Price: ${newProduct.price} EGP
NOTE:we are  take 10% from your price to publish your product on our web site
Thank you for trusting us and we wish you great sales`,
        null,
        req.user._id
      );
      res.status(201).json("product add successfully");
      if (req.user.role === "seller") {
        const user = await usermodel.findById(req.user._id);
        //send email product added
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
  const { slug } = req.params;
  const product = await Productmodel.findOne({ slug });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  } else res.status(200).json(product);
};
//update the product by _slug function
const updateProduct = async (req, res) => {
  const { slug } = req.params;
  const data = req.body;
  const userId = req.user._id;
  const userRole = req.user.role;

  try {
    let product;

    if (userRole === "admin") {
      // الادمن يقدر يحدث أي منتج بناءً على slug فقط
      const updatedProduct = await Productmodel.findOneAndUpdate(
        { slug },
        data,
        { new: true }
      );
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res
        .status(200)
        .json({ message: "Product updated by admin", product: updatedProduct });
    } else {
      // البائع يحدث فقط منتجاته
      product = await Productmodel.findOne({ slug, ownerId: userId });
      if (!product) {
        return res
          .status(404)
          .json({ message: "Product not found or not authorized" });
      }

      const updatedProduct = await Productmodel.findOneAndUpdate(
        { slug, ownerId: userId },
        data,
        { new: true }
      );

      return res
        .status(200)
        .json({
          message: "Product updated by seller",
          product: updatedProduct,
        });
    }
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
  const { slug } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;
  //determine role
  try {
    let product;
    if (userRole === "admin") {
      product = await Productmodel.findOne({ slug });
    } else {
      product = await Productmodel.findOne({ slug, ownerId: userId });
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (userRole === "admin") {
      // stock decrease by admin
      if (product.stock > 1) {
        await Productmodel.findOneAndDelete({ slug, ownerId: userId });
        return res
          .status(200)
          .json({ message: "Product deleted completely by (admin)" });
      }
    }
    // sellers can delete their own products
    if (!product.ownerId || product.ownerId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this product" });
    }
    // stock decrease by seller
    if (product.stock > 1) {
      await Productmodel.findOneAndDelete({ slug, ownerId: userId });
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
// Search products by title or category name
const searchProducts = async (req, res) => {
  const { q } = req.query;
  try {
    const products = await Productmodel.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { "category.name": { $regex: q, $options: "i" } },
      ],
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "No products match your search" });
    }

    return res.status(200).json(products);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Search failed", error: error.message });
  }
};

const sortProducts = async (req, res) => {
  const { sort, sortBy } = req.query;

  const sortOption = {};

  const validSortFields = ["title", "createdAt"];

  if (sortBy && validSortFields.includes(sortBy)) {
    if (sort === "asc") {
      sortOption[sortBy] = 1; //ترتيب تصاعدي
    } else {
      sortOption[sortBy] = -1; //ترتيب تنازلي
    }
  } else {
    sortOption["createdAt"] = -1;
  }

  try {
    const products = await Productmodel.find().sort(sortOption);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to sort products",
      error: error.message,
    });
  }
};

const filterByCategory = async (req, res) => {
  const { categoryName } = req.query;
  if (!categoryName)
    return res.status(400).json({ message: "categoryName required" });

  try {
    const products = await Productmodel.find({
      "category.name": { $regex: categoryName, $options: "i" },
    });
    if (products.length === 0)
      return res
        .status(404)
        .json({ message: "No products found for this category" });
    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error filtering by category", error: error.message });
  }
};

// فلترة بالtitle
const filterByTitle = async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ message: "title required" });

  try {
    const products = await Productmodel.find({
      title: { $regex: title, $options: "i" },
    });
    if (products.length === 0)
      return res
        .status(404)
        .json({ message: "No products found with this title" });
    res.status(200).json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error filtering by title", error: error.message });
  }
};

// فلترة بالسعر
const filterByPrice = async (req, res) => {
  const { minPrice, maxPrice } = req.query;
  const filter = {};

  if (minPrice && maxPrice) {
    filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  } else if (minPrice) {
    filter.price = { $gte: Number(minPrice) };
  } else if (maxPrice) {
    filter.price = { $lte: Number(maxPrice) };
  }

  try {
    const products = await Productmodel.find(filter);
    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found in this price range" });
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Error filtering products by price",
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
  searchProducts,
  sortProducts,
  filterByCategory,
  filterByTitle,
  filterByPrice,
};
