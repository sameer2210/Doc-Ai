#!/bin/bash
set -e

echo "ENTRYPOINT DEBUG - PORT: $PORT"

echo " Waiting for database to be ready..."
/app/wait-for-it.sh db:5432 --timeout=30 --strict -- echo "✅ DB is up"

echo " Running migrations..."
npx prisma migrate deploy

echo " Running seed script..."
node dist/prisma/seed.js

echo " Starting the app..."
exec node dist/src/main.js --port $PORT
