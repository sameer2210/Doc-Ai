# Backend Crash-Risk Audit

Scope: NestJS backend, Prisma/PostgreSQL, S3 uploads, Cataract Model prediction, Gemini streaming/SSE, and the Expo React Native call paths that can amplify backend failures.

## Top 10 Highest Crash-Risk Areas

done(SSE timeout + cleanup
rate limiting
upload size validation
global exception filter)

### 2. In-memory multipart uploads and AI prediction inside one request

Files: `backend/src/ai/ai.controller.ts`, `backend/src/ai/ai.service.ts`, `backend/src/uploads/uploads.controller.ts`, `backend/src/uploads/uploads.service.ts`, `frontend/src/services/ai.ts`.

Why dangerous: `FileInterceptor`/Multer buffers up to 20 MB in memory, then `AiService` creates `Uint8Array`, `Blob`, `FormData`, uploads to S3, calls Cataract Model, and writes Prisma records inside the same HTTP request. One request can hold multiple copies of the same file plus provider response state.

Crash scenarios: 30 concurrent 20 MB uploads can consume hundreds of MB; mobile retries duplicate uploads; Cataract Model stalls while buffers remain live; Node heap OOMs; request timeouts leave uploaded S3 files without DB prediction records.

Production fixes: prefer direct-to-S3 presigned upload for mobile, then send `uploadId`/`s3Key` to an async prediction job; avoid forwarding local file buffers from the API; run ML inference in a queue worker with concurrency limits; store job state (`PENDING`, `RUNNING`, `FAILED`, `COMPLETED`).

Exact improvements: create `POST /ai/predictions` accepting `{ uploadId }`; verify the upload belongs to the user; enqueue `ProcessPredictionJob`; return `202 Accepted` with `jobId`; process Cataract Model in BullMQ/Cloud Tasks; persist result asynchronously; expose `GET /ai/predictions/:id`.

Enterprise pattern: browser/mobile direct upload, backend metadata validation, background jobs for AI, bounded worker concurrency, idempotency keys, dead-letter queue.

Add: queue, guards, DTO validation, timeout, retry policy with jitter, cleanup handler for failed S3/DB partial work.

### 3. Cataract Model retry loop lacks cancellation and response validation

Files: `backend/src/ai/ai.service.ts`, `backend/src/config/validate-env.ts`.

Why dangerous: `callWithRetry` sleeps with `setTimeout` even if the client disconnects. `callCataractModel` accepts provider response shape without validating `prediction` and `confidence`. Retries can hammer a cold model endpoint and keep request workers busy.

Crash scenarios: client closes app, backend keeps retrying; provider returns HTML or malformed JSON and Prisma receives invalid values; many users trigger synchronized retry storms; `JSON.stringify(response.data)` logs massive provider payloads.

Production fixes: pass an `AbortSignal` from controller to service; replace raw sleep with abort-aware delay; validate provider response with Zod; retry only transient errors (`408`, `429`, `5xx`, network timeout); use exponential backoff with jitter and max elapsed time; cap provider logs.

Exact improvements: define `CataractModelResponseSchema = z.object({ prediction: z.string().min(1), confidence: z.number().min(0).max(1) })`; call `schema.parse(response.data)`; use `AbortController` and `signal` in axios config; implement `delay(ms, signal)` that rejects on abort.

Enterprise pattern: provider gateway service with schema validation, circuit breaker, retry budget, request cancellation, provider-specific error normalization.

Add: try/catch, timeout, abort signal, fallback error mapping, response validation, structured logging.

### 4. SSE streaming holds long-lived connections without hard server budgets

Files: `backend/src/chat/chat.controller.ts`, `backend/src/chat/chat.service.ts`, `frontend/src/features/chat/api/chat-api.ts`.

Why dangerous: SSE requests keep Express responses open while awaiting Gemini streaming. The service has a 60 second axios timeout, but no end-to-end server deadline, no heartbeat, no per-user connection cap, and no global stream concurrency cap. `activeAssistantStreams` only dedupes by assistant message ID inside one process.

Crash scenarios: mobile network drops but socket close is delayed; reverse proxy buffers/terminates idle SSE; many clients open streams and exhaust sockets; scaled instances allow duplicate streams; a provider stream never emits terminal data and ties up memory until timeout.

Production fixes: add server-side stream deadline with `AbortSignal.timeout`; send heartbeat comments every 15 seconds; cap active streams per user/IP globally; use Redis-backed locks for duplicate stream prevention; write a terminal error event before closing; configure proxy idle timeouts.

Exact improvements: in controller, compose `AbortSignal.any([clientSignal, AbortSignal.timeout(75_000)])`; check `res.write()` backpressure and wait for `drain`; add `const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000)` and clear it in `finally`; enforce `GeminiRateLimitService` before stream start too.

Enterprise pattern: SSE connection manager, Redis semaphore, provider deadline budget, heartbeats, backpressure-aware writes, idempotent stream resume.

Add: timeout, cleanup handlers, guards, rate limit, backpressure handling, fallback terminal event.

### 5. Prisma writes are not consistently transactional or idempotent

Files: `backend/src/ai/ai.service.ts`, `backend/src/chat/chat.service.ts`, `backend/src/uploads/uploads.service.ts`, `backend/prisma/schema.prisma`.

Why dangerous: multi-step flows create records across `Upload`, `Chat`, `Message`, and `AiPrediction`. Some flows use transactions, others create messages separately. The frontend generates idempotency keys but backend ignores them. Retries can duplicate messages, orphan S3 uploads, or fail on unique constraints.

Crash scenarios: S3 upload succeeds but DB create fails; prediction transaction fails after provider call; duplicate mobile submit creates two assistant placeholders; unique `uploadId` on prediction throws `P2002`; Prisma pool exhaustion slows all requests.

Production fixes: add idempotency columns and unique constraints; wrap related DB writes in `$transaction`; design compensating cleanup for S3 when DB fails; use Prisma transaction timeout/maxWait options; keep transactions short and never include external API calls inside transactions.

Exact improvements: add `idempotencyKey` to `Message` or a `RequestIdempotency` table; use `$transaction` for `saveUserMessage`; add `status` to `Upload` and `AiPrediction`; make prediction creation `upsert` by `uploadId`; catch `P2002` and return existing record for same idempotency key.

Enterprise pattern: transactional outbox, idempotency key table, short DB transactions, compensating deletes, retry-safe writes.

Add: transactions, validation, Prisma exception mapping, idempotency guard, cleanup fallback.

### 6. Upload validation trusts MIME type and creates DB records before object verification

Files: `backend/src/uploads/uploads.controller.ts`, `backend/src/uploads/uploads.service.ts`, `backend/src/uploads/dto/presigned-url.dto.ts`, `frontend/src/services/upload.ts`.

Why dangerous: MIME type is client-controlled. Presigned flow creates an `Upload` DB row before the object exists in S3, so users can create orphan DB records without uploading. The direct backend upload uses memory storage and does not inspect file signatures.

Crash scenarios: users upload non-image payloads with image MIME type; many presign calls create millions of orphan rows; downstream AI tries to process missing objects; frontend S3 XHR has no explicit timeout and can hang.

Production fixes: validate magic bytes for backend uploads; for presigned uploads, create records as `PENDING`, confirm with S3 `HeadObject` after upload, then mark `UPLOADED`; require `content-length-range` and content type conditions; expire stale pending uploads with a scheduled job.

Exact improvements: add `Upload.status`; add `POST /uploads/:id/complete`; use AWS SDK `HeadObjectCommand` to verify size/type; use `file-type` library for magic-byte validation; set `xhr.timeout` in frontend.

Enterprise pattern: two-phase upload confirmation, virus scanning where required, object lifecycle cleanup, signed POST policies with size constraints.

Add: validation, cleanup job, timeout, fallback logic, status machine.

### 7. Chat authorization checks are incomplete on message listing and posting

Files: `backend/src/chat/chat.controller.ts`, `backend/src/chat/chat.service.ts`.

Why dangerous: `listMessages` and `saveUserMessage` resolve a chat ID but service methods do not verify that the chat belongs to the authenticated user. `streamResponse` does verify ownership, but normal message APIs can read/write any known `chatId`.

Crash scenarios: a malformed client or compromised token hammers random chat IDs; cross-user data exposure; DB load from unauthorized list calls; corrupted conversation history causes provider failures or privacy incidents.

Production fixes: pass `userId` into `listMessages` and `saveUserMessage`; query by `{ id: chatId, userId }`; return 404/403 without leaking existence; add route param UUID validation.

Exact improvements: change `saveUserMessage(chatId, content)` to `saveUserMessage(chatId, userId, content)`; change `listMessages(chatId, cursor, limit)` to include user ownership; add DTO/pipe validation for UUID and bounded `limit`.

Enterprise pattern: authorization at query boundary, not only controller boundary; object-level access checks in every read/write path.

Add: guards, validation, query constraints, tests.

### 8. Validation is inconsistent and allows unbounded or malformed inputs

Files: `backend/src/chat/chat.controller.ts`, `backend/src/ai/dto/*`, `backend/src/uploads/dto/presigned-url.dto.ts`, `backend/src/main.ts`.

Why dangerous: global `ValidationPipe` uses implicit conversion, but DTOs are sparse. Chat content has no max length; `chatId`/`assistantMessageId` are raw strings; `PredictionHistoryDto.prediction` is any string; presigned file names have no max length; AI upload endpoint lacks file type validator in controller.

Crash scenarios: huge chat content bloats DB and prompt building; long file names create expensive logs/keys; invalid UUIDs generate noisy Prisma errors; prompt payload exceeds provider limits; malformed DTOs pass as transformed values.

Production fixes: add DTO files instead of inline classes; use `@IsUUID`, `@MaxLength`, `@IsEnum`, `@IsMimeType` or custom validators; disable broad implicit conversion for high-risk fields or use explicit `@Type`; reject unknown provider labels.

Exact improvements: `SendMessageDto.content @MaxLength(4000)`; `StreamMessageDto.assistantMessageId @IsUUID()`; `chatId` param pipe with default-chat exception; `PresignedUrlDto.fileName @MaxLength(180)`; `PredictionHistoryDto.prediction @IsEnum(PredictionLabel)`.

Enterprise pattern: strict DTO contracts, schema reuse across frontend/backend, explicit limits aligned with DB/provider budgets.

Add: validation, guards, request size limits, tests.

### 9. Environment configuration is split and not validated as one contract

Files: `backend/src/config/validate-env.ts`, `backend/src/config/env.ts`, `backend/src/config/config.service.ts`, `backend/src/uploads/uploads.config.ts`, `backend/src/main.ts`.

Why dangerous: there are multiple env loaders (`validate-env.ts`, `env.ts`, direct `process.env` in upload config, direct Sentry/env reads in main). Optional AWS values can later be required by getters and crash at runtime. Upload limits are parsed outside the validated config path.

Crash scenarios: app boots with missing AWS bucket but crashes on first upload; invalid `ML_GATEWAY_MAX_RETRIES` causes bad retry behavior; production runs with dev defaults; different modules disagree on env values.

Production fixes: single config module/schema for all env, validated at bootstrap; no direct `process.env` outside config; fail fast for required features; use feature flags for optional providers; redact config logs.

Exact improvements: move `UPLOAD_IMAGE_*`, Sentry, Gemini, AWS, CORS, rate limits into one Zod schema; remove `backend/src/config/env.ts` if unused; make `ConfigService` the only access path.

Enterprise pattern: typed config contract, fail-fast startup, deployment-time secret validation, environment-specific config maps.

Add: validation, typed config, startup health check.

### 10. Process-level failure handling and graceful shutdown are incomplete

Files: `backend/src/main.ts`, `backend/src/prisma/prisma.service.ts`, `backend/src/common/metrics/*`.

Why dangerous: `enableShutdownHooks` is present, but there are no process-level handlers for `unhandledRejection`/`uncaughtException`, no readiness state flip during shutdown, no HTTP server drain timeout, and no explicit Prisma query metrics. Long SSE and uploads can still be active when a pod/container receives SIGTERM.

Crash scenarios: a missed promise rejection terminates Node depending on runtime flags; deploy kills active streams mid-write; Kubernetes keeps routing traffic during shutdown; Prisma disconnects while requests are still executing.

Production fixes: add graceful shutdown coordinator; set readiness false on SIGTERM; stop accepting new requests; wait bounded time for active requests/streams; then close Prisma and exit; capture fatal errors to Sentry before exit.

Exact improvements: create `ShutdownService` tracking active requests and streams; add `process.on('unhandledRejection')` and `process.on('uncaughtException')` with redacted logging and controlled exit; expose `/health/ready` based on shutdown state.

Enterprise pattern: readiness/liveness split, connection draining, fatal error telemetry, bounded shutdown budget.

Add: cleanup handlers, metrics, readiness guard, process-level fallback logic.

## Top 5 Critical Fixes To Implement Immediately

1. Remove raw request/response/env logging from `main.ts` and enforce redacted structured logging. This is the fastest high-impact fix because it prevents secret leaks, log-amplified outages, and event-loop pressure.

2. Move AI prediction to an async job flow using presigned S3 uploads and queue workers. The current request path holds large file buffers while doing S3, Cataract Model, and Prisma work.

3. Add hard SSE budgets: `AbortSignal.timeout`, heartbeat, backpressure-aware `res.write`, per-user stream caps, and Redis-backed duplicate-stream locks for multi-instance production.

4. Add idempotency and transaction boundaries for chat, upload, and prediction writes. Backend should consume frontend idempotency keys and make retries safe.

5. Consolidate env validation into one typed config contract and remove direct `process.env` reads. Missing AWS/Gemini/Cataract Model config should fail at startup or disable the feature intentionally, not crash on first use.

## Recommended New Files

- `backend/src/common/logging/redact.util.ts`: shared redaction for tokens, cookies, passwords, API keys, and oversized fields.
- `backend/src/common/interceptors/safe-logging.interceptor.ts`: structured request logging with latency and request ID only.
- `backend/src/common/shutdown/shutdown.service.ts`: active request/stream tracking and readiness state.
- `backend/src/ai/jobs/process-prediction.processor.ts`: queue worker for Cataract Model inference.
- `backend/src/ai/dto/create-prediction-job.dto.ts`: `{ uploadId, idempotencyKey }`.
- `backend/src/uploads/dto/complete-upload.dto.ts`: S3 completion verification payload.
- `backend/src/chat/dto/*.dto.ts`: extracted, bounded chat DTOs.

## Current Dangerous Patterns To Avoid

- Avoid logging raw `req.body`, headers, response bodies, provider payloads, tokens, and full env objects.
- Avoid buffering large files in API memory when direct-to-S3 is already available.
- Avoid doing external provider calls and multi-table persistence in the same user-facing request.
- Avoid retry loops that cannot be cancelled after client disconnect.
- Avoid trusting client MIME type or DB upload rows that were never verified in S3.
- Avoid in-memory duplicate stream locks as the only protection when running multiple backend instances.
- Avoid broad `any` response handling for AI providers; validate provider contracts at the edge.
