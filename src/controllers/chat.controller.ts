import type {Request, Response} from "express";

import { ChatIdSchema, ChatService } from "../services/chat.service.ts";
import { sendError } from "../utils/errors.ts";

export class ChatController {
    constructor(private readonly chatService: ChatService = new ChatService()) {}

    findAll = (req: Request, res: Response): void => {
        const chats = this.chatService.findAll();
        res.status(200).json(chats);
    };

    findById = (req: Request<{ id: string }>, res: Response): void => {
        try {
            const chat = this.chatService.findById(ChatIdSchema.parse(req.params.id));

            if (!chat) {
                res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
                return;
            }

            res.status(200).json(chat);
        } catch (error) {
            sendError(res, error, "Unable to find chat");
        }
    };

    delete = (req: Request<{ id: string }>, res: Response): void => {
        try {
            if (!this.chatService.delete(ChatIdSchema.parse(req.params.id))) {
                res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
                return;
            }

            res.status(204).end();
        } catch (error) {
            sendError(res, error, "Unable to delete chat");
        }
    };

    update = (req: Request<{ id: string }>, res: Response): void => {
        try {
            const chat = this.chatService.update(ChatIdSchema.parse(req.params.id), req.body);

            if (!chat) {
                res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
                return;
            }

            res.status(200).json(chat);
        } catch (error) {
            sendError(res, error, "Unable to update chat");
        }
    };

    create = (req: Request, res: Response): void => {
        try {
            const chat = this.chatService.create(req.body);
            res.status(201).json(chat);
        } catch (error) {
            sendError(res, error, "Unable to create chat");
        }
    }
}
