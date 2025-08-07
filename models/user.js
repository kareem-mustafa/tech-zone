const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const Userschema = mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: true,
    minLength: 5,
    match: /^[A-Za-z\u0600-\u06FF.\-\s]{5,40}$/,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    match:
      /^[a-zA-Z]{4,15}[0-9]{0,3}[-._]{0,1}[a-zA-Z]{0,15}(@)(gmail|yahoo|oulook|hotmail)(.com)/,
    validate: {
      validator: validator.isEmail,
      message: "Please provide a valid email address",
    },
  },
  password: {
    type: String,
    trim: true,
    required: true,
    minlength: [6, "Password must be at least 6 characters long"],
    validate: {
      validator: function (value) {
        return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(value);
      },
    },
  },
  phonenumber: {
    type: String,
    trim: true,
    required: true,
    match: /^(01)(0|1|2|5)[0-9]{8}$/,
  },
  role: {
    type: String,
    trim: true,
    enum: ["user", "seller", "admin"],
    default: "user",
  },
  gender: {
    type: String,
    trim: true,
    Lowercase: true,
    enum: ["male", "female"],
    required: function () {
      return this.role === "seller";
    },
  },
  BankAccount: {
    type: String,
    trim: true,
    match: /^[0-9]{14}$/,
    required: function () {
      return this.role === "seller";
    },
  },
  address: {
    type: String,
    trim: true,
    required: function () {
      return this.role === "seller";
    },
  },
  age: {
    type: Number,
    min: 18,
    required: function () {
      return this.role === "seller";
    },
  },
  resetToken: {
    type: String,
  },
  resetTokenExpire: {
    type: Date,
  },
});

// hash password
Userschema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});
//compare the password and hash password
Userschema.methods.matchPassword = function (enterPassword) {
  return bcrypt.compare(enterPassword, this.password);
};
const usermodel = mongoose.model("user", Userschema);
module.exports = usermodel;
