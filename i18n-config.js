"use strict";

	(function exposeI18n(root) {
	const MODE_KEY = "plantuml-docs-lang";
	const defaultMode = "zh";

	const dictionaries = {
		zh: Object.assign({}, root.__DOCS_I18N_ZH__ || {}, { demoExamples: root.__DOCS_I18N_ZH_DEMO_EXAMPLES__ || {} }),
		en: Object.assign({}, root.__DOCS_I18N_EN__ || {}, { demoExamples: root.__DOCS_I18N_EN_DEMO_EXAMPLES__ || {} })
	};

	function getMode() {
		const saved = root.localStorage && root.localStorage.getItem(MODE_KEY);
		return saved === "zh" || saved === "en" ? saved : defaultMode;
	}

	function setMode(mode) {
		if (mode !== "zh" && mode !== "en") return;
		if (root.localStorage) root.localStorage.setItem(MODE_KEY, mode);
	}

	function getByPath(obj, key) {
		if (!obj || !key) return "";
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			return obj[key];
		}
		const parts = String(key).split(".");
		let current = obj;
		for (const part of parts) {
			if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) {
				return "";
			}
			current = current[part];
		}
		return current;
	}

	function t(key, mode) {
		const activeMode = mode || getMode();
		const value = getByPath(dictionaries[activeMode], key);
		if (typeof value === "string") {
			return value;
		}
		const zhValue = getByPath(dictionaries.zh, key);
		return typeof zhValue === "string" ? zhValue : "";
	}

		function apply(mode) {
			document.documentElement.lang = mode === "en" ? "en" : "zh-CN";
			document.documentElement.setAttribute("data-lang-mode", mode);
			document.title = t("demoPage.pageTitle", mode);

			document.dispatchEvent(new CustomEvent("docs:langchange", { detail: { mode } }));
		}

	root.DocsI18n = { getMode, setMode, apply, t };
})(typeof window !== "undefined" ? window : globalThis);
