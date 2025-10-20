<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contributing Guide - WebburnsTech</title>
  <style>
    /* Base styles */
    .contributing-guide {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #24292e;
    }
    
    .contributing-guide__header {
      border-bottom: 1px solid #eaecef;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .contributing-guide__title {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #0366d6;
    }
    
    .contributing-guide__section {
      margin-bottom: 40px;
    }
    
    .contributing-guide__section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eaecef;
    }
    
    .contributing-guide__subsection {
      margin-bottom: 25px;
    }
    
    .contributing-guide__subsection-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .contributing-guide__code-block {
      background-color: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      margin: 15px 0;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.875rem;
      overflow-x: auto;
    }
    
    .contributing-guide__list {
      padding-left: 20px;
      margin-bottom: 15px;
    }
    
    .contributing-guide__list-item {
      margin-bottom: 8px;
    }
    
    .contributing-guide__note {
      background-color: #f1f8ff;
      border-left: 4px solid #0366d6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    
    .contributing-guide__warning {
      background-color: #fff5f5;
      border-left: 4px solid #d73a49;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    
    .contributing-guide__link {
      color: #0366d6;
      text-decoration: none;
    }
    
    .contributing-guide__link:hover {
      text-decoration: underline;
    }
    
    /* BEM naming convention examples */
    .branching-rules__branch-name {
      color: #22863a;
      font-weight: 500;
    }
    
    .pull-request__step {
      margin-bottom: 12px;
    }
    
    .code-style__example--good {
      color: #22863a;
    }
    
    .code-style__example--bad {
      color: #d73a49;
    }
  </style>
</head>
<body>
  <main class="contributing-guide">
    <header class="contributing-guide__header">
      <h1 class="contributing-guide__title">Contributing to WebburnsTech</h1>
      <p>Thank you for your interest in contributing to our project! This guide will help you get started with our branching rules, pull request process, code style, and testing requirements.</p>
    </header>

    <section class="contributing-guide__section">
      <h2 class="contributing-guide__section-title">Branching Rules</h2>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">Branch Naming Convention</h3>
        <p>All branches should follow this naming pattern:</p>
        <div class="contributing-guide__code-block">
          &lt;type&gt;/&lt;description&gt;-&lt;issue-number&gt;
        </div>
        <p>Examples:</p>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            <span class="branching-rules__branch-name">feature/user-authentication-42</span>
          </li>
          <li class="contributing-guide__list-item">
            <span class="branching-rules__branch-name">bugfix/fix-login-error-57</span>
          </li>
          <li class="contributing-guide__list-item">
            <span class="branching-rules__branch-name">hotfix/critical-security-patch-89</span>
          </li>
        </ul>
      </div>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">Branch Types</h3>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            <strong>main</strong> - Production-ready code only
          </li>
          <li class="contributing-guide__list-item">
            <strong>develop</strong> - Integration branch for features
          </li>
          <li class="contributing-guide__list-item">
            <strong>feature/*</strong> - New functionality
          </li>
          <li class="contributing-guide__list-item">
            <strong>bugfix/*</strong> - Bug fixes
          </li>
          <li class="contributing-guide__list-item">
            <strong>hotfix/*</strong> - Urgent production fixes
          </li>
        </ul>
      </div>
    </section>

    <section class="contributing-guide__section">
      <h2 class="contributing-guide__section-title">Pull Request Guide</h2>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">Creating a Pull Request</h3>
        <ol class="contributing-guide__list">
          <li class="pull-request__step">
            <strong>Fork the repository</strong> and create your branch from <code>develop</code>
          </li>
          <li class="pull-request__step">
            <strong>Make your changes</strong> following our code style guidelines
          </li>
          <li class="pull-request__step">
            <strong>Add tests</strong> for new functionality
          </li>
          <li class="pull-request__step">
            <strong>Update documentation</strong> if needed
          </li>
          <li class="pull-request__step">
            <strong>Ensure all tests pass</strong> before submitting
          </li>
          <li class="pull-request__step">
            <strong>Submit your PR</strong> with a clear title and description
          </li>
        </ol>
      </div>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">PR Description Template</h3>
        <div class="contributing-guide__code-block">
          ## Description
          [Brief description of changes]
          
          ## Related Issue
          Fixes #[issue-number]
          
          ## Type of Change
          - [ ] Bug fix
          - [ ] New feature
          - [ ] Breaking change
          - [ ] Documentation update
          
          ## Testing
          - [ ] Unit tests added/updated
          - [ ] All tests pass
          - [ ] Manual testing performed
          
          ## Screenshots (if applicable)
        </div>
      </div>
      
      <div class="contributing-guide__note">
        <strong>Note:</strong> All PRs require at least one review from a maintainer before merging.
      </div>
    </section>

    <section class="contributing-guide__section">
      <h2 class="contributing-guide__section-title">Code Style Guidelines</h2>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">HTML Standards</h3>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            Use semantic HTML5 tags (<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, etc.)
          </li>
          <li class="contributing-guide__list-item">
            Use 2 spaces for indentation (no tabs)
          </li>
          <li class="contributing-guide__list-item">
            All attributes in lowercase
          </li>
          <li class="contributing-guide__list-item">
            Always include alt text for images
          </li>
        </ul>
        
        <div class="contributing-guide__code-block">
          &lt;!-- Good --&gt;
          &lt;article class="article__container"&gt;
            &lt;header class="article__header"&gt;
              &lt;h1 class="article__title"&gt;Article Title&lt;/h1&gt;
            &lt;/header&gt;
            &lt;main class="article__content"&gt;
              &lt;p class="article__paragraph"&gt;Content here&lt;/p&gt;
            &lt;/main&gt;
          &lt;/article&gt;
          
          &lt;!-- Bad --&gt;
          &lt;div class="container"&gt;
            &lt;div class="header"&gt;
              &lt;div class="title"&gt;Article Title&lt;/div&gt;
            &lt;/div&gt;
            &lt;div class="content"&gt;
              &lt;div class="text"&gt;Content here&lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        </div>
      </div>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">CSS Standards</h3>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            Follow BEM naming convention: <code>.block__element--modifier</code>
          </li>
          <li class="contributing-guide__list-item">
            Use class selectors, avoid inline styles
          </li>
          <li class="contributing-guide__list-item">
            Organize properties logically (positioning, box model, typography, etc.)
          </li>
          <li class="contributing-guide__list-item">
            Use CSS variables for theming
          </li>
        </ul>
        
        <div class="contributing-guide__code-block">
          /* Good BEM example */
          .button {
            display: inline-block;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .button--primary {
            background-color: #0366d6;
            color: white;
          }
          
          .button--disabled {
            background-color: #6a737d;
            cursor: not-allowed;
          }
          
          .button__icon {
            margin-right: 8px;
          }
          
          /* Bad - non-BEM, inconsistent */
          .btnPrimary {
            display: inline-block;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            background: #0366d6;
            color: white;
            cursor: pointer;
          }
          
          .disabled-btn {
            background: #6a737d;
            cursor: not-allowed;
          }
        </div>
      </div>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">JavaScript Standards</h3>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            Use ES6+ features (arrow functions, destructuring, etc.)
          </li>
          <li class="contributing-guide__list-item">
            Prefer <code>const</code> and <code>let</code> over <code>var</code>
          </li>
          <li class="contributing-guide__list-item">
            Use template literals for string concatenation
          </li>
          <li class="contributing-guide__list-item">
            Follow consistent naming (camelCase for variables/functions, PascalCase for classes)
          </li>
        </ul>
      </div>
    </section>

    <section class="contributing-guide__section">
      <h2 class="contributing-guide__section-title">Testing Requirements</h2>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">Test Coverage</h3>
        <ul class="contributing-guide__list">
          <li class="contributing-guide__list-item">
            Write unit tests for all new functions and components
          </li>
          <li class="contributing-guide__list-item">
            Aim for at least 80% code coverage
          </li>
          <li class="contributing-guide__list-item">
            Include integration tests for critical user flows
          </li>
          <li class="contributing-guide__list-item">
            All tests must pass before merging
          </li>
        </ul>
      </div>
      
      <div class="contributing-guide__subsection">
        <h3 class="contributing-guide__subsection-title">Running Tests</h3>
        <div class="contributing-guide__code-block">
          # Run all tests
          npm test
          
          # Run tests with coverage
          npm run test:coverage
          
          # Run specific test file
          npm test -- path/to/test/file.js
        </div>
      </div>
    </section>

    <section class="contributing-guide__section">
      <h2 class="contributing-guide__section-title">Getting Help</h2>
      <p>If you need help or have questions:</p>
      <ul class="contributing-guide__list">
        <li class="contributing-guide__list-item">
          Check existing issues and documentation first
        </li>
        <li class="contributing-guide__list-item">
          Create a new issue with a clear description
        </li>
        <li class="contributing-guide__list-item">
          Join our community discussions
        </li>
      </ul>
      
      <div class="contributing-guide__note">
        <strong>Thank you for contributing responsibly!</strong> Your efforts help make this project better for everyone.
      </div>
    </section>
  </main>
</body>
</html>
