import Message from "../models/messege.model.js";
import User from "../models/user.model.js";
import openai from "../utils/openai.js";
import { emitToUser } from "../socket/socket.js";
import cloudinary from "../config/cloudinary.js";


export const sendMessage = async (req, res) => {
  try {
    const receiver = req.params.receiver;
    const rawMessage = req.body?.message;
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

    let imageUrl = "";
    if (req.file?.buffer) {
      const missingCloudinary =
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET;

      if (missingCloudinary) {
        return res.status(500).json({
          message:
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
        });
      }

      const base64 = req.file.buffer.toString("base64");
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;

      const uploaded = await cloudinary.uploader.upload(dataUri, {
        folder: "chat_uploads",
        resource_type: "image",
      });

      imageUrl = uploaded?.secure_url || uploaded?.url || "";
    }

    if (!message && !imageUrl) {
      return res.status(400).json({ message: "Message or image is required" });
    }

    const user = await User.findById(receiver);

    // 🤖 AI USER
    if (user?.isAI) {

      // 1️⃣ Save user message first
      await Message.create({
        sender: req.userId,
        receiver,
        message: message || undefined,
        imageUrl: imageUrl || undefined,
      });

      if (!message) {
        const aiMsg = await Message.create({
          sender: receiver, // 🤖 AI user
          receiver: req.userId,
          message: "I can only respond to text right now.",
        });

        emitToUser(req.userId, "receive_message", aiMsg);
        return res.json(aiMsg);
      }

      // 2️⃣ Get history
      const history = await Message.find({
        $or: [
          { sender: req.userId, receiver },
          { sender: receiver, receiver: req.userId }
        ]
      }).sort({ createdAt: 1 }).limit(10);

      const messages = history
        .filter((msg) => typeof msg.message === "string" && msg.message.trim())
        .map((msg) => ({
          role: msg.sender.toString() === req.userId ? "user" : "assistant",
          content: msg.message,
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

      emitToUser(req.userId, "receive_message", aiMsg);

      // 4️⃣ RETURN AI MESSAGE (IMPORTANT)
      return res.json(aiMsg);
    }

    // 👤 NORMAL USER
    const newMsg = await Message.create({
      sender: req.userId,
      receiver,
      message: message || undefined,
      imageUrl: imageUrl || undefined,
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