# DocAi Backend

Production-ready NestJS boilerplate with authentication, RBAC, auditing, structured logging, metrics, and observability.

[![CI](https://github.com/VictorFajardo/docai-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/VictorFajardo/docai-backend/actions/workflows/ci.yml)
[![Swagger Docs](https://img.shields.io/badge/docs-swagger-blue)](https://victorfajardo.github.io/docai-backend/)
[![Coverage Status](https://codecov.io/github/VictorFajardo/docai-backend/graph/badge.svg?token=31ZT244MDH)](https://codecov.io/github/VictorFajardo/docai-backend)
[![License](https://img.shields.io/github/license/VictorFajardo/docai-backend.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.x-green.svg)](https://nodejs.org/)
[![Built With](https://img.shields.io/badge/built%20with-NestJS-red.svg)](https://nestjs.com/)

---

## 🔥 Features

- **Authentication**: JWT-based access & refresh token flows
- **Authorization**: Role-based access control (`@Roles`, `@Public`)
- **Audit Logging**: Tracks user actions, metadata, and diffs
- **Exception Handling**: Global filters + Prisma error mapper
- **Structured Logging**: Winston + JSON + request context
- **Observability**: Prometheus metrics and `/metrics` endpoint
- **Tracing**: Sentry integration with request tracing
- **Swagger Docs**: Auth flows, response examples, RBAC
- **CI/CD**: GitHub Actions with lint/test/build
- **Dockerized Dev**: API, DB, and pgAdmin containerized
- **Testing**: Unit and E2E setup with DB seed/reset helpers

---

##  Quickstart

```bash
git clone https://github.com/VictorFajardo/docai-backend.git
cd docai-backend
cp .env.example .env
npm run db:setup  # docker-compose
```

---

## 🧪 Local Development

```bash
npm run db:up

npm install
npm run dev
```

---

## ⚙ Seed the Database

```bash
npm run db:seed
```

---

## 🧪 Running Tests

```bash
# Run unit and E2E tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run only E2E tests
npm run test:e2e
```

---

## 🧬 API Docs

- Swagger: [http://localhost:8000/api](http://localhost:8000/api)
- Health - Live: [http://localhost:8000/health/live](http://localhost:8000/health/live)
- Health - Ready: [http://localhost:8000/health/ready](http://localhost:8000/health/ready)
- Metrics: [http://localhost:8000/metrics](http://localhost:8000/metrics)

---

## 🛠 Tech Stack

- **Framework**: NestJS
- **ORM**: Prisma
- **DB**: PostgreSQL
- **Monitoring**: Prometheus + Sentry
- **Security**: Helmet, CORS, Rate-Limit, HPP
- **Testing**: Jest + Supertest

---

## ✨ Auth Flows

- `/auth/register`: Create user account
- `/auth/login`: Obtain access and refresh tokens
- `/auth/refresh`: Exchange refresh token
- `/auth/logout`: Invalidate refresh token

Include access token as:

```http
Authorization: Bearer <access_token>
```

---

## 🧪 Sample curl Commands

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email": "john@example.com", "password": "StrongP@ss1"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "john@example.com", "password": "StrongP@ss1"}'
```

---

## 📦 Deployment

Use Docker Compose or adapt to your preferred platform. Sentry and Prometheus require credentials and/or dashboards.

Act as a senior NestJS backend architect and AI-system engineer.

I am building a production-grade AI chat application similar to ChatGPT.

Frontend Stack:

- React Native
- Expo
- TypeScript
- Expo Router
- NativeWind
- Zustand
- React Query

Backend Requirements:

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- REST APIs
- File upload support
- ML model integration
- Streaming responses
- Chat persistence
- Scalable modular architecture
- Production-grade security
- Docker support
- API validation
- Logging
- Rate limiting
- Cloudinary or S3 uploads

Application Flow:
Frontend → NestJS Backend → ML Team API

Important Rules:

- Frontend NEVER communicates directly with AI providers
- Backend handles:
  - ML API communication
  - authentication
  - authorization
  - chat persistence
  - file uploads
  - streaming
  - rate limiting
  - retries
  - logging
  - caching
  - validation

Need:

1. Best modern NestJS architecture (2026 standards)
2. Scalable folder structure
3. Recommended modules
4. Database schema design
5. Prisma schema recommendations
6. JWT auth architecture
7. Refresh token strategy
8. RBAC strategy
9. Streaming response architecture
10. File upload architecture
11. ML service integration architecture
12. API versioning strategy
13. Error handling architecture
14. Logging strategy
15. Validation strategy
16. Docker setup
17. CI/CD recommendations
18. Security best practices
19. Performance optimization
20. Caching strategy
21. Background job strategy
22. Rate limiting strategy
23. WebSocket vs SSE recommendation
24. Production deployment strategy

Required Backend Modules:

- auth
- users
- chats
- messages
- uploads
- ml-gateway
- health
- config

Need exact package recommendations and installation commands.

Also provide:

- anti-patterns to avoid
- bad NestJS practices
- outdated approaches
- common AI backend mistakes
- production scaling advice

Use latest stable versions and modern industry standards only.




# AI Chat Application - NestJS Backend Architecture

## 1. Executive Summary
This document outlines the modern architecture (2026 standards) for your AI Chat application's backend. The backend is built with **NestJS, TypeScript, PostgreSQL, and Prisma**. It acts as a secure, stateless orchestrator between the React Native frontend and the internal ML Team API.

**Core Responsibilities:**
- Secure gateway (Authentication & Authorization)
- Chat history persistence
- File upload coordination (S3)
- Rate limiting & cost control
- Streaming LLM responses (SSE)

---

## 2. Scalable Folder Structure
Adopt a **Feature-Module** approach (Domain-Driven Design principles) rather than technical grouping. This ensures maximum scalability and maintainability.

```text
src/
├── app.module.ts
├── main.ts
├── common/                 # Global utilities, filters, guards, decorators
│   ├── decorators/         # e.g., @CurrentUser()
│   ├── filters/            # Global exception filters (e.g., PrismaClientExceptionFilter)
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   ├── interceptors/       # LoggingInterceptor, TransformInterceptor
│   └── pagination/         # Standardized pagination DTOs
├── config/                 # Typed configuration validations (Zod/class-validator)
├── database/               # Prisma service and extensions
├── modules/
│   ├── auth/               # Google Auth, JWT, Refresh Token Logic
│   ├── users/              # User management, profiles
│   ├── chat/               # Chat sessions, message history management
│   ├── ai/                 # Communication with ML Team API (HTTP client, SSE parsing)
│   ├── uploads/            # S3 presigned URLs, file metadata
│   └── health/             # Terminus health checks for Kubernetes/Cloud providers
```

---

## 3. Database Schema Design (Prisma)
A scalable relational schema designed for chat and AI interactions.

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  googleId      String?   @unique
  name          String
  avatarUrl     String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  chats         Chat[]
  uploads       Upload[]
}

enum Role {
  USER
  ADMIN
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique
  deviceInfo   String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Chat {
  id        String    @id @default(uuid())
  userId    String
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
}

model Message {
  id        String   @id @default(uuid())
  chatId    String
  role      SenderRole
  content   String   @db.Text
  tokenCount Int?    // Useful for billing/analytics
  createdAt DateTime @default(now())

  chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  files     Upload[]
}

enum SenderRole {
  USER
  ASSISTANT
  SYSTEM
}

model Upload {
  id        String   @id @default(uuid())
  userId    String
  messageId String?
  fileUrl   String
  fileType  String
  s3Key     String   @unique
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  message   Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)
}
```

---

## 4. Authentication Architecture (Google Auth)
We will use **JWT with a Refresh Token Rotation strategy** to provide both security and seamless UX on mobile.

**Flow:**
1. **Frontend (Expo):** Implements Google Login natively via `expo-auth-session` to retrieve an `id_token` or `access_token` from Google.
2. **Backend:** Exposes `POST /auth/google`. Receives the token, verifies it using `google-auth-library`.
3. **Token Generation:** Backend creates the user (if new) and issues:
   - `access_token` (JWT, 15m expiration)
   - `refresh_token` (Opaque string, 7d expiration, stored in DB)
4. **Delivery:**
   - `refresh_token` is sent as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
   - `access_token` is returned in the JSON response (stored in Zustand/memory).
5. **Refresh Logic:** When the `access_token` expires, frontend calls `POST /auth/refresh`. Backend reads the cookie, validates it in DB, rotates it (issues new refresh + access tokens), and invalidates the old one.

---

## 5. File Upload Architecture (S3)
**Strategy: S3 Presigned URLs (Zero-Backend Bottleneck)**
Never stream large files through the Node.js backend. It blocks the event loop and eats memory.

1. **Request:** Frontend calls `POST /uploads/presigned-url` with file metadata (size, type).
2. **Generate:** Backend validates limits, generates an S3 Presigned URL (valid for 5 mins), and saves an `Upload` record as "PENDING".
3. **Direct Upload:** Frontend uploads the file directly to S3 using the URL.
4. **Confirm:** Frontend calls `POST /uploads/confirm` to mark it "COMPLETED", or the backend listens to S3 EventBridge notifications.

---

## 6. Server-Sent Events (SSE) vs WebSockets
**Recommendation: SSE (Server-Sent Events)**
For AI text generation, you strictly stream data from Server -> Client. WebSockets add unnecessary overhead (stateful connections, heavy handshakes). SSE operates over standard HTTP/2, automatically handles reconnects, and works natively with React Native.

---

## 7. Recommended Modules & Packages

Run this installation script for a production-ready setup:

```bash
# Core NestJS + Security + Validation
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-google-oauth20
npm install @nestjs/swagger @nestjs/throttler @nestjs/terminus helmet cookie-parser
npm install class-validator class-transformer

# Database
npm install @prisma/client
npm install -D prisma

# AWS S3 & Logging
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install nestjs-pino pino-http pino-pretty dayjs

# Background Jobs & Caching (Optional but recommended)
npm install @nestjs/bullmq bullmq @nestjs/cache-manager cache-manager cache-manager-redis-yet
```

---

## 8. API & System Strategies

- **API Versioning:** Use NestJS Global URI Versioning (`app.enableVersioning({ type: VersioningType.URI })`). All routes begin with `/v1`.
- **Validation:** Use `class-validator` globally. Enable `whitelist: true` and `forbidNonWhitelisted: true` in the `ValidationPipe` to strip malicious payload injections.
- **Logging:** Use `nestjs-pino`. It provides zero-allocation JSON logging which integrates perfectly with Datadog/AWS CloudWatch and allows tracing via correlation IDs.
- **Rate Limiting:** Use `@nestjs/throttler` (backed by Redis via `cache-manager-redis-yet`). Establish strict limits on the `/ai/generate` endpoint to prevent billing attacks.

---

## 9. Anti-Patterns & Common AI Backend Mistakes

❌ **Mistake:** Piping LLM streaming data entirely into backend memory before sending to frontend.
✅ **Fix:** Use NestJS `Sse` decorator or Fastify/Express raw response objects to pipe the stream directly. Memory usage should remain flat regardless of response size.

❌ **Mistake:** Storing raw ML API keys in the frontend.
✅ **Fix:** The frontend ONLY knows about the NestJS backend. The backend securely holds ML API keys and authenticates internal calls.

❌ **Mistake:** Complex prompt engineering inside Controllers.
✅ **Fix:** Controllers handle HTTP only. Inject an `AiService` that fetches chat history from `ChatService`, assembles the prompt, and communicates with the ML API.

❌ **Mistake:** Using local disk for uploads (`Multer` -> `./uploads`).
✅ **Fix:** Always use S3 with Presigned URLs. Your containers should be stateless and ephemeral.

❌ **Mistake:** Missing token usage tracking.
✅ **Fix:** Always capture `prompt_tokens` and `completion_tokens` from the ML API response and save them to the database to monitor user costs and prevent abuse.


A complete, production-grade AI/ML Gateway module integrated into the existing NestJS backend.
Uses AWS S3 (pre-existing bucket) for image persistence and Hugging Face FastAPI for cataract detection inference.


React Native App
      │  POST /ai/predict (multipart/form-data)
      ▼
NestJS AiController
      │  validate file (MIME type, size ≤ 20 MB)
      ▼
UploadsService.uploadFile()     ──►  AWS S3 (sameer-aws-s3-bucket)
      │  returns S3 URL
      ▼
AiService.callWithRetry()       ──►  HuggingFace FastAPI
      │  POST multipart/form-data    (sameer2210-cataractaiml.hf.space/predict)
      │  timeout: 15 s, retries: 3 (exponential back-off)
      ▼
PrismaService.aiPrediction.create()  ──►  PostgreSQL AiPrediction table
      │
      ▼
JSON Response  ─────────────────────►  Client



Provide a production-grade AI/ML Gateway module to classify eye conditions (e.g. Cataract, IOL Inserted) and persist prediction metadata in a PostgreSQL database using Prisma.