"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const skill = fs.readFileSync("skills/code-to-uml/SKILL.md", "utf8");
const contract = fs.readFileSync("skills/code-to-uml/references/report-contract.md", "utf8");
const template = fs.readFileSync("skills/code-to-uml/references/code-to-uml-template.md", "utf8");

assert.match(
	skill,
	/S13_MAINTAINER_REFERENCE[^\n]*Markdown table/,
	"SKILL.md should explicitly require S13_MAINTAINER_REFERENCE to use a Markdown table."
);

assert.match(
	contract,
	/`S13_MAINTAINER_REFERENCE`[^\n]*Markdown table/,
	"Section catalog should define S13_MAINTAINER_REFERENCE as a Markdown table."
);

assert.match(
	contract,
	/`S13_MAINTAINER_REFERENCE` is an index, not prose\.[^\n]*Markdown table/,
	"Responsibility boundary should forbid prose-only S13 output and require a Markdown table."
);

assert.match(
	contract,
	/Recommended columns:\s*`Name`, `Kind`, `Location`, `Purpose`, `Notes`/,
	"S13 table contract should define the recommended Markdown table columns."
);

assert.match(
	skill,
	/\[Description\][^\n]*\[Detail\][^\n]*paragraphs, bullet lists, numbered steps, indentation, and Markdown tables/,
	"SKILL.md should require Description and Detail to use appropriate Markdown layout structures."
);

assert.match(
	contract,
	/\[Description\][^\n]*\[Detail\][^\n]*paragraphs, bullet lists, numbered steps, indentation, and Markdown tables/,
	"report-contract.md should require Description and Detail to use appropriate Markdown layout structures."
);

assert.doesNotMatch(
	skill,
	/(must be a multi-line Markdown block with at least two non-empty lines|at least two useful non-empty lines)/,
	"SKILL.md should not make multiline Description and Detail content a hard requirement."
);

assert.doesNotMatch(
	template,
	/(must contain at least two non-empty lines|multi-line markdown description|multi-line markdown detail)/,
	"Template notes should not make multiline Description and Detail content a hard requirement."
);

assert.match(
	skill,
	/Break lines when content contains sentence-ending punctuation such as periods and semicolons/,
	"SKILL.md should require line breaks at sentence punctuation such as periods and semicolons."
);

assert.match(
	template,
	/Break lines when content contains sentence-ending punctuation such as periods and semicolons/,
	"Template notes should require line breaks at sentence punctuation such as periods and semicolons."
);

assert.match(
	skill,
	/report language must match the user's question language/,
	"SKILL.md should require the report language to match the user's question language."
);

assert.match(
	contract,
	/language suffix must match the user's question language/,
	"report-contract.md should require data language suffixes to match the user's question language."
);

assert.match(
	template,
	/default language suffix follows the user's question language/,
	"Template notes should derive the default language suffix from the user's question language."
);

assert.doesNotMatch(
	skill,
	/(Chinese explanatory text by default|Report body defaults to Chinese)/,
	"SKILL.md should not default report content to Chinese."
);

assert.doesNotMatch(
	contract,
	/Default language suffix: `_zh`, unless/,
	"report-contract.md should not default generated report data to _zh."
);

assert.doesNotMatch(
	template,
	/default to `_zh` unless requested otherwise/,
	"Template notes should not default generated report data to _zh."
);
