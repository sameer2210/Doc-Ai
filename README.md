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

# sendotp
RESEND_API_KEY=abc

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
EXPO_PUBLIC_API_URL=http://localhost:8080/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<id>
```

---

## Authentication Architecture

**Strategy:** JWT access + refresh token rotation, backed by Google Native Sign-In.

Mobile (primary) and web flows are isolated.

### Authentication Flow Diagram

```mermaid
graph TD
    User([User]) --> AuthChoice{Select Auth Method}
    AuthChoice -->|Google Native Sign-In| Google[Google Login Flow]
    AuthChoice -->|Email OTP| OTP[OTP Verification Flow]
    Google --> BackendVerify[Backend Verification]
    OTP --> BackendVerify
    BackendVerify --> JWTSession[JWT Session Creation]
    JWTSession --> SessionStore[User Session Store]
    SessionStore --> AppAccess[App Access Granted]
```

### Google Login Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant App as React Native App
    participant BE as NestJS Backend
    participant Google as Google Auth API
    participant DB as PostgreSQL DB

    User->>App: Tap "Continue with Google"
    App->>Google: Authenticate & Request ID Token
    Google-->>App: Return ID Token
    App->>BE: POST /v1/auth/google/verify { token: idToken }
    BE->>Google: Verify ID Token signature & audience
    Google-->>BE: Return User Profile
    BE->>DB: Upsert User in DB
    BE->>BE: Create JWT Access & Refresh Tokens
    BE->>DB: Save/update Refresh Token record
    BE-->>App: Return Tokens + User Object
    App->>App: Store tokens in SecureStore & Hydrate Zustand
    App->>User: Redirect to Home Screen
```

### OTP Verification Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant App as React Native App
    participant BE as NestJS Backend
    participant DB as PostgreSQL DB
    participant Mail as Email Service (Resend)

    User->>App: Enter email & Request OTP
    App->>BE: POST /v1/auth/email/request-otp { email }
    BE->>DB: Check rate limits (max 20/day) & Cooldown (60s)
    BE->>DB: Delete any existing active OTP for email
    BE->>DB: Generate new OTP (10 min expiry) & Save to DB
    BE->>Mail: Send OTP code email
    BE-->>App: Return Success / Cooldown remaining

    User->>App: Input OTP code
    App->>BE: POST /v1/auth/email/verify-otp { email, code }
    BE->>DB: Retrieve OTP record
    alt OTP Valid & Not Expired
        BE->>DB: Upsert User & Delete OTP record
        BE->>BE: Generate JWT Access & Refresh Tokens
        BE-->>App: Return Tokens + User Object
    else OTP Invalid / Expired / Max Attempts Exceeded
        BE->>DB: Increment failed attempts (max 5)
        alt Failed Attempts >= 5
            BE->>DB: Delete OTP record (invalidate)
        end
        BE-->>App: Return Error (Invalid / Expired)
    end
```


**Refresh token rotation:** On every refresh, the old token is invalidated and a new pair is issued. Tokens are stored server-side (DB) to support revocation.

**Email OTP Flow:**
OTPs are requested via `POST /v1/auth/email/request-otp` and verified via `POST /v1/auth/email/verify-otp`.
* **Rate limit:** Max 20 OTP requests per email per day.
* **Cooldown:** Enforces 60-second wait between requests.
* **Attempt limits:** Max 5 failed verification attempts before the OTP is deleted.
* **Expiry:** OTPs expire and are invalidated after 10 minutes.
* **Auditing:** Logs events such as `OTP_REQUESTED`, `USER_REGISTERED`, and `USER_LOGGED_IN` to the audit log.

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

## File Upload Architecture

The application handles file uploads through two distinct mechanisms depending on the file type:

1. **General/Asset Uploads:** The client requests a presigned S3 URL from the NestJS backend, and then uploads the file directly to S3.
2. **AI Eye Scan Prediction Images:** The client performs a direct multipart `FormData` upload to the NestJS backend via `POST /v1/ai/predict`. The backend validates the image (size, type, dimensions), uploads the buffer directly to S3, and forwards it to the Hugging Face ML service.

### Frontend Steps (AI Eye Scan)
1. **Select Image** – User picks an eye image via the device camera or library.
2. **Validation** – Client‑side MIME (JPG, JPEG, PNG, WEBP) and size (≤ 50 MB) checks; invalid files are rejected locally.
3. **Crop UI** – Interactive crop overlay allows the user to scale and position the eye within a guided circle.
4. **Confirm Crop** – Cropped image is saved in the **upload‑workflow store** (Zustand).
5. **Upload Another (optional)** – Users can clear the workflow and restart.
6. **Upload & ML Processing** – The client sends the image as a multipart `FormData` payload directly to the NestJS backend using `POST /v1/ai/predict` (reusing the current chat context `chatId` if origin is Chat).

### Backend Processing
1. **Multer Interceptor** – Receives the multipart file and validates MIME (JPG, JPEG, PNG, WEBP) and size (≤ 5 MB limit).
2. **Dimension Validator** – Checks image dimensions to ensure they do not exceed 4096 × 4096 px.
3. **S3 Service** – Backend uploads the validated image buffer directly to AWS S3.
4. **ML Inference Gateway** – Proxies the image buffer to the Hugging Face Spaces ML service with timeout and retry logic.
5. **Database Transaction** – Persists the `Upload` and `AiPrediction` records, creates a `SYSTEM` message, and links them together.

### Response
- Returns `{ prediction, confidence, uploadedImageUrl, chatId }`.
- Frontend stores the prediction in the prediction store and navigates.

This approach provides defense-in-depth validation, centralized security enforcement, AI processing control, auditability, and prediction persistence.

### Image Upload Flow Diagram

```mermaid
graph TD
    Select[Select Eye Image] --> LocalVal{Local Validation}
    LocalVal -->|Size > 50MB or Invalid MIME| RejectLocal[Show Error & Reject]
    LocalVal -->|Valid JPG/PNG/WEBP| Workflow[Store in Upload Workflow Store]
    Workflow --> Crop[Crop Image via EyeGuideOverlay]
    Crop --> ConfirmCrop[Save cropped image in Store]
    ConfirmCrop --> Analysis[Initiate Analysis Screen]
    Analysis --> UploadBE[POST /v1/ai/predict - Multipart FormData]
    UploadBE --> MulterVal{Multer Validator}
    MulterVal -->|Size > 5MB or invalid type| RejectBE[Return HTTP 400/413 Error]
    MulterVal -->|Valid| S3Upload[Upload to AWS S3]
    S3Upload --> MLGateway[Proxy to HuggingFace Spaces]
    MLGateway --> Predict[Run EfficientNet-B3 Inference]
    Predict --> DBTrans[DB Transaction: Save Upload & Prediction]
    DBTrans --> Result[Return Result Payload to Client]
```

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

---

The cataract prediction workflow integrates client-side preprocessing with a robust NestJS backend proxying to the HuggingFace ML service.

### Technical Sequence

```
User selects eye image
        │
        ▼
Photo Picker
        │
        ▼
Crop Workflow (EyeGuideOverlay)
        │
        ▼
Image Processing & Local Validation
        ├── Crop Overlay Confirmation
        ├── Size Check (≤ 50 MB)
        └── MIME Check (JPG, JPEG, PNG, WEBP)
              │
              └── POST /v1/ai/predict (multipart/form-data)
                    └── NestJS Controller (Rate Limit: 6 req/min)
                          ├── Multer interceptor: size ≤ 5 MB limit check
                          ├── MIME type validation: JPG, JPEG, PNG, WEBP
                          ├── Secure AWS S3 Upload (Stores original image bytes)
                          │     │
                          │     ▼
                          └── AI ML Gateway (Service Layer)
                                └── Call HuggingFace Spaces (EfficientNet-B3)
                                      ├── Preprocessing (CLAHE, Hough Circle)
                                      ├── Model Inference (Top-Class + Confidence)
                                      ├── Circuit Breaker / Timeout (15s)
                                      └── Retry Logic (on transient 503 errors)
                                            │
                                            ▼
                                └── DB Persist (Transaction block)
                                      ├── Create SYSTEM message in target Chat
                                      ├── Link Upload record to Message
                                      └── Create AiPrediction record
                                            │
                                            ▼
                                └── Return Success Payload
                                      {
                                        prediction: "Immature",
                                        confidence: 0.87,
                                        uploadedImageUrl: "https://s3...",
                                        chatId: "chat-uuid"
                                      }
```

### Failure Handling & Validation

| Failure Case | Detection Layer | Action / Response |
| :--- | :--- | :--- |
| File > 50 MB | Frontend | Rejected locally: "Image size must be less than 50 MB" |
| Invalid Extension | Frontend | Rejected locally: "Only JPG, PNG, WEBP allowed" |
| File > 5 MB | Backend | Multer rejects with `HTTP 413 Payload Too Large` |
| Invalid MIME | Backend | Interceptor rejects with `HTTP 400 Bad Request` |
| S3 Upload Fail | Backend | Logger captures error, returns `HTTP 500 Internal Server Error` |
| ML Timeout (>15s) | Backend (Gateway) | Retries, then returns `HTTP 503 AI service temporarily busy` |
| ML API Unavailable | Backend (Gateway) | Retries, then returns `HTTP 503 AI service temporarily unavailable` |
| Invalid Chat ID | Backend | Validates ownership: returns `HTTP 404 Target chat session not found` |tion flow diagram:**

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



## Detailed Chat & Scan Routing Workflows

The application implements a decoupled, state-isolated routing and consultation model.

### Scan Analysis Flow Diagram

#### FLOW A: Home-Origin Scan
```mermaid
graph TD
    Home[Home Screen] ──► Upload[Scan Upload]
    Upload ──► Crop[Crop Screen]
    Crop ──► Analysis[Analysis Screen]
    Analysis ──►|POST /v1/ai/predict| Result[Result Screen]
    Result ──►|Click "Discuss With AI"| Chat[Chat Screen]
    Chat ──►|Auto Consultation Triggered| Consult[POST /v1/chats/:chatId/consultation]
    Consult ──► Gemini[Gemini SSE Response]
```

**Back Navigation Flow A:**
* **Result Screen / Error Result Screen:** Header back and swipe gestures are disabled. Android physical back button replaces route with `/(tabs)` (Home tab).
* **Crop Screen:** Back arrow/cancel calls `router.back()` to return to `Scan Upload`.
* **Scan Upload:** Back returns to `Home Tab`.

---

#### FLOW B: Chat-Origin Scan
```mermaid
graph TD
    Chat[Chat Screen] ──►|Attach Image| Crop[Crop Screen]
    Crop ──► Analysis[Analysis Screen]
    Analysis ──►|POST /v1/ai/predict with chatId| Return[Return to Same Chat Screen]
    Return ──►|Auto Consultation Triggered| Consult[POST /v1/chats/:chatId/consultation]
    Consult ──► Gemini[Gemini SSE Response]
```

**Back Navigation Flow B:**
* **Crop Screen:** Cancel/back arrow calls `router.back()` to return to the active `Chat Screen`.
* **Result Screen (Error):** Android physical back replaces route with `/(tabs)` (Home tab).

---

### Application End-to-End Flow Diagram
```mermaid
graph TD
    Auth[Google Login / Email OTP] ──► Home[Home Dashboard]
    Home ──► Scan[Scan Upload & Crop]
    Home ──► Chat[Ayurvedic Consult Chat]
    Home ──► Body[Body Insight Questionnaire]
    Scan ──► AI[Backend AI/ML Gateway & HuggingFace Predict]
    Chat ──► Gemini[Gemini streaming SSE]
    Body ──► DB[PostgreSQL via Prisma persistence]
    AI ──► DB
    DB ──► History[User Diagnostic History & Chats]
```

---

### Chat Ownership & Active Chat Isolation Rules

1. **Active Chat Single Source of Truth:**
   The `activeChatId` in `useChatStore` is the only source of truth for the chat session currently being viewed.
2. **No UI Hijacking / Isolation:**
   `pending.chatId` in `usePredictionStore` holds the target ID of a completed scan, but it **never** automatically changes the active chat session in the background or drives UI transitions without explicit user action (e.g., clicking "Discuss With SpandaVidya AI").
3. **Scan Origin Resolution:**
   - **Home-origin scans:** Do not have an active chat context. The backend `/v1/ai/predict` endpoint creates a brand new chat session explicitly, returning its unique `chatId`.
   - **Chat-origin scans:** Reuse the currently active chat's ID as `chatId`, ensuring the result is appended to the same thread.
4. **Auto-Consultation Safety Guard:**
   Ayurvedic AI consultations are triggered automatically if and only if `activeChatId === pending.chatId` and `shouldAutoConsult` is `true`.

### Backend Chat Resolution Logic

The `/v1/ai/predict` endpoint implements strict database-driven chat resolution:
- **`chatId` provided:** The backend validates that the target chat exists and belongs to the authenticated user. On verification, it links the `Upload` and `AiPrediction` records to that chat. If not found or owned by another user, it fails with `HTTP 404 Target chat session not found`.
- **`chatId` omitted:** The backend explicitly creates a new chat session titled "AI Health Consultation" for the user.
- **Strict Prohibition:** The backend must **never** perform fallback lookups (such as finding the user's "most recent" chat session or using a `findFirst` query) to assign predictions.


### Chat Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant App as React Native App
    participant BE as NestJS Backend
    participant Gemini as Gemini AI Service
    participant DB as PostgreSQL DB

    User->>App: Send Message
    App->>App: Optimistically append message to FlashList
    App->>BE: POST /v1/chats/:chatId/messages
    BE->>DB: Save User message in DB
    BE->>Gemini: Request chat consultation (Gemini 2.5 Flash)
    Gemini-->>BE: Stream response chunks (SSE)
    BE-->>App: Stream token chunks via SSE
    App->>App: Render incoming tokens in real-time
    Note over App, BE: Connection closed upon completion
    BE->>DB: Persist Assistant message to DB
```

### User Journey Flow Diagram

```mermaid
graph TD
    Start([Launch App]) --> Auth{Authenticated?}
    Auth -->|No| Login[Auth Screen: Google / OTP]
    Login --> Home
    Auth -->|Yes| Home[Home Dashboard]

    Home -->|Option 1| Chat[Ayurvedic Chat Consultation]
    Home -->|Option 2| Scan[Cataract Scan Diagnostic]
    Home -->|Option 3| Profile[Profile & Audit Logs]
    Home -->|Option 4| BodyInsight[Ayurvedic Body Insight Questionnaire]

    Scan --> Crop[Interactive Crop Screen]
    Crop --> Analyze[AI Prediction Analysis]
    Analyze --> Result[Outcome Screen]
    Result --> Discuss{Tap Discuss with AI?}
    Discuss -->|Yes| Chat
    Discuss -->|No| Home

    BodyInsight --> SaveReport[Save Body Constituent Result]
    SaveReport --> Reports[View Reports / History]

    Chat --> StreamChat[Receive Gemini Streaming Advice]
```

### AI Consultation Flow Diagram

```mermaid
sequenceDiagram
    participant UI as Chat Screen Component
    participant Hook as useConsultationTrigger Hook
    participant PS as usePredictionStore
    participant CS as useChatStore
    participant API as Backend Consultation API

    UI->>Hook: Mounted / activeChatId changed
    Hook->>PS: Get pending & shouldAutoConsult state
    Hook->>CS: Get activeChatId

    alt activeChatId === pending.chatId AND shouldAutoConsult === true
        Hook->>PS: Set isConsultationTriggered = true (Prevent double triggers)
        Hook->>API: POST /v1/chats/:chatId/consultation { prediction, confidence }
        API-->>Hook: Stream Gemini SSE Response
        Hook->>PS: clearPending() & clearWorkflow() (Reset states)
    else Guards do not match
        Hook->>Hook: No-op / Idle
    end
```

### Navigation Flow Diagram

```mermaid
graph TD
    index.tsx[app/index.tsx <br/> Landing Screen] -->|Unauthenticated| login[app/login.tsx <br/> Shared AuthScreen]
    index.tsx -->|Authenticated| tabs[app/(tabs)/_layout.tsx <br/> Tab Navigator]

    subgraph Tabs [Tabs Group]
        tabs --> tabIndex[app/(tabs)/index.tsx <br/> Home Dashboard]
        tabs --> tabChat[app/(tabs)/chat.tsx <br/> Chat Consultation]
        tabs --> tabReports[app/(tabs)/reports.tsx <br/> Reports History]
        tabs --> tabExplore[app/(tabs)/explore.tsx <br/> Architecture Status]
        tabs --> tabProfile[app/(tabs)/profile.tsx <br/> Profile & Settings]
    end

    tabIndex -->|Start Scan| scanUpload[app/scan-upload.tsx]
    tabChat -->|Attach Scan| eyeCrop[app/eye-crop.tsx]

    scanUpload --> eyeCrop
    eyeCrop --> scanAnalysis[app/scan-analysis.tsx]
    scanAnalysis --> scanResult[app/scan-result.tsx]

    tabIndex --> bodyInsight[app/body-insight.tsx]
    tabIndex --> dataCollection[app/data-collection.tsx]

    scanResult -->|Discuss with AI| tabChat
```

