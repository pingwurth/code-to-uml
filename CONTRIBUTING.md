# Contributing to Code-To-UML

Thank you for your interest in contributing to Code-To-UML! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code Style Guidelines](#code-style-guidelines)
- [Adding New Examples](#adding-new-examples)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js 18+**
- **Java** (for server-side PlantUML rendering fallback)
- **Git**

### Quick Start

1. **Fork the repository**

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/code-to-uml.git
   cd code-to-uml
   ```

3. **Set up upstream remote**
   ```bash
   git remote add upstream https://github.com/pingwurth/code-to-uml.git
   ```

4. **Start the development server**
   ```bash
   node serve.js 5401
   ```

5. **Open your browser**
   ```
   http://localhost:5401
   ```

## Development Setup

### Project Structure

```
code-to-uml/
├── index.html              # Main cache index page
├── demo.html               # Diagram showcase page
├── main.css                # Global styles
├── serve.js                # Development server
├── component/              # Reusable UI components
├── data/                   # Sample .ctu data files
├── cache/                  # Generated analysis reports
├── js/                     # Third-party libraries (don't modify)
└── plantuml-official-demo/ # PlantUML examples (don't modify)
```

### Key Files

- **`demo.js`** - Main application logic
- **`component/`** - Reusable UI modules
- **`data/demo/`** - Sample `.ctu` files for testing
- **`cache/_TEMPLATE.html`** - Report template

## Making Changes

### Branch Naming

Use descriptive branch names:

```
feature/add-dark-mode
fix/sequence-diagram-rendering
docs/update-readme
example/add-er-diagram
```

### Commit Messages

Follow conventional commit format:

```
feat: add dark mode support
fix: resolve sequence diagram rendering issue
docs: update installation instructions
example: add ER diagram example
```

### Code Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the code style guidelines below
   - Test locally with `node serve.js`
   - Verify in multiple browsers if possible

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

1. **Update documentation** if needed
2. **Test thoroughly** - ensure all features work as expected
3. **Fill out the PR template** completely
4. **Request review** from maintainers
5. **Address feedback** promptly

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No breaking changes (or clearly documented)

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce the bug
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: OS, browser, Node.js version
- **Screenshots**: If applicable

### Feature Requests

When requesting features:

- **Description**: Clear description of the feature
- **Use Cases**: How this feature would be used
- **Implementation Ideas**: If you have any

## Code Style Guidelines

### JavaScript

- Use **ES6+** features
- Use **strict mode** (`"use strict"`)
- Use **camelCase** for variables and functions
- Use **UPPER_SNAKE_CASE** for constants
- Add **JSDoc comments** for public APIs
- Keep functions **small and focused**

Example:

```javascript
/**
 * Renders a PlantUML diagram
 * @param {string} umlCode - The PlantUML source code
 * @param {HTMLElement} container - The container element
 * @returns {Promise<void>}
 */
async function renderDiagram(umlCode, container) {
    "use strict";
    // Implementation
}
```

### HTML

- Use **semantic HTML5** elements
- Include **ARIA labels** for accessibility
- Use **data attributes** for JavaScript hooks
- Keep markup **clean and readable**

### CSS

- Use **CSS custom properties** for theming
- Follow **BEM-like naming** conventions
- Keep styles **modular and reusable**
- Use **relative units** (rem, em) when possible

## Adding New Examples

### .ctu File Format

To add a new diagram example:

1. **Create a .ctu file** in `data/demo/`
2. **Follow the format**:

```text
Title: Your Diagram Title
Describe: Brief description of the diagram
------------------------------------------------------------
[Example]
Example Title

[Description]
Markdown description of what this diagram demonstrates

[UML]
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi there
@enduml

[Detail]
Explanation of diagram elements and syntax
```

3. **Test locally** to ensure it renders correctly
4. **Submit a PR** with the new example

### Naming Convention

Use lowercase with hyphens:

```
data/demo/er-diagram--1_en.ctu
data/demo/er-diagram--1_zh.ctu
```

- `er-diagram` - diagram type
- `1` - example number
- `en`/`zh` - language code

## Community

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas

### Communication

- Be respectful and constructive
- Provide context and details
- Search existing issues before creating new ones

## Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Code-To-UML! 🎉
