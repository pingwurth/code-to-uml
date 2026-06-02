"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const skillRoot = path.join(repoRoot, "skills", "code-to-uml");

assert.ok(fs.existsSync(path.join(skillRoot, "SKILL.md")), "repository skill should include SKILL.md");
assert.ok(fs.existsSync(path.join(skillRoot, "references", "code-to-uml-template.md")), "repository skill should include references");
assert.match(
	fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8"),
	/^---\nname: code-to-uml/m,
	"repository skill should contain the current report skill"
);

const home = fs.mkdtempSync(path.join(os.tmpdir(), "ctu-install-home-"));
const profile = path.join(home, "profile");
const env = Object.assign({}, process.env, {
	HOME: home,
	USERPROFILE: home,
});

try {
	const result = spawnSync(process.execPath, [
		"install-ctu-home.js",
		"codex",
		"--profile",
		profile,
	], {
		cwd: repoRoot,
		env,
		encoding: "utf8",
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Installed code-to-uml skill for codex/);
	assert.ok(fs.existsSync(path.join(home, ".codex", "skills", "code-to-uml", "SKILL.md")));
	assert.ok(!fs.existsSync(path.join(home, ".claude", "skills", "code-to-uml")), "named install should not install other tools");
	assert.match(fs.readFileSync(profile, "utf8"), /CTU_HOME/);

	const existing = fs.readFileSync(path.join(home, ".codex", "skills", "code-to-uml", "SKILL.md"), "utf8");
	fs.writeFileSync(path.join(home, ".codex", "skills", "code-to-uml", "SKILL.md"), "custom local skill");
	const second = spawnSync(process.execPath, [
		"install-ctu-home.js",
		"codex",
		"--profile",
		profile,
	], {
		cwd: repoRoot,
		env,
		encoding: "utf8",
		input: "n\n",
	});

	assert.equal(second.status, 0, second.stderr || second.stdout);
	assert.match(second.stdout, /already exists/i, "existing skill should warn before prompting");
	assert.match(second.stdout, /Overwrite\?/i, "existing skill should ask whether to overwrite");
	assert.equal(
		fs.readFileSync(path.join(home, ".codex", "skills", "code-to-uml", "SKILL.md"), "utf8"),
		"custom local skill",
		"existing skill should not be overwritten"
	);

	const overwrite = spawnSync(process.execPath, [
		"install-ctu-home.js",
		"codex",
		"--profile",
		profile,
	], {
		cwd: repoRoot,
		env,
		encoding: "utf8",
		input: "y\n",
	});

	assert.equal(overwrite.status, 0, overwrite.stderr || overwrite.stdout);
	assert.match(overwrite.stdout, /Overwritten code-to-uml skill for codex/);
	assert.equal(
		fs.readFileSync(path.join(home, ".codex", "skills", "code-to-uml", "SKILL.md"), "utf8"),
		existing,
		"existing skill should be overwritten when confirmed"
	);

	const allTools = spawnSync(process.execPath, [
		"install-ctu-home.js",
		"--profile",
		profile,
	], {
		cwd: repoRoot,
		env,
		encoding: "utf8",
	});

	assert.equal(allTools.status, 0, allTools.stderr || allTools.stdout);
	for (const relativePath of [
		[".codex", "skills", "code-to-uml"],
		[".claude", "skills", "code-to-uml"],
		[".config", "opencode", "skills", "code-to-uml"],
		[".openclaw", "skills", "code-to-uml"],
		[".hermes", "skills", "code-to-uml"],
		[".qoder", "skills", "code-to-uml"],
		[".qwen", "skills", "code-to-uml"],
		[".copilot", "skills", "code-to-uml"],
		[".trae", "skills", "code-to-uml"],
	]) {
		assert.ok(
			fs.existsSync(path.join(home, ...relativePath, "SKILL.md")),
			`default install should create ${relativePath.join("/")}`
		);
	}
} finally {
	fs.rmSync(home, { recursive: true, force: true });
}
