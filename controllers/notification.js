const nodemailer = require("nodemailer");
const notificationmodel = require("../models/notification");
const usermodel = require("../models/user");
const path = require("path");

// إنشاء Transporter
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// دالة Delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// إرسال إيميل واحد (مع دعم PDF)
const sendEmail = async ({ to, subject, text, attachments = [] }) => {
  try {
    await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject,
      text,
      attachments,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
};

// إرسال إيميلات متعددة بترتيب مع delay
const sendEmailsSequential = async (emails, delayMs = 200) => {
  for (const email of emails) {
    await sendEmail(email);
    await delay(delayMs); // delay بين كل رسالة
  }
};

// إرسال إشعار PDF
const sendMailPDF = async (to, subject, text, orderId, userId) => {
  const attachments = [
    {
      filename: `invoice_order_${orderId}.pdf`,
      path: path.join(__dirname, "..", "Invoices", `invoice_order_${orderId}.pdf`),
    },
  ];

  await sendEmailsSequential([{ to, subject, text, attachments }]);

  // حفظ Notification
  await notificationmodel.create({
    userId,
    orderId,
    message: text,
    status: "confirmed",
  });
};

// إرسال رسالة عادية
const sendMail = async (to, subject, text, orderId, userId) => {
  await sendEmailsSequential([{ to, subject, text }]);

  await notificationmodel.create({
    userId,
    orderId,
    message: text,
    status: "confirmed",
  });
};

// إرسال OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (to, userId) => {
  const OtpCode = generateOTP();
  await sendEmailsSequential([
    {
      to,
      subject: "Your OTP Code",
      text: `Your OTP code is ${OtpCode}`,
    },
  ]);

  await notificationmodel.create({
    userId,
    OTP: OtpCode,
    status: "pending",
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 دقائق
  });
};

// إعادة إرسال OTP
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await usermodel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    await notificationmodel.deleteMany({ userId });

    const OtpCode = generateOTP();
    await sendEmailsSequential([
      {
        to: user.email,
        subject: "Your OTP Code",
        text: `Your new OTP code is ${OtpCode}`,
      },
    ]);

    await notificationmodel.create({
      userId: user._id,
      OTP: OtpCode,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Failed to resend OTP", err.message);
    res.status(500).json({ message: err.message });
  }
};

// تحقق OTP
const verify = async (req, res) => {
  const { userId, lastOTP } = req.body;
  try {
    const latest = await notificationmodel
      .findOne({ userId, OTP: lastOTP })
      .sort({ createdAt: -1 });

    if (!latest) return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > latest.expiresAt) return res.status(400).json({ message: "OTP expired" });

    latest.status = "verified";
    await latest.save();

    await usermodel.findByIdAndUpdate(userId, { isVerified: true });
    await notificationmodel.deleteOne({ userId });

    res.status(200).json({ message: "Verified OTP" });
  } catch (err) {
    console.error("Error verifying OTP", err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendMail, sendOTP, resendOTP, verify, sendMailPDF };
