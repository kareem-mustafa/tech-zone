const usermodel = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendOTP,sendmail } = require("../controllers/notification");

// Generate Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.SECRET_KEY,
    { expiresIn: "7d" }
  );
};
//register function
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      phonenumber,
      role,
      gender,
      BankAccount,
      address,
      age,
      storename,
  
    } = req.body;
    //check if user found
    const exist = await usermodel.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }
    //not allowed to register as admin
    if (role === "admin") {
      return res
        .status(400)
        .json({ message: "you are not allowed to register as admin" });
    }
    //images
    let bankAccountImageUrl = "";
    let profileImageUrl = "";
    if (req.files.bankAccountImage) {
      bankAccountImageUrl = req.files.bankAccountImage[0].path;
    }
    if (req.files.profileImage) {
      profileImageUrl = req.files.profileImage[0].path;
    }
    //create a new user
    const newUser = new usermodel({
      username,
      email,
      password,
      phonenumber,
      role,
      gender,
      BankAccount,
      address,
      age,
      storename,
      bankAccountImage: bankAccountImageUrl,
      profileImage: profileImageUrl,
      isVerified: false,
      isApproved: false,
    });
    //save user in database
    const token = generateToken(newUser);
    await newUser.save();
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        storename: newUser.storename,
        bankAccountImage: newUser.bankAccountImage,
        profileImage: newUser.profileImage,
      },
      token
    });
    //send Otp to verify email
    await sendOTP(email, newUser._id);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};
// Login function
const login = async (req, res) => {
  const { email, password } = req.body;
  const User = await usermodel.findOne({ email });
//compare password
  if (!User || !(await bcrypt.compare(password, User.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  //not allowed to login without verification OTP
  if (!User.isVerified) {
    return res
      .status(403)
      .json({ message: "Please verify your account first" });
  }
  res.status(200).json({ User, token: generateToken(User) });
};
// Delete user by ID
const deleteUser = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await usermodel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await usermodel.deleteOne({ _id: id });
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Cannot delete user", error: err.message });
  }
};

// Update username
const updateUser = async (req, res) => {
  const id = req.params.id;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const user = await usermodel.findByIdAndUpdate(
      id,
      { username },
      { new: true, runValidators: false } // مهم جدًا عشان يتجاهل validation على باقي الحقول
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    res.status(200).json({ message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Cannot update user", error: err.message });
  }
};
// Get all users
const getAllUser = async (req, res) => {
  const users = await usermodel.find();
  res.status(200).json(users);
  if (!users){
    res.status(404).json({ message: "No users found" });
  }
};
// Get user by ID
const getUser = async (req, res) => {
  const id = req.params.id;
  const User = await usermodel.findOne({ _id: id });
  if (!User) {
    return res.status(404).send({ message: "user not found" });
  } else {
    res.status(200).json(User);
  }
};
// Forget password
const forgetpassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  //find user by email
  try {
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }
    //generate reset token
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 10 * 60 * 1000;
    await user.save();
//link reset password
const userId=(user._id).toString();
    const link = `http://localhost:4200/reset-password/${token}`;
    sendmail(
      user.email,
      "link reset password",
      link,
      userId
    );
    res.status(200).json({ message: link });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: err.message });
  }
};

// Reset password
const resetpassword = async (req, res) => {
  const { token } = req.params;
  const { newpassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await usermodel.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token expired or invalid" });
    }

    user.password = newpassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(400).json({ message: "Error", error: err.message });
  }
};

// Update password
const updatepassword = async (req, res) => {
  const { email, password, newpassword } = req.body;

  if (!email || !password || !newpassword) {
    return res.status(400).json({ message:"fields are required" });
  }
  try {
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password incorrect" });
    }
    //hash new password
    user.password = newpassword;
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Cannot update password", error: err.message });
  }
};
const approveSeller = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { sellerId } = req.params;

    const seller = await usermodel.findByIdAndUpdate(
      sellerId,
      { isApproved: true },
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
        await sendmail(
      seller.email,
      "Account Approved ",
      `Hello ${seller.username}, your seller account has been approved. You can now start selling on our platform!`,
      seller._id.toString()
    );
    res.status(200).json({
      message: "Seller approved successfully",
      seller,
    });
  } catch (err) {
    res.status(500).json({ message: "Error approving seller", error: err.message });
  }
};

module.exports = {
  deleteUser,
  updateUser,
  getAllUser,
  getUser,
  register,
  login,
  updatepassword,
  forgetpassword,
  resetpassword,
  approveSeller
};
