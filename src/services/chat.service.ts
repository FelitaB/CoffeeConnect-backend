import { ChatRepository, Chat } from "../repositories/chat.repository.ts"   

export class ChatService
{
    constructor(private readonly chatRepository: ChatRepository = new ChatRepository()) {}

    findAll(): Chat[] {
        return this.chatRepository.findAll();
    }
}