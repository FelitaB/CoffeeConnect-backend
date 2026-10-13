import { ChatRepository, ChatStatus, Location, type Chat, type ChatUpdate } from "../repositories/chat.repository.ts";

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

    update(id: string, changes: ChatUpdate): Chat | undefined {
        if (!this.chatRepository.findById(id)) {
            return undefined;
        }

        if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
            throw new Error("Body must be a JSON object");
        }

        const fields = Object.keys(changes);
        const allowedFields = ["sender_id", "receiver_id", "location_id", "datetime", "status"];
        if (fields.length === 0 || fields.some((field) => !allowedFields.includes(field))) {
            throw new Error("Provide one or more of: " + allowedFields.join(", "));
        }

        if ("sender_id" in changes && (!Number.isInteger(changes.sender_id) || changes.sender_id! < 10000 || changes.sender_id! > 99999)) {
            throw new Error("Sender ID must be 5 digits");
        }

        if ("receiver_id" in changes && (!Number.isInteger(changes.receiver_id) || changes.receiver_id! < 10000 || changes.receiver_id! > 99999)) {
            throw new Error("Receiver ID must be 5 digits");
        }

        if ("location_id" in changes && !Object.values(Location).some((location) => location === changes.location_id)) {
            throw new Error("Location ID must be one of: " + Object.values(Location).join(", "));
        }

        if ("datetime" in changes && (!Number.isFinite(changes.datetime) || changes.datetime! <= Date.now() / 1000)) {
            throw new Error("Datetime must be in the future");
        }

        if ("status" in changes && !Object.values(ChatStatus).some((status) => status === changes.status)) {
            throw new Error("Status must be one of: " + Object.values(ChatStatus).join(", "));
        }

        return this.chatRepository.update(id, changes);
    }

    create(chat: Pick<Chat, "sender_id" | "receiver_id" | "location_id" | "datetime">): Chat {
        if (chat.sender_id <= 9999 || chat.sender_id >= 100000)
        {
            throw new Error("Sender ID must be 5 digits");
        } 

        if (chat.receiver_id <= 9999 || chat.receiver_id >= 100000)
        {
            throw new Error("Sender ID must be 5 digits");
        } 
        
        if (!Object.values(Location).some((location) => location === chat.location_id))
        {
            throw new Error("Location ID must be one of: " + Object.values(Location).join(", "));
        }

        if (!Number.isFinite(chat.datetime) || chat.datetime <= Date.now() / 1000)
        {
            throw new Error("Datetime must be in the future");
        }

        return this.chatRepository.create(
            chat.sender_id,
            chat.receiver_id,
            chat.location_id,
            chat.datetime
        );
    }
}