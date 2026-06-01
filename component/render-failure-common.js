"use strict";

(function exposeRenderFailureCommon(root) {
	const core = root && root.PlantUmlDocsCore ? root.PlantUmlDocsCore : null;

	function wait(ms) {
		const delay = Number.isFinite(ms) ? Math.max(0, Math.floor(ms)) : 0;
		return new Promise(resolve => root.setTimeout(resolve, delay));
	}

	function describeRenderOutcome(outcome) {
		if (!outcome) return "unknown";
		const signal = String(outcome.signalType || "unknown");
		const reason = String(outcome.reason || "").trim();
		return reason ? `${signal}: ${reason}` : signal;
	}

	function evaluateRenderOutcomeWithSignals(preview, options = {}) {
		const sinceTimestamp = Number.isFinite(options.sinceTimestamp) ? options.sinceTimestamp : 0;
		const errorBuffer = options.errorBuffer || null;
		if (core && typeof core.evaluateRenderOutcome === "function") {
			return core.evaluateRenderOutcome(preview, {
				sinceTimestamp,
				errorBuffer
			});
		}
		const fallbackReason = core && typeof core.detectPreviewError === "function"
			? core.detectPreviewError(preview)
			: "";
		if (fallbackReason) {
			return { status: "failure", signalType: "svg-error", reason: fallbackReason };
		}
		if (preview && preview.querySelector("svg")) {
			return { status: "success", signalType: "ok", reason: "" };
		}
		return { status: "unknown", signalType: "no-svg", reason: "No SVG rendered yet." };
	}

	function waitForSvg(preview, options = {}) {
		const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.floor(options.timeoutMs)) : 15000;
		const pollMs = Number.isFinite(options.pollMs) ? Math.max(50, Math.floor(options.pollMs)) : 120;
		const getAbortError = typeof options.getAbortError === "function" ? options.getAbortError : null;
		return new Promise((resolve, reject) => {
			let pollTimer = null;
			const timeout = root.setTimeout(() => {
				cleanup();
				reject(new Error("Timed out waiting for preview"));
			}, timeoutMs);

			function cleanup() {
				root.clearTimeout(timeout);
				if (pollTimer) {
					root.clearInterval(pollTimer);
					pollTimer = null;
				}
				observer.disconnect();
			}

			function check() {
				if (preview.querySelector("svg")) {
					cleanup();
					resolve();
					return;
				}
				if (getAbortError) {
					const abortMessage = getAbortError();
					if (abortMessage) {
						cleanup();
						reject(new Error(String(abortMessage)));
					}
				}
			}

			const observer = new MutationObserver(() => {
				check();
			});
			observer.observe(preview, { childList: true, subtree: true });

			if (getAbortError) {
				pollTimer = root.setInterval(check, pollMs);
			}
			check();
		});
	}

	async function requestJarFallbackSvg(source, options = {}) {
		const endpoint = String(options.endpoint || "/api/plantuml-svg");
		if (core && typeof core.renderWithPlantUmlJar === "function") {
			return core.renderWithPlantUmlJar(source, endpoint);
		}
		if (root.location && root.location.protocol === "file:") {
			throw new Error("Cannot call /api/plantuml-svg from file:// pages. Start local server via ./serve.sh and open http://localhost:5401.");
		}
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ source: String(source || "") })
		});
		const raw = await response.text();
		let payload = null;
		try {
			payload = raw ? JSON.parse(raw) : null;
		} catch {
			payload = null;
		}
		if (!response.ok) {
			const reason = payload && typeof payload.error === "string" ? payload.error : (raw || `HTTP ${response.status}`);
			throw new Error(`Jar fallback request failed: ${reason}`);
		}
		const svg = payload && typeof payload.svg === "string" ? payload.svg : "";
		if (!svg.trim() || !/<svg[\s>]/i.test(svg)) {
			throw new Error("Jar fallback returned invalid SVG.");
		}
		return svg;
	}

	function applyFallbackSvg(preview, svgMarkup) {
		if (core && typeof core.setPreviewSvg === "function") {
			return core.setPreviewSvg(preview, svgMarkup);
		}
		if (!preview) return false;
		preview.innerHTML = String(svgMarkup || "").trim();
		return Boolean(preview.querySelector("svg"));
	}

	function showPreviewError(preview, err) {
		if (!preview) return;
		const message = err && err.message ? err.message : String(err || "");
		preview.textContent = message || "Render failed.";
	}

	function isLargeDiagramFailure(text) {
		const msg = String(text || "").toLowerCase();
		return msg.includes("diagram too large for browser rendering");
	}

	async function retryLargeDiagramInBrowser(options = {}) {
		const preview = options.preview;
		const source = String(options.source || "");
		const render = options.render;
		const previewId = String(options.previewId || "");
		const renderWaitMs = Number.isFinite(options.renderWaitMs) ? options.renderWaitMs : 15000;
		if (!core || typeof core.addBrowserSafeScale !== "function") {
			return false;
		}
		if (!preview || typeof render !== "function" || !previewId) {
			return false;
		}
		const scaledSource = core.addBrowserSafeScale(source, 4000);
		if (!scaledSource || scaledSource === source) {
			return false;
		}
		render(scaledSource.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"), previewId, { dark: false });
		await waitForSvg(preview, {
			timeoutMs: renderWaitMs
		});
		return Boolean(preview.querySelector("svg"));
	}

	async function renderWithFailureHandling(options = {}) {
		const preview = options.preview;
		const source = String(options.source || "");
		const render = options.render;
		const previewId = String(options.previewId || "");
		const renderWaitMs = Number.isFinite(options.renderWaitMs) ? options.renderWaitMs : 2500;
		const unknownRecheckDelayMs = Number.isFinite(options.unknownRecheckDelayMs) ? options.unknownRecheckDelayMs : 800;
		const errorBuffer = options.errorBuffer || null;
		const fallbackEndpoint = options.fallbackEndpoint || "/api/plantuml-svg";
		if (!preview || typeof render !== "function" || !previewId) {
			throw new Error("renderWithFailureHandling: invalid required options.");
		}

		const renderStartedAt = Date.now();
		render(source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"), previewId, { dark: false });
		let waitError = null;
		try {
			await waitForSvg(preview, {
				timeoutMs: renderWaitMs,
				getAbortError: () => {
					const runtimeHit = errorBuffer && typeof errorBuffer.hasSince === "function"
						? errorBuffer.hasSince(renderStartedAt)
						: null;
					if (!runtimeHit) return "";
					return `PlantUML runtime failure detected: ${runtimeHit.message || "unknown error"}`;
				}
			});
		} catch (err) {
			waitError = err;
		}

		let outcome = evaluateRenderOutcomeWithSignals(preview, {
			sinceTimestamp: renderStartedAt,
			errorBuffer
		});
		if (outcome.status === "unknown") {
			await wait(unknownRecheckDelayMs);
			outcome = evaluateRenderOutcomeWithSignals(preview, {
				sinceTimestamp: renderStartedAt,
				errorBuffer
			});
		}
		if (outcome.status === "success") {
			return { ok: true, usedFallback: false, outcome };
		}
		if (waitError && outcome.status === "unknown") {
			outcome = {
				status: "failure",
				signalType: "render-timeout",
				reason: String(waitError && waitError.message ? waitError.message : waitError)
			};
		}
		if (isLargeDiagramFailure(outcome.reason)) {
			const retried = await retryLargeDiagramInBrowser({
				preview,
				source,
				render,
				previewId,
				renderWaitMs
			});
			if (retried) {
				return { ok: true, usedFallback: false, usedScaleRetry: true, outcome };
			}
		}

		let fallbackSvg = "";
		try {
			fallbackSvg = await requestJarFallbackSvg(source, { endpoint: fallbackEndpoint });
		} catch (err) {
			showPreviewError(preview, err);
			throw err;
		}
		const applied = applyFallbackSvg(preview, fallbackSvg);
		if (!applied) {
			throw new Error("Fallback SVG could not be inserted into preview.");
		}
		return { ok: true, usedFallback: true, outcome };
	}

	root.PlantUmlRenderFailureCommon = {
		wait,
		describeRenderOutcome,
		evaluateRenderOutcomeWithSignals,
		waitForSvg,
		requestJarFallbackSvg,
		applyFallbackSvg,
		renderWithFailureHandling
	};
})(window);
