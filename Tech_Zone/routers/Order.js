const express = require("express");
const router = express.Router();
const { addOrder,getOrder,updateOrder ,deleteOrder} = require("../controllers/Order");
const auth = require("../middlewares/auth");

router.post("/add",auth, addOrder);
router.get("/:id",auth,getOrder);
router.put("/update",auth, updateOrder);
router.delete("/delete",auth, deleteOrder);

module.exports = router;
