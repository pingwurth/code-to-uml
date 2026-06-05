"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const demoJs = fs.readFileSync("demo.js", "utf8");
const component = fs.readFileSync("component/demo-example-component.js", "utf8");
const css = fs.readFileSync("main.css", "utf8");
const template = fs.readFileSync("cache/_TEMPLATE.html", "utf8");
const demoHtml = fs.readFileSync("demo.html", "utf8");

assert.match(demoJs, /const SAVE_UML_API_PATH = "\/api\/demo-uml"/, "demo.js should call the UML save API");
assert.match(demoJs, /action === "save-uml"/, "demo.js should handle the save UML action");
assert.match(demoJs, /ctuGroupIndex/, "demo.js should send a CTU group index when saving");

assert.match(component, /data-action", "save-uml"/, "example cards should create a save UML action button");
assert.match(component, /dataset\.ctuFile/, "example cards should keep the target CTU file on the wrapper");
assert.match(component, /dataset\.ctuGroupIndex/, "example cards should keep the target CTU group index on the wrapper");

assert.match(css, /\[data-action="save-uml"\]/, "save UML action should have an icon style");
assert.match(template, /POST \/api\/demo-uml/, "template should document the save API");
assert.match(template, /save UML, copy source, copy SVG, download SVG/, "template should document the save action");
assert.match(demoHtml, /save action that updates the matching data\/demo\/\*\.ctu \[UML\] block/, "demo.html should document save behavior");
