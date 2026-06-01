#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-5401}"

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
node serve.js "$PORT"
