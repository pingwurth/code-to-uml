#!/usr/bin/env node
"use strict";

// Runtime verification for one Code-To-UML report page against a live server.
//
// The script reuses a running server when the port answers, or spawns
// `node serve.js <port>` itself with --start, then checks what the browser
// would use: the report page serves with its runtime anchors, the home page
// and /api/cache-html discover the report, /api/demo-examples returns the
// categories present in data/<slug>/, every referenced static asset responds
// 200, and (with --render) POST /api/plantuml-svg produces an SVG.
//
// Browser-only behavior (WASM rendering, tab clicks) stays with the agent;
// everything reachable over HTTP is checked here.
//
// Usage:
//   node check-runtime.js --root <CTU_HOME> --html cache/<slug>.html \
//     [--lang <zh|en>] [--data-dir <slug>] [--port 5401] [--start] [--render] [--json]

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { resolveRoot, scanDataCategories } = require("./scaffold-report.js");
const { probeRenderAvailability } = require("./plan-report.js");
const {
	VALID_LANGS,
	VALID_NAME_RE,
	CTU_FILE_RE
} = require("./validate-report.js");
const {
	orderCategories,
	parseAttrs,
	normalizeAssetRef,
	regexMatchAllOutsideComments,
	regexMatchOutsideComments
} = require("./lib/report-html.js");

const DEFAULT_PORT = 5401;
const READY_POLLS = 40;
const READY_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 8000;

function printUsage() {
	console.log(`Usage:
  node skills/code-to-uml/scripts/check-runtime.js --root <CTU_HOME> --html <cache/file.html|slug> [options]

Checks a report page over HTTP against a Code-To-UML server: page anchors,
home-page discovery, /api/demo-examples categories, referenced static assets,
and optional server-side PlantUML rendering.

Options:
  --root <path>        Code-To-UML root. Defaults to the resolver (CTU_HOME, pointer, cwd).
  --html <value>       Report page: a slug (smoke) or a path relative to root (cache/smoke.html).
  --data-dir <slug>    Override the data directory; defaults to body[data-dir] of the page.
  --lang <zh|en>       Language used for /api/demo-examples. Default: zh.
  --port <n>           Server port. Default: ${DEFAULT_PORT}.
  --start              Spawn 'node serve.js <port>' when the port is not answering; the
                       script stops the server it spawned when checks finish.
  --render             Also POST /api/plantuml-svg; skipped when plantuml.jar or java is missing.
  --json               Print a machine-readable result.
  --help               Show this help.

Exit code is 0 when every check passes (skips allowed) and 1 otherwise.`);
}

function parseArgs(argv) {
	const args = { lang: "zh", port: DEFAULT_PORT, start: false, render: false, json: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--help" || arg === "-h") {
			args.help = true;
			continue;
		}
		if (arg === "--start") {
			args.start = true;
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
		if (["--root", "--html", "--data-dir", "--lang", "--port"].includes(arg)) {
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

function toUrlPath(relativePath) {
	return `/${relativePath.split(path.sep).join("/")}`;
}

async function request(url, options, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs || REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(url, { ...options, signal: controller.signal });
		const text = await response.text();
		return {
			status: response.status,
			contentType: response.headers.get("content-type") || "",
			text
		};
	} finally {
		clearTimeout(timer);
	}
}

// Extract href/src references from link, script, and img tags outside
// comments, resolve them against the page location, and keep only files
// inside the CTU root (the server can only serve those).
function collectAssetPaths(html, htmlPath, root) {
	const refs = [];
	for (const [tag, attr] of [["link", "href"], ["script", "src"], ["img", "src"]]) {
		const tagRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
		for (const match of regexMatchAllOutsideComments(html, tagRe)) {
			const ref = normalizeAssetRef(parseAttrs(match[0])[attr]);
			if (!ref) {
				continue;
			}
			refs.push(ref);
		}
	}
	const seen = new Set();
	const assets = [];
	for (const ref of refs) {
		const absolute = ref.startsWith("/")
			? path.join(root, ref)
			: path.resolve(path.dirname(htmlPath), ref);
		const relative = path.relative(root, absolute);
		if (relative.startsWith("..") || path.isAbsolute(relative)) {
			continue;
		}
		const urlPath = toUrlPath(relative);
		if (seen.has(urlPath)) {
			continue;
		}
		seen.add(urlPath);
		assets.push({ urlPath, absolute });
	}
	return assets;
}

function extractDataDir(html, fallback) {
	const match = regexMatchOutsideComments(html, /<body\b[^>]*>/i);
	const attrs = match ? parseAttrs(match[0]) : null;
	const value = attrs && attrs["data-dir"] ? attrs["data-dir"] : "";
	return value || fallback;
}

function expectedCategories(root, dataDir, lang) {
	const groups = scanDataCategories(path.join(root, "data", dataDir), lang);
	return orderCategories([...groups.keys()]);
}

async function waitForServer(baseUrl) {
	for (let attempt = 0; attempt < READY_POLLS; attempt++) {
		try {
			const response = await request(`${baseUrl}/api/cache-html`, undefined, 2000);
			if (response.status === 200) {
				return true;
			}
		} catch {
			// not ready yet
		}
		await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
	}
	return false;
}

async function run(args) {
	if (!args.html) {
		throw new Error("--html is required (a slug like 'smoke' or a path like 'cache/smoke.html').");
	}
	if (!VALID_LANGS.has(args.lang)) {
		throw new Error(`Unsupported --lang '${args.lang}'. Use one of: ${[...VALID_LANGS].join(", ")}`);
	}
	const port = Number.parseInt(args.port, 10);
	if (!Number.isFinite(port) || port <= 0 || port > 65535) {
		throw new Error(`--port must be a number between 1 and 65535: ${args.port}`);
	}

	const root = resolveRoot(args.root);
	const isSlugOnly = !args.html.endsWith(".html") && !args.html.includes("/") && VALID_NAME_RE.test(args.html);
	const htmlPath = isSlugOnly
		? path.join(root, "cache", `${args.html}.html`)
		: path.resolve(root, args.html);
	if (!fs.existsSync(htmlPath)) {
		throw new Error(`Report page not found: ${htmlPath}. Run scaffold-report.js first.`);
	}

	const html = fs.readFileSync(htmlPath, "utf8");
	const slug = path.basename(htmlPath, ".html");
	const dataDir = args.dataDir || extractDataDir(html, slug);
	const categories = expectedCategories(root, dataDir, args.lang);
	const assets = collectAssetPaths(html, htmlPath, root);
	const pageRelative = path.relative(root, htmlPath);
	const pageInsideRoot = !pageRelative.startsWith("..") && !path.isAbsolute(pageRelative);
	const baseUrl = `http://127.0.0.1:${port}`;

	const checks = [];
	const record = (name, status, detail) => checks.push({ name, status, detail });

	let server = null;
	let spawned = false;
	let reachable = false;
	const servePath = path.join(root, "serve.js");

	try {
		try {
			const probe = await request(`${baseUrl}/api/cache-html`, undefined, 2000);
			reachable = probe.status === 200;
		} catch {
			reachable = false;
		}

		if (!reachable && args.start) {
			if (!fs.existsSync(servePath)) {
				throw new Error(`Cannot start the server: ${servePath} does not exist.`);
			}
			server = spawn(process.execPath, [servePath, String(port)], { cwd: root, stdio: "ignore" });
			spawned = true;
			reachable = await waitForServer(baseUrl);
			if (!reachable) {
				throw new Error(`Server did not become ready on ${baseUrl} within ${(READY_POLLS * READY_INTERVAL_MS) / 1000}s. Check whether port ${port} is already used.`);
			}
		}

		if (!reachable) {
			record(
				"server",
				"fail",
				`No server answers on ${baseUrl}. Start one with 'node serve.js ${port}' (cwd: ${root}) or rerun with --start.`
			);
		} else {
			if (!pageInsideRoot) {
				record("page", "fail", `Report HTML is outside the CTU root (${htmlPath}); the server cannot publish it. Copy it into ${root}.`);
			} else {
				try {
					const response = await request(`${baseUrl}${toUrlPath(pageRelative)}`);
					const hasTabs = response.text.includes("demo-tabs");
					const hasDiagrams = response.text.includes("data-diagram");
					if (response.status === 200 && hasTabs && hasDiagrams) {
						record("page", "pass", `GET ${toUrlPath(pageRelative)} -> 200, runtime anchors present (demo-tabs, data-diagram).`);
					} else {
						record("page", "fail", `GET ${toUrlPath(pageRelative)} -> ${response.status}; demo-tabs found: ${hasTabs}, data-diagram found: ${hasDiagrams}.`);
					}
				} catch (error) {
					record("page", "fail", `GET ${toUrlPath(pageRelative)} failed: ${error.message}`);
				}
			}

			try {
				const response = await request(`${baseUrl}/index.html`);
				record(
					"home",
					response.status === 200 ? "pass" : "fail",
					`GET /index.html -> ${response.status}`
				);
			} catch (error) {
				record("home", "fail", `GET /index.html failed: ${error.message}`);
			}

			try {
				const response = await request(`${baseUrl}/api/cache-html`);
				let listed = false;
				let detail = `GET /api/cache-html -> ${response.status}`;
				if (response.status === 200) {
					const payload = JSON.parse(response.text);
					const files = Array.isArray(payload.files) ? payload.files : [];
					listed = files.some((file) => file && file.path === pageRelative.split(path.sep).join("/"));
					detail += listed
						? `, lists ${pageRelative.split(path.sep).join("/")}`
						: `, report NOT listed (found ${files.length} pages)`;
				}
				record("cache-api", response.status === 200 && listed ? "pass" : "fail", detail);
			} catch (error) {
				record("cache-api", "fail", `GET /api/cache-html failed: ${error.message}`);
			}

			try {
				const url = `${baseUrl}/api/demo-examples?lang=${encodeURIComponent(args.lang)}&dir=${encodeURIComponent(dataDir)}`;
				const response = await request(url);
				if (response.status !== 200) {
					record("examples-api", "fail", `GET /api/demo-examples -> ${response.status}`);
				} else {
					const payload = JSON.parse(response.text);
					const counts = categories.map((category) => {
						const items = Array.isArray(payload[category]) ? payload[category] : [];
						return `${category}(${items.length})`;
					});
					const missing = categories.filter((category) => !Array.isArray(payload[category]) || payload[category].length === 0);
					if (categories.length === 0) {
						record("examples-api", "skip", `GET /api/demo-examples -> 200, but data/${dataDir}/ has no _${args.lang}.ctu files to expect.`);
					} else if (missing.length) {
						record("examples-api", "fail", `GET /api/demo-examples -> 200, but categories without items: ${missing.join(", ")} (all: ${counts.join(", ")})`);
					} else {
						record("examples-api", "pass", `GET /api/demo-examples -> 200, categories with data: ${counts.join(", ")}`);
					}
				}
			} catch (error) {
				record("examples-api", "fail", `GET /api/demo-examples failed: ${error.message}`);
			}

			for (const asset of assets) {
				try {
					const response = await request(`${baseUrl}${asset.urlPath}`, undefined, 4000);
					record("asset", response.status === 200 ? "pass" : "fail", `GET ${asset.urlPath} -> ${response.status}`);
				} catch (error) {
					record("asset", "fail", `GET ${asset.urlPath} failed: ${error.message}`);
				}
			}

			if (args.render) {
				const availability = probeRenderAvailability(root);
				if (!availability.renderAvailable) {
					record(
						"plantuml",
						"skip",
						`plantuml.jar found: ${availability.plantumlJar}, java found: ${availability.java}; server-side rendering unavailable.`
					);
				} else {
					try {
						const response = await request(`${baseUrl}/api/plantuml-svg`, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ source: "@startuml\nAlice -> Bob: hello\n@enduml" })
						}, 30000);
						let hasSvg = false;
						if (response.status === 200) {
							const payload = JSON.parse(response.text);
							hasSvg = typeof payload.svg === "string" && payload.svg.includes("<svg");
						}
						record(
							"plantuml",
							response.status === 200 && hasSvg ? "pass" : "fail",
							`POST /api/plantuml-svg -> ${response.status}${response.status === 200 && !hasSvg ? ", response has no <svg> payload" : ""}`
						);
					} catch (error) {
						record("plantuml", "fail", `POST /api/plantuml-svg failed: ${error.message}`);
					}
				}
			} else {
				record("plantuml", "skip", "--render not requested.");
			}
		}
	} finally {
		if (spawned && server) {
			server.kill();
		}
	}

	const summary = {
		pass: checks.filter((check) => check.status === "pass").length,
		fail: checks.filter((check) => check.status === "fail").length,
		skip: checks.filter((check) => check.status === "skip").length
	};
	const ok = summary.fail === 0;

	if (args.json) {
		console.log(JSON.stringify({
			ok,
			baseUrl,
			spawned,
			html: htmlPath,
			dataDir,
			lang: args.lang,
			categories,
			checks,
			summary
		}, null, 2));
	} else {
		console.log(`check-runtime: ${path.relative(root, htmlPath)}`);
		console.log(`  root    : ${root}`);
		console.log(`  base    : ${baseUrl} ${spawned ? "(spawned by this script, stopped afterwards)" : (reachable ? "(reused a running server)" : "(no server)")}`);
		console.log(`  data-dir: ${dataDir} (expected categories: ${categories.join(", ") || "none"})`);
		console.log("");
		for (const check of checks) {
			console.log(`  ${check.status.toUpperCase().padEnd(4)} ${check.name.padEnd(12)} ${check.detail}`);
		}
		console.log("");
		console.log(`Result: ${summary.pass} pass, ${summary.fail} fail, ${summary.skip} skip`);
	}

	if (!ok) {
		process.exitCode = 1;
	}
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

module.exports = { run, parseArgs, collectAssetPaths, extractDataDir };