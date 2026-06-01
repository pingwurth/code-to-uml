# Repository Guidelines

## Project Structure & Module Organization
This is a static frontend project for editing/rendering PlantUML content in-browser and via a local Node server.

- `demo.html`, `demo.js`, `main.css`: main UI entrypoint and client behavior.
- `component/`: reusable UI modules (for example `docs-page-core.js`, `demo-example-component.js`).
- `serve.js`, `serve.sh`, `serve.bat`: local dev server and PlantUML render endpoint.
- `js/`: bundled third-party libraries and PlantUML-related runtime assets.
- `data/demo/`: sample `.ctu` input files used by the demo.
- `i18n/` + `i18n-config.js`: localization dictionaries and language config.
- `plantuml-official-demo/`: reference HTML examples.

## Build, Test, and Development Commands
No package manager scripts are defined at repo root; run with Node directly.

- `./serve.sh` or `./serve.sh 5401`: start local server on default/custom port.
- `node serve.js 5401`: equivalent cross-platform server launch.
- `serve.bat 5401`: Windows launcher.

The server hosts static files and exposes backend rendering via `plantuml.jar`, so Java must be installed and available on `PATH`.

## Coding Style & Naming Conventions
- JavaScript: keep existing style (`"use strict"`, semicolons, tab indentation in core JS files).
- Prefer `camelCase` for variables/functions and `UPPER_SNAKE_CASE` for constants.
- Keep component files focused by feature (`component/<feature>-component.js`).
- Do not edit minified vendor files under `js/*.min.js`; place custom logic in `demo.js` or `component/`.

## Testing Guidelines
There is currently no automated test suite in this repository. Validate changes manually:

1. Start server (`./serve.sh`).
2. Open `http://localhost:5401/demo.html`.
3. Verify diagram rendering, localization switch, and failure states.
4. If server/render logic changed, test at least one `.ctu` file from `data/demo/`.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commits with optional scope, e.g.:
- `refactor(render): simplify and unify rendering logic for .mycell elements`
- `Complete the development of the sample page.`

Follow this pattern:
- Use one clear subject line (imperative mood).
- Keep related changes in one commit.
- In PRs, include purpose, key file changes, manual test steps, and UI screenshots for visual updates.
