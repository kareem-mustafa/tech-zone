const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["confirmed", "pending", "rejected"],
    default: "confirmed",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const notificationmodel = mongoose.model("notification", notificationSchema);
module.exports = notificationmodel ;
