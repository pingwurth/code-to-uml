#!/usr/bin/env node
"use strict";

// Compile or refresh a Code-To-UML report page (cache/<slug>.html) from the
// template shell and from the report data (data/<slug>/{category}--{n}_{lang}.ctu).
//
// The .ctu files are the single source for the tab list, tab labels (Title:)
// and section overviews (Describe:). This script replaces the mechanical part
// of report generation: copying cache/_TEMPLATE.html and rewriting <title>,
// <h1>, <p data-markdown>, body[data-dir], the tab buttons, the section
// overview paragraphs, and h2#demo-title while keeping every [FIXED] runtime
// anchor intact.
//
// Usage:
//   node scaffold-report.js --root <CTU_HOME> --slug <report-slug> --lang <zh|en> \
//     --title "<report title>" [--page-title "<browser title>"] \
//     [--intro-file <markdown-file>] [--categories a,b,c] [--force] [--json]

const fs = require("fs");
const path = require("path");
const { resolveCtuHome, checkRoot } = require("./resolve-ctu-home.js");
const { VALID_NAME_RE, CTU_FILE_RE, VALID_LANGS } = require("./validate-report.js");
const {
	parseCtuHeader,
	orderCategories,
	labelForCategory,
	compileShell,
	refreshShell
} = require("./lib/report-html.js");

const PLACEHOLDER_INTRO = {
	zh: "报告概述待补充：请在本段填写整份报告的 Markdown 概述（功能、框架、核心原理、工作机制与设计取向）。",
	en: "Report overview pending: replace this paragraph with a concise Markdown overview of functionality, framework, core principles, mechanism, and design."
};

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/scaffold-report.js --root <CTU_HOME> --slug <name> --lang <zh|en> --title "<title>" [options]

Compiles cache/<slug>.html from cache/_TEMPLATE.html, or refreshes an existing
report page, using data/<slug>/{category}--{n}_{lang}.ctu as the single source
for tabs, tab labels (Title:), and section overviews (Describe:).

Options:
  --root <path>        Code-To-UML root. Defaults to the resolver (CTU_HOME, pointer, cwd).
  --slug <name>        Report slug: [A-Za-z0-9_-]+. Data dir data/<slug>/, page cache/<slug>.html.
  --lang <zh|en>       Report language; selects which _<lang>.ctu files define the tabs.
  --title <text>       Report title (h1). Required when the HTML does not exist yet.
  --page-title <text>  Browser <title>. Defaults to --title.
  --intro-file <path>  Markdown file with the whole-report overview paragraph.
  --categories <list>  Comma-separated category order when data is not written yet.
  --force              Rebuild the HTML from cache/_TEMPLATE.html even if it exists.
  --json               Print a machine-readable summary.
  --help               Show this help.

Behavior:
  - HTML missing (or --force): full compile from the template; intro falls back
    to a placeholder when --intro-file is omitted.
  - HTML exists: in-place refresh of the data-derived parts only; intro, h1,
    and page title are preserved unless their options are provided.
  - Every template anchor is verified; a missing anchor stops the run instead
    of writing a broken page.`);
}

function parseArgs(argv) {
	const args = { force: false, json: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			args.help = true;
			continue;
		}
		if (arg === "--force") {
			args.force = true;
			continue;
		}
		if (arg === "--json") {
			args.json = true;
			continue;
		}
		if (["--root", "--slug", "--lang", "--title", "--page-title", "--intro-file", "--categories"].includes(arg)) {
			const value = argv[++i];
			if (value === undefined || value === "") {
				throw new Error(`Missing value for ${arg}`);
			}
			args[arg.slice(2).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase())] = value;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}
	return args;
}

function resolveRoot(inputRoot) {
	if (inputRoot) {
		const result = checkRoot(inputRoot);
		if (!result.ok) {
			throw new Error(`--root is not a Code-To-UML root (missing ${result.missing.join(", ")}): ${result.dir}`);
		}
		return result.dir;
	}
	const resolved = resolveCtuHome({});
	if (resolved.ok) {
		return resolved.ctuHome;
	}
	const checked = resolved.attempts.map((attempt) => `${attempt.source}: ${attempt.dir || "(no path)"}`).join("; ");
	throw new Error(`Cannot resolve Code-To-UML root. Pass --root or reinstall the skill with node install.js. Tried: ${checked}`);
}

function parseCategories(value) {
	if (!value) {
		return [];
	}
	const categories = String(value).split(",").map((item) => item.trim()).filter(Boolean);
	for (const category of categories) {
		if (!VALID_NAME_RE.test(category)) {
			throw new Error(`--categories entry contains unsupported characters: ${category}`);
		}
	}
	return [...new Set(categories)];
}

// Scan data/<slug>/ for _{lang}.ctu files, grouped by category.
// Each group is sorted by {n} so the lowest {n} file defines the tab header.
function scanDataCategories(dataDir, lang) {
	const groups = new Map();
	if (!fs.existsSync(dataDir)) {
		return groups;
	}
	for (const entry of fs.readdirSync(dataDir, { withFileTypes: true })) {
		if (!entry.isFile()) {
			continue;
		}
		const match = CTU_FILE_RE.exec(entry.name);
		if (!match || match[3] !== lang) {
			continue;
		}
		const category = match[1];
		if (!groups.has(category)) {
			groups.set(category, []);
		}
		groups.get(category).push({ file: entry.name, n: Number(match[2]) });
	}
	for (const list of groups.values()) {
		list.sort((a, b) => a.n - b.n || a.file.localeCompare(b.file));
	}
	return groups;
}

function listCtuDiagnostics(dataDir) {
	if (!fs.existsSync(dataDir)) {
		return "(data directory does not exist)";
	}
	const names = fs.readdirSync(dataDir).filter((name) => name.endsWith(".ctu")).sort();
	return names.length ? names.join(", ") : "(no .ctu files)";
}

function buildEntries(categories, groups, dataDir, lang, warnings) {
	const entries = [];
	categories.forEach((category, index) => {
		const candidates = groups.get(category) || [];
		let header = { title: "", describe: "" };
		if (candidates.length) {
			const filePath = path.join(dataDir, candidates[0].file);
			header = parseCtuHeader(fs.readFileSync(filePath, "utf8"));
			if (!header.describe) {
				warnings.push(`category '${category}': ${candidates[0].file} has no Describe header; its section overview paragraph stays empty.`);
			}
		} else {
			warnings.push(`category '${category}': no _${lang}.ctu data yet; tab label falls back to the built-in mapping and the section overview stays empty.`);
		}
		entries.push({
			category,
			label: header.title || labelForCategory(category, lang),
			overview: header.describe || "",
			active: index === 0
		});
	});
	return entries;
}

function run(args) {
	if (!args.slug) {
		throw new Error("--slug is required.");
	}
	if (!VALID_NAME_RE.test(args.slug)) {
		throw new Error(`--slug must match [A-Za-z0-9_-]+ (no dots, spaces, or non-ASCII characters): ${args.slug}`);
	}
	if (!args.lang) {
		throw new Error(`--lang is required. Use one of: ${[...VALID_LANGS].join(", ")}`);
	}
	if (!VALID_LANGS.has(args.lang)) {
		throw new Error(`Unsupported --lang '${args.lang}'. Use one of: ${[...VALID_LANGS].join(", ")}`);
	}

	const root = resolveRoot(args.root);
	const dataDir = path.join(root, "data", args.slug);
	const htmlPath = path.join(root, "cache", `${args.slug}.html`);
	const templatePath = path.join(root, "cache", "_TEMPLATE.html");
	const htmlExists = fs.existsSync(htmlPath);
	const mode = htmlExists && !args.force ? "refresh" : "init";

	if (mode === "init" && !args.title) {
		throw new Error("--title is required when the report HTML does not exist yet (or when --force rebuilds it).");
	}

	const explicitCategories = parseCategories(args.categories);
	if (!fs.existsSync(dataDir)) {
		if (explicitCategories.length) {
			fs.mkdirSync(dataDir, { recursive: true });
		} else {
			throw new Error(`Data directory does not exist: ${dataDir}. Write .ctu data first or pass --categories to scaffold the shell in advance.`);
		}
	}

	const warnings = [];
	const groups = scanDataCategories(dataDir, args.lang);
	const scanned = [...groups.keys()];
	let categories;
	if (explicitCategories.length) {
		const extra = scanned.filter((category) => !explicitCategories.includes(category));
		if (extra.length) {
			warnings.push(`data has categories not listed in --categories; appended: ${orderCategories(extra).join(", ")}`);
		}
		categories = [...explicitCategories, ...orderCategories(extra)];
	} else {
		categories = orderCategories(scanned);
	}
	if (!categories.length) {
		throw new Error(`No categories resolved for '${args.slug}'. Expected data/${args.slug}/{category}--{n}_${args.lang}.ctu files or --categories. Current .ctu files: ${listCtuDiagnostics(dataDir)}`);
	}

	const entries = buildEntries(categories, groups, dataDir, args.lang, warnings);

	let intro = null;
	if (args.introFile) {
		const introPath = path.resolve(args.introFile);
		if (!fs.existsSync(introPath)) {
			throw new Error(`--intro-file does not exist: ${introPath}`);
		}
		intro = fs.readFileSync(introPath, "utf8").trim();
		if (!intro) {
			throw new Error(`--intro-file is empty: ${introPath}`);
		}
	}

	let html;
	if (mode === "init") {
		if (!fs.existsSync(templatePath)) {
			throw new Error(`Report template not found: ${templatePath}`);
		}
		if (intro === null) {
			intro = PLACEHOLDER_INTRO[args.lang === "en" ? "en" : "zh"];
			warnings.push("no --intro-file provided; a placeholder overview was written. Provide the report overview and rerun to refresh it.");
		}
		html = compileShell(fs.readFileSync(templatePath, "utf8"), {
			slug: args.slug,
			lang: args.lang,
			title: args.title,
			pageTitle: args.pageTitle || "",
			intro,
			entries
		});
	} else {
		html = refreshShell(fs.readFileSync(htmlPath, "utf8"), {
			slug: args.slug,
			lang: args.lang,
			title: args.title || "",
			pageTitle: args.pageTitle || "",
			intro: args.introFile ? intro : null,
			entries
		});
	}

	fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
	fs.writeFileSync(htmlPath, `${html.replace(/\s+$/, "")}\n`, "utf8");

	for (const warning of warnings) {
		console.error(`[WARN] ${warning}`);
	}

	if (args.json) {
		console.log(JSON.stringify({
			ok: true,
			mode,
			ctuHome: root,
			html: htmlPath,
			dataDir,
			lang: args.lang,
			categories,
			tabs: entries.length,
			overviews: entries.length,
			entries,
			warnings
		}, null, 2));
	} else {
		console.log(`Scaffolded report (${mode}): ${path.relative(root, htmlPath)}`);
		console.log(`CTU_HOME=${root}`);
		console.log(`HTML=${htmlPath}`);
		console.log(`Data=${dataDir}`);
		console.log(`Categories (${categories.length}): ${categories.join(", ")}`);
		console.log(`Tabs: ${entries.length} buttons, ${entries.length} overviews`);
		console.log(`Warnings: ${warnings.length}`);
		console.log("Next: run plan-report.js for the full validation command, then validate-report.js --strict.");
	}
}

if (require.main === module) {
	try {
		const args = parseArgs(process.argv.slice(2));
		if (args.help) {
			printUsage();
		} else {
			run(args);
		}
	} catch (error) {
		console.error(`[ERROR] ${error.message}`);
		process.exitCode = 1;
	}
}

module.exports = { run, parseArgs, resolveRoot, parseCategories, scanDataCategories };