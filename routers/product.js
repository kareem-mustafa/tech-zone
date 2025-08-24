const express = require("express");
const router = express.Router();
const auth = require('../middlewares/auth');
const upload = require("../middlewares/multer");



const {
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
  filterByPrice
} = require("../controllers/product");

const { isSellerOrAdmin, isAdmin } = require("../middlewares/roles");

router.post("/", auth, isSellerOrAdmin, upload.single("images"), addProduct);
router.get("/seller/:id",auth,isSellerOrAdmin , getProductsBySellerId);
router.get("/search", searchProducts);      
router.get("/sort", sortProducts); 
router.get("/filter/category", filterByCategory);
router.get("/filter/title", filterByTitle);
router.get("/filter/price", filterByPrice);
router.get("/", getAllProducts);
router.get("/slug/:slug", getProductById);
router.put("/:slug", auth, isSellerOrAdmin, updateProduct);
router.delete("/:slug", auth, isSellerOrAdmin, deleteProduct);


module.exports = router;      