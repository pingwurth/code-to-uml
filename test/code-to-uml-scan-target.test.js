"use strict";

// Checks for skills/code-to-uml/scripts/scan-target.js: file/directory
// detection, symbol and signal counting, the six-dimension complexity score,
// escalation triggers, and error paths.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const scan = path.join(repoRoot, "skills", "code-to-uml", "scripts", "scan-target.js");

function makeDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "ctu-scan-"));
}

function runScan(target, args) {
	return spawnSync(process.execPath, [scan, "--target", target, ...(args || [])], { encoding: "utf8" });
}

function runScanJson(target, args) {
	const result = runScan(target, [...(args || []), "--json"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

// 1. A tiny single-symbol file scores low and suggests the function scope.
{
	const dir = makeDir();
	fs.writeFileSync(path.join(dir, "tiny.js"), [
		"function alpha(value) {",
		"\treturn value;",
		"}"
	].join("\n"), "utf8");

	const parsed = runScanJson(path.join(dir, "tiny.js"));
	assert.equal(parsed.kind, "file");
	assert.equal(parsed.fileCount, 1);
	assert.equal(parsed.totals.symbols, 1);
	assert.equal(parsed.complexity, "low");
	assert.equal(parsed.suggestedScope, "function");
	fs.rmSync(dir, { recursive: true, force: true });
}

// 2. A large signal-heavy target escalates to high complexity.
{
	const dir = makeDir();
	const filler = "// filler line\n".repeat(1100);
	const body = [
		"\"use strict\";",
		"const fs = require(\"fs\");",
		"const db = require(\"db-client\");",
		...Array.from({ length: 12 }, (_, i) => `function task${i}(input) {\n\tif (input) {\n\t\ttry {\n\t\t\treturn retry(() => fs.readFile(input));\n\t\t} catch (error) {\n\t\t\tthrow error;\n\t\t}\n\t}\n\treturn fallback(input);\n}`),
		"async function pipeline() { await Promise.all([task0(1), task1(2)]); }",
		filler
	].join("\n");
	fs.writeFileSync(path.join(dir, "engine.js"), body, "utf8");

	const parsed = runScanJson(dir);
	assert.equal(parsed.kind, "directory");
	assert.ok(parsed.totals.lines > 1000, `expected >1000 lines, got ${parsed.totals.lines}`);
	assert.ok(parsed.totals.symbols >= 12, `expected >=12 symbols, got ${parsed.totals.symbols}`);
	assert.equal(parsed.complexity, "high");
	assert.ok(parsed.escalation.length > 0, "escalation triggers should be reported");
	assert.ok(parsed.escalation.some((item) => item.includes("lines")), "line-count escalation should trigger");
	assert.ok(parsed.dimensions.length === 6, "six dimensions should be scored");
	assert.ok(parsed.dimensions.some((dimension) => dimension.name === "Branch/error paths" && dimension.score === 2), "retry/fallback signals should max the branch/error dimension");
	fs.rmSync(dir, { recursive: true, force: true });
}

// 3. Language detection covers common extensions and ignores vendor directories.
{
	const dir = makeDir();
	fs.mkdirSync(path.join(dir, "src"));
	fs.mkdirSync(path.join(dir, "node_modules"));
	fs.writeFileSync(path.join(dir, "src", "app.py"), "def main():\n\tpass\n\nclass App:\n\tpass\n", "utf8");
	fs.writeFileSync(path.join(dir, "src", "main.go"), "package main\n\nfunc main() {\n}\n", "utf8");
	fs.writeFileSync(path.join(dir, "node_modules", "huge.js"), "function vendored() {}\n", "utf8");
	fs.writeFileSync(path.join(dir, "README.md"), "# docs\n", "utf8");

	const parsed = runScanJson(dir);
	assert.equal(parsed.fileCount, 2, "node_modules and non-source files must be skipped");
	assert.ok(parsed.byLanguage.some((item) => item.language === "py" && item.symbols >= 2));
	assert.ok(parsed.byLanguage.some((item) => item.language === "go" && item.symbols >= 1));
	assert.ok(parsed.ignoredDirs >= 1, "node_modules should count as an ignored directory");
	assert.ok(parsed.skippedNonSource >= 1, "README.md should count as a skipped non-source file");
	fs.rmSync(dir, { recursive: true, force: true });
}

// 4. Human-readable output prints dimensions, total, and the next-step hint.
{
	const dir = makeDir();
	fs.writeFileSync(path.join(dir, "one.js"), "function solo() {}\n", "utf8");
	const result = runScan(dir);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Dimension scores/);
	assert.match(result.stdout, /Total\s+\d+ -> complexity: (low|medium|high)/);
	assert.match(result.stdout, /Suggested scope: /);
	assert.match(result.stdout, /plan-report\.js/);
	fs.rmSync(dir, { recursive: true, force: true });
}

// 5. Error paths: missing and nonexistent targets, bad --max-files.
{
	const dir = makeDir();
	const missing = runScan(dir, ["--nothing"]);
	assert.equal(missing.status, 1);
	assert.match(missing.stderr, /Unknown argument/);

	const noTarget = spawnSync(process.execPath, [scan], { encoding: "utf8" });
	assert.equal(noTarget.status, 1);
	assert.match(noTarget.stderr, /--target is required/);

	const ghost = runScan(path.join(dir, "ghost.js"));
	assert.equal(ghost.status, 1);
	assert.match(ghost.stderr, /does not exist/);

	const badMax = runScan(dir, ["--max-files", "zero"]);
	assert.equal(badMax.status, 1);
	assert.match(badMax.stderr, /--max-files/);
	fs.rmSync(dir, { recursive: true, force: true });
}

console.log("code-to-uml-scan-target.test.js: all scenario checks passed");