import type {Request, Response} from "express";

import { ChatService } from "../services/chat.service.ts";

export class ChatController {
    constructor(private readonly chatService: ChatService = new ChatService()) {}

    findAll = (req: Request, res: Response): void => {
        const chats = this.chatService.findAll();
        res.status(200).json(chats);
    };
}