# Render Failure Handling

<cite>
**Referenced Files in This Document**
- [render-failure-common.js](file://component/render-failure-common.js)
- [docs-page-core.js](file://component/docs-page-core.js)
- [render-failure-common.test.js](file://test/render-failure-common.test.js)
- [archimate-diagram_en.html](file://plantuml-official-demo/en/archimate-diagram_en.html)
- [demo.js](file://demo.js)
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

## Introduction

The render-failure-common.js module provides comprehensive error handling and recovery mechanisms for diagram rendering in the PlantUML documentation system. This module serves as a critical component that ensures application stability and maintains excellent user experience during rendering failures by implementing sophisticated failure detection, automatic retry mechanisms, and intelligent fallback strategies.

The module operates as a shared failure handling library that integrates seamlessly with the PlantUML rendering pipeline, providing robust error detection algorithms, render timeout handling, unknown state detection, and fallback strategies that gracefully recover from various rendering failures.

## Project Structure

The render failure handling system is organized as follows:

```mermaid
graph TB
subgraph "Core Rendering System"
RF[render-failure-common.js<br/>Main Failure Handler]
DC[docs-page-core.js<br/>Core Rendering Functions]
end
subgraph "Integration Points"
DEMO[demo.js<br/>Demo Page Integration]
HTML[HTML Pages<br/>Official Demo]
end
subgraph "Testing Infrastructure"
TEST[render-failure-common.test.js<br/>Unit Tests]
end
subgraph "External Dependencies"
CORE[PlantUmlDocsCore<br/>Interface]
FETCH[fetch API<br/>HTTP Requests]
OBSERVER[MutationObserver<br/>DOM Monitoring]
end
RF --> CORE
RF --> FETCH
RF --> OBSERVER
DEMO --> RF
HTML --> RF
TEST --> RF
DC --> CORE
```

**Diagram sources**
- [render-failure-common.js:1-249](file://component/render-failure-common.js#L1-L249)
- [docs-page-core.js:1-464](file://component/docs-page-core.js#L1-L464)
- [demo.js:1-816](file://demo.js#L1-L816)

**Section sources**
- [render-failure-common.js:1-249](file://component/render-failure-common.js#L1-L249)
- [docs-page-core.js:1-464](file://component/docs-page-core.js#L1-L464)

## Core Components

The render failure handling system consists of several interconnected components that work together to provide comprehensive error management:

### Main Failure Handler Module

The primary module exposes a comprehensive API for handling rendering failures:

- **renderWithFailureHandling**: Main orchestration function that coordinates the entire failure handling process
- **waitForSvg**: Asynchronous polling mechanism for detecting SVG completion
- **evaluateRenderOutcomeWithSignals**: Comprehensive outcome evaluation with error detection
- **requestJarFallbackSvg**: HTTP-based fallback mechanism using plantuml.jar
- **applyFallbackSvg**: DOM insertion mechanism for fallback SVG content

### Core Rendering Functions

The docs-page-core.js module provides essential rendering infrastructure:

- **createRuntimeErrorBuffer**: Runtime error capture and analysis system
- **evaluateRenderOutcome**: Advanced render outcome assessment
- **detectPreviewError**: SVG error detection and classification
- **addBrowserSafeScale**: Large diagram scaling for browser compatibility

### Integration Components

The system integrates with multiple interfaces:

- **MutationObserver**: Real-time DOM change monitoring
- **PlantUmlDocsCore**: Shared rendering interface
- **PlantUmlRenderFailureCommon**: Public API exposure

**Section sources**
- [render-failure-common.js:160-237](file://component/render-failure-common.js#L160-L237)
- [docs-page-core.js:178-355](file://component/docs-page-core.js#L178-L355)

## Architecture Overview

The render failure handling architecture implements a multi-layered approach to error management:

```mermaid
sequenceDiagram
participant Client as "Client Application"
participant RF as "renderWithFailureHandling"
participant Wait as "waitForSvg"
participant Eval as "evaluateRenderOutcome"
participant Buffer as "Error Buffer"
participant Fallback as "Jar Fallback"
participant DOM as "DOM Handler"
Client->>RF : renderWithFailureHandling(options)
RF->>RF : render(source, previewId)
RF->>Wait : waitForSvg(preview)
Wait->>Buffer : hasSince(renderStartedAt)
Buffer-->>Wait : runtimeHit or null
alt Runtime Failure Detected
Wait-->>RF : Abort Error
RF->>Eval : evaluateRenderOutcome(preview)
Eval-->>RF : Failure Outcome
else Timeout Occurred
Wait-->>RF : Timeout Error
RF->>Eval : evaluateRenderOutcome(preview)
Eval-->>RF : Unknown Outcome
RF->>RF : Wait for Unknown Recheck
RF->>Eval : evaluateRenderOutcome(preview)
Eval-->>RF : Failure Outcome
end
alt Large Diagram Failure
RF->>RF : retryLargeDiagramInBrowser()
RF->>DOM : Apply Scaled Source
RF->>Wait : waitForSvg(preview)
Wait-->>RF : Success
else Standard Failure
RF->>Fallback : requestJarFallbackSvg(source)
Fallback-->>RF : Fallback SVG
RF->>DOM : applyFallbackSvg(preview)
DOM-->>RF : Success/Failure
end
RF-->>Client : {ok, usedFallback, outcome}
```

**Diagram sources**
- [render-failure-common.js:160-237](file://component/render-failure-common.js#L160-L237)
- [docs-page-core.js:293-355](file://component/docs-page-core.js#L293-L355)

The architecture implements several key design patterns:

1. **Fail-Fast Pattern**: Immediate detection and reporting of obvious failures
2. **Graceful Degradation**: Progressive fallback to alternative rendering methods
3. **Observability**: Comprehensive error tracking and analysis
4. **Resilience**: Automatic retry mechanisms for transient failures

## Detailed Component Analysis

### renderWithFailureHandling Function

The `renderWithFailureHandling` function serves as the central orchestrator for the entire failure handling process:

```mermaid
flowchart TD
Start([Function Entry]) --> ValidateOptions["Validate Required Options"]
ValidateOptions --> OptionsValid{"Options Valid?"}
OptionsValid --> |No| ThrowError["Throw Validation Error"]
OptionsValid --> |Yes| StartRender["Start Rendering Process"]
StartRender --> WaitSVG["Wait for SVG with Timeout"]
WaitSVG --> WaitError{"Wait Error?"}
WaitError --> |Yes| CaptureError["Capture Wait Error"]
WaitError --> |No| EvaluateOutcome["Evaluate Render Outcome"]
EvaluateOutcome --> CheckStatus{"Outcome Status"}
CheckStatus --> |Success| ReturnSuccess["Return Success"]
CheckStatus --> |Unknown| RecheckUnknown["Recheck After Delay"]
CheckStatus --> |Failure| CheckLarge{"Large Diagram Failure?"}
RecheckUnknown --> EvaluateOutcome2["Evaluate Render Outcome Again"]
EvaluateOutcome2 --> CheckStatus2{"Outcome Status"}
CheckStatus2 --> |Success| ReturnSuccess
CheckStatus2 --> |Still Unknown| MarkTimeout["Mark as Render Timeout"]
CheckLarge --> |Yes| RetryLarge["Retry with Browser Scaling"]
RetryLarge --> RetrySuccess{"Retry Success?"}
RetrySuccess --> |Yes| ReturnSuccess
RetrySuccess --> |No| RequestFallback["Request Jar Fallback"]
CheckLarge --> |No| RequestFallback
RequestFallback --> ApplyFallback["Apply Fallback SVG"]
ApplyFallback --> VerifyFallback{"Fallback Applied?"}
VerifyFallback --> |Yes| ReturnSuccess
VerifyFallback --> |No| ThrowFallbackError["Throw Fallback Error"]
ThrowError --> End([Function Exit])
MarkTimeout --> RequestFallback
ReturnSuccess --> End
ThrowFallbackError --> End
```

**Diagram sources**
- [render-failure-common.js:160-237](file://component/render-failure-common.js#L160-L237)

The function implements sophisticated error detection and recovery mechanisms:

#### Error Detection Algorithms

The module employs multiple layers of error detection:

1. **Runtime Error Detection**: Uses the error buffer to detect runtime failures during rendering
2. **SVG Error Detection**: Analyzes rendered SVG content for error indicators
3. **Timeout Detection**: Monitors rendering progress with configurable timeouts
4. **Unknown State Detection**: Handles scenarios where rendering status is ambiguous

#### Automatic Retry Mechanisms

The system implements intelligent retry logic:

- **Large Diagram Retry**: Automatically scales down large diagrams for browser compatibility
- **Fallback Retry**: Attempts alternative rendering methods when primary fails
- **Progressive Timeout**: Uses exponential backoff for repeated failures

#### Fallback Strategies

Multiple fallback mechanisms ensure rendering success:

- **Jar Fallback**: Uses plantuml.jar service for rendering when browser fails
- **Scaled Rendering**: Applies browser-safe scaling for large diagrams
- **DOM Recovery**: Attempts to recover from partial rendering failures

**Section sources**
- [render-failure-common.js:160-237](file://component/render-failure-common.js#L160-L237)

### Error Buffer System

The error buffer system provides comprehensive runtime error tracking and analysis:

```mermaid
classDiagram
class RuntimeErrorBuffer {
+number windowMs
+Entry[] entries
+function onError
+function onRejection
+function originalConsoleError
+record(message, source, signalType) boolean
+consumeSince(sinceTimestamp) Entry|null
+hasSince(sinceTimestamp) Entry|null
+clear() void
+dispose() void
-prune(now) void
}
class Entry {
+number timestamp
+string message
+string source
+string signalType
}
class ErrorDetection {
+isPlantUmlRuntimeFailureMessage(message, source) boolean
+detectPreviewError(preview) string
+evaluateRenderOutcome(preview, options) Outcome
}
RuntimeErrorBuffer --> Entry : "manages"
ErrorDetection --> RuntimeErrorBuffer : "uses"
```

**Diagram sources**
- [docs-page-core.js:178-291](file://component/docs-page-core.js#L178-L291)
- [docs-page-core.js:145-176](file://component/docs-page-core.js#L145-L176)

The error buffer implements several key features:

- **Window-based Tracking**: Maintains errors within configurable time windows
- **Signal Type Classification**: Categorizes different types of runtime failures
- **Automatic Pruning**: Removes expired entries to prevent memory leaks
- **Event Integration**: Hooks into browser error events and console output

**Section sources**
- [docs-page-core.js:178-291](file://component/docs-page-core.js#L178-L291)

### Render Timeout Handling

The timeout handling mechanism provides robust detection and recovery for slow or hanging renders:

```mermaid
flowchart TD
StartTimeout([Start Timeout Watch]) --> SetTimer["Set Timeout Timer"]
SetTimer --> PollDOM["Poll DOM for SVG"]
PollDOM --> SVGFound{"SVG Found?"}
SVGFound --> |Yes| ClearTimer["Clear Timeout Timer"]
SVGFound --> |No| CheckAbort["Check Abort Conditions"]
CheckAbort --> AbortDetected{"Abort Detected?"}
AbortDetected --> |Yes| ThrowAbort["Throw Abort Error"]
AbortDetected --> |No| ContinuePoll["Continue Polling"]
ContinuePoll --> PollDOM
ClearTimer --> Success["Return Success"]
ThrowAbort --> TimeoutError["Return Timeout Error"]
```

**Diagram sources**
- [render-failure-common.js:39-84](file://component/render-failure-common.js#L39-L84)

The timeout system includes:

- **Configurable Timeout Values**: Adjustable timeout periods for different scenarios
- **Polling Intervals**: Efficient polling mechanisms to minimize resource usage
- **Abort Signal Integration**: Real-time abort detection through error buffers
- **Cleanup Mechanisms**: Proper cleanup of timers and observers

**Section sources**
- [render-failure-common.js:39-84](file://component/render-failure-common.js#L39-L84)

### Unknown State Detection

The unknown state detection system handles ambiguous rendering scenarios:

```mermaid
stateDiagram-v2
[*] --> InitialCheck
InitialCheck --> Success : "SVG Present"
InitialCheck --> Unknown : "No SVG Yet"
InitialCheck --> Failure : "SVG Error"
Unknown --> RecheckDelay : "Apply Unknown Recheck Delay"
RecheckDelay --> Success : "SVG Now Present"
RecheckDelay --> StillUnknown : "Still No SVG"
RecheckDelay --> Failure : "SVG Error Detected"
StillUnknown --> MarkTimeout : "Mark as Render Timeout"
Success --> [*]
Failure --> [*]
MarkTimeout --> [*]
```

**Diagram sources**
- [render-failure-common.js:195-211](file://component/render-failure-common.js#L195-L211)

The unknown state detection includes:

- **Recheck Delays**: Configurable delays to allow for late SVG generation
- **Outcome Reassessment**: Second-chance evaluation of rendering status
- **Timeout Conversion**: Automatic conversion of unknown states to timeouts
- **Failure Classification**: Proper classification of unknown failures

**Section sources**
- [render-failure-common.js:195-211](file://component/render-failure-common.js#L195-L211)

### Integration with Rendering Pipeline

The module integrates deeply with the PlantUML rendering pipeline:

```mermaid
graph TB
subgraph "Application Layer"
APP[Application Components]
DEMO[demo.js]
HTML[HTML Pages]
end
subgraph "Shared Layer"
RF[render-failure-common.js]
CORE[docs-page-core.js]
end
subgraph "Rendering Engine"
RENDER[PlantUML Renderer]
JAR[plantuml.jar Service]
end
subgraph "Infrastructure"
BUFFER[Error Buffer]
FETCH[HTTP Client]
OBSERVER[DOM Observer]
end
APP --> RF
DEMO --> RF
HTML --> RF
RF --> CORE
RF --> RENDER
RF --> BUFFER
RF --> FETCH
RF --> OBSERVER
CORE --> RENDER
CORE --> JAR
```

**Diagram sources**
- [render-failure-common.js:3-4](file://component/render-failure-common.js#L3-L4)
- [demo.js:392-403](file://demo.js#L392-L403)

The integration provides:

- **Seamless API Exposure**: Clean public API through PlantUmlRenderFailureCommon
- **Core Function Integration**: Deep integration with PlantUmlDocsCore interface
- **Event System Integration**: Full integration with browser error and rejection events
- **DOM Manipulation**: Safe and efficient DOM manipulation for error display

**Section sources**
- [render-failure-common.js:3-4](file://component/render-failure-common.js#L3-L4)
- [demo.js:392-403](file://demo.js#L392-L403)

## Dependency Analysis

The render failure handling system has carefully managed dependencies that ensure modularity and maintainability:

```mermaid
graph LR
subgraph "Internal Dependencies"
RFC[render-failure-common.js]
CORE[docs-page-core.js]
TEST[render-failure-common.test.js]
end
subgraph "External Dependencies"
WINDOW[window object]
FETCH[fetch API]
MUTATION[MutationObserver]
TIMEOUT[setTimeout/clearTimeout]
INTERVAL[setInterval/clearInterval]
end
subgraph "PlantUML Integration"
PLANTUML[PlantUML Renderer]
JARSERVICE[plantuml.jar Service]
end
RFC --> CORE
RFC --> WINDOW
RFC --> FETCH
RFC --> MUTATION
RFC --> TIMEOUT
RFC --> INTERVAL
CORE --> PLANTUML
CORE --> JARSERVICE
TEST --> RFC
```

**Diagram sources**
- [render-failure-common.js:1-249](file://component/render-failure-common.js#L1-L249)
- [docs-page-core.js:1-464](file://component/docs-page-core.js#L1-L464)

### Coupling and Cohesion Analysis

The module demonstrates excellent design principles:

- **Low Internal Coupling**: Functions are modular and self-contained
- **High External Cohesion**: Strong integration with PlantUML ecosystem
- **Interface-Based Design**: Reliance on well-defined interfaces rather than implementation details
- **Event-Driven Architecture**: Minimal direct dependencies, maximizing flexibility

### Potential Circular Dependencies

The system avoids circular dependencies through:

- **Forward References**: Core functions are referenced but not directly dependent
- **Event-Driven Communication**: No direct function calls between modules
- **Interface Contracts**: Clear separation of concerns through interfaces

**Section sources**
- [render-failure-common.js:1-249](file://component/render-failure-common.js#L1-L249)
- [docs-page-core.js:1-464](file://component/docs-page-core.js#L1-L464)

## Performance Considerations

The render failure handling system is designed with performance optimization in mind:

### Memory Management

- **Automatic Cleanup**: All timers, intervals, and observers are properly cleaned up
- **Error Buffer Pruning**: Automatic removal of expired error entries prevents memory leaks
- **DOM Cleanup**: Proper cleanup of temporary DOM elements and event listeners

### Resource Optimization

- **Efficient Polling**: Configurable polling intervals minimize CPU usage
- **Early Termination**: Immediate termination on success or critical failures
- **Lazy Loading**: Error detection and fallback mechanisms are only activated when needed

### Scalability Features

- **Configurable Timeouts**: Adjustable timeout values for different use cases
- **Modular Design**: Individual components can be used independently
- **Event-Driven Architecture**: Minimizes blocking operations and improves responsiveness

## Troubleshooting Guide

### Common Issues and Solutions

#### Render Timeout Issues

**Symptoms**: Renders hang indefinitely or exceed timeout limits
**Causes**: Large diagrams, complex layouts, or browser performance issues
**Solutions**:
- Increase `renderWaitMs` parameter for complex diagrams
- Enable large diagram scaling automatically
- Monitor browser performance and optimize diagram complexity

#### Fallback Service Failures

**Symptoms**: Jar fallback requests fail or return invalid responses
**Causes**: Network connectivity, server unavailability, or incorrect endpoints
**Solutions**:
- Verify fallback endpoint accessibility
- Check network connectivity and firewall settings
- Ensure plantuml.jar service is running and configured correctly

#### Error Detection Problems

**Symptoms**: Runtime errors not being detected or incorrectly classified
**Causes**: Insufficient error buffering, missing event handlers, or detection algorithm limitations
**Solutions**:
- Configure appropriate error buffer window sizes
- Ensure proper event handler registration
- Review and adjust error detection thresholds

### Diagnostic Capabilities

The system provides comprehensive diagnostic information:

- **Outcome Descriptions**: Human-readable descriptions of render outcomes
- **Error Classification**: Detailed categorization of different error types
- **Timing Information**: Performance metrics and timing data
- **Debug Logging**: Extensive logging for troubleshooting and analysis

**Section sources**
- [render-failure-common.js:11-16](file://component/render-failure-common.js#L11-L16)
- [docs-page-core.js:377-402](file://component/docs-page-core.js#L377-L402)

## Conclusion

The render-failure-common.js module represents a sophisticated and robust solution for handling diagram rendering failures in the PlantUML ecosystem. Through its multi-layered approach to error detection, automatic recovery mechanisms, and intelligent fallback strategies, it ensures application stability and maintains excellent user experience even under challenging conditions.

The module's design demonstrates excellent software engineering principles, including modularity, extensibility, and maintainability. Its deep integration with the PlantUML rendering pipeline and comprehensive error handling capabilities make it an essential component for any production-ready PlantUML documentation system.

Key strengths of the implementation include:

- **Comprehensive Error Coverage**: Handles virtually all types of rendering failures
- **Intelligent Recovery**: Implements multiple layers of fallback mechanisms
- **Performance Optimization**: Minimizes resource usage while maximizing reliability
- **Developer Experience**: Provides clear diagnostics and easy integration
- **Scalability**: Adaptable to different use cases and performance requirements

The module successfully balances reliability, performance, and usability, making it an exemplary implementation of error handling and recovery systems in modern web applications.