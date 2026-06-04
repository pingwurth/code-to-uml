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
const VALID_LANGS = new Set(["zh", "en"]);
const VALID_MODES = new Set(["artifact", "compact", "full"]);
const VALID_SCOPES = new Set(["project", "module", "file", "class", "function"]);
const VALID_COMPLEXITIES = new Set(["low", "medium", "high"]);
const SECTION_IDS = [
	"S01_TARGET_OVERVIEW",
	"S02_TOP_LEVEL_STRUCTURE",
	"S03_CORE_OBJECTS",
	"S04_ARCHITECTURE",
	"S05_CORE_FLOW",
	"S06_CALL_RELATIONSHIPS",
	"S07_DATA_OR_STATE_FLOW",
	"S08_CODE_SNIPPETS",
	"S09_CORE_PRINCIPLES",
	"S10_ONBOARDING_GUIDE",
	"S11_RISKS_AND_IMPROVEMENTS",
	"S12_REVIEWER_QUESTIONS",
	"S13_MAINTAINER_REFERENCE"
];
const SCOPE_REQUIRED_SECTIONS = {
	project: SECTION_IDS,
	module: SECTION_IDS,
	file: SECTION_IDS,
	class: SECTION_IDS.filter((id) => id !== "S04_ARCHITECTURE"),
	function: SECTION_IDS.filter((id) => id !== "S04_ARCHITECTURE")
};
const COMPLEXITY_CARD_FLOORS = {
	low: { project: 13, module: 13, file: 13, class: 8, function: 5 },
	medium: { project: 20, module: 18, file: 16, class: 10, function: 6 },
	high: { project: 32, module: 26, file: 24, class: 14, function: 8 }
};
const COMPLEXITY_MULTI_CATEGORY_FLOORS = {
	low: { project: 0, module: 0, file: 0, class: 0, function: 0 },
	medium: { project: 5, module: 4, file: 3, class: 1, function: 0 },
	high: { project: 7, module: 6, file: 4, class: 2, function: 1 }
};
const COMPACT_CARD_FLOORS = {
	project: 13,
	module: 10,
	file: 8,
	class: 5,
	function: 3
};

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/validate-report.js --html cache/report.html [options]

Options:
  --root <path>       Code-To-UML root. Defaults to CTU_HOME, then cwd when templates exist.
  --html <path>       Report HTML path, absolute or relative to root.
  --data-dir <path>   Data directory path or report slug. Defaults to body[data-dir].
  --lang <zh|en>      Language suffix to validate. Default: ${DEFAULT_LANG}.
  --mode <mode>       Validation mode: artifact, compact, or full. Default: artifact.
  --scope <scope>     Content scope: project, module, file, class, or function.
  --complexity <level> Content depth level: low, medium, or high. Default: medium.
  --min-cards <n>     Override the minimum card count for compact/full checks.
  --content-strict    Deprecated alias for --mode full when --mode is omitted.
  --render            Render non-empty UML blocks with plantuml.jar when available.
  --strict            Treat warnings as failures.
  --help              Show this help.

Examples:
  # Artifact shape only
  node skills/code-to-uml/scripts/validate-report.js --html cache/report.html --strict

  # Compact source-analysis report
  node skills/code-to-uml/scripts/validate-report.js --html cache/report.html --lang en --scope function --complexity low --mode compact --strict

  # Full source-analysis report with PlantUML rendering
  node skills/code-to-uml/scripts/validate-report.js --html cache/report.html --lang zh --scope module --complexity medium --mode full --strict --render
`);
}

function parseArgs(argv) {
	const args = {
		lang: DEFAULT_LANG,
		complexity: "medium",
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
		if (arg === "--content-strict") {
			args.contentStrict = true;
			continue;
		}
		if (["--root", "--html", "--data-dir", "--lang", "--mode", "--scope", "--complexity", "--min-cards"].includes(arg)) {
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

function decodeHtmlEntities(text) {
	return String(text || "")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'");
}

function stripHtml(text) {
	return decodeHtmlEntities(String(text || "").replace(/<[^>]+>/g, "")).trim();
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

function extractIntroMarkdown(html) {
	const match = /<section\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>[\s\S]*?<p\b[^>]*\bdata-markdown\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
	return match ? decodeHtmlEntities(match[1].trim()) : "";
}

function validateIntro(html, htmlPath, lang, issues) {
	const intro = extractIntroMarkdown(html);
	if (!intro) {
		addIssue(issues, "error", htmlPath, "Missing section.intro > p[data-markdown] content.");
		return;
	}

	const plain = stripHtml(intro);
	const compactLength = Array.from(plain.replace(/\s+/g, "")).length;
	const limit = lang === "zh" ? 500 : 900;
	if (compactLength > limit) {
		addIssue(issues, "warning", htmlPath, `Intro overview is too long for ${lang}: ${compactLength} characters, limit ${limit}.`);
	}

	const hasStructuredLayout = /\n\s*(?:[-*]|\d+\.|\|)/.test(intro);
	if (compactLength > 240 && !hasStructuredLayout) {
		addIssue(issues, "warning", htmlPath, "Intro overview is long but not semantically structured with bullets, steps, or a table.");
	}

	const signals = lang === "zh"
		? ["功能", "框架", "核心", "机制", "设计"]
		: ["function", "framework", "principle", "mechanism", "design"];
	const matchedSignals = signals.filter((signal) => plain.toLowerCase().includes(signal.toLowerCase()));
	if (matchedSignals.length < 3 && process.env.CTU_ADVISORY === "1") {
		addIssue(issues, "warning", htmlPath, "Intro overview may not cover enough of functionality, framework, core principles, mechanism, and design philosophy.");
	}
}

function validateHtml(root, htmlPath, lang, contentStrict, issues) {
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
		[/<section\b[^>]*class=["'][^"']*\bintro\b[\s\S]*?<p\b[^>]*\bdata-markdown\b/i, "Missing section.intro > p[data-markdown] overview."],
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

	if (contentStrict) {
		validateIntro(html, htmlPath, lang, issues);
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

		const example = normalizeField(extractField(group, "Example", ["Description"]));
		const description = normalizeField(extractField(group, "Description", ["UML"]));
		const uml = normalizeField(extractField(group, "UML", ["Detail"]));
		const detail = normalizeField(extractField(group, "Detail", []));
		if (uml && !detail) {
			addIssue(issues, "warning", filePath, `Card ${index + 1} has UML but no [Detail] explanation.`);
		}

		cards.push({ index: index + 1, example, description, uml, detail });
	}

	if (cards.length === 0) {
		addIssue(issues, "error", filePath, "No cards found after the header separator.");
	}

	return cards;
}

function cardText(card) {
	return [card.example, card.description, card.detail].filter(Boolean).join("\n");
}

function extractSectionIds(text) {
	return new Set([...String(text || "").matchAll(/\bS\d{2}_[A-Z0-9_]+\b/g)].map((match) => match[0]));
}

function hasMarkdownTable(text) {
	return /\|[^\n]+\|\s*\n\s*\|(?:\s*:?-{3,}:?\s*\|)+/.test(String(text || ""));
}

function categoryFromFileName(fileName) {
	const match = CTU_FILE_RE.exec(fileName || "");
	return match ? match[1] : "";
}

function validateContentDepth(cards, mode, scope, complexity, minCards, issues) {
	const floor = minCards !== undefined
		? minCards
		: mode === "compact"
			? COMPACT_CARD_FLOORS[scope]
			: COMPLEXITY_CARD_FLOORS[complexity][scope];
	if (cards.length < floor) {
		const modeLabel = mode === "compact" ? "compact" : complexity;
		addIssue(issues, "warning", "(content)", `Report depth is too shallow for ${modeLabel} ${scope} scope: ${cards.length} cards, minimum ${floor}.`);
	}

	if (mode === "compact") {
		return;
	}

	const categoryCounts = new Map();
	for (const card of cards) {
		const category = categoryFromFileName(card.fileName);
		if (category) {
			categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
		}
	}
	const multiCategoryCount = [...categoryCounts.values()].filter((count) => count >= 2).length;
	const multiCategoryFloor = COMPLEXITY_MULTI_CATEGORY_FLOORS[complexity][scope];
	if (multiCategoryCount < multiCategoryFloor) {
		addIssue(issues, "warning", "(content)", `Report distributes too little depth across tabs: ${multiCategoryCount} categories have 2+ cards, minimum ${multiCategoryFloor} for ${complexity} ${scope} scope.`);
	}
}

function validateContentContract(cards, mode, scope, complexity, minCards, issues) {
	if (!scope) {
		addIssue(issues, "warning", "(content)", `--mode ${mode} was used without --scope; skipped required section coverage checks.`);
		return;
	}
	if (!VALID_SCOPES.has(scope)) {
		addIssue(issues, "error", "(content)", `Unsupported --scope '${scope}'. Use one of: ${[...VALID_SCOPES].join(", ")}.`);
		return;
	}
	if (!VALID_COMPLEXITIES.has(complexity)) {
		addIssue(issues, "error", "(content)", `Unsupported --complexity '${complexity}'. Use one of: ${[...VALID_COMPLEXITIES].join(", ")}.`);
		return;
	}

	const allIds = new Set();
	for (const card of cards) {
		for (const id of extractSectionIds(cardText(card))) {
			allIds.add(id);
		}
	}

	for (const id of SCOPE_REQUIRED_SECTIONS[scope]) {
		if (!allIds.has(id)) {
			addIssue(issues, "warning", "(content)", `Missing required section marker for ${scope} scope: ${id}.`);
		}
	}

	const s12Cards = cards.filter((card) => extractSectionIds(cardText(card)).has("S12_REVIEWER_QUESTIONS"));
	if (SCOPE_REQUIRED_SECTIONS[scope].includes("S12_REVIEWER_QUESTIONS")) {
		const s12Text = s12Cards.map(cardText).join("\n");
		if (!s12Cards.length || !/[?？]/.test(s12Text) || !/(答|answer|答案)/i.test(s12Text)) {
			addIssue(issues, "warning", "(content)", "S12_REVIEWER_QUESTIONS should contain learning questions and concrete answers.");
		}
	}

	const s13Cards = cards.filter((card) => extractSectionIds(cardText(card)).has("S13_MAINTAINER_REFERENCE"));
	if (SCOPE_REQUIRED_SECTIONS[scope].includes("S13_MAINTAINER_REFERENCE")) {
		const s13Text = s13Cards.map(cardText).join("\n");
		if (!s13Cards.length || !hasMarkdownTable(s13Text)) {
			addIssue(issues, "warning", "(content)", "S13_MAINTAINER_REFERENCE should be a Markdown table with symbol/file locations.");
		}
	}

	validateContentDepth(cards, mode, scope, complexity, minCards, issues);
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

	if (/<\/?[A-Za-z][^>]*>/.test(uml)) {
		addIssue(issues, "warning", filePath, `Card ${cardIndex} UML contains HTML-like raw angle markup; verify escaping.`);
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

function validateData(root, dataDir, tabs, lang, render, mode, scope, complexity, minCards, issues) {
	const fileNames = listCtuFiles(dataDir, lang, issues);
	const categories = new Set();
	const allCards = [];
	let cardCount = 0;
	let umlCount = 0;

	for (const fileName of fileNames) {
		const match = CTU_FILE_RE.exec(fileName);
		if (match) {
			categories.add(match[1]);
		}
		const filePath = path.join(dataDir, fileName);
		const cards = parseCtuFile(filePath, issues).map((card) => ({ ...card, fileName }));
		allCards.push(...cards);
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

	if (mode !== "artifact") {
		validateContentContract(allCards, mode, scope, complexity, minCards, issues);
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
	if (!VALID_LANGS.has(args.lang)) {
		throw new Error(`Unsupported --lang '${args.lang}'. Use one of: ${[...VALID_LANGS].join(", ")}`);
	}
	const mode = args.mode || (args.contentStrict ? "full" : "artifact");
	if (!VALID_MODES.has(mode)) {
		throw new Error(`Unsupported --mode '${mode}'. Use one of: ${[...VALID_MODES].join(", ")}`);
	}
	if (args.scope && !VALID_SCOPES.has(args.scope)) {
		throw new Error(`Unsupported --scope '${args.scope}'. Use one of: ${[...VALID_SCOPES].join(", ")}`);
	}
	if (args.complexity && !VALID_COMPLEXITIES.has(args.complexity)) {
		throw new Error(`Unsupported --complexity '${args.complexity}'. Use one of: ${[...VALID_COMPLEXITIES].join(", ")}`);
	}
	let minCards;
	if (args.minCards !== undefined) {
		minCards = Number(args.minCards);
		if (!Number.isInteger(minCards) || minCards < 1) {
			throw new Error("--min-cards must be a positive integer.");
		}
	}

	const root = resolveRoot(args.root);
	const htmlPath = resolveUnderRoot(root, args.html);
	const issues = [];
	const htmlInfo = validateHtml(root, htmlPath, args.lang, mode !== "artifact", issues);

	let dataDir = "";
	if (args.dataDir) {
		dataDir = VALID_NAME_RE.test(args.dataDir) ? path.join(root, "data", args.dataDir) : resolveUnderRoot(root, args.dataDir);
	} else if (htmlInfo && htmlInfo.reportSlug) {
		dataDir = path.join(root, "data", htmlInfo.reportSlug);
	}

	let dataSummary = { categories: [], cardCount: 0, umlCount: 0 };
	if (dataDir) {
		dataSummary = validateData(root, dataDir, htmlInfo ? htmlInfo.tabs : [], args.lang, args.render, mode, args.scope, args.complexity, minCards, issues);
	} else {
		addIssue(issues, "error", root, "Cannot resolve data directory. Pass --data-dir or set body data-dir.");
	}

	const errors = issues.filter((issue) => issue.kind === "error");
	const warnings = issues.filter((issue) => issue.kind === "warning");
	printIssues(issues);

	console.log(`Validated report: ${path.relative(root, htmlPath) || htmlPath}`);
	console.log(`Mode: ${mode}`);
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
