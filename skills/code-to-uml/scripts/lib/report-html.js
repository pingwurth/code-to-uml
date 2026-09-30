#!/usr/bin/env node
"use strict";

// Shared HTML-shell compiler utilities for Code-To-UML report pages.
//
// scaffold-report.js uses this module to compile cache/<slug>.html from
// cache/_TEMPLATE.html (init) or to refresh the data-derived parts of an
// existing report page (tabs, overviews, demo title, data-dir) without
// touching hand-edited content such as the intro overview or the h1 title.
//
// Every locator is defensive: when a fixed template anchor is missing, the
// functions throw with an actionable message instead of writing a broken page.

const CANONICAL_CATEGORY_ORDER = [
	"overview",
	"structure",
	"objects",
	"architecture",
	"flow",
	"calls",
	"dataflow",
	"code",
	"principles",
	"guide"
];

const DEFAULT_LABELS = {
	zh: {
		overview: "概览",
		structure: "顶层结构",
		objects: "核心对象",
		architecture: "架构图",
		flow: "核心流程",
		calls: "调用关系",
		dataflow: "数据流",
		code: "代码解析",
		principles: "核心原理",
		guide: "上手指南"
	},
	en: {
		overview: "Overview",
		structure: "Structure",
		objects: "Objects",
		architecture: "Architecture",
		flow: "Flow",
		calls: "Calls",
		dataflow: "Data Flow",
		code: "Code",
		principles: "Principles",
		guide: "Guide"
	}
};

// Section ID -> owning category, mirroring the Category Ownership table in
// references/report-contract.md. Used by plan-report.js to tell the agent
// where each required section belongs.
const SECTION_OWNER = {
	S01_TARGET_OVERVIEW: "overview",
	S02_TOP_LEVEL_STRUCTURE: "structure",
	S03_CORE_OBJECTS: "objects",
	S04_ARCHITECTURE: "architecture",
	S05_CORE_FLOW: "flow",
	S06_CALL_RELATIONSHIPS: "calls",
	S07_DATA_OR_STATE_FLOW: "dataflow",
	S08_CODE_SNIPPETS: "code",
	S09_CORE_PRINCIPLES: "principles",
	S10_ONBOARDING_GUIDE: "guide",
	S11_RISKS_AND_IMPROVEMENTS: "principles",
	S12_REVIEWER_QUESTIONS: "guide",
	S13_MAINTAINER_REFERENCE: "guide"
};

function escapeHtml(text) {
	return String(text || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function decodeHtmlEntities(text) {
	return String(text || "")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
}

function normalizeNone(value) {
	const trimmed = String(value || "").trim();
	return /^none$/i.test(trimmed) ? "" : trimmed;
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

function commentRanges(html) {
	const ranges = [];
	const re = /<!--[\s\S]*?-->/g;
	let match;
	while ((match = re.exec(html)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}
	return ranges;
}

function insideRanges(ranges, index) {
	return ranges.some(([start, end]) => index >= start && index < end);
}

// Run a regex over the HTML while skipping matches that start inside HTML
// comments. The template's authoring comments quote tag examples such as
// <nav class="demo-tabs"> and <button data-diagram="...">, which must never
// be mistaken for real runtime anchors.
function regexMatchAllOutsideComments(html, pattern) {
	const ranges = commentRanges(html);
	const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
	const re = new RegExp(pattern.source, flags);
	const matches = [];
	let match;
	while ((match = re.exec(html)) !== null) {
		if (match.index === re.lastIndex) {
			re.lastIndex += 1;
			continue;
		}
		if (!insideRanges(ranges, match.index)) {
			matches.push(match);
			continue;
		}
		// A match starting inside a comment can span real content after the
		// comment (authoring comments quote example tags). Advance by one
		// character instead of trusting lastIndex so an overlapping,
		// comment-free match on the real anchor is still found.
		re.lastIndex = match.index + 1;
	}
	return matches;
}

function regexMatchOutsideComments(html, pattern) {
	return regexMatchAllOutsideComments(html, pattern)[0] || null;
}

function replaceRange(html, match, replacement) {
	return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

// Read Title:/Describe: from a .ctu file header (text before the first separator).
// Describe may span multiple lines; it ends at the separator or at the next
// "Key:" header line. Both fields normalize "None" to an empty string.
function parseCtuHeader(text) {
	let title = "";
	let describe = "";
	let inDescribe = false;
	for (const line of String(text || "").split(/\r?\n/)) {
		if (/^-{60,}\s*$/.test(line)) {
			break;
		}
		const titleMatch = /^Title:[ \t]*(.*)$/.exec(line);
		if (titleMatch) {
			title = titleMatch[1].trim();
			inDescribe = false;
			continue;
		}
		const describeMatch = /^Describe:[ \t]*(.*)$/.exec(line);
		if (describeMatch) {
			describe = describeMatch[1].trim();
			inDescribe = true;
			continue;
		}
		if (inDescribe) {
			if (/^[A-Za-z][A-Za-z0-9 _-]*:/.test(line)) {
				inDescribe = false;
				continue;
			}
			const trimmed = line.trim();
			if (trimmed) {
				describe = describe ? `${describe} ${trimmed}` : trimmed;
			}
		}
	}
	return { title: normalizeNone(title), describe: normalizeNone(describe) };
}

function extractTabs(html) {
	const tabs = [];
	for (const match of regexMatchAllOutsideComments(html, /<button\b[^>]*>/gi)) {
		const attrs = parseAttrs(match[0]);
		if (!hasClass(attrs, "demo-tab") || !attrs["data-diagram"]) {
			continue;
		}
		const close = html.indexOf("</button>", match.index);
		const rawLabel = close >= 0
			? html.slice(match.index + match[0].length, close).replace(/<[^>]+>/g, "")
			: "";
		tabs.push({
			category: attrs["data-diagram"],
			label: decodeHtmlEntities(rawLabel).trim(),
			active: hasClass(attrs, "is-active")
		});
	}
	return tabs;
}

function extractOverviews(html) {
	const items = [];
	for (const match of regexMatchAllOutsideComments(html, /<p\b[^>]*>/gi)) {
		const attrs = parseAttrs(match[0]);
		if (!hasClass(attrs, "demo-section-overview") || !attrs["data-diagram-overview"]) {
			continue;
		}
		const close = html.indexOf("</p>", match.index);
		if (close < 0) {
			throw new Error("Malformed overview paragraph: <p data-diagram-overview> has no closing </p>.");
		}
		items.push({
			category: attrs["data-diagram-overview"],
			text: decodeHtmlEntities(
				html.slice(match.index + match[0].length, close).replace(/\s+/g, " ")
			).trim(),
			active: hasClass(attrs, "is-active"),
			start: match.index,
			end: close + "</p>".length
		});
	}
	return items;
}

// Canonical categories first (report-contract order), then custom ones alphabetically.
function orderCategories(categories) {
	const unique = [...new Set(categories)];
	const canonical = CANONICAL_CATEGORY_ORDER.filter((category) => unique.includes(category));
	const custom = unique.filter((category) => !CANONICAL_CATEGORY_ORDER.includes(category)).sort();
	return [...canonical, ...custom];
}

function labelForCategory(category, lang) {
	const labels = DEFAULT_LABELS[lang] || DEFAULT_LABELS.en;
	return labels[category] || category;
}

// Normalize one href/src value from a link/script/img tag into a servable file
// reference, shared by validate-report.js and check-runtime.js so both scripts
// agree on what counts as an asset. Returns null for empty values, URL schemes
// (http:, https:, data:, javascript:, mailto:, ...), protocol-relative //host
// references, and pure fragment links; otherwise strips the query string and
// fragment so the remainder can be checked against the filesystem.
function normalizeAssetRef(value) {
	const ref = String(value || "").trim();
	if (!ref || /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(ref)) {
		return null;
	}
	const cleaned = ref.split("?")[0].split("#")[0].trim();
	return cleaned || null;
}

function lineIndentBefore(html, index) {
	let lineStart = index;
	while (lineStart > 0 && html[lineStart - 1] !== "\n") {
		lineStart -= 1;
	}
	const match = /^[ \t]*/.exec(html.slice(lineStart, index));
	return match ? match[0] : "";
}

function setHtmlLang(html, lang) {
	const value = lang === "en" ? "en" : "zh-CN";
	const match = regexMatchOutsideComments(html, /<html\b[^>]*>/i);
	if (!match) {
		throw new Error("Cannot locate <html> tag to set the page language.");
	}
	const langRe = /\blang\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
	const tag = langRe.test(match[0])
		? match[0].replace(langRe, `lang="${value}"`)
		: match[0].replace(/<html\b/i, `<html lang="${value}"`);
	return replaceRange(html, match, tag);
}

function setPageTitle(html, title) {
	const match = regexMatchOutsideComments(html, /<title\b[^>]*>[\s\S]*?<\/title>/i);
	if (!match) {
		throw new Error("Cannot locate <title> tag to set the page title.");
	}
	return replaceRange(html, match, `<title>${escapeHtml(title)}</title>`);
}

function setH1(html, title) {
	const match = regexMatchOutsideComments(html, /<section\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>[\s\S]*?<h1\b[^>]*>[\s\S]*?<\/h1>/i);
	if (!match) {
		throw new Error("Cannot locate section.intro > h1 to set the report heading.");
	}
	const open = /<h1\b[^>]*>/i.exec(match[0]);
	return replaceRange(html, match, `${match[0].slice(0, open.index + open[0].length)}${escapeHtml(title)}</h1>`);
}

function setIntro(html, intro) {
	const match = regexMatchOutsideComments(html, /<section\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>[\s\S]*?<p\b[^>]*\bdata-markdown\b[^>]*>[\s\S]*?<\/p>/i);
	if (!match) {
		throw new Error("Cannot locate section.intro > p[data-markdown] to set the report overview.");
	}
	const open = /<p\b[^>]*\bdata-markdown\b[^>]*>/i.exec(match[0]);
	return replaceRange(html, match, `${match[0].slice(0, open.index + open[0].length)}${escapeHtml(intro)}</p>`);
}

function setBodyDataDir(html, slug) {
	const match = regexMatchOutsideComments(html, /<body\b[^>]*>/i);
	if (!match) {
		throw new Error("Cannot locate <body> tag to set data-dir.");
	}
	const dataDirRe = /\bdata-dir\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
	const tag = dataDirRe.test(match[0])
		? match[0].replace(dataDirRe, `data-dir="${slug}"`)
		: match[0].replace(/<body\b/i, `<body data-dir="${slug}"`);
	return replaceRange(html, match, tag);
}

function replaceNav(html, entries) {
	const match = regexMatchOutsideComments(html, /([ \t]*)<nav\b[^>]*class=["'][^"']*\bdemo-tabs\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i);
	if (!match) {
		throw new Error("Cannot locate <nav class=\"demo-tabs\"> to rebuild report tabs.");
	}
	const indent = match[1];
	const openMatch = /<nav\b[^>]*>/i.exec(match[0]);
	const openTag = openMatch[0];
	const bodyStart = openMatch.index + openTag.length;
	const bodyEnd = match[0].lastIndexOf("</nav>");
	// Preserve authoring comments inside the nav (for example the [CONFIG] tab
	// list marker) so rebuilds never silently drop template documentation.
	const comments = match[0].slice(bodyStart, bodyEnd).match(/<!--[\s\S]*?-->/g) || [];
	const blocks = comments.map((comment) => `${indent}\t${comment}`);
	for (const entry of entries) {
		blocks.push(`${indent}\t<button class="demo-tab${entry.active ? " is-active" : ""}" type="button" data-diagram="${entry.category}">${escapeHtml(entry.label)}</button>`);
	}
	return replaceRange(html, match, `${indent}${openTag}\n${blocks.join("\n")}\n${indent}</nav>`);
}

function replaceOverviews(html, entries) {
	const existing = extractOverviews(html);
	if (!existing.length) {
		throw new Error("Cannot locate p[data-diagram-overview] paragraphs to rebuild section overviews.");
	}
	// The overview paragraphs must be a contiguous block separated only by
	// whitespace; otherwise a whole-block rebuild would silently delete
	// unrelated markup between them. Refuse instead of overwriting.
	for (let i = 0; i + 1 < existing.length; i++) {
		if (html.slice(existing[i].end, existing[i + 1].start).trim()) {
			throw new Error("Unexpected content between p[data-diagram-overview] paragraphs; refusing to rebuild the overview block and delete unrelated markup.");
		}
	}
	const first = existing[0];
	const last = existing[existing.length - 1];
	const indent = lineIndentBefore(html, first.start);
	const lineStart = first.start - indent.length;
	if (html.slice(lineStart, first.start).trim()) {
		throw new Error("Unexpected content before the first p[data-diagram-overview] on its line; refusing to rebuild the overview block and delete unrelated markup.");
	}
	const paragraphs = entries
		.map((entry) => `${indent}<p class="demo-section-overview${entry.active ? " is-active" : ""}" data-diagram-overview="${entry.category}"${entry.active ? "" : " hidden"}>${escapeHtml(entry.overview)}</p>`)
		.join("\n");
	return html.slice(0, lineStart) + paragraphs + html.slice(last.end);
}

function replaceDemoTitle(html, label) {
	const match = regexMatchOutsideComments(html, /(<h2\b[^>]*\bid=["']demo-title["'][^>]*>)[\s\S]*?(<\/h2>)/i);
	if (!match) {
		throw new Error("Cannot locate <h2 id=\"demo-title\"> to set the default panel title.");
	}
	return replaceRange(html, match, `${match[1]}${escapeHtml(label)}${match[2]}`);
}

// Build a full report page from cache/_TEMPLATE.html.
// model: { slug, lang, title, pageTitle, intro, entries: [{category,label,overview,active}] }
function compileShell(templateHtml, model) {
	if (!model.entries || !model.entries.length) {
		throw new Error("compileShell requires at least one tab entry.");
	}
	let html = templateHtml;
	html = setHtmlLang(html, model.lang);
	html = setPageTitle(html, model.pageTitle || model.title);
	html = setH1(html, model.title);
	html = setIntro(html, model.intro);
	html = setBodyDataDir(html, model.slug);
	html = replaceNav(html, model.entries);
	html = replaceOverviews(html, model.entries);
	html = replaceDemoTitle(html, model.entries[0].label);
	return html;
}

// Refresh the data-derived parts of an existing report page in place.
// The intro, h1, and page title are preserved unless the model provides them.
function refreshShell(html, model) {
	if (!model.entries || !model.entries.length) {
		throw new Error("refreshShell requires at least one tab entry.");
	}
	let out = setHtmlLang(html, model.lang);
	out = setBodyDataDir(out, model.slug);
	out = replaceNav(out, model.entries);
	out = replaceOverviews(out, model.entries);
	out = replaceDemoTitle(out, model.entries[0].label);
	if (model.pageTitle) {
		out = setPageTitle(out, model.pageTitle);
	}
	if (model.title) {
		out = setH1(out, model.title);
	}
	if (model.intro !== undefined && model.intro !== null) {
		out = setIntro(out, model.intro);
	}
	return out;
}

module.exports = {
	CANONICAL_CATEGORY_ORDER,
	DEFAULT_LABELS,
	SECTION_OWNER,
	escapeHtml,
	decodeHtmlEntities,
	normalizeNone,
	parseAttrs,
	hasClass,
	commentRanges,
	insideRanges,
	regexMatchAllOutsideComments,
	regexMatchOutsideComments,
	replaceRange,
	parseCtuHeader,
	extractTabs,
	extractOverviews,
	orderCategories,
	labelForCategory,
	normalizeAssetRef,
	setHtmlLang,
	setPageTitle,
	setH1,
	setIntro,
	setBodyDataDir,
	replaceNav,
	replaceOverviews,
	replaceDemoTitle,
	compileShell,
	refreshShell
};