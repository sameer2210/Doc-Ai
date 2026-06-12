# SpandaVidya — AI Agent Instructions

> **Read this entire file before writing a single line of code.**
> This is the ground truth for architecture, patterns, and constraints.
> Violating these rules will cause bugs, regressions, or security vulnerabilities.

---

## 0. Project Identity

**SpandaVidya** is a production-grade AI healthcare platform.

- **Purpose:** Ayurvedic chat consultation + AI-powered cataract detection
- **Users:** Mobile-first (Android + iOS via React Native / Expo)
- **Stack:** React Native (Expo) frontend ↔ NestJS backend ↔ Google Gemini + HuggingFace ML

**Live endpoints:**

| Service | URL |
|---|---|
| Backend base | `https://spandavidyaai-app-production.up.railway.app/v1` |
| Health (live) | `https://spandavidyaai-app-production.up.railway.app/v1/health/live` |
| Health (ready) | `https://spandavidyaai-app-production.up.railway.app/v1/health/ready` |
| Swagger | `https://spandavidyaai-app-production.up.railway.app/api` |
| ML Service | `https://sameer2210-cataractaiml.hf.space/predict` |
| ML Docs | `https://sameer2210-cataractaiml.hf.space/docs` |

---

## 1. Architecture — Never Deviate From This

```
React Native (Expo)
       │
       │  REST + SSE (HTTP/2)
       ▼
NestJS Backend  ──────────────────────────────────────────────┐
       │                                                       │
       ├──→ Google Gemini 2.5 Flash     (Ayurvedic chat SSE)  │
       ├──→ HuggingFace ML Service      (cataract inference)   │ Backend
       ├──→ AWS S3                      (file storage)         │ owns ALL
       └──→ PostgreSQL via Prisma       (persistence)          │ external calls
                                                               └──────────────────
```

### Hard Rules

1. **Frontend NEVER calls Gemini, HuggingFace, or S3 directly.** Every AI/ML/storage call goes through the NestJS backend. No exceptions. Do not suggest direct API calls from React Native.

2. **Large files NEVER stream through Node.js.** For general uploads, use S3 presigned URLs (frontend uploads directly to S3). For AI prediction images, the backend receives the file via multipart, uploads to S3, then forwards to HuggingFace.

3. **ML service is stateless.** HuggingFace only does inference. Auth, persistence, retry logic, and business rules all live in NestJS.

4. **All routes are versioned under `/v1/`.** Never create unversioned routes.

5. **Refresh tokens rotate on every use** and are stored server-side in the DB for revocation support.

---

## 2. Tech Stack — Exact Versions in Use

### Backend

| Layer | Package / Tool | Notes |
|---|---|---|
| Framework | NestJS (TypeScript) | Feature-module DDD structure |
| ORM | Prisma | Do not use TypeORM or raw SQL |
| Database | PostgreSQL | Hosted on Supabase (prod) |
| Auth | JWT + Google OAuth | `@nestjs/jwt`, `@react-native-google-signin` |
| AI Chat | Google Gemini 2.5 Flash | SSE streaming via `GOOGLE_API_KEY` |
| ML Inference | HuggingFace EfficientNet-B3 | Proxied via `ml-gateway` module |
| File Storage | AWS S3 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| Monitoring | Prometheus + Sentry | `/metrics` endpoint |
| Security | Helmet, CORS, HPP, Throttler | All enabled globally |
| Logging | nestjs-pino | JSON structured, correlation IDs |
| Testing | Jest + Supertest | Unit + E2E |
| Containerization | Docker Compose | API + PostgreSQL + pgAdmin |

### Frontend

| Layer | Package | Notes |
|---|---|---|
| Framework | Expo SDK 54 + React Native 0.81 | Do not downgrade |
| Language | TypeScript | Strict mode, no `any` |
| Navigation | Expo Router | File-based routing |
| Styling | NativeWind (Tailwind CSS) | No inline styles, no StyleSheet unless necessary |
| State | Zustand | Auth session, UI state |
| Server state | TanStack React Query | All API data fetching |
| HTTP | Axios | Centralized at `src/shared/api/http-client.ts` |
| Forms | React Hook Form + Zod | No uncontrolled inputs |
| Lists | FlashList | Never use FlatList for chat or large lists |
| Animation | React Native Reanimated | No Animated API |
| Bottom sheet | Gorhom Bottom Sheet | Already configured in providers |
| Auth | @react-native-google-signin/google-signin | PRIMARY auth, not expo-auth-session |

---



**Key files — never move or rename these:**

| Purpose | Path |
|---|---|
| HTTP client | `src/shared/api/http-client.ts` |
| Query client | `src/shared/api/query-client.ts` |
| Token storage | `src/shared/auth/token-storage.ts` |
| Auth API | `src/features/auth/api/auth-api.ts` |
| Session store | `src/features/auth/store/session-store.ts` |
| Chat API | `src/features/chat/api/chat-api.ts` |
| Stream parser | `src/features/chat/streaming/parse-stream-chunks.ts` |

---

## 4. Database Schema — Core Entities

```
User          → has many Chat, RefreshToken, AuditLog, Upload, AiPrediction
Chat          → has many Message
Message       → belongs to Chat, User
Upload        → belongs to User; status: PENDING | COMPLETED | FAILED
AiPrediction  → belongs to Upload, User; stores prediction + confidence
RefreshToken  → belongs to User; invalidated on rotation
AuditLog      → append-only; user, action, metadata, diff
```

**Prisma commands:**

```bash
npx prisma db push --force-reset   # Dev: reset + push schema
npx prisma generate                # Regenerate client after schema change
npx prisma studio                  # Visual browser
npm run prisma:restart             # Docker: reset DB
```

---

## 5. Authentication Flow

```
React Native
  └── Google Native Sign-In  (@react-native-google-signin/google-signin)
        └── Google ID Token
              └── POST /v1/auth/google/verify
                    └── NestJS verifies token with Google
                          └── Upsert User in DB
                                └── Issue JWT access token (60m) + refresh token (7d)
                                      └── Store in Expo SecureStore
                                            └── Zustand session-store hydrates
```

**Guards and decorators:**

- `@Public()` — skips JWT guard (login/signup routes only)
- `@Roles('admin')` — RBAC enforcement
- `JwtAuthGuard` — applied globally; opt-out with `@Public()`

**Token rotation:** On `POST /v1/auth/refresh`, old refresh token is invalidated in DB and a new pair is issued. Never issue new tokens without invalidating the old one.

---


**HuggingFace response schema:**

```json
{ "prediction": "Immature", "confidence": 0.87 }
```

**Prediction classes:**

| Value | Meaning |
|---|---|
| `Normal` | No cataract |
| `Immature` | Early cataract |
| `Mature` | Advanced cataract |
| `IOL_Inserted` | Post-surgery artificial lens |

**Failure handling:**

| Failure | Response |
|---|---|
| File > 50 MB | 413, frontend shows friendly message |
| Invalid MIME | 400 |
| S3 upload fail | 500 |
| ML timeout / unavailable | 503, retryable |
| Retries exhausted | 503 "AI service temporarily unavailable" |

---

## 7. Streaming (SSE) — Chat

- Protocol: **Server-Sent Events over HTTP/2**. Do NOT use WebSockets for chat streaming.
- Backend emits token events; frontend parser is at `src/features/chat/streaming/parse-stream-chunks.ts`.
- Optimistic message insertion into FlashList before stream completes.
- On stream error, roll back optimistic message and show error state.

---

## 8. Validation Rules (Non-Negotiable)

### Backend

```typescript
// main.ts — global ValidationPipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // strip unknown fields
  forbidNonWhitelisted: true, // throw on unknown fields
  transform: true,           // auto-transform to DTO types
}));
```

- Every controller endpoint must have a DTO.
- Every DTO uses `class-validator` decorators.
- Never use `any` or bypass the pipe.

### Frontend

- Every form uses React Hook Form + Zod schema.
- File validation (MIME + size) runs client-side before API call.
- All API responses typed — no untyped `response.data`.

---

## 9. Error Handling

### Backend

- Global exception filter catches all unhandled errors → normalized `{ statusCode, message, timestamp, path }`.
- Prisma error mapper translates DB constraint violations to HTTP 400/404/409.
- Never let raw Prisma errors leak to the client.
- Log all errors via nestjs-pino with correlation ID.

### Frontend

- All errors are instances of typed error classes in `src/shared/errors/`.
- React Query `onError` handlers surface typed errors to UI.
- Never `console.error` in production — use the centralized error handler.
- Network errors trigger retry logic via React Query config in `query-client.ts`.

---

## 10. Security Rules

| Control | Requirement |
|---|---|
| Helmet | Enabled globally in `main.ts` |
| CORS | Origin-restricted per `NODE_ENV` |
| Rate limiting | `@nestjs/throttler` + Redis on all routes; strict on `/v1/ai/*` |
| HPP | Enabled — prevents HTTP parameter pollution |
| JWT | RS256 or HS256 with env-sourced secret, never hardcoded |
| Secrets | All secrets in env vars only. Never commit `.env`. |
| ML endpoint | Never exposed to frontend — always proxied via `ml-gateway` |
| S3 | Presigned URLs for general uploads; direct buffer upload only for AI prediction images |

---

## 11. What NOT To Do — Anti-Patterns

### Architecture

- ❌ Do not call Gemini or HuggingFace from React Native
- ❌ Do not stream large files through Node.js memory
- ❌ Do not add business logic to the HuggingFace microservice
- ❌ Do not create routes outside `/v1/` prefix
- ❌ Do not bypass `JwtAuthGuard` without `@Public()`

### Backend

- ❌ Do not use `any` type anywhere
- ❌ Do not use raw SQL — use Prisma query API
- ❌ Do not use TypeORM, Sequelize, or Mongoose
- ❌ Do not put logic in controllers — controllers only receive and delegate
- ❌ Do not use `console.log` — use injected `Logger` or pino
- ❌ Do not create God services — split by responsibility
- ❌ Do not use synchronous file I/O

### Frontend

- ❌ Do not use `FlatList` for chat — use `FlashList`
- ❌ Do not use `StyleSheet.create` for layout — use NativeWind classes
- ❌ Do not use the old `Animated` API — use Reanimated
- ❌ Do not use `expo-auth-session` for Google auth — use `@react-native-google-signin`
- ❌ Do not put API logic in screen files — use feature-layer hooks/services
- ❌ Do not use `useState` for server data — use React Query
- ❌ Do not use `AsyncStorage` for tokens — use Expo SecureStore via `token-storage.ts`
- ❌ Do not use `any` type

### General

- ❌ Do not suggest packages that are not in the stack without flagging it explicitly
- ❌ Do not invent APIs, endpoints, or module names — check existing structure first
- ❌ Do not remove existing Prisma schema entities without explicit instruction
- ❌ Do not ignore TypeScript errors — fix the type, do not cast with `as`

---

## 12. Bug Fixing Protocol

When fixing a bug:

1. **Identify the layer first.** Is it frontend, backend, ML service, or infra?
2. **Read the existing code** in the relevant file before writing anything.
3. **Fix at the root cause**, not the symptom. No `try/catch` that swallows errors.
4. **Do not change unrelated code** while fixing a bug.
5. **Check DTO validation** — most API bugs are malformed payloads.
6. **Check Prisma schema** — missing relations or wrong field types cause silent failures.
7. **Verify env vars** — most integration failures are missing or wrong env values.
8. **Test the fix** — write or update the relevant unit/E2E test.

---

## 13. Adding New Features — Checklist

### Backend feature

- [ ] New NestJS module under `src/<feature>/`
- [ ] Module registered in `AppModule`
- [ ] DTO for every request body
- [ ] Guard + decorator applied appropriately
- [ ] Prisma migration if schema changes
- [ ] Unit test for service
- [ ] E2E test for controller
- [ ] Swagger `@ApiOperation` + `@ApiResponse` decorators on controller

### Frontend feature

- [ ] API function in `src/features/<feature>/api/`
- [ ] Types defined (no `any`)
- [ ] React Query hook in `src/features/<feature>/hooks/`
- [ ] UI component in `src/components/` (if reusable) or `src/features/<feature>/`
- [ ] Zod schema for any form
- [ ] Error state handled in UI
- [ ] Loading state handled in UI

---

## 14. Environment Variables Reference

### Backend

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<secret>
JWT_EXPIRES_IN=60m
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES_IN=7d
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=spandavidya
HUGGINGFACE_API_URL=https://sameer2210-cataractaiml.hf.space/predict
ML_GATEWAY_TIMEOUT_MS=60000
ML_GATEWAY_MAX_RETRIES=0
GOOGLE_API_KEY=<key>
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=<bucket>
GOOGLE_WEB_CLIENT_ID=<id>
GOOGLE_ANDROID_CLIENT_ID=<id>
GOOGLE_IOS_CLIENT_ID=<id>
```

### Frontend

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<id>
```

---

## 15. ML Service Contract

**Base:** `https://sameer2210-cataractaiml.hf.space`

```
GET  /          → { "message": "Cataract AI Running" }   # health
POST /predict   → multipart/form-data (field: file)
                ← { "prediction": string, "confidence": float }
```

- Accepted image formats: JPG, JPEG, PNG
- Model: EfficientNet-B3, PyTorch, CPU inference
- Confidence range: 0.0 – 1.0
- Class ordering is fixed — any model retraining must preserve `class_to_idx` mapping
- This service has no auth, no DB, no business logic — treat it as a pure function

**Medical disclaimer (always include in prediction responses to users):** This system is for screening assistance only. Final diagnosis must be confirmed by a qualified ophthalmologist.