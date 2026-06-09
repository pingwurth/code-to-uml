"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const skill = fs.readFileSync("skills/code-to-uml/SKILL.md", "utf8");
const template = fs.readFileSync("skills/code-to-uml/references/code-to-uml-template.md", "utf8");
const readme = fs.readFileSync("skills/code-to-uml/README.md", "utf8");
const readmeEn = fs.readFileSync("skills/code-to-uml/README.en.md", "utf8");

assert.match(
	skill,
	/Relative output paths[^\n]*are always relative to the resolved CTU root/,
	"SKILL.md should anchor relative artifact paths to CTU_HOME."
);

assert.match(
	skill,
	/never the analyzed repository cwd, skill directory, or shell cwd/,
	"SKILL.md should forbid using incidental working directories as the output base."
);

assert.match(
	skill,
	/state the resolved absolute CTU root and absolute HTML\/data output paths/,
	"SKILL.md should require visible absolute path resolution before generation."
);

assert.match(
	template,
	/A relative path such as `cache\/report\.html` means `<CTU_HOME>\/cache\/report\.html`/,
	"Template guidance should define relative artifact paths against CTU_HOME."
);

for (const [name, text] of [["README.md", readme], ["README.en.md", readmeEn]]) {
	assert.doesNotMatch(
		text,
	/--root \. --html cache\//,
		`${name} should not teach validators to use the analyzed repository as the CTU root.`
	);
	assert.match(
		text,
	/\$CTU_HOME\/cache\/current-project-analysis\.html/,
		`${name} should show CTU_HOME-qualified output examples.`
	);
}
