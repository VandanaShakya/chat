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
const allowedOrigins = String(process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // allow server-to-server / curl requests (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true); // fallback: allow if not configured
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Express (newer versions on Render) doesn't accept "*" here; use a regexp.
app.options(/.*/, cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
    methods: corsOptions.methods,
  },
});
setupSocket(io)

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes)
app.use("/api/message", messageRoutes)

  const port = Number(process.env.PORT) || 4000;
  server.listen(port, () => {
    connectDB();
    createAIUser();
    console.log("AI User created");
      console.log(`🚀 Server running on ${port}`);
  });


