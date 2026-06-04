# Code-To-UML Template Notes

Use this reference when the output must be a Code-To-UML report page, especially when `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` exist.

This file owns only the HTML, `.ctu`, and runtime loading contract. For content coverage, diagram choice, and UML rules, use:

- `report-contract.md`: category model, 13 section IDs, scope depth, validation.
- `diagram-decision-table.md`: when to use diagrams and which type to choose.
- `uml-standards.md`: PlantUML syntax and detail-writing rules.

## Table of Contents

- [Quick Checklist](#quick-checklist)
- [Root Resolution](#root-resolution)
- [Artifact and Naming Contract](#artifact-and-naming-contract)
- [Category Contract](#category-contract)
- [HTML Runtime Contract](#html-runtime-contract)
- [Topbar Link Contract](#topbar-link-contract)
- [`.ctu` Contract](#ctu-contract)
- [Runtime API Contract](#runtime-api-contract)
- [Verification](#verification)
- [Port Cleanup Location](#port-cleanup-location)

## Quick Checklist

- Resolve `$CTU_HOME`; all paths below are relative to it.
- Put HTML in `cache/<report-slug>.html` and content in `data/<report-slug>/{category}--{n}_{lang}.ctu`.
- Save HTML and `.ctu` files as valid UTF-8. On Windows, avoid shell-default ANSI/GBK writes; use explicit UTF-8 encoding.
- Use ASCII `report-slug` and `category` values: `a-z`, `0-9`, `_`, `-`.
- Set `<body class="demo-page" data-dir="<report-slug>">` for custom report data.
- Keep required selectors, script order, tabs, overviews, `.ctu` prefixes, and API keys aligned.
- Use `None` only to mean "empty/hidden"; `[UML]` may be `None` for text-only cards. Handle `official-demo-link` deliberately.
- Put `Section-ID: Sxx_...` markers in generated `.ctu` card Markdown so content validation can verify required report coverage.
- Choose `--mode <compact|full>` and `--complexity <low|medium|high>` from `report-contract.md`, then run `scripts/validate-report.js --strict --mode <mode> --complexity <level>`.
- Verify page route, API payload, card counts, topbar behavior, and UML rendering.

## Root Resolution

Resolve the Code-To-UML project root as:

1. `CTU_HOME` environment variable.
2. A user-provided Code-To-UML project root path, when the request gives one.
3. Current working directory, only if it contains `cache/_TEMPLATE.html` and `data/_TEMPLATE.ctu`.
4. Otherwise stop and tell the user to run `node install-ctu-home.js` from the Code-To-UML project.

## Artifact and Naming Contract

The HTML should be a thin data-driven shell. Report cards, diagrams, descriptions, and details belong in `.ctu` files.

- HTML report: `cache/<report-slug>.html`.
- Data directory: `data/<report-slug>/`.
- Data files: `{category}--{n}_{lang}.ctu`, for example `overview--1_zh.ctu`.
- Supported language suffixes: `_zh` and `_en`; the default language suffix follows the user's question language unless requested otherwise.
- `report-slug` and `category`: lowercase kebab-case is recommended.
- `n`: positive integer used for sorting.

Do not use slashes, dots, spaces, or non-ASCII characters in `report-slug` or `category`. The server sanitizes `dir` by removing characters outside `[a-zA-Z0-9_-]`, so invalid names can silently load the wrong directory.

## Category Contract

For a full Code-To-UML source analysis report, use the canonical categories from `report-contract.md`:

```text
overview, structure, objects, architecture, flow, calls, dataflow, code, principles, guide
```

These 10 categories are UI/data groupings, not the full content contract. The 13 section IDs and canonical mapping live in `report-contract.md`; notably, `principles` carries risks/improvements, and `guide` carries Q&A plus maintainer reference content.

Custom categories are allowed, but every required section ID must still map to a category and every category must align across tabs, overviews, filenames, and API keys.

## HTML Runtime Contract

Preserve the template's fixed structure and script order. These selectors are runtime dependencies:

- `body class="demo-page"`.
- `main class="content"`.
- `section.intro > p[data-markdown]` for the report-level Markdown overview.
- `nav class="demo-tabs"`.
- `button class="demo-tab"` with `data-diagram`.
- `h2 id="demo-title"`.
- `p class="demo-section-overview"` with matching `data-diagram-overview`.
- `div class="demo-examples" data-examples`.
- `aside data-demo-toc`.
- Required script order from the template.

When using custom data, add `data-dir="<report-slug>"` to `<body>`. `demo.js` calls `/api/demo-examples?lang=<mode>&dir=<data-dir>`.

Alignment rules:

- Exactly one `.demo-tab` should start with `is-active`.
- Every `button[data-diagram]` must have one matching `p[data-diagram-overview]`.
- Every expected API category key must have one matching `button[data-diagram]`.
- Remove tabs whose `.ctu` data does not exist.

Page introduction rules:

- Replace the template `<h1>` with the analyzed target title.
- Replace `section.intro > p[data-markdown]` with a whole-report Markdown overview block, not a tab/category overview.
- Keep the overview within 500 Chinese characters or a similarly concise English length.
- The overview must make the target immediately understandable: implemented functionality, basic framework, core principles, working mechanism, and design philosophy.
- Choose the Markdown layout from the content: use 2-3 short paragraphs for a simple target, bullets for parallel modules/capabilities/phases, numbered steps for working mechanisms, and a compact table for dense "dimension -> summary" information.
- Do not compress functionality, framework, core principles, working mechanism, and design philosophy into one long sentence. Split by semantic role when multiple roles are present.
- Prose must not be hard-wrapped by character count or visual line length. In prose, start a new line only after sentence-ending punctuation (`。`, `；`, `.`, or `;`). Lists, numbered steps, and tables may use one line per item/step/row.
- Prefer labels such as `核心原理` and `工作机制` when they help readers scan the overview, especially for project, module, framework, or complex file reports.

Good intro patterns:

```markdown
该报告分析 `serve.js` 的本地报告服务，它同时承担静态文件托管、`.ctu` 解析和 PlantUML 后端渲染兜底。

- 核心原理：把文件系统中的报告数据规范化为浏览器可消费的 JSON。
- 工作机制：前端请求 `/api/demo-examples` 获取分类卡片，请求 `/api/plantuml-svg` 时调用 `plantuml.jar` 生成 SVG。
- 设计取向：服务端只做轻量解析和渲染兜底，主要交互仍留在浏览器端完成。
```

```markdown
该报告分析 `demo.js` 驱动的 Code-To-UML 前端运行层，重点覆盖数据加载、Markdown 渲染、PlantUML 预览和交互状态同步。

| 维度 | 概述 |
|---|---|
| 核心原理 | 以 `.ctu` 数据为源，通过统一 API 转成分类卡片，再由前端组件渲染。 |
| 工作机制 | 页面初始化后读取语言和目录参数，加载分类数据，绑定 tab、TOC、渲染和复制操作。 |
| 设计取向 | HTML 保持薄壳，内容沉入数据文件，运行时逻辑集中在组件和 `demo.js`。 |
```

Path rules:

- Reports under `cache/` usually need `../favicon.svg`, `../main.css`, `../demo.js`, and `../js` or `../component` script paths.
- A root-level page such as `demo.html` uses paths without `../`.
- If custom scripts are necessary, append them after `demo.js` unless the template explicitly says otherwise.
- Do not save generated HTML with Windows ANSI/GBK encoding while declaring `<meta charset="utf-8">`; browsers will render Chinese as mojibake. The validator rejects non-UTF-8 files.

## Topbar Link Contract

Choose one state deliberately:

- Official PlantUML tutorial link: preserve `id="official-demo-link"` and verify `href`, text, target behavior, relative path, and language-update script.
- Internal companion report link: keep `class="demo-topbar-link"` but use a truthful id, href, and text; do not leave `official-demo-link`.
- No extra link: delete the whole `<a class="demo-topbar-link" ...>` element.

Do not keep placeholder text like "PlantUML Official Demo" or "Back to Demo".

## `.ctu` Contract

Each `.ctu` file starts with:

```text
Title: <section title>
Describe: <section overview>
------------------------------------------------------------
```

Each card uses:

```text
[Example]
<card title or None>

[Description]
<markdown description or None>

[UML]
@startuml
...
@enduml

[Detail]
<markdown detail or None>
```

Generated cards should include their report-contract section ID in `[Description]` or `[Detail]`. Use an HTML comment when the marker should stay invisible in the rendered page:

```text
[Description]
<!-- Section-ID: S05_CORE_FLOW -->
This card explains the main runtime path and failure branches.
```

Merged cards may list multiple IDs:

```text
[Description]
<!-- Section-ID: S06_CALL_RELATIONSHIPS, S07_DATA_OR_STATE_FLOW -->
This card combines call and state movement because the target is a small function.
```

Do not use section markers as placeholders. If a compact report merges `S06_CALL_RELATIONSHIPS` into a flow card, that card still needs real caller/callee evidence or an explicit reason why no meaningful external call relationship exists.

Text-only cards are valid. Use `None` in `[UML]` when the card should not render a diagram:

```text
[Example]
Risk checklist

[Description]
Review risks that are clearer as text than as a diagram.
Use a second line to separate scope, evidence, or reader guidance.

[UML]
None

[Detail]
No diagram is rendered for this card.
The report content is carried by the description and detail text.
```

Parser behavior to respect:

- `Title:` and `Describe:` are read before the first separator; `Describe:` may span multiple lines.
- Separator lines must contain at least 60 hyphens; lines starting with `#` are ignored.
- Section markers are `[Example]`, `[Description]`, `[UML]`, and `[Detail]`.
- A field containing only `None` is normalized to empty. This applies to card title, description, UML source, detail, `Title:`, and `Describe:`.
- Empty `[UML]` or `[UML]` containing only `None` means the card is text-only and should not render a diagram.
- UML syntax validation applies only to non-empty `[UML]` content after `None` normalization.
- For generated report cards, every non-`None` `[Description]` and `[Detail]` must use Markdown text with content-driven line breaks. Short content may stay on one line. Do not hard-wrap prose by character count or visual line length; in prose, start a new line only after sentence-ending punctuation (`。`, `；`, `.`, or `;`). Lists, numbered steps, caveats, and tables may use one line per item or row.
- Organize `[Description]` and `[Detail]` with Markdown structures that match the content: paragraphs, bullet lists, numbered steps, indentation, and Markdown tables. Use lists for parallel points, numbered steps for ordered procedures, indentation for nested context, and tables for comparison or dense reference data.
- Generated files should still include separators between cards, even though the parser can split on a later `[Example]`.

If a card includes a diagram, `[Detail]` must explain the important nodes, arrows, relationships, and why the diagram matters.

## Runtime API Contract

`demo.js` loads report data through:

```text
GET http://localhost:<PORT>/api/demo-examples?lang=<zh|en>&dir=<report-slug>
```

Important response facts:

- Top-level keys are category names from `.ctu` filename prefixes before `--`.
- Items include fields such as `title`, `description`, `source`, `detail`, `sectionTitle`, `sectionDescription`, `hasUml`, and `*I18n` maps.
- Cards are sorted by `{n}` and then by card order inside each file.
- Missing requested language falls back between `_zh` and `_en` when possible.
- Generated reports should use exact category alignment even though the frontend normalizes some tab matching.

Minimal alignment example:

```text
body[data-dir="auth-module"]
button[data-diagram="overview"]
p[data-diagram-overview="overview"]
data/auth-module/overview--1_zh.ctu
API key: overview
```

## Verification

Use port `5401` unless the user specified another port.

First run the bundled artifact validator from the skill directory. Set `--lang` to the report language suffix selected from the user's question language:

```text
node <skill-dir>/scripts/validate-report.js --root <CTU_HOME> --html cache/<report-slug>.html --lang <zh|en> --scope <project|module|file|class|function> --complexity <low|medium|high> --mode <compact|full> --strict
```

Add `--render` when `plantuml.jar` exists in `<CTU_HOME>` and Java is available on `PATH`.

Start the server from `$CTU_HOME` and leave it running:

- macOS/Linux: `"$CTU_HOME/serve.sh" "$PORT"`
- Windows PowerShell: `Set-Location $env:CTU_HOME`, then `.\serve.bat 5401`
- Windows cmd.exe: `cd /d "%CTU_HOME%"`, then `serve.bat 5401`

Before claiming completion, verify:

- `scripts/validate-report.js --strict` returns zero errors and zero warnings.
- `http://localhost:<PORT>/cache/<report-slug>.html` returns HTTP 200.
- `http://localhost:<PORT>/api/demo-examples?lang=<zh|en>&dir=<report-slug>` returns all expected category keys for the report language.
- API category keys, `button[data-diagram]`, `p[data-diagram-overview]`, card counts, and `.ctu` blocks match.
- Every `.ctu` filename matches `{category}--{n}_{lang}.ctu` and uses UTF-8 marker syntax.
- Every non-empty UML block passes static checks; if `plantuml.jar` exists, extracted blocks render successfully. `[UML]` blocks normalized from `None` are text-only and are not sent to PlantUML.
- Topbar links are intentionally preserved, adapted, or removed and verified after language changes when i18n is present.
- The final response includes `http://localhost:<PORT>/cache/<report-slug>.html`.

## Port Cleanup Location

Do not repeat port cleanup in generated report workflows. Keep that behavior in `$CTU_HOME/serve.sh` and `$CTU_HOME/serve.bat` so every caller gets the same startup semantics.
