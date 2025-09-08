const passport =require("passport");
const googlestrategy=require("passport-google-oauth20").Strategy;
// const session = require("express-session");
const express = require("express");
const usermodel =require("../models/user");
require("dotenv").config();
const app = express();
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true
// }));
passport.use(new googlestrategy({
    clientID: process.env.ClientID,
    clientSecret: process.env.ClientSecret,
    callbackURL: "https://tech-zone-update.vercel.app/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {

    let user = await usermodel.findOne({ googleID: profile.id });
    if (!user) {
        user = await usermodel.create({
            googleID: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            profileImage: profile.photos[0].value,
            isVerified: true,
            role: "user"
        });
    }
        await user.save();
        return done(null, user);
    } catch (error) {
        console.error("Error occurred while processing Google OAuth:", error);
        done(error, null);
    }
}));
;
module.exports = passport;