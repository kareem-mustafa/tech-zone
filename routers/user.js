const express = require("express");
const { verify, resendOTP } = require("../controllers/notification");
const router = express.Router();
const auth = require("../middlewares/auth");
const { isAdmin, isSellerOrAdmin } = require("../middlewares/roles");
const upload = require("../middlewares/multer");

const {
  deleteUser,
  updateUser,
  getAllUser,
  getUser,
  register,
  login,
  forgetpassword,
  resetpassword,
  updatepassword,
  approveSeller,
} = require("../controllers/user");
router.get("/", auth, isAdmin, getAllUser);
router.get("/:id", auth || isAdmin, getUser);
router.delete("/:id", auth || isAdmin, deleteUser);
router.put("/:id", auth || isAdmin, updateUser);
router.post(
  "/register",
  upload.fields([{ name: "bankAccountImage" }, { name: "profileImage" }]),
  register
);
router.post("/login", login);
router.post("/forget", forgetpassword);
router.post("/update", updatepassword);
router.post("/reset/:token", resetpassword);
router.post("/verify", verify);
router.post("/resend-otp/:userId", resendOTP);
router.put("/approve-seller/:sellerId", auth, isAdmin, approveSeller);

module.exports = router;