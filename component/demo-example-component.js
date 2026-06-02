"use strict";

(function exposeDemoExampleComponent(root) {
	function isNoneTitle(value) {
		return /^none$/i.test(String(value || "").trim());
	}

	function detailForMode(item, mode) {
		const detailI18n = item && item.detailI18n && typeof item.detailI18n === "object" ? item.detailI18n : null;
		if (detailI18n) {
			if (mode === "en") return String(detailI18n.en || detailI18n.zh || "");
			return String(detailI18n.zh || detailI18n.en || "");
		}
		return String(item && item.detail ? item.detail : "");
	}

	const markdown = typeof root.markdownit === "function"
		? root.markdownit({
			html: false,
			breaks: true,
			linkify: true
		})
		: null;

	function renderMarkdown(text) {
		const raw = String(text || "");
		if (!raw.trim()) return "";
		if (markdown && typeof markdown.render === "function") {
			return markdown.render(raw);
		}
		// Fallback when markdown-it fails to load.
		return raw
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\r?\n/g, "<br>");
	}

	function setDetailMessage(message, detail) {
		const html = renderMarkdown(detail);
		message.dataset.detail = detail;
		message.dataset.detailHtml = html;
		if (!message.dataset.state || message.dataset.state === "") {
			message.innerHTML = html;
		}
	}

	function applyExampleLocale(wrapper, item, index, mode) {
		const titleI18n = item && item.titleI18n && typeof item.titleI18n === "object" ? item.titleI18n : null;
		const descI18n = item && item.descriptionI18n && typeof item.descriptionI18n === "object" ? item.descriptionI18n : null;
		const mergedTitle = titleI18n
			? (mode === "en"
				? (titleI18n.en || titleI18n.zh || "")
				: (titleI18n.zh || titleI18n.en || ""))
			: "";
		const mergedDesc = descI18n
			? (mode === "en"
				? (descI18n.en || descI18n.zh || "")
				: (descI18n.zh || descI18n.en || ""))
			: "";
		const heading = wrapper.querySelector(".demo-example-title");
		if (heading) {
			const rawTitle = mergedTitle || item.title || "";
			if (rawTitle && !isNoneTitle(rawTitle)) {
				heading.textContent = rawTitle;
			} else {
				heading.textContent = "";
			}
		}
		const desc = wrapper.querySelector(".demo-example-desc");
		if (desc) {
			const markdown = mergedDesc || item.description || "";
			desc.innerHTML = renderMarkdown(markdown);
		}
		const message = wrapper.querySelector("[data-example-message]");
		if (message) {
			const detail = detailForMode(item, mode);
			setDetailMessage(message, detail);
		}
	}

	function createExampleNode(options) {
		const {
			diagramKey,
			item,
			index,
			onSourceInput,
			onActionClick
		} = options || {};

		const exampleItem = Object.assign({}, item || {});
		const hasUml = exampleItem.hasUml !== false && Boolean(String(exampleItem.source || "").trim());

		const safeDiagramKey = String(diagramKey || "").toLowerCase().replace(/\s+/g, "-");
		const wrapper = document.createElement("div");
		wrapper.className = hasUml ? "example" : "example example-no-uml";
		wrapper.id = `demo-example-${safeDiagramKey}-${index + 1}`;
		wrapper.dataset.filename = `demo-${safeDiagramKey}-${index + 1}`;
		wrapper.dataset.hasUml = hasUml ? "true" : "false";

		const heading = document.createElement("h3");
		heading.className = "demo-example-title";
		heading.textContent = isNoneTitle(exampleItem.title) ? "" : (exampleItem.title || "");
		wrapper.appendChild(heading);

		if (exampleItem.description || (exampleItem.descriptionI18n && (exampleItem.descriptionI18n.zh || exampleItem.descriptionI18n.en))) {
			const desc = document.createElement("div");
			desc.className = "demo-example-desc";
			desc.innerHTML = renderMarkdown(exampleItem.description || "");
			wrapper.appendChild(desc);
		}

		const actions = document.createElement("div");
		actions.className = "example-actions";
		actions.setAttribute("data-i18n-role", "example-actions");
		actions.setAttribute("aria-label", "示例操作");
		actions.innerHTML = '<button class="icon-button" type="button" data-action="copy-source" aria-label="复制源码" data-tooltip="复制源码"><span class="button-icon" aria-hidden="true"></span></button><button class="icon-button" type="button" data-action="copy-svg" aria-label="复制 SVG" data-tooltip="复制 SVG"><span class="button-icon" aria-hidden="true"></span></button><button class="icon-button" type="button" data-action="download-svg" aria-label="下载 SVG" data-tooltip="下载 SVG"><span class="button-icon" aria-hidden="true"></span></button>';
		wrapper.appendChild(actions);

		const grid = document.createElement("div");
		grid.className = "example-grid";
		grid.innerHTML = '<div class="example-source"><textarea data-source spellcheck="false" autocapitalize="none" autocorrect="off"></textarea></div><div class="example-preview" data-preview></div>';
		wrapper.appendChild(grid);

		const previewNode = grid.querySelector("[data-preview]");
		previewNode.id = `demo-preview-${safeDiagramKey}-${index + 1}`;
		if (!hasUml) {
			actions.remove();
			grid.remove();
		}

		const message = document.createElement("div");
		message.className = "example-message";
		message.setAttribute("data-example-message", "");
		const mode = root.DocsI18n && typeof root.DocsI18n.getMode === "function" ? root.DocsI18n.getMode() : "zh";
		const initialDetail = detailForMode(exampleItem, mode);
		if (initialDetail) {
			setDetailMessage(message, initialDetail);
		}
		wrapper.appendChild(message);

		const source = wrapper.querySelector("[data-source]");
		if (source) {
			source.value = exampleItem.source || "";
			source.addEventListener("input", () => {
				if (typeof onSourceInput === "function") {
					onSourceInput(wrapper);
				}
			});
		}

		for (const btn of Array.from(wrapper.querySelectorAll("[data-action]"))) {
			btn.addEventListener("click", () => {
				if (typeof onActionClick === "function") {
					onActionClick(wrapper, btn);
				}
			});
		}

		applyExampleLocale(wrapper, exampleItem, index, mode);

		return wrapper;
	}

	root.PlantUmlDemoExample = { createExampleNode, applyExampleLocale, renderMarkdown };
})(window);
