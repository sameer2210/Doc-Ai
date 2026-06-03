# spandavidya Backend

Production-ready NestJS boilerplate with authentication, RBAC, auditing, structured logging, metrics, and observability.

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

## 🛠 Tech Stack

- **Framework**: NestJS
- **ORM**: Prisma
- **DB**: PostgreSQL
- **Monitoring**: Prometheus + Sentry
- **Security**: Helmet, CORS, Rate-Limit, HPP
- **Testing**: Jest + Supertest

---

## 📦 Deployment

Use Docker Compose or adapt to your preferred platform. Sentry and Prometheus require credentials and/or dashboards.

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
- S3 uploads

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

**Core Responsibilities:**

- Secure gateway (Authentication & Authorization)
- Chat history persistence
- File upload coordination (S3)
- Rate limiting & cost control
- Streaming LLM responses (SSE)

---

## Scalable Folder Structure

Adopt a **Feature-Module** approach (Domain-Driven Design principles) rather than technical grouping. This ensures maximum scalability and maintainability.

## env example

```
NODE_ENV=development
PORT=8080

# Database
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spandavidya
DATABASE_URL="postgresql://postgres:@db.wuaza.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:@db..supabase.co:5432/postgres"


# JWT Configuration
JWT_SECRET=jwt_secre
JWT_EXPIRES_IN=60m
JWT_REFRESH_SECRET=jwt_refresh_sec
JWT_REFRESH_EXPIRES_IN=7d

# Postgres Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=spandavidya

# ML Gateway (Hugging Face Cataract Detection)
HUGGINGFACE_API_URL=https://sameer2210-cataractaiml.hf.space/predict
ML_GATEWAY_TIMEOUT_MS=60000
ML_GATEWAY_MAX_RETRIES=0

# Google Gemini AI (for Chat module — Ayurvedic consultation streaming)
GOOGLE_API_KEY=A
GOOGLE_GEMINI_MODEL=gemini-2.5-flash

AWS_ACCESS_KEY_ID=AKIAS
AWS_SECRET_ACCESS_KEY=jXjhPpTO
AWS_REGION=ap-so
AWS_S3_BUCKET_NAME=sameer

# Google OAuth
GOOGLE_WEB_CLIENT_ID=6132179582
GOOGLE_ANDROID_CLIENT_ID=613217958226-.com
GOOGLE_IOS_CLIENT_ID=613217googleusercontent.com
```

## Authentication Architecture (Google Auth)

We will use **JWT with a Refresh Token Rotation strategy** to provide both security and seamless UX on mobile. Use latest stable versions and modern industry standards only.

**Flow:**Authentication Architecture
Frontend (React Native)
↓
Google Native Sign-In
↓
Google ID Token
↓
NestJS Backend Verification
↓
Create session
↓
JWT Access + Refresh Tokens
↓
Secure Storage + Zustand Session
↓
Authenticated API Requests

# Authentication Types

Mobile auth and web auth are isolated.

1. Mobile Native Google Authentication Used for: Android & iOS
   Library: @react-native-google-signin/google-signin
   This is the PRIMARY auth flow.

2. Web Authentication
   Separate web flow exists for: Expo web and browser environments

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

```
# Database
npm install @prisma/client
npm install -D prisma

npm run prisma:restart
in backend
npx prisma db push --force-reset
npx prisma generate
npx prisma studio

# AWS S3 & Logging
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

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

## image upload flow

User
↓
Select Eye Image
( JPG / PNG / WEBP, Max 5 MB )
↓
Frontend Validation
( File Exists, MIME Type Check, Size Check )
↓
Uploading...
( FormData Create + API Request )
↓
POST /ai/predict
( multipart/form-data )
↓
NestJS AiController
( Receives Image )
↓
Backend Validation
( Multer + Security Validation + Size Validation )
↓
AWS S3 Upload
( Generate Unique Key + Store Image Securely )
↓
AI Analysis
( Send Image To HuggingFace Cataract Model )
↓
Retry If Needed
( Timeout 15s + Retry On Temporary Failure )
↓
Prediction Generated
( Cataract / Normal + Confidence Score )
↓
Database Save
( AiPrediction Table + Upload Record )
↓
Chat Save
( Assistant Message + Chat History Update )
↓
Analysis Complete
( API Response Returned )
↓
Result Display
( Prediction + Confidence + Summary + Recommendation )
────────────────────────────────────

Failure Flow

Image > 5 MB
↓
Frontend Validation Fail
↓
"Image size must be less than 5 MB"

────────────────────────────────────

Invalid File Type
↓
Frontend Validation Fail
↓
"Only JPG, PNG, WEBP allowed"

────────────────────────────────────

Backend Validation Fail
↓
400 / 413 Response
↓
Request Rejected

────────────────────────────────────

S3 Upload Fail
↓
500 Error
↓
"Unable to upload image"

────────────────────────────────────

AI Service Timeout
↓
Retry
↓
Retry
↓
Retry
↓
503 Response
↓
"AI service temporarily unavailable"

# Cataract AI ML Service----------------------------------------------------------------------

## Overview

Cataract AI ML Service is a FastAPI-based machine learning inference microservice used by the SpandhVidhya healthcare platform.

The service receives an eye image, performs preprocessing, runs inference using an EfficientNet-B3 model, and returns cataract-related predictions.

This service is deployed independently on Hugging Face Spaces and is consumed by the main NestJS backend.

---

# Production URL

Base URL:https://sameer2210-cataractaiml.hf.space

Swagger Documentation:https://sameer2210-cataractaiml.hf.space/docs

---

# Purpose

This service exists only for ML inference.

Responsibilities:

- Receive eye image
- Preprocess image
- Run EfficientNet-B3 model
- Generate prediction
- Return confidence score

Non-responsibilities:

- Authentication
- Authorization
- User management
- Patient management
- Database persistence
- Business logic
- Medical record storage

These responsibilities belong to the NestJS backend.

---

# Architecture

React Native App
↓
NestJS Backend
↓
ML Gateway Service
↓
Hugging Face ML API
↓
EfficientNet-B3 Model
↓
Prediction Response

---

# Model Information

Model Type: EfficientNet-B3
Framework: pyTorch
Deployment: FastAPI + Docker + Hugging Face Spaces
Inference Device: CPU
Model File: weights/best_efficientnet_b3_cataract.pth

---

# Prediction Classes

Current model predicts one of the following classes: Total Detection Classes:4

1. No Cataract = Normal
2. Early Cataract = Immature
3. Advanced Cataract = Mature
4. Artificial Lens Detected (Post Cataract Surgery) = IOL_Inserted

Important:

The exact class mapping must match the class_to_idx mapping used during training.
Any future retraining must preserve class ordering or update inference code accordingly.

---

# API Endpoints

## Health Endpoint

GET /
Response:

{
"message": "Cataract AI Running"
}

Purpose:
Used for health checks and deployment verification.

---

## Prediction Endpoint

POST /predict
Content-Type: multipart/form-data
Field: file

Example Request:
file=<image>

Example Response:
{
"prediction": "IOL_Inserted",
"confidence": 0.92
}

Response Fields:
prediction:
Predicted class label.

confidence:
Probability score returned by the model.

Range:
0.0 to 1.0

Prediction Output:

- Predicted Eye Condition
- AI Confidence Score

Confidence Score Meaning:
The confidence score represents how strongly the AI model believes the uploaded image matches a predicted eye condition.

Example:
54% confidence means the model found moderate similarity with the predicted class.

Medical Note:
This AI system is designed for screening assistance and educational support only. Final diagnosis and treatment decisions should always be confirmed by a qualified ophthalmologist.

---

# Input Requirements

Accepted Formats:

- JPG
- JPEG
- PNG

Recommended:

- High-resolution eye image
- Proper lighting
- Eye centered in frame
- Minimal blur

Maximum Image Size:

Determined by FastAPI upload limits.

---

1. Lens Detection

2. Contrast Enhancement

Ye medical imaging me commonly use hota.

Model Workflow:
Eye Image
→ Lens Detection - Hough Circle Detection -use ho raha eye lens isolate karne ke liye.
→ Image Enhancement - CLAHE preprocessing - use ho raha visibility improve karne ke liye.
→ AI Analysis
→ Cataract Classification
→ Confidence Scoring

# Inference Pipeline

Step 1 Receive uploaded image.
Step 2 Load image using Pillow.
Step 3 Convert image to RGB.
Step 4 Resize image to model input size.
Step 5 Apply torchvision transforms.
Step 6 Generate tensor.
Step 7 Run EfficientNet-B3 inference.
Step 8 Apply Softmax.
Step 9 Extract highest probability class.
Step 10 Return JSON response.

---

# Output Schema

{
"prediction": "string",
"confidence": "float"
}

Example:

{
"prediction": "Immature",
"confidence": 0.87
}

---

# Current Limitations

1. CPU Inference

Inference runs on CPU.

No GPU acceleration currently.

---

2. No Authentication

API is publicly accessible.

Must be protected through backend gateway.

---

3. No Rate Limiting

Requests are not rate limited.

Production backend should enforce limits.

---

4. No Prediction Storage

Predictions are not saved.

Persistence must be handled by NestJS.

---

5. No Patient Context

Model only receives image input.

No patient metadata is used.

---

6. No Explainability

Grad-CAM or heatmap visualization is not implemented.

---

# Integration Contract

This service should never be called directly from React Native.

Correct Architecture:

React Native
↓
NestJS Backend
↓
ML Gateway Service
↓
This API

Reason:

- Security
- Retry handling
- Logging
- Auditing
- Persistence
- Future provider switching

---

# Environment

Python: 3.11

Core Dependencies:

- FastAPI
- Uvicorn
- Torch
- TorchVision
- Pillow
- NumPy

---

# Folder Structure

cataract-ai/

app/
├── main.py
├── predictor.py
└── preprocessing.py

weights/
└── best_efficientnet_b3_cataract.pth

requirements.txt
Dockerfile
README.md

---

# Deployment

Platform:Hugging Face Spaces
Deployment Type: Docker Space
Container Port: 7860
Server: Uvicorn
Startup Command: python -m uvicorn app.main:app --host 0.0.0.0 --port 7860

---

# Future Improvements

Planned Enhancements:

- CLAHE preprocessing
- Hough Circle Detection
- Lens masking
- Grad-CAM visualization
- GPU inference
- Model versioning
- Prediction auditing
- Monitoring
- Rate limiting
- Authentication
- Multi-model support

---

# Important Note For Future AI Agents

This repository is only an ML inference microservice.

Business logic, user management, patient records, authentication, authorization, and prediction storage are handled by the SpandhVidhya NestJS backend.

Do not implement business workflows inside this repository.

This repository must remain stateless and focused solely on ML inference.
