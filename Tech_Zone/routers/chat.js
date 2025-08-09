const express = require("express");
const auth =require("../middlewares/auth")
const {isAdmin,isSellerOrAdmin} =require("../middlewares/roles")
const router = express.Router();
const {send_message,get_user_messages, replyfromadmin,get_Alluser_messages} =require("../controllers/chat")
router.post("/",auth,send_message)
router.post("/reply",auth,isAdmin,replyfromadmin)
router.get("/:userId",auth,get_user_messages)
router.get("/",auth,isAdmin,get_Alluser_messages)

module.exports=router