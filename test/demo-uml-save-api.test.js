"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = process.cwd();

function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = address && typeof address === "object" ? address.port : 0;
			server.close(() => resolve(port));
		});
	});
}

function waitForServer(child) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("Timed out waiting for server startup")), 3000);

		child.stdout.on("data", data => {
			const text = data.toString();
			if (/Serving on http:\/\/localhost:/i.test(text)) {
				clearTimeout(timeout);
				resolve();
			}
		});
		child.stderr.on("data", data => {
			const text = data.toString();
			if (/EADDRINUSE|Error/i.test(text)) {
				clearTimeout(timeout);
				reject(new Error(text.trim()));
			}
		});
		child.on("exit", code => {
			clearTimeout(timeout);
			reject(new Error(`Server exited before startup with code ${code}`));
		});
	});
}

function request(port, options) {
	return new Promise((resolve, reject) => {
		const body = options && options.body ? JSON.stringify(options.body) : "";
		const req = http.request({
			host: "127.0.0.1",
			port,
			method: options.method || "GET",
			path: options.path,
			timeout: 3000,
			headers: body ? {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(body),
			} : undefined,
		}, res => {
			let responseBody = "";
			res.setEncoding("utf8");
			res.on("data", chunk => {
				responseBody += chunk;
			});
			res.on("end", () => {
				resolve({ statusCode: res.statusCode, body: responseBody });
			});
		});
		req.on("timeout", () => {
			req.destroy(new Error("Request timed out"));
		});
		req.on("error", reject);
		if (body) req.write(body);
		req.end();
	});
}

async function main() {
	const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-demo-uml-save-"));
	const demoDir = path.join(fixtureRoot, "data", "demo");
	fs.mkdirSync(demoDir, { recursive: true });
	fs.writeFileSync(path.join(fixtureRoot, "index.html"), "<!doctype html><title>Index</title>");
	fs.writeFileSync(path.join(fixtureRoot, "demo.html"), "<!doctype html><title>Demo</title>");

	const zhPath = path.join(demoDir, "sequence--1_zh.ctu");
	const enPath = path.join(demoDir, "sequence--1_en.ctu");
	fs.writeFileSync(zhPath, `Title: 测试
Describe: 保存测试
------------------------------------------------------------
[Example]
第一组

[Description]
First description

[UML]
@startuml
Alice -> Bob: first source
@enduml

[Detail]
First detail

------------------------------------------------------------
[Example]
第二组

[Description]
Second description

[UML]
@startuml
Alice -> Bob: second source
@enduml

[Detail]
Second detail
`);
	fs.writeFileSync(enPath, `Title: Test
Describe: Save test
------------------------------------------------------------
[Example]
First group

[Description]
English description

[UML]
@startuml
Alice -> Bob: english source
@enduml

[Detail]
English detail
`);
	fs.writeFileSync(path.join(demoDir, "note.txt"), "not ctu");

	const port = await getFreePort();
	const child = spawn(process.execPath, [path.join(repoRoot, "serve.js"), String(port)], {
		cwd: fixtureRoot,
		stdio: ["ignore", "pipe", "pipe"],
	});

	try {
		await waitForServer(child);

		const examplesResponse = await request(port, { path: "/api/demo-examples?lang=en&dir=demo" });
		assert.equal(examplesResponse.statusCode, 200, examplesResponse.body);
		const examplesPayload = JSON.parse(examplesResponse.body);
		assert.equal(examplesPayload.sequence[0].source.includes("english source"), true);
		assert.deepEqual(examplesPayload.sequence[0].saveTarget, {
			dir: "demo",
			file: "sequence--1_en.ctu",
			lang: "en",
			groupIndex: 0
		});

		const saveResponse = await request(port, {
			method: "POST",
			path: "/api/demo-uml",
			body: {
				dir: "demo",
				file: "sequence--1_zh.ctu",
				groupIndex: 1,
				source: "@startuml\nAlice -> Bob: saved source\n@enduml"
			},
		});
		assert.equal(saveResponse.statusCode, 200, saveResponse.body);
		assert.deepEqual(JSON.parse(saveResponse.body), {
			path: "data/demo/sequence--1_zh.ctu",
			groupIndex: 1
		});

		const saved = fs.readFileSync(zhPath, "utf8");
		assert.match(saved, /Alice -> Bob: first source/, "save should not modify the first group");
		assert.match(saved, /Alice -> Bob: saved source/, "save should update the selected group");
		assert.doesNotMatch(saved, /Alice -> Bob: second source/, "old selected-group UML should be replaced");
		assert.match(saved, /\[Detail\]\nSecond detail/, "save should preserve following sections");

		const traversalResponse = await request(port, {
			method: "POST",
			path: "/api/demo-uml",
			body: {
				dir: "demo",
				file: "../_TEMPLATE.ctu",
				groupIndex: 0,
				source: "@startuml\n@enduml"
			},
		});
		assert.equal(traversalResponse.statusCode, 400, traversalResponse.body);

		const wrongTypeResponse = await request(port, {
			method: "POST",
			path: "/api/demo-uml",
			body: {
				dir: "demo",
				file: "note.txt",
				groupIndex: 0,
				source: "@startuml\n@enduml"
			},
		});
		assert.equal(wrongTypeResponse.statusCode, 400, wrongTypeResponse.body);

		const missingFileResponse = await request(port, {
			method: "POST",
			path: "/api/demo-uml",
			body: {
				dir: "demo",
				file: "missing--1_zh.ctu",
				groupIndex: 0,
				source: "@startuml\n@enduml"
			},
		});
		assert.equal(missingFileResponse.statusCode, 404, missingFileResponse.body);

		const missingGroupResponse = await request(port, {
			method: "POST",
			path: "/api/demo-uml",
			body: {
				dir: "demo",
				file: "sequence--1_zh.ctu",
				groupIndex: 99,
				source: "@startuml\n@enduml"
			},
		});
		assert.equal(missingGroupResponse.statusCode, 404, missingGroupResponse.body);
	} finally {
		child.kill();
		try {
			fs.rmSync(fixtureRoot, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors on Windows
		}
	}
}

main().catch(err => {
	console.error(err);
	process.exitCode = 1;
});
