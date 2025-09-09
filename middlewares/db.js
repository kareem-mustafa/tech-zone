// middlewares/db.js
const dbConnect = require("../dbconnects");

async function ensureDb(req, res, next) {
  try {
    await dbConnect();
    next(); // كمل للراوت
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
}

module.exports = ensureDb;
