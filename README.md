# SpandaVidya — AI-Powered Ayurvedic Healthcare Platform findig Cataract with Ai and machine learning

SpandaVidya is a production-grade AI healthcare application that combines Ayurvedic consultation (chat) with cataract detection via computer vision. Users interact through a React Native mobile app; all AI, ML, and data operations are handled exclusively by the NestJS backend — never client-side.

**Architecture at a glance:**

```
React Native (Expo) → NestJS Backend → Google Gemini (chat streaming)
                                     → HuggingFace ML Service (cataract detection)
                                     → AWS S3 (file storage)
                                     → PostgreSQL via Prisma (persistence)
```

Health https://spandavidyaai-app-production.up.railway.app/v1/health/live

Ready https://spandavidyaai-app-production.up.railway.app/v1/health/ready

Swagger https://spandavidyaai-app-production.up.railway.app/api

HUGGINGFACE_API_URL=https://sameer2210-cataractaiml.hf.space/predict

HUGGINGFACE_Test_URL=https://sameer2210-cataractaiml.hf.space/docs

Backend https://spandavidyaai-app-production.up.railway.app/v1

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Folder Structure](#folder-structure)
3. [Environment Variables](#environment-variables)
4. [Authentication Architecture](#authentication-architecture)
5. [API & System Design](#api--system-design)
6. [File Upload Architecture](#file-upload-architecture)
7. [Cataract ML Service](#cataract-ml-service)
8. [Image Prediction Flow](#image-prediction-flow)
9. [Streaming (SSE)](#streaming-sse)
10. [Backend Modules](#backend-modules)
11. [Database & Prisma](#database--prisma)
12. [Docker Setup](#docker-setup)
13. [CI/CD](#cicd)
14. [Security](#security)
15. [Testing Architecture](#testing-architecture)

---

## Tech Stack

### Backend

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | NestJS (TypeScript)                     |
| ORM          | Prisma                                  |
| Database     | PostgreSQL                              |
| Auth         | JWT (access + refresh) + Google OAuth   |
| AI Chat      | Google Gemini 2.5 Flash (SSE streaming) |
| ML Inference | HuggingFace Spaces (EfficientNet-B3)    |
| File Storage | AWS S3 (presigned URLs)                 |
| Monitoring   | Prometheus + Sentry                     |
| Security     | Helmet, CORS, Rate-Limit, HPP           |
| Logging      | Winston / nestjs-pino (JSON structured) |
| Testing      | Jest + Supertest                        |

### Frontend

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| Framework    | Expo SDK 54 + React Native 0.81           |
| Language     | TypeScript                                |
| Navigation   | Expo Router                               |
| Styling      | NativeWind (Tailwind CSS)                 |
| State        | Zustand                                   |
| Server State | TanStack React Query                      |
| HTTP         | Axios                                     |
| Forms        | React Hook Form + Zod                     |
| Lists        | FlashList                                 |
| Animation    | React Native Reanimated                   |
| UI Extras    | Gorhom Bottom Sheet                       |
| Auth         | @react-native-google-signin/google-signin |

---

## Folder Structure

### Backend (`/backend`)

```
src/
├── auth/           # JWT auth, Google OAuth, token rotation
├── users/          # User management, profiles
├── chat/           # Chat session & message persistence, history compile, streaming
├── ai/             # HuggingFace cataract model prediction pipeline proxy
├── uploads/        # S3 presigned URL generation & direct multipart uploads
├── audit-log/      # Append-only audit logger for user profile/action auditing
├── health/         # Health check endpoints
├── config/         # Environment config (NestJS ConfigModule)
└── common/         # Guards, decorators, filters, interceptors
```

### Frontend (`/frontend`)

```
frontend/
├── app/
│   ├── (tabs)/             # Tab navigator screens
│   ├── index.tsx           # Public landing screen
│   ├── login.tsx
│   ├── signup.tsx
│   ├── data-collection.tsx # ML data collection
│   └── body-insight.tsx    # Questionnaire
├── src/
│   ├── components/         # Reusable UI components
│   ├── features/
│   │   ├── auth/           # Auth API, types, session store
│   │   └── chat/           # Chat API, hooks, UI, stream parser
│   ├── providers/          # App-wide React providers
│   ├── shared/             # HTTP client, env, token storage, errors
│   ├── services/           # Thin service re-export layer
│   ├── hooks/              # Theme and utility hooks
│   └── theme/              # Theme tokens
├── assets/
├── app.json
├── tailwind.config.js
└── package.json
```

**Key frontend files:**

| Area          | Path                                                 |
| ------------- | ---------------------------------------------------- |
| Auth API      | `src/features/auth/api/auth-api.ts`                  |
| Session store | `src/features/auth/store/session-store.ts`           |
| Token storage | `src/shared/auth/token-storage.ts`                   |
| HTTP client   | `src/shared/api/http-client.ts`                      |
| Query client  | `src/shared/api/query-client.ts`                     |
| Chat API      | `src/features/chat/api/chat-api.ts`                  |
| Stream parser | `src/features/chat/streaming/parse-stream-chunks.ts` |

---

## Environment Variables

### Backend (`.env`)

```env
NODE_ENV=development
PORT=8080

# Database
DATABASE_URL="postgresql://postgres:@db.<ref>.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:@db.<ref>.supabase.co:5432/postgres"

# JWT
JWT_SECRET=<secret>
JWT_EXPIRES_IN=60m
JWT_REFRESH_SECRET=<refresh-secret>
JWT_REFRESH_EXPIRES_IN=7d

# PostgreSQL (Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=spandavidya

# ML Gateway
HUGGINGFACE_API_URL=https://sameer2210-cataractaiml.hf.space/predict
ML_GATEWAY_TIMEOUT_MS=60000
ML_GATEWAY_MAX_RETRIES=0

# Google Gemini
GOOGLE_API_KEY=<key>
GOOGLE_GEMINI_MODEL=gemini-2.5-flash

# AWS S3
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=<bucket>

# Google OAuth
GOOGLE_WEB_CLIENT_ID=<id>
GOOGLE_ANDROID_CLIENT_ID=<id>
GOOGLE_IOS_CLIENT_ID=<id>
```

### Frontend (`.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<id>
```

---

## Authentication Architecture

**Strategy:** JWT access + refresh token rotation, backed by Google Native Sign-In.

Mobile (primary) and web flows are isolated.

```
React Native App
  └── Google Native Sign-In (@react-native-google-signin/google-signin)
        └── Google ID Token
              └── POST /auth/google/verify  →  NestJS
                    └── Verify token → Create/fetch user
                          └── Issue JWT access token (60m) + refresh token (7d)
                                └── Secure Storage (Expo SecureStore) + Zustand session
```

**Refresh token rotation:** On every refresh, the old token is invalidated and a new pair is issued. Tokens are stored server-side (DB) to support revocation.

**Email OTP Flow:**
```
React Native App
  └── Email Input & Submit
        └── POST /auth/email/otp/request → NestJS
              └── Generate OTP, hash code, store in `EmailOtp` table (expires in 10 min, single active OTP per email)
                └── Send OTP via email to user

User receives OTP and enters code:

POST /auth/email/otp/verify → NestJS
      └── Verify hashed OTP, enforce attempt limits, delete OTP record on success
      └── If user exists → login; else → create user record
      └── Issue JWT access (60 min) + refresh token (7 days) and store refresh token in DB
```

**Decorators:** `@Public()` opts routes out of the JWT guard. `@Roles()` enforces RBAC.

---

## API & System Design

- **Versioning:** URI-based (`/v1/...`) via `app.enableVersioning({ type: VersioningType.URI })`.
- **Validation:** Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`.
- **Logging:** `nestjs-pino` — zero-allocation JSON, correlation IDs, Datadog/CloudWatch compatible.
- **Rate limiting:** `@nestjs/throttler` backed by Redis. Strict limits on `/ai/generate` to prevent billing attacks.
- **Error handling:** Global exception filter + Prisma error mapper → normalized HTTP responses.
- **Audit logging:** Tracks user actions, metadata, and diffs on sensitive operations.

---

## ## File Upload Architecture
for src -
find src > src-structure.txt

## File Upload Architecture (Updated)

The image upload pipeline now uses a dedicated **upload‑workflow store** (Zustand) and an enhanced UI flow while keeping the secure backend‑controlled process.

### Frontend Steps
1. **Select Image** – User picks an eye image via the device picker.
2. **Validation** – Client‑side MIME (JPG, JPEG, PNG, WEBP) and size (≤ 50 MB) checks; invalid files are rejected before any request.
3. **Crop UI** – Centered `CropOverlay` with an `EyeGuideIcon` provides visual guidance; it does not affect the cropping calculation.
4. **Confirm Crop** – The cropped image is saved in the **upload‑workflow store**.
5. **Upload Another (optional)** – Users can tap “Upload Another Image”, which clears the workflow (`clearWorkflow()`) and navigates back to `/scan-upload` via `router.replace`.
6. **Upload & ML Processing** – The app requests a presigned S3 URL from the NestJS backend, uploads the image directly to S3, then calls `POST /ai/predict`.

### Backend Processing
1. **Multer Interceptor** – Handles multipart upload and re‑validates MIME and size.
2. **S3 Service** – Stores the original image securely.
3. **ML Gateway** – Forwards the image to HuggingFace with timeout and retry logic.
4. **Database** – Persists `Upload`, `AiPrediction`, and creates a chat message.

### Response
- Returns `{ prediction, confidence, uploadedImageUrl, chatId }`.
- Frontend stores the pending prediction, clears the workflow, and navigates to the result screen.

This approach provides defense-in-depth validation, centralized security enforcement, AI processing control, auditability, and prediction persistence.

---

## Cataract ML Service

**Deployed:** `https://sameer2210-cataractaiml.hf.space`
**Docs:** `https://sameer2210-cataractaiml.hf.space/docs`

A stateless FastAPI microservice. It receives an eye image, runs EfficientNet-B3 inference, and returns a prediction. It has no auth, no persistence, no business logic — all of that lives in the NestJS backend.

**Model:** EfficientNet-B3 (PyTorch, CPU inference)

**Prediction classes:**

| Label          | Meaning                      |
| -------------- | ---------------------------- |
| `Normal`       | No cataract                  |
| `Immature`     | Early cataract               |
| `Mature`       | Advanced cataract            |
| `IOL_Inserted` | Post-surgery artificial lens |

**Inference pipeline:** Image → RGB conversion → Resize → torchvision transforms → tensor → EfficientNet-B3 → Softmax → top class + confidence score.

**API:**

```
GET  /          → { "message": "Cataract AI Running" }
POST /predict   → multipart/form-data, field: file
                ← { "prediction": "Immature", "confidence": 0.87 }
```

Accepted formats: JPG, JPEG, PNG.

> This service must never be called directly from the frontend. All traffic routes through the NestJS ml-gateway module.

---

## ## Image Prediction Flow

```
User selects eye image
        │
        ▼
Photo Picker
        │
        ▼
Crop Workflow
        │
        ▼
Image Processing
        ├── Crop
        ├── Resize
        |-Frontend validation
        ├── Allowed types: JPG, JPEG, PNG, WEBP
        ├── Maximum size: 50 MB
        └── Invalid files rejected locally

              └── POST /ai/predict
                    └── NestJS Controller
                          ├── Multer file extraction
                          ├── Backend validation
                          └── Security checks

                                └── Upload image to AWS S3

                                      └── AiService.callWithRetry()

                                            └── HuggingFace Cataract Model
                                                  ├── Prediction
                                                  └── Confidence score

                                                        └── Retry on transient failures
                                                              └── Timeout protection

                                                                    └── Save Upload record

                                                                          └── Save AiPrediction

                                                                                └── Save Assistant Message

                                                                                      └── Return
                                                                                          {
                                                                                            prediction,
                                                                                            confidence,
                                                                                            summary,
                                                                                            recommendation
                                                                                          }
```

### User Experience Flow

```
Select Image
  └── Uploading...
        └── Analyzing...
              └── Generating Diagnosis...
                    └── Analysis Complete
```

### Failure Paths

| Failure                 | Response                                 |
| ----------------------- | ---------------------------------------- |
| File > 50 MB             | "Image size must be less than 50 MB"      |
| Invalid MIME            | "Only JPG, PNG, WEBP allowed"            |
| Backend validation fail | 400 / 413                                |
| S3 upload fail          | 500 - Unable to upload image             |
| ML timeout/unavailable  | 503 - AI service temporarily unavailable |
| Retry exhausted         | 503 - Please try again later             |

```

```

**Failure paths:**

| Failure                        | Response                                      |
| ------------------------------ | --------------------------------------------- |
| File > 50 MB                   | Frontend: "Image size must be less than 50 MB"|
| Invalid MIME                   | Frontend: "Only JPG, PNG, WEBP allowed"       |
| Backend validation fail        | 400 / 413                                     |
| S3 upload fail                 | 500 — "Unable to upload image"                |
| ML service timeout/unavailable | 503 — "AI service temporarily unavailable"    |

**Validation flow diagram:**

```
Frontend validator → bad: show error, stop
                   → valid: POST to backend
                              → NestJS interceptor → bad: 400/413
                                                   → valid: service layer recheck
                                                              → S3 upload
                                                              → HuggingFace call → bad: retryable 503
                                                                                 → success: return result
```

---

## Streaming (SSE)

**Choice: Server-Sent Events over WebSockets.**

For unidirectional AI token streaming (server → client), SSE is strictly better: operates over HTTP/2, no stateful connection overhead, automatic reconnect, and works natively with React Native.

WebSockets add unnecessary complexity (bidirectional handshake, persistent state) for a use case that is inherently one-directional.

**Frontend stream parser:** `src/features/chat/streaming/parse-stream-chunks.ts`
Handles token event parsing and optimistic message insertion into the FlashList.

---

## Backend Modules

| Module       | Responsibility                                              |
| ------------ | ----------------------------------------------------------- |
| `auth`       | Google OAuth verification, JWT issue/refresh/revoke, guards |
| `users`      | User CRUD, profile management & details                     |
| `chat`       | Chat session creation, message persistence, history compile, streaming LLM responses |
| `ai`         | Cataract ML model prediction pipeline, consultation setup    |
| `uploads`    | Presigned URL generation, direct multipart file uploads     |
| `audit-log`  | Record user actions, profile views, and metadata diff logs  |
| `health`     | Liveness/readiness endpoints                                |
| `config`     | Environment config via NestJS ConfigModule                  |

---

## Database & Prisma

```bash
# Push schema to DB and regenerate client
npx prisma db push --force-reset
npx prisma generate

# Visual browser
npx prisma studio
```

**Key packages:**

```bash
npm install @prisma/client
npm install -D prisma
```

**Core schema entities:** `User`, `Chat`, `Message`, `Upload`, `AiPrediction`, `RefreshToken`, `AuditLog`

---

## Docker Setup

Development stack (API + PostgreSQL + pgAdmin) is fully containerized via Docker Compose.

```bash
npm run prisma:restart   # Reset DB inside Docker
```

---

## CI/CD

GitHub Actions pipeline runs on every push:

1. Lint
2. Type check
3. Unit tests
4. Build

---

## Security

| Control       | Implementation                                           |
| ------------- | -------------------------------------------------------- |
| Helmet        | HTTP security headers                                    |
| CORS          | Configured per environment                               |
| Rate limiting | `@nestjs/throttler` + Redis                              |
| HPP           | HTTP Parameter Pollution protection                      |
| JWT           | Short-lived access tokens + rotating refresh tokens      |
| Validation    | `class-validator` whitelist mode — strips unknown fields |
| ML isolation  | HuggingFace never called from frontend                   |
| S3 isolation  | Presigned URLs; backend never streams file bytes         |
| Audit logging | All sensitive actions logged with user context and diffs |

---

## Testing Architecture

The backend implements a complete testing pyramid. The environment automatically isolates integration/E2E databases using the `TEST_DATABASE_URL` variable to safeguard staging/production data.

### Test Suites

* **Unit Tests (`npm run test:unit`):** Fast, fully mocked specs located under `src/` to validate core validation pipes, filters, rate limit transactions, and error mappers without database or network overhead.
* **Integration Tests (`npm run test:integration`):** Validates database persistence and cross-service linkages using real Prisma services on the isolated test database. Spans `auth`, `chat`, `upload`, and `ai` integration suites.
* **E2E Tests (`npm run test:e2e`):** Exercises controller endpoints using NestJS bootstrap and `Supertest`. Includes:
  - `auth.e2e-spec.ts` & `chat.e2e-spec.ts` endpoint validations.
  - `stream.e2e-spec.ts`: Validates SSE streams, token chunks, and message lifecycle syncing.
  - `pagination.e2e-spec.ts`: Seeds 35, 60, and 100 messages to check for zero gaps/duplicates.
  - `full-user-journey.e2e-spec.ts`: Full flow from registration -> login -> photo pick/crop -> prediction -> consultation trigger -> stream refetch -> logout.

### Running Tests

To run the suite against the isolated test database, ensure `TEST_DATABASE_URL` is defined in your shell or configuration:

```bash
# Setup the test database schema
npx cross-env DATABASE_URL=YOUR_TEST_DB_URL npx prisma db push --skip-generate

# Run specific suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Run all test suites
npm run test:all
```

---

## Key Constraints (Non-Negotiable)

1. **Frontend never calls AI providers directly.** All Gemini and HuggingFace traffic routes through the NestJS backend.
2. **All image uploads must pass frontend and backend validation before AI processing.** Images are uploaded through the NestJS backend, stored in AWS S3, and then forwarded to the ML service. Oversized or invalid files must never reach the AI inference layer.

3. **ML service is stateless.** No auth, no persistence, no business logic in the HuggingFace service.
4. **Refresh tokens are rotated on every use** and stored server-side for revocation support.

---

## Theme System Architecture (Frontend)

SpandaVidya implements a structured, fully decoupled, and theme-compliant design system on the frontend. This system ensures consistent visuals across the application and supports dynamic transitions between Light and Dark modes.

### 1. Architectural Flow
Theme resolution is centralized and runs client-side:
```
                    ┌────────────────────────┐
                    │      SecureStore       │
                    └───────────┬────────────┘
                                │ hydrate on launch (once)
                                ▼
 ┌──────────────┐   ┌────────────────────────┐   ┌────────────────────────┐
 │  OS Settings ├──►│     ThemeProvider      ├──►│      ThemeContext      │
 └──────────────┘   └───────────┬────────────┘   └───────────┬────────────┘
                                │                            │
                                │ provides Navigation Theme  │ exposes hook
                                ▼                            ▼
                    ┌────────────────────────┐   ┌────────────────────────┐
                    │ React Navigation Shell │   │      useTheme()        │
                    └────────────────────────┘   └────────────────────────┘
```

### 2. Core Modules (`src/theme/`)

- [types.ts](file:///c:/Users/Sam/Desktop/SpandaVidyaAi-app/frontend/src/theme/types.ts): Defines strict TypeScript types for color maps (`ColorTheme`), spacings, radii, and `ThemeContextType`.
- [colors.ts](file:///c:/Users/Sam/Desktop/SpandaVidyaAi-app/frontend/src/theme/colors.ts): Holds the color palettes for `lightColors` and `darkColors`.
- [themes.ts](file:///c:/Users/Sam/Desktop/SpandaVidyaAi-app/frontend/src/theme/themes.ts): Configures spacings and border radii.
- [navigation-theme.ts](file:///c:/Users/Sam/Desktop/SpandaVidyaAi-app/frontend/src/theme/navigation-theme.ts): Integrates App colors with `@react-navigation/native` `Theme` structures.
- [storage.ts](file:///c:/Users/Sam/Desktop/SpandaVidyaAi-app/frontend/src/theme/storage.ts): Automatically persists user theme preferences (Light, Dark, System) using Expo `SecureStore` (native) and `localStorage` (web).

### 3. Usage Rules (Non-Negotiable)

1. **Zero Hardcoded Colors**: 
   Do NOT use inline hex codes (e.g. `#FFFFFF`), raw rgb/rgba strings (e.g. `rgba(239, 68, 68, 0.15)`), or direct Tailwind color values in components (such as `text-[#F5FAFF]`). All colors must be resolved from the theme state.
2. **Accessing the Theme**:
   Import `useTheme` inside custom screens/components:
   ```typescript
   import { useTheme } from '@/theme';
   
   const { theme, isDark, themeMode, setThemeMode } = useTheme();
   // access tokens: theme.colors.accent.primary, theme.colors.background.base
   ```
3. **Extending the Theme**:
   If a custom color variation or background is needed:
   - Add the key under the `ColorTheme` interface in `src/theme/types.ts`.
   - Define the value for both light mode and dark mode palettes in `src/theme/colors.ts`.
   - Never define colors directly in inline styles or files.
4. **Use Theme Components**:
   Utilize theme-aware components instead of standard elements:
   - Use `ThemeText` instead of `Text`.
   - Use `ThemeSurface` instead of plain `View` for containers.
   - Use `ThemeBadge` and `ThemeDivider` to inherit standard semantic borders/spacings.

