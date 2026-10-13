import { ChatRepository, Location, type Chat } from "../repositories/chat.repository.ts";

export class ChatService
{
    constructor(private readonly chatRepository: ChatRepository = new ChatRepository()) {}

    findAll(): Chat[] {
        return this.chatRepository.findAll();
    }

    findById(id: string): Chat | undefined {
        return this.chatRepository.findById(id);
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