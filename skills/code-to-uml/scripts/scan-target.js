#!/usr/bin/env node
"use strict";

// Mechanical pre-analysis of an analysis target (file or directory) for
// Code-To-UML report planning. Zero-dependency heuristics only: file and line
// counts, per-language symbol-definition estimates, import/call/async/branch/
// error signal counts, advanced-feature detection, and the six-dimension
// complexity score from references/report-contract.md (Coverage Depth Gate).
//
// The counts are heuristics, not a parser: use them as the evidence baseline
// and first scoring pass, then correct the score by reading the code. User
// intent always wins over the suggested scope.
//
// Usage:
//   node scan-target.js --target <file-or-dir> [--max-files <n>] [--json]

const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_FILES = 400;
const LARGE_FILE_BYTES = 2 * 1024 * 1024;

const IGNORED_DIRS = new Set([
	"node_modules", ".git", ".hg", ".svn", "dist", "build", "out", "target",
	"vendor", "__pycache__", ".venv", "venv", "coverage", ".next", ".nuxt",
	".cache", ".idea", ".vscode", "logs", "tmp"
]);

const SOURCE_EXTENSIONS = new Set([
	".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
	".py", ".java", ".kt", ".kts", ".scala", ".cs", ".go", ".rs", ".rb",
	".php", ".c", ".h", ".cc", ".cpp", ".hpp", ".swift", ".dart", ".lua",
	".pl", ".sh", ".bash", ".sql"
]);

const LANGUAGE_OF_EXTENSION = {
	".js": "js", ".mjs": "js", ".cjs": "js", ".jsx": "js", ".ts": "js",
	".tsx": "js", ".vue": "js", ".svelte": "js",
	".py": "py",
	".go": "go",
	".rs": "rust",
	".java": "jvm", ".kt": "jvm", ".kts": "jvm", ".scala": "jvm", ".cs": "jvm",
	".rb": "ruby",
	".php": "php"
};

const SYMBOL_RULES = {
	js: [
		/\b(?:class|function)\s+([A-Za-z_$][\w$]*)/g,
		/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g
	],
	py: [
		/\bdef\s+([A-Za-z_]\w*)/g,
		/\bclass\s+([A-Za-z_]\w*)/g
	],
	go: [
		/\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/g,
		/\btype\s+([A-Za-z_]\w*)\s+(?:struct|interface)/g
	],
	rust: [
		/\bfn\s+([A-Za-z_]\w*)/g,
		/\b(?:struct|enum|trait)\s+([A-Za-z_]\w*)/g
	],
	jvm: [
		/\b(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/g,
		/\b(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[\w<>\[\],.]+(?:[ \t]+[\w<>\[\],.]+)*\s+([A-Za-z_]\w*)\s*\(/g
	],
	ruby: [
		/\bdef\s+([A-Za-z_]\w*[?!]?)/g,
		/\bclass\s+([A-Za-z_]\w*)/g
	],
	php: [
		/\bfunction\s+([A-Za-z_]\w*)/g,
		/\bclass\s+([A-Za-z_]\w*)/g
	]
};

const SIGNAL_RULES = {
	imports: /^\s*(?:import\s|from\s+\S+\s+import\s|#include\b|use\s+[\w\\:]+|require\s*\()/gm,
	callSites: /[A-Za-z_$][\w$]*\s*\(/g,
	asyncSignals: /\b(?:async|await|goroutine|asyncio|concurrent)\b|\.then\s*\(|Promise\b|threads?\b|\bThread\b|\btokio\b|worker_threads|\bgo\s+[A-Za-z_]\w*\s*\(/gi,
	branches: /\b(?:if|else\s+if|elif|switch|case|when)\b/g,
	errorSignals: /\b(?:try|catch|except|throw|raise|rescue|finally|reject)\b/g
};

const ADVANCED_RULES = {
	persistence: /\bfs\.|readFile|writeFile|open\s*\(|\bSELECT\s|\bINSERT\s|\bUPDATE\s|\bDELETE\s+FROM|redis|memcach|mongo|postgres|mysql|sqlite|database|\bdb\b|migration|localStorage|sessionStorage|indexedDB|prisma|sequelize|typeorm/gi,
	security: /\b(?:auth|permission|token|password|credential|acl|rbac|jwt|oauth|sanitize|encrypt|hash|csrf|xss)\b/gi,
	stateMachine: /\b(?:state machine|fsm|transition|workflow|stateMap|reducer|dispatch)\b|\bstate\s*=/gi,
	externalIntegrations: /\b(?:http|https|axios|grpc|webhook|sdk|endpoint)\b|fetch\s*\(|api\b/gi,
	errorRecovery: /\b(?:retry|retries|backoff|circuit breaker|fallback|recover|compensat)/gi
};

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/scan-target.js --target <file-or-dir> [options]

Mechanically scans an analysis target and prints the six-dimension complexity
score (references/report-contract.md), signal counts, and the file evidence
baseline for report planning.

Options:
  --target <path>      File or directory to scan. Required.
  --max-files <n>      Stop collecting source files after n files. Default: ${DEFAULT_MAX_FILES}.
  --json               Print a machine-readable result.
  --help               Show this help.

Counts are heuristics: treat them as the first scoring pass and correctness
baseline, then adjust the score by reading the code. User intent decides the
scope; the printed suggestion is only a hint.`);
}

function parseArgs(argv) {
	const args = { maxFiles: DEFAULT_MAX_FILES, json: false };
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
		if (["--target", "--max-files"].includes(arg)) {
			const value = argv[++i];
			if (!value) {
				throw new Error(`Missing value for ${arg}`);
			}
			args[arg.slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return args;
}

function countMatches(text, regex) {
	const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
	const re = new RegExp(regex.source, flags);
	let count = 0;
	while (re.exec(text) !== null) {
		count += 1;
	}
	return count;
}

function collectSymbols(text, language) {
	const rules = SYMBOL_RULES[language];
	if (!rules) {
		return [];
	}
	const names = new Set();
	for (const rule of rules) {
		const flags = rule.flags.includes("g") ? rule.flags : `${rule.flags}g`;
		const re = new RegExp(rule.source, flags);
		let match;
		while ((match = re.exec(text)) !== null) {
			if (match[1]) {
				names.add(match[1]);
			}
		}
	}
	return [...names];
}

function walk(target, collected, state) {
	const entries = fs.readdirSync(target, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".") && entry.name !== ".") {
			if (entry.isDirectory()) {
				state.ignoredDirs += 1;
			}
			continue;
		}
		const absolute = path.join(target, entry.name);
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.has(entry.name)) {
				state.ignoredDirs += 1;
				continue;
			}
			walk(absolute, collected, state);
			continue;
		}
		if (!entry.isFile()) {
			continue;
		}
		const extension = path.extname(entry.name).toLowerCase();
		if (!SOURCE_EXTENSIONS.has(extension)) {
			state.skippedNonSource += 1;
			continue;
		}
		if (collected.length >= state.maxFiles) {
			state.truncated = true;
			continue;
		}
		collected.push(absolute);
	}
}

function relativeCodeSubdirs(target) {
	const entries = fs.readdirSync(target, { withFileTypes: true });
	let count = 0;
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) {
			continue;
		}
		const stack = [path.join(target, entry.name)];
		let hasCode = false;
		while (stack.length && !hasCode) {
			const current = stack.pop();
			for (const item of fs.readdirSync(current, { withFileTypes: true })) {
				if (item.isDirectory()) {
					if (!item.name.startsWith(".") && !IGNORED_DIRS.has(item.name)) {
						stack.push(path.join(current, item.name));
					}
					continue;
				}
				if (SOURCE_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
					hasCode = true;
					break;
				}
			}
		}
		if (hasCode) {
			count += 1;
		}
	}
	return count;
}

function readFileMetrics(filePath, relativePath) {
	const stats = fs.statSync(filePath);
	const language = LANGUAGE_OF_EXTENSION[path.extname(filePath).toLowerCase()] || "generic";
	const metrics = {
		path: relativePath,
		language,
		lines: 0,
		nonBlankLines: 0,
		symbols: 0,
		truncated: false
	};

	if (stats.size > LARGE_FILE_BYTES) {
		metrics.truncated = true;
		return metrics;
	}

	const text = fs.readFileSync(filePath, "utf8");
	const lines = text.split(/\r?\n/);
	metrics.lines = lines.length;
	metrics.nonBlankLines = lines.filter((line) => line.trim()).length;
	metrics.symbols = collectSymbols(text, language).length;
	metrics.text = text;
	return metrics;
}

function scoreScale(kind, fileCount, totalLines, subdirCount) {
	if (kind === "file") {
		if (totalLines < 200) {
			return { score: 0, evidence: `${totalLines} lines in a single file` };
		}
		if (totalLines < 1000) {
			return { score: 1, evidence: `${totalLines} lines in a single file` };
		}
		return { score: 2, evidence: `${totalLines} lines in a single large file` };
	}
	if (fileCount <= 2 && totalLines < 400) {
		return { score: 1, evidence: `${fileCount} file(s), ${totalLines} lines` };
	}
	if (subdirCount >= 2 || fileCount >= 10 || totalLines >= 1500) {
		return { score: 2, evidence: `${fileCount} files, ${totalLines} lines, ${subdirCount} code subdir(s)` };
	}
	return { score: 1, evidence: `${fileCount} files, ${totalLines} lines` };
}

function scoreSymbols(symbolCount) {
	if (symbolCount <= 3) {
		return { score: 0, evidence: `${symbolCount} symbol definition(s)` };
	}
	if (symbolCount <= 10) {
		return { score: 1, evidence: `${symbolCount} symbol definition(s)` };
	}
	return { score: 2, evidence: `${symbolCount} symbol definition(s)` };
}

function scoreCalls(imports, callSites, asyncSignals) {
	if (imports >= 6 || asyncSignals >= 4) {
		return { score: 2, evidence: `${imports} import(s), ${asyncSignals} async/concurrency signal(s)` };
	}
	if (imports >= 1 || callSites >= 10) {
		return { score: 1, evidence: `${imports} import(s), ${callSites} call site(s)` };
	}
	return { score: 0, evidence: `${imports} import(s), ${callSites} call site(s)` };
}

function scoreStateFlow(persistence, advanced) {
	if (persistence > 0) {
		return { score: 2, evidence: `${persistence} persistence/shared-state signal(s)` };
	}
	if (advanced.stateMachine > 0) {
		return { score: 2, evidence: `${advanced.stateMachine} state/workflow signal(s)` };
	}
	return { score: 0, evidence: "no persistence or shared-state signals" };
}

function scoreBranchError(branches, errorSignals, recovery) {
	if (recovery > 0) {
		return { score: 2, evidence: `${recovery} retry/fallback/recovery signal(s)` };
	}
	if (branches <= 3 && errorSignals === 0) {
		return { score: 0, evidence: `${branches} branch(es), ${errorSignals} error signal(s)` };
	}
	if (branches > 15 || errorSignals > 3) {
		return { score: 2, evidence: `${branches} branch(es), ${errorSignals} error signal(s)` };
	}
	return { score: 1, evidence: `${branches} branch(es), ${errorSignals} error signal(s)` };
}

function scoreSubsystems(kind, subdirCount, symbolCount) {
	if (kind === "directory") {
		if (subdirCount <= 1) {
			return { score: 0, evidence: `${subdirCount} code subdir(s)` };
		}
		if (subdirCount <= 3) {
			return { score: 1, evidence: `${subdirCount} code subdir(s)` };
		}
		return { score: 2, evidence: `${subdirCount} code subdir(s)` };
	}
	if (symbolCount <= 3) {
		return { score: 0, evidence: `${symbolCount} symbol definition(s) in one file` };
	}
	if (symbolCount <= 10) {
		return { score: 1, evidence: `${symbolCount} symbol definition(s) in one file` };
	}
	return { score: 2, evidence: `${symbolCount} symbol definition(s) in one file` };
}

function suggestScope(kind, symbolCount, totalLines, subdirCount, fileCount) {
	if (kind === "file") {
		return symbolCount <= 3 && totalLines <= 120 ? "function" : "file";
	}
	if (fileCount === 1 && symbolCount <= 3 && totalLines <= 120) {
		return "function";
	}
	if (subdirCount >= 4 || fileCount > 25) {
		return "project";
	}
	return "module";
}

async function run(args) {
	if (!args.target) {
		throw new Error("--target is required (a file or directory path).");
	}
	const maxFiles = Number.parseInt(args.maxFiles, 10);
	if (!Number.isFinite(maxFiles) || maxFiles <= 0) {
		throw new Error(`--max-files must be a positive number: ${args.maxFiles}`);
	}
	const target = path.resolve(args.target);
	if (!fs.existsSync(target)) {
		throw new Error(`--target does not exist: ${target}`);
	}
	const stats = fs.statSync(target);
	const kind = stats.isDirectory() ? "directory" : "file";

	const collected = [];
	const state = { ignoredDirs: 0, skippedNonSource: 0, truncated: false, maxFiles };
	if (kind === "file") {
		collected.push(target);
	} else {
		walk(target, collected, state);
	}

	const baseDir = kind === "directory" ? target : path.dirname(target);
	const fileMetrics = collected.map((filePath) => readFileMetrics(filePath, path.relative(baseDir, filePath)));
	const byLanguage = new Map();
	const totals = { lines: 0, nonBlankLines: 0, symbols: 0, imports: 0, callSites: 0, asyncSignals: 0, branches: 0, errorSignals: 0 };
	const advanced = { persistence: 0, security: 0, stateMachine: 0, externalIntegrations: 0, errorRecovery: 0, concurrency: 0 };

	for (const metrics of fileMetrics) {
		totals.lines += metrics.lines;
		totals.nonBlankLines += metrics.nonBlankLines;
		totals.symbols += metrics.symbols;
		let language = byLanguage.get(metrics.language);
		if (!language) {
			language = { language: metrics.language, files: 0, lines: 0, symbols: 0 };
			byLanguage.set(metrics.language, language);
		}
		language.files += 1;
		language.lines += metrics.lines;
		language.symbols += metrics.symbols;
		if (metrics.text) {
			totals.imports += countMatches(metrics.text, SIGNAL_RULES.imports);
			totals.callSites += countMatches(metrics.text, SIGNAL_RULES.callSites);
			totals.asyncSignals += countMatches(metrics.text, SIGNAL_RULES.asyncSignals);
			totals.branches += countMatches(metrics.text, SIGNAL_RULES.branches);
			totals.errorSignals += countMatches(metrics.text, SIGNAL_RULES.errorSignals);
			for (const [key, rule] of Object.entries(ADVANCED_RULES)) {
				advanced[key] += countMatches(metrics.text, rule);
			}
		}
		delete metrics.text;
	}
	advanced.concurrency = totals.asyncSignals >= 4 ? totals.asyncSignals : 0;

	const subdirCount = kind === "directory" ? relativeCodeSubdirs(target) : 0;

	const dimensions = [
		{ name: "Scale", ...scoreScale(kind, fileMetrics.length, totals.lines, subdirCount) },
		{ name: "Symbol count", ...scoreSymbols(totals.symbols) },
		{ name: "Call relationships", ...scoreCalls(totals.imports, totals.callSites, totals.asyncSignals) },
		{ name: "State/data flow", ...scoreStateFlow(advanced.persistence, advanced) },
		{ name: "Branch/error paths", ...scoreBranchError(totals.branches, totals.errorSignals, advanced.errorRecovery) },
		{ name: "Subsystem count", ...scoreSubsystems(kind, subdirCount, totals.symbols) }
	];
	const total = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
	let complexity = total <= 3 ? "low" : total <= 7 ? "medium" : "high";

	const escalation = [];
	if (totals.lines > 1000) {
		escalation.push(`${totals.lines} lines (over ~1000)`);
	}
	if (totals.symbols >= 10) {
		escalation.push(`${totals.symbols} symbol definitions (10+)`);
	}
	if (subdirCount >= 4) {
		escalation.push(`${subdirCount} independent code subdirectories (4+)`);
	}
	const advancedCategories = [
		["persistence", advanced.persistence],
		["concurrency", advanced.concurrency],
		["security", advanced.security],
		["state machines", advanced.stateMachine],
		["external integrations", advanced.externalIntegrations],
		["error recovery", advanced.errorRecovery]
	].filter(([, count]) => count > 0);
	if (advancedCategories.length >= 3) {
		escalation.push(`combines ${advancedCategories.length} advanced feature areas (${advancedCategories.map(([name]) => name).join(", ")})`);
	}
	const escalated = escalation.length > 0 && complexity !== "high";
	if (escalated) {
		complexity = "high";
	}

	const suggestedScope = suggestScope(kind, totals.symbols, totals.lines, subdirCount, fileMetrics.length);
	const filesSorted = [...fileMetrics].sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));

	const result = {
		ok: true,
		target,
		kind,
		fileCount: fileMetrics.length,
		skippedNonSource: state.skippedNonSource,
		ignoredDirs: state.ignoredDirs,
		truncated: state.truncated,
		maxFiles,
		totals,
		advanced,
		byLanguage: [...byLanguage.values()].sort((a, b) => b.lines - a.lines),
		dimensions,
		total,
		complexity,
		escalation,
		escalated,
		suggestedScope,
		files: filesSorted,
		codeSubdirs: subdirCount
	};

	if (args.json) {
		console.log(JSON.stringify(result, null, 2));
		return result;
	}

	console.log(`scan-target: ${target}`);
	console.log(`  kind      : ${kind}${state.truncated ? ` (truncated at --max-files ${maxFiles})` : ""}`);
	console.log(`  files     : ${fileMetrics.length} source file(s), ${totals.lines} lines (${totals.nonBlankLines} non-blank); skipped ${state.skippedNonSource} non-source, ignored ${state.ignoredDirs} dir(s)`);
	console.log(`  languages : ${result.byLanguage.map((item) => `${item.language} ${item.files} file(s)/${item.lines} lines/${item.symbols} symbols`).join(", ") || "(none)"}`);
	console.log(`  signals   : imports ${totals.imports}, call-sites ${totals.callSites}, async ${totals.asyncSignals}, branches ${totals.branches}, error ${totals.errorSignals}`);
	console.log(`  advanced  : persistence ${advanced.persistence}, security ${advanced.security}, state-machine ${advanced.stateMachine}, integrations ${advanced.externalIntegrations}, recovery ${advanced.errorRecovery}, concurrency ${advanced.concurrency}`);
	console.log("");
	console.log("Dimension scores (heuristic - verify by reading the code):");
	for (const dimension of dimensions) {
		console.log(`  ${dimension.name.padEnd(20)} ${dimension.score}  (${dimension.evidence})`);
	}
	console.log(`  ${"Total".padEnd(20)} ${total} -> complexity: ${complexity}`);
	if (escalation.length) {
		console.log(`  escalation triggers: ${escalation.join("; ")}${escalated ? " -> escalated to high" : ""}`);
	}
	console.log("");
	console.log(`Suggested scope: ${suggestedScope} (user intent wins; choose 'function' only when the user asks about one function)`);
	console.log("");
	console.log(`Key files by size (${Math.min(15, filesSorted.length)} of ${filesSorted.length}):`);
	for (const file of filesSorted.slice(0, 15)) {
		console.log(`  ${String(file.lines).padStart(6)}  ${file.path}  (${file.symbols} symbols)${file.truncated ? " [large file: line count only]" : ""}`);
	}
	console.log("");
	console.log("Next: use complexity and scope with plan-report.js, for example");
	console.log(`  node skills/code-to-uml/scripts/plan-report.js --root <CTU_HOME> --slug <slug> --scope ${suggestedScope} --complexity ${complexity}`);
}

if (require.main === module) {
	try {
		const args = parseArgs(process.argv.slice(2));
		if (args.help) {
			printUsage();
		} else {
			run(args).catch((error) => {
				console.error(`[ERROR] ${error.message}`);
				process.exitCode = 1;
			});
		}
	} catch (error) {
		console.error(`[ERROR] ${error.message}`);
		process.exitCode = 1;
	}
}

module.exports = { run, parseArgs, collectSymbols, countMatches };