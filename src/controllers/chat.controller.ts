import type {Request, Response} from "express";

import { ChatIdSchema, ChatService } from "../services/chat.service";
import { sendError } from "../utils/errors";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../utils/pagination";

export class ChatController {
    constructor(private readonly chatService: ChatService = new ChatService()) {}

    findAll = (req: Request, res: Response): void => {
        try {
            const page = Number(req.query.page ?? DEFAULT_PAGE);
            const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
            res.status(200).json(this.chatService.getPaginatedShifts(page, limit));
        } catch (error) {
            sendError(res, error, "Unable to fetch chats");
        }
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
