import bcrypt from "bcryptjs";
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

export const CheckEmailSchema = z.object({ email: EmailSchema });

export const LoginSchema = z.object({
    email: EmailSchema,
    password: z.string().min(1, "Password is required"),
});

export const SetPasswordSchema = z.object({
    email: EmailSchema,
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(20, "Password must be at most 20 characters")
        .regex(/[A-Z]/, "Password must contain at least one capital letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9\s]/, "Password must contain at least one symbol"),
});

export const CompleteRegistrationSchema = z.object({
    interest_ids: z.array(z.number().int()).min(3, "Select at least 3 interests").max(10, "Select at most 10 interests"),
});

export class RegistrationError extends Error {}

// Compared against when no stored hash exists so unknown emails take as long as known ones.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("coffee-connect-dummy-password", 10);

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

    // Unknown emails also report registered: false so callers can't tell which emails exist.
    async checkEmail(body: unknown): Promise<{ registered: boolean }> {
        const { email } = CheckEmailSchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsByEmail(email);
        return { registered: credentials?.registered ?? false };
    }

    async login(body: unknown): Promise<Person | null> {
        const { email, password } = LoginSchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsByEmail(email);
        const storedHash = credentials?.registered ? credentials.hashedPassword : null;

        const passwordMatches = await bcrypt.compare(password, storedHash ?? DUMMY_PASSWORD_HASH);
        if (!storedHash || !passwordMatches) {
            return null;
        }

        return this.peopleRepository.findByEmail(email);
    }

    // TODO: anyone who knows an unregistered colleague's email can set their password.
    // Require proof of inbox ownership (e.g. an emailed one-time link) before going live.
    async setPassword(body: unknown): Promise<Person> {
        const { email, password } = SetPasswordSchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsByEmail(email);
        if (!credentials || credentials.registered) {
            throw new RegistrationError("A password can't be set for this email");
        }

        return this.peopleRepository.setPassword(credentials.id, await bcrypt.hash(password, 10));
    }

    async completeRegistration(id: number, body: unknown): Promise<Person | null> {
        const { interest_ids } = CompleteRegistrationSchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsById(id);
        if (!credentials) {
            return null;
        }
        if (credentials.registered) {
            throw new RegistrationError("This person is already registered");
        }
        if (!credentials.hashedPassword) {
            throw new RegistrationError("Choose a password before completing registration");
        }

        const uniqueIds = [...new Set(interest_ids)];
        const interests = await this.peopleRepository.findInterestsByIds(uniqueIds);
        if (interests.length !== uniqueIds.length) {
            throw new RegistrationError("One or more interest IDs do not exist");
        }

        return this.peopleRepository.completeRegistration(id, uniqueIds);
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
