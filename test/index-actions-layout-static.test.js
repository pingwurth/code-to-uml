"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

assert.match(
	html,
	/<div class="intro-heading">[\s\S]*<h1>Cache Index<\/h1>[\s\S]*<button class="action-button" data-variant="danger" type="button" data-clear-cache>Clear<\/button>[\s\S]*<\/div>/,
	"Clear should be in the same heading row as Cache Index"
);

assert.doesNotMatch(
	html.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0] || "",
	/data-clear-cache/,
	"Clear should not live in the top bar"
);

assert.match(
	html,
	/\.intro-heading\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*space-between;/,
	"intro heading should keep title left and actions right"
);

assert.match(
	html,
	/\.intro-actions\s*\{[\s\S]*justify-content:\s*flex-end;/,
	"heading actions should align to the right"
);

assert.match(
	html,
	/\.delete-button\s*\{[\s\S]*justify-self:\s*end;/,
	"Delete buttons should align right in each row"
);
