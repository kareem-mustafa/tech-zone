const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());

//Encryption
const dotenv = require("dotenv");
dotenv.config();
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
app.use("/images", express.static(path.join(__dirname, 'images')));//بحتاجها عشان اعرف اعرض الصورة ف البراوزر

//import routes
const userRoutes = require("./routers/user");
const productRoutes = require("./routers/product");
const wishlistRoutes = require("./routers/wishlist");
const chatRoutes =require("./routers/chat")
const cartRoutes =require("./routers/cart")
const orderRoutes =require("./routers/order")

//API path
app.use("/wishlist", wishlistRoutes);
app.use("/user", userRoutes);
app.use("/product", productRoutes);
app.use("/chat", chatRoutes);
app.use("/cart", cartRoutes);
app.use("/order",orderRoutes );
app.listen(port, () => {
  console.log(`hello from port : ${port}`);
});
