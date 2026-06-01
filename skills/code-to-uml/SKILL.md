---
name: code-to-uml
description: Use when source code must be analyzed at project, module, file, class, or function scope to produce a detailed, consistent UML-backed HTML report from an existing report/template system, especially Code-To-UML .ctu reports.
---

# Code UML Report

## Purpose

Generate a developer-friendly source-code analysis report with a consistent final artifact for any scope: whole project, module/package, file, class, or single function. The output must combine UML diagrams, Chinese explanatory text, and focused code examples. Do not invent a new report shape when a project template exists.

## Hard Rules

- Treat the analyzed source as read-only unless the user explicitly asks for code changes.
- Resolve the Code-To-UML project root from `CTU_HOME` first. If `CTU_HOME` is unset, use the current working directory only when it contains `$PWD/cache/_TEMPLATE.html` and `$PWD/data/_TEMPLATE.ctu`; otherwise tell the user to run the project install script that sets `CTU_HOME`.
- If `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` exist, read both first and strictly reuse their structure, CSS/JS dependencies, data conventions, navigation rules, and UML rendering path.
- Preserve every template `[FIXED]` class/id/data attribute and script order. Only edit `[EDIT]` and `[CONFIG]` areas unless the template explicitly allows more.
- Explicitly handle template navigation links such as `official-demo-link`:
  - If the link is needed, preserve the correct `href`, text, target behavior, and any dynamic language/update script used by nearby existing pages.
  - If it is not needed, remove the whole `<a>` element rather than leaving a misleading placeholder.
  - Verify topbar links in the final checklist.
- If the template is data-driven, put report content in the matching data directory, not as ad hoc HTML blocks.
- Report body defaults to Chinese unless the user explicitly requests another language.
- The final product shape must be consistent across project/module/file/class/function analysis. Scope changes depth and examples, not the section contract.
- Do not split into multiple HTML files unless the target contains more than 3 highly independent, complex core classes or subsystems. If splitting, update all topbar/page links.
- After generating a Code-To-UML report, start the Code-To-UML server from `$CTU_HOME` with `$CTU_HOME/serve.sh` on macOS/Linux or `$CTU_HOME/serve.bat` on Windows. These scripts own port cleanup: if the chosen port is occupied, they kill the process using that port before starting the server. Do not add `$CTU_HOME` to `PATH`.
- The final response must include the browser URL for the generated report.
- Do not claim completion without fresh verification evidence.

## Workflow

1. **Resolve scope and constraints**
   - Identify target type: project, module/package, file, class, or function.
   - Record target path/symbol, requested output path, report language, read-only constraints, and template requirements.
   - Resolve `CTU_HOME` and use it as the report project root.
   - If output path is not specified, use `$CTU_HOME/cache/<target-slug>_analysis.html`.

2. **Read project instructions and template**
   - Read local instructions such as `AGENTS.md`, `CLAUDE.md`, or project docs.
   - Read `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` when present.
   - For the Code-To-UML frontend template, also read `references/code-to-uml-template.md` in this skill.
   - Inspect one nearby existing generated page if the template has runtime behavior not fully described in comments. Pay special attention to topbar links, `data-dir`, i18n scripts, and demo API conventions.

3. **Analyze code structurally**
   - Prefer CodeGraph/MCP structural tools when available for definitions, callers, callees, signatures, and impact.
   - Use `rg`/file reads for literal text, comments, config, and exact source snippets.
   - For project/module scope, map subsystems, entry points, dependency boundaries, data stores, and runtime processes.
   - For file/class/function scope, map local responsibilities, parameters, return values, side effects, callers/callees, state transitions, error paths, and extension points.

4. **Normalize the report plan**
   - Always produce the mandatory section set below.
   - For narrow scopes, adapt section names without removing them. Example: “顶层结构” for a function becomes imports/enclosing class/local helper/call context.
   - Use diagrams to explain relationships, not to decorate. Every UML block must have a Chinese explanation.

5. **Generate data files**
   - For Code-To-UML templates, create `$CTU_HOME/data/<report-slug>/`.
   - Use category-based `.ctu` files named `{category}--{n}_zh.ctu`.
   - Keep categories stable:
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
   - Each `.ctu` file must follow `$CTU_HOME/data/_TEMPLATE.ctu`: `Title`, `Describe`, separator, `[Example]`, `[Description]`, `[UML]`, `[Detail]`.

6. **Generate HTML**
   - Copy the template structure into the requested output HTML under `$CTU_HOME/cache/` unless the user gave an explicit path.
   - Set `body data-dir="<report-slug>"` if the runtime loads `.ctu` files by directory.
   - Configure tab buttons and matching `data-diagram-overview` elements exactly for the categories used.
   - Preserve required scripts and relative paths for the output directory.
   - Handle `official-demo-link` or equivalent topbar links explicitly as described in Hard Rules.

7. **UML self-check**
   - Extract every `[UML]` block.
   - Check `@start...`/`@end...`, balanced `{}` and `()`, declared participants/classes where needed, valid arrows, and unescaped special characters.
   - If PlantUML is available, render all diagrams with the local renderer/JAR and require zero render errors.
   - If PlantUML is unavailable, state that only static checks were performed and identify the render risk.

8. **Start server and verify page/API**
   - Use port `5401` unless the user specified another port.
   - Let `serve.sh`/`serve.bat` perform port cleanup; do not duplicate port-kill logic in the report-generation workflow.
   - On macOS/Linux, start with `"$CTU_HOME/serve.sh" "$PORT"` from `$CTU_HOME`.
   - On Windows, start with `"%CTU_HOME%\serve.bat" "%PORT%"` from `%CTU_HOME%`.
   - Keep the server running for the user when the task is complete.
   - Verify the report URL returns HTTP 200. The browser URL is `http://localhost:<PORT>/cache/<report-file>.html`.
   - Verify the data API or loader returns all expected categories and card counts.
   - Verify topbar/navigation behavior, including `official-demo-link` handling.
   - Verify the analyzed source file(s) were not modified when the task is read-only.

## Mandatory Report Sections

Every report must include these sections, even for a single function:

1. **文件/目标概览**: purpose, role in project, problem solved, scope boundaries.
2. **顶层结构**: imports/dependencies, constants/config, classes/functions, entry logic. For function scope, include enclosing module/class and local control structure.
3. **核心对象/函数说明**: key classes/functions/methods with responsibility, parameters, return values, side effects, and call relations.
4. **整体架构图**: PlantUML component/package/class diagram showing major modules/objects/dependencies.
5. **核心流程图**: PlantUML activity/state diagram showing main execution flow, branches, and error paths.
6. **调用关系图**: PlantUML sequence/component diagram showing important caller/callee chains.
7. **数据流/状态流图**: inputs, transformations, state mutation, persistence, outputs.
8. **关键代码片段解析**: short, focused snippets only; explain problem solved, design intent, and usage cautions. Never paste long source blocks without explanation.
9. **核心原理说明**: design ideas, runtime mechanism, patterns, and tradeoffs.
10. **开发上手指南**: reading order, debugging tips, test/manual verification, extension points.
11. **风险与改进建议**: complexity, possible bugs, maintainability risks, refactoring suggestions.
12. **Q&A / 复盘问答清单**: concrete questions that test understanding.
13. **维护者速查表**: function/class/file index with line numbers or symbol references.

## Scope-Specific Depth

Use the same sections for every target, but adjust evidence:

- **Project**: include architecture layers, entrypoints, major subsystems, deployment/runtime assumptions, cross-module dependencies, and onboarding path.
- **Module/package**: include public API, internal files, dependency direction, state ownership, and module extension points.
- **File**: include top-level layout, contained classes/functions, globals, side effects at import time, and primary runtime path.
- **Class**: include constructor/state, public methods, invariants, lifecycle, collaborators, and subclass/consumer risks.
- **Function**: include signature, preconditions, algorithm, branches, exceptions/errors, side effects, callers/callees, and examples of correct/incorrect use.

## UML Standards

- Use PlantUML syntax only inside `[UML]`.
- Prefer diagram types by purpose:
  - Component/package: architecture.
  - Activity: execution flow.
  - Sequence: call chain.
  - State: lifecycle/status transitions.
  - Class/object: data structures and ownership.
  - Mindmap/WBS: overview, Q&A, or reading path.
- Keep node labels readable and in Chinese when possible.
- Avoid raw `<` and `>` in UML labels unless required and safely escaped.
- Avoid ambiguous activity `continue` statements; use explicit actions such as `:回到下一轮循环;`.
- Every diagram’s `[Detail]` must explain nodes, arrows, and why the diagram matters.

## Content Quality Bar

- Be concrete: mention real function/class names, files, directories, constants, state files, environment variables, routes, or commands from the target.
- Be proportional: broad targets get more architectural synthesis; narrow targets get deeper branch/call/side-effect analysis.
- Explain side effects and failure paths, not only the happy path.
- Include line numbers or symbol locations in the maintenance index when available.
- Prefer concise code snippets under 30 lines each; surround snippets with explanation.
- Avoid marketing prose, generic compliments, or vague “可优化” statements. Name the specific risk and the specific improvement.

## Verification Checklist

Before final response, verify:

- Target source read-only constraint respected.
- HTML output exists at the requested path.
- Data directory exists and categories match tab `data-diagram` values.
- `.ctu` syntax follows the template.
- Mandatory 13 sections are all present.
- Every UML block passed static checks.
- PlantUML render check passed, or limitation is explicitly stated.
- Topbar links, especially `official-demo-link`, were intentionally preserved/adapted/removed and verified.
- `$CTU_HOME/serve.sh` or `$CTU_HOME/serve.bat` is running; the script handled any process that occupied the chosen port.
- Local page/API loads through `http://localhost:<PORT>/...`.
- Final response includes the browser URL.
- Final response uses the user’s requested concise status format when provided.

## Final Response Shape

When the user does not specify a custom final format, report:

1. `HTML 文件路径`
2. `模板复用情况`
3. `多文件拆分情况`
4. `PlantUML 检查结果`
5. `报告章节摘要`
6. `浏览器访问地址`
