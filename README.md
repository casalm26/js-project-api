# Happy Thoughts API

A simple REST API for happy thoughts.

## Getting started

```bash
npm install
npm run dev
```

Server runs on `http://localhost:8080`

## Endpoints

- `GET /` - List all endpoints
- `GET /thoughts` - Get all thoughts
- `GET /thoughts/:id` - Get single thought

## Development

```bash
npm run lint    # Check code
npm run format  # Format code
```

## API Endpoints

### GET /

Returns a list of all available endpoints in the API.

**Response:**

```json
[
  {
    "path": "/",
    "methods": ["GET"]
  },
  {
    "path": "/thoughts",
    "methods": ["GET"]
  },
  {
    "path": "/thoughts/:id",
    "methods": ["GET"]
  }
]
```

### GET /thoughts

Returns all happy thoughts.

**Response:**

```json
[
  {
    "_id": "682bab8c12155b00101732ce",
    "message": "Berlin baby",
    "hearts": 37,
    "createdAt": "2025-05-19T22:07:08.999Z",
    "__v": 0
  },
  {
    "_id": "682e53cc4fddf50010bbe739",
    "message": "My family!",
    "hearts": 0,
    "createdAt": "2025-05-22T22:29:32.232Z",
    "__v": 0
  }
]
```

### GET /thoughts/:id

Returns a single thought by its ID.

**Parameters:**

- `id` (string): The unique identifier of the thought

**Success Response (200):**

```json
{
  "_id": "682bab8c12155b00101732ce",
  "message": "Berlin baby",
  "hearts": 37,
  "createdAt": "2025-05-19T22:07:08.999Z",
  "__v": 0
}
```

**Error Response (404):**

```json
{
  "error": "Not found"
}
```

## Error Handling

The API returns JSON error responses for all error cases:

- **404 Not Found**: When a thought ID doesn't exist or an endpoint is not found
- **500 Internal Server Error**: For server errors

**Example Error Response:**

```json
{
  "error": "Endpoint not found"
}
```

## Data Structure

Each thought object contains:

- `_id`: Unique identifier
- `message`: The happy thought text
- `hearts`: Number of likes/hearts
- `createdAt`: ISO timestamp of creation
- `__v`: Version key (MongoDB convention)
