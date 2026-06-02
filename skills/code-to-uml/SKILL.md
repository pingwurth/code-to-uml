---
name: code-to-uml
description: Use when source code must be analyzed at project, module, file, class, or function scope to produce a detailed, consistent UML-backed HTML report from an existing report/template system, especially Code-To-UML .ctu reports.
---

# Code UML Report

## Purpose

Generate a developer-friendly source-code analysis report for any scope: whole project, module/package, file, class, or single function. The final artifact must combine UML diagrams, Chinese explanatory text, focused code examples, and the existing Code-To-UML template/report conventions.

## Reference Loading

Load references only when their condition applies:

- `references/report-contract.md`: always read before planning or generating report content.
- `references/code-to-uml-template.md`: read when `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` exist, or when generating a Code-To-UML report page.
- `references/diagram-decision-table.md`: read before deciding the text-to-diagram ratio or diagram types.
- `references/uml-standards.md`: read after diagram decisions whenever the report will contain non-empty `[UML]` blocks or existing PlantUML must be validated; apply it before authoring, while writing each diagram's `[Detail]`, and during UML validation.

## Hard Rules

- Treat analyzed source as read-only unless the user explicitly asks for code changes.
- Resolve the Code-To-UML project root from `CTU_HOME` first. If `CTU_HOME` is unset, use the current working directory only when it contains `cache/_TEMPLATE.html` and `data/_TEMPLATE.ctu`; otherwise tell the user to run the project install script that sets `CTU_HOME`.
- If the Code-To-UML template exists, reuse its structure, CSS/JS dependencies, data conventions, navigation rules, and UML rendering path. Preserve every template `[FIXED]` class/id/data attribute and script order; edit only `[EDIT]` and `[CONFIG]` areas unless the template explicitly allows more.
- Put report content in the matching data directory when the template is data-driven. Do not add ad hoc report blocks to HTML.
- Report body defaults to Chinese unless the user explicitly requests another language.
- Keep one consistent report section catalog across project/module/file/class/function scopes. Scope changes depth, evidence, and standalone/merged section requirements according to `references/report-contract.md`.
- Text must fully carry the analysis; diagrams are aids. Use real function/class names, file paths, constants, routes, commands, environment variables, side effects, failure paths, and line/symbol references.
- Do not split into multiple HTML files unless the target contains more than three highly independent, complex core classes or subsystems. If splitting, update all topbar/page links.
- Handle topbar links such as `official-demo-link` deliberately: preserve a truthful link, replace it with a truthful companion link, or remove the whole `<a>` element.
- After generating a report, start the Code-To-UML server from `$CTU_HOME` with `serve.sh` on macOS/Linux or `serve.bat` on Windows. The scripts own port cleanup; do not duplicate port-kill logic or add `$CTU_HOME` to `PATH`.
- Do not claim completion without fresh verification evidence. The final response must include the browser URL.

## Workflow

1. **Resolve scope and constraints**
   - Identify the target type: project, module/package, file, class, or function.
   - Record target path/symbol, requested output path, report language, read-only constraints, and template requirements.
   - Resolve `CTU_HOME`; if no output path is specified, use `$CTU_HOME/cache/<target-slug>_analysis.html`.

2. **Read instructions and templates**
   - Read local instructions such as `AGENTS.md`, `CLAUDE.md`, or project docs.
   - Read the required references listed above.
   - Read `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` when present.
   - Inspect one nearby generated page if runtime behavior is not fully described by the template comments.

3. **Analyze code structurally**
   - Prefer structural tools when available for definitions, callers, callees, signatures, and impact.
   - Use `rg` and focused file reads for literal text, comments, config, and exact source snippets.
   - For broad scopes, map subsystems, entry points, dependency boundaries, data stores, and runtime processes.
   - For narrow scopes, map responsibilities, parameters, return values, side effects, callers/callees, state transitions, error paths, and extension points.
   - Let the final report contract drive analysis depth. Do not analyze for its own sake.

4. **Plan the report**
   - Use `references/report-contract.md` for section IDs, category ownership, scope applicability, quality bar, maintenance expectations, and final response shape.
   - Use `references/diagram-decision-table.md` to score complexity and decide which sections need diagrams.
   - For every planned non-empty `[UML]` block, apply `references/uml-standards.md` for the mandatory UML block contract, diagram-type rules, readability budget, and `[Detail]` writing template.
   - Keep every UML block paired with Chinese explanation.

5. **Generate data and HTML**
   - Create `$CTU_HOME/data/<report-slug>/` and category-based `.ctu` files.
   - Follow `$CTU_HOME/data/_TEMPLATE.ctu` exactly for `.ctu` syntax.
   - Copy the template shell to the requested HTML path under `$CTU_HOME/cache/` unless the user gave an explicit path.
   - Configure `body data-dir`, tab buttons, overview elements, scripts, and relative paths according to the template contract.

6. **Validate UML, page, and navigation**
   - Extract every `[UML]` block, treat empty or `None` content as text-only per `references/code-to-uml-template.md`, and validate every non-empty UML block against `references/uml-standards.md`, including start/end tags, balanced delimiters, declared participants/classes where needed, valid arrows, unsafe special characters, diagram-type rules, and `[Detail]` coverage.
   - If PlantUML is available, render every diagram locally and require zero render errors; otherwise state the static-check limitation and render risk.
   - Start the local server on port `5401` unless the user specified another port.
   - Verify the report URL returns HTTP 200, the data API/loader returns all expected categories and card counts, topbar links behave correctly, and analyzed source files were not modified.

## Completion

Return the concise final status shape from `references/report-contract.md`, including the generated HTML path, template reuse status, split-file decision, PlantUML check result, section summary, and browser URL.
