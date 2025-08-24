const mongoose = require("mongoose");

const chatschema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  message: {
    type: String,
    match: /^[A-Za-z\u0600-\u06FF.\-\s]*$/,
  },
  reply: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatmodel = mongoose.model("chat", chatschema);
module.exports = chatmodel;