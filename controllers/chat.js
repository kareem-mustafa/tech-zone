const chatmodel = require("../models/chat");
const productmodel = require("../models/product");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

//integerated wit AI openrouter
const genAI = new GoogleGenerativeAI(process.env.GEMINIAI);
//send message to AI with specific user
const send_message = async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "please send a message" });
  }

  try {
    // give a function to AI
    const products = await productmodel.find({});
const productList = products.map(
  (p) => `- ${p.title} (${p.price} EGP)`
);
    const prompt = `
            You are a smart assistant for adults who sells electronics such as cell phones, laptops, and headphones. 
      Your job is to answer customer inquiries in Arabic and English, and provide information about shipping, 
      products, prices, and offers upon request. Any question outside this website, don't answer.
      not all productList just some
      Products list:
      random Products list (limited to 5):
      ${productList}

      User: ${message}
    `;
    //model of AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    //response from AI
    const reply = await result.response.text();
    await chatmodel.create({ userId, message: message, reply });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message, message: "hello" });
  }
};
// display message for the user
const get_user_messages = async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(404).json({ message: "User not found" });
  }
  try {
    const messages = await chatmodel
      .find({ userId })
      .sort({ createdAt: 1 })
      .populate("userId", "username");
    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ error: "cant get old message" });
  }
};
const get_Alluser_messages = async (req, res) => {
  try {
    const chats = await chatmodel
      .find({})
      .sort({ createdAt: 1 })
      .populate("userId", "username");
    res.status(200).json({ chats });
  } catch (err) {
    res.status(500).json({ message: "cant get messages" });
  }
};
const replyfromadmin = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "unauthorized" });
  }
  const userId = req.user.id;
  const { message } = req.body;
  if (!userId || !message)
    return res.status(400).json({ message: "please enter your data" });

  try {
    const reply = await chatmodel.create({ userId, sender: "admin", message });
    res.status(201).json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Reply failed" });
  }
};

module.exports = {
  send_message,
  get_user_messages,
  get_Alluser_messages,
  replyfromadmin,
};