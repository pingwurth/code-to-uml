"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("demo.js", "utf8");
const bootstrapDemo = source.match(/async function bootstrapDemo\(\) \{[\s\S]*?\n\t\}/);
assert.ok(bootstrapDemo, "bootstrapDemo() should exist");
const bindIndex = bootstrapDemo[0].indexOf("bindTabs()");
const loadIndex = bootstrapDemo[0].indexOf("loadDiagramExamples()");
assert.ok(bindIndex >= 0, "bootstrapDemo should bind tab clicks");
assert.ok(loadIndex >= 0, "bootstrapDemo should load examples");
assert.ok(
	bindIndex < loadIndex,
	"tab clicks should be bound before loading examples so UI switching survives API failure"
);

const bindTabs = source.match(/function bindTabs\(\) \{[\s\S]*?\n\t\}/);
assert.ok(bindTabs, "bindTabs() should exist");
assert.doesNotMatch(
	bindTabs[0],
	/resolveDiagramDataKey/,
	"bindTabs should not block UI switching on loaded example data"
);
assert.match(
	bindTabs[0],
	/switchDiagram\(tab\.dataset\.diagram\)/,
	"clicking a tab should switch UI using the tab's own data-diagram key"
);

const switchDiagram = source.match(/function switchDiagram\(key\) \{[\s\S]*?\n\t\}/);
assert.ok(switchDiagram, "switchDiagram() should exist");
const setActiveIndex = switchDiagram[0].indexOf("setActiveTab(key)");
const resolveIndex = switchDiagram[0].indexOf("resolveDiagramDataKey(key)");
assert.ok(setActiveIndex >= 0, "switchDiagram should update active tab/overview for the raw key");
assert.ok(resolveIndex >= 0, "switchDiagram should still resolve data key for loading examples");
assert.ok(
	setActiveIndex < resolveIndex,
	"switchDiagram should update tab/panel UI before resolving example data"
);
