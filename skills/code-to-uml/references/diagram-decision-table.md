# Diagram Decision Principles

Reference document for deciding when and how to use diagrams in Code-To-UML reports.

## Responsibility Boundary

This document decides whether a diagram is useful and which diagram type best fits the reader's question. It does not define PlantUML syntax quality; use `uml-standards.md` for valid PlantUML authoring and rendering checks. It also does not redefine required report coverage; use `report-contract.md` for section IDs, scope applicability, and merge rules.

## Golden Rule

Text must provide full coverage. Diagrams are added only when they reduce cognitive load. A useful diagram makes complex relationships simpler; a diagram for simple behavior can make the report harder to read.

## Diagram Value Gate

Before adding a diagram, confirm that it answers at least one concrete reader question:

- What calls what, and in what order?
- Which module, process, object, or state owns a responsibility?
- Where are the runtime, module, or persistence boundaries?
- Which branch, retry, fallback, or error path is hard to follow from prose alone?
- Which dependency direction or lifecycle transition creates maintenance risk?

Do not add a diagram when it only repeats a short text explanation, lists files mechanically, visualizes two obvious nodes, or has no relationship that needs visual comparison. For low-value cases, use structured text, a table, or a short bullet list instead.

## What Diagrams Are Good At

- **Strong uses**: call order, interaction timing, object relationships, inheritance/composition, state transitions, lifecycle, module boundaries, deployment topology, data ownership, and non-trivial branch flow.
- **Text must still cover**: design reasons, boundary conditions, exception-path details, performance constraints, SLA numbers, known pitfalls, implicit conventions, and change risks.
- **PlantUML correctness is separate**: a diagram can be syntactically valid but still not useful for the report. Value is decided here; syntax and rendering are checked by `uml-standards.md`.

## Complexity Scoring

Score the target across six dimensions. Give each dimension 0-2 points for a maximum score of 12.

| Dimension | 0 points | 1 point | 2 points |
|---|---|---|---|
| Module or boundary count | Single local unit | 2-3 related files/classes/modules | Cross-module, cross-process, or layered subsystem |
| External dependencies | No meaningful external dependency | Local library, framework API, or one integration point | Multiple services, storage systems, queues, APIs, or runtime environments |
| State mutation or lifecycle | Pure calculation or read-only flow | Local state mutation or simple lifecycle | Shared state, persistence, cache, workflow, or explicit state machine |
| Concurrency or transactions | No concurrency or transactional boundary | Async flow, callback chain, or simple transaction | Parallelism, locking, retries, eventual consistency, or distributed transaction concerns |
| Exception and fallback paths | No meaningful exceptional path | One or two recoverable error paths | Many branches, retries, compensations, fallbacks, or partial-failure modes |
| Business or routing rules | Straight-line technical behavior | Several conditional rules | Dense policy, permission, routing, approval, pricing, or risk-control logic |

| Score | Strategy |
|---|---|
| 0-3 (low) | Use structured text by default. Add a diagram only when the Diagram Value Gate passes; prefer one small diagram or merge coverage into a nearby section. |
| 4-7 (medium) | Add diagrams for sections with non-trivial relationships. Keep simple supporting sections text-only and avoid duplicate diagrams. |
| 8-12 (high) | Use diagrams broadly for architecture, flow, calls, and data/state ownership. Pair each diagram with design-decision text and risk explanation. |

## Report Section Mapping

Use this table after checking `report-contract.md` for whether the section is required, merged, or optional for the target scope.

| Section ID | Primary reader question | Default diagram choice | Use a diagram when | Prefer text/table when |
|---|---|---|---|---|
| `S02_TOP_LEVEL_STRUCTURE` | What is inside the target and how is it organized? | Package/component or WBS | The target spans several files/modules or has important import-time side effects | It is a single file or class with obvious members |
| `S03_CORE_OBJECTS` | What are the main objects/functions and their responsibilities? | Class/object diagram | Relationships, ownership, inheritance, or composition matter | A responsibility table is clearer than boxes and arrows |
| `S04_ARCHITECTURE` | Where are the system/module/runtime boundaries? | Component, package, or deployment diagram | Dependency direction, layer boundaries, service boundaries, or runtime assumptions matter | The architecture is a single local unit |
| `S05_CORE_FLOW` | What is the main execution path and where can it branch? | Activity or state diagram | There are meaningful branches, fallbacks, retries, or state transitions | The flow is linear and fits in one paragraph |
| `S06_CALL_RELATIONSHIPS` | What is the end-to-end call chain across boundaries? | Sequence or component call-chain diagram | Ordering, caller/callee responsibility, async behavior, or cross-boundary calls matter | Calls are local and already covered by `S03` text |
| `S07_DATA_OR_STATE_FLOW` | How do inputs become outputs, or how does state move? | Activity, state, object, or data-flow style component diagram | Transformation, ownership, persistence, cache, or lifecycle is non-trivial | Inputs and outputs are direct and stateless |
| `S10_ONBOARDING_GUIDE` | What path should a maintainer follow first? | Mindmap/WBS | The reading or debugging path has multiple branches | A short ordered checklist is enough |
| `S12_REVIEWER_QUESTIONS` | Which questions and answers help readers consolidate the analyzed target? | Mindmap/WBS | Q&A topics cluster around distinct learning areas such as structure, flow, design, risks, and extension paths | A question-answer checklist or table is more scannable |
| `S13_MAINTAINER_REFERENCE` | Which symbols/files should a maintainer jump to quickly? | None | Do not add a diagram; this section is a reference index | Always use a Markdown table |

## Choose by Problem

| Problem to Answer | Recommended Diagram | Prefer This When |
|---|---|---|
| What talks to what, and in what order? | Sequence diagram | Interaction timing, async callbacks, retries, or caller/callee responsibility matters. |
| Which state transitions are valid? | State diagram | Lifecycle, approval workflow, order status, cache state, or failure recovery depends on legal transitions. |
| Where are the boundaries and dependency directions? | Component/package/deployment diagram | The reader needs to see service, module, layer, storage, or runtime boundaries. |
| Which classes or objects own data and behavior? | Class/object diagram | Inheritance, composition, ownership, or domain relationships are central to the design. |
| Which branch or rule path is taken? | Activity diagram | Business logic, validation, routing, approval, or fallback behavior has many conditional paths. |
| What should be read or reviewed first? | Mindmap/WBS | The goal is onboarding, Q&A grouping, or a structured learning review path rather than runtime behavior. |

## Anti-Patterns

Avoid diagrams for these cases unless a specific reader question passes the Diagram Value Gate:

- A single linear function with no meaningful branch, state mutation, or external dependency.
- Getter/setter-style methods, simple adapters, or thin wrappers around one API call.
- A file list drawn as boxes without dependency direction or ownership semantics.
- A class diagram that repeats a symbol index already covered by `S13_MAINTAINER_REFERENCE`.
- A sequence diagram with only one caller and one callee where order is obvious.
- A component diagram that hides the important risk in prose-only notes.
- Several diagrams that express the same relationship from slightly different angles.

## Quick Decision Rule

- If one sentence explains the relationship clearly, keep the section text-only.
- If a table compares the details better than arrows, use a table.
- If a rough sketch is needed to explain the relationship, add a diagram.
- If the diagram still requires significant explanation, combine diagram, text, and design rationale.
- If the diagram cannot name a concrete reader question, remove it.
