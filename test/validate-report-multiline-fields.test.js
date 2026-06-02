"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();

function writeReport(root, ctuText) {
	fs.mkdirSync(path.join(root, "cache"), { recursive: true });
	fs.mkdirSync(path.join(root, "data", "sample-report"), { recursive: true });
	fs.writeFileSync(path.join(root, "cache", "_TEMPLATE.html"), "<!doctype html><title>Template</title>");
	fs.writeFileSync(path.join(root, "data", "_TEMPLATE.ctu"), "template");
	fs.writeFileSync(path.join(root, "cache", "sample-report.html"), `<!doctype html>
<body class="demo-page" data-dir="sample-report">
	<main class="content">
		<nav class="demo-tabs">
			<button class="demo-tab is-active" data-diagram="overview">Overview</button>
		</nav>
		<h2 id="demo-title">Sample</h2>
		<p class="demo-section-overview is-active" data-diagram-overview="overview">Overview</p>
		<div class="demo-examples" data-examples></div>
		<aside data-demo-toc></aside>
	</main>
</body>`);
	fs.writeFileSync(path.join(root, "data", "sample-report", "overview--1_zh.ctu"), ctuText);
}

function runValidator(root) {
	return spawnSync(process.execPath, [
		path.join(repoRoot, "skills", "code-to-uml", "scripts", "validate-report.js"),
		"--root",
		root,
		"--html",
		"cache/sample-report.html",
		"--lang",
		"zh",
		"--strict"
	], {
		cwd: repoRoot,
		encoding: "utf8"
	});
}

const singleLineRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-single-line-"));
const multilineRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-multiline-"));

try {
	writeReport(singleLineRoot, `Title: Overview
Describe: Summary
------------------------------------------------------------
[Example]
Single-line fields

[Description]
One-line description is accepted by validation.

[UML]
None

[Detail]
One-line detail is accepted by validation.

------------------------------------------------------------
`);
	const singleLine = runValidator(singleLineRoot);
	assert.equal(singleLine.status, 0, singleLine.stdout + singleLine.stderr);
	assert.doesNotMatch(singleLine.stdout, /\[Description\] should use multiple non-empty lines/);
	assert.doesNotMatch(singleLine.stdout, /\[Detail\] should use multiple non-empty lines/);

	writeReport(multilineRoot, `Title: Overview
Describe: Summary
------------------------------------------------------------
[Example]
Multiline fields

[Description]
First description line explains the card purpose.
Second description line keeps the report readable in the UI.

[UML]
None

[Detail]
First detail line gives the concrete walkthrough.
Second detail line captures caveats or follow-up context.

------------------------------------------------------------
`);
	const multiline = runValidator(multilineRoot);
	assert.equal(multiline.status, 0, multiline.stdout + multiline.stderr);
	assert.doesNotMatch(multiline.stdout, /\[Description\] should use multiple non-empty lines/);
	assert.doesNotMatch(multiline.stdout, /\[Detail\] should use multiple non-empty lines/);
} finally {
	fs.rmSync(singleLineRoot, { recursive: true, force: true });
	fs.rmSync(multilineRoot, { recursive: true, force: true });
}
