"use strict";

const fs = require("node:fs");
const path = require("node:path");

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
	.filter(file => file.endsWith(".test.js") && file !== "run-all.js")
	.sort();

let passed = 0;
let failed = 0;

for (const file of testFiles) {
	try {
		require(path.join(testDir, file));
		passed++;
		console.log(`✓ ${file}`);
	} catch (err) {
		failed++;
		console.error(`✗ ${file}`);
		console.error(`  ${err.message}`);
	}
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
	process.exit(1);
}
