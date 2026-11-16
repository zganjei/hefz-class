#!/usr/bin/env bash
set -euo pipefail
cd app
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
cd ..
mkdir -p .vercel
rm -rf .vercel/output
cp -a app/.vercel/output .vercel/output
