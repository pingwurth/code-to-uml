"use strict";

(function expose(root, factory) {
	const api = factory();
	if (typeof module === "object" && module.exports) {
		module.exports = api;
	}
	if (root) {
		root.PlantUmlDocsCore = api;
	}
})(typeof window !== "undefined" ? window : globalThis, function buildApi() {
	function readExampleSource(example) {
		const sourceNode = example.querySelector("[data-source]") || example.querySelector("code");
		if (!sourceNode) {
			return "";
		}
		const source = typeof sourceNode.value === "string" ? sourceNode.value : sourceNode.textContent;
		return source.replace(/^\s*\n/, "").replace(/\n\s*$/, "");
	}

	function splitPlantUmlLines(source) {
		return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	}

	function addBrowserSafeScale(source, maxHeight = 4000) {
		const lines = splitPlantUmlLines(source || "");
		if (lines.length === 0) return source || "";
		const hasScale = lines.some(line => /^\s*scale\s+/i.test(line));
		if (hasScale) return source || "";
		const startIndex = lines.findIndex(line => /^\s*@start[a-z0-9_]+/i.test(line));
		if (startIndex < 0) return source || "";
		const safeHeight = Number.isFinite(maxHeight) ? Math.max(1, Math.floor(maxHeight)) : 4000;
		lines.splice(startIndex + 1, 0, `scale max ${safeHeight} height`);
		return lines.join("\n");
	}

	function ensurePreviewId(example, index) {
		const preview = example.querySelector("[data-preview]");
		if (!preview) {
			return null;
		}
		if (!preview.id) {
			preview.id = `diagram-preview-${index + 1}`;
		}
		return preview.id;
	}

	function buildDownloadName(example, index) {
		const baseName = example.dataset.filename || `use-case-diagram-${index + 1}`;
		return baseName.endsWith(".svg") ? baseName : `${baseName}.svg`;
	}

	function setExampleMessage(example, message, state) {
		const messageNode = example.querySelector("[data-example-message]");
		if (!messageNode) {
			return;
		}
		messageNode.textContent = message;
		messageNode.dataset.state = state || "";
	}

	function clearExampleMessage(example) {
		const messageNode = example.querySelector("[data-example-message]");
		if (!messageNode) {
			return;
		}
		const detail = String(messageNode.dataset.detail || "");
		const detailHtml = String(messageNode.dataset.detailHtml || "");
		if (detailHtml) {
			messageNode.innerHTML = detailHtml;
			messageNode.dataset.state = "";
			return;
		}
		setExampleMessage(example, detail, "");
	}

	function detectPreviewError(preview) {
		if (!preview || typeof preview.querySelector !== "function") {
			return "";
		}
		const svg = preview.querySelector("svg");
		if (!svg) {
			return "";
		}

		const diagramType = String(typeof svg.getAttribute === "function" ? (svg.getAttribute("data-diagram-type") || "") : "")
			.trim()
			.toUpperCase();
		if (diagramType === "ERROR" || diagramType === "PSYSTEMERROR") {
			return `data-diagram-type=${diagramType}`;
		}

		const text = String(svg.textContent || "")
			.replace(/\s+/g, " ")
			.trim();
		if (!text) {
			return "";
		}

		const textLower = text.toLowerCase();
		const markers = [
			["syntax error?", "Syntax Error?"],
			["syntax error", "Syntax error"],
			["fatal parsing error", "Fatal parsing error"],
			["diagram not supported by this release of plantuml", "Diagram not supported by this release of PlantUML"],
			["an error has occurred", "An error has occurred"],
			["cannot parse line", "Cannot parse line"],
			["possible causes:", "Possible causes:"],
			["suggested actions:", "Suggested actions:"],
			["consult the documentation: https://plantuml.com", "consult the documentation: https://plantuml.com"],
			["no such internal sprite:", "No such internal sprite:"],
			["no such sprite:", "No such sprite:"]
		];
		for (const [needle, label] of markers) {
			if (textLower.includes(needle)) {
				return label;
			}
		}
		const looksLikeErrorPanel = textLower.includes("plantuml version")
			&& textLower.includes("assumed diagram type:")
			&& (textLower.includes("[from textarea (line") || textLower.includes("[from string (line"));
		if (looksLikeErrorPanel) {
			return "Assumed diagram type:";
		}
		return "";
	}

	function isPreviewErrorSvg(preview) {
		return Boolean(detectPreviewError(preview));
	}

	function stringifyErrorLike(value) {
		if (value == null) return "";
		if (typeof value === "string") return value;
		if (value instanceof Error) {
			return [value.name, value.message, value.stack || ""].filter(Boolean).join(" ");
		}
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	function isPlantUmlRuntimeFailureMessage(message, source = "") {
		const text = `${stringifyErrorLike(message)} ${stringifyErrorLike(source)}`
			.replace(/\s+/g, " ")
			.trim()
			.toLowerCase();
		if (!text) {
			return false;
		}
		if (text.includes("error java.lang.runtimeexception")) {
			return true;
		}
		if (text.includes("cannot read properties of null")) {
			return true;
		}
		if (text.includes("you should send a mail to plantuml@gmail.com with this log")) {
			return true;
		}
		if (text.includes("plantuml (") && text.includes("has crashed")) {
			return true;
		}
		if (text.includes("fatal parsing error")) {
			return true;
		}
		if ((text.includes("java.lang.") && (text.includes("exception") || text.includes("error")))) {
			return true;
		}
		const mentionsPlantUml = text.includes("plantuml.js") || text.includes("plantuml");
		if (!mentionsPlantUml) {
			return false;
		}
		return text.includes("runtimeexception") || text.includes("has crashed");
	}

	function createRuntimeErrorBuffer(options = {}) {
		const windowRef = options.windowRef || (typeof window !== "undefined" ? window : null);
		const windowMs = Number.isFinite(options.windowMs) ? Math.max(1, Math.floor(options.windowMs)) : 3000;
		const patchConsole = options.patchConsole !== false;
		const entries = [];
		let onError = null;
		let onRejection = null;
		let originalConsoleError = null;

		function prune(now = Date.now()) {
			for (let i = entries.length - 1; i >= 0; i -= 1) {
				if ((now - entries[i].timestamp) > windowMs) {
					entries.splice(i, 1);
				}
			}
		}

		function record(message, source = "", signalType = "runtime-error") {
			const rawMessage = stringifyErrorLike(message).replace(/\s+/g, " ").trim();
			const rawSource = stringifyErrorLike(source).replace(/\s+/g, " ").trim();
			if (!isPlantUmlRuntimeFailureMessage(rawMessage, rawSource)) {
				return false;
			}
			entries.push({
				timestamp: Date.now(),
				message: rawMessage || "PlantUML runtime error",
				source: rawSource,
				signalType
			});
			prune();
			return true;
		}

		function consumeSince(sinceTimestamp = 0) {
			const since = Number.isFinite(sinceTimestamp) ? sinceTimestamp : 0;
			prune();
			for (let i = entries.length - 1; i >= 0; i -= 1) {
				if (entries[i].timestamp >= since) {
					const hit = entries[i];
					entries.splice(i, 1);
					return hit;
				}
			}
			return null;
		}

		function hasSince(sinceTimestamp = 0) {
			const since = Number.isFinite(sinceTimestamp) ? sinceTimestamp : 0;
			prune();
			for (let i = entries.length - 1; i >= 0; i -= 1) {
				if (entries[i].timestamp >= since) {
					return entries[i];
				}
			}
			return null;
		}

		function clear() {
			entries.length = 0;
		}

		function dispose() {
			if (windowRef && onError) {
				windowRef.removeEventListener("error", onError);
			}
			if (windowRef && onRejection) {
				windowRef.removeEventListener("unhandledrejection", onRejection);
			}
			if (windowRef && originalConsoleError && windowRef.console) {
				windowRef.console.error = originalConsoleError;
			}
			onError = null;
			onRejection = null;
			originalConsoleError = null;
			clear();
		}

		if (windowRef && typeof windowRef.addEventListener === "function") {
			onError = event => {
				const err = event && event.error ? event.error : null;
				const message = err || (event && event.message) || "";
				const source = event && event.filename ? event.filename : "";
				record(message, source, "runtime-error");
			};
			onRejection = event => {
				const reason = event ? event.reason : null;
				record(reason, "", "runtime-rejection");
			};
			windowRef.addEventListener("error", onError);
			windowRef.addEventListener("unhandledrejection", onRejection);
		}

		if (windowRef && patchConsole && windowRef.console && typeof windowRef.console.error === "function") {
			originalConsoleError = windowRef.console.error;
			windowRef.console.error = function patchedConsoleError(...args) {
				try {
					const message = args.map(arg => stringifyErrorLike(arg)).join(" ");
					record(message, "console.error", "runtime-console");
				} catch {
					/* noop */
				}
				return originalConsoleError.apply(this, args);
			};
		}

		return {
			windowMs,
			record,
			consumeSince,
			hasSince,
			clear,
			dispose
		};
	}

	function evaluateRenderOutcome(preview, options = {}) {
		const sinceTimestamp = Number.isFinite(options.sinceTimestamp) ? options.sinceTimestamp : 0;
		const errorBuffer = options.errorBuffer || null;

		if (errorBuffer && typeof errorBuffer.consumeSince === "function") {
			const hit = errorBuffer.consumeSince(sinceTimestamp);
			if (hit) {
				return {
					status: "failure",
					signalType: hit.signalType || "runtime-error",
					reason: hit.message || "PlantUML runtime error",
					details: hit
				};
			}
		}

		const svgError = detectPreviewError(preview);
		if (svgError) {
			return {
				status: "failure",
				signalType: "svg-error",
				reason: svgError
			};
		}

		if (!preview || typeof preview.querySelector !== "function") {
			return {
				status: "unknown",
				signalType: "preview-missing",
				reason: "Preview container is unavailable."
			};
		}

		const svg = preview.querySelector("svg");
		if (!svg) {
			return {
				status: "unknown",
				signalType: "no-svg",
				reason: "No SVG rendered yet."
			};
		}

		const width = Number.parseFloat(typeof svg.getAttribute === "function" ? (svg.getAttribute("width") || "") : "");
		const height = Number.parseFloat(typeof svg.getAttribute === "function" ? (svg.getAttribute("height") || "") : "");
		const viewBox = String(typeof svg.getAttribute === "function" ? (svg.getAttribute("viewBox") || "") : "");
		const hasSize = (Number.isFinite(width) && width > 0)
			|| (Number.isFinite(height) && height > 0)
			|| /(?:\d+|\d+\.\d+)\s+(?:\d+|\d+\.\d+)\s+(?:\d+|\d+\.\d+)\s+(?:\d+|\d+\.\d+)/.test(viewBox);
		const hasText = String(svg.textContent || "").trim().length > 0;
		if (!hasSize && !hasText) {
			return {
				status: "unknown",
				signalType: "svg-empty",
				reason: "Rendered SVG is empty."
			};
		}

		return {
			status: "success",
			signalType: "ok",
			reason: ""
		};
	}

	function compactErrorText(text, maxLength = 220) {
		const normalized = String(text || "")
			.replace(/\s+/g, " ")
			.trim();
		if (!normalized) {
			return "";
		}
		if (normalized.length <= maxLength) {
			return normalized;
		}
		return `${normalized.slice(0, Math.max(1, maxLength - 3))}...`;
	}

	function extractHtmlPlainText(html) {
		return String(html || "")
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<[^>]+>/g, " ");
	}

	function buildJarFallbackHttpErrorMessage(response, raw, data, endpoint) {
		const status = Number.isFinite(Number(response && response.status)) ? Number(response.status) : 0;
		const statusText = status > 0 ? `HTTP ${status}` : "HTTP error";
		const safeEndpoint = String(endpoint || "/api/plantuml-svg");
		const jsonReason = data && typeof data.error === "string" ? compactErrorText(data.error, 240) : "";
		const rawText = String(raw || "");
		const lowerRaw = rawText.toLowerCase();
		const looksLikeHtml = /<html[\s>]/i.test(rawText) || /^\s*<!doctype html/i.test(rawText);
		const normalizedRaw = compactErrorText(looksLikeHtml ? extractHtmlPlainText(rawText) : rawText, 240);
		const unsupportedPost = status === 501
			|| /unsupported method\s*\(\s*['"]?post['"]?\s*\)/i.test(lowerRaw)
			|| /method not allowed/i.test(lowerRaw);

		if (unsupportedPost) {
			return `Jar fallback endpoint does not support POST (${statusText}). Start local server with ./serve.sh (node serve.js), then open http://localhost:5401 so ${safeEndpoint} is available.`;
		}
		if (status === 404) {
			return `Jar fallback endpoint not found (${statusText} ${safeEndpoint}). Start local server with ./serve.sh (node serve.js).`;
		}

		const reason = jsonReason || normalizedRaw;
		if (reason) {
			return `Jar fallback request failed (${statusText}): ${reason}`;
		}
		return `Jar fallback request failed (${statusText}).`;
	}

	async function renderWithPlantUmlJar(source, endpoint = "/api/plantuml-svg") {
		if (typeof window !== "undefined" && window.location && window.location.protocol === "file:") {
			throw new Error("Cannot call plantuml.jar fallback from file:// pages. Start local server via ./serve.sh and open http://localhost:5401.");
		}
		console.info("PlantUML jar fallback request:", endpoint);
		const payload = { source: String(source || "") };
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		});
		const raw = await response.text();
		let data = null;
		try {
			data = raw ? JSON.parse(raw) : null;
		} catch {
			data = null;
		}
		if (!response.ok) {
			throw new Error(buildJarFallbackHttpErrorMessage(response, raw, data, endpoint));
		}
		const svg = data && typeof data.svg === "string" ? data.svg : "";
		if (!svg.trim()) {
			throw new Error("Jar fallback returned empty SVG.");
		}
		if (!/<svg[\s>]/i.test(svg)) {
			throw new Error("Jar fallback response is not SVG.");
		}
		return svg;
	}

	function setPreviewSvg(preview, svgMarkup) {
		if (!preview) {
			return false;
		}
		const svg = String(svgMarkup || "").trim();
		if (!svg) {
			return false;
		}
		preview.innerHTML = svg;
		return Boolean(preview.querySelector("svg"));
	}

	return {
		readExampleSource,
		splitPlantUmlLines,
		addBrowserSafeScale,
		ensurePreviewId,
		buildDownloadName,
		setExampleMessage,
		clearExampleMessage,
		detectPreviewError,
		isPreviewErrorSvg,
		isPlantUmlRuntimeFailureMessage,
		createRuntimeErrorBuffer,
		evaluateRenderOutcome,
		renderWithPlantUmlJar,
		setPreviewSvg
	};
});
