"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(path) {
	return fs.readFileSync(path, "utf8");
}

function getClassLinkHref(html, className) {
	const match = html.match(new RegExp(`<a[^>]*class="${className}"[^>]*href="([^"]+)"`, "i"));
	return match ? match[1] : "";
}

assert.equal(
	getClassLinkHref(read("index.html"), "logo"),
	"index.html",
	"index page logo should link to index.html"
);

assert.equal(
	getClassLinkHref(read("demo.html"), "demo-topbar-logo"),
	"index.html",
	"demo page logo should link back to index.html"
);

for (const path of ["cache/_TEMPLATE.html", "cache/comprehensive-analysis.html"]) {
	assert.equal(
		getClassLinkHref(read(path), "demo-topbar-logo"),
		"../index.html",
		`${path} logo should link back to ../index.html`
	);
}
