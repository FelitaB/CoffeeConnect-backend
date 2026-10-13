import type {Request, Response} from "express";

import { ChatService } from "../services/chat.service.ts";

export class ChatController {
    constructor(private readonly chatService: ChatService = new ChatService()) {}

    findAll = (req: Request, res: Response): void => {
        const chats = this.chatService.findAll();
        res.status(200).json(chats);
    };

    findById = (req: Request<{ id: string }>, res: Response): void => {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ status: "fail", message: "Chat id is required", errors: [] });
            return;
        }

        const chat = this.chatService.findById(id);

        if (!chat) {
            res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
            return;
        }

        res.status(200).json(chat);
    };
}
