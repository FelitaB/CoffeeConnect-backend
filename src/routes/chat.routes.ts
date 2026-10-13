import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();
const chatController = new ChatController();

router.get("/", chatController.findAll)
router.get("/:id", chatController.findById);
router.post("/", chatController.create);
router.patch("/:id", chatController.update);

export default router;