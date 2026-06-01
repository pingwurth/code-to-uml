# Diagram Examples

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [README_zh.md](file://README_zh.md)
- [demo.js](file://demo.js)
- [data/_TEMPLATE.ctu](file://data/_TEMPLATE.ctu)
- [data/demo/sequence--1_en.ctu](file://data/demo/sequence--1_en.ctu)
- [data/demo/class--1_en.ctu](file://data/demo/class--1_en.ctu)
- [data/demo/use-case--1_en.ctu](file://data/demo/use-case--1_en.ctu)
- [data/demo/regex--1_en.ctu](file://data/demo/regex--1_en.ctu)
- [data/demo/gantt--1_en.ctu](file://data/demo/gantt--1_en.ctu)
- [i18n/en.js](file://i18n/en.js)
- [i18n/zh.js](file://i18n/zh.js)
- [component/docs-page-core.js](file://component/docs-page-core.js)
- [plantuml-official-demo/en/sequence-diagram_en.html](file://plantuml-official-demo/en/sequence-diagram_en.html)
- [plantuml-official-demo/zh/sequence-diagram_zh.html](file://plantuml-official-demo/zh/sequence-diagram_zh.html)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes Code-To-UML’s extensive diagram example library. It explains how examples are categorized by UML and Non-UML types, how CTU files are named and organized, how bilingual examples work, and how the official PlantUML demo integrates with the built-in examples. It also provides practical guidance for adding and maintaining examples, and discusses how example complexity relates to rendering performance.

## Project Structure
The example library lives under the data/demo/ directory and is consumed by the interactive demo page. The demo page loads examples via an API endpoint, renders them using PlantUML (client or server), and supports bilingual display.

```mermaid
graph TB
subgraph "Demo UI"
A["demo.html"]
B["demo.js"]
end
subgraph "Core Runtime"
C["component/docs-page-core.js"]
end
subgraph "Data"
D["data/demo/*.ctu"]
E["data/_TEMPLATE.ctu"]
end
subgraph "Internationalization"
F["i18n/en.js"]
G["i18n/zh.js"]
end
subgraph "Official PlantUML Docs"
H["plantuml-official-demo/en/*.html"]
I["plantuml-official-demo/zh/*.html"]
end
A --> B
B --> C
B --> D
B --> F
B --> G
D --> E
H -. "Reference syntax & features" .-> A
I -. "Reference syntax & features" .-> A
```

**Diagram sources**
- [demo.js:146-185](file://demo.js#L146-L185)
- [README.md:166-198](file://README.md#L166-L198)
- [README_zh.md:166-198](file://README_zh.md#L166-L198)

**Section sources**
- [README.md:166-198](file://README.md#L166-L198)
- [README_zh.md:166-198](file://README_zh.md#L166-L198)

## Core Components
- Example data format: CTU files define one or more examples with metadata and PlantUML source blocks.
- Naming convention: {diagram-type}--{number}_{language}.ctu (e.g., sequence--1_en.ctu).
- Organization: data/demo/ holds all built-in examples grouped by diagram type and language.
- Bilingual support: Each diagram type typically includes both _en.ctu and _zh.ctu variants.
- API consumption: demo.js fetches examples from /api/demo-examples?lang=en|zh and renders them dynamically.

**Section sources**
- [README.md:135-163](file://README.md#L135-L163)
- [README_zh.md:135-163](file://README_zh.md#L135-L163)
- [demo.js:174-185](file://demo.js#L174-L185)
- [data/_TEMPLATE.ctu:1-46](file://data/_TEMPLATE.ctu#L1-L46)

## Architecture Overview
The demo page orchestrates loading, internationalization, and rendering of examples. It normalizes diagram keys, applies i18n labels, and renders PlantUML sources with robust error handling and fallback to server-side rendering when needed.

```mermaid
sequenceDiagram
participant U as "User"
participant P as "demo.html"
participant J as "demo.js"
participant C as "docs-page-core.js"
participant S as "Server"
U->>P : Open demo.html
P->>J : Initialize page
J->>J : Load active tab & language
J->>S : GET /api/demo-examples?lang={en|zh}
S-->>J : JSON examples
J->>J : Normalize diagram keys<br/>Apply i18n labels
loop For each example
J->>C : readExampleSource()
J->>C : renderWithFailureHandling()
alt Browser rendering fails
J->>S : POST /api/plantuml-svg (fallback)
S-->>J : SVG
end
end
J->>P : Render preview + actions
```

**Diagram sources**
- [demo.js:146-185](file://demo.js#L146-L185)
- [demo.js:374-439](file://demo.js#L374-L439)
- [component/docs-page-core.js:12-23](file://component/docs-page-core.js#L12-L23)

**Section sources**
- [demo.js:146-185](file://demo.js#L146-L185)
- [demo.js:374-439](file://demo.js#L374-L439)
- [README.md:237-274](file://README.md#L237-L274)

## Detailed Component Analysis

### UML Categories
- Sequence: Demonstrates message arrows and interaction styles.
- Use Case: Shows actor and use case notation.
- Class: Illustrates class elements, stereotypes, and visibility.
- Object: Visualizes object diagrams.
- Activity: Depicts activities and control flows.
- Component: Displays component relationships and ports.
- Deployment: Shows deployment diagrams with nodes and artifacts.
- State: Renders state transitions and regions.
- Timing: Illustrates lifelines and state state diagrams.

**Section sources**
- [README.md:57-63](file://README.md#L57-L63)
- [README_zh.md:57-63](file://README_zh.md#L57-L63)
- [data/demo/sequence--1_en.ctu:1-23](file://data/demo/sequence--1_en.ctu#L1-L23)
- [data/demo/use-case--1_en.ctu:1-21](file://data/demo/use-case--1_en.ctu#L1-L21)
- [data/demo/class--1_en.ctu:1-34](file://data/demo/class--1_en.ctu#L1-L34)

### Non-UML Categories
- Gantt: Timeline and task durations.
- MindMap: Hierarchical branching structures.
- WBS: Work breakdown structures.
- EBNF: Grammar notation.
- Regex: Regular expression diagrams.
- Network (nwdiag): Network diagrams.
- JSON: JSON schema-like structures.
- YAML: YAML-like structures.
- Archimate: ArchiMate diagrams.
- Salt (Wireframe): Wireframe diagrams.

**Section sources**
- [README.md:57-63](file://README.md#L57-L63)
- [README_zh.md:57-63](file://README_zh.md#L57-L63)
- [data/demo/gantt--1_en.ctu:1-23](file://data/demo/gantt--1_en.ctu#L1-L23)
- [data/demo/regex--1_en.ctu:1-17](file://data/demo/regex--1_en.ctu#L1-L17)

### CTU File Format and Template
CTU files contain:
- Title and optional group description.
- One or more [Example] blocks with:
  - Optional example title.
  - Optional Markdown description.
  - [UML] block with PlantUML source.
  - Optional [Detail] explanation.

The template defines the structure and recommended placeholders.

**Section sources**
- [data/_TEMPLATE.ctu:1-46](file://data/_TEMPLATE.ctu#L1-L46)

### Bilingual Examples and Labels
- Naming pattern ensures both English and Chinese variants coexist per diagram type.
- The demo normalizes diagram keys to match tabs and labels.
- i18n dictionaries provide labels for diagram types and UI strings.

```mermaid
flowchart TD
A["User switches language"] --> B["docs:langchange event"]
B --> C["demo.js refreshes examples"]
C --> D["Apply i18n labels from i18n/en.js or i18n/zh.js"]
D --> E["Render with localized titles/descriptions"]
```

**Diagram sources**
- [demo.js:131-144](file://demo.js#L131-L144)
- [demo.js:728-778](file://demo.js#L728-L778)
- [i18n/en.js:10-30](file://i18n/en.js#L10-L30)
- [i18n/zh.js:10-30](file://i18n/zh.js#L10-L30)

**Section sources**
- [demo.js:131-144](file://demo.js#L131-L144)
- [demo.js:728-778](file://demo.js#L728-L778)
- [i18n/en.js:10-30](file://i18n/en.js#L10-L30)
- [i18n/zh.js:10-30](file://i18n/zh.js#L10-L30)

### Official PlantUML Demo Integration
- The repository includes official PlantUML reference pages in English and Chinese.
- These pages complement built-in examples by providing authoritative syntax and feature coverage.
- Users can cross-reference official docs while exploring built-in examples.

**Section sources**
- [README.md:192-192](file://README.md#L192-L192)
- [README_zh.md:192-192](file://README_zh.md#L192-L192)
- [plantuml-official-demo/en/sequence-diagram_en.html:775-795](file://plantuml-official-demo/en/sequence-diagram_en.html#L775-L795)
- [plantuml-official-demo/zh/sequence-diagram_zh.html:761-783](file://plantuml-official-demo/zh/sequence-diagram_zh.html#L761-L783)

### Adding New Examples
- Choose the appropriate diagram type and number; follow the naming convention.
- Place the .ctu file in data/demo/.
- Ensure both _en.ctu and _zh.ctu variants exist for bilingual coverage.
- Use the template to structure content consistently.

**Section sources**
- [README.md:160-163](file://README.md#L160-L163)
- [README_zh.md:160-163](file://README_zh.md#L160-L163)
- [data/_TEMPLATE.ctu:1-46](file://data/_TEMPLATE.ctu#L1-L46)

### Modifying Existing Examples
- Update the relevant .ctu file in data/demo/.
- Keep the filename unchanged to preserve tab and link stability.
- When changing diagram keys, update i18n labels accordingly.

**Section sources**
- [demo.js:35-52](file://demo.js#L35-L52)
- [i18n/en.js:10-30](file://i18n/en.js#L10-L30)
- [i18n/zh.js:10-30](file://i18n/zh.js#L10-L30)

### Maintaining Consistency Across the Library
- Use the shared template to ensure consistent metadata and section ordering.
- Keep titles concise and descriptions clear; leverage Markdown formatting.
- Prefer canonical diagram types aligned with the supported list.

**Section sources**
- [README.md:57-63](file://README.md#L57-L63)
- [README_zh.md:57-63](file://README_zh.md#L57-L63)
- [data/_TEMPLATE.ctu:1-46](file://data/_TEMPLATE.ctu#L1-L46)

## Dependency Analysis
The demo page depends on:
- docs-page-core for reading sources, splitting lines, scaling large diagrams, and error detection.
- i18n modules for labels and UI strings.
- data/demo files for example content.
- Official PlantUML docs for reference.

```mermaid
graph LR
J["demo.js"] --> C["docs-page-core.js"]
J --> E["_TEMPLATE.ctu"]
J --> D["data/demo/*.ctu"]
J --> EN["i18n/en.js"]
J --> ZH["i18n/zh.js"]
J --> OFF_EN["plantuml-official-demo/en/*.html"]
J --> OFF_ZH["plantuml-official-demo/zh/*.html"]
```

**Diagram sources**
- [demo.js:1-30](file://demo.js#L1-L30)
- [component/docs-page-core.js:12-35](file://component/docs-page-core.js#L12-L35)
- [README.md:192-192](file://README.md#L192-L192)

**Section sources**
- [demo.js:1-30](file://demo.js#L1-L30)
- [component/docs-page-core.js:12-35](file://component/docs-page-core.js#L12-L35)

## Performance Considerations
- Large diagrams may exceed browser rendering capacity; the demo detects oversized diagrams and attempts auto-scaling.
- If auto-scaling still fails, the demo falls back to server-side rendering via /api/plantuml-svg.
- Rendering is queued and generation-aware to avoid stale updates when switching tabs or languages.

```mermaid
flowchart TD
A["Start render"] --> B{"Diagram too large?"}
B -- Yes --> C["Add browser-safe scale"]
C --> D["Retry client render"]
D --> E{"Still failing?"}
E -- Yes --> F["POST /api/plantuml-svg (fallback)"]
E -- No --> G["Success"]
B -- No --> H["Direct client render"]
H --> I{"Error?"}
I -- Yes --> F
I -- No --> G
```

**Diagram sources**
- [demo.js:413-429](file://demo.js#L413-L429)
- [demo.js:395-403](file://demo.js#L395-L403)
- [README.md:237-274](file://README.md#L237-L274)

**Section sources**
- [demo.js:413-429](file://demo.js#L413-L429)
- [demo.js:395-403](file://demo.js#L395-L403)
- [README.md:237-274](file://README.md#L237-L274)

## Troubleshooting Guide
- If examples fail to load, verify the API response and the presence of .ctu files in data/demo/.
- If rendering fails, check for syntax errors or unsupported constructs; the demo detects common error markers in the rendered SVG.
- For large diagrams, confirm auto-scaling is applied and consider simplifying the diagram.
- If client rendering crashes persistently, ensure server-side fallback is functioning.

**Section sources**
- [demo.js:124-130](file://demo.js#L124-L130)
- [demo.js:374-439](file://demo.js#L374-L439)
- [component/docs-page-core.js:77-130](file://component/docs-page-core.js#L77-L130)

## Conclusion
Code-To-UML’s example library offers a comprehensive, bilingual, and maintainable collection of diagrams spanning UML and Non-UML categories. The demo page’s architecture ensures reliable rendering with graceful fallbacks, while the official PlantUML docs provide authoritative reference material. Following the naming convention, using the template, and keeping bilingual parity will help sustain a high-quality example library.

## Appendices

### Appendix A: Supported Diagram Types
- UML: Sequence, Use Case, Class, Object, Activity, Component, Deployment, State, Timing
- Non-UML: Gantt, MindMap, WBS, EBNF, Regex, Network (nwdiag), JSON, YAML, Archimate, Salt (Wireframe)

**Section sources**
- [README.md:57-63](file://README.md#L57-L63)
- [README_zh.md:57-63](file://README_zh.md#L57-L63)

### Appendix B: Example File Naming and Organization
- Pattern: {diagram-type}--{number}_{language}.ctu
- Location: data/demo/
- Variants: Both _en.ctu and _zh.ctu for each example number

**Section sources**
- [README.md:160-163](file://README.md#L160-L163)
- [README_zh.md:160-163](file://README_zh.md#L160-L163)
- [data/demo/sequence--1_en.ctu:1-23](file://data/demo/sequence--1_en.ctu#L1-L23)
- [data/demo/class--1_en.ctu:1-34](file://data/demo/class--1_en.ctu#L1-L34)
- [data/demo/use-case--1_en.ctu:1-21](file://data/demo/use-case--1_en.ctu#L1-L21)
- [data/demo/regex--1_en.ctu:1-17](file://data/demo/regex--1_en.ctu#L1-L17)
- [data/demo/gantt--1_en.ctu:1-23](file://data/demo/gantt--1_en.ctu#L1-L23)