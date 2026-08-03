# Stage 1: Build & Prune Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests, configuration, and Prisma schema
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma

# Install all dependencies including devDependencies for compilation (runs postinstall: prisma generate)
RUN npm ci

# Copy application source code and compile NestJS bundle
COPY src ./src
RUN npm run build

# Remove development dependencies for lean production deployment
RUN npm prune --production

# Stage 2: Production Execution Environment
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

LABEL org.opencontainers.image.title="spandavidya-backend" \
      org.opencontainers.image.description="SpandaVidya AI NestJS API Gateway" \
      org.opencontainers.image.vendor="SpandaVidya AI"

# Install bash for entrypoint script compatibility
RUN apk add --no-cache bash

# Copy production node_modules, compiled dist, Prisma assets, and scripts with correct ownership
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node scripts ./scripts

RUN chmod +x /app/scripts/docker-entrypoint.sh

USER node

EXPOSE 8080

STOPSIGNAL SIGTERM

# Container Liveness Probe via NestJS Terminus /v1/health/live
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:8080/v1/health/live || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

