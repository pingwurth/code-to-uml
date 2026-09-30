"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const skillRoot = path.join(repoRoot, "skills", "code-to-uml");
const resolver = path.join(skillRoot, "scripts", "resolve-ctu-home.js");
const { resolveCtuHome } = require(resolver);

function makeTmpDir(prefix) {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runResolver(scriptPath, args, options) {
	const opts = options || {};
	const tmpHome = makeTmpDir("ctu-resolver-home-");
	const env = Object.assign({}, process.env);
	delete env.CTU_HOME;
	if (opts.envCtuHome !== undefined) {
		env.CTU_HOME = opts.envCtuHome;
	}
	env.HOME = tmpHome;
	env.USERPROFILE = tmpHome;
	const result = spawnSync(process.execPath, [scriptPath, ...(args || [])], {
		cwd: opts.cwd || tmpHome,
		env,
		encoding: "utf8"
	});
	fs.rmSync(tmpHome, { recursive: true, force: true });
	return result;
}

function makeIsolatedSkillCopy(parentDir, withPointer) {
	const copyRoot = path.join(parentDir, "skills", "code-to-uml");
	const scriptsDir = path.join(copyRoot, "scripts");
	fs.mkdirSync(scriptsDir, { recursive: true });
	fs.copyFileSync(resolver, path.join(scriptsDir, "resolve-ctu-home.js"));
	if (withPointer) {
		fs.writeFileSync(path.join(copyRoot, "ctu-home.json"), `${JSON.stringify({ ctuHome: repoRoot }, null, 2)}\n`);
	}
	return path.join(scriptsDir, "resolve-ctu-home.js");
}

// 1. Bundled skill resolves the repository root without env, cwd, or pointer help.
{
	const result = runResolver(resolver, []);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /^CTU_HOME=/);
	assert.ok(result.stdout.includes(`CTU_HOME=${repoRoot}`), `stdout should contain CTU_HOME=${repoRoot}`);
	assert.match(result.stdout, /Source: skill-repo/);
	assert.match(result.stdout, /Sentinels: OK/);
}

// 2. Installed copy with a ctu-home.json pointer resolves back to the repository root.
{
	const home = makeTmpDir("ctu-resolver-pointer-");
	const copiedResolver = makeIsolatedSkillCopy(home, true);
	const result = runResolver(copiedResolver, []);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(result.stdout.includes(`CTU_HOME=${repoRoot}`));
	assert.match(result.stdout, /Source: skill-pointer/);
	fs.rmSync(home, { recursive: true, force: true });
}

// 3. Isolated copy without pointer, env, or cwd hints fails with actionable diagnostics.
{
	const home = makeTmpDir("ctu-resolver-lost-");
	const copiedResolver = makeIsolatedSkillCopy(home, false);
	const result = runResolver(copiedResolver, [], { cwd: home });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Cannot resolve CTU_HOME/);
	assert.match(result.stderr, /Checked candidates:/);
	assert.match(result.stderr, /install\.js/);
	assert.match(result.stderr, /--hint/);
	assert.match(result.stderr, /without styles or scripts/);
	fs.rmSync(home, { recursive: true, force: true });
}

// 4. --hint with an explicit repository root wins even from an isolated copy.
{
	const home = makeTmpDir("ctu-resolver-hint-");
	const copiedResolver = makeIsolatedSkillCopy(home, false);
	const result = runResolver(copiedResolver, ["--hint", repoRoot], { cwd: home });
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(result.stdout.includes(`CTU_HOME=${repoRoot}`));
	assert.match(result.stdout, /Source: hint/);
	fs.rmSync(home, { recursive: true, force: true });
}

// 5. --hint with a report file resolves through the ancestor chain.
{
	const home = makeTmpDir("ctu-resolver-hint-file-");
	const copiedResolver = makeIsolatedSkillCopy(home, false);
	const reportFile = path.join(repoRoot, "cache", "_TEMPLATE.html");
	const result = runResolver(copiedResolver, ["--hint", reportFile], { cwd: home });
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(result.stdout.includes(`CTU_HOME=${repoRoot}`));
	fs.rmSync(home, { recursive: true, force: true });
}

// 6. --json prints a machine-readable result.
{
	const result = runResolver(resolver, ["--json"]);
	assert.equal(result.status, 0, result.stderr || result.stdout);
	const parsed = JSON.parse(result.stdout);
	assert.equal(parsed.ok, true);
	assert.equal(parsed.ctuHome, repoRoot);
	assert.ok(Array.isArray(parsed.attempts) && parsed.attempts.length > 0);
	assert.equal(parsed.ctuHome, resolveCtuHome({}).ctuHome);
}

// 7. CTU_HOME environment variable is honored when no pointer or hint exists.
{
	const home = makeTmpDir("ctu-resolver-env-");
	const copiedResolver = makeIsolatedSkillCopy(home, false);
	const result = runResolver(copiedResolver, [], { cwd: home, envCtuHome: repoRoot });
	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(result.stdout.includes(`CTU_HOME=${repoRoot}`));
	assert.match(result.stdout, /Source: env CTU_HOME/);
	fs.rmSync(home, { recursive: true, force: true });
}

// 8. Module API: deterministic inputs, success and failure shapes.
{
	const okResult = resolveCtuHome({ hint: repoRoot, skillRoot, cwd: repoRoot, envHome: "", homeDir: "" });
	assert.equal(okResult.ok, true);
	assert.equal(okResult.ctuHome, repoRoot);
	assert.equal(okResult.source, "hint");

	const home = makeTmpDir("ctu-resolver-module-");
	const lostSkillRoot = path.join(home, "skills", "code-to-uml");
	fs.mkdirSync(lostSkillRoot, { recursive: true });
	const failResult = resolveCtuHome({
		skillRoot: lostSkillRoot,
		cwd: home,
		envHome: "",
		homeDir: home,
		hint: ""
	});
	assert.equal(failResult.ok, false);
	assert.equal(failResult.ctuHome, null);
	assert.ok(failResult.attempts.length > 0);
	assert.ok(failResult.attempts.some((attempt) => attempt.source === "skill-repo (bundled)"));
	fs.rmSync(home, { recursive: true, force: true });
}

console.log("resolve-ctu-home.test.js: all scenario checks passed");
