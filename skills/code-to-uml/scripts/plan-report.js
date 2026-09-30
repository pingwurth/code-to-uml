#!/usr/bin/env node
"use strict";

// Emit the generation plan for one Code-To-UML report as machine-checkable
// facts: resolved absolute paths, required section IDs with their owning
// category (references/report-contract.md Category Ownership), enforcement
// floors for the requested mode/scope/complexity, the current data inventory
// under data/<slug>/, the section coverage already present, PlantUML runtime
// availability, and the exact scaffold / validate commands to run next.
//
// The agent reads this plan instead of deriving floors, section lists, and
// paths from prose; it then authors only what scripts cannot write: the .ctu
// content and the report overview.
//
// Usage:
//   node plan-report.js --root <CTU_HOME> --slug <slug> [--lang <zh|en>] \
//     [--scope <scope>] [--complexity <level>] [--mode <artifact|compact|full>] \
//     [--html <path>] [--render] [--json]

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
	SECTION_IDS,
	SCOPE_REQUIRED_SECTIONS,
	COMPLEXITY_CARD_FLOORS,
	COMPLEXITY_MULTI_CATEGORY_FLOORS,
	COMPACT_CARD_FLOORS,
	VALID_LANGS,
	VALID_MODES,
	VALID_SCOPES,
	VALID_COMPLEXITIES,
	VALID_NAME_RE,
	parseCtuFile,
	extractSectionIds
} = require("./validate-report.js");
const {
	SECTION_OWNER,
	parseCtuHeader,
	orderCategories,
	labelForCategory
} = require("./lib/report-html.js");
const { resolveRoot, scanDataCategories } = require("./scaffold-report.js");

// Scope applicability matrix from references/report-contract.md:
// sections marked "M" for the scope may merge into the nearest owning card.
const MERGEABLE_SECTIONS = {
	project: [],
	module: [],
	file: [
		"S04_ARCHITECTURE",
		"S06_CALL_RELATIONSHIPS",
		"S07_DATA_OR_STATE_FLOW",
		"S12_REVIEWER_QUESTIONS"
	],
	class: [
		"S02_TOP_LEVEL_STRUCTURE",
		"S06_CALL_RELATIONSHIPS",
		"S07_DATA_OR_STATE_FLOW",
		"S10_ONBOARDING_GUIDE",
		"S12_REVIEWER_QUESTIONS",
		"S13_MAINTAINER_REFERENCE"
	],
	function: [
		"S02_TOP_LEVEL_STRUCTURE",
		"S06_CALL_RELATIONSHIPS",
		"S07_DATA_OR_STATE_FLOW",
		"S10_ONBOARDING_GUIDE",
		"S12_REVIEWER_QUESTIONS",
		"S13_MAINTAINER_REFERENCE"
	]
};

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/plan-report.js --root <CTU_HOME> --slug <name> [options]

Prints the machine-checkable plan for generating or refreshing one report:
absolute paths, required sections with owner categories, enforcement floors,
current data inventory and coverage, PlantUML availability, and the exact
scaffold / validate commands to run next.

Options:
  --root <path>        Code-To-UML root. Defaults to the resolver (CTU_HOME, pointer, cwd).
  --slug <name>        Report slug: [A-Za-z0-9_-]+. Data dir data/<slug>/, page cache/<slug>.html.
  --html <path>        Report HTML path, absolute or relative to root. Defaults to cache/<slug>.html.
  --lang <zh|en>       Report language. Default: zh.
  --scope <scope>      Content scope: project, module, file, class, or function. Default: project.
  --complexity <level> Content depth level: low, medium, or high. Default: medium.
  --mode <mode>        Target validation mode: artifact, compact, or full. Default: full.
  --render             Probe and include PlantUML rendering flags in the validate command.
  --json               Print a machine-readable plan.
  --help               Show this help.

Exit code is 0 when the plan was produced, even if data is still missing;
use the printed commands for the following scaffold and validation steps.`);
}

function parseArgs(argv) {
	const args = {
		lang: "zh",
		scope: "project",
		complexity: "medium",
		mode: "full",
		render: false,
		json: false
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
		if (arg === "--json") {
			args.json = true;
			continue;
		}
		if (["--root", "--slug", "--html", "--lang", "--scope", "--complexity", "--mode"].includes(arg)) {
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

function assertEnum(value, validSet, flag) {
	if (!validSet.has(value)) {
		throw new Error(`Unsupported ${flag} '${value}'. Use one of: ${[...validSet].join(", ")}`);
	}
}

// Sections for the scope, split into required (from the validator's single
// source of truth) and optional (excluded by the scope, e.g. S04 for class).
function buildSections(scope) {
	const required = SCOPE_REQUIRED_SECTIONS[scope];
	const mergeable = new Set(MERGEABLE_SECTIONS[scope] || []);
	const requiredList = required.map((id) => ({
		id,
		category: SECTION_OWNER[id],
		mergeable: mergeable.has(id)
	}));
	const optionalList = SECTION_IDS
		.filter((id) => !required.includes(id))
		.map((id) => ({ id, category: SECTION_OWNER[id] }));
	return { requiredList, optionalList };
}

function buildFloors(mode, scope, complexity) {
	if (mode === "compact") {
		return {
			enforced: true,
			minCards: COMPACT_CARD_FLOORS[scope],
			minCardsSource: "COMPACT_CARD_FLOORS",
			multiCategory: null,
			multiCategorySource: null
		};
	}
	if (mode === "full") {
		return {
			enforced: true,
			minCards: COMPLEXITY_CARD_FLOORS[complexity][scope],
			minCardsSource: "COMPLEXITY_CARD_FLOORS",
			multiCategory: COMPLEXITY_MULTI_CATEGORY_FLOORS[complexity][scope],
			multiCategorySource: "COMPLEXITY_MULTI_CATEGORY_FLOORS"
		};
	}
	return {
		enforced: false,
		minCards: null,
		minCardsSource: null,
		multiCategory: null,
		multiCategorySource: null
	};
}

// Inventory of the requested-language data files, grouped by category and
// enriched with the .ctu header (Title/Describe) and card statistics.
function buildInventory(root, slug, lang) {
	const dataDir = path.join(root, "data", slug);
	const issues = [];
	const groups = scanDataCategories(dataDir, lang);
	const categories = [];
	const allSections = new Set();
	let totalCards = 0;
	let multiCategoryCount = 0;

	for (const category of orderCategories([...groups.keys()])) {
		const files = [];
		let categoryCards = 0;
		for (const item of groups.get(category)) {
			const filePath = path.join(dataDir, item.file);
			const text = fs.readFileSync(filePath, "utf8");
			const header = parseCtuHeader(text);
			const cards = parseCtuFile(filePath, issues);
			const sections = new Set();
			for (const card of cards) {
				for (const id of extractSectionIds([card.example, card.description, card.detail].filter(Boolean).join("\n"))) {
					sections.add(id);
				}
			}
			categoryCards += cards.length;
			for (const id of sections) {
				allSections.add(id);
			}
			files.push({
				file: item.file,
				n: item.n,
				title: header.title,
				describe: header.describe,
				cards: cards.length,
				sections: [...sections].sort()
			});
		}
		totalCards += categoryCards;
		if (categoryCards >= 2) {
			multiCategoryCount += 1;
		}
		categories.push({
			category,
			label: (files[0] && files[0].title) || labelForCategory(category, lang),
			fileCount: files.length,
			cardCount: categoryCards,
			files
		});
	}

	return {
		dataDir,
		exists: fs.existsSync(dataDir),
		categories,
		presentSections: [...allSections].filter((id) => SECTION_IDS.includes(id)).sort(),
		totalCards,
		multiCategoryCount,
		issues
	};
}

function probeRenderAvailability(root) {
	const plantumlJar = fs.existsSync(path.join(root, "plantuml.jar"));
	let java = false;
	try {
		const result = spawnSync("java", ["-version"], { stdio: "ignore", timeout: 15000 });
		java = !result.error && result.status === 0;
	} catch {
		java = false;
	}
	return { plantumlJar, java, renderAvailable: plantumlJar && java };
}

function quote(value) {
	return `"${value}"`;
}

function buildCommands(root, scriptDir, opts) {
	const scaffoldScript = path.join(scriptDir, "scaffold-report.js");
	const validateScript = path.join(scriptDir, "validate-report.js");
	const base = `node ${quote(scaffoldScript)} --root ${quote(root)} --slug ${opts.slug} --lang ${opts.lang} --title "<report title>"`;
	const scaffoldInit = opts.dataExists
		? base
		: `${base} --categories ${opts.requiredCategories.join(",")}`;
	const renderFlag = opts.render && opts.runtime.renderAvailable ? " --render" : "";
	const externalFlag = opts.htmlInsideRoot ? "" : " --allow-external-assets";
	const validate = `node ${quote(validateScript)} --root ${quote(root)} --html ${quote(opts.htmlPath)} --lang ${opts.lang} --scope ${opts.scope} --complexity ${opts.complexity} --mode ${opts.mode} --strict${renderFlag}${externalFlag}`;
	return { scaffoldInit, scaffoldRefresh: base, validate };
}

function run(args) {
	if (!args.slug) {
		throw new Error("--slug is required.");
	}
	if (!VALID_NAME_RE.test(args.slug)) {
		throw new Error(`--slug must match [A-Za-z0-9_-]+ (no dots, spaces, or non-ASCII characters): ${args.slug}`);
	}
	assertEnum(args.lang, VALID_LANGS, "--lang");
	assertEnum(args.scope, VALID_SCOPES, "--scope");
	assertEnum(args.complexity, VALID_COMPLEXITIES, "--complexity");
	assertEnum(args.mode, VALID_MODES, "--mode");

	const root = resolveRoot(args.root);
	const htmlPath = args.html
		? path.resolve(root, args.html)
		: path.join(root, "cache", `${args.slug}.html`);
	const htmlRelative = path.relative(root, htmlPath);
	const htmlInsideRoot = !htmlRelative.startsWith("..") && !path.isAbsolute(htmlRelative);
	const templatePath = path.join(root, "cache", "_TEMPLATE.html");
	const templateExists = fs.existsSync(templatePath);
	if (!templateExists) {
		throw new Error(`Report template not found: ${templatePath}. --root must be a Code-To-UML root.`);
	}

	const { requiredList, optionalList } = buildSections(args.scope);
	const requiredCategories = orderCategories([...new Set(requiredList.map((item) => item.category))]);
	const floors = buildFloors(args.mode, args.scope, args.complexity);
	const inventory = buildInventory(root, args.slug, args.lang);
	const runtime = probeRenderAvailability(root);

	const presentSet = new Set(inventory.presentSections);
	const missingSections = requiredList.filter((item) => !presentSet.has(item.id)).map((item) => item.id);
	const inventoryByCategory = new Map(inventory.categories.map((item) => [item.category, item]));

	const categoryPlan = requiredCategories.map((category) => {
		const found = inventoryByCategory.get(category);
		return {
			category,
			required: true,
			present: Boolean(found),
			label: found ? found.label : labelForCategory(category, args.lang),
			fileCount: found ? found.fileCount : 0,
			cardCount: found ? found.cardCount : 0,
			sections: found ? [...new Set(found.files.flatMap((file) => file.sections))].sort() : []
		};
	});
	const extraCategories = inventory.categories
		.filter((item) => !requiredCategories.includes(item.category))
		.map((item) => ({
			category: item.category,
			required: false,
			present: true,
			label: item.label,
			fileCount: item.fileCount,
			cardCount: item.cardCount,
			sections: [...new Set(item.files.flatMap((file) => file.sections))].sort()
		}));

	const commands = buildCommands(root, __dirname, {
		slug: args.slug,
		lang: args.lang,
		scope: args.scope,
		complexity: args.complexity,
		mode: args.mode,
		htmlPath,
		htmlInsideRoot,
		requiredCategories,
		dataExists: inventory.exists,
		render: args.render,
		runtime
	});

	const plan = {
		ok: true,
		slug: args.slug,
		ctuHome: root,
		html: htmlPath,
		htmlExists: fs.existsSync(htmlPath),
		htmlInsideRoot,
		dataDir: inventory.dataDir,
		dataExists: inventory.exists,
		template: templatePath,
		lang: args.lang,
		scope: args.scope,
		complexity: args.complexity,
		mode: args.mode,
		render: args.render,
		requiredSections: requiredList,
		optionalSections: optionalList,
		requiredCategories,
		floors,
		inventory: {
			totalCards: inventory.totalCards,
			multiCategoryCount: inventory.multiCategoryCount,
			presentSections: inventory.presentSections,
			missingSections,
			categories: categoryPlan,
			extraCategories
		},
		runtime,
		commands,
		diagnostics: inventory.issues.map((issue) => `${issue.kind}: ${issue.file}: ${issue.message}`)
	};

	if (args.json) {
		console.log(JSON.stringify(plan, null, 2));
		return;
	}

	console.log(`Plan for report '${args.slug}'`);
	console.log(`  CTU_HOME : ${root}`);
	console.log(`  HTML     : ${htmlPath} (${plan.htmlExists ? "exists" : "missing, scaffold will create it"})`);
	console.log(`  Data     : ${inventory.dataDir} (${inventory.exists ? `exists, ${inventory.totalCards} cards in ${inventory.categories.length} categories` : "missing"})`);
	console.log(`  Template : ${templatePath}`);
	console.log(`  Params   : lang=${args.lang} scope=${args.scope} complexity=${args.complexity} mode=${args.mode}`);
	console.log("");
	console.log(`Required sections (${requiredList.length}) - owner category; [merge] may merge into nearest owning card:`);
	for (const item of requiredList) {
		console.log(`  - ${item.id} (${item.category})${item.mergeable ? " [merge]" : ""}`);
	}
	console.log(optionalList.length
		? `Optional sections: ${optionalList.map((item) => `${item.id} (${item.category})`).join(", ")}`
		: "Optional sections: none for this scope");
	console.log("");
	if (floors.enforced) {
		console.log(`Enforcement for mode=${args.mode}:`);
		console.log(`  - Cards: minimum ${floors.minCards} for ${args.mode === "compact" ? "compact" : args.complexity} ${args.scope} scope (${floors.minCardsSource})`);
		if (floors.multiCategory !== null) {
			console.log(`  - Multi-category depth: at least ${floors.multiCategory} categories with 2+ cards (${floors.multiCategorySource})`);
		}
		console.log(`  Current: ${inventory.totalCards} cards; categories with 2+ cards: ${inventory.multiCategoryCount}`);
	} else {
		console.log("Enforcement for mode=artifact: shape and runtime anchors only; card floors are not enforced.");
	}
	console.log("");
	console.log(`Category plan (write data/${args.slug}/{category}--{n}_${args.lang}.ctu):`);
	for (const item of [...categoryPlan, ...extraCategories]) {
		const status = item.present
			? `${item.fileCount} file(s), ${item.cardCount} card(s), label="${item.label}", sections: ${item.sections.join(", ") || "none"}`
			: `no _${args.lang}.ctu data yet, label falls back to "${item.label}"`;
		console.log(`  ${item.category} [${item.present ? "present" : "missing"}] ${status}`);
	}
	console.log("");
	console.log(`Coverage: present ${inventory.presentSections.join(", ") || "(none)"}`);
	console.log(`          missing ${missingSections.join(", ") || "(none)"}`);
	console.log("");
	console.log(`Runtime: plantuml.jar=${runtime.plantumlJar ? "found" : "missing"} java=${runtime.java ? "found" : "missing"} -> --render ${runtime.renderAvailable ? "available" : "unavailable, validate without --render"}`);
	if (plan.diagnostics.length) {
		console.log("");
		console.log("Diagnostics:");
		for (const line of plan.diagnostics) {
			console.log(`  ${line}`);
		}
	}
	console.log("");
	console.log("Next:");
	console.log(`  1) ${plan.htmlExists ? "Refresh" : "Create"} the HTML shell:`);
	console.log(`     ${commands.scaffoldInit}`);
	if (inventory.exists && !plan.htmlExists) {
		console.log("     (after writing .ctu data, rerun scaffold-report.js without --categories to sync labels and overviews)");
	} else if (plan.htmlExists) {
		console.log("     (rerun after writing .ctu data to sync tab labels and section overviews)");
	}
	console.log(`  2) Validate:`);
	console.log(`     ${commands.validate}`);
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

module.exports = { run, parseArgs, buildSections, buildFloors, probeRenderAvailability, MERGEABLE_SECTIONS };