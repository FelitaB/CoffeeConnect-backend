import { z } from "zod";

import { ChatRepository, ChatStatus, Location, type Chat, type ChatUpdate } from "../repositories/chat.repository";
import { PaginationSchema, type Paginated } from "../utils/pagination";

export const ChatIdSchema = z.uuid("Chat id must be a valid UUID");

const fiveDigitId = (message: string) => z.number(message).int(message).min(10000, message).max(99999, message);

export const CreateChatSchema = z.object({
    sender_id: fiveDigitId("Sender ID must be 5 digits"),
    receiver_id: fiveDigitId("Receiver ID must be 5 digits"),
    location_id: z.enum(Location),
    datetime: z.number().refine((datetime) => datetime > Date.now() / 1000, "Datetime must be in the future"),
});

export const UpdateChatSchema = z.strictObject({
    sender_id: CreateChatSchema.shape.sender_id.exactOptional(),
    receiver_id: CreateChatSchema.shape.receiver_id.exactOptional(),
    location_id: CreateChatSchema.shape.location_id.exactOptional(),
    datetime: CreateChatSchema.shape.datetime.exactOptional(),
    status: z.enum(ChatStatus).exactOptional(),
}).refine((changes) => Object.keys(changes).length > 0, "Provide one or more of: sender_id, receiver_id, location_id, datetime, status");

export class ChatService
{
    constructor(private readonly chatRepository: ChatRepository = new ChatRepository()) {}

    findAll(): Promise<Chat[]> {
        return this.chatRepository.findAll();
    }

    async getPaginatedShifts(page: number, limit: number): Promise<Paginated<Chat>> {
        PaginationSchema.parse({ page, limit });

        const [total, data] = await Promise.all([
            this.chatRepository.count(),
            this.chatRepository.findPaginated((page - 1) * limit, limit),
        ]);
        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    findById(id: string): Promise<Chat | null> {
        return this.chatRepository.findById(id);
    }

    delete(id: string): Promise<boolean> {
        return this.chatRepository.delete(id);
    }

    update(id: string, body: unknown): Promise<Chat | null> {
        const { datetime, ...changes } = UpdateChatSchema.parse(body);
        const update: ChatUpdate = { ...changes };
        if (datetime !== undefined) update.datetime = fromUnix(datetime);

        return this.chatRepository.update(id, update);
    }

    create(body: unknown): Promise<Chat> {
        const chat = CreateChatSchema.parse(body);

        return this.chatRepository.create({
            sender_id: chat.sender_id,
            receiver_id: chat.receiver_id,
            location_id: chat.location_id,
            datetime: fromUnix(chat.datetime),
        });
    }
}

function fromUnix(seconds: number): Date {
    return new Date(seconds * 1000);
}
