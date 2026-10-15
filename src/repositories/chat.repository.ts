import { ChatStatus, Location, type Chat } from "../generated/prisma/client";
import { isRecordNotFound, prisma, type AppPrismaClient } from "../lib/prisma";

export { ChatStatus, Location, type Chat };

export interface ChatCreate {
    sender_id: number,
    receiver_id: number,
    location_id: string,
    datetime: Date,
}

export type ChatUpdate = Partial<ChatCreate & Pick<Chat, "status">>;

export class ChatRepository
{
    constructor(private readonly db: AppPrismaClient = prisma) {}

    findAll(): Promise<Chat[]> {
        return this.db.chat.findMany({ orderBy: { created_at: "asc" } });
    }

    findPaginated(skip: number, limit: number): Promise<Chat[]> {
        return this.db.chat.findMany({ skip, take: limit, orderBy: { created_at: "asc" } });
    }

    count(): Promise<number> {
        return this.db.chat.count();
    }

    findById(id: string): Promise<Chat | null> {
        return this.db.chat.findUnique({ where: { id } });
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.db.chat.delete({ where: { id } });
            return true;
        } catch (error) {
            if (isRecordNotFound(error)) return false;
            throw error;
        }
    }

    async update(id: string, data: ChatUpdate): Promise<Chat | null> {
        try {
            return await this.db.chat.update({ where: { id }, data });
        } catch (error) {
            if (isRecordNotFound(error)) return null;
            throw error;
        }
    }

    create(data: ChatCreate): Promise<Chat> {
        return this.db.chat.create({ data });
    }
}
