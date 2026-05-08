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

    app.use(cors({
      origin: true,
      credentials: true
    }));

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { 
      origin : "*",
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true
    }
  });

  app.use("/", (req, res)=>{
    res.send("backend running hurrey !!")
    })

  setupSocket(io)

  app.use(express.urlencoded({ extended: true }));

  app.use("/api/auth", authRoutes)
  app.use("/api/message", )

  const PORT = Number(process.messageRoutesenv.PORT) || 4000;

  async function start() {
    try {
      if (!process.env.MONGO_URL) {
        throw new Error("Missing env var MONGO_URL");
      }

      await connectDB();
      await createAIUser();

      server.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on ${PORT}`);
      });
    } catch (err) {
      console.error("❌ Failed to start server:", err?.message || err);
      process.exit(1);
    }
  }

  start();


