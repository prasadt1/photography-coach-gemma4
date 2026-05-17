#!/usr/bin/env bash
# Trusted HTTPS certs for iPhone Safari (in-app camera). Run once per machine/IP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.cert"
IP="${1:-192.168.178.28}"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "Install mkcert first:  brew install mkcert"
  exit 1
fi

mkdir -p "$CERT_DIR"
mkcert -install
mkcert -key-file "$CERT_DIR/dev-key.pem" -cert-file "$CERT_DIR/dev-cert.pem" \
  "$IP" localhost 127.0.0.1 ::1

ROOT_CA="$(mkcert -CAROOT)/rootCA.pem"
echo ""
echo "✓ Certs written to .cert/"
echo ""
echo "=== One-time on iPhone (required — Safari has no Continue for untrusted certs) ==="
echo "1. AirDrop this file to your iPhone:"
echo "   $ROOT_CA"
echo "2. Settings → General → VPN & Device Management → Install profile"
echo "3. Settings → General → About → Certificate Trust Settings"
echo "   → Enable Full Trust for the mkcert root"
echo ""
echo "Then on Mac:"
echo "  OLLAMA_ORIGINS='*' OLLAMA_HOST=0.0.0.0:11434 ollama serve"
echo "  npm run start:https"
echo "On iPhone:   https://${IP}:3000  (or :3001 if port 3000 is busy)"
