import Message from "../models/messege.model.js";
import User from "../models/user.model.js";
import openai from "../utils/openai.js";
import { emitToUser } from "../socket/socket.js";


export const sendMessage = async (req, res) => {
  try {
    const receiver = req.params.receiver;
    const { message } = req.body;

    const user = await User.findById(receiver);

    // 🤖 AI USER
    if (user?.isAI) {

      // 1️⃣ Save user message first
      await Message.create({
        sender: req.userId,
        receiver,
        message
      });

      // 2️⃣ Get history
      const history = await Message.find({
        $or: [
          { sender: req.userId, receiver },
          { sender: receiver, receiver: req.userId }
        ]
      }).sort({ createdAt: 1 }).limit(10);

      const messages = history.map(msg => ({
        role: msg.sender.toString() === req.userId ? "user" : "assistant",
        content: msg.message
      }));

      messages.push({
        role: "user",
        content: message
      });

      let aiReply = "⚠️ AI not available";
      const ai = openai(); 
      try {
        const response = await ai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages
        });

        aiReply = response.choices[0].message.content;

      } catch (err) {
        console.log("AI ERROR:", err.message);
      }

      // 3️⃣ Save AI reply
      const aiMsg = await Message.create({
        sender: receiver, // 🤖 AI user
        receiver: req.userId,
        message: aiReply
      });

      // 4️⃣ RETURN AI MESSAGE (IMPORTANT)
      return res.json(aiMsg);
    }

    // 👤 NORMAL USER
    const newMsg = await Message.create({
      sender: req.userId,
      receiver,
      message
    });

    emitToUser(receiver, "receive_message", newMsg);

    res.json(newMsg);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Message error" });
  }
};
export const getMessages = async (req, res) => {
  try {
    const { receiver } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver },
        { sender: receiver, receiver: req.userId }
      ]
    }).sort({ createdAt: 1 });
      console.log("USER ID:", req.userId);
      console.log("RECEIVER:", receiver);
      // console.log(messages)
    res.json(messages);

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Fetch error" });
  }
};

export const getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};


// create ai  //
export const createAIUser = async () => {
  const exists = await User.findOne({ isAI: true });

  if (!exists) {
    await User.create({
      name: "AI Bot",
      userName: "ai_bot",
      email: "ai@bot.com",
      password: "123456",
      isAI: true // 🔥 HERE
    });

    console.log("✅ AI user created");
  }
};