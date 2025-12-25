#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "  Ultimate MP3/MP4 Editor - Clean Restart"
echo "═══════════════════════════════════════════════════════"
echo ""

# Step 1: Kill existing processes
echo "Step 1: Stopping all running processes..."
pkill -9 -f "electron" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
sleep 2
echo "✓ Processes stopped"
echo ""

# Step 2: Rebuild main process
echo "Step 2: Rebuilding Electron main process..."
npm run build:main
if [ $? -eq 0 ]; then
    echo "✓ Main process compiled successfully"
else
    echo "✗ Failed to compile main process"
    exit 1
fi
echo ""

# Step 3: Verify files exist
echo "Step 3: Verifying compiled files..."
if [ -f "dist/main/main.js" ]; then
    echo "✓ main.js exists ($(stat -f%z dist/main/main.js 2>/dev/null || stat -c%s dist/main/main.js) bytes)"
else
    echo "✗ main.js missing"
    exit 1
fi

if [ -f "dist/main/preload.js" ]; then
    echo "✓ preload.js exists ($(stat -f%z dist/main/preload.js 2>/dev/null || stat -c%s dist/main/preload.js) bytes)"
else
    echo "✗ preload.js missing"
    exit 1
fi
echo ""

# Step 4: Run verification
echo "Step 4: Running verification..."
node check-preload.js
echo ""

# Step 5: Start dev mode
echo "═══════════════════════════════════════════════════════"
echo "  Starting application in development mode..."
echo "═══════════════════════════════════════════════════════"
echo ""
echo "When the app opens:"
echo "  1. Press Ctrl+Shift+I to open DevTools"
echo "  2. Look in Console for: '[OK] Electron API is available'"
echo "  3. Try clicking 'Add Files' button"
echo ""
echo "Starting in 3 seconds..."
sleep 3

npm run dev
