// middleware/sendMail.js
const transporter = require("../config/mailer");

const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Tech Zone" <${process.env.EMAIL_ADMIN}>`,
      to,
      subject,
      html,
    });

    console.log(" Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error(" Email error:", err.message);
    throw err;
  }
};

module.exports = sendMail;
