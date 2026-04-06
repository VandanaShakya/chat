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
    origin: (origin, cb) => {
      // allow same-origin / server-to-server / health checks
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, false);
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    credentials: true
  }
});
setupSocket(io)

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes)
app.use("/api/message", messageRoutes)

app.get("/health", (_req, res) => res.status(200).send("ok"));

  server.listen(process.env.PORT || 4000, () => {
    connectDB();
    createAIUser();
    console.log("AI User created");
      console.log(`🚀 Server running on ${process.env.PORT || 4000}`);
  });


