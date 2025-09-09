const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
const session = require("express-session");
const dotenv = require("dotenv");
dotenv.config();
app.use("/webhook", require("./routers/Webhook"));
app.use(express.json());
app.use(cors({
  origin: '*',  // دومين الفرونت
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}));
const compression = require("compression");
app.use(compression());
//Encryption
const mongoose = require("mongoose");
const mongourl = process.env.MONGO_URL;
const port = process.env.PORT;
// connect with database
mongoose
  .connect(mongourl)
  .then(() => {
    console.log(`hello from mongodb`);
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

//multer
app.use("/images", express.static(path.join(__dirname, "images"))); //بحتاجها عشان اعرف اعرض الصورة ف البراوزر

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
//import routes
const userRoutes = require("./routers/user");
const productRoutes = require("./routers/product");
const wishlistRoutes = require("./routers/wishlist");
const chatRoutes = require("./routers/chat");
const cartRoutes = require("./routers/cart");
const orderRoutes = require("./routers/Order");
const passport = require("./config/passport");
const googleRoutes = require("./routers/google");
const InvoicePDF = require("./routers/invoice");
app.use(passport.initialize());
app.use(passport.session());
//API path
app.use("/wishlist", wishlistRoutes);
app.use("/user", userRoutes);
app.use("/product", productRoutes);
app.use("/chat", chatRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/auth", googleRoutes);
app.use("/", InvoicePDF);

app.get("/", (req, res) => {
  res.send("hello from server");
});

if (process.env.NODE_ENV !== "production") {
  // محلي
  app.listen(port, () => {
    console.log(`hello from server`);
  });
} 

module.exports = app;