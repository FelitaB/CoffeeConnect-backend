import { MatchStatus, type Interest, type JobRole, type Location, type Match, type Prisma } from "../generated/prisma/client";
import { isRecordNotFound, prisma, type AppPrismaClient } from "../lib/prisma";

export { MatchStatus, type Interest, type Match };

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

    findOfferedMatch(personId: number): Promise<Match | null> {
        return this.db.match.findFirst({
            where: { person_id: personId, status: MatchStatus.OFFERED },
            orderBy: { created_at: "desc" },
        });
    }

    findIncomingPendingMatch(personId: number, matchId: number): Promise<Match | null> {
        return this.db.match.findFirst({
            where: { id: matchId, match_id: personId, status: MatchStatus.PENDING },
        });
    }

    async findPendingMatches(personId: number) {
        const [incoming, outgoing] = await Promise.all([
            this.db.match.findMany({
                where: { match_id: personId, status: MatchStatus.PENDING },
                include: { person: { include: personInclude } },
                orderBy: { matched_at: "asc" },
            }),
            this.db.match.findMany({
                where: { person_id: personId, status: MatchStatus.PENDING },
                include: { match: { include: personInclude } },
                orderBy: { matched_at: "asc" },
            }),
        ]);
        return { incoming, outgoing };
    }

    async findDeclinedIds(personId: number): Promise<Set<number>> {
        return this.db.match.findMany({
            where: {
                status: MatchStatus.DECLINED,
                OR: [{ person_id: personId }, { match_id: personId }],
            },
            select: { person_id: true, match_id: true },
        }).then((matches) => new Set(matches.map((match) =>
            match.person_id === personId ? match.match_id : match.person_id
        )));
    }

    async findMatchedIds(personId: number): Promise<Set<number>> {
        const matches = await this.db.match.findMany({
            where: {
                status: { in: [MatchStatus.PENDING, MatchStatus.ACCEPTED] },
                OR: [{ person_id: personId }, { match_id: personId }],
            },
            select: { person_id: true, match_id: true },
        });
        const ids = new Set<number>();
        for (const match of matches) {
            ids.add(match.person_id === personId ? match.match_id : match.person_id);
        }
        return ids;
    }

    async findActiveMatchCountsSince(since: Date): Promise<Map<number, number>> {
        const matches = await this.db.match.findMany({
            where: {
                status: { in: [MatchStatus.PENDING, MatchStatus.ACCEPTED] },
                matched_at: { gte: since },
            },
            select: { person_id: true, match_id: true },
        });
        const counts = new Map<number, number>();
        for (const match of matches) {
            counts.set(match.person_id, (counts.get(match.person_id) ?? 0) + 1);
            counts.set(match.match_id, (counts.get(match.match_id) ?? 0) + 1);
        }
        return counts;
    }

    createOfferedMatch(personId: number, matchId: number): Promise<Match> {
        return this.db.match.create({
            data: { person_id: personId, match_id: matchId, status: MatchStatus.OFFERED },
        });
    }

    updateMatchStatus(id: number, status: MatchStatus): Promise<Match> {
        return this.db.match.update({
            where: { id },
            data: {
                status,
                ...(status === MatchStatus.PENDING ? { matched_at: new Date() } : {}),
            },
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
