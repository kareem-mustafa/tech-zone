const nodemailer = require("nodemailer");
const notificationmodel = require("../models/notification");
const usermodel = require("../models/user");
const path = require('path');
// create a server to send emails
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.EMAIL_PASSWORD,
  },
});
// send email & create notification
const sendmailPDF = async (to, subject, text, orderId, userId) => {
  try {
    await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject,
      text,
    attachments: [
  {
    filename: `invoice_order_${orderId}.pdf`,
    path: path.join(__dirname, '..', 'Invoices', `invoice_order_${orderId}.pdf`)
  }
]
    });
    
    // save notification to database
    await notificationmodel.create({
      userId: userId,
      orderId: orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("faild to send email", err.message);
    throw err;
  }
};
const sendmail = async (to, subject, text, orderId, userId) => {
  try {
    await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject,
      text,
    });
    // save notification to database
    await notificationmodel.create({
      userId: userId,
      orderId: orderId,
      message: text,
      status: "confirmed",
    });
  } catch (err) {
    console.error("faild to send email", err.message);
    throw err;
  }
};
// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // رقم 6 خانات
};
// send otp to the user
const sendOTP = async (to, userId) => {
  const OtpCode = generateOTP();
  try {
    await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to,
      subject: "Your OTP Code",
      text: `Your OTP code ${OtpCode} `,
    });
    // save OTP to database
    await notificationmodel.create({
      userId,
      OTP: `${OtpCode}`,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  } catch (err) {
    console.error("faild to send email", err.message);
    throw err;
  }
};
// resend OTP if the first is expired
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
    // delete the old OTP
    await notificationmodel.deleteMany({ userId });
    const OtpCode = generateOTP();
    await transport.sendMail({
      from: process.env.EMAIL_ADMIN,
      to: user.email,
      subject: "Your OTP Code",
      text: `Your new OTP code ${OtpCode} `,
    });
    // save OTP to database
    await notificationmodel.create({
      userId: user._id,
      OTP: `${OtpCode}`,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("faild to send email", err.message);
    throw err;
  }
};
// check otp is match or not
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
    // update status to be verified
    await usermodel.findByIdAndUpdate(userId, { isVerified: true });
    // delet after compelete
    await notificationmodel.deleteOne({ userId });

    res.status(200).json({ message: "verified OTP" });
  } catch (err) {
    console.error("Error verifying OTP", err.message);
    throw err;
  }
};
module.exports = { sendmail, sendOTP, resendOTP, verify,sendmailPDF };
