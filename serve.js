#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const ROOT_DIR = process.cwd();
const PORT = Number.parseInt(process.argv[2] || process.env.PORT || "5401", 10);
const HOST = "0.0.0.0";

const MIME_TYPES = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".wasm": "application/wasm"
};

function sendJson(res, statusCode, payload) {
	res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.end(JSON.stringify(payload));
}

function isPathInside(parent, target) {
	const rel = path.relative(parent, target);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function readRequestBody(req, maxBytes = 2 * 1024 * 1024) {
	return new Promise((resolve, reject) => {
		let size = 0;
		let body = "";
		req.setEncoding("utf8");
		req.on("data", chunk => {
			size += Buffer.byteLength(chunk);
			if (size > maxBytes) {
				reject(new Error("Request body too large"));
				req.destroy();
				return;
			}
			body += chunk;
		});
		req.on("end", () => resolve(body));
		req.on("error", reject);
	});
}

function runPlantUmlJar(source) {
	return new Promise((resolve, reject) => {
		const child = spawn("java", ["-jar", "plantuml.jar", "--svg", "-pipe"], {
			cwd: ROOT_DIR
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", data => {
			stdout += data.toString();
		});
		child.stderr.on("data", data => {
			stderr += data.toString();
		});
		child.on("error", reject);
		child.on("close", code => {
			if (code !== 0) {
				const msg = stderr.trim() || `plantuml.jar exited with code ${code}`;
				reject(new Error(msg));
				return;
			}
			if (!/<svg[\s>]/i.test(stdout)) {
				const msg = stderr.trim() || "plantuml.jar returned non-SVG output";
				reject(new Error(msg));
				return;
			}
			resolve(stdout);
		});
		child.stdin.on("error", err => {
			reject(err);
		});
		child.stdin.end(String(source || ""));
	});
}

function parseCtuGroups(content) {
	const lines = String(content || "").split(/\r?\n/);
	const groups = [];
	let current = { title: [], description: [], detail: [], source: [] };
	let section = "";
	let headerTitle = "";
	let headerDescriptionLines = [];
	let headerParsed = false;

	function normalize(blockLines) {
		const arr = Array.isArray(blockLines) ? blockLines.slice() : [];
		while (arr.length && !String(arr[0]).trim()) arr.shift();
		while (arr.length && !String(arr[arr.length - 1]).trim()) arr.pop();
		const text = arr.join("\n");
		if (/^none$/i.test(text.trim())) return "";
		return text;
	}

	function flushGroup() {
		const title = normalize(current.title);
		const description = normalize(current.description);
		const detail = normalize(current.detail);
		const source = normalize(current.source);
		if (title || description || detail || source) {
			groups.push({ title, description, detail, source });
		}
		current = { title: [], description: [], detail: [], source: [] };
		section = "";
	}

	for (const line of lines) {
		if (/^\s*#/.test(line)) {
			continue;
		}
		if (!headerParsed) {
			const titleMatch = line.match(/^\s*Title\s*:\s*(.*)\s*$/i);
			if (titleMatch) {
				headerTitle = normalize([titleMatch[1]]);
				continue;
			}
			const describeMatch = line.match(/^\s*Describe\s*:\s*(.*)\s*$/i);
			if (describeMatch) {
				headerDescriptionLines.push(describeMatch[1] || "");
				continue;
			}
			// Support multiline Describe until header/example separator.
			if (headerDescriptionLines.length > 0 && !/^-{60,}\s*$/.test(line)) {
				headerDescriptionLines.push(line);
				continue;
			}
		}
		// Multi-example separator: "------------------------------------------------------------"
		if (/^-{60,}\s*$/.test(line)) {
			if (!headerParsed) {
				headerParsed = true;
				continue;
			}
			flushGroup();
			continue;
		}
		const header = line.match(/^\[(Example|Description|Detail|UML)\]\s*$/i);
		if (header) {
			const token = header[1].toLowerCase();
			// If a new [Example] starts after an existing group already has UML content,
			// split into a new group even when separator line is omitted.
			if (token === "example" && (current.title.length || current.description.length || current.source.length)) {
				flushGroup();
			}
			if (token === "example") section = "title";
			if (token === "description") section = "description";
			if (token === "detail") section = "detail";
			if (token === "uml") section = "source";
			continue;
		}
		if (!section) continue;
		current[section].push(line);
	}
	flushGroup();
	const headerDescription = normalize(headerDescriptionLines);
	return groups.map(group => Object.assign({}, group, {
		sectionTitle: headerTitle,
		sectionDescription: headerDescription
	}));
}

function localizeValue(byLang, lang, separator) {
	const zh = String(byLang && byLang.zh ? byLang.zh : "").trim();
	const en = String(byLang && byLang.en ? byLang.en : "").trim();
	const mode = lang === "en" ? "en" : "zh";
	if (mode === "en") return en || zh;
	return zh || en;
}

function toUrlPath(relativePath) {
	return `/${String(relativePath || "")
		.split("/")
		.map(segment => encodeURIComponent(segment))
		.join("/")}`;
}

function createHttpError(statusCode, message) {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
}

function splitCtuLines(content) {
	const text = String(content || "");
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const hadFinalNewline = /\r?\n$/.test(text);
	const lines = text.split(/\r?\n/);
	if (hadFinalNewline) {
		lines.pop();
	}
	return { lines, eol, hadFinalNewline };
}

function normalizeCtuLines(blockLines) {
	const arr = Array.isArray(blockLines) ? blockLines.slice() : [];
	while (arr.length && !String(arr[0]).trim()) arr.shift();
	while (arr.length && !String(arr[arr.length - 1]).trim()) arr.pop();
	const text = arr.join("\n");
	if (/^none$/i.test(text.trim())) return "";
	return text;
}

function createCtuRangeGroup() {
	return {
		title: [],
		description: [],
		detail: [],
		source: [],
		sections: {},
		startLine: -1,
		endLine: -1
	};
}

function parseCtuGroupRanges(content) {
	const parsed = splitCtuLines(content);
	const groups = [];
	let current = createCtuRangeGroup();
	let section = "";
	let headerDescriptionLines = [];
	let headerParsed = false;

	function sectionKey(token) {
		if (token === "example") return "title";
		if (token === "description") return "description";
		if (token === "detail") return "detail";
		if (token === "uml") return "source";
		return "";
	}

	function closeSection(endLine) {
		if (!section || !current.sections[section]) return;
		current.sections[section].endLine = endLine;
	}

	function hasFlushableGroup() {
		const title = normalizeCtuLines(current.title);
		const description = normalizeCtuLines(current.description);
		const detail = normalizeCtuLines(current.detail);
		const source = normalizeCtuLines(current.source);
		return Boolean(title || description || detail || source);
	}

	function flushGroup(endLine) {
		closeSection(endLine);
		if (hasFlushableGroup()) {
			current.endLine = endLine;
			groups.push(current);
		}
		current = createCtuRangeGroup();
		section = "";
	}

	function beginSection(nextSection, lineIndex) {
		closeSection(lineIndex);
		section = nextSection;
		if (current.startLine < 0) {
			current.startLine = lineIndex;
		}
		current.sections[section] = {
			headerLine: lineIndex,
			startLine: lineIndex + 1,
			endLine: lineIndex + 1
		};
	}

	for (let i = 0; i < parsed.lines.length; i += 1) {
		const line = parsed.lines[i];
		if (/^\s*#/.test(line)) {
			continue;
		}
		if (!headerParsed) {
			const titleMatch = line.match(/^\s*Title\s*:\s*(.*)\s*$/i);
			if (titleMatch) {
				continue;
			}
			const describeMatch = line.match(/^\s*Describe\s*:\s*(.*)\s*$/i);
			if (describeMatch) {
				headerDescriptionLines.push(describeMatch[1] || "");
				continue;
			}
			if (headerDescriptionLines.length > 0 && !/^-{60,}\s*$/.test(line)) {
				headerDescriptionLines.push(line);
				continue;
			}
		}
		if (/^-{60,}\s*$/.test(line)) {
			if (!headerParsed) {
				headerParsed = true;
				continue;
			}
			flushGroup(i);
			continue;
		}
		const header = line.match(/^\[(Example|Description|Detail|UML)\]\s*$/i);
		if (header) {
			const token = header[1].toLowerCase();
			if (token === "example" && (current.title.length || current.description.length || current.source.length)) {
				flushGroup(i);
			}
			beginSection(sectionKey(token), i);
			continue;
		}
		if (!section) continue;
		current[section].push(line);
	}
	flushGroup(parsed.lines.length);
	return Object.assign(parsed, { groups });
}

function sourceToCtuLines(source) {
	const text = String(source || "").replace(/\r\n?/g, "\n");
	const lines = text.split("\n");
	while (lines.length && !String(lines[0]).trim()) lines.shift();
	while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
	return lines;
}

function joinCtuLines(lines, eol, hadFinalNewline) {
	const text = lines.join(eol);
	return hadFinalNewline ? `${text}${eol}` : text;
}

function replaceCtuGroupUml(content, groupIndex, source) {
	const parsed = parseCtuGroupRanges(content);
	const index = Number.parseInt(groupIndex, 10);
	if (!Number.isInteger(index) || index < 0 || index >= parsed.groups.length) {
		throw createHttpError(404, "CTU group not found");
	}

	const group = parsed.groups[index];
	const sourceLines = sourceToCtuLines(source);
	const sourceBlock = sourceLines.slice();
	const section = group.sections.source;
	if (section) {
		if (section.endLine < parsed.lines.length) {
			sourceBlock.push("");
		}
		const nextLines = parsed.lines
			.slice(0, section.startLine)
			.concat(sourceBlock, parsed.lines.slice(section.endLine));
		return joinCtuLines(nextLines, parsed.eol, parsed.hadFinalNewline);
	}

	const insertAt = group.sections.detail ? group.sections.detail.headerLine : group.endLine;
	const insertLines = [];
	if (insertAt > 0 && String(parsed.lines[insertAt - 1] || "").trim()) {
		insertLines.push("");
	}
	insertLines.push("[UML]", ...sourceLines);
	if (insertAt < parsed.lines.length) {
		insertLines.push("");
	}
	const nextLines = parsed.lines
		.slice(0, insertAt)
		.concat(insertLines, parsed.lines.slice(insertAt));
	return joinCtuLines(nextLines, parsed.eol, parsed.hadFinalNewline);
}

function resolveCacheHtmlTarget(rootDir, requestedPath) {
	const relativeInput = String(requestedPath || "").replace(/\\/g, "/");
	if (!relativeInput || relativeInput.startsWith("/") || relativeInput.includes("\0")) {
		throw createHttpError(400, "Invalid cache HTML path");
	}

	const cacheDir = path.join(rootDir, "cache");
	const absPath = path.resolve(rootDir, relativeInput);
	if (!isPathInside(cacheDir, absPath)) {
		throw createHttpError(400, "Cache HTML path must be inside cache/");
	}
	if (path.extname(absPath).toLowerCase() !== ".html") {
		throw createHttpError(400, "Cache path must point to an HTML file");
	}
	if (path.basename(absPath) === "_TEMPLATE.html") {
		throw createHttpError(400, "Cannot delete _TEMPLATE.html");
	}

	const relativePath = path.relative(rootDir, absPath).split(path.sep).join("/");
	const dataName = path.basename(absPath, ".html");
	const dataDir = dataName === "demo" ? null : path.join(rootDir, "data", dataName);
	return { absPath, relativePath, dataDir, dataName };
}

function resolveCtuFileTarget(rootDir, requestedDir, requestedFile) {
	const dirName = String(requestedDir || "demo").trim();
	const fileName = String(requestedFile || "").trim();
	if (!/^[a-zA-Z0-9_-]+$/.test(dirName)) {
		throw createHttpError(400, "Invalid data directory");
	}
	if (!fileName || fileName.includes("\0") || fileName !== path.basename(fileName)) {
		throw createHttpError(400, "Invalid CTU file name");
	}
	if (path.extname(fileName).toLowerCase() !== ".ctu") {
		throw createHttpError(400, "Target file must be a .ctu file");
	}

	const dataDir = path.join(rootDir, "data", dirName);
	const absPath = path.resolve(dataDir, fileName);
	if (!isPathInside(dataDir, absPath)) {
		throw createHttpError(400, "CTU file must be inside the selected data directory");
	}
	const relativePath = path.relative(rootDir, absPath).split(path.sep).join("/");
	return { absPath, relativePath, dirName, fileName };
}

async function saveDemoUmlSource(rootDir, body) {
	const target = resolveCtuFileTarget(rootDir, body && body.dir, body && body.file);
	let raw = "";
	try {
		raw = await fs.promises.readFile(target.absPath, "utf8");
	} catch (err) {
		if (err && err.code === "ENOENT") {
			throw createHttpError(404, "CTU file not found");
		}
		throw err;
	}
	const next = replaceCtuGroupUml(raw, body && body.groupIndex, body && body.source);
	await fs.promises.writeFile(target.absPath, next, "utf8");
	return {
		path: target.relativePath,
		groupIndex: Number.parseInt(body && body.groupIndex, 10)
	};
}

async function listCacheHtmlFiles(rootDir = ROOT_DIR) {
	const cacheDir = path.join(rootDir, "cache");
	const files = [];

	async function walk(dir) {
		let entries = [];
		try {
			entries = await fs.promises.readdir(dir, { withFileTypes: true });
		} catch (err) {
			if (err && err.code === "ENOENT" && dir === cacheDir) {
				return;
			}
			throw err;
		}

		for (const entry of entries) {
			const absPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(absPath);
				continue;
			}
			if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".html") {
				continue;
			}
			if (entry.name === "_TEMPLATE.html") {
				continue;
			}

			const stats = await fs.promises.stat(absPath);
			const relativePath = path.relative(rootDir, absPath).split(path.sep).join("/");
			files.push({
				name: entry.name,
				path: relativePath,
				href: toUrlPath(relativePath),
				size: stats.size,
				modifiedMs: Math.round(stats.mtimeMs)
			});
		}
	}

	await walk(cacheDir);
	files.sort((a, b) => a.path.localeCompare(b.path));
	return files;
}

async function deleteCacheHtmlFile(rootDir, requestedPath) {
	const target = resolveCacheHtmlTarget(rootDir, requestedPath);
	await fs.promises.rm(target.absPath, { force: true });
	if (target.dataDir) {
		await fs.promises.rm(target.dataDir, { recursive: true, force: true });
	}
	return {
		cachePath: target.relativePath,
		dataDir: target.dataDir ? `data/${target.dataName}` : null
	};
}

async function clearGeneratedCache(rootDir = ROOT_DIR) {
	const deletedHtml = [];
	const files = await listCacheHtmlFiles(rootDir);
	for (const file of files) {
		await fs.promises.rm(path.join(rootDir, file.path), { force: true });
		deletedHtml.push(file.path);
	}

	const deletedDataDirs = [];
	const dataDir = path.join(rootDir, "data");
	let entries = [];
	try {
		entries = await fs.promises.readdir(dataDir, { withFileTypes: true });
	} catch (err) {
		if (!err || err.code !== "ENOENT") {
			throw err;
		}
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name === "demo") {
			continue;
		}
		await fs.promises.rm(path.join(dataDir, entry.name), { recursive: true, force: true });
		deletedDataDirs.push(`data/${entry.name}`);
	}

	return { deletedHtml, deletedDataDirs };
}

async function loadDemoExamplesFromData(lang, dataSubdir) {
	const safeDir = String(dataSubdir || "demo").replace(/[^a-zA-Z0-9_-]/g, "");
	const demoDir = path.join(ROOT_DIR, "data", safeDir);
	let filenames = [];
	try {
		filenames = await fs.promises.readdir(demoDir);
	} catch (err) {
		if (err && err.code === "ENOENT") {
			return {};
		}
		throw err;
	}

	const diagramMap = new Map();

	for (const name of filenames) {
		if (!name.endsWith(".ctu")) continue;
		const langMatch = name.match(/_(zh|en)\.ctu$/i);
		if (!langMatch) continue;
		const fileLang = langMatch[1].toLowerCase();
		const stem = name.slice(0, langMatch.index);
		const fileMeta = stem.match(/^(.+?)--(\d+)(?:_.*)?$/);
		if (!fileMeta) continue;
		const diagramKey = fileMeta[1];
		const id = Number.parseInt(fileMeta[2], 10);
		if (!Number.isFinite(id) || id <= 0) continue;

		const absPath = path.join(demoDir, name);
		const raw = await fs.promises.readFile(absPath, "utf8");
		const parsedGroups = parseCtuGroups(raw);
		if (!Array.isArray(parsedGroups) || parsedGroups.length === 0) continue;

		let itemMap = diagramMap.get(diagramKey);
		if (!itemMap) {
			itemMap = new Map();
			diagramMap.set(diagramKey, itemMap);
		}
		for (let i = 0; i < parsedGroups.length; i += 1) {
			const group = parsedGroups[i];
			if (!group) continue;
			const groupKey = `${id}:${i}`;
			let item = itemMap.get(groupKey);
			if (!item) {
				item = {
					id,
					groupIndex: i,
					titleI18n: {},
					descriptionI18n: {},
					detailI18n: {},
					sourceByLang: {},
					fileByLang: {}
				};
				itemMap.set(groupKey, item);
			}
			item.titleI18n[fileLang] = group.title;
			item.descriptionI18n[fileLang] = group.description;
			item.detailI18n[fileLang] = group.detail;
			item.sectionTitleI18n = item.sectionTitleI18n || {};
			item.sectionDescriptionI18n = item.sectionDescriptionI18n || {};
			item.sectionTitleI18n[fileLang] = group.sectionTitle || "";
			item.sectionDescriptionI18n[fileLang] = group.sectionDescription || "";
			item.sourceByLang[fileLang] = group.source;
			item.fileByLang[fileLang] = name;
		}
	}

	const out = {};
	for (const [diagramKey, itemMap] of diagramMap.entries()) {
		const items = Array.from(itemMap.values())
			.sort((a, b) => (a.id - b.id) || (a.groupIndex - b.groupIndex))
				.map(item => {
					const preferredLang = lang === "en" ? "en" : "zh";
					const fallbackLang = preferredLang === "en" ? "zh" : "en";
					const sourceLang = item.sourceByLang[preferredLang] ? preferredLang : (item.sourceByLang[fallbackLang] ? fallbackLang : "");
					const source = sourceLang ? String(item.sourceByLang[sourceLang] || "").trim() : "";
					const hasUml = Boolean(source);
					return {
						id: item.id + item.groupIndex,
						titleI18n: item.titleI18n,
						descriptionI18n: item.descriptionI18n,
						sectionTitleI18n: item.sectionTitleI18n,
						sectionDescriptionI18n: item.sectionDescriptionI18n,
						detailI18n: item.detailI18n,
						sectionTitle: localizeValue(item.sectionTitleI18n, lang, "\n"),
						sectionDescription: localizeValue(item.sectionDescriptionI18n, lang, "\n\n"),
						title: localizeValue(item.titleI18n, lang, "\n"),
						description: localizeValue(item.descriptionI18n, lang, "\n\n"),
						detail: localizeValue(item.detailI18n, lang, "\n\n"),
						hasUml,
						source,
						saveTarget: sourceLang && item.fileByLang[sourceLang] ? {
							dir: safeDir,
							file: item.fileByLang[sourceLang],
							lang: sourceLang,
							groupIndex: item.groupIndex
						} : null
					};
				});
		if (items.length) {
			out[diagramKey] = items;
		}
	}
	return out;
}

function resolveStaticPath(urlPath) {
	let pathname = decodeURIComponent(urlPath);
	const movedToJs = new Set([
		"/plantuml.js",
		"/viz-global.js",
		"/markdown-it.js",
		"/openiconic.js",
		"/emoji.js"
	]);
	if (movedToJs.has(pathname)) {
		pathname = `/js${pathname}`;
	}
	if (pathname === "/") {
		pathname = "/index.html";
	}
	const absPath = path.resolve(ROOT_DIR, `.${pathname}`);
	if (!isPathInside(ROOT_DIR, absPath)) {
		return null;
	}
	return absPath;
}

function serveStaticFile(req, res, absPath) {
	fs.stat(absPath, (statErr, stats) => {
		if (statErr) {
			res.statusCode = statErr.code === "ENOENT" ? 404 : 500;
			res.end(statErr.code === "ENOENT" ? "Not Found" : "Server Error");
			return;
		}

			const filePath = stats.isDirectory() ? path.join(absPath, "demo.html") : absPath;
		fs.stat(filePath, (fileStatErr, fileStats) => {
			if (fileStatErr || !fileStats.isFile()) {
				res.statusCode = 404;
				res.end("Not Found");
				return;
			}

			const ext = path.extname(filePath).toLowerCase();
			res.statusCode = 200;
			res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
			res.setHeader("Content-Length", fileStats.size);
			if (req.method === "HEAD") {
				res.end();
				return;
			}

			const stream = fs.createReadStream(filePath);
			stream.on("error", () => {
				res.statusCode = 500;
				res.end("Server Error");
			});
			stream.pipe(res);
		});
	});
}

const server = http.createServer(async (req, res) => {
	try {
		const method = (req.method || "GET").toUpperCase();
		const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

			if (method === "GET" && requestUrl.pathname === "/api/demo-examples") {
				const lang = requestUrl.searchParams.get("lang") || "zh";
				const dir = requestUrl.searchParams.get("dir") || "demo";
				try {
					const payload = await loadDemoExamplesFromData(lang, dir);
					sendJson(res, 200, payload);
				} catch (err) {
					console.error("Failed to load demo examples from data directory:", err);
					sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
				}
				return;
			}

			if (method === "POST" && requestUrl.pathname === "/api/demo-uml") {
				const bodyRaw = await readRequestBody(req);
				let body = null;
				try {
					body = bodyRaw ? JSON.parse(bodyRaw) : {};
				} catch {
					sendJson(res, 400, { error: "Invalid JSON body" });
					return;
				}

				try {
					const result = await saveDemoUmlSource(ROOT_DIR, body);
					sendJson(res, 200, result);
				} catch (err) {
					const statusCode = err && err.statusCode ? err.statusCode : 500;
					if (statusCode >= 500) {
						console.error("Failed to save demo UML source:", err);
					}
					sendJson(res, statusCode, { error: err && err.message ? err.message : String(err) });
				}
				return;
			}

			if (method === "POST" && requestUrl.pathname === "/api/plantuml-svg") {
				const bodyRaw = await readRequestBody(req);
				let body = null;
				try {
					body = bodyRaw ? JSON.parse(bodyRaw) : {};
				} catch {
					sendJson(res, 400, { error: "Invalid JSON body" });
					return;
				}

			const source = body && typeof body.source === "string" ? body.source : "";
			if (!source.trim()) {
				sendJson(res, 400, { error: "Missing PlantUML source" });
				return;
			}

			try {
				const svg = await runPlantUmlJar(source);
				sendJson(res, 200, { svg });
			} catch (err) {
				console.error("PlantUML jar render failed:", err);
				sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
			}
			return;
		}

		if (method === "GET" && requestUrl.pathname === "/api/cache-html") {
			try {
				const files = await listCacheHtmlFiles(ROOT_DIR);
				sendJson(res, 200, { files });
			} catch (err) {
				console.error("Failed to list cache HTML files:", err);
				sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
			}
			return;
		}

		if (method === "DELETE" && requestUrl.pathname === "/api/cache-html") {
			try {
				const bodyRaw = await readRequestBody(req);
				let body = null;
				try {
					body = bodyRaw ? JSON.parse(bodyRaw) : {};
				} catch {
					sendJson(res, 400, { error: "Invalid JSON body" });
					return;
				}
				const result = await deleteCacheHtmlFile(ROOT_DIR, body && body.path);
				sendJson(res, 200, result);
			} catch (err) {
				const statusCode = err && err.statusCode ? err.statusCode : 500;
				if (statusCode >= 500) {
					console.error("Failed to delete cache HTML file:", err);
				}
				sendJson(res, statusCode, { error: err && err.message ? err.message : String(err) });
			}
			return;
		}

		if (method === "DELETE" && requestUrl.pathname === "/api/cache-html/all") {
			try {
				const result = await clearGeneratedCache(ROOT_DIR);
				sendJson(res, 200, result);
			} catch (err) {
				console.error("Failed to clear generated cache files:", err);
				sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
			}
			return;
		}

		if (method !== "GET" && method !== "HEAD") {
			res.statusCode = 405;
			res.setHeader("Allow", "GET, HEAD, POST, DELETE");
			res.end("Method Not Allowed");
			return;
		}

		const filePath = resolveStaticPath(requestUrl.pathname);
		if (!filePath) {
			res.statusCode = 403;
			res.end("Forbidden");
			return;
		}
		serveStaticFile(req, res, filePath);
	} catch (err) {
		res.statusCode = 500;
		res.end("Server Error");
		console.error("Dev server error:", err);
	}
});

server.listen(PORT, HOST, () => {
	console.log(`Serving on http://localhost:${PORT}`);
	console.log("PlantUML jar fallback endpoint: POST /api/plantuml-svg");
});
