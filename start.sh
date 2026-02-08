#!/bin/bash

# Start script for AI4ECPP application

echo "🚀 Starting AI4ECPP Application..."
echo ""

# Check if .env file exists in server directory
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env file not found!"
    echo "Please create server/.env file with your OpenAI API key."
    echo "You can copy server/.env.example to server/.env and edit it."
    echo ""
fi

# Start backend server in background
echo "📡 Starting backend server..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend..."
npm run dev

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT

