// config/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_ADMIN,     // ايميلك
    pass: process.env.EMAIL_PASSWORD,  // App Password من Google
  },
});

// اختبار الاتصال وقت تشغيل السيرفر
transporter.verify((error, success) => {
  if (error) {
    console.error(" Mail server not ready:", error.message);
  } else {
    console.log(" Mail server is ready");
  }
});

module.exports = transporter;
