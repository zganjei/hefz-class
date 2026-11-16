#!/usr/bin/env bash
set -euo pipefail
SOURCE_URL="https://d2ol7oe51mr4n9.cloudfront.net/user_3HmatHWfJX4eivRE228JtuTRjuu/33927fd3-a6c4-4916-9b63-04ac7ac03950.zip"
curl -fL "$SOURCE_URL" -o /tmp/hefz-class-source.zip
rm -rf /tmp/hefz-source-extract app
mkdir -p /tmp/hefz-source-extract
unzip -q /tmp/hefz-class-source.zip -d /tmp/hefz-source-extract
if [ -d /tmp/hefz-source-extract/app ]; then
  mv /tmp/hefz-source-extract/app app
else
  mv /tmp/hefz-source-extract app
fi
cd app
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
cd ..
mkdir -p .vercel
rm -rf .vercel/output
cp -a app/.vercel/output .vercel/output
