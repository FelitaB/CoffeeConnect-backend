import { z } from "zod";

import { ChatRepository, ChatStatus, Location, type Chat } from "../repositories/chat.repository.ts";

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

    findAll(): Chat[] {
        return this.chatRepository.findAll();
    }

    findById(id: string): Chat | undefined {
        return this.chatRepository.findById(id);
    }

    delete(id: string): boolean {
        return this.chatRepository.delete(id);
    }

    update(id: string, body: unknown): Chat | undefined {
        if (!this.chatRepository.findById(id)) {
            return undefined;
        }

        return this.chatRepository.update(id, UpdateChatSchema.parse(body));
    }

    create(body: unknown): Chat {
        const chat = CreateChatSchema.parse(body);

        return this.chatRepository.create(
            chat.sender_id,
            chat.receiver_id,
            chat.location_id,
            chat.datetime
        );
    }
}