#!/bin/bash
set -e

echo "
╔══════════════════════════════════════════════╗
║         🌱 GramSathi AI — Quick Start        ║
╚══════════════════════════════════════════════╝
"

# Node check
if ! command -v node &>/dev/null; then echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; fi
NODE_VER=$(node -e "console.log(parseInt(process.version.slice(1)))")
if [ "$NODE_VER" -lt 18 ]; then echo "❌ Node.js 18+ required. Current: $(node --version)"; exit 1; fi
echo "✅ Node.js $(node --version)"

# Backend
echo ""; echo "📦 Setting up backend…"
cd "$(dirname "$0")/backend"
[ ! -d node_modules ] && npm install
[ ! -f .env ] && cp .env.example .env && echo "⚠️  Created .env — optionally add GROQ_API_KEY for AI features"

echo "🚀 Starting backend on :5000…"
npm start &
BACKEND_PID=$!
sleep 4

# Frontend
echo ""; echo "📦 Setting up frontend…"
cd ../frontend
[ ! -d node_modules ] && npm install --legacy-peer-deps

echo "🎨 Starting frontend on :5173…"
npm run dev &
FRONTEND_PID=$!
sleep 3

echo "
╔══════════════════════════════════════════════╗
║         🌱 GramSathi AI is running!          ║
║                                              ║
║  App:    http://localhost:5173               ║
║  API:    http://localhost:5000/api/v1        ║
║  Health: http://localhost:5000/health        ║
║                                              ║
║  Demo Accounts:                              ║
║  Admin:       9000000000 / Admin@123         ║
║  Member:      9111111111 / Member@123        ║
║  Coordinator: 9222222222 / Coord@123         ║
║  Bank Officer:9333333333 / Bank@123          ║
╚══════════════════════════════════════════════╝
Press Ctrl+C to stop.
"

trap "echo ''; echo 'Stopping…'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
