#!/bin/bash
# Kill any existing processes
pkill -f "electron ." 2>/dev/null
pkill -f "vite" 2>/dev/null

# Build main process
echo "Building main process..."
npm run build:main

# Start in dev mode
echo "Starting development mode..."
npm run dev
