const express = require("express");
const router = express.Router();
const { addToCart,getCart,getAllCarts ,updateCart,removeItem,deleteCart} = require("../controllers/cart");
const auth = require("../middlewares/auth");
const { isSellerOrAdmin } = require("../middlewares/roles");
router.post("/add", auth, addToCart);
router.get("/get", auth, isSellerOrAdmin, getAllCarts);
router.get("/:id", auth, getCart);
router.put("/update", auth, updateCart);
router.delete("/removeItem", auth, removeItem);
router.delete("/", auth, deleteCart);

module.exports = router;
