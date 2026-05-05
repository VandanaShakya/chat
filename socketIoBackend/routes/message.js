import express from "express";
import { sendMessage, getMessages, getUsers, deleteMessage, updateMessage } from "../controllers/messege.controller.js";
import { isAuth } from "../middlewares/isAuth.js";
import upload from "../config/upload.js";

const router = express.Router();

router.post("/send/:receiver", isAuth, upload.single("image"), sendMessage);
router.get("/get/:receiver", isAuth, getMessages);
router.get("/users", isAuth, getUsers);
router.delete("/delete/:messageId", isAuth, deleteMessage);
router.put("/update/:messageId", updateMessage);

export default router;