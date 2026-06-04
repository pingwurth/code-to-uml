---
name: code-to-uml
description: Use when source code must be analyzed at project, module, file, class, or function scope to produce a detailed, consistent UML-backed HTML report from an existing report/template system, especially Code-To-UML .ctu reports.
---

# Code UML Report

## Purpose

Generate a developer-friendly source-code analysis report for any scope: project, module/package, file, class, or function.
Reuse the Code-To-UML template/report conventions, write in the report language, include focused code evidence, and add UML only when it reduces reader effort.

## Reference Loading

Load references only when their condition applies:

- `references/report-contract.md`: always read before planning or generating content.
- `references/code-to-uml-template.md`: read before generating a Code-To-UML HTML page.
- `references/diagram-decision-table.md`: read before deciding whether diagrams are useful.
- `references/uml-standards.md`: read before authoring or validating non-empty `[UML]` blocks.
- `scripts/validate-report.js`: run with `--strict` before claiming completion; add `--render` when `plantuml.jar` and Java are available.

## Hard Rules

- Treat analyzed source as read-only unless the user asks for code changes.
- Resolve the Code-To-UML root as `CTU_HOME`, then user-provided root, then cwd if it contains `cache/_TEMPLATE.html` and `data/_TEMPLATE.ctu`.
- Reuse the template structure, data conventions, CSS/JS dependencies, script order, and UML rendering path. Preserve every `[FIXED]` selector and edit only allowed `[EDIT]` / `[CONFIG]` areas.
- Keep report content in `.ctu` data files when the template is data-driven; do not add ad hoc report blocks to HTML.
- Match the user's language unless they request another language; keep source identifiers unchanged.
- Write generated HTML and `.ctu` as valid UTF-8. Do not rely on Windows shell-default encoding.
- Follow the shared section catalog in `report-contract.md`; scope changes depth and merge behavior, not the model.
- The page intro `<p data-markdown>` must be a <= 500-character whole-report overview. Follow `code-to-uml-template.md` for Markdown and line-break rules.
- Text must carry the analysis. Diagrams are optional aids, and `[UML]` may be `None` for text-only cards.
- Use concrete source evidence: names, paths, constants, routes, commands, side effects, failure paths, and line/symbol references.
- Do not split into multiple HTML files unless the target has more than three independent complex subsystems; update links if splitting.
- Handle topbar links deliberately: keep truthful, replace truthfully, or remove the whole link.
- Do not claim completion without fresh validation evidence and a browser URL.

## Workflow

1. **Resolve scope and constraints**
   - Identify the target type: project, module/package, file, class, or function.
   - Record target path/symbol, requested output path, report language, read-only constraints, and template requirements.
   - Resolve the Code-To-UML root; if no output path is specified, use `$CTU_HOME/cache/<target-slug>_analysis.html`.

2. **Read instructions and templates**
   - Read local instructions such as `AGENTS.md`, `CLAUDE.md`, or project docs.
   - Read only the required references listed above.
   - Read `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` when present.
   - Inspect one nearby generated page if runtime behavior is not fully described by the template comments.

3. **Analyze code structurally**
   - Prefer structural tools for definitions, callers, callees, signatures, and impact.
   - Use `rg` and focused file reads for literal text, config, and exact snippets.
   - For broad scopes, map subsystems, entry points, dependency boundaries, data stores, and runtime processes.
   - For narrow scopes, map responsibilities, parameters, return values, side effects, callers/callees, state transitions, error paths, and extension points.
   - Let the final report contract drive analysis depth. Do not analyze for its own sake.

4. **Plan the report**
   - Use `report-contract.md` for section coverage, category ownership, quality gates, and final response shape.
   - Use `diagram-decision-table.md` for diagram value and type decisions.
   - Use `uml-standards.md` for every non-empty UML block.
   - Keep every UML block paired with useful explanation in the report language.

5. **Generate data and HTML**
   - Create `$CTU_HOME/data/<report-slug>/` and category-based `.ctu` files.
   - Follow `$CTU_HOME/data/_TEMPLATE.ctu` exactly for `.ctu` syntax.
   - Write every generated HTML and `.ctu` file as UTF-8.
   - Write `[Description]` and `[Detail]` as Markdown, using `None` only to hide a field.
   - Follow the no-hard-wrap prose rule in `code-to-uml-template.md`.
   - Copy the template shell to the requested HTML path under `$CTU_HOME/cache/` unless the user gave an explicit path.
   - Fill intro `<h1>` and `<p data-markdown>` with the target title and whole-report overview before finalizing the HTML shell.
   - Configure `body data-dir`, tab buttons, overview elements, scripts, and relative paths according to the template contract.

6. **Validate UML, page, and navigation**
   - Validate non-empty UML blocks against `uml-standards.md`; treat empty or `None` UML as text-only.
   - Run `node <skill-dir>/scripts/validate-report.js --root "$CTU_HOME" --html "cache/<report-file>.html" --lang <zh|en> --strict`.
   - Add `--render` when `plantuml.jar` exists and Java is available; otherwise state the render limitation.
   - Start the server from `$CTU_HOME` on port `5401` unless the user specified another port.
   - Use `.\serve.bat 5401` on PowerShell, `serve.bat 5401` on cmd.exe, and `./serve.sh 5401` on macOS/Linux.
   - Verify HTTP 200, API categories/card counts, topbar behavior, and source read-only status.

## Completion

Return the concise final status shape from `references/report-contract.md`, including the generated HTML path, template reuse status, split-file decision, validation/PlantUML check result, section summary, and browser URL.
