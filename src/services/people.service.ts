import { Location } from "../repositories/chat.repository.ts";
import { PeopleRepository, type Interest, type Person, type PersonUpdate } from "../repositories/people.repository.ts";

export interface CreatePersonInput {
    first_name: string,
    last_name: string,
    email: string,
    location: Location,
    interest_ids: number[]
}

export type UpdatePersonInput = Partial<CreatePersonInput>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    findById(id: number): Person | undefined {
        return this.peopleRepository.findById(id);
    }

    delete(id: number): boolean {
        return this.peopleRepository.delete(id);
    }

    create(input: CreatePersonInput): Person {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
            throw new Error("Body must be a JSON object");
        }

        this.validateName(input.first_name, "First name");
        this.validateName(input.last_name, "Last name");
        this.validateEmail(input.email);
        this.validateLocation(input.location);
        const interests = this.resolveInterests(input.interest_ids);

        return this.peopleRepository.create(
            input.first_name.trim(),
            input.last_name.trim(),
            input.email.trim().toLowerCase(),
            input.location,
            interests
        );
    }

    update(id: number, changes: UpdatePersonInput): Person | undefined {
        if (!this.peopleRepository.findById(id)) {
            return undefined;
        }

        if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
            throw new Error("Body must be a JSON object");
        }

        const fields = Object.keys(changes);
        const allowedFields = ["first_name", "last_name", "email", "location", "interest_ids"];
        if (fields.length === 0 || fields.some((field) => !allowedFields.includes(field))) {
            throw new Error("Provide one or more of: " + allowedFields.join(", "));
        }

        const update: PersonUpdate = {};

        if ("first_name" in changes) {
            this.validateName(changes.first_name, "First name");
            update.first_name = changes.first_name.trim();
        }

        if ("last_name" in changes) {
            this.validateName(changes.last_name, "Last name");
            update.last_name = changes.last_name.trim();
        }

        if ("email" in changes) {
            this.validateEmail(changes.email);
            update.email = changes.email.trim().toLowerCase();
        }

        if ("location" in changes) {
            this.validateLocation(changes.location);
            update.location = changes.location;
        }

        if ("interest_ids" in changes) {
            update.interests = this.resolveInterests(changes.interest_ids);
        }

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

    private validateName(value: unknown, label: string): asserts value is string {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(label + " is required");
        }
    }

    private validateEmail(value: unknown): asserts value is string {
        if (typeof value !== "string" || !EMAIL_PATTERN.test(value.trim())) {
            throw new Error("A valid email is required");
        }
    }

    private validateLocation(value: unknown): asserts value is Location {
        if (!Object.values(Location).some((location) => location === value)) {
            throw new Error("Location must be one of: " + Object.values(Location).join(", "));
        }
    }

    private resolveInterests(ids: unknown): Interest[] {
        if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
            //throw new Error("Interest IDs must be an array of integers");
        }

        const uniqueIds = [...new Set(ids as number[])];
        const interests = this.peopleRepository.findInterestsByIds(uniqueIds);
        if (interests.length !== uniqueIds.length) {
            //throw new Error("One or more interest IDs do not exist");
        }

        return interests;
    }
}
