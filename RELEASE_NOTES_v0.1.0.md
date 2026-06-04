# Code-To-UML v0.1.0 - Initial Release

> Transform code into interactive UML reports and explore 100+ diagram examples — all in-browser, zero build tools.

**Release Date:** June 4, 2026

---

## 🎉 Highlights

### 🤖 AI-Powered Code Analysis
- **AI Agent Integration** — Built-in `SKILL.md` for Cursor, Claude Code, Qwen, Codex, and other AI assistants
- **13-Dimension Analysis Reports** — Comprehensive code analysis with UML diagrams, bilingual explanations, and interactive navigation
- **Multi-Scope Analysis** — Project, module, file, and function-level analysis
- **Smart Code Extraction** — Intelligent code snippet extraction (< 30 lines) for better readability

### 🎨 Interactive Diagram Showcase
- **100+ Diagram Examples** — Browse 20+ diagram types with bilingual support (English/Chinese)
- **20+ Diagram Types** — Sequence, Class, Activity, Component, State, Use Case, Deployment, Timing, Gantt, MindMap, WBS, EBNF, Regex, Network, JSON, YAML, Archimate, Salt (Wireframe)
- **Interactive Lightbox** — Full-screen viewing with zoom, pan, and keyboard navigation
- **Side TOC with Scroll Sync** — Always-visible navigation for long reports

### ⚡ Zero-Dependency Architecture
- **Browser-First Rendering** — PlantUML WASM with zero server latency
- **Automatic Fallback** — Client fails → server-side retry with plantuml.jar
- **No Build Tools** — Pure HTML/JS/CSS, no npm install required
- **Offline Capable** — Works after first load

### 🌐 Bilingual Support
- **English & Chinese** — Full bilingual UI and documentation
- **Language Switching** — Seamless language toggle with localStorage persistence
- **Custom i18n System** — Extensible internationalization framework

### 📊 Reusable Templates
- **`.ctu` Data Format** — Structured text files for diagram examples
- **HTML Template System** — Generate analysis reports from templates
- **Cache Management** — Sortable index with overwrite confirmation

### 🔧 Developer Experience
- **Zero Configuration** — Works out of the box
- **Simple Server** — Lightweight Node.js server (~600 lines)
- **Cross-Platform** — Windows, macOS, and Linux support
- **MIT License** — Open source and free to use

---

## 📦 Installation

### Prerequisites
- **Node.js 18+**
- **Java** (for server-side PlantUML rendering fallback)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/pingwurth/code-to-uml.git
cd code-to-uml

# Set up CTU_HOME for AI agent integration (optional)
node install-ctu-home.js

# Start the server
./serve.sh
# or
node serve.js 5401

# Open your browser
# http://localhost:5401
```

### Using with AI Agents
```bash
# File-level analysis
/code-to-uml Please analyze the file component/render-failure-common.js and generate a UML-backed, consistently formatted HTML report.

# Function-level analysis
/code-to-uml Please analyze the renderWithFailureHandling function and generate a UML-backed, consistently formatted HTML report.

# Project-level analysis
/code-to-uml Please analyze the entire code-to-uml project and generate a UML-backed, consistently formatted HTML report.
```

---

## 🎯 Core Features

### Diagram Types
| Category | Types |
|----------|-------|
| **UML** | Sequence, Use Case, Class, Object, Activity, Component, Deployment, State, Timing |
| **Non-UML** | Gantt, MindMap, WBS, EBNF, Regex, Network (nwdiag), JSON, YAML, Archimate, Salt (Wireframe) |

### Technical Stack
| Layer | Technology |
|-------|-----------|
| Server | Node.js lightweight dev server (~600 lines) |
| Runtime | Vanilla ES6+ JavaScript |
| Client Rendering | PlantUML WASM via `plantuml.js` |
| Server Rendering | `plantuml.jar` (Java) — automatic fallback |
| Graph Layout | Graphviz via Viz.js |
| Data Format | `.ctu` structured text files |
| Internationalization | Custom JS system, localStorage persistence |
| Styling | Pure CSS with custom properties |

### Key Features
- ✅ **Browser-First Rendering** — PlantUML WASM, zero server latency
- ✅ **Automatic Fallback** — Client fails → server-side retry with plantuml.jar
- ✅ **Interactive Lightbox** — Full-screen with zoom, pan, keyboard navigation
- ✅ **Side TOC with Scroll Sync** — Always-visible navigation for long reports
- ✅ **No Build Tools** — Zero npm overhead, pure HTML/JS served directly
- ✅ **Reusable Templates** — Generate analysis reports from structured `.ctu` data files
- ✅ **AI Skill Integration** — Bundled SKILL.md for AI agents to auto-generate reports

---

## 📚 Documentation

### Official Documentation
- **README** — English and Chinese documentation
- **CONTRIBUTING** — Contribution guidelines
- **AI Skill Definition** — `skills/code-to-uml/SKILL.md`
- **Agent Guidelines** — `AGENTS.md` and `CLAUDE.md`
- **CTU Template** — `data/_TEMPLATE.ctu`

### API Reference
- **`GET /api/demo-examples`** — Returns parsed `.ctu` examples for the diagram viewer
- **`POST /api/plantuml-svg`** — Server-side PlantUML rendering fallback

### Configuration
| Setting | Mechanism | Default |
|---------|-----------|---------|
| Server port | `PORT` env var or CLI argument | `5401` |
| Project root | `CTU_HOME` env var (set by `install-ctu-home.js`) | CWD |
| UI language | `localStorage` key `plantuml-docs-lang` | Browser locale |
| Theme | CSS custom properties in `main.css` | Light |

---

## 🏗️ Architecture

### Rendering Pipeline
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

### Key Design Decisions
- **WASM-first** eliminates server round-trips for the majority of diagrams.
- **Automatic fallback** handles edge cases where WASM has limitations (large diagrams, certain stdlib imports).
- **Error categorization** enables targeted retry logic rather than blind retries.

---

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a Pull Request.

### Areas for Contribution
- **New diagram examples** — Add `.ctu` files for under-represented diagram types
- **Localization** — Extend beyond English/Chinese
- **Theme variants** — Additional CSS custom property sets
- **PlantUML stdlib coverage** — Examples using AWS, Azure, K8s icon libraries
- **Testing** — Expand the test suite in `test/`

### Quick Contribution Links
- 🐛 [Report a Bug](https://github.com/pingwurth/code-to-uml/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/pingwurth/code-to-uml/issues/new?template=feature_request.md)
- 📊 [Suggest a Diagram Example](https://github.com/pingwurth/code-to-uml/issues/new?template=new_example.md)
- 💬 [Join the Discussion](https://github.com/pingwurth/code-to-uml/discussions)

---

## 🙏 Acknowledgments

- **PlantUML** for the amazing diagram syntax
- **Graphviz** for graph layout
- **Viz.js** for browser-side Graphviz rendering
- **The open-source community** for inspiration and support

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📢 Spread the Word

If you find Code-To-UML useful, please consider:

- ⭐ **Star this repository** to show your support
- 🐦 **Share on Twitter**: [Share](https://twitter.com/intent/tweet?text=Check%20out%20Code-To-UML%20-%20AI-powered%20code%20analysis%20that%20generates%20interactive%20UML%20reports!&url=https://github.com/pingwurth/code-to-uml)
- 💬 **Join the discussion**: [GitHub Discussions](https://github.com/pingwurth/code-to-uml/discussions)
- 📖 **Follow for updates**: [GitHub Profile](https://github.com/pingwurth)

---

## 🔗 Links

### Documentation
- [PlantUML Official Documentation](https://plantuml.com)
- [AI Skill Definition](skills/code-to-uml/SKILL.md)
- [Agent Guidelines](AGENTS.md)
- [Claude Code Guidelines](CLAUDE.md)
- [CTU Template](data/_TEMPLATE.ctu)
- [Contributing Guide](CONTRIBUTING.md)

### Community
- [GitHub Discussions](https://github.com/pingwurth/code-to-uml/discussions) - Ask questions, share ideas
- [GitHub Issues](https://github.com/pingwurth/code-to-uml/issues) - Report bugs, request features
- [Pull Requests](https://github.com/pingwurth/code-to-uml/pulls) - Contribute code

### Social
- ⭐ [Star on GitHub](https://github.com/pingwurth/code-to-uml) - Show your support!
- 🐦 [Share on Twitter](https://twitter.com/intent/tweet?text=Check%20out%20Code-To-UML%20-%20AI-powered%20code%20analysis%20that%20generates%20interactive%20UML%20reports!&url=https://github.com/pingwurth/code-to-uml) - Spread the word
- 📖 [GitHub Profile](https://github.com/pingwurth) - Follow for updates

---

**Full Changelog**: https://github.com/pingwurth/code-to-uml/commits/v0.1.0
