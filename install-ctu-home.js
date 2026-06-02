#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname);
const VAR_NAME = "CTU_HOME";
const MARKER_START = "# >>> code-to-uml CTU_HOME >>>";
const MARKER_END = "# <<< code-to-uml CTU_HOME <<<";
const SKILL_NAME = "code-to-uml";
const SKILL_SOURCE_DIR = path.join(PROJECT_ROOT, "skills", SKILL_NAME);
const TOOL_SKILL_DIRS = {
	codex: [".codex", "skills"],
	claude: [".claude", "skills"],
	opencode: [".config", "opencode", "skills"],
	openclaw: [".openclaw", "skills"],
	hermes: [".hermes", "skills"],
	qoder: [".qoder", "skills"],
	qwen: [".qwen", "skills"],
	vscode: [".copilot", "skills"],
	trae: [".trae", "skills"],
};

function usage() {
	console.log(`Usage:
  node install-ctu-home.js [tool ...] [--profile <file>] [--print]
  node install-ctu-home.js codex
  node install-ctu-home.js claude vscode

Sets ${VAR_NAME} to this project root:
  ${PROJECT_ROOT}

Installs the bundled ${SKILL_NAME} skill. If no tool is specified, installs for all supported tools.

Supported tools:
  ${Object.keys(TOOL_SKILL_DIRS).join(", ")}

Options:
  --profile <file>  macOS/Linux shell profile to update.
  --print           Print a command for the current shell instead of writing user config.
  --help            Show this help.

Notes:
  - This script does not add anything to PATH.
  - Open a new terminal after installation, or use --print for the current shell.`);
}

function parseArgs(argv) {
	const out = { print: false, profile: "", tools: [] };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			out.help = true;
		} else if (arg === "--print") {
			out.print = true;
		} else if (arg === "--profile") {
			i += 1;
			if (!argv[i]) throw new Error("--profile requires a file path");
			out.profile = argv[i];
		} else {
			out.tools.push(normalizeToolName(arg));
		}
	}
	if (!out.tools.length) {
		out.tools = Object.keys(TOOL_SKILL_DIRS);
	}
	for (const tool of out.tools) {
		if (!Object.prototype.hasOwnProperty.call(TOOL_SKILL_DIRS, tool)) {
			throw new Error(`Unknown tool '${tool}'. Supported tools: ${Object.keys(TOOL_SKILL_DIRS).join(", ")}`);
		}
	}
	out.tools = Array.from(new Set(out.tools));
	return out;
}

function normalizeToolName(name) {
	return String(name || "").trim().toLowerCase();
}

function expandHome(filePath) {
	if (filePath === "~") return os.homedir();
	if (filePath.startsWith("~/") || filePath.startsWith("~\\")) {
		return path.join(os.homedir(), filePath.slice(2));
	}
	return filePath;
}

function userDir() {
	return os.homedir();
}

function copyDirectory(source, target) {
	const stat = fs.statSync(source);
	if (!stat.isDirectory()) {
		throw new Error(`Skill source is not a directory: ${source}`);
	}
	fs.mkdirSync(target, { recursive: true });
	for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
		const from = path.join(source, entry.name);
		const to = path.join(target, entry.name);
		if (entry.isDirectory()) {
			copyDirectory(from, to);
		} else if (entry.isFile()) {
			fs.copyFileSync(from, to);
		}
	}
}

function promptYesNo(question) {
	process.stdout.write(question);
	const chunks = [];
	const buffer = Buffer.alloc(1);
	while (true) {
		let bytesRead = 0;
		try {
			bytesRead = fs.readSync(0, buffer, 0, 1, null);
		} catch (err) {
			if (err && err.code === "EAGAIN") continue;
			throw err;
		}
		if (bytesRead === 0) break;
		const char = buffer.toString("utf8", 0, bytesRead);
		if (char === "\n") break;
		if (char === "\r") continue;
		chunks.push(char);
	}
	const answer = chunks.join("").trim().toLowerCase();
	return answer === "y" || answer === "yes";
}

function skillBaseDir(tool) {
	return path.join(userDir(), ...TOOL_SKILL_DIRS[tool]);
}

function installSkill(tool) {
	if (!fs.existsSync(path.join(SKILL_SOURCE_DIR, "SKILL.md"))) {
		throw new Error(`Bundled skill not found: ${SKILL_SOURCE_DIR}`);
	}
	const baseDir = skillBaseDir(tool);
	const target = path.join(baseDir, SKILL_NAME);
	fs.mkdirSync(baseDir, { recursive: true });
	if (fs.existsSync(target)) {
		console.log(`Skill for ${tool} already exists at ${target}.`);
		if (!promptYesNo("Overwrite? [y/N] ")) {
			console.log(`Skipped ${SKILL_NAME} skill for ${tool}: ${target}`);
			return false;
		}
		fs.rmSync(target, { recursive: true, force: true });
		copyDirectory(SKILL_SOURCE_DIR, target);
		console.log(`Overwritten ${SKILL_NAME} skill for ${tool}: ${target}`);
		return true;
	}
	copyDirectory(SKILL_SOURCE_DIR, target);
	console.log(`Installed ${SKILL_NAME} skill for ${tool}: ${target}`);
	return true;
}

function installSkills(tools) {
	for (const tool of tools) {
		installSkill(tool);
	}
}

function shellQuote(value) {
	return `'${String(value).replace(/'/g, "'\"'\"'")}'`;
}

function powershellQuote(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function defaultUnixProfile() {
	const shell = path.basename(process.env.SHELL || "");
	const home = os.homedir();
	if (shell === "zsh") return path.join(home, ".zshrc");
	if (shell === "bash") return path.join(home, process.platform === "darwin" ? ".bash_profile" : ".bashrc");
	return path.join(home, ".profile");
}

function printCurrentShellCommand() {
	if (process.platform === "win32") {
		console.log(`Command Prompt:\nset "${VAR_NAME}=${PROJECT_ROOT}"`);
		console.log(`\nPowerShell:\n$env:${VAR_NAME} = ${powershellQuote(PROJECT_ROOT)}`);
		return;
	}
	console.log(`export ${VAR_NAME}=${shellQuote(PROJECT_ROOT)}`);
}

function installUnix(profilePath) {
	const target = path.resolve(expandHome(profilePath || defaultUnixProfile()));
	fs.mkdirSync(path.dirname(target), { recursive: true });
	const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
	const block = `${MARKER_START}\nexport ${VAR_NAME}=${shellQuote(PROJECT_ROOT)}\n${MARKER_END}\n`;
	const pattern = new RegExp(`\\n?${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}\\n?`, "g");
	const cleaned = current.replace(pattern, "\n").replace(/\s+$/g, "");
	const next = `${cleaned ? `${cleaned}\n\n` : ""}${block}`;
	fs.writeFileSync(target, next);
	console.log(`${VAR_NAME}=${PROJECT_ROOT}`);
	console.log(`Updated shell profile: ${target}`);
	console.log("Open a new terminal, or run:");
	console.log(`  export ${VAR_NAME}=${shellQuote(PROJECT_ROOT)}`);
}

function installWindows() {
	const command = `[Environment]::SetEnvironmentVariable(${powershellQuote(VAR_NAME)}, ${powershellQuote(PROJECT_ROOT)}, 'User')`;
	const result = spawnSync("powershell.exe", [
		"-NoProfile",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		command,
	], { encoding: "utf8" });

	if (result.error || result.status !== 0) {
		const fallback = spawnSync("setx", [VAR_NAME, PROJECT_ROOT], { encoding: "utf8" });
		if (fallback.error || fallback.status !== 0) {
			const stderr = (result.stderr || fallback.stderr || "").trim();
			throw new Error(stderr || `Failed to set ${VAR_NAME}`);
		}
	}

	console.log(`${VAR_NAME}=${PROJECT_ROOT}`);
	console.log("Updated the user environment variable. Open a new terminal to use it.");
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}
	if (args.print) {
		printCurrentShellCommand();
		return;
	}
	if (process.platform === "win32") {
		installWindows();
	} else {
		installUnix(args.profile);
	}
	installSkills(args.tools);
}

try {
	main();
} catch (err) {
	console.error(`Error: ${err && err.message ? err.message : err}`);
	process.exit(1);
}
