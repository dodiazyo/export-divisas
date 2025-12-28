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

# Start the server and open browser (using Vite's --open flag)
npm run dev -- --open
