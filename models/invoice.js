const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    TotalOrderPrice: {
      // السعر الإجمالي قبل الدفع أو الخصم
      type: Number,
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
const Invoice = mongoose.model("Invoice", invoiceSchema);
module.exports = Invoice;
