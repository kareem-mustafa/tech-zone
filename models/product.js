const mongoose = require("mongoose");
const slugify  =require("slugify")
const validator = require("validator");
const productSchema = mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  description: {
type: String,
  required: [true, "Description is required"],

  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  Images: {
     type: String,
     match: /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  slug:{
    type: String,
    unique: true,
    lowercase: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  category: {
    id: { type: Number },
    name: { type: String, required: [true, "name of category is required"] },
  },
  stock: {
    type: Number,
  },
  brand: {
    type: String,
    required: [true, "brand is required"],
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  }
  });
  productSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      trim: true
    });
  }
  next();
});
module.exports = mongoose.model("Product", productSchema);