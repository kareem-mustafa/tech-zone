const nodemailer = require("nodemailer");
const notificationmodel = require("../models/notification");
const usermodel = require("../models/user");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // اتأكد إنه معمول في مكان ما في المشروع (server.js أو هنا)

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
const sendmailPDF = async (to, subject, text, orderId, userId) => {
  try {
    const pdfPath = path.join(
      __dirname,
      "..",
      "Invoices",
      `invoice_order_${orderId}.pdf`
    );
    const attachments = [];
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `invoice_order_${orderId}.pdf`,
        path: pdfPath,
      });
    } else {
      console.warn("sendmailPDF: PDF not found at", pdfPath);
    }

    const info = await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject,
      text,
      attachments,
    });

    console.log(
      "sendmailPDF: sent:",
      info && info.messageId ? info.messageId : info
    );

    await notificationmodel.create({
      userId: userId,
      orderId: orderId,
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
    const info = await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject,
      text,
    });
    console.log(
      "sendmail: sent:",
      info && info.messageId ? info.messageId : info
    );

    // محاولة حفظ notification، لكن حتى لو فشلت نحافظ على نجاح الإرسال
    try {
      await notificationmodel.create({
        userId: userId,
        orderId: orderId,
        message: text,
        status: "confirmed",
      });
    } catch (dbErr) {
      console.error("sendmail: failed to save notification to DB:", dbErr);
    }
  } catch (err) {
    console.error("sendmail failed:", err);
    throw err;
  }
};

// sendOTP (مُحسّن) — الآن يحذف OTPs القديمة، يسجل لوج، ويرجع الـ OTP
const sendOTP = async (to, userId) => {
  if (!to) {
    const err = new Error("sendOTP: recipient email (to) is required");
    console.error(err);
    throw err;
  }
  const OtpCode = generateOTP();
  try {
    console.log(
      `sendOTP: sending OTP to=${to} userId=${userId} otp=${OtpCode}`
    );

    const info = await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject: "Your OTP Code",
      text: `Your OTP code is ${OtpCode}`,
    });

    console.log(
      "sendOTP: email sent:",
      info && info.messageId ? info.messageId : info
    );

    // امسح أي OTPs قديمة قبل إضافة الجديد
    try {
      if (userId) await notificationmodel.deleteMany({ userId });
    } catch (delErr) {
      console.error("sendOTP: failed to delete old OTPs (non-fatal):", delErr);
    }

    // save OTP to database (non-fatal if DB fails — الإيميل أهم)
    try {
      await notificationmodel.create({
        userId,
        OTP: `${OtpCode}`,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    } catch (dbErr) {
      console.error("sendOTP: failed to save OTP to DB (non-fatal):", dbErr);
    }

    return OtpCode; // مفيد للاختبارات أو للرد على ال API
  } catch (err) {
    console.error("sendOTP: failed to send email:", err);
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
