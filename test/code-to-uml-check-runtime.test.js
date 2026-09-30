"use strict";

// End-to-end checks for skills/code-to-uml/scripts/check-runtime.js against a
// real serve.js instance: the no-server failure path, the --start path
// (spawn, verify page/APIs/assets, stop the spawned server), JSON output,
// --data-dir override semantics, and the reused-server status line.
// Follows the repo pattern of async main() with process.exitCode on failure.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const scriptsDir = path.join(repoRoot, "skills", "code-to-uml", "scripts");
const checkRuntimeScript = path.join(scriptsDir, "check-runtime.js");
const scaffoldScript = path.join(scriptsDir, "scaffold-report.js");
const checkRuntime = require(checkRuntimeScript);

const SEPARATOR = "-".repeat(64);

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

function isPortOpen(port) {
	return new Promise((resolve) => {
		const socket = net.connect({ host: "127.0.0.1", port });
		const done = (open) => {
			socket.destroy();
			resolve(open);
		};
		socket.once("connect", () => done(true));
		socket.once("error", () => done(false));
		socket.setTimeout(500, () => done(false));
	});
}

async function waitPortClosed(port) {
	for (let attempt = 0; attempt < 10; attempt++) {
		if (!(await isPortOpen(port))) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	return false;
}

async function waitForHttp(port) {
	for (let attempt = 0; attempt < 40; attempt++) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/api/cache-html`);
			if (response.status === 200) {
				return true;
			}
		} catch {
			// not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	return false;
}

function writeCtu(root, slug, fileName, title, describe, sectionId) {
	const dir = path.join(root, "data", slug);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, fileName), [
		`Title: ${title}`,
		`Describe: ${describe}`,
		SEPARATOR,
		"[Example]",
		`Example card for ${title}`,
		"",
		"[Description]",
		`<!-- Section-ID: ${sectionId} -->`,
		`Description of ${title}.`,
		"",
		"[UML]",
		"@startuml",
		"Alice -> Bob: ping",
		"@enduml",
		"",
		"[Detail]",
		`Detail of ${title}.`,
		""
	].join("\n"), "utf8");
}

function buildRuntimeRoot() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-runtime-"));
	fs.mkdirSync(path.join(root, "cache"), { recursive: true });
	fs.mkdirSync(path.join(root, "data"), { recursive: true });
	fs.copyFileSync(path.join(repoRoot, "cache", "_TEMPLATE.html"), path.join(root, "cache", "_TEMPLATE.html"));
	fs.copyFileSync(path.join(repoRoot, "serve.js"), path.join(root, "serve.js"));
	// Remaining sentinels required by checkRoot: data/_TEMPLATE.ctu and demo.html.
	fs.writeFileSync(path.join(root, "data", "_TEMPLATE.ctu"), "Title: Template\nDescribe: Template\n");
	fs.writeFileSync(path.join(root, "demo.html"), "<!doctype html><html><body></body></html>\n");
	fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>home</title></head><body></body></html>\n");

	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述", "S01_TARGET_OVERVIEW");
	writeCtu(root, "smoke", "flow--1_zh.ctu", "流程解析", "核心流程描述", "S05_CORE_FLOW");

	const scaffoldResult = spawnSync(process.execPath, [
		scaffoldScript, "--root", root, "--slug", "smoke", "--lang", "zh", "--title", "运行时测试报告"
	], { encoding: "utf8" });
	assert.equal(scaffoldResult.status, 0, scaffoldResult.stderr || scaffoldResult.stdout);

	const htmlPath = path.join(root, "cache", "smoke.html");
	const html = fs.readFileSync(htmlPath, "utf8");
	const assets = checkRuntime.collectAssetPaths(html, htmlPath, root);
	assert.ok(assets.length >= 8, `template should reference at least 8 assets, got ${assets.length}`);
	for (const asset of assets) {
		fs.mkdirSync(path.dirname(asset.absolute), { recursive: true });
		fs.writeFileSync(asset.absolute, "");
	}
	return root;
}

function runCheckRuntime(root, args) {
	return spawnSync(process.execPath, [checkRuntimeScript, "--root", root, ...args], { encoding: "utf8", timeout: 60000 });
}

async function main() {
	// 1. No server and no --start: actionable failure.
	{
		const port = await getFreePort();
		const result = runCheckRuntime(repoRoot, ["--html", "cache/_TEMPLATE.html", "--port", String(port)]);
		assert.equal(result.status, 1);
		assert.match(result.stdout, /No server answers/);
		assert.match(result.stdout, /--start/);
		assert.match(result.stdout, /Result: 0 pass, 1 fail/);
	}

	// 2. --start spawns a server, all HTTP checks run, and the spawned server is stopped.
	{
		const root = buildRuntimeRoot();
		const port = await getFreePort();
		try {
			const result = runCheckRuntime(root, ["--html", "smoke", "--lang", "zh", "--port", String(port), "--start", "--json"]);
			assert.equal(result.status, 0, result.stderr || result.stdout);
			const parsed = JSON.parse(result.stdout);
			assert.equal(parsed.ok, true);
			assert.equal(parsed.summary.fail, 0);
			assert.ok(parsed.summary.pass >= 10, `expected >=10 passing checks, got ${parsed.summary.pass}`);
			assert.equal(parsed.spawned, true);

			const byName = (name) => parsed.checks.filter((check) => check.name === name);
			assert.equal(byName("page")[0].status, "pass");
			assert.match(byName("page")[0].detail, /runtime anchors present/);
			assert.equal(byName("cache-api")[0].status, "pass");
			assert.equal(byName("examples-api")[0].status, "pass");
			assert.match(byName("examples-api")[0].detail, /overview\(1\)/);
			assert.match(byName("examples-api")[0].detail, /flow\(1\)/);
			assert.equal(byName("plantuml")[0].status, "skip");
			assert.ok(byName("asset").every((check) => check.status === "pass"), "every referenced asset should serve 200");

			assert.ok(await waitPortClosed(port), `check-runtime must stop the server it spawned on port ${port}`);
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	}

	// 3. Failure paths: missing report page and a data dir without .ctu data.
	{
		const root = buildRuntimeRoot();
		const missing = runCheckRuntime(root, ["--html", "cache/ghost.html"]);
		assert.equal(missing.status, 1);
		assert.match(missing.stderr, /Report page not found/);
		fs.rmSync(root, { recursive: true, force: true });
	}

	// 4. A reused running server is reported as reused (not "no server"), and
	//    --data-dir overrides body[data-dir] for the examples API check.
	{
		const root = buildRuntimeRoot();
		writeCtu(root, "alt", "guide--1_zh.ctu", "指南", "指南描述", "S10_ONBOARDING_GUIDE");
		const port = await getFreePort();
		const server = spawn(process.execPath, [path.join(root, "serve.js"), String(port)], { cwd: root, stdio: "ignore" });
		try {
			assert.ok(await waitForHttp(port), "the test-spawned server should become ready");

			const human = runCheckRuntime(root, ["--html", "smoke", "--data-dir", "alt", "--lang", "zh", "--port", String(port)]);
			assert.equal(human.status, 0, human.stderr || human.stdout);
			assert.match(human.stdout, /\(reused a running server\)/);
			assert.doesNotMatch(human.stdout, /\(no server\)/);
			assert.match(human.stdout, /data-dir: alt/);

			const json = runCheckRuntime(root, ["--html", "smoke", "--data-dir", "alt", "--lang", "zh", "--port", String(port), "--json"]);
			assert.equal(json.status, 0, json.stderr || json.stdout);
			const parsed = JSON.parse(json.stdout);
			assert.equal(parsed.spawned, false);
			assert.equal(parsed.dataDir, "alt");
			const examples = parsed.checks.filter((check) => check.name === "examples-api");
			assert.match(examples[0].detail, /guide\(1\)/);
			assert.doesNotMatch(examples[0].detail, /overview\(/);

			// A failing check on a reused server must still report the server as reused.
			const htmlPath = path.join(root, "cache", "smoke.html");
			const assets = checkRuntime.collectAssetPaths(fs.readFileSync(htmlPath, "utf8"), htmlPath, root);
			fs.rmSync(assets[0].absolute);
			const failing = runCheckRuntime(root, ["--html", "smoke", "--lang", "zh", "--port", String(port)]);
			assert.equal(failing.status, 1);
			assert.match(failing.stdout, /\(reused a running server\)/);
			assert.doesNotMatch(failing.stdout, /\(no server\)/);
		} finally {
			server.kill();
			fs.rmSync(root, { recursive: true, force: true });
		}
	}

	console.log("code-to-uml-check-runtime.test.js: all scenario checks passed");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});