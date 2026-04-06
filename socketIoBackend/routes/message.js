import express from "express";
import { sendMessage, getMessages, getUsers } from "../controllers/messege.controller.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/send/:receiver", isAuth, sendMessage);
router.get("/get/:receiver", isAuth, getMessages);
router.get("/users", isAuth, getUsers);

export default router;