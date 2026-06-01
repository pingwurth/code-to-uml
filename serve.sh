#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-5401}"
MODE="${2:---bg}" # --bg (default) | --fg
LOG_FILE="${TMPDIR:-/tmp}/code-to-uml-serve-${PORT}.log"
PID_FILE="${TMPDIR:-/tmp}/code-to-uml-serve-${PORT}.pid"

find_port_pids() {
	if command -v lsof >/dev/null 2>&1; then
		lsof -ti tcp:"$PORT" || true
		return
	fi
	if command -v fuser >/dev/null 2>&1; then
		fuser "${PORT}/tcp" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' || true
		return
	fi
}

kill_port_processes() {
	local PIDS
	PIDS="$(find_port_pids | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
	if [ -n "$PIDS" ]; then
		echo "Port ${PORT} is occupied by PID(s): ${PIDS}. Stopping them..."
		kill $PIDS 2>/dev/null || true
		sleep 1
	fi

	PIDS="$(find_port_pids | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
	if [ -n "$PIDS" ]; then
		echo "Port ${PORT} is still occupied by PID(s): ${PIDS}. Force stopping them..."
		kill -9 $PIDS 2>/dev/null || true
	fi
}

kill_port_processes

if [ "$MODE" = "--fg" ]; then
	echo "Starting in foreground on http://localhost:${PORT}"
	exec node serve.js "$PORT"
fi

echo "Starting in background on http://localhost:${PORT}"
echo "Log: ${LOG_FILE}"
setsid bash -lc "node serve.js '$PORT' >> '$LOG_FILE' 2>&1" </dev/null >/dev/null 2>&1 &
sleep 1
NODE_PID="$(find_port_pids | head -n 1 || true)"
if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
	echo "$NODE_PID" > "$PID_FILE"
	echo "Started. PID=${NODE_PID} (pid file: ${PID_FILE})"
else
	echo "Failed to start. Check log: ${LOG_FILE}" >&2
	exit 1
fi
