import express from "express";
import { sendMessage, getMessages, getUsers } from "../controllers/messege.controller.js";
import { isAuth } from "../middlewares/isAuth.js";
import upload from "../config/upload.js";

const router = express.Router();

router.post("/send/:receiver", isAuth, upload.single("image"), sendMessage);
router.get("/get/:receiver", isAuth, getMessages);
router.get("/users", isAuth, getUsers);

export default router;