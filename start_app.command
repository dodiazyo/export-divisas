#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

# Start the app in a new terminal window to keep it running
echo "Starting Divisas App..."
echo "Please wait while the server starts..."

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (first run only)..."
    npm install
fi

# Start the server and open browser
# We use & to run in background, wait a bit, then open URL
npm run dev &
PID=$!

# Wait for server to be ready (approximate)
sleep 3
open "http://localhost:5173"

echo "App is running! Do not close this window."
echo "Press Ctrl+C to stop."

# Keep script running
wait $PID
