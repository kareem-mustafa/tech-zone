const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    // required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  message: {
    type: String,

  },
  status: {
    type: String,
    enum: ["confirmed", "pending", "rejected", "verified"],
    default: "confirmed",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  OTP:{
    type:String
  },
  expiresAt: {
  type: Date,
  required: false
}
});
const notificationmodel = mongoose.model("notification", notificationSchema);
module.exports = notificationmodel ;
