import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import messageRoutes from "./routes/message.js";
import setupSocket from "./socket/socket.js";
import { createAIUser } from "./controllers/messege.controller.js";
// import openai from "./utils/openai.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser clients or same-origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  }
});

setupSocket(io)

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes)
app.use("/api/message", messageRoutes)

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("Missing env var MONGO_URL");
    }

    await connectDB();
    await createAIUser();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err?.message || err);
    process.exit(1);
  }
}

start();


