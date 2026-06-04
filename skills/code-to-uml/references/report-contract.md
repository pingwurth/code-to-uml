# Report Contract

Use this reference whenever planning, generating, or validating Code-To-UML report content.

## Table of Contents

- [Contract Goals](#contract-goals)
- [Category Model](#category-model)
- [Section Catalog](#section-catalog)
- [Scope Applicability](#scope-applicability)
- [Responsibility Boundaries](#responsibility-boundaries)
- [Scope-Specific Depth](#scope-specific-depth)
- [Analysis Playbook](#analysis-playbook)
- [Evidence and Quality Bar](#evidence-and-quality-bar)
- [Validation Checklist](#validation-checklist)
- [Maintenance Rules](#maintenance-rules)
- [Final Response Shape](#final-response-shape)

## Contract Goals

- Keep one consistent report model across project, module/package, file, class, and function scopes.
- Measure report coverage by stable section IDs, not by tab labels or physical `.ctu` filenames.
- Keep the HTML template data-driven: report cards, diagrams, descriptions, and details belong in `.ctu` files.
- Let the reader understand the target from text alone; diagrams reduce cognitive load but never replace explanation.

## Category Model

Use category-based `.ctu` files named `{category}--{n}_{lang}.ctu`.

- The language suffix must match the user's question language unless the user requested another report language. Use `_zh` for Chinese requests and `_en` for English requests.
- Each `{category}` must match a tab button's `data-diagram` value and its `data-diagram-overview` entry.
- The categories below are the canonical default for a full Code-To-UML source analysis report.
- The template may use other category names when the user or target shape requires module-, method-, or principle-specific tabs. When using custom categories, still map every required section ID to a category and verify tab/data alignment.

Canonical full-report categories:

- `overview`
- `structure`
- `objects`
- `architecture`
- `flow`
- `calls`
- `dataflow`
- `code`
- `principles`
- `guide`

### Category Ownership

Each standard category owns the primary content for these section IDs:

| Category | Owns | Notes |
| --- | --- | --- |
| `overview` | `S01_TARGET_OVERVIEW` | May include a short `S13_MAINTAINER_REFERENCE` summary, but the full reference belongs in `guide`. |
| `structure` | `S02_TOP_LEVEL_STRUCTURE` | Covers imports, constants, files, classes/functions, and entry logic. |
| `objects` | `S03_CORE_OBJECTS` | Local per-object responsibilities and call interfaces. |
| `architecture` | `S04_ARCHITECTURE` | Global architecture and dependency boundaries. |
| `flow` | `S05_CORE_FLOW` | Main execution flow, branches, and error paths. |
| `calls` | `S06_CALL_RELATIONSHIPS` | End-to-end call traces across meaningful boundaries. |
| `dataflow` | `S07_DATA_OR_STATE_FLOW` | Data movement, state ownership, lifecycle, or FSM behavior. |
| `code` | `S08_CODE_SNIPPETS` | Focused source excerpts with analysis, not source dumping. |
| `principles` | `S09_CORE_PRINCIPLES`, `S11_RISKS_AND_IMPROVEMENTS` | Design ideas, mechanisms, tradeoffs, risks, and specific improvements. |
| `guide` | `S10_ONBOARDING_GUIDE`, `S12_REVIEWER_QUESTIONS`, `S13_MAINTAINER_REFERENCE` | Practical reading/debugging paths, learning review Q&A, and symbol/file index. |

## Section Catalog

Use stable section IDs in planning notes, validation, and summaries. Display titles may be localized or adapted. Match display titles to the report language; for Chinese reports, prefer the Chinese titles below.

| ID | Default title | Chinese title | Required content |
| --- | --- | --- | --- |
| `S01_TARGET_OVERVIEW` | Target Overview | 文件/目标概览 | Purpose, role in project, problem solved, scope boundaries, source version, and evidence baseline. |
| `S02_TOP_LEVEL_STRUCTURE` | Top-Level Structure | 顶层结构 | Imports/dependencies, constants/config, files/modules, classes/functions, entry logic, and import-time side effects when relevant. |
| `S03_CORE_OBJECTS` | Core Objects and Functions | 核心对象/函数说明 | Key classes/functions/methods, responsibilities, parameters, returns, side effects, invariants, and local "who I call / who calls me" summaries. |
| `S04_ARCHITECTURE` | Architecture Diagram | 整体架构图 | Major modules, objects, layers, runtime/deployment assumptions, and dependency direction. |
| `S05_CORE_FLOW` | Core Flow Diagram | 核心流程图 | Main execution path, important branches, failure/error paths, retries, and fallback behavior. |
| `S06_CALL_RELATIONSHIPS` | Call Relationship Diagram | 调用关系图 | Complete trace paths across module/service/object boundaries; not a duplicate of `S03` local call notes. |
| `S07_DATA_OR_STATE_FLOW` | Data or State Flow Diagram | 数据流/状态流图 | Inputs, transformations, persistence, outputs, state ownership, lifecycle transitions, or FSM/workflow states. |
| `S08_CODE_SNIPPETS` | Key Code Snippet Analysis | 关键代码片段解析 | Short snippets with problem solved, design intent, edge cases, and usage cautions. Prefer snippets under 30 lines. |
| `S09_CORE_PRINCIPLES` | Core Principles | 核心原理说明 | Runtime mechanisms, patterns, design tradeoffs, and why the implementation is shaped this way. |
| `S10_ONBOARDING_GUIDE` | Developer Onboarding Guide | 开发上手指南 | Reading order, run/debug steps, manual verification, extension points, and troubleshooting paths. |
| `S11_RISKS_AND_IMPROVEMENTS` | Risks and Improvement Suggestions | 风险与改进建议 | Specific complexity, concurrency, security, performance, correctness, maintainability risks, and actionable improvements. |
| `S12_REVIEWER_QUESTIONS` | Learning Review Questions with Answers | Q&A / 复盘问答清单 | Learning-oriented review questions and concrete answers about the analyzed project, module/package, file, class, or function, grounded in source evidence and written to help readers consolidate what they learned. |
| `S13_MAINTAINER_REFERENCE` | Maintainer Quick Reference | 维护者速查表 | Markdown table index of functions/classes/files with line numbers or symbol references whenever available. |

## Scope Applicability

Use the same section catalog for every target. Scope changes required depth and merge behavior.

Legend:

- `R`: required standalone section coverage in its owning category or an equivalent custom category.
- `M`: required coverage, but may be merged into the nearest owning section/category when standalone content would be thin.
- `O`: optional; include only when it materially improves understanding.

| Section ID | Project | Module/package | File | Class | Function |
| --- | --- | --- | --- | --- | --- |
| `S01_TARGET_OVERVIEW` | R | R | R | R | R |
| `S02_TOP_LEVEL_STRUCTURE` | R | R | R | M | M |
| `S03_CORE_OBJECTS` | R | R | R | R | R |
| `S04_ARCHITECTURE` | R | R | M | O | O |
| `S05_CORE_FLOW` | R | R | R | R | R |
| `S06_CALL_RELATIONSHIPS` | R | R | M | M | M |
| `S07_DATA_OR_STATE_FLOW` | R | R | M | M | M |
| `S08_CODE_SNIPPETS` | R | R | R | R | R |
| `S09_CORE_PRINCIPLES` | R | R | R | R | R |
| `S10_ONBOARDING_GUIDE` | R | R | R | M | M |
| `S11_RISKS_AND_IMPROVEMENTS` | R | R | R | R | R |
| `S12_REVIEWER_QUESTIONS` | R | R | M | M | M |
| `S13_MAINTAINER_REFERENCE` | R | R | R | M | M |

Merge rule: if an `M` section would produce no more than two useful sentences or one trivial diagram, merge it into the nearest owning section rather than creating a shallow tab/card. Still mention the section ID in the final section summary.

## Responsibility Boundaries

- `S03_CORE_OBJECTS` is a local view. It explains each important object's responsibility, interface, side effects, and immediate callers/callees in text.
- `S06_CALL_RELATIONSHIPS` is a global trace view. It shows complete call paths across meaningful boundaries as sequence, component, or call-chain diagrams.
- `S09_CORE_PRINCIPLES` explains why the design works the way it does.
- `S11_RISKS_AND_IMPROVEMENTS` explains where the design can fail and what should be changed.
- `S12_REVIEWER_QUESTIONS` is a learning review Q&A, not a code-review checklist or generic FAQ. For the current analysis scope (project, module/package, file, class, or function), ask consolidation questions about purpose, structure, execution flow, design decisions, risks, debugging paths, and extension boundaries. Every question must include a concrete answer backed by source evidence or explicitly marked inference.
- `S13_MAINTAINER_REFERENCE` is an index, not prose. It must be a Markdown table, not paragraphs or a bullet list. Recommended columns: `Name`, `Kind`, `Location`, `Purpose`, `Notes`. Keep rows dense and include line numbers or symbol references whenever available.

## Scope-Specific Depth

- **Project**: include architecture layers, entrypoints, major subsystems, deployment/runtime assumptions, cross-module dependencies, operational constraints, and one core user/runtime path.
- **Module/package**: include public API, internal files, dependency direction, state ownership, extension points, and mismatches between likely intended design and actual implementation.
- **File**: include top-level layout, contained classes/functions, globals, import-time side effects, primary runtime path, exceptional paths, and performance-sensitive paths.
- **Class**: include constructor/state, public methods, invariants, lifecycle, collaborators, subclass/consumer risks, and state transitions.
- **Function**: include signature, preconditions, algorithm, branches, exceptions/errors, side effects, callers/callees, and examples of correct/incorrect use.

## Analysis Playbook

- Use a five-layer progression when the target is non-trivial: system map -> flow walkthrough -> design decisions -> pattern recognition -> pitfalls and boundaries.
- Let output needs drive analysis depth: every paragraph should answer a concrete reader question.
- Favor fewer precise sections over long generic prose.
- Explain side effects and failure paths, not only the happy path.
- For onboarding guidance, prefer verifiable action steps before abstract explanation:
  - onboarding: map the system -> run it -> find the relevant module -> avoid known pitfalls
  - daily development: follow the flow -> identify impact scope -> check local conventions
  - troubleshooting: runbook -> call chain -> state/data checks

## Evidence and Quality Bar

- Be concrete: mention real function/class names, files, directories, constants, state files, environment variables, routes, commands, or line numbers from the target.
- Generated HTML and `.ctu` files must be valid UTF-8. If a report contains Chinese mojibake or Unicode replacement characters, treat it as a blocking artifact error and regenerate or re-save with explicit UTF-8 encoding.
- Tie architecture claims, risk claims, and call/data-flow claims back to observed source evidence. If a conclusion is inferred rather than directly visible, say so.
- Be proportional: broad targets get more architectural synthesis; narrow targets get deeper branch/call/side-effect analysis.
- Prefer code snippets under 30 lines; surround snippets with explanation.
- Avoid marketing prose, generic compliments, and vague "can be optimized" statements. Name the specific risk and the specific improvement.
- Text must cover the core information even if the reader skips every diagram.
- The page introduction `<p data-markdown>` must be a concise whole-report overview, not a category overview. Keep it within 500 Chinese characters or a similarly concise English length, and cover implemented functionality, basic framework, core principles, and design philosophy using Markdown layout when helpful. Do not hard-wrap prose by length; in prose, start a new line only after `。`, `；`, `.`, or `;`.
- Use content-driven line breaks in `[Description]` and `[Detail]`. Short content may stay on one line. Do not hard-wrap prose by character count or visual line length; in prose, start a new line only after sentence-ending punctuation (`。`, `；`, `.`, or `;`). Lists, steps, caveats, comparisons, and tables may use one line per item or row.
- Organize `[Description]` and `[Detail]` with Markdown structures that match the content: paragraphs, bullet lists, numbered steps, indentation, and Markdown tables. Use lists for peer items, numbered steps for ordered workflows, indentation for nested context, and tables for comparison, indexes, or dense reference data.
- The maintainer reference table must use Markdown table syntax and include line numbers or symbol locations whenever available.

## Validation Checklist

### Content Validation

Before creating or finalizing report artifacts, verify:

- [ ] Target source read-only constraint respected.
- [ ] Scope identified as project, module/package, file, class, or function.
- [ ] Required section IDs are covered according to the scope applicability matrix.
- [ ] Merged sections are intentionally merged and still mentioned in the section summary.
- [ ] `S12_REVIEWER_QUESTIONS` includes answers for every learning review question and ties them to the analyzed target scope.
- [ ] `S13_MAINTAINER_REFERENCE` is written as a Markdown table, not prose or bullets.
- [ ] Page introduction `<p data-markdown>` gives a <= 500-character whole-report overview covering functionality, framework, core principles, and design philosophy.
- [ ] `[Description]` and `[Detail]` use appropriate Markdown layout such as paragraphs, lists, indentation, or tables rather than unstructured prose.
- [ ] Every architecture, risk, call-flow, and data-flow claim is backed by source evidence or marked as inference.
- [ ] Code snippets are focused, explained, and not pasted as long unexplained source blocks.

### Artifact Validation

Before runtime checks, verify:

- [ ] HTML output exists at the requested path.
- [ ] HTML and `.ctu` files are valid UTF-8 and contain no mojibake/replacement characters from wrong decoding.
- [ ] Data directory exists.
- [ ] `.ctu` filenames match `{category}--{n}_{lang}.ctu`.
- [ ] Categories match tab `data-diagram` values and `data-diagram-overview` values.
- [ ] `.ctu` syntax follows the template.
- [ ] Topbar links are intentionally preserved, adapted, or removed.
- [ ] `node <skill-dir>/scripts/validate-report.js --root <CTU_HOME> --html cache/<report-file>.html --lang <zh|en> --strict` returns zero errors and zero warnings.

### Runtime Validation

Before final response, verify:

- [ ] Every UML block passed static checks.
- [ ] PlantUML render check passed through `node <skill-dir>/scripts/validate-report.js --strict --render`, or limitation stated.
- [ ] Server running and page/API loads at `http://localhost:<PORT>/...`.
- [ ] Data API returns all expected category keys and card counts.
- [ ] Browser URL is included in the final response.

## Maintenance Rules

- Tag each report with the source code version: commit hash when available, otherwise generation date.
- Regenerate after major source changes such as architecture restructuring or core module refactoring.
- Treat pitfalls, troubleshooting, risk sections, and maintainer references as living content.
- Prefer removing stale content over keeping it with a disclaimer.
- Keep report updates in the same repository, PR, and review flow as the source code they explain.

## Final Response Shape

When the user does not specify a custom final format, report:

1. `HTML 文件路径`
2. `模板复用情况`
3. `多文件拆分决策`
4. `校验 / PlantUML 检查结果`
5. `报告章节摘要`
6. `浏览器访问地址`
