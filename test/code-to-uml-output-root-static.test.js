"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const skill = fs.readFileSync("skills/code-to-uml/SKILL.md", "utf8");
const template = fs.readFileSync("skills/code-to-uml/references/code-to-uml-template.md", "utf8");
const readme = fs.readFileSync("skills/code-to-uml/README.md", "utf8");
const readmeEn = fs.readFileSync("skills/code-to-uml/README.en.md", "utf8");

assert.match(
	skill,
	/相对输出路径[^\n]*始终相对于解析后的 CTU 根目录/,
	"SKILL.md should anchor relative artifact paths to CTU_HOME."
);

assert.match(
	skill,
	/绝不能相对于被分析的仓库 cwd、skill 目录或 shell cwd/,
	"SKILL.md should forbid using incidental working directories as the output base."
);

assert.match(
	skill,
	/生成产物之前，先声明解析得到的绝对 CTU 根目录以及 HTML\/数据文件的绝对输出路径/,
	"SKILL.md should require visible absolute path resolution before generation."
);

assert.match(
	skill,
	/将 `CTU_SKILL_ROOT` 解析为包含本 `SKILL\.md` 的绝对目录/,
	"SKILL.md should define an absolute root for its own resources."
);

assert.match(
	skill,
	/不要使用裸相对路径、`\.` 路径、`\.\.` 路径/,
	"SKILL.md should explicitly reject working-directory-dependent paths."
);

for (const relativePathPattern of [
	/`references\//,
	/`scripts\//,
	/`fixtures\//,
	/`cache\//,
	/`data\//,
	/<skill-dir>\//,
	/--html\s+["']?cache\//
]) {
	assert.doesNotMatch(
		skill,
		relativePathPattern,
		`SKILL.md should not contain relative path form ${relativePathPattern}.`
	);
}

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
