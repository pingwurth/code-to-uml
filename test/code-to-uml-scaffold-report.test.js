"use strict";

// End-to-end checks for skills/code-to-uml/scripts/scaffold-report.js:
// init compile from cache/_TEMPLATE.html, in-place refresh from .ctu data,
// --force rebuild, placeholder intro behavior, --categories pre-scaffolding,
// and error paths. The template used is the real repository template.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const scaffold = path.join(repoRoot, "skills", "code-to-uml", "scripts", "scaffold-report.js");
const templateSource = path.join(repoRoot, "cache", "_TEMPLATE.html");
const SEPARATOR = "-".repeat(64);

function makeRoot() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-scaffold-"));
	fs.mkdirSync(path.join(root, "cache"), { recursive: true });
	fs.mkdirSync(path.join(root, "data"), { recursive: true });
	fs.copyFileSync(templateSource, path.join(root, "cache", "_TEMPLATE.html"));
	// The other three sentinels required by checkRoot before --root is accepted.
	fs.writeFileSync(path.join(root, "data", "_TEMPLATE.ctu"), "Title: Template\nDescribe: Template\n");
	fs.writeFileSync(path.join(root, "demo.html"), "");
	fs.writeFileSync(path.join(root, "serve.js"), "");
	return root;
}

function writeCtu(root, slug, fileName, title, describe) {
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
		"<!-- Section-ID: S01_TARGET_OVERVIEW -->",
		`Description of ${title}.`,
		"",
		"[UML]",
		"None",
		"",
		"[Detail]",
		`Detail of ${title}.`,
		""
	].join("\n"), "utf8");
}

function runScaffold(root, args) {
	return spawnSync(process.execPath, [scaffold, "--root", root, ...args], { encoding: "utf8" });
}

function readReport(root, slug) {
	return fs.readFileSync(path.join(root, "cache", `${slug}.html`), "utf8");
}

// 1. init: compile a report shell from data, deriving tabs and overviews from .ctu headers.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	writeCtu(root, "smoke", "flow--1_zh.ctu", "流程解析", "核心流程描述");

	const result = runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "冒烟测试报告"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Scaffolded report \(init\)/);

	const html = readReport(root, "smoke");
	assert.match(html, /<title>冒烟测试报告<\/title>/);
	assert.match(html, /data-dir="smoke"/);
	assert.match(html, /lang="zh-CN"/);
	assert.match(html, /<h1[^>]*>冒烟测试报告<\/h1>/);
	assert.match(html, /data-diagram="overview"/);
	assert.match(html, /data-diagram="flow"/);
	assert.match(html, />概览<\/button>/);
	assert.match(html, />流程解析<\/button>/);
	assert.match(html, /data-diagram-overview="overview"/);
	assert.match(html, /data-diagram-overview="flow"/);
	assert.ok(html.includes("整体概览描述"), "overview paragraph should quote the Describe header");
	assert.ok(html.includes("核心流程描述"), "flow paragraph should quote the Describe header");
	assert.match(html, /id="demo-title"[^>]*>概览<\/h2>/);
	assert.match(html, /<!-- \[CONFIG\] Tab button list/, "the [CONFIG] nav comment must survive the rebuild");
	fs.rmSync(root, { recursive: true, force: true });
}

// 2. refresh: new data categories and headers sync into the existing page;
//    hand-edited h1 survives when --title is omitted.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	assert.equal(runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "手工标题"]).status, 0);

	writeCtu(root, "smoke", "structure--1_zh.ctu", "顶层结构", "结构描述");
	writeCtu(root, "smoke", "flow--1_zh.ctu", "新的流程标题", "流程描述");
	const result = runScaffold(root, ["--slug", "smoke", "--lang", "zh"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Scaffolded report \(refresh\)/);

	const html = readReport(root, "smoke");
	assert.match(html, /data-diagram="structure"/);
	assert.match(html, />新的流程标题<\/button>/, "tab label should follow the updated Title header");
	assert.ok(html.includes("结构描述"), "new category overview should be compiled in");
	assert.match(html, /<h1[^>]*>手工标题<\/h1>/, "h1 must be preserved on refresh without --title");
	fs.rmSync(root, { recursive: true, force: true });
}

// 3. --intro-file content lands in p[data-markdown] and survives a refresh.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	const introPath = path.join(root, "intro.md");
	fs.writeFileSync(introPath, "自定义概述文本。\n", "utf8");

	assert.equal(runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "报告", "--intro-file", introPath]).status, 0);
	assert.ok(readReport(root, "smoke").includes("自定义概述文本。"));

	assert.equal(runScaffold(root, ["--slug", "smoke", "--lang", "zh"]).status, 0);
	assert.ok(readReport(root, "smoke").includes("自定义概述文本。"), "refresh must preserve the existing intro");
	fs.rmSync(root, { recursive: true, force: true });
}

// 4. init without --intro-file writes a placeholder and warns.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	const result = runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "报告"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stderr, /placeholder/);
	assert.match(readReport(root, "smoke"), /报告概述待补充/);
	fs.rmSync(root, { recursive: true, force: true });
}

// 5. --categories scaffolds the shell before any .ctu data exists.
{
	const root = makeRoot();
	const result = runScaffold(root, ["--slug", "early", "--lang", "zh", "--title", "先行建壳", "--categories", "overview,flow"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(fs.existsSync(path.join(root, "data", "early")), "data directory should be created");

	const html = readReport(root, "early");
	assert.match(html, /data-diagram="overview"/);
	assert.match(html, /data-diagram="flow"/);
	assert.match(html, />概览<\/button>/, "missing data falls back to the built-in zh label");
	assert.match(result.stderr, /no _zh\.ctu data yet/);
	fs.rmSync(root, { recursive: true, force: true });
}

// 6. error paths: invalid slug, missing --title on init, unknown category characters,
//    and an incomplete --root that lacks the four sentinels.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");

	const badSlug = runScaffold(root, ["--slug", "bad.slug", "--lang", "zh", "--title", "x"]);
	assert.equal(badSlug.status, 1);
	assert.match(badSlug.stderr, /\[ERROR\]/);

	const missingTitle = runScaffold(root, ["--slug", "smoke", "--lang", "zh"]);
	assert.equal(missingTitle.status, 1);
	assert.match(missingTitle.stderr, /--title is required/);

	const badCategory = runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "x", "--categories", "ok,not ok"]);
	assert.equal(badCategory.status, 1);
	assert.match(badCategory.stderr, /--categories/);

	const badLang = runScaffold(root, ["--slug", "smoke", "--lang", "fr", "--title", "x"]);
	assert.equal(badLang.status, 1);
	assert.match(badLang.stderr, /--lang/);

	const incomplete = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-scaffold-incomplete-"));
	fs.mkdirSync(path.join(incomplete, "cache"), { recursive: true });
	fs.copyFileSync(templateSource, path.join(incomplete, "cache", "_TEMPLATE.html"));
	const badRoot = runScaffold(incomplete, ["--slug", "smoke", "--lang", "zh", "--title", "x"]);
	assert.equal(badRoot.status, 1);
	assert.match(badRoot.stderr, /--root is not a Code-To-UML root/);
	assert.match(badRoot.stderr, /data\/_TEMPLATE\.ctu/);
	assert.match(badRoot.stderr, /demo\.html/);
	assert.match(badRoot.stderr, /serve\.js/);
	fs.rmSync(incomplete, { recursive: true, force: true });
	fs.rmSync(root, { recursive: true, force: true });
}

// 7. refresh refuses to swallow unrelated markup between overview paragraphs.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	writeCtu(root, "smoke", "flow--1_zh.ctu", "流程解析", "核心流程描述");
	assert.equal(runScaffold(root, ["--slug", "smoke", "--lang", "zh", "--title", "报告"]).status, 0);

	const htmlPath = path.join(root, "cache", "smoke.html");
	const injected = fs.readFileSync(htmlPath, "utf8").replace(
		/(data-diagram-overview="overview"[^>]*>[^<]*<\/p>)/,
		"$1\n\t\t\t<!-- hand-written note -->"
	);
	fs.writeFileSync(htmlPath, injected, "utf8");

	const result = runScaffold(root, ["--slug", "smoke", "--lang", "zh"]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unexpected content between/);
	assert.equal(fs.readFileSync(htmlPath, "utf8"), injected, "a refused refresh must leave the page untouched");
	fs.rmSync(root, { recursive: true, force: true });
}

console.log("code-to-uml-scaffold-report.test.js: all scenario checks passed");