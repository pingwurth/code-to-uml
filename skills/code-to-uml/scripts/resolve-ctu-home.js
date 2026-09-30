#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const SENTINELS = ["cache/_TEMPLATE.html", "data/_TEMPLATE.ctu", "demo.html", "serve.js"];
const POINTER_FILE = "ctu-home.json";
const PROFILE_MARKER_START = "# >>> code-to-uml CTU_HOME >>>";
const PROFILE_MARKER_END = "# <<< code-to-uml CTU_HOME <<<";

function checkRoot(dir) {
	const missing = SENTINELS.filter((relative) => !fs.existsSync(path.join(dir, relative)));
	return { dir: path.resolve(dir), ok: missing.length === 0, missing };
}

function ancestors(startDir) {
	const out = [];
	let current = path.resolve(startDir);
	while (true) {
		out.push(current);
		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}
	return out;
}

function expandHome(value) {
	if (value === "~") {
		return os.homedir();
	}
	if (value.startsWith("~/") || value.startsWith("~\\")) {
		return path.join(os.homedir(), value.slice(2));
	}
	return value;
}

function readPointer(skillRoot) {
	const file = path.join(skillRoot, POINTER_FILE);
	if (!fs.existsSync(file)) {
		return null;
	}
	try {
		const data = JSON.parse(fs.readFileSync(file, "utf8"));
		if (data && typeof data.ctuHome === "string" && data.ctuHome.trim()) {
			return { value: path.resolve(expandHome(data.ctuHome.trim())) };
		}
		return { invalid: "pointer file has no ctuHome string" };
	} catch (error) {
		return { invalid: `pointer file is not valid JSON: ${error.message}` };
	}
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readProfileCandidates(homeDir) {
	if (process.platform === "win32") {
		return [];
	}
	const home = homeDir || os.homedir();
	const found = [];
	for (const name of [".zshrc", ".bashrc", ".bash_profile", ".profile"]) {
		const file = path.join(home, name);
		let text = "";
		try {
			text = fs.readFileSync(file, "utf8");
		} catch (error) {
			continue;
		}
		const blockRe = new RegExp(`${escapeRegExp(PROFILE_MARKER_START)}[\\s\\S]*?${escapeRegExp(PROFILE_MARKER_END)}`);
		const block = blockRe.exec(text);
		if (!block) {
			continue;
		}
		const value = /(?:^|\n)\s*(?:export\s+)?CTU_HOME=(?:"([^"]+)"|'([^']+)'|([^\s#]+))/.exec(block[0]);
		if (value) {
			const raw = value[1] || value[2] || value[3];
			if (raw) {
				found.push(path.resolve(expandHome(raw)));
			}
		}
	}
	return found;
}

function resolveCtuHome(options) {
	const opts = options || {};
	const skillRoot = path.resolve(opts.skillRoot || path.join(__dirname, ".."));
	const attempts = [];

	function tryDir(source, dir) {
		if (!dir) {
			return null;
		}
		const result = checkRoot(dir);
		attempts.push({ source, dir: result.dir, ok: result.ok, missing: result.missing });
		return result.ok ? result.dir : null;
	}

	function tryChain(source, startDir) {
		const dirs = ancestors(startDir);
		for (const dir of dirs) {
			const result = checkRoot(dir);
			if (result.ok) {
				attempts.push({ source, dir: result.dir, ok: true, missing: [] });
				return result.dir;
			}
		}
		attempts.push({
			source,
			dir: path.resolve(startDir),
			ok: false,
			missing: SENTINELS.slice(),
			note: `checked ${dirs.length} directory levels (${path.resolve(startDir)} up to ${dirs[dirs.length - 1]})`
		});
		return null;
	}

	const found = { ok: true, skillRoot, attempts };

	// 1. Explicit --hint: a root path or a report file whose ancestors contain the root.
	if (opts.hint) {
		const hintPath = path.resolve(expandHome(String(opts.hint)));
		let startDir = hintPath;
		try {
			if (fs.statSync(hintPath).isFile()) {
				startDir = path.dirname(hintPath);
			}
		} catch (error) {
			// Missing hint path: fall through and treat it as a directory candidate.
		}
		const hintRoot = tryChain("hint", startDir);
		if (hintRoot) {
			return { ...found, ctuHome: hintRoot, source: "hint" };
		}
	}

	// 2. Install pointer written next to the skill by `node install.js`.
	const pointer = readPointer(skillRoot);
	if (pointer) {
		if (pointer.value) {
			const pointerRoot = tryDir("skill-pointer", pointer.value);
			if (pointerRoot) {
				return { ...found, ctuHome: pointerRoot, source: "skill-pointer", pointerFile: path.join(skillRoot, POINTER_FILE) };
			}
		} else {
			attempts.push({
				source: "skill-pointer",
				dir: path.join(skillRoot, POINTER_FILE),
				ok: false,
				missing: SENTINELS.slice(),
				note: pointer.invalid
			});
		}
	}

	// 3. CTU_HOME environment variable.
	const envHome = opts.envHome !== undefined ? opts.envHome : process.env.CTU_HOME;
	if (envHome) {
		const envRoot = tryDir("env CTU_HOME", expandHome(String(envHome)));
		if (envRoot) {
			return { ...found, ctuHome: envRoot, source: "env CTU_HOME" };
		}
	} else {
		attempts.push({ source: "env CTU_HOME", dir: "", ok: false, missing: SENTINELS.slice(), note: "not set" });
	}

	// 4. The repository that bundles this skill: <repo>/skills/code-to-uml/scripts -> repo.
	const bundledRoots = [path.resolve(skillRoot, "..", "..")];
	try {
		const realSkillRoot = fs.realpathSync(skillRoot);
		const realBundledRoot = path.resolve(realSkillRoot, "..", "..");
		if (realBundledRoot !== bundledRoots[0]) {
			bundledRoots.push(realBundledRoot);
		}
	} catch (error) {
		// realpath unavailable: bundled candidate already queued.
	}
	for (const bundledRoot of bundledRoots) {
		const repoRoot = tryDir("skill-repo (bundled)", bundledRoot);
		if (repoRoot) {
			return { ...found, ctuHome: repoRoot, source: "skill-repo (bundled)" };
		}
	}

	// 5. Working directory and its ancestors.
	const cwd = opts.cwd || process.cwd();
	const cwdRoot = tryChain("cwd ancestors", cwd);
	if (cwdRoot) {
		return { ...found, ctuHome: cwdRoot, source: "cwd ancestors" };
	}

	// 6. Shell profile markers written by `node install.js` (non-Windows only).
	for (const candidate of readProfileCandidates(opts.homeDir)) {
		const profileRoot = tryDir("shell-profile", candidate);
		if (profileRoot) {
			return { ...found, ctuHome: profileRoot, source: "shell-profile" };
		}
	}

	return { ok: false, ctuHome: null, source: null, skillRoot, attempts };
}

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/resolve-ctu-home.js [--hint <path>] [--json]

Resolves the absolute Code-To-UML root (CTU_HOME) and prints:
  CTU_HOME=<absolute path>
  Source: <candidate that produced the root>

Candidate order (each must contain cache/_TEMPLATE.html, data/_TEMPLATE.ctu,
demo.html, and serve.js):
  1. --hint path (directory, or file whose ancestors contain the root)
  2. ctu-home.json pointer written by node install.js next to the skill
  3. CTU_HOME environment variable
  4. the repository that bundles this skill
  5. working directory and ancestors
  6. shell profile markers written by node install.js

Options:
  --hint <path>  Explicit root, user-provided path, or report file to search from.
  --json         Print the full resolution result as JSON.
  --help         Show this help.

Exit codes: 0 when CTU_HOME is resolved, 1 with diagnostics when it is not.`);
}

function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			args.help = true;
			continue;
		}
		if (arg === "--json") {
			args.json = true;
			continue;
		}
		if (arg === "--hint") {
			const value = argv[++i];
			if (!value) {
				throw new Error("--hint requires a path");
			}
			args.hint = value;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return args;
}

function formatAttempts(attempts) {
	return attempts.map((attempt, index) => {
		const where = attempt.dir ? attempt.dir : "(no path)";
		const state = attempt.ok
			? "OK"
			: (attempt.note ? `skipped (${attempt.note})` : `missing: ${attempt.missing.join(", ")}`);
		return `  ${index + 1}. ${attempt.source}: ${where} - ${state}`;
	}).join("\n");
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}
	const result = resolveCtuHome({ hint: args.hint });
	if (args.json) {
		console.log(JSON.stringify(result, null, 2));
	} else if (result.ok) {
		console.log(`CTU_HOME=${result.ctuHome}`);
		console.log(`Source: ${result.source}`);
		console.log(`Skill root: ${result.skillRoot}`);
		console.log(`Sentinels: OK (${SENTINELS.join(", ")})`);
	} else {
		console.error("Cannot resolve CTU_HOME.");
		console.error("Checked candidates:");
		console.error(formatAttempts(result.attempts));
		console.error("");
		console.error("Fix options:");
		console.error("  1. Run `node install.js` inside the Code-To-UML repository to (re)install the skill and refresh the root pointer.");
		console.error("  2. Re-run with --hint <absolute-code-to-uml-root> (or a report file inside it).");
		console.error("  3. Prefix the command with an explicit variable: CTU_HOME=<absolute-root> node <script>.");
		console.error("");
		console.error("Do not create cache/ or data/ report directories anywhere else.");
		console.error("A report outside the resolved CTU root cannot load ../main.css, ../demo.js, and ../js/... assets, so it renders without styles or scripts.");
	}
	process.exitCode = result.ok ? 0 : 1;
}

module.exports = { resolveCtuHome, checkRoot, SENTINELS, POINTER_FILE };

if (require.main === module) {
	try {
		main();
	} catch (error) {
		console.error(`[ERROR] ${error.message}`);
		process.exitCode = 1;
	}
}
