const chatmodel = require("../models/chat");
const productmodel = require("../models/product");
const { OpenAI } = require("openai");
require("dotenv").config();
//integerated wit AI openrouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  //this because openrouter
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": `http://localhost:${process.env.PORT}`,
    "X-Title": "MyChatBot",
  },
});
//send message to AI with specific user
const send_message = async (req, res) => {
  const { message, userId } = req.body;
  if (!message || !userId) {
    return res.status(400).json({ error: "please send a message" });
  }

  try {
    // give a function to AI
    const products = await productmodel.find({});
    const productList = products.map((p) => `- ${p.title} (${p.price} EGP)`);

    var messages = [
      {
        role: "system",
        content:
          "You are a smart assistant for adults who sells electronics such as cell phones, laptops, and headphones. Your job is to answer customer inquiries in Arabic and english, and provide information about shipping, products, prices, and offers upon request, and any question out of this web site dont answer, you can see the website and backend and UI to answer on question is related about product is existing on the website .",
      },
      {
        role: "system",
        content: `أنت مساعد ذكي تبيع منتجات إلكترونية. هذه قائمة المنتجات:${productList}`,
      },
      { role: "user", content: message },
    ];
    //model of AI
    const AI_chat = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages,
    });
    //response from AI
    var reply = AI_chat.choices[0].message.content;
    await chatmodel.create({ userId, message: message, reply });
    res.json({ reply });
  } catch (err) {
    res.status(500).json("cant connect with AI");
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
  const { userId, message } = req.body;
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
  replyfromadmin
};
