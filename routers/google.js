const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  googleLogin,
  googleCallback,
  homePage,
} = require("../controllers/google");
router.get("/", homePage);
router.get("/auth/google", googleLogin);
router.get("/auth/google/callback",googleCallback);

module.exports = router;