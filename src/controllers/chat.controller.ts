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

    delete = (req: Request<{ id: string }>, res: Response): void => {
        const { id } = req.params;
        if (typeof id !== "string" || id.trim().length === 0) {
            res.status(400).json({ status: "fail", message: "A single chat id is required", errors: [] });
            return;
        }

        if (!this.chatService.delete(id)) {
            res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
            return;
        }

        res.status(204).end();
    };

    update = (req: Request<{ id: string }>, res: Response): void => {
        try {
            const chat = this.chatService.update(req.params.id, req.body);

            if (!chat) {
                res.status(404).json({ status: "fail", message: "Chat not found", errors: [] });
                return;
            }

            res.status(200).json(chat);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to update chat";
            res.status(400).json({ status: "fail", message, errors: [] });
        }
    };

    create = (req: Request, res: Response): void => {
        try {
            const chat = this.chatService.create(req.body);
            res.status(201).json(chat);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to create chat";
            res.status(400).json({ status: "fail", message, errors: [] });
        }
    }
}
