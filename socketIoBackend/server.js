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
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: "http://localhost:5173" ,
    credentials: true
  }
});
setupSocket(io)

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes)
app.use("/api/message", messageRoutes)

  server.listen(4000, () => {
    connectDB();
    createAIUser();
    console.log("AI User created");
      console.log("🚀 Server running on 4000");
  });


