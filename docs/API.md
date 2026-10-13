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
*None required.*

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


