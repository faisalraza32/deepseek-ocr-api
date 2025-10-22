# Code Style and Configuration Guide

This document explains the code style configuration for the DeepSeek-OCR API project.

## Overview

This project uses a combination of tools to ensure consistent code formatting and quality:

- **Prettier** - Code formatting
- **ESLint** - Code linting and quality checks
- **EditorConfig** - Cross-editor consistency
- **TypeScript** - Type checking

All tools are configured to work together harmoniously with **2-space indentation**.

## Configuration Files

### `.prettierrc` - Prettier Configuration

Prettier handles automatic code formatting with these settings:

```json
{
  "singleQuote": true, // Use single quotes
  "trailingComma": "all", // Add trailing commas everywhere
  "printWidth": 100, // Line width of 100 characters
  "tabWidth": 2, // 2 spaces for indentation
  "useTabs": false, // Use spaces, not tabs
  "semi": true, // Add semicolons
  "arrowParens": "always", // Always use parentheses in arrow functions
  "endOfLine": "lf", // Unix-style line endings
  "bracketSpacing": true, // Spaces in object literals
  "bracketSameLine": false // Put closing brackets on new line
}
```

### `.eslintrc.js` - ESLint Configuration

ESLint enforces code quality rules and integrates with Prettier:

- Uses `@typescript-eslint` parser and plugin
- Extends TypeScript recommended rules
- Integrates with Prettier via `plugin:prettier/recommended`
- Custom rules for NestJS patterns
- Warns on console statements (except warn/error)
- Enforces `const` over `let` when possible

### `.editorconfig` - EditorConfig

EditorConfig ensures consistency across different editors and IDEs:

- 2-space indentation for all files
- UTF-8 encoding
- LF line endings
- Trim trailing whitespace
- Insert final newline
- Max line length: 100 characters

### `.vscode/settings.json` - VS Code Settings

VS Code specific settings for the best development experience:

- Format on save enabled
- ESLint auto-fix on save
- Prettier as default formatter
- 2-space tab size
- Detect indentation disabled (enforces project settings)

## NPM Scripts

### Formatting

```bash
# Format all TypeScript files
npm run format

# Check formatting without making changes
npm run format:check
```

### Linting

```bash
# Lint and auto-fix issues
npm run lint

# Check for linting errors without fixing
npm run lint:check

# Run both linting and formatting
npm run lint:format
```

### Building and Running

```bash
# Build the project
npm run build

# Start in development mode (with watch)
npm run start:dev

# Start in debug mode
npm run start:debug

# Start in production mode
npm run start:prod
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

## IDE Setup

### VS Code (Recommended)

1. Install recommended extensions (you'll be prompted when opening the project):
   - **Prettier - Code formatter** (`esbenp.prettier-vscode`)
   - **ESLint** (`dbaeumer.vscode-eslint`)
   - **EditorConfig for VS Code** (`editorconfig.editorconfig`)
   - **Jest Runner** (`firsttris.vscode-jest-runner`)

2. Settings are automatically applied from `.vscode/settings.json`

3. Format on save is enabled by default

### Other IDEs

For WebStorm, IntelliJ, or other IDEs:

1. Enable EditorConfig support (usually built-in)
2. Enable Prettier and set it as the default formatter
3. Enable ESLint and set to auto-fix on save
4. Ensure tab width is set to 2 spaces

## Git Pre-commit Hooks (Optional)

To enforce code quality before commits, you can add `husky` and `lint-staged`:

```bash
npm install --save-dev husky lint-staged

# Setup husky
npx husky init

# Add pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

## Best Practices

1. **Always run `npm run lint:format` before committing** to ensure code meets standards
2. **Let Prettier handle formatting** - don't manually format code
3. **Fix ESLint warnings** as they appear, don't let them accumulate
4. **Use the provided VS Code snippets** for consistent code patterns
5. **Enable format on save** in your editor for automatic formatting

## Troubleshooting

### Prettier and ESLint Conflicts

If you see conflicts between Prettier and ESLint:

1. Make sure you have `eslint-config-prettier` installed (already in devDependencies)
2. Ensure `plugin:prettier/recommended` is the **last** item in the ESLint `extends` array
3. Run `npm run lint:format` to fix both

### Editor Not Formatting

1. Check that Prettier extension is installed and enabled
2. Verify that Prettier is set as the default formatter
3. Check that `editor.formatOnSave` is enabled
4. Restart your editor/IDE

### Tab Size Issues

If you're seeing 4 spaces instead of 2:

1. Close all files
2. Delete the `.vscode` folder in your workspace (if not using our config)
3. Reopen VS Code
4. Our settings should now apply

## Configuration Hierarchy

Settings are applied in this order (later overrides earlier):

1. **EditorConfig** - Base settings for all editors
2. **Prettier** - Formatting rules
3. **ESLint** - Code quality and Prettier integration
4. **Editor Settings** - IDE-specific overrides

All are configured to use **2-space indentation** consistently.
