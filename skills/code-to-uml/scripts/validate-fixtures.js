#!/usr/bin/env node
"use strict";

// Validator self-check: run the bundled fixtures through validate-report.js and
// assert each case passes or fails as expected. --json prints a machine-readable
// summary instead of the per-case [PASS]/[FAIL] lines.

const { spawnSync } = require("child_process");
const path = require("path");

const skillDir = path.resolve(__dirname, "..");
const validator = path.join(skillDir, "scripts", "validate-report.js");
const root = process.cwd();
const json = process.argv.slice(2).includes("--json");

const cases = [
	{
		name: "minimal compact function",
		expectPass: true,
		args: [
			validator,
			"--root", path.join(skillDir, "fixtures", "minimal"),
			"--html", "cache/minimal-function.html",
			"--lang", "en",
			"--scope", "function",
			"--complexity", "low",
			"--mode", "compact",
			"--strict"
		]
	},
	{
		name: "full zh file",
		expectPass: true,
		args: [
			validator,
			"--root", path.join(skillDir, "fixtures", "full-zh"),
			"--html", "cache/full-file.html",
			"--lang", "zh",
			"--scope", "file",
			"--complexity", "low",
			"--mode", "full",
			"--strict"
		]
	},
	{
		name: "invalid missing section",
		expectPass: false,
		args: [
			validator,
			"--root", path.join(skillDir, "fixtures", "invalid-missing-section"),
			"--html", "cache/missing-section.html",
			"--lang", "en",
			"--scope", "function",
			"--complexity", "low",
			"--mode", "compact",
			"--strict"
		]
	}
];

let failed = false;
const results = [];

for (const testCase of cases) {
	const result = spawnSync(process.execPath, testCase.args, {
		cwd: root,
		encoding: "utf8"
	});
	const passed = result.status === 0;
	const ok = passed === testCase.expectPass;
	if (!ok) {
		failed = true;
	}
	results.push({ name: testCase.name, expectPass: testCase.expectPass, passed, ok });
	if (json) {
		continue;
	}
	if (!ok) {
		console.error(`[FAIL] ${testCase.name}: expected ${testCase.expectPass ? "pass" : "fail"}, got ${passed ? "pass" : "fail"}`);
		if (result.stdout) {
			console.error(result.stdout.trim());
		}
		if (result.stderr) {
			console.error(result.stderr.trim());
		}
	} else {
		console.log(`[PASS] ${testCase.name}`);
	}
}

if (json) {
	console.log(JSON.stringify({ ok: !failed, results }, null, 2));
}

if (failed) {
	process.exitCode = 1;
}
