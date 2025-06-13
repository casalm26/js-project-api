# Happy Thoughts API

A REST API for managing happy thoughts with user authentication, filtering, sorting, and pagination.

## Live API

🌐 **Production URL**: https://friendlytwitter-api.onrender.com
Live full website: https://friendlytwitter.netlify.app/

## Endpoints

### Documentation

- `GET /` - List all available endpoints

### Thoughts

- `GET /thoughts` - Get all thoughts (with optional filters, sorting, pagination)
- `GET /thoughts/:id` - Get single thought by ID
- `POST /thoughts` - Create a new thought (authenticated)
- `PUT /thoughts/:id` - Update a thought (authenticated, owner only)
- `DELETE /thoughts/:id` - Delete a thought (authenticated, owner only)
- `POST /thoughts/:id/like` - Like/unlike a thought (authenticated)

### Authentication

- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile (authenticated)

### Users

- `GET /users/:id/thoughts` - Get thoughts by specific user (authenticated)
- `GET /users/me/thoughts` - Get thoughts created by the current user (authenticated)
- `GET /users/me/likes` - Get thoughts liked by the current user (authenticated)

## Query Parameters

**GET /thoughts** supports:

- `page` - Page number for pagination (default: 1)
- `limit` - Results per page, max 100 (default: 20)
- `category` - Filter by category (case-insensitive)
- `sort` - Sort by: `hearts`, `createdAt`, `updatedAt`, `category` (use `-` prefix for descending)
- `minHearts` - Filter thoughts with minimum number of hearts
- `newerThan` - Filter thoughts created after specific date (ISO format)

**GET /users/me/thoughts** supports the same parameters as GET /thoughts

**GET /users/me/likes** supports:

- `page` - Page number for pagination (default: 1)
- `limit` - Results per page, max 100 (default: 20)
- `sort` - Sort by: `hearts`, `createdAt`, `updatedAt`, `category` (use `-` prefix for descending)

## Authentication

Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Examples

### Get API Documentation

```bash
curl https://friendlytwitter-api.onrender.com/
```

### Get All Thoughts

```bash
curl https://friendlytwitter-api.onrender.com/thoughts
```

### Get Thoughts with Pagination

```bash
curl https://friendlytwitter-api.onrender.com/thoughts?page=1&limit=5
```

### Filter and Sort Thoughts

```bash
curl https://friendlytwitter-api.onrender.com/thoughts?category=Food&sort=-hearts&minHearts=5
```

### Register a New User

```bash
curl -X POST https://friendlytwitter-api.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123","name":"John Doe"}'
```

### Login

```bash
curl -X POST https://friendlytwitter-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

### Create a Thought (Authenticated)

```bash
curl -X POST https://friendlytwitter-api.onrender.com/thoughts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message":"This is my happy thought!","category":"General"}'
```

### Like a Thought

```bash
curl -X POST https://friendlytwitter-api.onrender.com/thoughts/THOUGHT_ID/like \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Thoughts

```bash
curl https://friendlytwitter-api.onrender.com/users/me/thoughts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get My Thoughts with Filters

```bash
curl "https://friendlytwitter-api.onrender.com/users/me/thoughts?category=Food&sort=-hearts&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Thoughts I've Liked

```bash
curl https://friendlytwitter-api.onrender.com/users/me/likes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

### Thoughts List Response

```json
{
  "thoughts": [...],
  "total": 123,
  "pagination": {
    "currentPage": 1,
    "totalPages": 7,
    "totalCount": 123,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "category": "Food",
    "sort": "-hearts"
  }
}
```
