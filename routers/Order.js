const express = require("express");
const router = express.Router();
const { addOrder,getOrder,updateOrder ,deleteOrder,checkoutSession,getAllOrders,getOrdersBySeller} = require("../controllers/Order");
const auth = require("../middlewares/auth");
const { isAdmin, isSellerOrAdmin } = require("../middlewares/roles");


router.post("/add", auth, addOrder);
router.get("/:id", getOrder);
router.put("/update", auth, updateOrder);
router.delete("/delete/:orderId", auth, deleteOrder);
router.post("/checkout", auth, checkoutSession);
router.get("/", auth, isAdmin, getAllOrders);
router.get("/seller/:id", auth, isSellerOrAdmin, getOrdersBySeller);
module.exports = router;