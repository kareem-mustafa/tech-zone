const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require('../middlewares/auth');
const upload = require("../middlewares/multer");

const {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySellerId
} = require("../controllers/product");

const { isSellerOrAdmin, isAdmin } = require("../middlewares/roles");


router.post("/", auth, isSellerOrAdmin, upload.single("images"), addProduct);
router.post("/", auth, isSellerOrAdmin, addProduct);
router.get("/seller/:id", getProductsBySellerId);
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.put("/:id", auth, isSellerOrAdmin, updateProduct);
router.delete("/:id", auth, isSellerOrAdmin, deleteProduct);


module.exports = router;