const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/coffee_connect_test";

const { PeopleService, ProposeBookingSchema } = require("../src/services/people.service");
const { PeopleRepository, MatchStatus } = require("../src/repositories/people.repository");
const { PeopleController } = require("../src/controllers/people.controller");

const person = (id) => ({
    id, first_name: `Person ${id}`, last_name: "Test", email: `${id}@paconsulting.com`,
    location: "LONDON", interests: [{ id: 1, name: "Coffee" }],
});
const initiator = person(10001);
const recipient = person(10002);
const other = person(10003);
const completed = {
    id: 1, person_id: initiator.id, match_id: recipient.id, status: MatchStatus.ACCEPTED,
    created_at: new Date("2026-10-01T12:00:00Z"), matched_at: new Date("2026-10-01T12:00:00Z"),
    completed_at: new Date("2026-10-02T12:00:00Z"), person: initiator, match: recipient,
};

test("meetups show the other participant for either side with the same completion date", async () => {
    const service = new PeopleService({
        findById: async (id) => person(id), findMeetups: async () => [completed],
    });
    const sent = await service.findMeetups(initiator.id);
    const received = await service.findMeetups(recipient.id);
    assert.equal(sent[0].colleague.id, recipient.id);
    assert.equal(received[0].colleague.id, initiator.id);
    assert.equal(sent[0].direction, "outgoing");
    assert.equal(received[0].direction, "incoming");
    assert.equal(sent[0].completed_at, received[0].completed_at);
});

test("meetups return an empty list for no matches and undefined for unknown people", async () => {
    const service = new PeopleService({ findById: async () => initiator, findMeetups: async () => [] });
    assert.deepEqual(await service.findMeetups(initiator.id), []);
    const missing = new PeopleService({ findById: async () => null });
    assert.equal(await missing.findMeetups(99999), undefined);
    assert.equal(await missing.completeMatch(99999, 1), undefined);
});

test("completion rejects non-participants and matches that are not accepted", async () => {
    const service = new PeopleService({ findById: async () => initiator, completeMatch: async () => null });
    await assert.rejects(service.completeMatch(initiator.id, 1), { statusCode: 409 });
});

test("completion atomically requires an accepted participant match and preserves its first date", async () => {
    let stored = { ...completed, completed_at: null };
    const db = { match: {
        updateMany: async ({ where, data }) => {
            assert.equal(where.status, MatchStatus.ACCEPTED);
            assert.equal(where.completed_at, null);
            assert.deepEqual(where.OR, [{ person_id: initiator.id }, { match_id: initiator.id }]);
            if (!stored.completed_at) stored = { ...stored, ...data };
        },
        findFirst: async ({ where }) => {
            assert.deepEqual(where.completed_at, { not: null });
            return stored;
        },
    } };
    const repository = new PeopleRepository(db);
    const first = await repository.completeMatch(initiator.id, 1);
    const second = await repository.completeMatch(initiator.id, 1);
    assert.equal(first.completed_at, second.completed_at);
});

test("meetup query excludes offers and declines, includes both sides, and sorts history newest first", async () => {
    const repository = new PeopleRepository({ match: { findMany: async (query) => {
        assert.deepEqual(query.where.status.in, [MatchStatus.PENDING, MatchStatus.ACCEPTED]);
        assert.deepEqual(query.where.OR, [{ person_id: initiator.id }, { match_id: initiator.id }]);
        assert.deepEqual(query.orderBy[0], { completed_at: "desc" });
        return [];
    } } });
    assert.deepEqual(await repository.findMeetups(initiator.id), []);
});

test("completed accepted pairs stay excluded in both directions without an age cutoff", async () => {
    const repository = new PeopleRepository({ match: { findMany: async (query) => {
        assert.ok(query.where.status.in.includes(MatchStatus.ACCEPTED));
        assert.equal(query.where.matched_at, undefined);
        assert.equal(query.where.completed_at, undefined);
        return [completed];
    } } });
    assert.deepEqual(await repository.findMatchedIds(initiator.id), new Set([recipient.id]));
    assert.deepEqual(await repository.findMatchedIds(recipient.id), new Set([initiator.id]));
});

function spinRepository(overrides = {}) {
    return {
        findById: async (id) => person(id),
        findActiveMatchCountsSince: async () => new Map(),
        findDeclinedIds: async () => new Set(),
        findMatchedIds: async () => new Set([recipient.id]),
        findOfferedMatch: async () => null,
        findAll: async () => [initiator, recipient, other],
        createOfferedMatch: async (personId, matchId) => {
            assert.equal(personId, initiator.id);
            assert.equal(matchId, other.id);
        },
        ...overrides,
    };
}

test("spin excludes completed colleagues and self but still offers a new colleague", async () => {
    const service = new PeopleService(spinRepository());
    assert.equal((await service.spin(initiator.id)).match.id, other.id);
});

test("spin discards an existing offer if that pair has since completed a call", async () => {
    let discarded = false;
    const service = new PeopleService(spinRepository({
        findOfferedMatch: async () => ({ id: 2, match_id: recipient.id }),
        updateMatchStatus: async (id, status) => {
            assert.equal(id, 2);
            assert.equal(status, MatchStatus.DECLINED);
            discarded = true;
        },
    }));
    assert.equal((await service.spin(initiator.id)).match.id, other.id);
    assert.ok(discarded);
});

test("accepting a stale offer cannot reintroduce a completed colleague", async () => {
    const service = new PeopleService(spinRepository({
        findOfferedMatch: async () => ({ id: 2, match_id: recipient.id }),
    }));
    await assert.rejects(service.acceptMatch(initiator.id), { statusCode: 409 });
});

test("weekly cap and unavailable-candidate behavior stay in place", async () => {
    const capped = new PeopleService(spinRepository({
        findActiveMatchCountsSince: async () => new Map([[initiator.id, 2]]),
    }));
    await assert.rejects(capped.spin(initiator.id), { statusCode: 429 });
    const empty = new PeopleService(spinRepository({ findAll: async () => [initiator, recipient] }));
    assert.deepEqual(await empty.spin(initiator.id), { match: null });
});

test("completed matches still count toward the existing two-per-week limit", async () => {
    const since = new Date("2026-10-01T00:00:00Z");
    const repository = new PeopleRepository({ match: { findMany: async (query) => {
        assert.ok(query.where.status.in.includes(MatchStatus.ACCEPTED));
        assert.deepEqual(query.where.matched_at, { gte: since });
        assert.equal(query.where.completed_at, undefined);
        return [completed];
    } } });
    const counts = await repository.findActiveMatchCountsSince(since);
    assert.equal(counts.get(initiator.id), 1);
    assert.equal(counts.get(recipient.id), 1);
});

for (const participantId of [initiator.id, recipient.id]) {
    test(`either participant can complete an accepted match (${participantId})`, async () => {
        const service = new PeopleService({
            findById: async () => person(participantId),
            completeMatch: async (personId, matchId) => {
                assert.equal(personId, participantId);
                assert.equal(matchId, completed.id);
                return completed;
            },
        });
        assert.equal((await service.completeMatch(participantId, completed.id)).completed_at, completed.completed_at);
    });
}

function responseRecorder() {
    return {
        code: 0, body: undefined,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("history controller returns data, rejects invalid IDs, and handles missing people", async () => {
    const controller = new PeopleController({ findMeetups: async (id) => id === initiator.id ? [] : undefined });
    const response = responseRecorder();
    await controller.findMeetups({ params: { id: String(initiator.id) } }, response);
    assert.equal(response.code, 200);
    assert.deepEqual(response.body, []);
    await controller.findMeetups({ params: { id: "invalid" } }, response);
    assert.equal(response.code, 400);
    await controller.findMeetups({ params: { id: "99999" } }, response);
    assert.equal(response.code, 404);
});

test("completion controller validates IDs and returns completion or conflict", async () => {
    const controller = new PeopleController(new PeopleService({
        findById: async (id) => id === 99999 ? null : initiator,
        completeMatch: async (_personId, matchId) => matchId === 1 ? completed : null,
    }));
    const response = responseRecorder();
    await controller.completeMatch({ params: { id: "10001", matchId: "1" } }, response);
    assert.equal(response.code, 200);
    assert.equal(response.body.completed_at, completed.completed_at);
    await controller.completeMatch({ params: { id: "10001", matchId: "invalid" } }, response);
    assert.equal(response.code, 400);
    await controller.completeMatch({ params: { id: "10001", matchId: "2" } }, response);
    assert.equal(response.code, 409);
    await controller.completeMatch({ params: { id: "99999", matchId: "1" } }, response);
    assert.equal(response.code, 404);
});

test("booking proposals accept future London half-hour starts on quarter-hour boundaries", () => {
    const result = ProposeBookingSchema.safeParse({ slots: [
        "2027-01-12T09:00:00.000Z",
        "2027-01-12T09:15:00.000Z",
        "2027-01-12T16:30:00.000Z",
    ] });
    assert.equal(result.success, true);
});

test("booking proposals reject past, off-grid, outside-hours, duplicate and excessive options", () => {
    for (const slots of [
        ["2020-01-01T09:00:00.000Z"],
        ["2027-01-12T09:07:00.000Z"],
        ["2027-01-12T08:45:00.000Z"],
        ["2027-01-12T16:45:00.000Z"],
        ["2027-01-16T09:00:00.000Z"],
        ["2027-01-17T09:00:00.000Z"],
        ["2027-01-12T09:00:00.000Z", "2027-01-12T10:00:00+01:00"],
        Array.from({ length: 9 }, (_, index) => `2027-01-${String(12 + index).padStart(2, "0")}T09:00:00.000Z`),
    ]) {
        assert.equal(ProposeBookingSchema.safeParse({ slots }).success, false);
    }
});

test("booking proposal transaction permits first proposal and alternating counteroffers", async () => {
    const proposals = [];
    const createdSlots = [];
    let nextProposalId = 1;
    const tx = {
        match: { findFirst: async (query) => {
            assert.equal(query.where.status, MatchStatus.ACCEPTED);
            assert.equal(query.where.completed_at, null);
            return { id: 10 };
        } },
        booking: { upsert: async () => ({ id: 20, match_id: 10, status: "PROPOSED" }) },
        bookingProposal: {
            findFirst: async () => proposals.find((proposal) => proposal.status === "OPEN") ?? null,
            updateMany: async ({ where, data }) => {
                const active = proposals.find((proposal) => proposal.id === where.booking_id && proposal.status === "OPEN");
                for (const proposal of proposals) if (proposal.status === "OPEN") proposal.status = data.status;
                return { count: active ? 1 : 0 };
            },
            create: async ({ data }) => {
                const proposal = { id: nextProposalId++, ...data, status: "OPEN" };
                proposals.push(proposal);
                return proposal;
            },
        },
        bookingSlot: { createMany: async ({ data }) => { createdSlots.push(...data); return { count: data.length }; } },
    };
    const repository = new PeopleRepository({ $transaction: (work) => work(tx) });
    const slots = [new Date("2027-01-12T09:00:00Z"), new Date("2027-01-12T09:15:00Z")];
    assert.deepEqual(await repository.proposeBooking(initiator.id, 10, slots), { kind: "updated", bookingId: 20 });
    assert.deepEqual(await repository.proposeBooking(recipient.id, 10, slots), { kind: "updated", bookingId: 20 });
    assert.equal(proposals[0].status, "SUPERSEDED");
    assert.equal(proposals[1].proposed_by, recipient.id);
    assert.equal(createdSlots.length, 4);
    assert.deepEqual(await repository.proposeBooking(recipient.id, 10, slots), { kind: "waiting" });
    assert.equal(proposals.length, 2);
});

test("booking acceptance only confirms a slot in another participant's active proposal", async () => {
    let proposalStatus = "OPEN";
    let bookingStatus = "PROPOSED";
    let scheduledAt = null;
    const selectedTime = new Date("2027-01-12T09:00:00Z");
    const tx = {
        match: { findFirst: async () => ({ id: 10 }) },
        booking: { findUnique: async () => ({ id: 20, status: bookingStatus, scheduled_at: scheduledAt }), updateMany: async ({ data }) => {
            if (bookingStatus === "CONFIRMED") return { count: 0 };
            bookingStatus = data.status;
            scheduledAt = data.scheduled_at;
            return { count: 1 };
        } },
        bookingProposal: { findFirst: async () => ({ id: 30, proposed_by: initiator.id, status: proposalStatus }), updateMany: async ({ data }) => {
            if (proposalStatus !== "OPEN") return { count: 0 };
            proposalStatus = data.status;
            return { count: 1 };
        } },
        bookingSlot: { findFirst: async ({ where }) => where.id === 40 && where.proposal_id === 30 ? { id: 40, proposal_id: 30, starts_at: selectedTime } : null },
    };
    const repository = new PeopleRepository({ $transaction: (work) => work(tx) });
    assert.deepEqual(await repository.acceptBookingSlot(initiator.id, 10, 40), { kind: "waiting" });
    assert.deepEqual(await repository.acceptBookingSlot(recipient.id, 10, 999), { kind: "invalid-slot" });
    assert.equal(proposalStatus, "OPEN");
    assert.deepEqual(await repository.acceptBookingSlot(recipient.id, 10, 40), { kind: "updated", bookingId: 20 });
    assert.equal(proposalStatus, "ACCEPTED");
    assert.equal(bookingStatus, "CONFIRMED");
    assert.equal(scheduledAt, selectedTime);
});

test("booking service validates proposals and rejects nonparticipants and an existing proposal owner", async () => {
    const proposedSlots = ["2027-01-12T09:00:00.000Z", "2027-01-12T09:15:00.000Z"];
    let persistedDates;
    const service = new PeopleService({
        findById: async () => initiator,
        proposeBooking: async (_personId, _matchId, slots) => {
            persistedDates = slots;
            return { kind: "updated", bookingId: 42 };
        },
        findBookingForMatch: async () => ({ id: 42, status: "PROPOSED" }),
        acceptBookingSlot: async () => ({ kind: "not-eligible" }),
    });
    assert.deepEqual(await service.proposeBooking(initiator.id, 10, { slots: proposedSlots }), { id: 42, status: "PROPOSED" });
    assert.ok(persistedDates.every((slot) => slot instanceof Date));
    await assert.rejects(service.proposeBooking(initiator.id, 10, { slots: ["2027-01-12T08:07:00.000Z"] }));
    await assert.rejects(service.acceptBookingSlot(initiator.id, 10, { slot_id: 7 }), { statusCode: 409 });

    const unknown = new PeopleService({ findById: async () => null });
    assert.equal(await unknown.proposeBooking(99999, 10, { slots: proposedSlots }), undefined);
    assert.equal(await unknown.acceptBookingSlot(99999, 10, { slot_id: 7 }), undefined);
});

test("booking controller validates route and body and maps unknown participants", async () => {
    const controller = new PeopleController({
        proposeBooking: async (personId, matchId, body) => {
            assert.equal(personId, initiator.id);
            assert.equal(matchId, 10);
            assert.deepEqual(body, { slots: ["2027-01-12T09:00:00.000Z"] });
            return { id: 42 };
        },
        acceptBookingSlot: async () => undefined,
    });
    const response = responseRecorder();
    await controller.proposeBooking({ params: { id: "10001", matchId: "10" }, body: { slots: ["2027-01-12T09:00:00.000Z"] } }, response);
    assert.equal(response.code, 201);
    assert.deepEqual(response.body, { id: 42 });
    await controller.proposeBooking({ params: { id: "invalid", matchId: "10" }, body: { slots: [] } }, response);
    assert.equal(response.code, 400);
    await controller.acceptBookingSlot({ params: { id: "10001", matchId: "10" }, body: { slot_id: 7 } }, response);
    assert.equal(response.code, 404);
});