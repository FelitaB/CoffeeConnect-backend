# API Documentation

The base URL for all endpoints is: `http://localhost:5000/`.

## Authentication

To be decided later. The authentication headers in the endpoints later is boilerplate and is not yet implemented.

## Chats Endpoint

### Chat interface
The `Chat` interface follows this structure:

```typescript
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
```

The `ChatStatus` enum can be one of the following: `PENDING`, `ACCEPTED`, `DECLINED`, `COMPLETED`, `CANCELLED`.

### Get all chats
Retrieves all the existing chats in the database in the form of an array of `Chat` objects.

* **URL:** `/chats/`
* **Method:** `GET`
* **Headers:**
  * `Authorization: Bearer <token>`

#### Request Parameters
*None required.*

#### Example Response (200 OK)
```json
{
  "chats" : [{
    "id": "94caf095-9fb0-4f50-85db-265d8072c35a",
    "sender_id": 2102,
    "receiver_id": 2810,
    "location_id": "LONDON",
    "datetime": 1791897159,
    "status": "ACCEPTED",
    "created_at": 1791634359
  }]
}
```

### Get all chats involving a user
Retrieves all chats where the user is either the sender or receiver, ordered by creation time (oldest first).

* **URL:** `/api/chats/user/:userId`
* **Method:** `GET`

#### Request Parameters
The user's 5-digit ID is supplied in the URL, for example `/api/chats/user/10059`.

#### Response (200 OK)
An array of `Chat` objects. Returns `[]` when no chats involve the user.

#### Error Responses
* `400`: the user ID is not a 5-digit number.

### Get specific chat
Retrieves a specific chat by its ID.

* **URL:** `/chats/:id`
* **Method:** `GET`
* **Headers:**
  * `Authorization: Bearer <token>`

#### Request Parameters
The chat ID is to be supplied in the URL

#### Example Response (200 OK)
```json
{
  "id": "94caf095-9fb0-4f50-85db-265d8072c35a",
  "sender_id": 2102,
  "receiver_id": 2810,
  "location_id": "LONDON",
  "datetime": 1791897159,
  "status": "ACCEPTED",
  "created_at": 1791634359
}
```

### Edits a specific chat
Edits a specific chat's fields by choice.

* **URL:** `/chats/:id`
* **Method:** `PATCH`
* **Headers:**
  * `Authorization: Bearer <token>`

#### Request Parameters
The chat ID is to be supplied in the URL

#### Example Response (200 OK)
```json
{
    "id": "04bc61aa-a0d8-43fa-be7c-ce160cd7fb9c",
    "sender_id": 29122,
    "receiver_id": 10291,
    "location_id": "LONDON",
    "datetime": 1795634359,
    "status": "ACCEPTED",
    "created_at": 1791903654
}
```

### Delete a specific chat
Deletes a chat by its ID.

* **URL:** `/api/chats/:id`
* **Method:** `DELETE`
* **Headers:**
  * `Authorization: Bearer <token>`

#### Request Parameters
The chat ID is to be supplied in the URL

#### Request Body
*None required.*

#### Example Response (204 No Content)
The chat is deleted. No response body is returned.


## People Endpoint

### Get a specific person
Retrieves a person by their 5-digit ID, including their interests. `hashedPassword` is never returned.

* **URL:** `/api/people/:id`
* **Method:** `GET`

#### Request Parameters
The 5-digit person ID is supplied in the URL.

#### Example Response (200 OK)
```json
{
  "id": 10059,
  "first_name": "Jasmine",
  "last_name": "Campbell",
  "email": "jasmine.campbell@paconsulting.com",
  "location": "LONDON",
  "job_role": "CON",
  "job_capability": "Digital Design",
  "job_go_to_market": "Health",
  "registered": false,
  "created_at": "2026-10-15T14:30:00.000Z",
  "updated_at": "2026-10-15T14:30:00.000Z",
  "interests": [
    { "id": 1, "name": "Coffee and cafes", "created": "2026-10-15T14:30:00.000Z" }
  ]
}
```

#### Error Responses
* `400`: the ID is not a 5-digit number.
* `404`: person not found.

### Check an email
Checks whether an email belongs to a person whose `registered` flag is true. Unknown emails also return `registered: false`, so the response does not reveal which emails exist.

* **URL:** `/api/people/check-email`
* **Method:** `POST`

#### Request Body
```json
{
  "email": "jane.doe@paconsulting.com"
}
```

#### Example Response (200 OK)
```json
{
  "registered": true
}
```

### Log in
Checks an email and password against the stored bcrypt hash. On success, returns the person without the password hash.

* **URL:** `/api/people/login`
* **Method:** `POST`

#### Request Body
```json
{
  "email": "jane.doe@paconsulting.com",
  "password": "your-password"
}
```

#### Example Response (200 OK)
The `Person` object, without `hashedPassword`.

#### Example Response (401 Unauthorized)
```json
{
  "status": "fail",
  "message": "Invalid email or password",
  "errors": []
}
```

### Verify setup identity
Checks whether a work email and 5-digit user ID match the same person awaiting registration.

* **URL:** `/api/people/verify-setup-identity`
* **Method:** `POST`

#### Request Body
```json
{
  "email": "jane.doe@paconsulting.com",
  "user_id": "12345"
}
```

#### Example Response (200 OK)
```json
{
  "verified": true
}
```

Unknown emails, mismatched IDs, and already registered people return `verified: false`. Invalid input returns `400`.

### Set a password
Hashes and saves a password for an existing person who is not registered yet, requiring a matching email and user ID. This also sets `registered` to `true`, so subsequent sign-ins ask for the password instead of the user ID. Interests can then be saved using `PATCH /api/people/:id`.

> **Security note:** this endpoint does not yet verify that the caller owns the email inbox. Add email verification before going live.

* **URL:** `/api/people/set-password`
* **Method:** `POST`

#### Request Body
```json
{
  "email": "jane.doe@paconsulting.com",
  "user_id": "12345",
  "password": "Coffee1234!"
}
```

The password must be 8-20 characters and contain at least one capital letter, one number and one symbol (any character that isn't a letter, number or space).

#### Example Response (200 OK)
The `Person` object, without `hashedPassword`.

#### Example Response (400 Bad Request)
Returned for unknown emails, mismatched IDs, already registered people, or invalid input.
```json
{
  "status": "fail",
  "message": "Unable to verify this email and user ID",
  "errors": []
}
```

### Complete registration
Saves 3 to 10 interests for a person who has chosen a password and sets `registered` to `true`.

* **URL:** `/api/people/:id/complete-registration`
* **Method:** `POST`

#### Request Body
```json
{
  "interest_ids": [1, 4, 9]
}
```

#### Example Response (200 OK)
The updated `Person` object, with `registered: true` and its `interests`.

#### Error Responses
* `400`: invalid interests, no password chosen yet, or already registered.
* `404`: person not found.

### Spin for a match
Returns an offered match for the person. A new offer does not count toward the two active matches per week until the spinner accepts it. Existing pending and accepted matches do count.

* **URL:** `/api/people/:id/spin`
* **Method:** `POST`

#### Example Response (200 OK)
```json
{
  "match": {
    "id": 10042,
    "first_name": "Matilda",
    "last_name": "Turner"
  }
}
```

#### Error Responses
* `404`: person not found.
* `429`: the person already has two pending or accepted matches in the last seven days.

### Accept or decline an offered match
The person who spun can accept the offer, changing it to `PENDING` while the matched person decides, or decline it. Declined pairs are excluded from future spins for either person.

* **Accept URL:** `/api/people/:id/spin/accept`
* **Decline URL:** `/api/people/:id/spin/decline`
* **Method:** `POST`

Accepting checks that both people have a free weekly match slot. The accepted offer becomes a pending match and counts for both people.

### List and respond to pending matches
Lists pending matches involving the person, separated into matches they need to respond to (`incoming`) and matches waiting for their colleague (`outgoing`). Incoming matches can be accepted or declined using the match record ID.

* **List URL:** `/api/people/:id/matches/pending`
* **List Method:** `GET`
* **Accept URL:** `/api/people/:id/matches/:matchId/accept`
* **Decline URL:** `/api/people/:id/matches/:matchId/decline`
* **Accept/Decline Method:** `POST`

Accepting changes the match status to `ACCEPTED`; declining changes it to `DECLINED`. The `:id` must be the matched person's ID, and `:matchId` is the match record ID.

The list response includes `incoming` and `outgoing` arrays. Incoming entries include the initiating person's profile; outgoing entries include the matched person's profile.

### List meetups and call history

* **URL:** `/api/people/:id/meetups`
* **Method:** `GET`

Returns pending and accepted matches involving the person, with the other participant
in `colleague` (including their email, office, job fields and interests, never their
password hash). Offered and declined matches are omitted. No matches returns `[]`;
an unknown person returns `404`, and an invalid person ID returns `400`.

Each entry contains:

```typescript
{
  id: number; // Match record ID
  status: "PENDING" | "ACCEPTED";
  matched_at: string; // ISO timestamp, not a scheduled call time
  completed_at: string | null; // ISO timestamp; non-null entries form call history
  direction: "incoming" | "outgoing";
  colleague: Person;
}
```

Completed entries are ordered newest completion first; other entries are ordered
newest match first, with match ID as a stable tie-breaker. Dates record the match
and the confirmation of completion, not a booked time or a verified Teams call.

### Mark an accepted match completed

* **URL:** `/api/people/:id/matches/:matchId/complete`
* **Method:** `POST`
* **Body:** None

Either participant can complete a mutually accepted match. Returns the match record
with `completed_at` set. Repeated or concurrent confirmation preserves the first
completion timestamp. Both participants then see it in history. Returns `400` for
invalid IDs, `404` for an unknown person, or `409` when the match is not accepted,
does not exist, or the supplied person is not a participant.

Completion retains the `ACCEPTED` status, so the pair remains excluded from spins
permanently in both directions and still counts toward the existing weekly cap
based on `matched_at`. Existing stale offers are checked before being returned or
accepted. This does not create, schedule, or modify records in the separate Chat API.

**Prototype security limitation:** these endpoints follow the existing caller-supplied
person-ID convention, not authenticated authorization. The participant check prevents
an unrelated supplied ID from completing a match, but does not prove caller identity.
Server-side sessions and authorization are required before production use.
