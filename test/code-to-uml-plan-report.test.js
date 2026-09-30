"use strict";

// Checks for skills/code-to-uml/scripts/plan-report.js: required sections and
// owner categories per scope, enforcement floors per mode, data inventory and
// coverage diff, absolute next-step commands, and error paths.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const plan = path.join(repoRoot, "skills", "code-to-uml", "scripts", "plan-report.js");
const templateSource = path.join(repoRoot, "cache", "_TEMPLATE.html");
const SEPARATOR = "-".repeat(64);

function makeRoot() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-plan-"));
	fs.mkdirSync(path.join(root, "cache"), { recursive: true });
	fs.mkdirSync(path.join(root, "data"), { recursive: true });
	fs.copyFileSync(templateSource, path.join(root, "cache", "_TEMPLATE.html"));
	// The other three sentinels required by checkRoot before --root is accepted.
	fs.writeFileSync(path.join(root, "data", "_TEMPLATE.ctu"), "Title: Template\nDescribe: Template\n");
	fs.writeFileSync(path.join(root, "demo.html"), "");
	fs.writeFileSync(path.join(root, "serve.js"), "");
	return root;
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
		`<!-- Section-ID: ${sectionId || "S01_TARGET_OVERVIEW"} -->`,
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

function runPlan(root, args) {
	return spawnSync(process.execPath, [plan, "--root", root, ...args], { encoding: "utf8" });
}

function runPlanJson(root, args) {
	const result = runPlan(root, [...args, "--json"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

// 1. Full project plan: 13 required sections, floors, coverage diff, commands.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	writeCtu(root, "smoke", "flow--1_zh.ctu", "流程解析", "核心流程描述", "S05_CORE_FLOW");

	const parsed = runPlanJson(root, ["--slug", "smoke", "--lang", "zh", "--scope", "project", "--complexity", "medium", "--mode", "full"]);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.requiredSections.length, 13);
	assert.equal(parsed.optionalSections.length, 0);
	assert.equal(parsed.requiredSections[0].id, "S01_TARGET_OVERVIEW");
	assert.equal(parsed.requiredSections[0].category, "overview");
	assert.equal(parsed.requiredSections[3].id, "S04_ARCHITECTURE");
	assert.equal(parsed.floors.enforced, true);
	assert.equal(parsed.floors.minCards, 20);
	assert.equal(parsed.floors.multiCategory, 5);
	assert.ok(parsed.inventory.presentSections.includes("S01_TARGET_OVERVIEW"));
	assert.ok(parsed.inventory.presentSections.includes("S05_CORE_FLOW"));
	assert.ok(parsed.inventory.missingSections.includes("S02_TOP_LEVEL_STRUCTURE"));
	assert.ok(!parsed.inventory.missingSections.includes("S01_TARGET_OVERVIEW"));
	assert.equal(parsed.inventory.totalCards, 2);
	assert.equal(parsed.requiredCategories.length, 10);
	assert.match(parsed.commands.scaffoldInit, /scaffold-report\.js/);
	assert.ok(!parsed.commands.scaffoldInit.includes("--categories"), "data exists, so no --categories needed");
	assert.match(parsed.commands.validate, /validate-report\.js/);
	assert.match(parsed.commands.validate, /--mode full --strict/);
	assert.match(parsed.commands.validate, new RegExp(parsed.html.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	const overviewItem = parsed.inventory.categories.find((item) => item.category === "overview");
	assert.equal(overviewItem.present, true);
	assert.equal(overviewItem.label, "概览");
	fs.rmSync(root, { recursive: true, force: true });
}

// 2. Class scope: S04 moves to optional, mergeable hints follow the contract matrix.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");

	const parsed = runPlanJson(root, ["--slug", "smoke", "--lang", "zh", "--scope", "class", "--complexity", "high", "--mode", "full"]);
	assert.equal(parsed.requiredSections.length, 12);
	assert.ok(!parsed.requiredSections.some((item) => item.id === "S04_ARCHITECTURE"));
	assert.equal(parsed.optionalSections.length, 1);
	assert.equal(parsed.optionalSections[0].id, "S04_ARCHITECTURE");
	const s02 = parsed.requiredSections.find((item) => item.id === "S02_TOP_LEVEL_STRUCTURE");
	assert.equal(s02.mergeable, true);
	const s01 = parsed.requiredSections.find((item) => item.id === "S01_TARGET_OVERVIEW");
	assert.equal(s01.mergeable, false);
	assert.equal(parsed.floors.minCards, 14);
	assert.equal(parsed.floors.multiCategory, 2);
	assert.ok(!parsed.requiredCategories.includes("architecture"));
	fs.rmSync(root, { recursive: true, force: true });
}

// 3. Compact and artifact modes change the enforcement output.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");

	const compact = runPlanJson(root, ["--slug", "smoke", "--lang", "zh", "--scope", "function", "--complexity", "low", "--mode", "compact"]);
	assert.equal(compact.floors.enforced, true);
	assert.equal(compact.floors.minCards, 3);
	assert.equal(compact.floors.multiCategory, null);
	assert.match(compact.commands.validate, /--mode compact --strict/);

	const artifact = runPlanJson(root, ["--slug", "smoke", "--lang", "zh", "--mode", "artifact"]);
	assert.equal(artifact.floors.enforced, false);
	assert.equal(artifact.floors.minCards, null);
	fs.rmSync(root, { recursive: true, force: true });
}

// 4. Missing data: scaffolds suggest --categories and coverage lists every required section.
{
	const root = makeRoot();
	const parsed = runPlanJson(root, ["--slug", "future", "--lang", "zh", "--scope", "project", "--complexity", "medium", "--mode", "full"]);
	assert.equal(parsed.dataExists, false);
	assert.equal(parsed.inventory.totalCards, 0);
	assert.equal(parsed.inventory.missingSections.length, 13);
	assert.match(parsed.commands.scaffoldInit, /--categories /);
	for (const category of ["overview", "structure", "architecture", "guide"]) {
		assert.ok(parsed.commands.scaffoldInit.includes(category), `--categories should list ${category}`);
	}
	fs.rmSync(root, { recursive: true, force: true });
}

// 5. Human-readable output mentions sections, floors, coverage, runtime, and commands.
{
	const root = makeRoot();
	writeCtu(root, "smoke", "overview--1_zh.ctu", "概览", "整体概览描述");
	const result = runPlan(root, ["--slug", "smoke", "--lang", "zh", "--scope", "module", "--complexity", "medium", "--mode", "full"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Required sections \(13\)/);
	assert.match(result.stdout, /Enforcement for mode=full/);
	assert.match(result.stdout, /Coverage: present S01_TARGET_OVERVIEW/);
	assert.match(result.stdout, /Runtime: plantuml\.jar=/);
	assert.match(result.stdout, /1\) Create the HTML shell/);
	assert.match(result.stdout, /2\) Validate:/);
	fs.rmSync(root, { recursive: true, force: true });
}

// 6. Error paths: bad root, bad enums, missing slug.
{
	const root = makeRoot();

	const noTemplate = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-plan-empty-"));
	const badRoot = runPlan(noTemplate, ["--slug", "smoke"]);
	assert.equal(badRoot.status, 1);
	assert.match(badRoot.stderr, /_TEMPLATE\.html/);
	fs.rmSync(noTemplate, { recursive: true, force: true });

	const badEnum = runPlan(root, ["--slug", "smoke", "--scope", "galaxy"]);
	assert.equal(badEnum.status, 1);
	assert.match(badEnum.stderr, /--scope/);

	const noSlug = runPlan(root, []);
	assert.equal(noSlug.status, 1);
	assert.match(noSlug.stderr, /--slug is required/);

	const badSlug = runPlan(root, ["--slug", "bad slug"]);
	assert.equal(badSlug.status, 1);
	assert.match(badSlug.stderr, /\[A-Za-z0-9_-\]/);
	fs.rmSync(root, { recursive: true, force: true });
}

// 7. An HTML outside the CTU root makes the validate command self-consistent
//    with --allow-external-assets; inside-root plans stay unchanged.
{
	const root = makeRoot();

	const inside = runPlanJson(root, ["--slug", "smoke"]);
	assert.equal(inside.htmlInsideRoot, true);
	assert.doesNotMatch(inside.commands.validate, /--allow-external-assets/);

	const outside = path.join(os.tmpdir(), `ctu-plan-outside-${process.pid}-${Date.now()}.html`);
	const external = runPlanJson(root, ["--slug", "smoke", "--html", outside]);
	assert.equal(external.htmlInsideRoot, false);
	assert.match(external.commands.validate, /--allow-external-assets/);
	fs.rmSync(root, { recursive: true, force: true });
}

console.log("code-to-uml-plan-report.test.js: all scenario checks passed");