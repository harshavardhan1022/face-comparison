#!/bin/sh
set -e

echo "=== [Face Similarity Frontend Production Startup] ==="

# Auto-prepare database schema based on DATABASE_URL (PostgreSQL vs SQLite)
echo "[1/3] Preparing Prisma Schema for target database..."
node prisma/prepare-db.js

# Retry loop for database readiness (useful for remote DB / container orchestration)
MAX_RETRIES=15
RETRY_COUNT=0
echo "[2/3] Connecting to database and syncing schema..."

until npx prisma db push --skip-generate || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "[Prisma] Waiting for database connection... (Attempt $RETRY_COUNT of $MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "[ERROR] Database connection timed out after $MAX_RETRIES attempts. Exiting."
  exit 1
fi

echo "[Prisma] Schema successfully synchronized."

# Seed initial system accounts (superadmin, admin, demo user)
echo "[3/3] Running database seed checks..."
node prisma/seed.js || echo "[WARN] Seeding skipped or entities already present."

echo "=== [Face Similarity Frontend Ready — Starting Next.js Production Server] ==="
exec "$@"
