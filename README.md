# Code-To-UML

> Transform code into interactive UML reports and explore 100+ diagram examples — all in-browser, zero build tools.

**[中文文档](README_zh.md)**

<!-- Badges -->
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![No Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)

---

## Key Features

- ✅ **Browser-First Rendering** — PlantUML WASM, zero server latency
- ✅ **Automatic Fallback** — Client fails → server-side retry with plantuml.jar
- ✅ **Bilingual by Default** — English ↔ Chinese switching with persistent preference
- ✅ **Interactive Lightbox** — Full-screen with zoom, pan, keyboard navigation
- ✅ **Side TOC with Scroll Sync** — Always-visible navigation for long reports
- ✅ **No Build Tools** — Zero npm overhead, pure HTML/JS served directly
- ✅ **Reusable Templates** — Generate analysis reports from structured `.ctu` data files
- ✅ **AI Skill Integration** — Bundled SKILL.md for AI agents to auto-generate reports

---

## Table of Contents

- [About](#about)
- [Supported Diagram Types](#supported-diagram-types)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [AI Agent Integration](#ai-agent-integration)
- [Contributing](#contributing)
- [License](#license)
- [Links](#links)

---

## About

Most UML documentation workflows rely on heavyweight IDEs, fragile build pipelines, or opaque SaaS tools. Code-To-UML takes a different approach:

1. **Code Analysis Reports** — Feed source code to an AI agent and get back a self-contained HTML report with UML diagrams, bilingual explanations, and interactive navigation.
2. **Diagram Showcase** — Browse 100+ bilingual PlantUML examples across 20+ diagram types, rendered live in your browser.
3. **AI Agent Skill** — A bundled skill definition (`SKILL.md`) lets Cursor, Claude Code, Qwen, Codex, and other AI assistants generate reports autonomously.

No frameworks. No transpilers. No `node_modules`. Just open `demo.html` and go.

---

## Supported Diagram Types

| Category | Types |
|----------|-------|
| **UML** | Sequence, Use Case, Class, Object, Activity, Component, Deployment, State, Timing |
| **Non-UML** | Gantt, MindMap, WBS, EBNF, Regex, Network (nwdiag), JSON, YAML, Archimate, Salt (Wireframe) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js lightweight dev server (`serve.js`, ~600 lines) |
| Runtime | Vanilla ES6+ JavaScript — no frameworks, no npm dependencies |
| Client Rendering | PlantUML WASM via `plantuml.js` |
| Server Rendering | `plantuml.jar` (Java) — automatic fallback |
| Graph Layout | Graphviz via Viz.js |
| Data Format | `.ctu` structured text files |
| Internationalization | Custom JS system, localStorage persistence, `docs:langchange` event |
| Styling | Pure CSS with custom properties for theming |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **Java** (for server-side PlantUML rendering fallback)

### Installation

1. Clone the repository:

```bash
git clone <repo-url> code-to-uml
cd code-to-uml
```

2. (Optional) Set up `CTU_HOME` for AI agent integration:

```bash
node install-ctu-home.js
```

3. Start the server:

```bash
./serve.sh
# or specify a custom port
./serve.sh 5401
# or directly with Node
node serve.js 5401
```

4. Open your browser:

```
http://localhost:5401/demo.html
```

No `npm install`. No build step. That's it.

---

## Usage

### Interactive Demo

Open `demo.html` to browse all diagram examples. Use the tab bar to switch diagram types and the language toggle to switch between English and Chinese.

### Generating Reports

1. Place `.ctu` data files in `data/s20-comprehensive/` (or a custom directory).
2. Use the AI skill (see [AI Agent Integration](#ai-agent-integration)) or manually create an HTML report using `cache/_TEMPLATE.html`.
3. Generated reports appear in `cache/` and are accessible from `index.html`.

### .ctu File Format

Each `.ctu` file defines one or more diagram examples with metadata:

```text
Title: Section Title
Describe: Description
------------------------------------------------------------
[Example]
Example title

[Description]
Markdown description of what this diagram demonstrates

[UML]
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi there
@enduml

[Detail]
Explanation of diagram elements and syntax
------------------------------------------------------------
```

**Naming convention:** `{diagram-type}--{number}_{language}.ctu`

Examples: `sequence--1_en.ctu`, `class--3_zh.ctu`, `activity--2_en.ctu`

---

## Project Structure

```
code-to-uml/
├── serve.js                 # Dev server + API endpoints
├── demo.html                # Main diagram viewer SPA
├── demo.js                  # Page controller
├── index.html               # Home / cache index
├── main.css                 # All styles
├── i18n-config.js           # i18n runtime
├── i18n/
│   ├── zh.js                # Chinese strings
│   └── en.js                # English strings
├── component/               # Reusable UI components
│   ├── docs-page-core.js    # Core page logic
│   ├── render-failure-common.js  # Error handling
│   ├── demo-example-component.js # Example card renderer
│   └── toc-component.js     # Table of contents
├── data/
│   ├── demo/                # Built-in examples (.ctu files)
│   ├── _TEMPLATE.ctu        # Template for new reports
│   └── s20-comprehensive/   # Example: analysis report data
├── cache/
│   ├── _TEMPLATE.html       # Reusable report HTML template
│   └── (generated reports)
├── js/                      # PlantUML + theme libraries
├── plantuml-official-demo/  # Official PlantUML reference docs
├── skills/code-to-uml/
│   └── SKILL.md             # AI agent skill definition
├── CLAUDE.md                # Claude Code guidance
├── AGENTS.md                # Agent documentation
└── install-ctu-home.js      # CTU_HOME setup script
```

---

## API Reference

### `GET /api/demo-examples`

Returns parsed `.ctu` examples for the diagram viewer.

| Parameter | Type | Description |
|-----------|------|-------------|
| `lang` | `en` \| `zh` | Language filter (default: `en`) |

**Response:** JSON array of parsed example objects.

### `POST /api/plantuml-svg`

Server-side PlantUML rendering fallback.

| Field | Description |
|-------|-------------|
| **Body** | Raw PlantUML source text |
| **Content-Type** | `text/plain` |
| **Response** | SVG markup |

---

## Configuration

| Setting | Mechanism | Default |
|---------|-----------|---------|
| Server port | `PORT` env var or CLI argument | `5401` |
| Project root | `CTU_HOME` env var (set by `install-ctu-home.js`) | CWD |
| UI language | `localStorage` key `plantuml-docs-lang` | Browser locale |
| Theme | CSS custom properties in `main.css` | Light |

---

## Architecture

The rendering pipeline uses a two-tier strategy for maximum reliability:

```
User opens demo.html
        │
        ▼
  [Render Queue]
        │
        ▼
  Try browser rendering (plantuml.js WASM)
        │
        ▼
  Rendered? ── Yes ──▶ Display SVG
        │
       No
        │
        ▼
  Detect error type
        │
        ▼
  Retry server-side (POST /api/plantuml-svg)
        │
        ▼
  Success? ── Yes ──▶ Display SVG
        │
       No
        │
        ▼
  Show error message + recovery action
```

Key design decisions:
- **WASM-first** eliminates server round-trips for the majority of diagrams.
- **Automatic fallback** handles edge cases where WASM has limitations (large diagrams, certain stdlib imports).
- **Error categorization** enables targeted retry logic rather than blind retries.

---

## AI Agent Integration

Code-To-UML ships with a skill definition at [`skills/code-to-uml/SKILL.md`](skills/code-to-uml/SKILL.md) that enables AI coding assistants to generate analysis reports.

### Supported Agents

- Cursor (via Rules / AGENTS.md)
- Claude Code (via CLAUDE.md)
- Qwen Coder
- OpenAI Codex
- Any agent supporting skill/tool definitions

### Setup

1. Run `node install-ctu-home.js` to register the project path.
2. Point your AI agent to `skills/code-to-uml/SKILL.md`.
3. Ask the agent to analyze a codebase — it will produce `.ctu` data files and an HTML report.

---

## Contributing

Areas where contributions are welcome:

- **New diagram examples** — Add `.ctu` files for under-represented diagram types
- **Localization** — Extend beyond English/Chinese
- **Theme variants** — Additional CSS custom property sets
- **PlantUML stdlib coverage** — Examples using AWS, Azure, K8s icon libraries
- **Testing** — Expand the test suite in `test/`

---

## License

[MIT](LICENSE)

---

## Links

- [PlantUML Official Documentation](https://plantuml.com)
- [AI Skill Definition](skills/code-to-uml/SKILL.md)
- [Agent Guidelines](AGENTS.md)
- [Claude Code Guidelines](CLAUDE.md)
- [CTU Template](data/_TEMPLATE.ctu)
