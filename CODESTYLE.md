# ⚙️ WebburnsTech Code Style Guide (`CODESTYLE.md`)

This document outlines the code standards and best practices for the WebburnsTech project. Following these guidelines ensures consistency, readability, and long-term maintainability across all our repositories and project components.

We encourage all contributors to adhere to these rules when submitting code. The project utilizes Prettier and ESLint (recommended) for automated formatting and linting.

-----

## 1\. General Guidelines

| Principle | Description |
| :--- | :--- |
| **Consistency** | Always prioritize consistency with the existing codebase. If a rule is ambiguous, follow the most prevalent style already in the file. |
| **Readability** | Write clear, well-structured code that is easy for others to read and understand. |
| **Simplicity** | Choose the simplest, most straightforward solution over complex or overly clever alternatives. |
| **ES6+** | Use modern JavaScript features (`const`, `let`, arrow functions, `async/await`) across all JS files. |
| **Semicolons** | **Mandatory** in all JavaScript and Node.js code. |

-----

## 2\. Formatting & Indentation

### 2.1. Indentation

  * **Use 4 spaces** for indentation. **Do not use tabs.**
  * Code blocks and control structures must be indented, including `if/else`, `for/while`, function bodies, and object/array properties that span multiple lines.

### 2.2. Quotes

  * **JavaScript/Node.js:** Use **single quotes (`'`)** for string literals. Double quotes are reserved primarily for JSON.
    ```javascript
    // ✅ Good
    const name = 'WebburnsTech';
    // ❌ Bad
    const name = "WebburnsTech";
    ```
  * **HTML:** Use **double quotes (`"`)** for all attribute values.
    ```html
    <a href="#contact" class="btn btn-primary">Contact</a>
    ```

### 2.3. HTML/Markup

  * Use **Semantic HTML5** elements (`<header>`, `<main>`, `<section>`, `<footer>`, `<article>`).
  * Self-closing tags should be avoided (`<img src="...">` is preferred over `<img src="..." />`).

### 2.4. CSS

  * Use **CSS Variables** (`:root` selector and `var()`) for colors, typography, and spacing defined in `videos/base.css`.
  * Place one space after the colon in declarations (`color: #fff;`).
  * Always include a semicolon after the last declaration in a block.

-----

## 3\. Naming Conventions

### 3.1. JavaScript / Node.js

| Element | Convention | Example |
| :--- | :--- | :--- |
| **Variables/Functions** | **`camelCase`** | `const themeToggle`, `function sendMessage()` |
| **Classes/Models/Enums** | **`PascalCase`** | `const User = mongoose.model('User', userSchema)` |
| **Constants** | **`UPPER_SNAKE_CASE`** | `const API_URL = '...'`, `const JWT_SECRET = '...'` |

### 3.2. HTML / CSS

| Element | Convention | Example |
| :--- | :--- | :--- |
| **Class Names** | **`kebab-case`** (Recommended, aligning with BEM) | `.service-card`, `.ai-assistant-btn` |
| **CSS Variables** | **`kebab-case`** (Observed in `videos/base.css`) | `--primary-color`, `--text-light` |
| **File Names** | **`kebab-case`** for front-end files | `privacy-policy.html`, `mobile-development.html` |
| **File Names** | **`PascalCase`** or **`camelCase`** for Node.js files | `Server.js`, `server.js`, `nlp-server.js` |

-----

## 4\. Comments & Documentation

### 4.1. Inline Comments

  * Use inline comments (`//`) to explain **why** a block of code does something, or to clarify complex logic, constants, or boundary conditions.
  * Avoid commenting on *what* obvious code does (e.g., `// loop through array`).

### 4.2. Function/Module Documentation

  * For all publicly exposed functions, API endpoints, complex logic, and components, provide a concise explanation of their purpose, inputs, and outputs.
  * For Node.js backends, clearly label API route logic for easy identification.

### 4.3. HTML Comments

  * Use comments to delineate the start and end of major sections (e.g., ` ,  `).

-----

## 5\. Commit Message Style

All commits must follow the **Conventional Commits** specification, as detailed in our `CONTRIBUTING.md`.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Required Types

| Type | Use Case | Example |
| :--- | :--- | :--- |
| `feat` | A new feature or major enhancement. | `feat(api-auth): add GitHub OAuth support` |
| `fix` | A bug fix. | `fix(contact): prevent submission on empty fields` |
| `docs` | Changes to documentation (README, CONTRIBUTING, etc.). | `docs(readme): update deployment instructions` |
| `style` | Code style, formatting changes (no functional change). | `style(css): format hero section styles` |
| `refactor` | Code restructuring without fixing bugs or adding features. | `refactor(dev-api): use async/await for db calls` |
| `chore`| Maintenance tasks, dependency updates, configuration changes. | `chore(deps): update mongoose to v7.5.0` |

-----

## 6\. Testing & Linting Rules

### 6.1. Linting

  * We use ESLint and Prettier (recommended) to enforce formatting automatically.
  * The build pipeline (CI/CD) will check for common errors and style violations. Pull Requests failing these checks will not be merged.

### 6.2. Error Handling (Node.js)

  * All asynchronous code, especially in API endpoints, **must** be wrapped in `try...catch` blocks to prevent unhandled promise rejections and server crashes.
    ```javascript
    // Example from Developer/server.js
    app.post('/api/auth/register', async (req, res) => {
        try {
            // ... logic
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    ```
  * Use Express global error handling middleware for final catch-all server errors.

### 6.3. Security & Secrets

  * Never commit API keys, database credentials, or secret tokens directly to the repository.
  * Use `.env` files for environment-specific secrets and ensure `.env` is listed in `.gitignore`.

<!-- end list -->

```
# .gitignore content
node_modules/
.env
*.log
# ...
```

  * Utilize secure configuration practices (e.g., using `helmet` for HTTP headers).

<!-- end list -->

```javascript
// Example from Developer/server.js
app.use(helmet());
```

```
```
