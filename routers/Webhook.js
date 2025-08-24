const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.Stripe_SECRET);
const orderModel = require("../models/Order");
require('dotenv').config();
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // لو الدفع نجح
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata.order_id;

    await orderModel.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      isDelivered: true
    });
  }

  res.status(200).json({ received: true });
});

module.exports = router;
