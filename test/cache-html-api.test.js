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

		function onData(data) {
			const text = data.toString();
			if (/Serving on http:\/\/localhost:/i.test(text)) {
				clearTimeout(timeout);
				resolve();
			}
		}

		child.stdout.on("data", onData);
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
			let body = "";
			res.setEncoding("utf8");
			res.on("data", chunk => {
				body += chunk;
			});
			res.on("end", () => {
				resolve({ statusCode: res.statusCode, body });
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
	const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-cache-html-"));
	const cacheDir = path.join(fixtureRoot, "cache");
	const dataDir = path.join(fixtureRoot, "data");
	fs.mkdirSync(path.join(cacheDir, "nested"), { recursive: true });
	fs.mkdirSync(path.join(dataDir, "demo"), { recursive: true });
	fs.mkdirSync(path.join(dataDir, "alpha"), { recursive: true });
	fs.mkdirSync(path.join(dataDir, "beta report"), { recursive: true });
	fs.writeFileSync(path.join(fixtureRoot, "index.html"), "<!doctype html><title>Index Root</title>");
	fs.writeFileSync(path.join(fixtureRoot, "demo.html"), "<!doctype html><title>Demo Root</title>");
	fs.writeFileSync(path.join(cacheDir, "alpha.html"), "<!doctype html><title>Alpha</title>");
	fs.writeFileSync(path.join(cacheDir, "_TEMPLATE.html"), "<!doctype html><title>Template</title>");
	fs.writeFileSync(path.join(cacheDir, "nested", "beta report.html"), "<!doctype html><title>Beta</title>");
	fs.writeFileSync(path.join(cacheDir, "notes.txt"), "not html");
	fs.writeFileSync(path.join(dataDir, "_TEMPLATE.ctu"), "template");
	fs.writeFileSync(path.join(dataDir, "demo", "keep.ctu"), "demo");
	fs.writeFileSync(path.join(dataDir, "alpha", "source.ctu"), "alpha");
	fs.writeFileSync(path.join(dataDir, "beta report", "source.ctu"), "beta");

	const port = await getFreePort();
	const child = spawn(process.execPath, [path.join(repoRoot, "serve.js"), String(port)], {
		cwd: fixtureRoot,
		stdio: ["ignore", "pipe", "pipe"],
	});

	try {
		await waitForServer(child);
		const rootResponse = await request(port, { path: "/" });
		assert.equal(rootResponse.statusCode, 200, rootResponse.body);
		assert.match(rootResponse.body, /Index Root/, "root path should serve index.html");
		assert.doesNotMatch(rootResponse.body, /Demo Root/, "root path should not serve demo.html");

		const response = await request(port, { path: "/api/cache-html" });
		assert.equal(response.statusCode, 200, response.body);

		const payload = JSON.parse(response.body);
		assert.deepEqual(
			payload.files.map(file => file.path),
			["cache/alpha.html", "cache/nested/beta report.html"],
			"endpoint should recursively list only HTML files below cache/"
		);
		assert.deepEqual(
			payload.files.map(file => file.href),
			["/cache/alpha.html", "/cache/nested/beta%20report.html"],
			"endpoint should provide browser-safe links for each HTML file"
		);
		assert.equal(payload.files[0].name, "alpha.html");
		assert.equal(payload.files[1].name, "beta report.html");

		const deleteResponse = await request(port, {
			method: "DELETE",
			path: "/api/cache-html",
			body: { path: "cache/alpha.html" },
		});
		assert.equal(deleteResponse.statusCode, 200, deleteResponse.body);
		assert.ok(!fs.existsSync(path.join(cacheDir, "alpha.html")), "delete should remove selected cache HTML file");
		assert.ok(!fs.existsSync(path.join(dataDir, "alpha")), "delete should remove matching data folder");
		assert.ok(fs.existsSync(path.join(cacheDir, "_TEMPLATE.html")), "delete should keep cache template");
		assert.ok(fs.existsSync(path.join(dataDir, "demo")), "delete should keep demo data folder");

		const rejectTemplateResponse = await request(port, {
			method: "DELETE",
			path: "/api/cache-html",
			body: { path: "cache/_TEMPLATE.html" },
		});
		assert.equal(rejectTemplateResponse.statusCode, 400, rejectTemplateResponse.body);
		assert.ok(fs.existsSync(path.join(cacheDir, "_TEMPLATE.html")), "template delete should be rejected");

		const traversalResponse = await request(port, {
			method: "DELETE",
			path: "/api/cache-html",
			body: { path: "cache/../data/demo/keep.ctu" },
		});
		assert.equal(traversalResponse.statusCode, 400, traversalResponse.body);
		assert.ok(fs.existsSync(path.join(dataDir, "demo", "keep.ctu")), "path traversal should not delete demo data");

		const clearResponse = await request(port, {
			method: "DELETE",
			path: "/api/cache-html/all",
		});
		assert.equal(clearResponse.statusCode, 200, clearResponse.body);
		assert.ok(fs.existsSync(path.join(cacheDir, "_TEMPLATE.html")), "clear should keep cache template");
		assert.ok(!fs.existsSync(path.join(cacheDir, "nested", "beta report.html")), "clear should remove cache HTML files");
		assert.ok(fs.existsSync(path.join(cacheDir, "notes.txt")), "clear should leave non-HTML cache files alone");
		assert.ok(fs.existsSync(path.join(dataDir, "demo")), "clear should keep demo data folder");
		assert.ok(fs.existsSync(path.join(dataDir, "_TEMPLATE.ctu")), "clear should leave data files alone");
		assert.ok(!fs.existsSync(path.join(dataDir, "beta report")), "clear should remove non-demo data folders");
	} finally {
		child.kill();
		fs.rmSync(fixtureRoot, { recursive: true, force: true });
	}
}

main().catch(err => {
	console.error(err);
	process.exitCode = 1;
});
