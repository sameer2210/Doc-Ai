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

## 🚀 Quickstart

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

- Swagger: [http://localhost:3000/api](http://localhost:3000/api)
- Health - Live: [http://localhost:3000/health/live](http://localhost:3000/health/live)
- Health - Ready: [http://localhost:3000/health/ready](http://localhost:3000/health/ready)
- Metrics: [http://localhost:3000/metrics](http://localhost:3000/metrics)

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
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email": "john@example.com", "password": "StrongP@ss1"}'

# Login
curl -X POST http://localhost:3000/auth/login \
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
