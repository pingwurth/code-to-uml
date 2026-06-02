"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const css = fs.readFileSync("main.css", "utf8");

assert.match(
	css,
	/\.demo-example-desc table[\s\S]*\.example-message table[\s\S]*border-collapse:\s*collapse/,
	"Markdown tables in descriptions and details should collapse borders."
);

assert.match(
	css,
	/\.demo-example-desc th[\s\S]*\.example-message td[\s\S]*border:\s*1px solid #000/,
	"Markdown table cells in descriptions and details should use black borders."
);
