const jwt = require("jsonwebtoken");
const { promisify } = require("util");

// check token function
async function auth(req, res, next) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: "You must be logged in" });
  }

  try {
    const decoded = await promisify(jwt.verify)(
      authorization,
      process.env.SECRET_KEY
    );

    req.user = {
      _id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };
    const hasCheckFields =
  req.params.id ||
  req.body?.id ||
  req.body?.userId ||
  req.body?.email;

if (
  hasCheckFields &&
  req.user._id !== req.params.id && req.user.role !== "admin" && req.user._id !== req.body?.id &&
  req.user._id !== req.body?.userId && req.user.email !== req.body?.email) {
    return res.status(403).json({ message: "You are not allowed to access this account" });
  }
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = auth;