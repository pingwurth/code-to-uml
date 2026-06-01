"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createPreview() {
	return {
		innerHTML: "",
		textContent: "",
		querySelector(selector) {
			if (selector === "svg") return /<svg[\s>]/i.test(this.innerHTML) ? {} : null;
			return null;
		}
	};
}

async function main() {
	const source = fs.readFileSync("component/render-failure-common.js", "utf8");
	const preview = createPreview();
	let observedBody = "";
	const fetch = async (endpoint, options) => {
		observedBody = options.body;
		return {
			ok: false,
			status: 500,
			text: async () => JSON.stringify({ error: "PlantUML syntax error: missing @enduml" })
		};
	};
	const context = {
		fetch,
		window: {
			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval,
			location: { protocol: "http:" },
			PlantUmlDocsCore: {
				evaluateRenderOutcome() {
					return { status: "failure", signalType: "render-timeout", reason: "browser render failed" };
				},
				setPreviewSvg(node, svgMarkup) {
					node.innerHTML = String(svgMarkup || "").trim();
					return Boolean(node.querySelector("svg"));
				}
			},
			fetch
		},
		MutationObserver: class {
			observe() {}
			disconnect() {}
		}
	};
	context.window.fetch = context.window.fetch.bind(context.window);
	vm.runInNewContext(source, context, { filename: "component/render-failure-common.js" });

	await assert.rejects(
		() => context.window.PlantUmlRenderFailureCommon.renderWithFailureHandling({
			preview,
			source: "@startuml\nAlice -> Bob\n",
			render: () => {},
			previewId: "preview-1",
			renderWaitMs: 1,
			unknownRecheckDelayMs: 0
		}),
		/Jar fallback request failed.*PlantUML syntax error/
	);

	assert.match(observedBody, /Alice -> Bob/);
	assert.match(preview.textContent, /PlantUML syntax error: missing @enduml/);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
