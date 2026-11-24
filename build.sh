#!/usr/bin/env bash
set -euo pipefail
cd app
npm install --legacy-peer-deps --no-audit --no-fund
# migrations run only for production builds (never for preview branches)
if [ "${VERCEL_ENV:-}" = "production" ] && [ -n "${DATABASE_URL:-}" ]; then node scripts/migrate.mjs; fi
npm run build
cd ..
mkdir -p .vercel
rm -rf .vercel/output
cp -a app/.vercel/output .vercel/output
