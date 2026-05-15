#!/bin/bash
set -e

export NODE_ENV=development
echo "🌱 Seeding development DB..."
npx ts-node prisma/seed.ts
