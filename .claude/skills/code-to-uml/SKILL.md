```markdown
# code-to-uml Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `code-to-uml` TypeScript repository. You'll learn the project's file naming, import/export styles, commit message conventions, and how to work with tests. This guide also provides suggested commands for common workflows to streamline your development process.

## Coding Conventions

### File Naming
- All files use **snake_case**.
  - Example: `parse_code.ts`, `uml_generator.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import { parseClass } from './parser';
    ```

### Export Style
- Use **named exports** for all exported functions, classes, or constants.
  - Example:
    ```typescript
    export function generateUML() { ... }
    ```

### Commit Messages
- Mixed types, with some using the `docs` prefix.
- Keep commit messages concise (average ~20 characters).
  - Example: `docs: update readme`

## Workflows

### Adding a New Feature
**Trigger:** When implementing a new functionality.
**Command:** `/add-feature`

1. Create a new file using snake_case (e.g., `new_feature.ts`).
2. Implement the feature using TypeScript.
3. Use relative imports to include any dependencies.
4. Export your functions/classes using named exports.
5. Write corresponding tests in a `*.test.*` file.
6. Commit changes with a concise message (optionally prefixed, e.g., `feat: add new feature`).

### Writing Documentation
**Trigger:** When updating or adding documentation.
**Command:** `/update-docs`

1. Edit or create markdown files as needed.
2. Use the `docs:` prefix in your commit message.
3. Keep documentation clear and concise.

### Running Tests
**Trigger:** When verifying code changes.
**Command:** `/run-tests`

1. Identify test files matching the `*.test.*` pattern.
2. Use the project's preferred test runner (framework unknown; check project docs or package.json).
3. Run all tests and ensure they pass before committing.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `parser.test.ts`).
- The testing framework is not explicitly defined; consult the project documentation or `package.json` for details.
- Place tests alongside or near the code they cover.
- Example test file structure:
  ```typescript
  import { parseClass } from './parser';

  describe('parseClass', () => {
    it('should parse a simple class', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command        | Purpose                                     |
|----------------|---------------------------------------------|
| /add-feature   | Scaffold and implement a new feature        |
| /update-docs   | Update or add documentation                 |
| /run-tests     | Run all test files in the project           |
```