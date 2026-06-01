# Code-To-UML Template Notes

Use this reference only when the target output is a Code-To-UML report page or when `$CTU_HOME/cache/_TEMPLATE.html` and `$CTU_HOME/data/_TEMPLATE.ctu` exist.

## Root Resolution

Resolve the Code-To-UML project root as:

1. `CTU_HOME` environment variable.
2. Current working directory, only if it contains `cache/_TEMPLATE.html` and `data/_TEMPLATE.ctu`.
3. Otherwise stop and tell the user to run `node install-ctu-home.js` from the Code-To-UML project.

All paths below are relative to `$CTU_HOME`.

## Required Files

- HTML report: usually `$CTU_HOME/cache/<report-slug>.html`.
- Data directory: `$CTU_HOME/data/<report-slug>/`.
- Data files: `{category}--{n}_zh.ctu` or `{category}--{n}_en.ctu`.

The HTML should be a thin template-driven shell. The report cards, diagrams, descriptions, and details belong in `.ctu` files.

## HTML Runtime Contract

Preserve:

- `body class="demo-page"`.
- `main class="content"`.
- `nav class="demo-tabs"`.
- `button class="demo-tab"` with `data-diagram`.
- `h2 id="demo-title"`.
- `p class="demo-section-overview"` with matching `data-diagram-overview`.
- `div class="demo-examples" data-examples`.
- `aside data-demo-toc`.
- Required script order from the template.

When using a custom data directory, add `data-dir="<report-slug>"` to `<body>`. `demo.js` calls `/api/demo-examples?lang=<mode>&dir=<data-dir>`.

## Topbar Link Contract

The template’s `official-demo-link` is easy to mishandle. Always choose one of these states deliberately:

1. **Official PlantUML tutorial link**: preserve `id="official-demo-link"` and ensure the href/text are correct for the report page’s relative path. If existing pages use a dynamic language script, copy/adapt that script with correct `../` prefixes.
2. **Internal companion report link**: keep `class="demo-topbar-link"` but use a truthful id/href/text for that companion page. Do not leave `official-demo-link` if it no longer points to the official demo behavior.
3. **No extra link**: delete the entire `<a class="demo-topbar-link" ...>` element.

Do not keep a placeholder like “PlantUML Official Demo” or “返回 Demo” unless it is intentionally correct and verified.

## `.ctu` Contract

Each file starts with:

```text
Title: <section title>
Describe: <section overview>
------------------------------------------------------------
```

Each card uses:

```text
[Example]
<card title>

[Description]
<markdown description>

[UML]
@startuml
...
@enduml

[Detail]
<markdown detail>
```

Use at least 60 hyphens as the separator. Write `None` only when a title/detail should be hidden.

## Verification

- Use port `5401` unless the user specified another port.
- Start the server from `$CTU_HOME` and leave it running. The scripts contain the port cleanup logic and kill only the process bound to the selected port:
  - macOS/Linux: `"$CTU_HOME/serve.sh" "$PORT"`
  - Windows: `"%CTU_HOME%\serve.bat" "%PORT%"`
- `curl /api/demo-examples?lang=zh&dir=<report-slug>` should return all category keys expected by the tabs.
- The total card count should match the generated `.ctu` blocks.
- If `$CTU_HOME/plantuml.jar` exists, batch-render extracted UML blocks with `java -jar "$CTU_HOME/plantuml.jar" -tsvg`.
- Verify the report HTML route returns HTTP 200 under the local server.
- Verify topbar link behavior after changing language if i18n scripts are present.
- Tell the user the browser URL: `http://localhost:<PORT>/cache/<report-slug>.html`.

## Port Cleanup Location

Do not repeat port cleanup in generated report workflows. Keep that behavior in `$CTU_HOME/serve.sh` and `$CTU_HOME/serve.bat` so every caller gets the same startup semantics.
