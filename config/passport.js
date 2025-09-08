const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.ClientID,
      clientSecret: process.env.ClientSecret,
      callbackURL: "https://tech-zoone.vercel.app/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleID: profile.id });
        if (!user) {
          user = await User.create({
            googleID: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            profileImage: profile.photos[0].value,
            isVerified: true,
            role: "user",
          });
        }
        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;
