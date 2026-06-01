"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const serveSh = fs.readFileSync("serve.sh", "utf8");
const serveBat = fs.readFileSync("serve.bat", "utf8");

assert.match(serveSh, /PORT="\$\{1:-5401\}"/, "serve.sh should keep default port 5401");
assert.match(serveSh, /lsof -ti tcp:"\$PORT"|fuser "\$\{PORT\}\/tcp"/, "serve.sh should find the process occupying the port");
assert.match(serveSh, /kill -9 \$PIDS/, "serve.sh should force-kill stubborn port occupants");
assert.match(serveSh, /node serve\.js "\$PORT"/, "serve.sh should start serve.js after cleanup");

assert.match(serveBat, /if "%PORT%"=="" set "PORT=5401"/, "serve.bat should keep default port 5401");
assert.match(serveBat, /netstat -ano -p tcp/i, "serve.bat should inspect TCP listeners");
assert.match(serveBat, /taskkill \/F \/PID/i, "serve.bat should kill the process occupying the port");
assert.match(serveBat, /node serve\.js %PORT%/, "serve.bat should start serve.js after cleanup");
