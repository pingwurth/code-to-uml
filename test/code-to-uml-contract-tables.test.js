"use strict";

// Drift guard for the four hardcoded contract tables shared by the skill
// scripts: SECTION_IDS / SCOPE_REQUIRED_SECTIONS (validate-report.js),
// SECTION_OWNER and CANONICAL_CATEGORY_ORDER (lib/report-html.js), and
// MERGEABLE_SECTIONS (plan-report.js). plan-report.js looks owner categories
// up by section id, so a new SECTION_IDS entry without a matching
// SECTION_OWNER entry would silently produce wrong plans.

const assert = require("node:assert/strict");
const path = require("node:path");

const repoRoot = process.cwd();
const scriptsDir = path.join(repoRoot, "skills", "code-to-uml", "scripts");

const {
	SECTION_IDS,
	SCOPE_REQUIRED_SECTIONS,
	VALID_SCOPES
} = require(path.join(scriptsDir, "validate-report.js"));
const {
	SECTION_OWNER,
	CANONICAL_CATEGORY_ORDER
} = require(path.join(scriptsDir, "lib", "report-html.js"));
const { MERGEABLE_SECTIONS } = require(path.join(scriptsDir, "plan-report.js"));

// 1. Every required section id has an owner category, and no owner is orphaned.
for (const id of SECTION_IDS) {
	assert.ok(
		Object.prototype.hasOwnProperty.call(SECTION_OWNER, id),
		`SECTION_OWNER is missing an entry for ${id}; plan-report.js would emit category=undefined`
	);
}
for (const id of Object.keys(SECTION_OWNER)) {
	assert.ok(
		SECTION_IDS.includes(id),
		`SECTION_OWNER has an unknown section id ${id}; remove it or add it to SECTION_IDS`
	);
}

// 2. Owner categories must be canonical tab categories (they end up as data-diagram values).
for (const [id, category] of Object.entries(SECTION_OWNER)) {
	assert.ok(
		CANONICAL_CATEGORY_ORDER.includes(category),
		`SECTION_OWNER maps ${id} to unknown category '${category}'`
	);
}

// 3. SCOPE_REQUIRED_SECTIONS keys match VALID_SCOPES and only reuse known ids.
assert.deepEqual(
	Object.keys(SCOPE_REQUIRED_SECTIONS).sort(),
	[...VALID_SCOPES].sort(),
	"SCOPE_REQUIRED_SECTIONS must cover exactly the valid scopes"
);
for (const [scope, ids] of Object.entries(SCOPE_REQUIRED_SECTIONS)) {
	for (const id of ids) {
		assert.ok(SECTION_IDS.includes(id), `SCOPE_REQUIRED_SECTIONS['${scope}'] has unknown id ${id}`);
	}
}

// 4. MERGEABLE_SECTIONS keys match VALID_SCOPES and only reference known ids;
//    project/module scopes have no mergeable sections per the contract matrix.
assert.deepEqual(
	Object.keys(MERGEABLE_SECTIONS).sort(),
	[...VALID_SCOPES].sort(),
	"MERGEABLE_SECTIONS must cover exactly the valid scopes"
);
for (const [scope, ids] of Object.entries(MERGEABLE_SECTIONS)) {
	for (const id of ids) {
		assert.ok(SECTION_IDS.includes(id), `MERGEABLE_SECTIONS['${scope}'] has unknown id ${id}`);
		assert.ok(
			SCOPE_REQUIRED_SECTIONS[scope].includes(id),
			`MERGEABLE_SECTIONS['${scope}'] marks ${id} mergeable but it is not required for that scope`
		);
	}
}

// 5. Every required section belongs to a category that the canonical order knows.
for (const scope of Object.keys(SCOPE_REQUIRED_SECTIONS)) {
	for (const id of SCOPE_REQUIRED_SECTIONS[scope]) {
		assert.ok(
			CANONICAL_CATEGORY_ORDER.includes(SECTION_OWNER[id]),
			`required section ${id} for scope ${scope} has no canonical owner category`
		);
	}
}

console.log("code-to-uml-contract-tables.test.js: all cross-table checks passed");