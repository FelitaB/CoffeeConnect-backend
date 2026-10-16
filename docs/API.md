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

### Set a password
Hashes and saves a password for an existing person who is not registered yet. This does not mark the person as registered. That happens when registration is completed.

> **Security note:** this endpoint does not yet verify that the caller owns the email inbox. Add email verification before going live.

* **URL:** `/api/people/set-password`
* **Method:** `POST`

#### Request Body
```json
{
  "email": "jane.doe@paconsulting.com",
  "password": "Coffee1234!"
}
```

The password must be 8-20 characters and contain at least one capital letter, one number and one symbol (any character that isn't a letter, number or space).

#### Example Response (200 OK)
The `Person` object, without `hashedPassword`.

#### Example Response (400 Bad Request)
Returned for unknown emails, already registered people, or invalid input.
```json
{
  "status": "fail",
  "message": "A password can't be set for this email",
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
