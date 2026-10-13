enum ChatStatus {
    Pending = "PENDING",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Completed = "COMPLETED",
    Cancelled = "CANCELLED"
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

export class ChatRepository
{
    private chats: Chat[] = [];

    findAll(): Chat[] {
        return this.chats;
    }
}