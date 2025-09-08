const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

// بدء تسجيل الدخول
const googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});

// Callback بعد تسجيل الدخول
const googleCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false, failureRedirect: "https://tech-zoone.vercel.app/login" },
    (err, user) => {
      if (err || !user)
        return res.redirect("https://tech-zoone.vercel.app/login");

      try {
        // توليد JWT
        const token = jwt.sign(
          {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          process.env.SECRET_KEY,
          { expiresIn: "7d" }
        );

        // إعادة التوجيه للـ Angular مع الـ token
        return res.redirect(
          `https://tech-zoone.vercel.app/home?token=${token}`
        );
      } catch (error) {
        console.error("JWT generation error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  )(req, res, next);
};

// صفحة اختبارية لتسجيل الدخول
const homePage = (req, res) => {
  res.send('<a href="/auth/google">Login with Google</a>');
};

module.exports = {
  googleLogin,
  googleCallback,
  homePage,
};
