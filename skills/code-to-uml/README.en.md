# code-to-uml Invocation Examples

中文版：[README.md](README.md)

Use this skill to generate, update, repair, validate, or review Code-To-UML `.ctu` / HTML source-analysis reports for any code repository.
When invoking it, state the target, scope, report mode, language, and output path explicitly so the model does not confuse a compact report with a full report or a general UML explanation.

## Quick Template

```text
Use $code-to-uml to analyze <target path or symbol> with scope <project|module|file|class|function>.
Generate a <compact|full> Code-To-UML report in <English|Chinese>, and write it to <CTU_HOME/cache/...html>.
Treat source code as read-only; reuse the Code-To-UML template; run the validator for the selected mode; return the browser URL when applicable.
```

## Examples

### 1. Generate a Full Project Report

```text
Use $code-to-uml to analyze the current repository with scope project.
Generate a full English Code-To-UML report at cache/current-project-analysis.html.
Cover major subsystems, entry points, architecture boundaries, core flows, call relationships, data/state flow, risks, and the maintainer reference.
Treat source code as read-only; run the --mode full validator; if plantuml.jar and Java are available, also run --render; return the browser URL.
```

### 2. Generate a Full Module Report

```text
Use $code-to-uml to analyze the src/auth/ module with scope module.
Generate a full English Code-To-UML report at cache/auth-module-analysis.html.
Focus on the public API, internal file structure, dependency direction, state ownership, error paths, and extension points.
Treat source code as read-only; reuse the template; after validation passes, return the HTML path, validation result, and browser URL.
```

### 3. Generate a Compact File Report

```text
Use $code-to-uml to analyze src/utils/normalize.ts with scope file.
Generate a compact English Code-To-UML report at cache/normalize-file-analysis.html.
If architecture, call, or state-flow content is thin, merge it into nearby cards and explain why; do not pad content just to satisfy Section-ID markers.
Run the --mode compact validator and return the result.
```

### 4. Generate a Compact Function Report

```text
Use $code-to-uml to analyze the parseUserInput function with scope function.
Generate a compact English report at cache/parse-user-input-analysis.html.
Focus on signature, preconditions, branches, exceptions, return value, callers/callees, boundary usage, and risks.
Write UML only when it reduces reader effort; use tables or text for simple relationships.
```

### 5. Update an Existing Report

```text
Use $code-to-uml to update the report behind cache/payment-flow-analysis.html.
The source target is src/payment/ with scope module.
Preserve content that is still true, and refresh only stale flows, call relationships, risks, and maintainer reference content.
Keep existing tabs, data-dir, Section-ID markers, and .ctu filenames aligned; validate again with --mode full or --mode compact according to the report's original intent.
```

### 6. Repair a Validation or Rendering Failure

```text
Use $code-to-uml to repair the validation failure in cache/order-state-analysis.html.
First reproduce this command:
node skills/code-to-uml/scripts/validate-report.js --root . --html cache/order-state-analysis.html --lang en --scope module --complexity medium --mode full --strict --render

Then modify only the HTML, .ctu, or validator-related surface that causes the failure.
After the fix, rerun the same command and explain exactly what was repaired.
```

### 7. Review a Report or the Skill Itself

```text
Use $code-to-uml in review-only mode to inspect skills/code-to-uml/.
Evaluate skill discoverability, mode selection, reference loading, report contract, validator capability boundaries, fixture coverage, and context cost.
Do not generate HTML and do not start a server; return severity-ordered findings and improvement suggestions only.
```

## Validate the Fixture Directly

After changing the validator or report contract, run the fixture matrix first:

```bash
node skills/code-to-uml/scripts/validate-fixtures.js
```

You can also run the minimal compact report fixture directly:

```bash
node skills/code-to-uml/scripts/validate-report.js \
  --root skills/code-to-uml/fixtures/minimal \
  --html cache/minimal-function.html \
  --lang en \
  --scope function \
  --complexity low \
  --mode compact \
  --strict
```
