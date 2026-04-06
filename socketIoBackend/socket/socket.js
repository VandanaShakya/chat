import cookie from "cookie";
import Message from "../models/messege.model.js";
import jwt from "jsonwebtoken";

const users = {};
let ioRef = null;

export const emitToUser = (userId, event, payload) => {
  if (!ioRef) return;
  const socketId = users[String(userId)];
  if (socketId) {
    ioRef.to(socketId).emit(event, payload);
  }
};

const setupSocket = (io) => {
  ioRef = io;

  // 🔐 Auth middleware
  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;

      if (!cookies) return next(new Error("No cookies"));

      const parsed = cookie.parse(cookies);
      const token = parsed.token;

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = decoded;

      next();
    } catch {
      next(new Error("Auth error"));
    }
  });

  // 🔌 Connection
  io.on("connection", (socket) => {
    const userId = String(socket.user.id);
    users[userId] = socket.id;
    console.log("✅ Connected:", socket.id);

    socket.on("send_message", async ({ receiverId, message }) => {
      const senderId = socket.user.id;

      console.log("📤 From:", senderId, "To:", receiverId);

      const newMsg = await Message.create({
        sender: senderId,
        receiver: receiverId,
        message
      });

      const receiverSocket = users[String(receiverId)];

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", newMsg);
      }

      socket.emit("receive_message", newMsg);
    });

    socket.on("disconnect", () => {
      delete users[userId];
      console.log("❌ Disconnected:", socket.id);
    });
  });
};

export default setupSocket;
