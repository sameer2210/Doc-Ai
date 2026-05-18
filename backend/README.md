# SpandaVidya Backend

NestJS backend for the SpandaVidya application. The current service provides authentication, user management, image uploads, audit logging, health checks, metrics, Swagger documentation, structured logging, and PostgreSQL persistence through Prisma.

The backend already contains database models for chats and messages, but the corresponding chat/message APIs and realtime response endpoints are not yet implemented.

## Current Implemented Features

### Authentication and authorization

- Email/password registration and login
- Google ID token login
- JWT access and refresh token generation
- Refresh token rotation through `POST /auth/refresh`
- Logout with refresh-token invalidation
- Global JWT guard and role guard
- Role support through Prisma enum values: `USER`, `ADMIN`, `MODERATOR`
- Admin-only audit log endpoint and admin-only user listing endpoint

### Users

- Create user
- Get current user profile
- Update current user profile
- Get all users for admins

### Uploads

- Authenticated image upload endpoint
- MIME type and file-size validation
- AWS S3 upload integration
- Upload metadata persisted in PostgreSQL

### Observability and platform support

- Liveness and readiness endpoints
- Prometheus-compatible metrics endpoint
- Request logging with Morgan plus custom Winston logger
- Global HTTP and Prisma exception filters
- Request/response envelope interceptor with request IDs
- Optional Sentry initialization in production
- Swagger UI at `/api`
- Docker and Docker Compose support for local and production-like runs

## Not Fully Implemented Yet

- Chat and message controllers/services are not present even though `Chat` and `Message` models exist in Prisma.
- Realtime streaming endpoints are not implemented.
- ML gateway / model-integration modules are not present.
- The `Session` Prisma model exists, but the active auth flow stores a hashed refresh token on `User`; session-table-based refresh token management is not currently wired.
- URI versioning is enabled in `main.ts`, but the current frontend client and test suite still target unversioned paths, so versioned routing should be verified before treating it as finalized.

## Tech Stack

- NestJS 11
- TypeScript
- PostgreSQL
- Prisma ORM
- Passport + JWT
- Google Auth Library
- AWS SDK for S3
- Swagger / OpenAPI
- Prometheus client metrics
- Winston logging
- Sentry
- Jest + Supertest
- Docker / Docker Compose

## Folder Structure

```text
backend/
|-- src/
|   |-- auth/                 # Register, login, Google auth, JWT, refresh logic
|   |-- users/                # User CRUD/profile flows
|   |-- uploads/              # Image upload controller and S3 service
|   |-- audit-log/            # Audit event creation and querying
|   |-- health/               # Liveness/readiness checks
|   |-- common/               # Guards, decorators, filters, interceptors, metrics, logger
|   |-- config/               # Env validation and app/security config
|   |-- prisma/               # Prisma service
|   |-- app.module.ts         # Root module wiring
|   `-- main.ts               # Bootstrap, middleware, Swagger, security, versioning
|-- prisma/
|   |-- schema.prisma         # Database schema
|   |-- migrations/           # Prisma migrations
|   `-- seed.ts               # Development seed data
|-- test/                     # E2E tests
|-- docs/swagger.json         # Exported OpenAPI document
|-- scripts/                  # DB, seed, Swagger, and Docker helper scripts
|-- docker-compose.yaml       # Local PostgreSQL + pgAdmin
|-- docker-compose.prod.yml   # Production-like stack with API container
|-- Dockerfile                # Development image
`-- Dockerfile.prod           # Multi-stage production image
```

## Database and ORM Usage

Prisma is used with PostgreSQL. The active schema currently includes:

- `User`
- `Session`
- `AuditLog`
- `Chat`
- `Message`
- `Upload`

Important current behavior:

- `User` stores `hashedRefreshToken` for the live refresh-token flow.
- `AuditLog` records auth and user events.
- `Upload` stores S3 metadata.
- `Chat` and `Message` tables are defined, but there are no backend chat/message modules yet.

## Authentication Flow

### Email/password

1. Client calls `POST /auth/register` or `POST /auth/login`.
2. Passwords are hashed with bcrypt.
3. The server issues an access token and a refresh token.
4. The refresh token is hashed and stored on the `User` row.
5. Protected routes require `Authorization: Bearer <access-token>`.

### Google login

1. Client sends a Google `idToken` to `POST /auth/google`.
2. The backend verifies the token with `google-auth-library`.
3. The backend creates or links a user account.
4. The server issues access and refresh tokens exactly like the password flow.

### Refresh behavior

- `POST /auth/refresh` accepts a refresh token from:
  - request body,
  - `refresh_token` cookie,
  - or bearer token header.
- A new access token and refresh token are issued, and the stored hashed refresh token is replaced.

## API Surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Welcome response |
| `POST` | `/auth/register` | Register user |
| `POST` | `/auth/login` | Login user |
| `POST` | `/auth/google` | Google login |
| `POST` | `/auth/refresh` | Refresh JWTs |
| `POST` | `/auth/logout` | Logout user |
| `POST` | `/user` | Create user |
| `GET` | `/user/me` | Get current profile |
| `PATCH` | `/user/me` | Update current profile |
| `GET` | `/user/all` | List users, admin only |
| `POST` | `/uploads/image` | Upload image to S3 |
| `GET` | `/audit-logs` | Query audit logs, admin only |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/metrics` | Prometheus metrics |

Swagger UI is available at:

```text
http://localhost:8000/api
```

## Environment Variables

Create `backend/.env` for local development:

```bash
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/docai

JWT_SECRET=replace-me
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace-me-too
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your-google-client-id

AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=your-aws-region
AWS_S3_BUCKET_NAME=your-s3-bucket-name

UPLOAD_IMAGE_MAX_SIZE_MB=20
UPLOAD_IMAGE_RATE_LIMIT=10
UPLOAD_IMAGE_RATE_TTL_MS=60000

SENTRY_DSN=optional
LOG_LEVEL=info
```

Notes:

- The runtime config loader also supports Docker secrets for JWT and database values.
- `AWS_ACCESS_SECRET`, `AWS_BUCKET_NAME`, and `AWS_BUCKET_REGION` are accepted as fallback aliases in the current config loader.
- PostgreSQL helper variables such as `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are used by Docker Compose.

## Setup and Installation

```bash
cd backend
npm install
```

Start the local database stack:

```bash
npm run db:up
```

Generate Prisma client, run migrations, and seed development data:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Or run the bundled setup command:

```bash
npm run db:setup
```

Start the API in development mode:

```bash
npm run dev
```

## Development Workflow

Useful commands:

```bash
npm run dev
npm run build
npm run lint
npm run lint:fix
npm run format
npm run test
npm run test:watch
npm run test:e2e
npm run test:cov
npm run prisma:studio
npm run generate:docs
```

Recommended local flow:

1. Configure `backend/.env`.
2. Start PostgreSQL with `npm run db:up`.
3. Run migrations and seed data.
4. Start the API with `npm run dev`.
5. Use Swagger or the frontend app to exercise endpoints.

## Deployment Information

The repository includes:

- `Dockerfile` for local development
- `Dockerfile.prod` for a multi-stage production image
- `docker-compose.yaml` for PostgreSQL + pgAdmin
- `docker-compose.prod.yml` for a production-like API + database stack

The production compose file expects Docker secrets for:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `DATABASE_URL`
- `PORT`

## Third-Party Integrations

- Google OAuth token verification
- AWS S3 image storage
- Sentry error reporting in production
- Prometheus-compatible metrics
- Swagger/OpenAPI documentation

## WebSocket / Realtime Status

- No WebSocket implementation is present.
- No SSE or streaming controller exists yet.
- Realtime chat functionality is therefore not fully implemented in the backend.

## Project Progress Summary

Completed so far:

- Core NestJS bootstrap and configuration
- PostgreSQL + Prisma integration
- JWT authentication and Google login
- Role-based access control
- User profile APIs
- Image upload pipeline to S3
- Audit logging
- Health checks, metrics, logging, Swagger, Docker support, and test scaffolding

## Upcoming Improvements

- Implement backend chat and message modules to match the existing Prisma schema and frontend API contract
- Add realtime streaming endpoints for assistant responses
- Add an ML gateway module for model/API integration
- Decide whether to keep the current user-level refresh token design or complete the unused `Session` model flow
- Align API versioning behavior with the frontend and tests
- Harden audit-log querying by replacing raw SQL string construction with parameterized Prisma queries
- Expand upload support if document/file uploads are required beyond images
- Add end-to-end tests for uploads, Google login, health, and metrics

