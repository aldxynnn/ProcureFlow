#!/bin/sh

set -eu

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting ProcureFlow API..."

if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
fi

if [ -f "dist/main.js" ]; then
  exec node dist/main.js
fi

echo "ERROR: NestJS entrypoint was not produced by the build."
echo "Contents of dist:"
find dist -maxdepth 3 -type f | sort || true
exit 1
