const passport = require("passport");
const jwt = require("jsonwebtoken");
const googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});
const googleCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { session: false, failureRedirect: "https://tech-zoone.vercel.app/login" },
    async (err, user) => {
      if (err || !user) return res.redirect("https://tech-zoone.vercel.app/home");
      try {
        const token = jwt.sign(
          {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
          process.env.SECRET_KEY,
          { expiresIn: "7d" }
        );
        const encodedUser = encodeURIComponent(JSON.stringify(user));
        return res.redirect(
          `https://tech-zoone.vercel.app/home?token=${token}&user=${encodedUser}`
        );
      } catch (error) {
        console.error("Error generating JWT:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  )(req, res, next);
};

const homePage = (req, res) => {
  res.send("<a href='auth/auth/google'>Login with Google</a>");
};
module.exports = {
  googleLogin,
  googleCallback,
  homePage,
};
