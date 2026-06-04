# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vanilla JavaScript web application that renders PlantUML diagrams in the browser. No build tools, no package.json, no bundler — plain HTML/CSS/JS served by a lightweight Node.js dev server.

## Running the Server

```bash
# Start dev server (default port 5401)
./serve.sh
# or
node serve.js

# Custom port
node serve.js 8080
```

Requires Java on PATH for the `plantuml.jar` fallback rendering endpoint (`POST /api/plantuml-svg`).

## Running Tests

```bash
# Run all tests
node test/run-all.js

# Run a single test
node test/cache-index-sort.test.js
```

Tests use Node's built-in `assert/strict` — no test framework. Each `test/*.test.js` file is self-contained.

## Architecture

### Rendering Pipeline

PlantUML diagrams are rendered via a two-tier strategy:

1. **Browser rendering** (primary): `js/plantuml.js` renders PlantUML source to SVG client-side using WebAssembly
2. **Jar fallback** (fallback): If browser rendering fails (runtime error, diagram too large), the app calls `POST /api/plantuml-svg` which spawns `java -jar plantuml.jar --svg -pipe` server-side

The fallback logic lives in `component/render-failure-common.js` (`renderWithFailureHandling`). It detects SVG errors, runtime crashes, and timeout conditions, then automatically retries via the jar endpoint.

### Component Modules (IIFE pattern)

All components expose their API on `window` via IIFE. Load order matters — dependencies must load before dependents:

| Module | Global | Purpose |
|--------|--------|---------|
| `js/plantuml.js` | `window.plantumlRender` | Browser-side PlantUML renderer |
| `js/viz-global.js` | Graphviz | Graphviz/Viz.js for certain diagram types |
| `component/docs-page-core.js` | `PlantUmlDocsCore` | Core utilities: source reading, error detection, SVG manipulation, jar fallback HTTP client |
| `component/render-failure-common.js` | `PlantUmlRenderFailureCommon` | Render orchestration with automatic fallback |
| `component/demo-example-component.js` | `PlantUmlDemoExample` | Creates example DOM nodes (source editor + preview + actions) |
| `component/toc-component.js` | `PlantUmlToc` | Side table-of-contents with scroll-based active tracking |
| `i18n/zh.js`, `i18n/en.js` | `__DOCS_I18N_ZH__`, `__DOCS_I18N_EN__` | Dictionary globals |
| `i18n-config.js` | `DocsI18n` | i18n runtime (getMode/setMode/t/apply), dispatches `docs:langchange` events |
| `demo.js` | — | Main page controller: bootstraps demo, manages tabs, render queue, lightbox |

### Demo Example Data (`.ctu` files)

Examples are stored in `data/demo/` as `.ctu` files with bilingual naming: `{diagram-type}--{id}_{lang}.ctu`

Each `.ctu` file uses a custom section format:
```
Title: Section Title
Describe: Section description
------------------------------------------------------------
[Example]
Example title
[Description]
Example description (supports markdown)
[Detail]
Detail text shown below preview
[UML]
@startuml
...PlantUML source...
@enduml
```

Multiple examples per file are separated by `-----` lines. The server parses these in `serve.js` → `parseCtuGroups()` and serves them via `GET /api/demo-examples?lang=zh|en`.

### i18n

- Default language: Chinese (`zh`)
- Persisted to `localStorage` key `plantuml-docs-lang`
- Language switch dispatches `docs:langchange` custom event; components re-render on this event
- Demo examples are bilingual — each `.ctu` file exists in both `*_zh.ctu` and `*_en.ctu` variants

### Lightbox

Clicking a rendered diagram preview opens a full-screen lightbox (`demo.js` → `initPreviewLightbox`) with zoom (scroll/pinch), pan (drag), and keyboard (Escape to close) support.

## Key Files

- `serve.js` — Dev server with static file serving + `/api/demo-examples` + `/api/plantuml-svg` endpoints
- `demo.html` — Single-page app shell
- `demo.js` — Main page controller (tab switching, render queue, lightbox, i18n wiring)
- `main.css` — All styles
- `component/docs-page-core.js` — Shared rendering utilities and error detection
- `data/demo/*.ctu` — Diagram example data files

## Conventions

- Pure vanilla JS — no frameworks, no npm dependencies
- IIFE module pattern exposing globals on `window`
- Strict mode (`"use strict"`) in all files
- CSS custom properties for theming in `main.css`
- Chinese is the primary language; English is secondary
