#!/usr/bin/env bash
# Run our dev server + Vite against an isolated workspace for parity checks.
# Server: 127.0.0.1:${PORT:-31530}; web: http://localhost:${WEB_PORT:-31531}
# Data:   .cache/dev-ws (gitignored). Stop with: kill $(cat .cache/dev.pids)
set -euo pipefail
cd "$(dirname "$0")/../.."

PORT="${PORT:-31530}"
WEB_PORT="${WEB_PORT:-31531}"
WS="$(pwd)/.cache/dev-ws"
mkdir -p "$WS" .cache

if [ "${BUILD:-1}" = "1" ]; then
	go build -o bin/mediago-server.exe ./services/server/cmd/mediago-server
	go build -o bin/mediago-document-mcp.exe ./services/server/cmd/mediago-document-mcp
	go build -o bin/mediago-generation-mcp.exe ./services/server/cmd/mediago-generation-mcp
fi

# Config workspace_dir wins over env, so point a copied config at the isolated dir.
WS_WIN="$(cygpath -m "$WS" 2>/dev/null || echo "$WS")"
sed -E "s|^workspace_dir:.*|workspace_dir: \"$WS_WIN\"|" services/server/configs/server.yaml >.cache/dev-server.yaml
cp services/server/configs/pricing.overlay.json .cache/
# Vendored Codex ACP agent. The shared %USERPROFILE%/.codex belongs to the newer
# Codex desktop app; the pinned codex 0.144 cannot initialize its sqlite state,
# so the dev server gets its own Codex home (log in once from 设置 → Codex 接入).
ROOT_WIN="$(cygpath -m "$(pwd)" 2>/dev/null || pwd)"
export MEDIAGO_AGENT_BIN_DIR="$ROOT_WIN/bin/agents"
export CODEX_HOME="$ROOT_WIN/.cache/codex-home"
mkdir -p .cache/codex-home

MEDIAGO_SERVER_PORT="$PORT" ./bin/mediago-server.exe --config .cache/dev-server.yaml >.cache/dev-server.log 2>&1 &
echo $! >.cache/dev.pids

COREPACK_ENABLE_PROJECT_SPEC=1 VITE_API_PROXY_TARGET="http://127.0.0.1:$PORT" \
	corepack pnpm@11.9.0 -C apps/workspace exec vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort \
	>.cache/dev-web.log 2>&1 &
echo $! >>.cache/dev.pids
echo "server :$PORT  web http://127.0.0.1:$WEB_PORT  workspace $WS"
