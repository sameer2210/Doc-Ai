#!/bin/bash
set -eo pipefail

PORT=${PORT:-8080}
echo "[ENTRYPOINT] SpandaVidya NestJS Backend initializing on port ${PORT}..."

if [ "${RUN_MIGRATIONS_ON_STARTUP}" = "true" ]; then
  echo "[ENTRYPOINT] RUN_MIGRATIONS_ON_STARTUP=true -> Deploying Prisma database migrations..."
  if npx prisma migrate deploy; then
    echo "[ENTRYPOINT] ✅ Database schema migrations applied successfully."
  else
    echo "[ENTRYPOINT] ❌ Prisma migration deployment failed! Aborting container startup." >&2
    exit 1
  fi
fi

if [ "${RUN_SEED_ON_STARTUP}" = "true" ]; then
  echo "[ENTRYPOINT] RUN_SEED_ON_STARTUP=true -> Executing Prisma seed..."
  npx prisma db seed || echo "[ENTRYPOINT] ⚠️ Seeding completed with warnings."
fi

echo "[ENTRYPOINT] Handing process execution to NestJS application bundle (PID 1)..."
exec node dist/src/main.js

