"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function escapeHtml(value) {
	return String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

class Element {
	constructor(tagName) {
		this.tagName = String(tagName || "").toUpperCase();
		this.children = [];
		this.dataset = {};
		this.attributes = {};
		this.className = "";
		this.id = "";
		this.value = "";
		this._innerHTML = "";
	}

	appendChild(child) {
		this.children.push(child);
		return child;
	}

	setAttribute(name, value) {
		this.attributes[name] = String(value);
		if (name.startsWith("data-")) {
			const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
			this.dataset[key] = String(value);
		}
	}

	addEventListener() {}

	set textContent(value) {
		this.children = [];
		this._innerHTML = escapeHtml(value);
	}

	get textContent() {
		return this._innerHTML.replace(/<[^>]+>/g, "");
	}

	set innerHTML(value) {
		this.children = [];
		this._innerHTML = String(value || "");
		if (this._innerHTML.includes("data-source")) {
			const sourceWrap = new Element("div");
			sourceWrap.className = "example-source";
			const source = new Element("textarea");
			source.setAttribute("data-source", "");
			sourceWrap.appendChild(source);
			const preview = new Element("div");
			preview.className = "example-preview";
			preview.setAttribute("data-preview", "");
			this.appendChild(sourceWrap);
			this.appendChild(preview);
		}
		if (this._innerHTML.includes("data-action")) {
			for (const action of ["copy-source", "copy-svg", "download-svg"]) {
				const button = new Element("button");
				button.setAttribute("data-action", action);
				this.appendChild(button);
			}
		}
	}

	get innerHTML() {
		return this._innerHTML;
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] || null;
	}

	querySelectorAll(selector) {
		const matches = [];
		function visit(node) {
			if (matchesSelector(node, selector)) matches.push(node);
			for (const child of node.children) visit(child);
		}
		visit(this);
		return matches;
	}
}

function matchesSelector(node, selector) {
	if (selector.startsWith(".")) {
		return String(node.className || "").split(/\s+/).includes(selector.slice(1));
	}
	const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);
	if (dataMatch) {
		const key = dataMatch[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
		return Object.prototype.hasOwnProperty.call(node.dataset, key);
	}
	return false;
}

const context = {
	document: {
		createElement(tagName) {
			return new Element(tagName);
		}
	},
	window: {
		DocsI18n: {
			getMode() {
				return "zh";
			}
		},
		markdownit() {
			return {
				render(text) {
					return `<p>${escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>\n`;
				}
			};
		}
	}
};

vm.runInNewContext(
	fs.readFileSync("component/demo-example-component.js", "utf8"),
	context,
	{ filename: "component/demo-example-component.js" }
);
vm.runInNewContext(
	fs.readFileSync("component/docs-page-core.js", "utf8"),
	context,
	{ filename: "component/docs-page-core.js" }
);

const component = context.window.PlantUmlDemoExample;
const core = context.window.PlantUmlDocsCore;

const node = component.createExampleNode({
	diagramKey: "Sequence",
	index: 0,
	item: {
		detailI18n: {
			zh: "中文 **详情**",
			en: "English **detail**"
		},
		source: "@startuml\n@enduml"
	}
});
const message = node.querySelector("[data-example-message]");

assert.equal(message.tagName, "DIV", "Detail markdown container should support block-level markdown nodes");
assert.match(message.innerHTML, /<strong>详情<\/strong>/, "initial Detail should render markdown");
assert.equal(message.dataset.detail, "中文 **详情**");
assert.match(message.dataset.detailHtml, /<strong>详情<\/strong>/);

component.applyExampleLocale(node, {
	detailI18n: {
		zh: "中文 **详情**",
		en: "English **detail**"
	}
}, 0, "en");
assert.match(message.innerHTML, /<strong>detail<\/strong>/, "localized Detail should render markdown");

core.setExampleMessage(node, "rendering", "success");
assert.equal(message.innerHTML, "rendering", "status messages should remain plain text");
core.clearExampleMessage(node);
assert.match(message.innerHTML, /<strong>detail<\/strong>/, "clearing state should restore markdown Detail");
assert.equal(message.dataset.state, "");
