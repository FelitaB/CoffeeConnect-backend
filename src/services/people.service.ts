import { z } from "zod";

import { Location } from "../repositories/chat.repository.ts";
import { PeopleRepository, type Interest, type Person, type PersonUpdate } from "../repositories/people.repository.ts";
import { PaginationSchema, type Paginated } from "../utils/pagination.ts";

const EMAIL_DOMAIN = "@paconsulting.com";

export const PersonIdSchema = z.string().regex(/^\d{5}$/, "Person id must be a 5-digit number").transform(Number);

const EmailSchema = z.string().trim().toLowerCase()
    .pipe(z.email("A valid email is required"))
    .refine((email) => email.endsWith(EMAIL_DOMAIN), `Email must be a ${EMAIL_DOMAIN} address`);

export const CreatePersonSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: EmailSchema,
    location: z.enum(Location),
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

    findAll(): Person[] {
        return this.peopleRepository.findAll();
    }

    getPaginatedShifts(page: number, limit: number): Paginated<Person> {
        PaginationSchema.parse({ page, limit });

        const total = this.peopleRepository.count();
        return {
            data: this.peopleRepository.findPaginated((page - 1) * limit, limit),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    findById(id: number): Person | undefined {
        return this.peopleRepository.findById(id);
    }

    delete(id: number): boolean {
        return this.peopleRepository.delete(id);
    }

    create(body: unknown): Person {
        const input = CreatePersonSchema.parse(body);

        return this.peopleRepository.create(
            input.first_name,
            input.last_name,
            input.email,
            input.location,
            this.resolveInterests(input.interest_ids)
        );
    }

    update(id: number, body: unknown): Person | undefined {
        if (!this.peopleRepository.findById(id)) {
            return undefined;
        }

        const { interest_ids, ...changes } = UpdatePersonSchema.parse(body);
        const update: PersonUpdate = {};

        if (changes.first_name !== undefined) update.first_name = changes.first_name;
        if (changes.last_name !== undefined) update.last_name = changes.last_name;
        if (changes.email !== undefined) update.email = changes.email;
        if (changes.location !== undefined) update.location = changes.location;
        if (interest_ids !== undefined) update.interests = this.resolveInterests(interest_ids);

        return this.peopleRepository.update(id, update);
    }

    spin(id: number): { match: Person | null } | undefined {
        const person = this.peopleRepository.findById(id);
        if (!person) {
            return undefined;
        }

        const candidates = this.peopleRepository.findAll().filter((candidate) => candidate.id !== id);
        return { match: findBestMatch(person, candidates) ?? null };
    }

    private resolveInterests(ids: number[]): Interest[] {
        const uniqueIds = [...new Set(ids)];
        const interests = this.peopleRepository.findInterestsByIds(uniqueIds);
        if (interests.length !== uniqueIds.length) {
            //throw new Error("One or more interest IDs do not exist");
        }

        return interests;
    }
}
