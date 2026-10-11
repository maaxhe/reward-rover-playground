#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="max@91.99.236.172"
REMOTE_PATH="~/reward-rover"
REMOTE_SSH_KEY="${REMOTE_SSH_KEY:-${HOME}/.ssh/biasnavigator_server}"

echo "Building frontend..."
cd "$ROOT_DIR"
npm run build

echo "Syncing frontend build into server/public..."
rm -rf "$ROOT_DIR/server/public"
mkdir -p "$ROOT_DIR/server/public"
cp -R "$ROOT_DIR/dist/." "$ROOT_DIR/server/public/"

echo "Uploading server directory to $REMOTE_HOST..."
rsync -avz \
  -e "ssh -i ${REMOTE_SSH_KEY} -o StrictHostKeyChecking=no" \
  --exclude "node_modules" \
  --exclude "data" \
  --exclude ".env" \
  "$ROOT_DIR/server/" \
  "$REMOTE_HOST:$REMOTE_PATH"

echo "Restarting server..."
ssh -i "${REMOTE_SSH_KEY}" -o StrictHostKeyChecking=no "$REMOTE_HOST" "pm2 restart reward-rover-server"

echo "Deploy complete."
