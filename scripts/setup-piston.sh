#!/bin/bash
set -e

echo "⏳ Waiting for Piston to be ready..."
until curl -s http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; do
  sleep 2
done

echo "📦 Installing Python 3.10.0..."
docker exec vibe-code-piston piston ppman install python=3.10.0

echo "📦 Installing Node.js 18.15.0 (javascript)..."
docker exec vibe-code-piston piston ppman install javascript=18.15.0

echo ""
echo "✅ Piston runtimes installed!"
echo "   Run: curl http://localhost:2000/api/v2/runtimes to verify."
