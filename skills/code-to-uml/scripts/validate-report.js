#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { TextDecoder } = require("util");

const DEFAULT_LANG = "zh";
const VALID_NAME_RE = /^[A-Za-z0-9_-]+$/;
const CTU_FILE_RE = /^([A-Za-z0-9_-]+)--([1-9][0-9]*)_(zh|en)\.ctu$/;
const SEP_RE = /^-{60,}\s*$/m;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/validate-report.js --html cache/report.html [options]

Options:
  --root <path>       Code-To-UML root. Defaults to CTU_HOME, then cwd when templates exist.
  --html <path>       Report HTML path, absolute or relative to root.
  --data-dir <path>   Data directory path or report slug. Defaults to body[data-dir].
  --lang <zh|en>      Language suffix to validate. Default: ${DEFAULT_LANG}.
  --render            Render non-empty UML blocks with plantuml.jar when available.
  --strict            Treat warnings as failures.
  --help              Show this help.
`);
}

function parseArgs(argv) {
	const args = {
		lang: DEFAULT_LANG,
		render: false,
		strict: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			args.help = true;
			continue;
		}
		if (arg === "--render") {
			args.render = true;
			continue;
		}
		if (arg === "--strict") {
			args.strict = true;
			continue;
		}
		if (["--root", "--html", "--data-dir", "--lang"].includes(arg)) {
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

function exists(filePath) {
	return fs.existsSync(filePath);
}

function isCtuRoot(dir) {
	return exists(path.join(dir, "cache", "_TEMPLATE.html")) && exists(path.join(dir, "data", "_TEMPLATE.ctu"));
}

function resolveRoot(inputRoot) {
	if (inputRoot) {
		return path.resolve(inputRoot);
	}
	if (process.env.CTU_HOME && isCtuRoot(process.env.CTU_HOME)) {
		return path.resolve(process.env.CTU_HOME);
	}
	if (isCtuRoot(process.cwd())) {
		return process.cwd();
	}
	throw new Error("Cannot resolve Code-To-UML root. Pass --root or set CTU_HOME.");
}

function resolveUnderRoot(root, inputPath) {
	if (!inputPath) {
		return "";
	}
	return path.isAbsolute(inputPath) ? inputPath : path.join(root, inputPath);
}

function readText(filePath, issues) {
	const bytes = fs.readFileSync(filePath);
	let text = "";
	let invalidUtf8 = false;
	try {
		text = UTF8_DECODER.decode(bytes);
	} catch {
		invalidUtf8 = true;
		text = bytes.toString("utf8");
	}
	if (issues && invalidUtf8) {
		addIssue(issues, "error", filePath, "File is not valid UTF-8. On Windows, write reports with explicit UTF-8 encoding; do not use the shell default ANSI/GBK encoding.");
	} else if (issues && text.includes("\uFFFD")) {
		addIssue(issues, "error", filePath, "File contains Unicode replacement characters, which usually means text was decoded with the wrong encoding before writing.");
	}
	return text;
}

function normalizeField(value) {
	const trimmed = String(value || "").trim();
	return /^none$/i.test(trimmed) ? "" : trimmed;
}

function addIssue(issues, kind, file, message) {
	issues.push({ kind, file, message });
}

function parseAttrs(tag) {
	const attrs = {};
	const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	let match;
	while ((match = re.exec(tag)) !== null) {
		attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
	}
	return attrs;
}

function hasClass(attrs, className) {
	return String(attrs.class || "").split(/\s+/).includes(className);
}

function extractTags(html, tagName) {
	const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
	const tags = [];
	let match;
	while ((match = re.exec(html)) !== null) {
		const tag = match[0];
		tags.push({ tag, attrs: parseAttrs(tag), index: match.index });
	}
	return tags;
}

function extractBodyAttrs(html) {
	const match = /<body\b[^>]*>/i.exec(html);
	return match ? parseAttrs(match[0]) : null;
}

function validateHtml(root, htmlPath, issues) {
	if (!exists(htmlPath)) {
		addIssue(issues, "error", htmlPath, "HTML file does not exist.");
		return null;
	}

	const html = readText(htmlPath, issues);
	const bodyAttrs = extractBodyAttrs(html);
	if (!bodyAttrs) {
		addIssue(issues, "error", htmlPath, "Missing <body> tag.");
		return null;
	}
	if (!hasClass(bodyAttrs, "demo-page")) {
		addIssue(issues, "error", htmlPath, "body must include class=\"demo-page\".");
	}

	const reportSlug = bodyAttrs["data-dir"] || "";
	if (!reportSlug) {
		addIssue(issues, "error", htmlPath, "Missing body data-dir for custom report data.");
	} else if (!VALID_NAME_RE.test(reportSlug)) {
		addIssue(issues, "error", htmlPath, `body data-dir contains unsupported characters: ${reportSlug}`);
	}

	const selectorChecks = [
		[/<main\b[^>]*class=["'][^"']*\bcontent\b/i, "Missing main.content runtime container."],
		[/<nav\b[^>]*class=["'][^"']*\bdemo-tabs\b/i, "Missing nav.demo-tabs runtime container."],
		[/\bid=["']demo-title["']/i, "Missing #demo-title runtime heading."],
		[/\bdata-examples\b/i, "Missing [data-examples] runtime container."],
		[/\bdata-demo-toc\b/i, "Missing [data-demo-toc] runtime container."]
	];
	for (const [re, message] of selectorChecks) {
		if (!re.test(html)) {
			addIssue(issues, "error", htmlPath, message);
		}
	}

	const buttons = extractTags(html, "button")
		.filter(({ attrs }) => hasClass(attrs, "demo-tab") && attrs["data-diagram"])
		.map(({ attrs }) => ({ category: attrs["data-diagram"], active: hasClass(attrs, "is-active") }));
	const overviews = extractTags(html, "p")
		.filter(({ attrs }) => hasClass(attrs, "demo-section-overview") && attrs["data-diagram-overview"])
		.map(({ attrs }) => ({ category: attrs["data-diagram-overview"], active: hasClass(attrs, "is-active") }));

	if (buttons.length === 0) {
		addIssue(issues, "error", htmlPath, "No .demo-tab[data-diagram] buttons found.");
	}
	const activeTabs = buttons.filter((button) => button.active);
	if (activeTabs.length !== 1) {
		addIssue(issues, "error", htmlPath, `Expected exactly one active tab, found ${activeTabs.length}.`);
	}

	const tabSet = new Set(buttons.map((button) => button.category));
	if (tabSet.size !== buttons.length) {
		addIssue(issues, "error", htmlPath, "Duplicate tab data-diagram values found.");
	}
	const overviewSet = new Set(overviews.map((overview) => overview.category));
	if (overviewSet.size !== overviews.length) {
		addIssue(issues, "error", htmlPath, "Duplicate overview data-diagram-overview values found.");
	}

	for (const category of tabSet) {
		if (!VALID_NAME_RE.test(category)) {
			addIssue(issues, "error", htmlPath, `Tab category contains unsupported characters: ${category}`);
		}
		if (!overviewSet.has(category)) {
			addIssue(issues, "error", htmlPath, `Missing overview for tab category: ${category}`);
		}
	}
	for (const category of overviewSet) {
		if (!tabSet.has(category)) {
			addIssue(issues, "error", htmlPath, `Overview has no matching tab category: ${category}`);
		}
	}

	const officialLinkTag = extractTags(html, "a").find(({ attrs }) => attrs.id === "official-demo-link");
	if (officialLinkTag) {
		const href = officialLinkTag.attrs.href || "";
		if (!href || href === "#" || /placeholder/i.test(href)) {
			addIssue(issues, "error", htmlPath, "official-demo-link exists but does not have a truthful href.");
		}
	}

	return {
		html,
		reportSlug,
		tabs: buttons.map((button) => button.category),
		overviews: overviews.map((overview) => overview.category)
	};
}

function extractField(group, marker, nextMarkers) {
	const startRe = new RegExp(`^\\[${marker}\\]\\s*$`, "m");
	const startMatch = startRe.exec(group);
	if (!startMatch) {
		return null;
	}
	const start = startMatch.index + startMatch[0].length;
	let end = group.length;
	for (const nextMarker of nextMarkers) {
		const re = new RegExp(`^\\[${nextMarker}\\]\\s*$`, "m");
		const match = re.exec(group.slice(start));
		if (match) {
			end = Math.min(end, start + match.index);
		}
	}
	return group.slice(start, end).trim();
}

function parseCtuFile(filePath, issues) {
	const text = readText(filePath, issues);
	if (!SEP_RE.test(text)) {
		addIssue(issues, "error", filePath, "Missing separator line with at least 60 hyphens.");
		return [];
	}

	const firstSep = text.search(SEP_RE);
	const header = text.slice(0, firstSep);
	if (!/^Title:\s*/m.test(header)) {
		addIssue(issues, "error", filePath, "Missing Title header.");
	}
	if (!/^Describe:\s*/m.test(header)) {
		addIssue(issues, "error", filePath, "Missing Describe header.");
	}

	const groups = text.split(/^-{60,}\s*$/m).slice(1);
	const cards = [];
	for (let index = 0; index < groups.length; index++) {
		const group = groups[index].trim();
		if (!group) {
			continue;
		}

		const markerMatches = [...group.matchAll(/^\[(Example|Description|UML|Detail)\]\s*$/gm)].map((match) => match[1]);
		const expected = ["Example", "Description", "UML", "Detail"];
		for (const marker of expected) {
			if (!markerMatches.includes(marker)) {
				addIssue(issues, "error", filePath, `Card ${index + 1} is missing [${marker}].`);
			}
		}
		const markerOrder = markerMatches.join(">");
		if (markerMatches.length >= 4 && markerOrder !== expected.join(">")) {
			addIssue(issues, "error", filePath, `Card ${index + 1} marker order should be ${expected.join(">")}, found ${markerOrder}.`);
		}

		const uml = normalizeField(extractField(group, "UML", ["Detail"]));
		const detail = normalizeField(extractField(group, "Detail", []));
		if (uml && !detail) {
			addIssue(issues, "warning", filePath, `Card ${index + 1} has UML but no [Detail] explanation.`);
		}

		cards.push({ index: index + 1, uml, detail });
	}

	if (cards.length === 0) {
		addIssue(issues, "error", filePath, "No cards found after the header separator.");
	}

	return cards;
}

function listCtuFiles(dataDir, lang, issues) {
	if (!exists(dataDir)) {
		addIssue(issues, "error", dataDir, "Data directory does not exist.");
		return [];
	}

	const entries = fs.readdirSync(dataDir, { withFileTypes: true });
	const allCtuFiles = entries
		.filter((entry) => entry.isFile() && entry.name.endsWith(".ctu"))
		.map((entry) => entry.name);

	if (allCtuFiles.length === 0) {
		addIssue(issues, "error", dataDir, "No .ctu files found.");
		return [];
	}

	for (const fileName of allCtuFiles) {
		if (!CTU_FILE_RE.test(fileName)) {
			addIssue(issues, "error", path.join(dataDir, fileName), "Filename must match {category}--{n}_{lang}.ctu.");
		}
	}

	const langFiles = allCtuFiles.filter((fileName) => fileName.endsWith(`_${lang}.ctu`));
	if (langFiles.length === 0) {
		addIssue(issues, "warning", dataDir, `No _${lang}.ctu files found; validating all .ctu files instead.`);
		return allCtuFiles;
	}

	return langFiles;
}

function validateUmlBlock(uml, filePath, cardIndex, issues) {
	const lines = uml.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const first = lines[0] || "";
	const last = lines[lines.length - 1] || "";
	const startMatch = /^@start([A-Za-z0-9_]*)\b/.exec(first);
	const endMatch = /^@end([A-Za-z0-9_]*)\b/.exec(last);

	if (!startMatch) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} UML must start with @start...`);
	}
	if (!endMatch) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} UML must end with @end...`);
	}
	if (startMatch && endMatch && startMatch[1].toLowerCase() !== endMatch[1].toLowerCase()) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} UML start/end tags do not match.`);
	}

	const delimiters = [
		["{", "}"],
		["(", ")"]
	];
	for (const [open, close] of delimiters) {
		let count = 0;
		for (const char of uml) {
			if (char === open) {
				count++;
			} else if (char === close) {
				count--;
			}
			if (count < 0) {
				addIssue(issues, "error", filePath, `Card ${cardIndex} UML has an unmatched ${close}.`);
				break;
			}
		}
		if (count > 0) {
			addIssue(issues, "error", filePath, `Card ${cardIndex} UML has ${count} unmatched ${open} delimiter(s).`);
		}
	}

	if (/[<>]/.test(uml)) {
		addIssue(issues, "warning", filePath, `Card ${cardIndex} UML contains raw < or > characters; verify escaping.`);
	}
	if (/\bcontinue\b/i.test(uml)) {
		addIssue(issues, "warning", filePath, `Card ${cardIndex} UML contains "continue"; prefer explicit activity wording.`);
	}
}

function renderUmlBlock(root, uml, filePath, cardIndex, issues) {
	const jarPath = path.join(root, "plantuml.jar");
	if (!exists(jarPath)) {
		addIssue(issues, "warning", jarPath, "plantuml.jar not found; skipped render validation.");
		return;
	}

	const result = spawnSync("java", ["-jar", jarPath, "--svg", "-pipe"], {
		input: uml,
		encoding: "utf8",
		cwd: root,
		maxBuffer: 1024 * 1024 * 8
	});

	if (result.error) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} PlantUML render failed: ${result.error.message}`);
		return;
	}
	if (result.status !== 0) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} PlantUML render exited with ${result.status}: ${String(result.stderr || "").trim()}`);
		return;
	}
	if (!String(result.stdout || "").trim().startsWith("<svg")) {
		addIssue(issues, "error", filePath, `Card ${cardIndex} PlantUML render did not return SVG output.`);
	}
}

function validateData(root, dataDir, tabs, lang, render, issues) {
	const fileNames = listCtuFiles(dataDir, lang, issues);
	const categories = new Set();
	let cardCount = 0;
	let umlCount = 0;

	for (const fileName of fileNames) {
		const match = CTU_FILE_RE.exec(fileName);
		if (match) {
			categories.add(match[1]);
		}
		const filePath = path.join(dataDir, fileName);
		const cards = parseCtuFile(filePath, issues);
		cardCount += cards.length;
		for (const card of cards) {
			if (!card.uml) {
				continue;
			}
			umlCount++;
			validateUmlBlock(card.uml, filePath, card.index, issues);
			if (render) {
				renderUmlBlock(root, card.uml, filePath, card.index, issues);
			}
		}
	}

	if (tabs && tabs.length) {
		const tabSet = new Set(tabs);
		for (const tab of tabSet) {
			if (!categories.has(tab)) {
				addIssue(issues, "error", dataDir, `Tab category has no matching _${lang}.ctu file: ${tab}`);
			}
		}
		for (const category of categories) {
			if (!tabSet.has(category)) {
				addIssue(issues, "error", dataDir, `Data category has no matching tab: ${category}`);
			}
		}
	}

	return { categories: [...categories], cardCount, umlCount };
}

function printIssues(issues) {
	const sorted = issues.slice().sort((a, b) => {
		if (a.kind !== b.kind) {
			return a.kind === "error" ? -1 : 1;
		}
		return `${a.file}${a.message}`.localeCompare(`${b.file}${b.message}`);
	});
	for (const issue of sorted) {
		console.log(`[${issue.kind.toUpperCase()}] ${issue.file}: ${issue.message}`);
	}
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printUsage();
		return;
	}
	if (!args.html) {
		throw new Error("--html is required.");
	}

	const root = resolveRoot(args.root);
	const htmlPath = resolveUnderRoot(root, args.html);
	const issues = [];
	const htmlInfo = validateHtml(root, htmlPath, issues);

	let dataDir = "";
	if (args.dataDir) {
		dataDir = VALID_NAME_RE.test(args.dataDir) ? path.join(root, "data", args.dataDir) : resolveUnderRoot(root, args.dataDir);
	} else if (htmlInfo && htmlInfo.reportSlug) {
		dataDir = path.join(root, "data", htmlInfo.reportSlug);
	}

	let dataSummary = { categories: [], cardCount: 0, umlCount: 0 };
	if (dataDir) {
		dataSummary = validateData(root, dataDir, htmlInfo ? htmlInfo.tabs : [], args.lang, args.render, issues);
	} else {
		addIssue(issues, "error", root, "Cannot resolve data directory. Pass --data-dir or set body data-dir.");
	}

	const errors = issues.filter((issue) => issue.kind === "error");
	const warnings = issues.filter((issue) => issue.kind === "warning");
	printIssues(issues);

	console.log(`Validated report: ${path.relative(root, htmlPath) || htmlPath}`);
	console.log(`Data directory: ${dataDir ? path.relative(root, dataDir) : "(unresolved)"}`);
	console.log(`Categories: ${dataSummary.categories.length ? dataSummary.categories.join(", ") : "(none)"}`);
	console.log(`Cards: ${dataSummary.cardCount}`);
	console.log(`Non-empty UML blocks: ${dataSummary.umlCount}`);
	console.log(`Errors: ${errors.length}`);
	console.log(`Warnings: ${warnings.length}`);

	if (errors.length || (args.strict && warnings.length)) {
		process.exitCode = 1;
	}
}

try {
	main();
} catch (error) {
	console.error(`[ERROR] ${error.message}`);
	process.exitCode = 1;
}
