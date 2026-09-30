"use strict";

// Focused checks for validate-report.js output options: --json machine
// output on a clean report, the --strict failure for a report placed outside
// the CTU root, and --allow-external-assets downgrading those missing template
// assets to non-blocking info. Query-string asset refs must be normalized
// before the existence check (../main.css?v=1 resolves to ../main.css).

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const validator = path.join(repoRoot, "skills", "code-to-uml", "scripts", "validate-report.js");
const SEPARATOR = "-".repeat(64);

const REPORT_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
	<link rel="stylesheet" href="../main.css">
	<link rel="stylesheet" href="../main.css?v=1">
</head>
<body class="demo-page" data-dir="sample">
	<main class="content">
		<section class="intro">
			<h1>Sample</h1>
			<p data-markdown>报告概述示例。</p>
		</section>
		<nav class="demo-tabs">
			<button class="demo-tab is-active" data-diagram="overview">概览</button>
		</nav>
		<h2 id="demo-title">概览</h2>
		<p class="demo-section-overview is-active" data-diagram-overview="overview">概述</p>
		<div class="demo-examples" data-examples></div>
		<aside data-demo-toc></aside>
	</main>
</body>
</html>`;

function writeCtu(dir, fileName) {
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, fileName), [
		"Title: Overview",
		"Describe: Summary",
		SEPARATOR,
		"[Example]",
		"Example",
		"",
		"[Description]",
		"Description.",
		"",
		"[UML]",
		"None",
		"",
		"[Detail]",
		"Detail.",
		""
	].join("\n"), "utf8");
}

function buildRoot() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-validate-json-"));
	fs.mkdirSync(path.join(root, "cache"), { recursive: true });
	fs.mkdirSync(path.join(root, "data"), { recursive: true });
	fs.writeFileSync(path.join(root, "cache", "_TEMPLATE.html"), "<!doctype html><title>template</title>\n");
	fs.writeFileSync(path.join(root, "data", "_TEMPLATE.ctu"), "Title: Template\nDescribe: Template\n");
	fs.writeFileSync(path.join(root, "demo.html"), "");
	fs.writeFileSync(path.join(root, "serve.js"), "");
	fs.writeFileSync(path.join(root, "main.css"), "");
	writeCtu(path.join(root, "data", "sample"), "overview--1_zh.ctu");
	fs.writeFileSync(path.join(root, "cache", "sample.html"), REPORT_HTML, "utf8");
	return root;
}

function runValidator(args) {
	return spawnSync(process.execPath, [validator, ...args], { cwd: repoRoot, encoding: "utf8" });
}

const root = buildRoot();
const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-validate-outside-"));
const outsideHtml = path.join(outsideDir, "sample.html");

try {
	// 1. In-root report with --json: machine-readable summary, zero errors.
	{
		const result = runValidator([
			"--root", root, "--html", "cache/sample.html", "--lang", "zh", "--json"
		]);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const parsed = JSON.parse(result.stdout);
		assert.equal(parsed.ok, true);
		assert.equal(parsed.errors, 0);
		assert.equal(parsed.warnings, 0);
		assert.equal(parsed.categories.length, 1);
		assert.ok(Array.isArray(parsed.issues));
		// The ?v=1 query string must normalize to ../main.css, which exists.
		assert.ok(!parsed.issues.some((issue) => /main\.css\?v=1/.test(issue.message)), "query strings must be stripped before the asset check");
	}

	// 2. Same page outside the CTU root: --strict fails on the missing assets.
	fs.writeFileSync(outsideHtml, REPORT_HTML, "utf8");
	{
		const result = runValidator([
			"--root", root, "--html", outsideHtml, "--lang", "zh", "--strict", "--json"
		]);
		assert.equal(result.status, 1);
		const parsed = JSON.parse(result.stdout);
		assert.equal(parsed.ok, false);
		assert.ok(parsed.warnings >= 1, `expected missing-asset warnings, got ${parsed.warnings}`);
		assert.ok(parsed.issues.every((issue) => issue.kind !== "error"), "outside-root placement must not be a hard error");
	}

	// 3. --allow-external-assets downgrades those warnings to non-blocking info.
	{
		const result = runValidator([
			"--root", root, "--html", outsideHtml, "--lang", "zh", "--strict", "--allow-external-assets", "--json"
		]);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const parsed = JSON.parse(result.stdout);
		assert.equal(parsed.ok, true);
		assert.equal(parsed.warnings, 0);
		assert.ok(parsed.infos >= 1, `expected info issues, got ${parsed.infos}`);
		assert.ok(parsed.issues.every((issue) => issue.kind === "info"), "only info issues should remain");
		assert.ok(parsed.issues.some((issue) => /--allow-external-assets/.test(issue.message)));

		const human = runValidator([
			"--root", root, "--html", outsideHtml, "--lang", "zh", "--strict", "--allow-external-assets"
		]);
		assert.equal(human.status, 0, human.stderr || human.stdout);
		assert.match(human.stdout, /\[INFO\]/);
		assert.match(human.stdout, /Infos: \d+/);
	}
} finally {
	fs.rmSync(root, { recursive: true, force: true });
	fs.rmSync(outsideDir, { recursive: true, force: true });
}

console.log("code-to-uml-validate-json-external.test.js: all scenario checks passed");