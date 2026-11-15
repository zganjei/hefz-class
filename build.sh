#!/usr/bin/env bash
set -euo pipefail
SOURCE_URL="https://d2ol7oe51mr4n9.cloudfront.net/user_3HmatHWfJX4eivRE228JtuTRjuu/66585658-2e1f-4668-ab62-22832780fc0f.zip"
curl -fL "$SOURCE_URL" -o /tmp/hefz-class-source.zip
mkdir -p app
unzip -q /tmp/hefz-class-source.zip -d app
cd app
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
cd ..
mkdir -p .vercel
rm -rf .vercel/output
cp -a app/.vercel/output .vercel/output
