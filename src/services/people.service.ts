import { z } from "zod";

import { JobRole, Location } from "../generated/prisma/client";
import { PeopleRepository, type Person, type PersonUpdate } from "../repositories/people.repository";
import { PaginationSchema, type Paginated } from "../utils/pagination";

const EMAIL_DOMAIN = "@paconsulting.com";

export const JOB_CAPABILITIES = [
    "Advanced Data Analytics",
    "Architecture",
    "Backend Engineering",
    "Biomedical Devices",
    "Data Engineering",
    "Delivery & Transformation",
    "DevOps",
    "Digital Design",
    "Experience Design",
    "Frontend Engineering",
    "Human Factors",
    "Network Technology",
    "Physics",
    "Process & Automation",
    "Product & Strategy",
    "Quality Assurance & Test",
    "Research Operations",
    "Simulation & Modelling",
    "Software & AI Enabled Systems",
] as const;

export const JOB_GO_TO_MARKETS = [
    "Consumer & Manufacturing",
    "Defence & Security",
    "Energy & Utilities",
    "Financial Services",
    "Government & Public Sector",
    "Health",
    "Life Sciences",
    "Transport",
] as const;

export const PersonIdSchema = z.string().regex(/^\d{5}$/, "Person id must be a 5-digit number").transform(Number);

const EmailSchema = z.string().trim().toLowerCase()
    .pipe(z.email("A valid email is required"))
    .refine((email) => email.endsWith(EMAIL_DOMAIN), `Email must be a ${EMAIL_DOMAIN} address`);

export const CreatePersonSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: EmailSchema,
    location: z.enum(Location),
    job_role: z.enum(JobRole),
    job_capability: z.enum(JOB_CAPABILITIES),
    job_go_to_market: z.enum(JOB_GO_TO_MARKETS),
    interest_ids: z.array(z.number().int()),
});

export const UpdatePersonSchema = CreatePersonSchema.partial().strict()
    .refine((changes) => Object.keys(changes).length > 0, "Provide one or more of: " + Object.keys(CreatePersonSchema.shape).join(", "));

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

// Placeholder: the matching algorithm will be implemented later.
export function findBestMatch(person: Person, candidates: Person[]): Person | undefined {
    void person;
    void candidates;
    return undefined;
}

export class PeopleService
{
    constructor(private readonly peopleRepository: PeopleRepository = new PeopleRepository()) {}

    findAll(): Promise<Person[]> {
        return this.peopleRepository.findAll();
    }

    async getPaginatedShifts(page: number, limit: number): Promise<Paginated<Person>> {
        PaginationSchema.parse({ page, limit });

        const [total, data] = await Promise.all([
            this.peopleRepository.count(),
            this.peopleRepository.findPaginated((page - 1) * limit, limit),
        ]);
        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    findById(id: number): Promise<Person | null> {
        return this.peopleRepository.findById(id);
    }

    delete(id: number): Promise<boolean> {
        return this.peopleRepository.delete(id);
    }

    async create(body: unknown): Promise<Person> {
        const input = CreatePersonSchema.parse(body);

        return this.peopleRepository.create({
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email,
            location: input.location,
            job_role: input.job_role,
            job_capability: input.job_capability,
            job_go_to_market: input.job_go_to_market,
            interest_ids: await this.resolveInterestIds(input.interest_ids),
        });
    }

    async update(id: number, body: unknown): Promise<Person | null> {
        const { interest_ids, ...changes } = UpdatePersonSchema.parse(body);
        const update: PersonUpdate = {};

        if (changes.first_name !== undefined) update.first_name = changes.first_name;
        if (changes.last_name !== undefined) update.last_name = changes.last_name;
        if (changes.email !== undefined) update.email = changes.email;
        if (changes.location !== undefined) update.location = changes.location;
        if (changes.job_role !== undefined) update.job_role = changes.job_role;
        if (changes.job_capability !== undefined) update.job_capability = changes.job_capability;
        if (changes.job_go_to_market !== undefined) update.job_go_to_market = changes.job_go_to_market;
        if (interest_ids !== undefined) update.interest_ids = await this.resolveInterestIds(interest_ids);

        return this.peopleRepository.update(id, update);
    }

    async spin(id: number): Promise<{ match: Person | null } | undefined> {
        const person = await this.peopleRepository.findById(id);
        if (!person) {
            return undefined;
        }

        const candidates = (await this.peopleRepository.findAll()).filter((candidate) => candidate.id !== id);
        return { match: findBestMatch(person, candidates) ?? null };
    }

    private async resolveInterestIds(ids: number[]): Promise<number[]> {
        const uniqueIds = [...new Set(ids)];
        const interests = await this.peopleRepository.findInterestsByIds(uniqueIds);
        if (interests.length !== uniqueIds.length) {
            //throw new Error("One or more interest IDs do not exist");
        }

        return interests.map((interest) => interest.id);
    }
}
