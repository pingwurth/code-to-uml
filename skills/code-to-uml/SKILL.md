---
name: code-to-uml
description: Use when generating, updating, repairing, validating, or reviewing Code-To-UML .ctu/HTML source-analysis reports for a project, module, file, class, function, existing report, or validator/rendering failure.
---

# Code-To-UML Reports

## Core Rule

Generate, update, repair, validate, or review source-grounded Code-To-UML `.ctu`/HTML reports.
Analyzed source is read-only unless the user asks for code changes. Keep report content in `.ctu` data files, keep HTML as a thin data-driven shell, and add UML only when it reduces reader effort.

## Absolute Path Rule

- Resolve `CTU_SKILL_ROOT` to the absolute directory containing this `SKILL.md` before reading skill resources or running skill scripts.
- Resolve `CTU_HOME` to the absolute Code-To-UML root before reading templates, writing artifacts, validating reports, or starting the server.
- Treat every `$CTU_SKILL_ROOT/...` and `$CTU_HOME/...` path in this document as absolute because both root variables must contain absolute paths.
- Do not use bare relative paths, `.` paths, `..` paths, or commands whose meaning depends on the shell working directory.

## Mode Picker

Choose the mode before reading references or changing files.

| User intent | Mode | Writes | Required references | Validation |
| --- | --- | --- | --- | --- |
| New comprehensive project/module/file report, or explicit "full" request | Full report | Yes | `$CTU_SKILL_ROOT/references/report-contract.md`, `$CTU_SKILL_ROOT/references/code-to-uml-template.md`, and absolute diagram/UML reference paths as needed | `--mode full` |
| Narrow function/class/small file report, or explicit "compact" request | Compact report | Yes | `$CTU_SKILL_ROOT/references/report-contract.md`, `$CTU_SKILL_ROOT/references/code-to-uml-template.md`, and absolute diagram/UML reference paths as needed | `--mode compact` |
| Refresh an existing report | Update existing report | Yes | Existing report plus refs for changed surfaces | Existing mode, usually `--mode full` or `--mode compact` |
| Validator, artifact, PlantUML, or runtime failure | Fix validation/rendering | Yes | Failing artifact plus relevant contract/script | Reproduce and rerun the failing command |
| Inspect a skill, report, or artifact | Review only | No unless asked | File under review; refs only for checked claims | Optional |

## Defaults

- Target: resolve "this project/current repo" to the current repository's absolute root path with scope `project`.
- Scope: infer `module` from a directory, `file` from a source file, and `function`/`class` from an explicit symbol when structural tools can resolve it.
- Report language: use the user's language; use `zh` for Chinese-dominant requests and `en` for English-dominant requests.
- Report mode: explicit user mode wins; otherwise use compact for small functions/classes/low-complexity files, full for project/module/file or comprehensive requests.
- Output path: if omitted for generated HTML, use `$CTU_HOME/cache/<target-slug>_analysis.html`.
- CTU root: resolve as an absolute `CTU_HOME`, then an absolute user-provided Code-To-UML root, then the absolute shell working directory only if that directory passes the Code-To-UML template existence checks.
- Relative output paths requested by the user are always relative to the resolved CTU root and must immediately become absolute `$CTU_HOME/...` paths, never the analyzed repository cwd, skill directory, or shell cwd.
- An output path outside the resolved CTU root is allowed only when the user explicitly provides an absolute path and clearly requests external placement.
- Ask only when the target/action cannot be inferred safely, multiple targets match, or an existing report cannot be mapped to source/data.

Before generating artifacts, state the resolved absolute CTU root and absolute HTML/data output paths.

## Required Workflow

1. Resolve mode, target, scope, language, CTU root, output paths, and read-only constraints. Normalize every relative artifact path against the CTU root before any write.
2. Read local project instructions, then only the required references from the Reference Map.
3. Analyze source structurally first for definitions, callers, callees, signatures, impact, and subsystem boundaries; use `rg` and focused reads for literal text and snippets.
4. Classify complexity from `$CTU_SKILL_ROOT/references/report-contract.md`, then plan cards from real target mechanisms rather than minimum card counts.
5. Generate or update `$CTU_HOME/data/<report-slug>/` `.ctu` files and a template-based HTML shell under `$CTU_HOME/cache/` unless the user gave an explicit path.
6. Validate with `$CTU_SKILL_ROOT/scripts/validate-report.js` using the selected mode, scope, complexity, language, and `--strict`.
7. For HTML reports, provide a browser URL when runtime behavior is relevant or the user expects one. Start the server only when needed for runtime/API/topbar verification.

## Non-Negotiable Checks

- Preserve template structure, data conventions, CSS/JS dependencies, script order, `[FIXED]` selectors, and allowed `[EDIT]` / `[CONFIG]` boundaries.
- Before writing, verify that normalized HTML and data paths are under the resolved CTU root unless the user explicitly requested an absolute external path.
- Write generated HTML and `.ctu` files as valid UTF-8; do not rely on Windows shell-default encoding.
- Use real target-specific content for every required `Section-ID: Sxx_...`; never use section markers as placeholders.
- Full reports must pass coverage and depth. Large or multi-subsystem targets use `--complexity high` and cover all major subsystems.
- Compact reports may merge sections, but each merged ID must include concrete evidence or a clear reason no separate content exists.
- The intro `<p data-markdown>` is a concise whole-report Markdown overview, not a category overview.
- Text must carry the analysis; diagrams are optional and every non-empty `[UML]` block needs useful `[Detail]`.
- Ground claims in concrete source evidence: paths, symbols, constants, routes, commands, side effects, failure paths, line/symbol references, or explicitly marked inference.
- Handle topbar links deliberately: keep truthful, replace truthfully, or remove the whole link.
- Add `--render` only when both Java and `$CTU_HOME/plantuml.jar` are available; otherwise state that render validation was skipped.

## Reference Map

| Need | Read/use |
| --- | --- |
| Section catalog, scope applicability, complexity, quality gates, final response shape | `$CTU_SKILL_ROOT/references/report-contract.md` |
| HTML shell, `.ctu` syntax, path/category/runtime contract | `$CTU_SKILL_ROOT/references/code-to-uml-template.md` |
| Whether a diagram is useful and which type to choose | `$CTU_SKILL_ROOT/references/diagram-decision-table.md` |
| Authoring or checking non-empty PlantUML blocks | `$CTU_SKILL_ROOT/references/uml-standards.md` |
| Artifact/content/runtime validation | `$CTU_SKILL_ROOT/scripts/validate-report.js` |
| Validator or report-contract changes | `$CTU_SKILL_ROOT/scripts/validate-fixtures.js` and `$CTU_SKILL_ROOT/fixtures/` |

For review-only requests, do not load every reference by default. Read the file under review first, then load only the reference that owns the claim being checked.

## Validation Command

Use this shape for generated or updated HTML reports:

```bash
node "$CTU_SKILL_ROOT/scripts/validate-report.js" \
  --root "$CTU_HOME" \
  --html "$CTU_HOME/cache/<report-file>.html" \
  --lang <zh|en> \
  --scope <project|module|file|class|function> \
  --complexity <low|medium|high> \
  --mode <compact|full> \
  --strict
```

Add `--render` only when Java and `$CTU_HOME/plantuml.jar` are available.
After changing the validator or report contract, run:

```bash
node "$CTU_SKILL_ROOT/scripts/validate-fixtures.js"
```

## Completion

For generated/updated reports, return the concise final status from `$CTU_SKILL_ROOT/references/report-contract.md`: HTML path, template reuse status, split-file decision, validation/PlantUML result, section summary, and browser URL when runtime validation was performed or expected.
For review-only or partial work, state the validation scope and any runtime or render checks not performed.
