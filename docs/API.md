# API Documentation

The base URL for all endpoints is: `http://localhost:5000/`.

The base URL for endpoints interacting with the people is: `http://localhost:5000/people`
The base URL for endpoints interacting with the chats is: `http://localhost:5000/chats`

## Authentication

To be decided later.

## Chats Endpoint

### Get all chats
Retrieves all the existing chats in the database.

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


