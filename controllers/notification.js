const nodemailer = require("nodemailer");
const notificationmodel = require("../models/notification");
const usermodel = require("../models/user");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // اتأكد إنه معمول في مكان ما في المشروع (server.js أو هنا)
const emailTemplate = ({ title, body, footer }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      background-color: #f4f6f8;
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: #ffffff;
      margin: auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header {
      background: #0d6efd;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
      color: #333;
      line-height: 1.6;
      font-size: 15px;
    }
    .button {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 25px;
      background: #0d6efd;
      color: #fff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
    .footer {
      background: #f1f1f1;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${title}</div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      ${footer || "© Tech Zone – All rights reserved"}
    </div>
  </div>
</body>
</html>
`;

// create transport
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.EMAIL_PASSWORD, // لازم App Password لو حساب جيميل فيه 2FA
  },
});

// verify transport on startup (helps debug)
transport.verify((err, success) => {
  if (err) {
    console.error("SMTP verify failed:", err);
  } else {
    console.log("SMTP server is ready to take messages");
  }
});

// helper: generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// sendmailPDF (كما عندك) - مع نفس التعامل مع الأخطاء
const sendmailPDF = async (to, subject, text, pdfBuffer, orderId, userId) => {
  try {
    const html = emailTemplate({
      title: "🧾 Your Invoice is Ready",
      body: `
        <p>Hello 👋</p>
        <p>Thank you for your purchase!</p>
        <p>Your invoice for <b>Order #${orderId}</b> is attached to this email.</p>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>We appreciate your trust in <b>Tech Zone</b>.</p>
      `,
    });

    const info = await transport.sendMail({
      from: `"Tech Zone" <${process.env.EMAIL_ADMIN}>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: `invoice_order_${orderId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("sendmailPDF: sent:", info.messageId);

    await notificationmodel.create({
      userId,
      orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("sendmailPDF failed:", err);
    throw err;
  }
};


// sendmail (بدون مرفقات)
const sendmail = async (to, subject, text, orderId, userId) => {
  try {
    const html = emailTemplate({
      title: "📦 Order Update",
      body: `
        <p>Hello 👋</p>
        <p>${text}</p>
        <p>Thank you for shopping with <b>Tech Zone</b>.</p>
      `,
    });

    const info = await transport.sendMail({
      from: `"Tech Zone" <${process.env.EMAIL_ADMIN}>`,
      to,
      subject,
      html,
    });

    console.log("sendmail: sent:", info.messageId);

    await notificationmodel.create({
      userId,
      orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("sendmail failed:", err);
    throw err;
  }
};


// sendOTP (مُحسّن) — الآن يحذف OTPs القديمة، يسجل لوج، ويرجع الـ OTP
const sendOTP = async (to, userId) => {
  const OtpCode = generateOTP();

  try {
    const html = emailTemplate({
      title: "🔐 OTP Verification",
      body: `
        <p>Hello 👋</p>
        <p>Use the following OTP code to verify your account:</p>
        <h2 style="text-align:center; letter-spacing:3px;">${OtpCode}</h2>
        <p>This code is valid for <b>10 minutes</b>.</p>
        <p>If you didn’t request this, please ignore this email.</p>
      `,
    });

    const info = await transport.sendMail({
      from: `"Tech Zone Security" <${process.env.EMAIL_ADMIN}>`,
      to,
      subject: "Your OTP Code",
      html,
    });

    console.log("sendOTP: email sent:", info.messageId);

    await notificationmodel.deleteMany({ userId });
    await notificationmodel.create({
      userId,
      OTP: OtpCode,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return OtpCode;
  } catch (err) {
    console.error("sendOTP failed:", err);
    throw err;
  }
};


// resendOTP (كمسار Express) — زي عندك لكن مع تحسين اللوج
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    // حذف القديم وإنشاء جديد
    const OtpCode = await sendOTP(user.email, user._id);

    res
      .status(200)
      .json({
        message: "OTP resent successfully",
        otp: process.env.NODE_ENV === "development" ? OtpCode : undefined,
      });
  } catch (err) {
    console.error("resendOTP failed:", err);
    res
      .status(500)
      .json({ message: "failed to resend OTP", error: err.message });
  }
};

// verify كما عندك
const verify = async (req, res) => {
  const { userId, lastOTP } = req.body;
  try {
    const latset = await notificationmodel
      .findOne({ userId, OTP: lastOTP })
      .sort({ createdAt: -1 });

    if (!latset) {
      return res.status(400).json({ message: "invalid OTP" });
    }
    if (Date.now() > latset.expiresAt) {
      return res.status(400).json({ message: "OTP is expired" });
    }

    latset.status = "verified";
    await latset.save();

    await usermodel.findByIdAndUpdate(userId, { isVerified: true });
    await notificationmodel.deleteOne({ userId });

    res.status(200).json({ message: "verified OTP" });
  } catch (err) {
    console.error("Error verifying OTP", err);
    res.status(500).json({ message: "failed to verify", error: err.message });
  }
};

module.exports = { sendmail, sendOTP, resendOTP, verify, sendmailPDF };
