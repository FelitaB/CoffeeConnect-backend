export enum ChatStatus {
    Pending = "PENDING",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Completed = "COMPLETED",
    Cancelled = "CANCELLED"
}

export enum Location {
    London = "LONDON",
    Belfast = "BELFAST",
    Manchester = "MANCHESTER"
}

export interface Chat
{
    id: string, // Chat IDs are alphanumeric UUIDs
    sender_id: number,
    receiver_id: number, 
    location_id: string,
    datetime: number, // UNIX timestamp
    status: ChatStatus,
    created_at: number // UNIX timestamp
}

export type ChatUpdate = Partial<Pick<Chat, "sender_id" | "receiver_id" | "location_id" | "datetime" | "status">>;

export class ChatRepository
{
    private chats: Chat[] = [];

    findAll(): Chat[] {
        return this.chats;
    }

    findPaginated(skip: number, limit: number): Chat[] {
        return this.chats.slice(skip, skip + limit);
    }

    count(): number {
        return this.chats.length;
    }

    findById(id: string): Chat | undefined {
        return this.chats.find((chat) => chat.id === id);
    }

    delete(id: string): boolean {
        const index = this.chats.findIndex((chat) => chat.id === id);
        if (index === -1) {
            return false;
        }

        this.chats.splice(index, 1);
        return true;
    }

    update(id: string, changes: ChatUpdate): Chat | undefined {
        const chat = this.findById(id);
        if (!chat) {
            return undefined;
        }

        Object.assign(chat, changes);
        return chat;
    }

    create(sender_id: number, receiver_id: number, location_id: string, datetime: number): Chat
    {
        let newChat: Chat = { 
            id: crypto.randomUUID(), 
            sender_id: sender_id,
            receiver_id: receiver_id,
            location_id: location_id,
            datetime: datetime,
            status: ChatStatus.Pending,
            created_at: Math.floor(Date.now() / 1000),
        };

        this.chats.push(newChat);
        return newChat;
    }
}