#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const skillDir = path.resolve(__dirname, "..");
const validator = path.join(skillDir, "scripts", "validate-report.js");
const root = process.cwd();

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

for (const testCase of cases) {
	const result = spawnSync(process.execPath, testCase.args, {
		cwd: root,
		encoding: "utf8"
	});
	const passed = result.status === 0;
	if (passed !== testCase.expectPass) {
		failed = true;
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

if (failed) {
	process.exitCode = 1;
}
