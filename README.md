# Happy Thoughts API

A REST API for managing happy thoughts with filtering, sorting, and pagination.

## Endpoints

- `GET /` - List all available endpoints
- `GET /thoughts` - Get all thoughts (with optional filters)
- `GET /thoughts/:id` - Get single thought by ID

## Query Parameters

**GET /thoughts** supports:

- `page` - Page number (pagination)
- `limit` - Results per page (1-100)
- `category` - Filter by category
- `sort` - Sort by hearts, createdAt, \_id, message (use `-` for descending)

## Examples

```bash
# Get all thoughts
curl http://localhost:8080/thoughts

# Get thoughts with pagination
curl http://localhost:8080/thoughts?page=1&limit=5

# Filter and sort
curl http://localhost:8080/thoughts?category=Food&sort=-hearts
```

## Development

```bash
npm install
npm run dev
```

Server runs on http://localhost:8080
