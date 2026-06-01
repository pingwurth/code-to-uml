"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const context = {
	window: {},
	self: {},
	global: {}
};
context.globalThis = context;

vm.runInNewContext(
	fs.readFileSync("js/markdown-it.js", "utf8"),
	context,
	{ filename: "js/markdown-it.js" }
);

const markdownit = context.window.markdownit || context.markdownit || context.global.markdownit;
assert.equal(typeof markdownit, "function", "markdown-it should load");

const markdown = markdownit({ html: false, breaks: true, linkify: true });
const html = markdown.render("```python\n@dataclass\nclass Task:\n    id: str\n```");

assert.match(html, /<pre><code class="language-python">/, "fenced code should render as a code block");
assert.match(html, /@dataclass\nclass Task:\n    id: str/, "fenced code should preserve newlines and indentation");
