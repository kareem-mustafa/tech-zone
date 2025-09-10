const { Resend } = require("resend");
const notificationmodel = require("../models/notification");
const usermodel = require("../models/user");
const path = require("path");
const fs = require("fs");

// إعداد Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// send email & create notification with PDF
const sendmailPDF = async (to, subject, text, orderId, userId) => {
  try {
    const pdfPath = path.join(__dirname, "..", "Invoices", `invoice_order_${orderId}.pdf`);
    const pdfFile = fs.readFileSync(pdfPath);

    await resend.emails.send({
      from: "onboarding@resend.dev", // لحد ما توثق دومينك
      to: userId.email,
      subject,
      text,
      attachments: [
        {
          filename: `invoice_order_${orderId}.pdf`,
          content: pdfFile.toString("base64"),
        },
      ],
    });

    await notificationmodel.create({
      userId,
      orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("faild to send email", err);
    throw err;
  }
};

// send email & create notification (بدون مرفقات)
const sendmail = async (to, subject, text, orderId, userId) => {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      text,
    });

    await notificationmodel.create({
      userId,
      orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("faild to send email", err);
    throw err;
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// send otp
const sendOTP = async (to, userId) => {
  const OtpCode = generateOTP();
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to:userId.email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${OtpCode}`,
    });

    await notificationmodel.create({
      userId,
      OTP: `${OtpCode}`,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  } catch (err) {
    console.error("faild to send email", err);
    throw err;
  }
};

// resend OTP
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await usermodel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User is already verified" });

    await notificationmodel.deleteMany({ userId });

    const OtpCode = generateOTP();

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: userId.email,
      subject: "Your OTP Code",
      text: `Your new OTP code is ${OtpCode}`,
    });

    await notificationmodel.create({
      userId: user._id,
      OTP: `${OtpCode}`,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("faild to send email", err);
    res.status(500).json({ error: "failed to resend OTP" });
  }
};

// verify OTP
const verify = async (req, res) => {
  const { userId, lastOTP } = req.body;
  try {
    const latset = await notificationmodel
      .findOne({ userId, OTP: lastOTP })
      .sort({ createdAt: -1 });

    if (!latset) return res.status(400).json({ message: "invalid OTP" });
    if (Date.now() > latset.expiresAt) return res.status(400).json({ message: "OTP is expired" });

    latset.status = "verified";
    await latset.save();

    await usermodel.findByIdAndUpdate(userId, { isVerified: true });
    await notificationmodel.deleteOne({ userId });

    res.status(200).json({ message: "verified OTP" });
  } catch (err) {
    console.error("Error verifying OTP", err);
    res.status(500).json({ error: "failed to verify OTP" });
  }
};

module.exports = { sendmail, sendOTP, resendOTP, verify, sendmailPDF };
