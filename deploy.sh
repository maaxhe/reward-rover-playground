#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="max@91.99.236.172"
REMOTE_PATH="~/reward-rover"
REMOTE_SSH_KEY="${REMOTE_SSH_KEY:-${HOME}/.ssh/biasnavigator_server}"

cd "$ROOT_DIR"

# There has been more than one checkout of this repo. Never deploy a state that lacks commits
# already on origin/main, or that origin/main does not have yet: the live site must match the repo.
echo "Checking against origin/main..."
git fetch --quiet origin
if [ -n "$(git status --porcelain)" ]; then
  echo "Abbruch: Es gibt nicht committete Änderungen." >&2; exit 1
fi
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Abbruch: HEAD ist nicht origin/main (erst pullen bzw. pushen)." >&2
  git status -sb | head -1 >&2
  exit 1
fi

echo "Building frontend..."
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
