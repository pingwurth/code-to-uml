"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const css = fs.readFileSync("main.css", "utf8");

assert.doesNotMatch(
	css,
	/\.doc-section\s+code:not\(\[data-source\]\)\s*\{/,
	"doc-section inline code rule should not match markdown pre code blocks"
);

function ruleFor(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
	assert.ok(match, `${selector} rule should exist`);
	return match[1];
}

for (const selector of [".demo-example-desc pre", ".example-message pre"]) {
	const body = ruleFor(selector);
	assert.match(body, /white-space\s*:\s*pre-wrap\s*;/, `${selector} should preserve markdown code-block newlines`);
	assert.match(body, /overflow-x\s*:\s*auto\s*;/, `${selector} should allow long code lines to scroll`);
	assert.match(body, /background\s*:\s*var\(--surface\)\s*;/, `${selector} should use visible code-block background`);
	assert.match(body, /color\s*:\s*var\(--fg\)\s*;/, `${selector} should use visible code-block text color`);
}

for (const selector of [".demo-example-desc pre code", ".example-message pre code"]) {
	const body = ruleFor(selector);
	assert.match(body, /display\s*:\s*block\s*;/, `${selector} should lay out each code line as a block child of pre`);
	assert.match(body, /background\s*:\s*var\(--surface\)\s*;/, `${selector} should keep code-block background visible`);
	assert.match(body, /color\s*:\s*var\(--fg\)\s*;/, `${selector} should keep code-block text visible`);
	assert.match(body, /white-space\s*:\s*pre-wrap\s*;/, `${selector} should preserve code-block newlines`);
}
