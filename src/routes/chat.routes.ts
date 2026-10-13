import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();
const chatController = new ChatController();

router.get("/", chatController.findAll)
router.get("/:id", chatController.findById);

export default router;