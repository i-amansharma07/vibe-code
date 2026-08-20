#!/bin/bash
set -e

echo "⏳ Waiting for Piston API on port 2000..."
until curl -s -f http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Piston is online!"

echo ""
echo "📦 Installing Python (3.10.0)..."
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "version": "3.10.0"}'

echo ""
echo "📦 Installing Node.js / JavaScript (18.15.0)..."
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language": "node", "version": "18.15.0"}'

echo ""
echo "-----------------------------------"
echo "🔍 Checking installed runtimes:"
curl http://localhost:2000/api/v2/runtimes
echo ""
