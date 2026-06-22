# SpandaVidya — AI Agent Instructions

> **Read this entire file before writing a single line of code.**
> This is the ground truth for architecture, patterns, and constraints.
> Violating these rules will cause bugs, regressions, or security vulnerabilities.

---

## 1. Project Overview

**SpandaVidya** is a production-grade AI healthcare application that combines Ayurvedic consultation (via streamed chat) with computer vision cataract screening. The system is designed to provide screening assistance and educational support.

## Role
Act as a senior full-stack engineer. Enterprise quality. Production mindset.
Never write tutorial or demo code. Every line must be shippable.

**Live Endpoints:**

| Service | URL |
|---|---|
| Backend base | `https://spandavidyaai-app-production.up.railway.app/v1` |
| Health (live) | `https://spandavidyaai-app-production.up.railway.app/v1/health/live` |
| Health (ready) | `https://spandavidyaai-app-production.up.railway.app/v1/health/ready` |
| Swagger Docs | `https://spandavidyaai-app-production.up.railway.app/api` |
| ML Service | `https://sameer2210-cataractaiml.hf.space/predict` |
| ML Docs | `https://sameer2210-cataractaiml.hf.space/docs` |

**Key Project Files (DO NOT move or rename):**

| Purpose | Path |
|---|---|
| HTTP client | `frontend/src/shared/api/http-client.ts` |
| Query client | `frontend/src/shared/api/query-client.ts` |
| Token storage | `frontend/src/shared/auth/token-storage.ts` |
| Auth API | `frontend/src/features/auth/api/auth-api.ts` |
| Session store | `frontend/src/features/auth/store/session-store.ts` |
| Chat API | `frontend/src/features/chat/api/chat-api.ts` |
| Stream parser | `frontend/src/features/chat/streaming/parse-stream-chunks.ts` |

---

## 2. Current Architecture

The application implements a decoupled, backend-centric architecture where all external third-party AI, storage, and database layers are isolated behind the NestJS API gateway.

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

---

## 3. Current Authentication Flow

The application isolates mobile native login and web sign-in. Native Google Sign-In is the primary authentication path, supplemented by Email OTP verification.

### Authentication Flow
1. **Google Native Sign-In:** The client obtains a Google ID Token via `@react-native-google-signin/google-signin` and POSTs to `/v1/auth/google/verify`.
2. **Email OTP Verification:** OTP is requested via `POST /v1/auth/email/request-otp` and verified via `POST /v1/auth/email/verify-otp`.
3. **Backend verification:** The backend verifies credentials, upserts the `User` in PostgreSQL, and invalidates any existing active refresh tokens.
4. **JWT Session Creation:** The backend generates a JWT Access Token (60m expiry) and Refresh Token (7d expiry) pair.
5. **User Session Store:** The client receives the payload, persists tokens client-side using Expo `SecureStore`, and hydrates the Zustand `useSessionStore` to grant access.
6. **Token Rotation:** On `POST /v1/auth/refresh`, the old refresh token is invalidated in the database, and a new token pair is issued (Refresh Token Rotation).

### Email OTP Security Rules:
* **Deduplication:** A new OTP request deletes any active OTP records for that email.
* **Attempt limits:** Max 5 failed validation attempts before the OTP is deleted.
* **Rate Limits:** Daily limit of 20 OTP requests per email per day; cooldown period of 60 seconds between submissions.
* **Expiry:** OTPs expire and are deleted after 10 minutes.

---

## 4. Current Scan & Chat Flows

The app routes and processes cataract screening diagnostics through two distinct state-isolated workflows:

### FLOW A — Home Scan
1. **Home:** User taps scan on the dashboard.
2. **Upload:** User selects an eye image (validated locally: size ≤ 50MB, MIME: JPG/PNG/WEBP).
3. **Crop:** Interactive crop UI aligns the eye within a guided circle overlay (saves to `useUploadWorkflowStore`).
4. **Analysis:** Client sends cropped image as a multipart `FormData` payload to `POST /v1/ai/predict` (reusing no chatId).
5. **Backend Processing:** Multer checks size (≤ 5MB) and type. S3 service uploads image buffer. ML Gateway proxies it to HuggingFace for EfficientNet-B3 inference.
6. **Result:** Backend saves prediction record, generates a new chat titled "AI Health Consultation", and returns the result `{ prediction, confidence, uploadedImageUrl, chatId }`. Result screen renders outcome (back gestures and swipe navigation are disabled; Android back replaces route with Home tab).
7. **Discuss With AI:** User taps button to proceed, setting `activeChatId = pending.chatId` and `shouldAutoConsult = true`.
8. **Chat:** User is navigated to the active Chat screen.
9. **Auto Consultation:** The `useConsultationTrigger` hook fires once because `activeChatId === pending.chatId` and `shouldAutoConsult` is true, resetting prediction states and calling the consultation endpoint.
10. **Gemini Response:** Backend invokes Gemini 2.5 Flash and streams the consultation advice back using SSE.

### FLOW B — Existing Chat Scan
1. **Chat:** User is in an active Chat session and taps "Attach Image".
2. **Crop:** User selects and crops the eye image.
3. **Analysis:** Client performs local validation and sends cropped image to `POST /v1/ai/predict` along with the current `chatId`.
4. **Return Same Chat:** Backend validates chat ownership, processes prediction, uploads to S3, queries HuggingFace, saves the record linked to the chat, and returns the result. The client replaces/navigates back to the same active Chat screen.
5. **Auto Consultation:** The `useConsultationTrigger` hook verifies ownership and triggers auto-consultation.
6. **Gemini Response:** Gemini streams the consultation outcome directly into the active chat session via SSE.

---

## 5. State Management Rules

Client-side state is strictly isolated between focused Zustand stores to prevent race conditions or unexpected UI hijacking:

* **`useSessionStore`**
  * *Responsibility:* Manages JWT credentials (`accessToken`, `refreshToken`), user profile information, and hydration status.
  * *Guards:* Auto-clears on auth invalidation.

* **`useUploadWorkflowStore`**
  * *Responsibility:* Tracks step-by-step progress checklist for the cropping and analysis screen stages. Stores `flowId` (to isolate stale background callbacks), `origin` (`'home' | 'chat'`), `chatId`, image buffers, and `lastErrorCode`.

* **`usePredictionStore`**
  * *Responsibility:* Stores the pending cataract prediction `{ prediction, confidence, uploadedImageUrl, chatId }` returned from the API, and tracks whether auto-consultation should fire (`shouldAutoConsult`) and if it is actively running (`isConsultationTriggered`).

* **`useChatStore`**
  * *Responsibility:* Holds the `activeChatId` representing the single source of truth for the active chat session currently viewed by the user.
  * *Guards:* Changing the active chat session from background triggers without explicit user interaction is strictly prohibited.

---

## 6. Production Guardrails

To maintain production stability, data privacy, and security:

1. **No direct Gemini calls from frontend:** All LLM consultation queries must be brokered through the NestJS backend gateway.
2. **No direct HF calls from frontend:** HuggingFace Spaces model inference must be proxied via the NestJS `ml-gateway`.
3. **No business logic in controllers:** Controllers must only receive, validate (via DTOs), and delegate requests to injected services.
4. **No bypassing DTO validation:** All backend controller endpoints must validate incoming payloads with class-validator decorators. Global `ValidationPipe` is set to `whitelist: true` and `forbidNonWhitelisted: true`.
5. **No hardcoded colors:** All frontend colors must be resolved from the active `ColorTheme` via the `useTheme()` hook. Hardcoded hex codes, raw rgb/rgba strings, or static Tailwind values are prohibited.
6. **No direct token storage outside approved mechanism:** Authentication tokens must only be saved in Expo `SecureStore` (native) and Zustand session state.
7. **No introducing duplicate consultation triggers:** Auto-consultation must be protected by the `isConsultationTriggered` guard to prevent double-sends.

---

## 7. Environment Variables Reference

Ensure `.env` configurations are set correctly.

### Backend Validated Variables
* `NODE_ENV` – Current environment: `development` | `production` | `test`
* `PORT` – NestJS server listening port (e.g. `8080`)
* `DATABASE_URL` – PostgreSQL connection string
* `JWT_SECRET` – Access token signing secret
* `JWT_REFRESH_SECRET` – Refresh token signing secret
* `JWT_EXPIRES_IN` – Access token lifespan (e.g. `60m`)
* `JWT_REFRESH_EXPIRES_IN` – Refresh token lifespan (e.g. `7d`)
* `GEMINI_DAILY_LIMIT` – Cap on daily consultation queries per user
* `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` – Native Google Sign-In credentials
* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` – S3 credentials
* `AWS_S3_BUCKET_NAME`, `AWS_REGION` – S3 storage details
* `HUGGINGFACE_API_URL` – ML inference endpoint
* `ML_GATEWAY_TIMEOUT_MS` – Network timeout for HF inference (default: `15000`ms)
* `ML_GATEWAY_MAX_RETRIES` – Gateway retry attempts on transient 503 errors (default: `3`)
* `GOOGLE_API_KEY` – Gemini API developer key
* `GOOGLE_GEMINI_MODEL` – Chosen model (e.g. `gemini-2.5-flash`)
* `RESEND_API_KEY` – Authentication email dispatch token

### Frontend Validated Variables
* `EXPO_PUBLIC_API_URL` – Root backend API URL, ending in `/v1`
* `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` – Client ID used for native login setup

---

## 8. ML Service Contract

### Prediction Classes
* **ML Raw Classes (HF Model Output):** `Normal`, `Immature`, `Mature`, `IOL_Inserted`.
* **Backend Mapped & Validated Enums (API Consultation validator):** `No_Cataract`, `Immature_Cataract`, `Mature_Cataract`, `IOL_Inserted`.

---

## 9. Documentation Maintenance Rules

When implementation changes:
1. Update README files (`README.md`, `frontend/README.md`, `backend/README.md`).
2. Update `AGENTS.md`.
3. Update flow diagrams (Mermaid format).
4. Update architecture documentation.
5. Update tests if behavior has changed.

## 10. What NOT To Do — Anti-Patterns
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

## 11. Bug Fixing Protocol
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
## Testing
- Write tests alongside code. Never ship without coverage.
- Unit test pure logic. Integration test API/DB boundaries.
- Test edge cases, not just the happy path.
- Run existing tests before finishing. Do not break them.
- If tests are missing for code you touch, add them.

## Before Writing Any doc
- Read the relevant existing files.
- Check if similar functionality already exists. Do not duplicate.
- Understand the data flow end-to-end before touching anything.