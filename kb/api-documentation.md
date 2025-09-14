# RadioCalico API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API does not require authentication. User identification is handled through the `userIdentifier` parameter in requests.

## Response Format
All API responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": "...", // or other relevant fields
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Health Check Endpoints

### Get Server Health
Check if the server is running and responsive.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-13T12:37:32.119Z"
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

### Get Database Health
Check database connectivity and perform a basic query.

```http
GET /api/health/db
GET /api/test-db  # Legacy endpoint (same functionality)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "now": "2025-09-13 12:37:52"
  }
}
```

**Status Codes:**
- `200 OK` - Database is accessible
- `500 Internal Server Error` - Database connection failed

**Error Response Example:**
```json
{
  "success": false,
  "error": "Database connection failed: SQLITE_CANTOPEN"
}
```

## User Management Endpoints

### Create User
Create a new user in the system.

```http
POST /api/users
```

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required, valid email format)"
}
```

**Request Example:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "userId": 123,
  "message": "User created successfully"
}
```

**Status Codes:**
- `200 OK` - User created successfully
- `400 Bad Request` - Missing required fields or invalid email format
- `409 Conflict` - Username or email already exists
- `500 Internal Server Error` - Server error

**Error Response Examples:**
```json
// Missing fields
{
  "success": false,
  "error": "Username and email are required"
}

// Invalid email
{
  "success": false,
  "error": "Invalid email format"
}

// Duplicate user
{
  "success": false,
  "error": "Username or email already exists"
}
```

---

### Get All Users
Retrieve a list of all users in the system.

```http
GET /api/users
```

**Request Example:**
```bash
curl http://localhost:3000/api/users
```

**Success Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "created_at": "2025-09-13 12:30:00"
    },
    {
      "id": 2,
      "username": "janedoe",
      "email": "jane@example.com",
      "created_at": "2025-09-13 12:31:00"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Users retrieved successfully
- `500 Internal Server Error` - Server error

## Song Rating Endpoints

### Rate a Song
Submit a rating (like/dislike) for a song or remove an existing rating.

```http
POST /api/songs/rate
```

**Request Body:**
```json
{
  "songId": "string (required) - Unique identifier for the song",
  "artist": "string (required) - Artist name",
  "title": "string (required) - Song title",
  "userIdentifier": "string (required) - User identifier",
  "rating": "number (required) - 1 for like, -1 for dislike, 0 to remove rating"
}
```

**Request Example:**
```bash
curl -X POST http://localhost:3000/api/songs/rate \
  -H "Content-Type: application/json" \
  -d '{
    "songId": "song-abc-123",
    "artist": "The Beatles",
    "title": "Hey Jude",
    "userIdentifier": "user123",
    "rating": 1
  }'
```

**Success Response:**
```json
{
  "success": true,
  "ratings": {
    "thumbs_up": 5,
    "thumbs_down": 2
  }
}
```

**Status Codes:**
- `200 OK` - Rating submitted successfully
- `400 Bad Request` - Missing required fields or invalid rating value
- `500 Internal Server Error` - Server error

**Error Response Examples:**
```json
// Missing fields
{
  "success": false,
  "error": "Song ID is required, Artist is required, Title is required, User identifier is required"
}

// Invalid rating
{
  "success": false,
  "error": "Rating must be 1 (like), -1 (dislike), or 0 (remove)"
}
```

**Rating Values:**
- `1` - Like (thumbs up)
- `-1` - Dislike (thumbs down)
- `0` - Remove existing rating

---

### Get Song Ratings
Retrieve the current ratings for a specific song, optionally including the current user's rating.

```http
GET /api/songs/{songId}/ratings?userIdentifier={userIdentifier}
```

**Path Parameters:**
- `songId` (required) - The unique identifier for the song

**Query Parameters:**
- `userIdentifier` (optional) - If provided, includes the user's current rating for this song

**Request Example:**
```bash
# Get ratings without user-specific data
curl "http://localhost:3000/api/songs/song-abc-123/ratings"

# Get ratings including user's current rating
curl "http://localhost:3000/api/songs/song-abc-123/ratings?userIdentifier=user123"
```

**Success Response (without userIdentifier):**
```json
{
  "success": true,
  "ratings": {
    "thumbs_up": 5,
    "thumbs_down": 2
  },
  "userRating": null
}
```

**Success Response (with userIdentifier):**
```json
{
  "success": true,
  "ratings": {
    "thumbs_up": 5,
    "thumbs_down": 2
  },
  "userRating": 1
}
```

**Status Codes:**
- `200 OK` - Ratings retrieved successfully
- `400 Bad Request` - Invalid or missing song ID
- `500 Internal Server Error` - Server error

**User Rating Values:**
- `1` - User has liked this song
- `-1` - User has disliked this song
- `null` - User has not rated this song or userIdentifier not provided

## Error Handling

### Global Error Format
All errors follow the same format with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters or body
- `409 Conflict` - Resource conflict (e.g., duplicate user)
- `413 Payload Too Large` - Request body exceeds size limit
- `500 Internal Server Error` - Server-side error

### Development vs Production Errors
- **Development**: Detailed error messages with stack traces
- **Production**: Generic error messages to avoid information disclosure

## Rate Limiting
Current configuration (configurable via environment variables):
- **Window**: 15 minutes (900,000ms)
- **Max Requests**: 100 requests per window per IP
- **Response**: HTTP 429 when limit exceeded

## Request/Response Examples

### Content-Type Requirements
All POST requests must include the `Content-Type: application/json` header.

**Invalid Content-Type Response:**
```json
{
  "success": false,
  "error": "Content-Type must be application/json"
}
```

### Request Size Limits
Maximum request payload size: **1MB** (configurable)

**Payload Too Large Response:**
```json
{
  "success": false,
  "error": "Request payload too large"
}
```

## Development Testing

### Using curl
```bash
# Health check
curl http://localhost:3000/api/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com"}'

# Rate song
curl -X POST http://localhost:3000/api/songs/rate \
  -H "Content-Type: application/json" \
  -d '{"songId":"test123","artist":"Test","title":"Song","rating":1,"userIdentifier":"user123"}'

# Get ratings
curl "http://localhost:3000/api/songs/test123/ratings?userIdentifier=user123"
```

### Using JavaScript Fetch
```javascript
// Create user
const createUser = async (username, email) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email })
  });
  return response.json();
};

// Rate song
const rateSong = async (songId, artist, title, rating, userIdentifier) => {
  const response = await fetch('/api/songs/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, artist, title, rating, userIdentifier })
  });
  return response.json();
};

// Get ratings
const getSongRatings = async (songId, userIdentifier = null) => {
  const url = `/api/songs/${songId}/ratings` +
    (userIdentifier ? `?userIdentifier=${userIdentifier}` : '');
  const response = await fetch(url);
  return response.json();
};
```

## Migration Notes

### Legacy Endpoint Support
The API maintains backward compatibility with the original endpoint:
- `/api/test-db` → `/api/health/db` (both work)

### Breaking Changes from Original
None - all original functionality is preserved with the same request/response formats.

## Future API Enhancements

### Planned Features
- User authentication and sessions
- Song metadata endpoints
- Playlist management
- Real-time rating updates via WebSocket
- Advanced user analytics
- Rate limiting per user
- API versioning (`/api/v1/`, `/api/v2/`)

### Deprecation Policy
- Legacy endpoints will be supported for at least 6 months
- Deprecation warnings will be added to response headers
- New features will only be available on current endpoint structure