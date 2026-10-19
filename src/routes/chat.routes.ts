import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";

const router = Router();
const chatController = new ChatController();

router.get("/", chatController.findAll)
router.get("/user/:userId", chatController.findByUserId);
router.get("/:id", chatController.findById);
router.post("/", chatController.create);
router.patch("/:id", chatController.update);
router.delete("/:id", chatController.delete);

export default router;