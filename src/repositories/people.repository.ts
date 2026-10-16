import type { Interest, JobRole, Location, Prisma } from "../generated/prisma/client";
import { isRecordNotFound, prisma, type AppPrismaClient } from "../lib/prisma";

export type { Interest };

const personInclude = { interests: true } satisfies Prisma.PersonInclude;

export type Person = Omit<Prisma.PersonGetPayload<{ include: typeof personInclude }>, "hashedPassword">;

export interface PersonCreate {
    first_name: string,
    last_name: string,
    email: string,
    location: Location,
    job_role: JobRole,
    job_capability: string,
    job_go_to_market: string,
    interest_ids: number[],
}

export type PersonUpdate = Partial<PersonCreate>;

export class PeopleRepository
{
    constructor(private readonly db: AppPrismaClient = prisma) {}

    findAll(): Promise<Person[]> {
        return this.db.person.findMany({ include: personInclude, orderBy: { id: "asc" } });
    }

    findPaginated(skip: number, limit: number): Promise<Person[]> {
        return this.db.person.findMany({ skip, take: limit, include: personInclude, orderBy: { id: "asc" } });
    }

    count(): Promise<number> {
        return this.db.person.count();
    }

    findById(id: number): Promise<Person | null> {
        return this.db.person.findUnique({ where: { id }, include: personInclude });
    }

    findByEmail(email: string): Promise<Person | null> {
        return this.db.person.findUnique({ where: { email }, include: personInclude });
    }

    findCredentialsByEmail(email: string): Promise<{ id: number, registered: boolean, hashedPassword: string | null } | null> {
        return this.db.person.findUnique({
            where: { email },
            select: { id: true, registered: true, hashedPassword: true },
        });
    }

    findCredentialsById(id: number): Promise<{ id: number, registered: boolean, hashedPassword: string | null } | null> {
        return this.db.person.findUnique({
            where: { id },
            select: { id: true, registered: true, hashedPassword: true },
        });
    }

    setPassword(id: number, hashedPassword: string): Promise<Person> {
        return this.db.person.update({ where: { id }, data: { hashedPassword }, include: personInclude });
    }

    completeRegistration(id: number, interest_ids: number[]): Promise<Person> {
        return this.db.person.update({
            where: { id },
            data: {
                registered: true,
                interests: { set: interest_ids.map((interestId) => ({ id: interestId })) },
            },
            include: personInclude,
        });
    }

    findInterestsByIds(ids: number[]): Promise<Interest[]> {
        return this.db.interest.findMany({ where: { id: { in: ids } } });
    }

    async delete(id: number): Promise<boolean> {
        try {
            await this.db.person.delete({ where: { id } });
            return true;
        } catch (error) {
            if (isRecordNotFound(error)) return false;
            throw error;
        }
    }

    async update(id: number, { interest_ids, ...changes }: PersonUpdate): Promise<Person | null> {
        const data: Prisma.PersonUpdateInput = { ...changes };
        if (interest_ids !== undefined) {
            data.interests = { set: interest_ids.map((interestId) => ({ id: interestId })) };
        }

        try {
            return await this.db.person.update({ where: { id }, data, include: personInclude });
        } catch (error) {
            if (isRecordNotFound(error)) return null;
            throw error;
        }
    }

    async create({ interest_ids, ...data }: PersonCreate): Promise<Person> {
        return this.db.person.create({
            data: {
                ...data,
                id: await this.generateId(),
                interests: { connect: interest_ids.map((id) => ({ id })) },
            },
            include: personInclude,
        });
    }

    // Person IDs are 5-digit numbers
    private async generateId(): Promise<number> {
        let id: number;
        do {
            id = Math.floor(10000 + Math.random() * 90000);
        } while (await this.db.person.findUnique({ where: { id }, select: { id: true } }));
        return id;
    }
}
