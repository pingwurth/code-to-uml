# Core Components

<cite>
**Referenced Files in This Document**
- [demo.js](file://demo.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [toc-component.js](file://component/toc-component.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [install.js](file://install.js)
- [demo.html](file://demo.html)
- [index.html](file://index.html)
- [main.css](file://main.css)
- [i18n-config.js](file://i18n-config.js)
- [render-failure-common.test.js](file://test/render-failure-common.test.js)
- [cache-index-sort.test.js](file://test/cache-index-sort.test.js)
- [install.test.js](file://test/install.test.js)
</cite>

## Update Summary
**Changes Made**
- Added documentation for new cache index sorting functionality (component/cache-index-sort.js)
- Added documentation for enhanced installation safety mechanisms (install.js)
- Updated component integration patterns to include cache index sorting
- Enhanced installation safety documentation with comprehensive testing coverage

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

## Introduction
This document explains the core component system of Code-To-UML's interactive demo page and cache management interface. It focuses on the main application controller (demo.js) and how it orchestrates UI interactions and the rendering pipeline. It also documents reusable UI components: docs-page-core.js for rendering utilities, toc-component.js for navigation, demo-example-component.js for individual diagram cards, render-failure-common.js for robust error handling, cache-index-sort.js for cache file management, and install.js for enhanced installation safety. The document covers component interfaces, event systems, data flow patterns, lifecycle management, state handling, and integration patterns. It concludes with practical usage and customization guidance grounded in the repository's implementation.

## Project Structure
The demo page and cache management system are composed of:
- A main HTML shell (demo.html) that defines containers and loads scripts in a specific order.
- A main controller (demo.js) that bootstraps the page, manages tabs, builds example cards, renders diagrams, and synchronizes the table of contents.
- A cache index interface (index.html) with integrated sorting functionality for managing generated HTML files.
- Reusable UI components under component/ that encapsulate rendering utilities, example cards, navigation, failure handling, and cache file sorting.
- A shared CSS layer (main.css) that styles example cards, actions, preview areas, and the table of contents.
- An internationalization system (i18n-config.js) that switches languages and dispatches events consumed by the controller.
- Installation utilities (install.js) that provide enhanced safety mechanisms for environment setup.

```mermaid
graph TB
HTML["demo.html"] --> DemoJS["demo.js"]
HTML2["index.html"] --> CacheSort["cache-index-sort.js"]
DemoJS --> DocsCore["docs-page-core.js"]
DemoJS --> RenderFailure["render-failure-common.js"]
DemoJS --> I18n["i18n-config.js"]
DemoJS --> Toc["toc-component.js"]
DemoJS --> ExampleComp["demo-example-component.js"]
Install["install.js"] --> CacheSort
CacheSort --> IndexHTML["index.html"]
CSS["main.css"] --> HTML
CSS --> HTML2
```

**Diagram sources**
- [demo.html](file://demo.html)
- [index.html](file://index.html)
- [demo.js](file://demo.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [i18n-config.js](file://i18n-config.js)
- [toc-component.js](file://component/toc-component.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [install.js](file://install.js)
- [main.css](file://main.css)

**Section sources**
- [demo.html](file://demo.html)
- [index.html](file://index.html)
- [demo.js](file://demo.js)
- [main.css](file://main.css)

## Core Components
This section introduces the primary components and their roles.

- docs-page-core.js
  - Provides rendering utilities and helpers for reading example source, splitting PlantUML lines, adding safe scaling for large diagrams, ensuring preview IDs, building download filenames, setting/clearing example messages, detecting preview errors, evaluating outcomes, and performing jar fallback requests.
  - Exposes a singleton API attached to the global scope for other components to use.

- toc-component.js
  - Renders a side table of contents and mobile TOC from structured items.
  - Sets active states based on the current location hash.

- demo-example-component.js
  - Builds a single example card DOM with title, description, actions, source textarea, preview area, and message panel.
  - Handles markdown rendering for descriptions and details.
  - Emits callbacks for source edits and action clicks.

- render-failure-common.js
  - Implements a robust rendering pipeline with timeouts, outcome evaluation, large diagram retries, and jar fallback.
  - Provides helpers to wait for SVG insertion, apply fallback SVG, and report failures.

- cache-index-sort.js
  - Provides cache file sorting functionality with support for name and time-based sorting.
  - Implements case-insensitive locale-aware string comparison with numeric sorting support.
  - Offers bidirectional sorting (ascending/descending) with stable secondary sorting by filename.
  - Exposes a simple API for sorting cache file metadata arrays.

- install.js
  - Enhanced installation utility that safely sets up the CTU_HOME environment variable across multiple AI development tools.
  - Provides comprehensive safety mechanisms including user confirmation prompts and backup verification.
  - Supports multiple AI platforms (codex, claude, vscode, etc.) with platform-specific configuration handling.
  - Includes cross-platform compatibility for Windows and Unix-like systems.

- demo.js (Main Controller)
  - Bootstraps the demo page, initializes i18n, builds example cards, renders diagrams, and synchronizes the TOC.
  - Manages tab switching, scroll-driven TOC activation, and a render queue to avoid overlapping renders.
  - Integrates with the global rendering function and error buffer.

**Section sources**
- [docs-page-core.js](file://component/docs-page-core.js)
- [toc-component.js](file://component/toc-component.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [install.js](file://install.js)
- [demo.js](file://demo.js)

## Architecture Overview
The demo page and cache management system follow a modular, event-driven architecture:
- The controller initializes and orchestrates all components.
- Components communicate through well-defined APIs exposed on the global scope.
- Rendering is delegated to a shared renderer while robustness is handled by the failure-handling component.
- Internationalization is centralized and emits a language change event that the controller listens to.
- Cache management provides a separate interface for browsing and organizing generated HTML files with sorting capabilities.
- Installation utilities provide enhanced safety mechanisms for environment setup.

```mermaid
sequenceDiagram
participant User as "User"
participant Demo as "demo.js"
participant Example as "demo-example-component.js"
participant Core as "docs-page-core.js"
participant Failure as "render-failure-common.js"
participant CacheSort as "cache-index-sort.js"
participant Install as "install.js"
participant Renderer as "Global Renderer"
User->>Demo : Click tab / edit source / click action
Demo->>Example : createExampleNode(options)
Example-->>Demo : DOM node with callbacks
Demo->>Demo : enqueueRender(task)
Demo->>Renderer : render(sourceLines, previewId, options)
Renderer-->>Demo : Preview container updated
Demo->>Failure : renderWithFailureHandling(...)
Failure->>Core : evaluateRenderOutcome(...)
Failure-->>Demo : Outcome (success/failure/unknown)
Demo->>Core : setExampleMessage(...)
Demo->>Demo : syncTocActiveWithViewportLine()
User->>CacheSort : Sort cache files
CacheSort-->>User : Sorted file list
User->>Install : Setup CTU_HOME
Install->>Install : Safety checks & user prompts
Install-->>User : Environment configured
```

**Diagram sources**
- [demo.js](file://demo.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [install.js](file://install.js)

## Detailed Component Analysis

### Main Application Controller (demo.js)
Responsibilities:
- Initialize i18n, language switcher, and preview lightbox.
- Bootstrap the demo by loading diagram examples, binding tabs, initializing TOC, and rendering the active diagram.
- Build example nodes via the example component and enqueue rendering tasks.
- Render diagrams with a controlled chain to prevent race conditions.
- Handle large diagrams by adding a safe scale and retrying in the browser.
- Provide actions for copying source, copying SVG, and downloading SVG.
- Synchronize TOC active states based on viewport position.

Key interfaces and patterns:
- Event system: Listens to a language change event and refreshes content accordingly.
- Render queue: Uses a promise chain to serialize rendering tasks.
- Error handling: Uses a runtime error buffer and a dedicated failure-handling component.
- Lifecycle: Initializes on page load, binds UI, and cleans up on unload.

Customization options:
- Adjust render wait times and retry delays.
- Modify TOC synchronization thresholds.
- Extend action handlers for additional operations.

**Section sources**
- [demo.js](file://demo.js)

### Rendering Utilities (docs-page-core.js)
Responsibilities:
- Parse and normalize PlantUML source.
- Add a safe scale directive for large diagrams.
- Ensure unique preview IDs and build downloadable filenames.
- Detect preview errors and evaluate render outcomes.
- Buffer runtime errors and provide a consumer for them.
- Perform jar fallback requests and insert SVG into the preview.

Key interfaces:
- readExampleSource, splitPlantUmlLines, addBrowserSafeScale
- ensurePreviewId, buildDownloadName
- setExampleMessage, clearExampleMessage
- detectPreviewError, isPreviewErrorSvg
- evaluateRenderOutcome, createRuntimeErrorBuffer
- renderWithPlantUmlJar, setPreviewSvg

Usage examples:
- Called by the controller to prepare source and preview IDs before rendering.
- Used by the failure handler to retry with scaled source and to insert fallback SVG.

**Section sources**
- [docs-page-core.js](file://component/docs-page-core.js)

### Navigation Component (toc-component.js)
Responsibilities:
- Render a side TOC and a mobile TOC from a list of items.
- Set active states based on the current hash.
- Support click handlers per TOC item.

Key interfaces:
- render(options): Accepts sideContainer, mobileContainer, titleText, titleLink, items.
- setActive(sideContainer, href): Updates active classes and aria-current.

Integration:
- The controller calls render with computed items and updates active states on scroll.

**Section sources**
- [toc-component.js](file://component/toc-component.js)
- [demo.js](file://demo.js)

### Example Card Component (demo-example-component.js)
Responsibilities:
- Construct a single example card with title, description, actions, source textarea, preview area, and message panel.
- Apply locale-specific titles and descriptions.
- Emit callbacks for source input and action clicks.

Key interfaces:
- createExampleNode(options): Returns a DOM node configured with callbacks.
- applyExampleLocale(wrapper, item, index, mode): Applies localized text.
- renderMarkdown(text): Renders markdown with a fallback.

Integration:
- The controller passes callbacks to createExampleNode to integrate with the render queue and actions.

**Section sources**
- [demo-example-component.js](file://component/demo-example-component.js)
- [demo.js](file://demo.js)

### Failure Handling (render-failure-common.js)
Responsibilities:
- Wait for SVG insertion with timeouts and mutation observers.
- Evaluate render outcomes using the core component or fallback detection.
- Retry large diagrams by adding a safe scale and re-rendering.
- Request a fallback SVG via jar endpoint and apply it to the preview.
- Report failures and surface user-friendly messages.

Key interfaces:
- waitForSvg(preview, options)
- evaluateRenderOutcomeWithSignals(preview, options)
- renderWithFailureHandling(options)
- retryLargeDiagramInBrowser(options)
- requestJarFallbackSvg(source, options)
- applyFallbackSvg(preview, svgMarkup)
- showPreviewError(preview, err)

Integration:
- The controller invokes renderWithFailureHandling and handles large diagram scaling and fallback.

**Section sources**
- [render-failure-common.js](file://component/render-failure-common.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [demo.js](file://demo.js)

### Cache Index Sorting (cache-index-sort.js)
Responsibilities:
- Provide cache file sorting functionality with support for multiple fields and directions.
- Implement locale-aware string comparison with numeric sorting support for file names.
- Offer bidirectional sorting (ascending/descending) with stable secondary sorting by modification time.
- Return sorted arrays without mutating the original input.

Key interfaces:
- sortCacheFiles(files, sortState): Main API function that sorts cache file metadata.
- Internal comparators: compareNames() and compareTimes() for different sorting strategies.

Sorting capabilities:
- Field selection: Supports "name" and "time" fields.
- Direction control: Ascending ("asc") and descending ("desc") sorting.
- Stable sorting: When times are equal, sorts by name as secondary criteria.
- Locale-aware comparison: Uses Intl.Collator with numeric sorting and base sensitivity.

Integration:
- Integrated into index.html's cache management interface for sorting generated HTML files.
- Provides consistent sorting behavior across different cache file listings.

**Section sources**
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [index.html](file://index.html)

### Installation Safety Mechanisms (install.js)
Responsibilities:
- Safely configure the CTU_HOME environment variable across multiple AI development platforms.
- Provide comprehensive user interaction with confirmation prompts and overwrite warnings.
- Support multiple AI platforms with platform-specific configuration handling.
- Include cross-platform compatibility for Windows and Unix-like systems.

Key features:
- Tool selection: Supports codex, claude, vscode, opencode, openclaw, hermes, qoder, qwen, and trae.
- Safety mechanisms: User confirmation for overwriting existing installations.
- Platform compatibility: Automatic detection of shell profiles and environment variable settings.
- Fallback handling: PowerShell fallback for Windows environment variable setting.

Installation process:
- Validates skill bundle integrity before installation.
- Creates target directories recursively.
- Copies skill files with overwrite confirmation when conflicts exist.
- Updates shell profiles with markers for easy cleanup.

Testing coverage:
- Comprehensive unit tests verify installation behavior across platforms.
- Tests cover overwrite scenarios, profile updates, and error handling.
- Validates that only specified tools are installed when selected.

**Section sources**
- [install.js](file://install.js)
- [install.test.js](file://test/install.test.js)

### Component Interfaces and Data Flow
The components communicate through:
- Global APIs: demo.js relies on PlantUmlDocsCore, PlantUmlToc, PlantUmlDemoExample, PlantUmlRenderFailureCommon.
- Callbacks: The example component emits onSourceInput and onActionClick to the controller.
- Events: The i18n system dispatches a language change event that the controller listens to.
- DOM contracts: Components expect specific data attributes and IDs (e.g., data-source, data-preview, data-example-message).
- Cache sorting: The cache index interface uses window.CacheIndexSort for file organization.
- Installation utilities: Separate CLI tool for environment setup with comprehensive safety checks.

```mermaid
classDiagram
class DemoController {
+bootstrapDemo()
+loadDiagram(key, generation)
+buildExampleNode(diagramKey, item, index)
+renderCurrent(example, generation)
+handleAction(example, button)
+applyDemoI18n()
+bindTocActiveSync()
}
class DocsCore {
+readExampleSource(example)
+ensurePreviewId(example, index)
+evaluateRenderOutcome(preview, options)
+addBrowserSafeScale(source, maxHeight)
+setExampleMessage(example, message, state)
}
class ExampleComponent {
+createExampleNode(options)
+applyExampleLocale(wrapper, item, index, mode)
+renderMarkdown(text)
}
class TocComponent {
+render(options)
+setActive(sideContainer, href)
}
class FailureCommon {
+renderWithFailureHandling(options)
+waitForSvg(preview, options)
+requestJarFallbackSvg(source, options)
}
class CacheIndexSort {
+sortCacheFiles(files, sortState)
+compareNames(left, right)
+compareTimes(left, right)
}
class InstallCtuHome {
+parseArgs(argv)
+installSkill(tool)
+installSkills(tools)
+installUnix(profile)
+installWindows()
}
DemoController --> DocsCore : "uses"
DemoController --> ExampleComponent : "calls"
DemoController --> TocComponent : "renders"
DemoController --> FailureCommon : "delegates"
CacheIndexSort --> IndexHTML : "sorts files"
InstallCtuHome --> ShellProfiles : "updates configs"
```

**Diagram sources**
- [demo.js](file://demo.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [toc-component.js](file://component/toc-component.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [install.js](file://install.js)

## Dependency Analysis
The controller depends on:
- Global i18n module for language switching.
- Global renderer function for diagram rendering.
- Global error buffer for runtime error detection.
- Components for rendering utilities, example cards, TOC, failure handling, and cache file sorting.
- Installation utilities for environment setup with enhanced safety mechanisms.

```mermaid
graph LR
Demo["demo.js"] --> I18n["i18n-config.js"]
Demo --> Core["docs-page-core.js"]
Demo --> Example["demo-example-component.js"]
Demo --> Toc["toc-component.js"]
Demo --> Failure["render-failure-common.js"]
Demo --> HTML["demo.html"]
Demo --> CSS["main.css"]
CacheSort["cache-index-sort.js"] --> IndexHTML["index.html"]
Install["install.js"] --> ShellProfiles["Shell Profiles"]
Install --> EnvVars["Environment Variables"]
```

**Diagram sources**
- [demo.js](file://demo.js)
- [i18n-config.js](file://i18n-config.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [demo-example-component.js](file://component/demo-example-component.js)
- [toc-component.js](file://component/toc-component.js)
- [render-failure-common.js](file://component/render-failure-common.js)
- [demo.html](file://demo.html)
- [main.css](file://main.css)
- [cache-index-sort.js](file://component/cache-index-sort.js)
- [index.html](file://index.html)
- [install.js](file://install.js)

**Section sources**
- [demo.js](file://demo.js)
- [demo.html](file://demo.html)

## Performance Considerations
- Render Queue: The controller serializes rendering tasks to avoid contention and reduce redundant work.
- Large Diagram Scaling: Adds a safe scale directive to prevent browser rendering failures for oversized diagrams.
- TOC Synchronization: Uses requestAnimationFrame to batch viewport checks and minimize layout thrash.
- Lightbox Interaction: Uses transform-based zoom and pan with pointer capture to keep updates efficient.
- Cache Sorting: Performs shallow array copies before sorting to avoid mutating original data structures.
- Installation Safety: Minimizes user interaction overhead through intelligent defaults and confirmation prompts.

## Troubleshooting Guide
Common issues and remedies:
- No SVG rendered: The failure handler evaluates outcomes and may retry with a scaled diagram or request a fallback SVG. The controller surfaces user-friendly messages via the example message panel.
- Jar fallback errors: The failure handler constructs detailed error messages from HTTP responses and logs them to the console.
- Large diagram failures: The controller attempts to add a safe scale and re-render; if successful, it updates the layout to accommodate larger previews.
- Runtime errors: The controller maintains a runtime error buffer and detects runtime exceptions to improve diagnostics.
- Cache sorting issues: Verify that cache file metadata includes required properties (name, path, modifiedMs, size).
- Installation failures: Check platform-specific configuration requirements and ensure sufficient permissions for environment variable updates.

Validation and tests:
- Unit tests exercise the failure handling pipeline, asserting that fallback requests are made and errors are reported appropriately.
- Cache sorting tests verify correct behavior for name and time-based sorting with various input scenarios.
- Installation tests validate cross-platform compatibility and safety mechanism effectiveness.

**Section sources**
- [render-failure-common.js](file://component/render-failure-common.js)
- [render-failure-common.test.js](file://test/render-failure-common.test.js)
- [cache-index-sort.test.js](file://test/cache-index-sort.test.js)
- [install.test.js](file://test/install.test.js)
- [demo.js](file://demo.js)

## Conclusion
The demo page's core component system is designed around modularity and resilience. The main controller coordinates UI orchestration, rendering, and error handling while delegating specialized tasks to focused components. The addition of cache index sorting functionality enhances the user experience by providing intuitive organization of generated HTML files. The enhanced installation safety mechanisms ensure reliable environment setup across multiple AI development platforms. The documented interfaces and patterns enable straightforward customization and extension, such as adjusting render timings, adding new actions, integrating alternative rendering backends, or extending cache management capabilities.