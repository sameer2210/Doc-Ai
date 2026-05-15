---
name: API Standards
description: 'REST API response format and error handling conventions. Use when: designing API responses, implementing error handlers, documenting REST endpoints, or standardizing response envelopes across services.'
---

# API Standards

## Response Envelope

All successful API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Fields

- **success** (boolean): Always `true` for successful responses
- **data** (T | null): The response payload (any type or null)
- **message** (string): Optional human-readable success message
- **pagination** (optional): Included only when response contains paginated data

## Error Format

All error responses use this standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": []
  }
}
```

### Fields

- **success** (boolean): Always `false` for error responses
- **error.code** (string): Machine-readable error identifier (e.g., `VALIDATION_ERROR`)
- **error.message** (string): User-friendly error explanation
- **error.details** (array): Optional array of validation errors or additional context

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Missing or invalid credentials
- `AUTHORIZATION_ERROR` - User lacks permissions
- `NOT_FOUND` - Resource does not exist
- `CONFLICT` - Request conflicts with current state
- `RATE_LIMIT_ERROR` - Rate limit exceeded
- `INTERNAL_ERROR` - Server-side error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

## HTTP Status Codes

| Code | Status                | Usage                                      |
| ---- | --------------------- | ------------------------------------------ |
| 200  | OK                    | Successful GET, PUT, PATCH                 |
| 201  | Created               | Successful POST creating a resource        |
| 400  | Bad Request           | Invalid request syntax or parameters       |
| 401  | Unauthorized          | Missing or invalid authentication          |
| 403  | Forbidden             | Authenticated but insufficient permissions |
| 404  | Not Found             | Resource does not exist                    |
| 422  | Unprocessable Entity  | Validation errors in request body          |
| 429  | Too Many Requests     | Rate limit exceeded                        |
| 500  | Internal Server Error | Unexpected server error                    |
| 503  | Service Unavailable   | Server temporarily unavailable             |

## Implementation Guidelines

### Successful Response Example

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "message": "User retrieved successfully"
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "age", "message": "Must be at least 18" }
    ]
  }
}
```

### Paginated Response Example

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Best Practices

1. **Always include `success` flag** — Clients should check this first to determine response type
2. **Use appropriate HTTP status codes** — Combine with response envelope for clarity
3. **Provide actionable error messages** — Include `details` array for validation errors
4. **Include pagination metadata** — Only when data is paginated
5. **Keep error codes consistent** — Use the same code across all endpoints
6. **Never expose stack traces** — Always sanitize error messages in production
