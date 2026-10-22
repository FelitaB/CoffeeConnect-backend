import bcrypt from "bcryptjs";
import { z } from "zod";

import { JobRole, Location } from "../generated/prisma/client";
import { MatchStatus, PeopleRepository, type Match, type Person, type PersonUpdate } from "../repositories/people.repository";
import { HttpError } from "../utils/errors";
import { PaginationSchema, type Paginated } from "../utils/pagination";

const EMAIL_DOMAIN = "@paconsulting.com";
const MAX_MATCHES_PER_WEEK = 2;
const WEEK_SECONDS = 7 * 24 * 60 * 60;

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
export const MatchRecordIdSchema = z.string().regex(/^\d+$/, "Match id must be an integer").transform(Number);

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

export const VerifySetupIdentitySchema = z.object({
    email: EmailSchema,
    user_id: PersonIdSchema,
});

export const LoginSchema = z.object({
    email: EmailSchema,
    password: z.string().min(1, "Password is required"),
});

export const SetPasswordSchema = z.object({
    email: EmailSchema,
    user_id: PersonIdSchema,
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

const MAX_BOOKING_OPTIONS = 8;
const BOOKING_TIME_ZONE = "Europe/London";

function isValidBookingStart(value: string): boolean {
    const startsAt = new Date(value);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date() || startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0) {
        return false;
    }

    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
        timeZone: BOOKING_TIME_ZONE,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
    }).formatToParts(startsAt).map(({ type, value }) => [type, value]));
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const startMinute = hour * 60 + minute;
    return minute % 15 === 0 && startMinute >= 9 * 60 && startMinute <= 16 * 60 + 30;
}

export const ProposeBookingSchema = z.object({
    slots: z.array(z.iso.datetime({ offset: true }))
        .min(1, "Choose at least one time")
        .max(MAX_BOOKING_OPTIONS, `Choose no more than ${MAX_BOOKING_OPTIONS} times`)
        .superRefine((slots, context) => {
            if (new Set(slots.map((slot) => new Date(slot).getTime())).size !== slots.length) {
                context.addIssue({ code: "custom", message: "Choose each time only once" });
            }
            slots.forEach((slot, index) => {
                if (!isValidBookingStart(slot)) {
                    context.addIssue({
                        code: "custom",
                        path: [index],
                        message: "Times must be in the future, use 15-minute increments, and start between 09:00 and 16:30 UK time",
                    });
                }
            });
        }),
});

export const AcceptBookingSchema = z.object({ slot_id: z.number().int().positive() });

export class RegistrationError extends Error {}

// Compared against when no stored hash exists so unknown emails take as long as known ones.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("coffee-connect-dummy-password", 10);

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

// Shared interests outrank location (score = shared * 2 + same office); ties are broken randomly.
export function findBestMatch(person: Person, candidates: Person[]): Person | undefined {
    if (candidates.length === 0) {
        return undefined;
    }

    const myInterests = new Set(person.interests.map((interest) => interest.id));
    const scored = candidates.map((candidate) => ({
        candidate,
        score: candidate.interests.filter((interest) => myInterests.has(interest.id)).length * 2
            + (candidate.location === person.location ? 1 : 0),
    }));

    const best = Math.max(...scored.map((entry) => entry.score));
    const top = scored.filter((entry) => entry.score === best);
    return top[Math.floor(Math.random() * top.length)]?.candidate;
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

    async verifySetupIdentity(body: unknown): Promise<{ verified: boolean }> {
        const { email, user_id } = VerifySetupIdentitySchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsByEmail(email);
        return { verified: !!credentials && !credentials.registered && credentials.id === user_id };
    }

    async setPassword(body: unknown): Promise<Person> {
        const { email, user_id, password } = SetPasswordSchema.parse(body);
        const credentials = await this.peopleRepository.findCredentialsByEmail(email);
        if (!credentials || credentials.registered || credentials.id !== user_id) {
            throw new RegistrationError("Unable to verify this email and user ID");
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

        const matchCounts = await this.peopleRepository.findActiveMatchCountsSince(
            new Date(Date.now() - WEEK_SECONDS * 1000)
        );
        this.assertUnderWeeklyLimit(id, matchCounts);

        const [declinedIds, matchedIds] = await Promise.all([
            this.peopleRepository.findDeclinedIds(id),
            this.peopleRepository.findMatchedIds(id),
        ]);
        const excluded = new Set([id, ...declinedIds, ...matchedIds]);
        const offered = await this.peopleRepository.findOfferedMatch(id);
        if (offered) {
            const offeredPerson = excluded.has(offered.match_id)
                ? null
                : await this.peopleRepository.findById(offered.match_id);
            if (offeredPerson) {
                return { match: offeredPerson };
            }
            await this.peopleRepository.updateMatchStatus(offered.id, MatchStatus.DECLINED);
        }

        const candidates = (await this.peopleRepository.findAll())
            .filter((candidate) => !excluded.has(candidate.id)
                && !this.hasReachedWeeklyLimit(candidate.id, matchCounts));

        const match = findBestMatch(person, candidates);
        if (match) {
            await this.peopleRepository.createOfferedMatch(id, match.id);
        }

        return { match: match ?? null };
    }

    async acceptMatch(id: number): Promise<{ match: Match, person: Person } | undefined> {
        if (!await this.peopleRepository.findById(id)) {
            return undefined;
        }

        const offered = await this.requireOfferedMatch(id);
        const matchedIds = await this.peopleRepository.findMatchedIds(id);
        if (matchedIds.has(offered.match_id)) {
            throw new HttpError(409, "You have already matched with this person. Please spin again.");
        }
        const matchedPerson = await this.peopleRepository.findById(offered.match_id);
        if (!matchedPerson) {
            throw new HttpError(409, "The offered person no longer exists. Please spin again.");
        }

        const matchCounts = await this.peopleRepository.findActiveMatchCountsSince(
            new Date(Date.now() - WEEK_SECONDS * 1000)
        );
        this.assertUnderWeeklyLimit(id, matchCounts);
        if (this.hasReachedWeeklyLimit(offered.match_id, matchCounts)) {
            throw new HttpError(409, "This person has reached their weekly match limit. Please spin again.");
        }

        const match = await this.peopleRepository.updateMatchStatus(offered.id, MatchStatus.PENDING);
        return { match, person: matchedPerson };
    }

    async declineMatch(id: number): Promise<boolean> {
        if (!await this.peopleRepository.findById(id)) {
            return false;
        }

        const offered = await this.requireOfferedMatch(id);
        await this.peopleRepository.updateMatchStatus(offered.id, MatchStatus.DECLINED);
        return true;
    }

    async acceptIncomingMatch(personId: number, matchId: number): Promise<Match | undefined> {
        if (!await this.peopleRepository.findById(personId)) {
            return undefined;
        }

        const pending = await this.peopleRepository.findIncomingPendingMatch(personId, matchId);
        if (!pending) {
            throw new HttpError(409, "No incoming pending match found.");
        }

        return this.peopleRepository.updateMatchStatus(pending.id, MatchStatus.ACCEPTED);
    }

    async findPendingMatches(personId: number) {
        if (!await this.peopleRepository.findById(personId)) {
            return undefined;
        }

        return this.peopleRepository.findPendingMatches(personId);
    }

    async findMeetups(personId: number) {
        if (!await this.peopleRepository.findById(personId)) {
            return undefined;
        }

        const matches = await this.peopleRepository.findMeetups(personId);
        return matches.map((match) => ({
            id: match.id,
            status: match.status,
            matched_at: match.matched_at ?? match.created_at,
            completed_at: match.completed_at,
            direction: match.person_id === personId ? "outgoing" as const : "incoming" as const,
            colleague: match.person_id === personId ? match.match : match.person,
            booking: match.booking ? {
                id: match.booking.id,
                status: match.booking.status,
                scheduled_at: match.booking.scheduled_at,
                confirmed_at: match.booking.confirmed_at,
                proposals: match.booking.proposals.map((proposal) => ({
                    id: proposal.id,
                    status: proposal.status,
                    proposed_by: proposal.proposed_by,
                    proposer: proposal.proposer,
                    created_at: proposal.created_at,
                    slots: proposal.slots,
                })),
            } : null,
        }));
    }

    async proposeBooking(personId: number, matchId: number, body: unknown) {
        const { slots } = ProposeBookingSchema.parse(body);
        if (!await this.peopleRepository.findById(personId)) return undefined;

        const result = await this.peopleRepository.proposeBooking(personId, matchId, slots.map((slot) => new Date(slot)));
        if (result.kind === "not-eligible") {
            throw new HttpError(409, "Only participants in an accepted, active match can propose a time.");
        }
        if (result.kind === "waiting") {
            throw new HttpError(409, "Wait for the other participant to accept or counter the current proposal.");
        }
        if (result.kind === "confirmed") {
            throw new HttpError(409, "A time is already confirmed for this match.");
        }

        return this.peopleRepository.findBookingForMatch(matchId);
    }

    async acceptBookingSlot(personId: number, matchId: number, body: unknown) {
        const { slot_id } = AcceptBookingSchema.parse(body);
        if (!await this.peopleRepository.findById(personId)) return undefined;

        const result = await this.peopleRepository.acceptBookingSlot(personId, matchId, slot_id);
        if (result.kind === "not-eligible") {
            throw new HttpError(409, "Only participants in an accepted, active match can confirm a booking.");
        }
        if (result.kind === "waiting") {
            throw new HttpError(409, "No time proposal is waiting for your response.");
        }
        if (result.kind === "confirmed") {
            throw new HttpError(409, "A time is already confirmed for this match.");
        }
        if (result.kind === "invalid-slot") {
            throw new HttpError(409, "Choose an available time from the current proposal.");
        }

        return this.peopleRepository.findBookingForMatch(matchId);
    }

    async completeMatch(personId: number, matchId: number): Promise<Match | undefined> {
        if (!await this.peopleRepository.findById(personId)) {
            return undefined;
        }

        const match = await this.peopleRepository.completeMatch(personId, matchId);
        if (!match) {
            throw new HttpError(409, "Only a participant in an accepted match can mark it completed.");
        }
        return match;
    }

    async declineIncomingMatch(personId: number, matchId: number): Promise<boolean> {
        if (!await this.peopleRepository.findById(personId)) {
            return false;
        }

        const pending = await this.peopleRepository.findIncomingPendingMatch(personId, matchId);
        if (!pending) {
            throw new HttpError(409, "No incoming pending match found.");
        }

        await this.peopleRepository.updateMatchStatus(pending.id, MatchStatus.DECLINED);
        return true;
    }

    private async requireOfferedMatch(id: number): Promise<Match> {
        const offered = await this.peopleRepository.findOfferedMatch(id);
        if (!offered) {
            throw new HttpError(409, "No offered match. Spin first.");
        }
        return offered;
    }

    private hasReachedWeeklyLimit(id: number, counts: Map<number, number>): boolean {
        return (counts.get(id) ?? 0) >= MAX_MATCHES_PER_WEEK;
    }

    private assertUnderWeeklyLimit(id: number, counts: Map<number, number>): void {
        if (this.hasReachedWeeklyLimit(id, counts)) {
            throw new HttpError(429, `You can have at most ${MAX_MATCHES_PER_WEEK} matches per week.`);
        }
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
