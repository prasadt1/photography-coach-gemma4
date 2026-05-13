#!/usr/bin/env bash
# dev-electron.sh — start the desktop app with HMR (renderer reloads on save)
set -e

PORT=5173

echo "▸ Compiling Electron main process..."
npx tsc -p tsconfig.electron.json
echo "  ✓ Electron compiled"

echo "▸ Starting Vite dev server on :$PORT..."
# Redirect stdin from /dev/null so Vite's interactive mode doesn't steal keypresses
npx vite --port $PORT < /dev/null &
VITE_PID=$!

# Wait until Vite is accepting connections (up to 15s)
echo "▸ Waiting for Vite to be ready..."
TRIES=0
until curl -sf "http://localhost:$PORT" > /dev/null 2>&1; do
  sleep 0.5
  TRIES=$((TRIES+1))
  if [ $TRIES -gt 30 ]; then
    echo "✗ Vite didn't start in time. Check for port conflicts on :$PORT"
    kill $VITE_PID 2>/dev/null || true
    exit 1
  fi
done
echo "  ✓ Vite ready at http://localhost:$PORT"

echo "▸ Launching Electron... (close the window or Ctrl+C here to stop)"
VITE_DEV_SERVER_URL="http://localhost:$PORT" \
  env -u ELECTRON_RUN_AS_NODE \
  ./node_modules/.bin/electron .

# Clean up Vite when Electron exits
echo "▸ Electron closed — stopping Vite"
kill $VITE_PID 2>/dev/null || true
