"use strict";

(function initDemoPage() {
	const core = window.PlantUmlDocsCore;
	const i18n = window.DocsI18n;
	const render = window.plantumlRender;
	const toc = window.PlantUmlToc;
	const demoExample = window.PlantUmlDemoExample;
	const title = document.getElementById("demo-title");
	const tabs = Array.from(document.querySelectorAll(".demo-tab"));
	const tabsNav = document.querySelector(".demo-tabs");
	const examplesContainer = document.querySelector("[data-examples]");
	const sideToc = document.querySelector("[data-demo-toc]");
	const DEMO_EXAMPLES_API_PATH = "/api/demo-examples";
	const RENDER_WAIT_MS = 2500;
	const UNKNOWN_RECHECK_DELAY_MS = 800;
	const RUNTIME_ERROR_WINDOW_MS = 3000;
	let diagramExamples = {};
	let activeDiagram = "Sequence";
	const renderTimers = new Map();
	let renderChain = Promise.resolve();
	let renderGeneration = 0;
	let tocSyncScheduled = false;
	let activeTocHref = "";
	const renderFailureBuffer = core && typeof core.createRuntimeErrorBuffer === "function"
		? core.createRuntimeErrorBuffer({ windowRef: window, windowMs: RUNTIME_ERROR_WINDOW_MS })
		: null;
	function tr(key) {
		const mode = i18n && typeof i18n.getMode === "function" ? i18n.getMode() : "zh";
		return i18n && typeof i18n.t === "function" ? i18n.t(`demoPage.${key}`, mode) : "";
	}

	function toDiagramKey(diagramKey) {
		return String(diagramKey || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	function resolveDiagramDataKey(rawKey) {
		if (!rawKey || !diagramExamples || typeof diagramExamples !== "object") return "";
		if (diagramExamples[rawKey]) return rawKey;
		const normalized = toDiagramKey(rawKey);
		if (diagramExamples[normalized]) return normalized;
		const keys = Object.keys(diagramExamples);
		for (const key of keys) {
			if (toDiagramKey(key) === normalized) return key;
		}
		return "";
	}

	function isNoneTitle(value) {
		return /^none$/i.test(String(value || "").trim());
	}

	function cleanText(value) {
		const text = String(value || "").trim();
		return isNoneTitle(text) ? "" : text;
	}

	function diagramLabel(diagramKey, mode) {
		if (!i18n || typeof i18n.t !== "function") return String(diagramKey || "");
		const label = i18n.t(`demoPage.diagramLabels.${toDiagramKey(diagramKey)}`, mode);
		return label || String(diagramKey || "");
	}

	function exampleTitleForMode(example, index, mode) {
		const titleI18n = example && example.titleI18n && typeof example.titleI18n === "object" ? example.titleI18n : null;
		if (titleI18n) {
			const text = mode === "en" ? String(titleI18n.en || titleI18n.zh || "") : String(titleI18n.zh || titleI18n.en || "");
			return text && !isNoneTitle(text) ? text : "";
		}
		const fallback = example && example.title ? example.title : "";
		return fallback && !isNoneTitle(fallback) ? fallback : "";
	}

	function sectionTitleForMode(example, mode) {
		const titleI18n = example && example.sectionTitleI18n && typeof example.sectionTitleI18n === "object" ? example.sectionTitleI18n : null;
		if (titleI18n) {
			const text = mode === "en" ? (titleI18n.en || titleI18n.zh || "") : (titleI18n.zh || titleI18n.en || "");
			return cleanText(text);
		}
		return cleanText(example && example.sectionTitle ? example.sectionTitle : "");
	}

	function sectionDescriptionForMode(example, mode) {
		const descI18n = example && example.sectionDescriptionI18n && typeof example.sectionDescriptionI18n === "object" ? example.sectionDescriptionI18n : null;
		if (descI18n) {
			const text = mode === "en" ? (descI18n.en || descI18n.zh || "") : (descI18n.zh || descI18n.en || "");
			return cleanText(text);
		}
		return cleanText(example && example.sectionDescription ? example.sectionDescription : "");
	}

	initLanguageSwitcher();
	if (i18n && typeof i18n.apply === "function") {
		i18n.apply(i18n.getMode());
	}

	if (!core || !title || !examplesContainer || !demoExample || typeof demoExample.createExampleNode !== "function") {
		return;
	}

	if (typeof render !== "function") {
		console.error("PlantUML renderer is unavailable. Browser rendering will fallback to plantuml.jar.");
	}

	initPreviewLightbox();
	if (renderFailureBuffer && typeof renderFailureBuffer.dispose === "function") {
		window.addEventListener("beforeunload", () => {
			renderFailureBuffer.dispose();
		}, { once: true });
	}

		bootstrapDemo().catch(err => {
			console.error("Failed to bootstrap demo page:", err);
			if (examplesContainer) {
				examplesContainer.innerHTML = '<p class="example-message" data-state="error">示例配置加载失败，请检查 data/demo 目录及 .ctu 文件。</p>';
			}
		});

	document.addEventListener("docs:langchange", async () => {
		applyDemoI18n();
		try {
			const freshExamples = await loadDiagramExamples();
			if (freshExamples && typeof freshExamples === "object") {
				diagramExamples = freshExamples;
			}
		} catch (err) {
			console.error("Failed to refresh localized demo examples:", err);
		}
		renderGeneration += 1;
		renderChain = Promise.resolve();
		loadDiagram(activeDiagram, renderGeneration);
	});

	async function bootstrapDemo() {
		diagramExamples = await loadDiagramExamples();
		if (!diagramExamples || typeof diagramExamples !== "object") {
			throw new Error("Invalid demo examples payload");
		}
		const resolvedInitial = resolveDiagramDataKey(activeDiagram);
		if (resolvedInitial) {
			activeDiagram = resolvedInitial;
		} else {
			const firstKey = Object.keys(diagramExamples)[0];
			if (firstKey) {
				activeDiagram = firstKey;
			}
		}
		applyDemoI18n();
		bindTabs();
		initToc();
		bindTocActiveSync();
		loadDiagram(activeDiagram);
	}

	async function loadDiagramExamples() {
		const mode = i18n && typeof i18n.getMode === "function" ? i18n.getMode() : "zh";
		const response = await fetch(`${DEMO_EXAMPLES_API_PATH}?lang=${encodeURIComponent(mode)}`, { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Failed to load ${DEMO_EXAMPLES_API_PATH}: ${response.status}`);
		}
		const content = await response.text();
		return JSON.parse(content);
	}

	function bindTabs() {
		for (const tab of tabs) {
			tab.addEventListener("click", () => {
				const key = resolveDiagramDataKey(tab.dataset.diagram);
				if (!key) return;
				switchDiagram(key);
			});
		}
	}

	function initToc() {
		if (!toc || typeof toc.render !== "function" || !sideToc) return;
		toc.render({
			sideContainer: sideToc,
			titleText: diagramLabel(activeDiagram),
			items: []
		});
	}

	function switchDiagram(key) {
		const resolvedKey = resolveDiagramDataKey(key);
		if (!resolvedKey) return;
		renderGeneration += 1;
		renderChain = Promise.resolve();
		setActiveTab(resolvedKey);
		loadDiagram(resolvedKey, renderGeneration);
	}

	function setActiveTab(key) {
		activeDiagram = key;
		const mode = i18n && typeof i18n.getMode === "function" ? i18n.getMode() : "zh";
		const activeNormalized = toDiagramKey(key);
		for (const tab of tabs) {
			tab.classList.toggle("is-active", toDiagramKey(tab.dataset.diagram) === activeNormalized);
		}
		title.textContent = diagramLabel(key, mode);
	}

	function loadDiagram(key, generation = renderGeneration) {
		examplesContainer.innerHTML = "";
		activeTocHref = "";
		const examples = diagramExamples[key] || [];
		const tocItems = [];
		const mode = i18n && typeof i18n.getMode === "function" ? i18n.getMode() : "zh";
		let activeSectionKey = "";
		for (let i = 0; i < examples.length; i += 1) {
			const sectionTitle = sectionTitleForMode(examples[i], mode);
			const sectionDesc = sectionDescriptionForMode(examples[i], mode);
			const sectionKey = `${sectionTitle}\n${sectionDesc}`;
			if (sectionTitle && sectionKey !== activeSectionKey) {
				activeSectionKey = sectionKey;
				const sectionSlug = `${toDiagramKey(key)}-${i + 1}`;
				const heading = document.createElement("h2");
				heading.className = "demo-section-title";
				heading.id = `demo-section-${sectionSlug}`;
				heading.textContent = sectionTitle;
				examplesContainer.appendChild(heading);
				tocItems.push({
					label: sectionTitle,
					href: `#${heading.id}`,
					level: 2,
					onClick: () => scrollToExample(heading)
				});
				if (sectionDesc) {
					const desc = document.createElement("div");
					desc.className = "demo-section-desc";
					if (demoExample && typeof demoExample.renderMarkdown === "function") {
						desc.innerHTML = demoExample.renderMarkdown(sectionDesc);
					} else {
						desc.textContent = sectionDesc;
					}
					examplesContainer.appendChild(desc);
				}
			}
			const node = buildExampleNode(key, examples[i], i);
			examplesContainer.appendChild(node);
			const label = exampleTitleForMode(examples[i], i, mode);
			tocItems.push({
				label,
				href: `#${node.id}`,
				level: 3,
				onClick: () => scrollToExample(node)
			});
			enqueueRender(() => renderCurrent(node, generation));
		}
		applyDemoI18n();
		renderTocForActiveTab(tocItems);
		scheduleTocActiveSync();
	}

	function scrollToExample(node) {
		if (!node || !node.isConnected) return;
		const navHeight = tabsNav ? tabsNav.getBoundingClientRect().height : 0;
		const topOffset = Math.ceil(navHeight) + 12;
		const targetTop = node.getBoundingClientRect().top + window.scrollY - topOffset;
		window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
	}

	function renderTocForActiveTab(items) {
		if (!toc || typeof toc.render !== "function" || !sideToc) return;
		toc.render({
			sideContainer: sideToc,
			titleText: diagramLabel(activeDiagram),
			items
		});
	}

	function bindTocActiveSync() {
		window.addEventListener("scroll", scheduleTocActiveSync, { passive: true });
		window.addEventListener("resize", scheduleTocActiveSync);
	}

	function scheduleTocActiveSync() {
		if (tocSyncScheduled) return;
		tocSyncScheduled = true;
		window.requestAnimationFrame(() => {
			tocSyncScheduled = false;
			syncTocActiveWithViewportLine();
		});
	}

	function resolveExampleHrefAtViewportLine() {
		const examples = Array.from(examplesContainer.querySelectorAll(".example"));
		if (examples.length === 0) return "";
		const lineY = window.innerHeight * 0.25;
		let activeNode = null;
		for (const example of examples) {
			const rect = example.getBoundingClientRect();
			if (rect.top <= lineY && rect.bottom >= lineY) {
				activeNode = example;
				break;
			}
		}
		if (!activeNode) {
			const firstRect = examples[0].getBoundingClientRect();
			activeNode = lineY < firstRect.top ? examples[0] : examples[examples.length - 1];
		}
		return activeNode && activeNode.id ? `#${activeNode.id}` : "";
	}

	function syncTocActiveWithViewportLine() {
		if (!toc || typeof toc.setActive !== "function" || !sideToc) return;
		const href = resolveExampleHrefAtViewportLine();
		if (!href || href === activeTocHref) return;
		activeTocHref = href;
		toc.setActive(sideToc, href);
	}

	function enqueueRender(task) {
		renderChain = renderChain.then(task, task).catch(err => {
			console.error("Render queue failed:", err);
		});
	}

	function buildExampleNode(diagramKey, item, index) {
		return demoExample.createExampleNode({
			diagramKey,
			item,
			index,
			onSourceInput: wrapper => {
				const key = wrapper.dataset.filename;
				const existing = renderTimers.get(key);
				if (existing) window.clearTimeout(existing);
				core.setExampleMessage(wrapper, tr("waitingRerender"), "");
				renderTimers.set(key, window.setTimeout(() => {
					const generation = renderGeneration;
					enqueueRender(() => renderCurrent(wrapper, generation));
				}, 450));
			},
			onActionClick: (wrapper, btn) => {
				handleAction(wrapper, btn);
			}
		});
	}

	async function renderCurrent(example, generation) {
		if (generation !== renderGeneration) return;
		if (!example.isConnected) return;
		const preview = example.querySelector("[data-preview]");
		const exampleId = example && example.id ? example.id : "";
		if (!preview) {
			console.error("Render skipped: preview container missing.", {
				exampleId,
				generation,
				currentGeneration: renderGeneration
			});
			return;
		}
		const source = core.readExampleSource(example);
		try {
			setLargeDiagramLayout(example, false);
			preview.textContent = tr("rendering");
			const renderStartedAt = Date.now();
			const previewId = core.ensurePreviewId(example, 0);
			render(core.splitPlantUmlLines(source), previewId, { dark: false });
			await waitForSvg(preview, {
				timeoutMs: RENDER_WAIT_MS,
				getAbortError: () => {
					const runtimeHit = renderFailureBuffer && typeof renderFailureBuffer.hasSince === "function"
						? renderFailureBuffer.hasSince(renderStartedAt)
						: null;
					if (!runtimeHit) return "";
					return `PlantUML runtime failure detected: ${runtimeHit.message || "unknown error"}`;
				}
			});
			if (generation !== renderGeneration || !example.isConnected) return;
			let outcome = evaluateRenderOutcomeWithSignals(preview, renderStartedAt);
			if (outcome.status === "unknown") {
				await wait(UNKNOWN_RECHECK_DELAY_MS);
				if (generation !== renderGeneration || !example.isConnected) return;
				outcome = evaluateRenderOutcomeWithSignals(preview, renderStartedAt);
			}
			if (outcome.status !== "success") {
				console.warn("[uml-detector] browser render outcome indicates failure", {
					exampleId,
					generation,
					currentGeneration: renderGeneration,
					signalType: outcome.signalType,
					reason: outcome.reason
				});
				throw new Error(`Browser renderer produced an error outcome: ${describeRenderOutcome(outcome)}`);
			}
			core.clearExampleMessage(example);
		} catch (err) {
			const message = err && err.message ? err.message : String(err || "");
			const errorMeta = {
				exampleId,
				generation,
				currentGeneration: renderGeneration
			};
			if (/Diagram too large for browser rendering/i.test(message)) {
				try {
					const scaledSource = core.addBrowserSafeScale(source, 4000);
					const previewId = core.ensurePreviewId(example, 0);
					render(core.splitPlantUmlLines(scaledSource), previewId, { dark: false });
					await waitForSvg(preview);
					if (generation !== renderGeneration || !example.isConnected) return;
					setLargeDiagramLayout(example, true);
					core.setExampleMessage(example, tr("largeScaled"), "success");
					return;
				} catch (retryErr) {
					console.error("Render retry with scale failed:", retryErr, errorMeta);
				}
			}
			if (generation !== renderGeneration || !example.isConnected) {
				console.error("Render failed for stale/disconnected example:", err, errorMeta);
				return;
			}

			console.error("Render failed, trying plantuml.jar fallback:", err, errorMeta);
			try {
				const fallbackSvg = await requestJarFallbackSvg(source);
				if (generation !== renderGeneration || !example.isConnected) return;
				const applied = applyFallbackSvg(preview, fallbackSvg);
				if (!applied) {
					throw new Error("Fallback SVG could not be inserted into preview.");
				}
				setLargeDiagramLayout(example, false);
				core.clearExampleMessage(example);
				return;
			} catch (jarErr) {
				console.error("PlantUML jar fallback failed:", jarErr, errorMeta);
			}

			console.error("Render failed after fallback:", err, errorMeta);
			preview.textContent = tr("renderFailedShort");
			core.setExampleMessage(example, tr("renderFailed"), "error");
		}
	}

	function setLargeDiagramLayout(example, enabled) {
		const grid = example.querySelector(".example-grid");
		if (!grid) return;
		grid.classList.toggle("example-large-diagram", Boolean(enabled));
	}

	function evaluateRenderOutcomeWithSignals(preview, sinceTimestamp) {
		if (core && typeof core.evaluateRenderOutcome === "function") {
			return core.evaluateRenderOutcome(preview, {
				sinceTimestamp,
				errorBuffer: renderFailureBuffer
			});
		}
		const fallbackReason = core && typeof core.detectPreviewError === "function"
			? core.detectPreviewError(preview)
			: "";
		if (fallbackReason) {
			return { status: "failure", signalType: "svg-error", reason: fallbackReason };
		}
		return preview && preview.querySelector("svg")
			? { status: "success", signalType: "ok", reason: "" }
			: { status: "unknown", signalType: "no-svg", reason: "No SVG rendered yet." };
	}

	function describeRenderOutcome(outcome) {
		if (!outcome) return "unknown";
		const signal = String(outcome.signalType || "unknown");
		const reason = String(outcome.reason || "").trim();
		return reason ? `${signal}: ${reason}` : signal;
	}

	function wait(ms) {
		const delay = Number.isFinite(ms) ? Math.max(0, Math.floor(ms)) : 0;
		return new Promise(resolve => window.setTimeout(resolve, delay));
	}

	async function requestJarFallbackSvg(source) {
		if (core && typeof core.renderWithPlantUmlJar === "function") {
			return core.renderWithPlantUmlJar(source);
		}
		if (window.location && window.location.protocol === "file:") {
			throw new Error("Cannot call /api/plantuml-svg from file:// pages. Start local server via ./serve.sh and open http://localhost:5401.");
		}
		console.warn("PlantUmlDocsCore.renderWithPlantUmlJar is unavailable; using inline fallback request.");
		console.info("PlantUML jar fallback request: /api/plantuml-svg");
		const response = await fetch("/api/plantuml-svg", {
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
		console.warn("PlantUmlDocsCore.setPreviewSvg is unavailable; using inline SVG injection.");
		if (!preview) return false;
		preview.innerHTML = String(svgMarkup || "").trim();
		return Boolean(preview.querySelector("svg"));
	}

	function waitForSvg(preview, options = {}) {
		const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, Math.floor(options.timeoutMs)) : 15000;
		const pollMs = Number.isFinite(options.pollMs) ? Math.max(50, Math.floor(options.pollMs)) : 120;
		const getAbortError = typeof options.getAbortError === "function" ? options.getAbortError : null;
		return new Promise((resolve, reject) => {
			let pollTimer = null;
			const timeout = window.setTimeout(() => {
				cleanup();
				reject(new Error("Timed out waiting for preview"));
			}, timeoutMs);

			function cleanup() {
				window.clearTimeout(timeout);
				if (pollTimer) {
					window.clearInterval(pollTimer);
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
				pollTimer = window.setInterval(check, pollMs);
			}
			check();
		});
	}

	async function handleAction(example, button) {
		const action = button.dataset.action;
		const preview = example.querySelector("[data-preview]");
		try {
			if (action === "copy-source") {
				await navigator.clipboard.writeText(core.readExampleSource(example));
				showActionState(example, button, tr("copySourceDone"), "success");
				return;
			}
			if (action === "copy-svg") {
				const svg = serializeSvg(preview);
				if (!svg) throw new Error("No SVG rendered");
				await navigator.clipboard.writeText(svg);
				showActionState(example, button, tr("copySvgDone"), "success");
				return;
			}
			if (action === "download-svg") {
				const svg = serializeSvg(preview);
				if (!svg) throw new Error("No SVG rendered");
				const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = core.buildDownloadName(example, 0);
				document.body.appendChild(link);
				link.click();
				link.remove();
				URL.revokeObjectURL(url);
				showActionState(example, button, tr("downloadSvgDone"), "success");
			}
		} catch (err) {
			console.error("Action failed:", err);
			showActionState(example, button, tr("actionFailed"), "error");
		}
	}

	function serializeSvg(preview) {
		const svg = preview ? preview.querySelector("svg") : null;
		if (!svg) return "";
		const clone = svg.cloneNode(true);
		if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
		return new XMLSerializer().serializeToString(clone);
	}

	function showActionState(example, button, message, state) {
		button.classList.remove("success", "error");
		button.classList.add(state);
		core.setExampleMessage(example, message, state);
		window.setTimeout(() => button.classList.remove(state), state === "error" ? 2000 : 900);
	}

	function initPreviewLightbox() {
		const overlay = document.createElement("div");
		overlay.className = "uml-lightbox";
		overlay.setAttribute("aria-hidden", "true");
		overlay.innerHTML = '<div class="uml-lightbox-toolbar"><button type="button" data-lb-action="zoom-out">-</button><button type="button" data-lb-action="zoom-in">+</button><button type="button" data-lb-action="reset"></button><button type="button" data-lb-action="close"></button></div><div class="uml-lightbox-viewport"><div class="uml-lightbox-stage"></div></div>';
		document.body.appendChild(overlay);
		updateLightboxLabels();
		document.addEventListener("docs:langchange", updateLightboxLabels);

		function updateLightboxLabels() {
			const zoomOut = overlay.querySelector('[data-lb-action="zoom-out"]');
			const zoomIn = overlay.querySelector('[data-lb-action="zoom-in"]');
			const reset = overlay.querySelector('[data-lb-action="reset"]');
			const close = overlay.querySelector('[data-lb-action="close"]');
			if (zoomOut) zoomOut.setAttribute("aria-label", tr("zoomOut"));
			if (zoomIn) zoomIn.setAttribute("aria-label", tr("zoomIn"));
			if (reset) {
				reset.setAttribute("aria-label", tr("reset"));
				reset.textContent = tr("reset");
			}
			if (close) {
				close.setAttribute("aria-label", tr("close"));
				close.textContent = tr("close");
			}
		}

		const stage = overlay.querySelector(".uml-lightbox-stage");
		const viewport = overlay.querySelector(".uml-lightbox-viewport");
		let scale = 1;
		let translateX = 0;
		let translateY = 0;
		let svgWidth = 0;
		let svgHeight = 0;
		let isDragging = false;
		const pointers = new Map();
		let dragPointerId = null;
		let dragStartX = 0;
		let dragStartY = 0;
		let pinchStart = null;

		function applyTransform() {
			stage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
		}

		function clampScale(nextScale) {
			return Math.min(6, Math.max(0.2, nextScale));
		}

		function zoomAt(delta, centerX, centerY) {
			const prevScale = scale;
			scale = clampScale(scale * delta);
			if (scale === prevScale) return;
			const rect = viewport.getBoundingClientRect();
			const cx = centerX - rect.left;
			const cy = centerY - rect.top;
			translateX = cx - (cx - translateX) * (scale / prevScale);
			translateY = cy - (cy - translateY) * (scale / prevScale);
			applyTransform();
		}

		function readSvgSize(svg) {
			const viewBox = svg.viewBox && svg.viewBox.baseVal;
			if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
				return { width: viewBox.width, height: viewBox.height };
			}
			const widthAttr = Number.parseFloat(svg.getAttribute("width") || "");
			const heightAttr = Number.parseFloat(svg.getAttribute("height") || "");
			if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0 && heightAttr > 0) {
				return { width: widthAttr, height: heightAttr };
			}
			return { width: 1200, height: 800 };
		}

		function resetView() {
			if (svgWidth <= 0 || svgHeight <= 0) return;
			const rect = viewport.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				return;
			}
			const maxW = rect.width * 0.92;
			const maxH = rect.height * 0.9;
			const fitScale = Math.min(maxW / svgWidth, maxH / svgHeight, 1);
			scale = clampScale(fitScale);
			translateX = (rect.width - svgWidth * scale) / 2;
			translateY = (rect.height - svgHeight * scale) / 2;
			applyTransform();
		}

		function closeLightbox() {
			overlay.classList.remove("is-open");
			overlay.setAttribute("aria-hidden", "true");
			stage.replaceChildren();
			document.body.classList.remove("uml-lightbox-open");
		}

		document.addEventListener("click", event => {
			if (event.target.closest(".example-actions")) return;
			const preview = event.target.closest(".example-preview");
			if (!preview || overlay.classList.contains("is-open")) return;
			const svg = preview.querySelector("svg");
			if (!svg) return;
			const clone = svg.cloneNode(true);
			stage.replaceChildren(clone);
			const size = readSvgSize(clone);
			svgWidth = size.width;
			svgHeight = size.height;
			clone.style.width = `${svgWidth}px`;
			clone.style.height = `${svgHeight}px`;
			overlay.classList.add("is-open");
			overlay.setAttribute("aria-hidden", "false");
			document.body.classList.add("uml-lightbox-open");
			window.requestAnimationFrame(resetView);
		});

		overlay.addEventListener("click", event => {
			if (event.target === overlay) {
				closeLightbox();
				return;
			}
			const button = event.target.closest("[data-lb-action]");
			if (!button) return;
			const action = button.dataset.lbAction;
			if (action === "close") closeLightbox();
			if (action === "reset") resetView();
			if (action === "zoom-in") zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2);
			if (action === "zoom-out") zoomAt(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2);
		});

		overlay.addEventListener("wheel", event => {
			if (!overlay.classList.contains("is-open")) return;
			event.preventDefault();
			const delta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
			zoomAt(delta, event.clientX, event.clientY);
		}, { passive: false });

		viewport.addEventListener("pointerdown", event => {
			if (!overlay.classList.contains("is-open")) return;
			pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
			viewport.setPointerCapture(event.pointerId);
			if (pointers.size === 1) {
				isDragging = true;
				dragPointerId = event.pointerId;
				dragStartX = event.clientX - translateX;
				dragStartY = event.clientY - translateY;
				stage.classList.add("is-dragging");
			}
			if (pointers.size === 2) {
				const pts = Array.from(pointers.values());
				const dx = pts[0].x - pts[1].x;
				const dy = pts[0].y - pts[1].y;
				pinchStart = {
					distance: Math.hypot(dx, dy) || 1,
					scale,
					translateX,
					translateY,
					midX: (pts[0].x + pts[1].x) / 2,
					midY: (pts[0].y + pts[1].y) / 2
				};
				isDragging = false;
				stage.classList.remove("is-dragging");
			}
		});

		viewport.addEventListener("pointermove", event => {
			if (!pointers.has(event.pointerId)) return;
			pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
			if (pointers.size === 2 && pinchStart) {
				const pts = Array.from(pointers.values());
				const dx = pts[0].x - pts[1].x;
				const dy = pts[0].y - pts[1].y;
				const distance = Math.hypot(dx, dy) || pinchStart.distance;
				const nextScale = clampScale(pinchStart.scale * (distance / pinchStart.distance));
				const ratio = nextScale / pinchStart.scale;
				const rect = viewport.getBoundingClientRect();
				const cx = pinchStart.midX - rect.left;
				const cy = pinchStart.midY - rect.top;
				scale = nextScale;
				translateX = cx - (cx - pinchStart.translateX) * ratio;
				translateY = cy - (cy - pinchStart.translateY) * ratio;
				applyTransform();
				return;
			}
			if (isDragging && dragPointerId === event.pointerId) {
				translateX = event.clientX - dragStartX;
				translateY = event.clientY - dragStartY;
				applyTransform();
			}
		});

		function stopPointer(event) {
			pointers.delete(event.pointerId);
			if (dragPointerId === event.pointerId) {
				dragPointerId = null;
			}
			if (pointers.size < 2) {
				pinchStart = null;
			}
			if (pointers.size === 0) {
				isDragging = false;
			}
			stage.classList.remove("is-dragging");
			try {
				viewport.releasePointerCapture(event.pointerId);
			} catch {
				/* noop */
			}
		}

		viewport.addEventListener("pointerup", stopPointer);
		viewport.addEventListener("pointercancel", stopPointer);
		viewport.addEventListener("pointerleave", stopPointer);

		window.addEventListener("keydown", event => {
			if (event.key === "Escape" && overlay.classList.contains("is-open")) {
				closeLightbox();
			}
		});

		window.addEventListener("resize", () => {
			if (overlay.classList.contains("is-open")) {
				resetView();
			}
		});
	}

	function applyDemoI18n() {
		const mode = i18n && typeof i18n.getMode === "function" ? i18n.getMode() : "zh";
		document.documentElement.lang = i18n && i18n.getMode() === "en" ? "en" : "zh-CN";
		document.title = tr("pageTitle") || document.title;
		const pageHeading = document.querySelector(".intro h1");
		if (pageHeading) pageHeading.textContent = tr("pageTitle");
		const intro = document.querySelector(".intro > p");
		if (intro) intro.textContent = tr("introText");
		const tabs = document.querySelector(".demo-tabs");
		if (tabs) tabs.setAttribute("aria-label", tr("tabsAria"));
		const sectionOverview = document.getElementById("demo-section-overview");
		if (sectionOverview) sectionOverview.textContent = tr("sectionOverview");
		for (const tab of document.querySelectorAll(".demo-tab[data-diagram]")) {
			tab.textContent = diagramLabel(tab.dataset.diagram, mode);
		}
		if (title) title.textContent = diagramLabel(activeDiagram, mode);
		for (const actions of document.querySelectorAll('[data-i18n-role="example-actions"]')) {
			actions.setAttribute("aria-label", tr("exampleActions"));
		}
		if (demoExample && typeof demoExample.applyExampleLocale === "function") {
			const examples = diagramExamples[activeDiagram] || [];
			for (let i = 0; i < examples.length; i += 1) {
				const node = document.getElementById(`demo-example-${String(activeDiagram || "").toLowerCase().replace(/\s+/g, "-")}-${i + 1}`);
				if (node) {
					demoExample.applyExampleLocale(node, examples[i], i, mode);
				}
			}
		}
		for (const button of document.querySelectorAll('.icon-button[data-action="copy-source"]')) {
			button.setAttribute("aria-label", tr("copySource"));
			button.dataset.tooltip = tr("copySource");
		}
		for (const button of document.querySelectorAll('.icon-button[data-action="copy-svg"]')) {
			button.setAttribute("aria-label", tr("copySvg"));
			button.dataset.tooltip = tr("copySvg");
		}
		for (const button of document.querySelectorAll('.icon-button[data-action="download-svg"]')) {
			button.setAttribute("aria-label", tr("downloadSvg"));
			button.dataset.tooltip = tr("downloadSvg");
		}
	}

	function initLanguageSwitcher() {
		if (!i18n || typeof i18n.apply !== "function") {
			return;
		}
			const container = document.createElement("div");
			container.className = "lang-switcher";
			container.innerHTML = '<button type="button" data-lang="zh"></button><button type="button" data-lang="en"></button>';
		document.body.appendChild(container);

		function renderLangButtons(mode) {
			for (const button of container.querySelectorAll("button")) {
					const lang = button.dataset.lang;
					button.classList.toggle("is-active", lang === mode);
					if (lang === "zh") button.textContent = i18n.t("switchZh", mode);
					if (lang === "en") button.textContent = i18n.t("switchEn", mode);
				}
			}

		const initialMode = i18n.getMode();
		renderLangButtons(initialMode);

		container.addEventListener("click", event => {
			const button = event.target.closest("button[data-lang]");
			if (!button) return;
			const mode = button.dataset.lang;
			i18n.setMode(mode);
			i18n.apply(mode);
			renderLangButtons(mode);
		});

		document.addEventListener("docs:langchange", event => {
			renderLangButtons(event.detail.mode);
			applyDemoI18n();
		});
	}
})();
