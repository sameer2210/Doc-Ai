#!/bin/bash
set -e

export NODE_ENV=test
echo "🌱 Seeding test DB..."
npx ts-node prisma/seed.ts