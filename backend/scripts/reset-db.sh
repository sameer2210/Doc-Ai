#!/bin/bash
set -e

echo "🔄 Resetting DB..."
npx prisma migrate reset --force --skip-generate --schema prisma/schema.prisma
npx prisma generate
npx ts-node prisma/seed.ts
