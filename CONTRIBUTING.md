# Contributing to WebburnsTech 🚀

Thank you for your interest in contributing to WebburnsTech! We're excited to have you join our community of developers, designers, and technology enthusiasts. This guide will help you get started with contributing to our project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style Standards](#code-style-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Issue Reporting](#issue-reporting)
- [Community and Support](#community-and-support)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@webburnstech.dev.

**Key Principles:**
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Git** (v2.25+)
- **Node.js** (v16+ LTS recommended)
- **npm** or **yarn** package manager
- A code editor (VS Code, Sublime Text, etc.)
- Basic knowledge of HTML, CSS, and JavaScript

### First-Time Setup

1. **Fork the repository**
   
   Click the "Fork" button at the top right of the repository page to create your own copy.

2. **Clone your fork**
   
   ```bash
   git clone https://github.com/YOUR_USERNAME/webburnstech.com.git
   cd webburnstech.com
   ```

3. **Add upstream remote**
   
   ```bash
   git remote add upstream https://github.com/register360/webburnstech.com.git
   git remote -v  # Verify remotes
   ```

4. **Install dependencies**
   
   ```bash
   npm install
   # or
   yarn install
   ```

5. **Create a development branch**
   
   ```bash
   git checkout -b feature/your-feature-name
   ```

6. **Start development server** (if applicable)
   
   ```bash
   npm start
   # or
   yarn start
   ```

---

## 🤝 How to Contribute

### Types of Contributions We Welcome

| Contribution Type | Examples |
|------------------|----------|
| 🐛 **Bug Fixes** | Fixing broken links, CSS issues, JavaScript errors |
| ✨ **New Features** | Adding new sections, implementing new functionality |
| 📝 **Documentation** | Improving README, adding code comments, writing guides |
| 🎨 **Design Improvements** | UI/UX enhancements, accessibility improvements |
| 🧪 **Testing** | Writing tests, improving test coverage |
| 🔧 **Refactoring** | Code optimization, performance improvements |
| 🌐 **Translations** | Adding multi-language support |

### Before You Start

1. **Check existing issues** - Look for existing issues or discussions related to your contribution
2. **Create an issue** - If no issue exists, create one describing what you plan to work on
3. **Wait for approval** - For major changes, wait for maintainer feedback before starting
4. **Claim the issue** - Comment on the issue to let others know you're working on it

---

## 🌿 Branching Strategy

We follow a modified **Git Flow** branching model.

### Branch Types and Naming Conventions

```
<type>/<description>-<issue-number>
```

| Branch Type | Purpose | Example |
|------------|---------|---------|
| `feature/` | New features or enhancements | `feature/contact-form-validation-42` |
| `bugfix/` | Bug fixes for non-production code | `bugfix/navbar-mobile-menu-57` |
| `hotfix/` | Urgent fixes for production | `hotfix/security-vulnerability-89` |
| `docs/` | Documentation updates | `docs/update-readme-23` |
| `refactor/` | Code refactoring without functional changes | `refactor/optimize-css-34` |
| `test/` | Adding or updating tests | `test/add-form-validation-tests-67` |
| `chore/` | Build process, dependencies, tooling | `chore/update-dependencies-12` |

### Branch Workflow

```bash
# Always start from the latest main branch
git checkout main
git pull upstream main

# Create your feature branch
git checkout -b feature/awesome-feature-123

# Make your changes and commit
git add .
git commit -m "feat(contact): add form validation"

# Keep your branch updated with main
git fetch upstream
git rebase upstream/main

# Push your branch
git push origin feature/awesome-feature-123
```

### Protected Branches

- **`main`** - Production-ready code, requires PR reviews
- **`develop`** - Integration branch for features (if used)

---

## 💾 Commit Conventions

We follow the **Conventional Commits** specification for clear and consistent commit messages.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(services): add mobile development section` |
| `fix` | Bug fix | `fix(nav): resolve mobile menu toggle issue` |
| `docs` | Documentation changes | `docs(readme): update installation instructions` |
| `style` | Code style changes (formatting, semicolons) | `style(css): format hero section styles` |
| `refactor` | Code refactoring | `refactor(js): optimize scroll animation` |
| `perf` | Performance improvements | `perf(images): compress portfolio images` |
| `test` | Adding or updating tests | `test(form): add contact form validation tests` |
| `chore` | Build process, dependency updates | `chore(deps): update dependencies` |
| `ci` | CI/CD changes | `ci(github): add automated testing workflow` |
| `revert` | Revert a previous commit | `revert: revert commit abc123` |

### Commit Message Examples

✅ **Good commit messages:**

```bash
feat(portfolio): add project filtering functionality

- Add filter buttons for web, mobile, and design categories
- Implement smooth transitions between filtered items
- Update portfolio grid layout for better responsiveness

Closes #42
```

```bash
fix(contact): prevent form submission on empty fields

- Add client-side validation for required fields
- Display error messages for invalid inputs
- Improve form accessibility with ARIA labels

Fixes #57
```

```bash
docs(contributing): add commit conventions section

Update CONTRIBUTING.md with detailed commit message guidelines
following the Conventional Commits specification.
```

❌ **Bad commit messages:**

```bash
update stuff
fixed bug
changes
wip
```

### Commit Best Practices

1. **Use imperative mood** - "Add feature" not "Added feature" or "Adding feature"
2. **Keep subject line short** - 50 characters or less
3. **Capitalize subject line** - Start with a capital letter
4. **No period at the end** - Don't end the subject line with a period
5. **Separate subject from body** - Use a blank line between subject and body
6. **Explain what and why** - Not how (code shows how)
7. **Reference issues** - Use `Closes #123` or `Fixes #456`

---

## 🔄 Pull Request Process

### Before Creating a PR

- ✅ Ensure your code follows our [Code Style Standards](#code-style-standards)
- ✅ Run all tests and ensure they pass
- ✅ Update documentation if needed
- ✅ Rebase your branch on the latest `main`
- ✅ Test your changes locally
- ✅ Ensure no console errors or warnings

### Creating a Pull Request

1. **Push your branch to your fork**
   
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub from your fork to `register360/webburnstech.com:main`

3. **Fill out the PR template** completely (see template below)

4. **Link the related issue** using keywords like `Closes #123` or `Fixes #456`

### PR Title Format

```
[Type] Brief description (#IssueNumber)
```

**Examples:**
- `[Feature] Add contact form validation (#42)`
- `[Bugfix] Fix mobile navigation menu (#57)`
- `[Docs] Update contributing guidelines (#23)`

### PR Description Template

```markdown
## 📝 Description
<!-- Provide a clear and concise description of what this PR does -->

## 🔗 Related Issue
<!-- Link to the issue this PR addresses -->
Closes #<issue-number>

## 🎯 Type of Change
<!-- Mark the appropriate option with an 'x' -->
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📝 Documentation update
- [ ] 🎨 Style update (formatting, renaming)
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update

## 🧪 Testing
<!-- Describe the tests you ran and how to reproduce them -->

- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on Safari
- [ ] Tested on mobile devices
- [ ] All existing tests pass
- [ ] New tests added (if applicable)

**Test Instructions:**
1. Step 1
2. Step 2
3. Step 3

## 📸 Screenshots
<!-- If applicable, add screenshots to demonstrate changes -->

| Before | After |
|--------|-------|
| <!-- screenshot --> | <!-- screenshot --> |

## ✅ Checklist
<!-- Mark completed items with an 'x' -->

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## 📝 Additional Notes
<!-- Any additional information or context -->
```

### PR Review Process

1. **Automated Checks** - CI/CD pipeline runs automatically
   - ✅ Code linting
   - ✅ Unit tests
   - ✅ Build verification
   - ✅ Security scanning

2. **Manual Review** - At least one maintainer will review
   - Code quality and standards
   - Functionality and logic
   - Documentation completeness
   - Test coverage

3. **Feedback Loop**
   - Address reviewer comments
   - Make requested changes
   - Push updates to the same branch
   - Request re-review

4. **Approval and Merge**
   - Requires approval from at least **1 maintainer**
   - All checks must pass
   - No merge conflicts
   - Maintainer will merge using **squash and merge**

### PR Response Times

| Priority | Target Response Time |
|----------|---------------------|
| 🔴 Critical (hotfix) | Within 24 hours |
| 🟡 High (important feature) | Within 3 days |
| 🟢 Medium (enhancement) | Within 1 week |
| 🔵 Low (minor improvements) | Within 2 weeks |

---

## 🎨 Code Style Standards

### General Principles

- **Consistency** - Follow existing code patterns
- **Readability** - Write code that's easy to understand
- **Simplicity** - Keep it simple and maintainable
- **Documentation** - Comment complex logic

### HTML Standards

```html
<!-- ✅ Good: Semantic HTML5 with proper structure -->
<article class="portfolio-card">
  <header class="portfolio-card__header">
    <h2 class="portfolio-card__title">Project Title</h2>
  </header>
  <section class="portfolio-card__content">
    <p class="portfolio-card__description">Description here</p>
  </section>
  <footer class="portfolio-card__footer">
    <a href="#" class="btn btn--primary">View Project</a>
  </footer>
</article>

<!-- ❌ Bad: Non-semantic with generic divs -->
<div class="card">
  <div class="header">
    <div class="title">Project Title</div>
  </div>
  <div class="body">
    <div class="text">Description here</div>
  </div>
  <div class="footer">
    <div class="link">View Project</div>
  </div>
</div>
```

**HTML Best Practices:**
- Use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- Include proper `alt` attributes for images
- Use ARIA labels for accessibility
- Maintain proper heading hierarchy (h1 → h2 → h3)
- Validate HTML using W3C validator

### CSS Standards (BEM Methodology)

We use **BEM (Block Element Modifier)** naming convention.

```css
/* Block */
.button {
  display: inline-block;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Element */
.button__icon {
  margin-right: 8px;
  font-size: 14px;
}

/* Modifier */
.button--primary {
  background-color: #6c63ff;
  color: #ffffff;
}

.button--primary:hover {
  background-color: #5a52d5;
}

.button--disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}
```

**CSS Best Practices:**
- Use CSS variables for colors, spacing, and breakpoints
- Mobile-first responsive design
- Avoid `!important` unless absolutely necessary
- Use relative units (`rem`, `em`, `%`, `vh`, `vw`) over fixed pixels
- Group related properties together
- Add comments for complex selectors or calculations

**CSS Variable Example:**
```css
:root {
  --primary-color: #6c63ff;
  --secondary-color: #ff6584;
  --text-color: #333333;
  --bg-color: #ffffff;
  --spacing-unit: 8px;
  --border-radius: 6px;
}

.hero {
  background-color: var(--primary-color);
  padding: calc(var(--spacing-unit) * 4);
  border-radius: var(--border-radius);
}
```

### JavaScript Standards

```javascript
// ✅ Good: ES6+ with proper naming and structure
class PortfolioFilter {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.filterButtons = this.container.querySelectorAll('.filter-btn');
    this.portfolioItems = document.querySelectorAll('.portfolio-item');
    
    this.init();
  }
  
  init() {
    this.filterButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleFilterClick(e));
    });
  }
  
  handleFilterClick(event) {
    const filter = event.target.dataset.filter;
    this.filterItems(filter);
    this.updateActiveButton(event.target);
  }
  
  filterItems(category) {
    this.portfolioItems.forEach(item => {
      const itemCategory = item.dataset.category;
      const shouldShow = category === 'all' || itemCategory === category;
      
      item.style.display = shouldShow ? 'block' : 'none';
      item.classList.toggle('filtered', !shouldShow);
    });
  }
  
  updateActiveButton(activeButton) {
    this.filterButtons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const portfolioFilter = new PortfolioFilter('.portfolio-filter');
});

// ❌ Bad: Unclear naming and structure
function f(x) {
  var a = document.getElementsByClassName('item');
  for (var i = 0; i < a.length; i++) {
    if (a[i].getAttribute('data-cat') == x || x == 'all') {
      a[i].style.display = 'block';
    } else {
      a[i].style.display = 'none';
    }
  }
}
```

**JavaScript Best Practices:**
- Use ES6+ features (const/let, arrow functions, destructuring, template literals)
- Use descriptive variable and function names
- Avoid global variables
- Handle errors with try-catch blocks
- Add JSDoc comments for functions
- Use async/await for asynchronous operations
- Avoid deeply nested code
- Use strict equality (`===` instead of `==`)

**JSDoc Example:**
```javascript
/**
 * Filters portfolio items by category
 * @param {string} category - The category to filter by ('web', 'mobile', 'design', or 'all')
 * @returns {number} The number of visible items after filtering
 * @throws {Error} If category is not a valid string
 */
function filterPortfolio(category) {
  if (typeof category !== 'string') {
    throw new Error('Category must be a string');
  }
  
  // Implementation
  return visibleCount;
}
```

### File Organization

```
webburnstech.com/
├── images/              # Image assets
├── videos/              # Video assets
├── css/                 # Stylesheets
│   ├── base.css        # Base styles and variables
│   ├── components/     # Component-specific styles
│   └── utilities/      # Utility classes
├── js/                  # JavaScript files
│   ├── main.js         # Main application logic
│   ├── components/     # Component scripts
│   └── utils/          # Utility functions
├── fonts/               # Custom fonts
├── docs/                # Documentation
└── tests/               # Test files
```

### Code Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line length**: Maximum 100 characters
- **Quotes**: Single quotes for JavaScript, double quotes for HTML
- **Semicolons**: Always use semicolons in JavaScript
- **Trailing commas**: Use in multi-line objects and arrays

**Use a code formatter:**
```bash
# Install Prettier
npm install --save-dev prettier

# Format code
npx prettier --write "**/*.{js,css,html,md}"
```

---

## 🧪 Testing Requirements

### Testing Principles

- Write tests for all new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Keep tests simple and focused

### Types of Tests

| Test Type | Purpose | Tools |
|-----------|---------|-------|
| **Unit Tests** | Test individual functions/components | Jest, Mocha |
| **Integration Tests** | Test component interactions | Jest, Testing Library |
| **E2E Tests** | Test complete user flows | Cypress, Playwright |
| **Visual Regression** | Test UI consistency | Percy, Chromatic |

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- contact-form.test.js

# Run E2E tests
npm run test:e2e
```

### Test Structure

```javascript
describe('ContactForm', () => {
  describe('validation', () => {
    it('should show error for empty email field', () => {
      // Arrange
      const form = new ContactForm();
      const emailInput = form.getInput('email');
      
      // Act
      emailInput.value = '';
      form.submit();
      
      // Assert
      expect(form.hasError('email')).toBe(true);
      expect(form.getErrorMessage('email')).toBe('Email is required');
    });
    
    it('should show error for invalid email format', () => {
      // Arrange
      const form = new ContactForm();
      const emailInput = form.getInput('email');
      
      // Act
      emailInput.value = 'invalid-email';
      form.submit();
      
      // Assert
      expect(form.hasError('email')).toBe(true);
      expect(form.getErrorMessage('email')).toBe('Please enter a valid email');
    });
  });
  
  describe('submission', () => {
    it('should submit form with valid data', async () => {
      // Arrange
      const form = new ContactForm();
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello!'
      };
      
      // Act
      form.fillForm(mockData);
      const result = await form.submit();
      
      // Assert
      expect(result.success).toBe(true);
      expect(form.hasErrors()).toBe(false);
    });
  });
});
```

### Coverage Requirements

- **Statements**: ≥ 80%
- **Branches**: ≥ 70%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%

### Test Best Practices

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test one thing per test
- Use meaningful assertions
- Mock external dependencies
- Clean up after tests
- Don't test implementation details

---

## 📚 Documentation Guidelines

### Code Documentation

**Document:**
- Complex algorithms or business logic
- Non-obvious code decisions
- Public APIs and interfaces
- Configuration options
- Known limitations or edge cases

**Don't document:**
- Obvious code (self-explanatory)
- Autogenerated code
- Temporary code marked with TODO

### Inline Comments

```javascript
// ✅ Good: Explains why, not what
// Use debouncing to prevent excessive API calls during typing
const debouncedSearch = debounce(searchFunction, 300);

// Calculate discount based on business rule: 
// 10% for orders over $100, 15% for orders over $500
const discount = orderTotal > 500 ? 0.15 : orderTotal > 100 ? 0.10 : 0;

// ❌ Bad: States the obvious
// Increment i by 1
i++;

// Set background color to red
element.style.backgroundColor = 'red';
```

### README Updates

When adding new features, update the README.md with:
- Feature description
- Usage examples
- Configuration options
- Screenshots (if applicable)

### Changelog

Update CHANGELOG.md (if it exists) with:
- Version number
- Release date
- Added features
- Fixed bugs
- Breaking changes
- Deprecated features

---

## 🐛 Issue Reporting

### Before Creating an Issue

1. **Search existing issues** - Check if the issue already exists
2. **Check documentation** - The answer might be in the docs
3. **Verify it's a bug** - Ensure it's not user error

### Bug Report Template

```markdown
**Describe the Bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g., Windows 10, macOS 12.3, Ubuntu 22.04]
- Browser: [e.g., Chrome 115, Firefox 116, Safari 16]
- Version: [e.g., v1.2.3]
- Device: [e.g., Desktop, iPhone 12, Samsung Galaxy S21]

**Additional Context**
Add any other context about the problem here.

**Console Errors**
```
Paste any console errors here
```
```

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional Context**
Add any other context, screenshots, or mockups about the feature request here.

**Would you like to implement this feature?**
- [ ] Yes, I'd like to work on this
- [ ] No, just suggesting
- [ ] Maybe, need more discussion
```

### Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Improvements or additions to documentation |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention is needed |
| `question` | Further information is requested |
| `wontfix` | This will not be worked on |
| `duplicate` | This issue already exists |
| `invalid` | This doesn't seem right |
| `priority: high` | High priority issue |
| `priority: low` | Low priority issue |

---

## 👥 Community and Support

### Getting Help

| Need | Where to Go |
|------|-------------|
| 🐛 Found a bug | [Create an issue](https://github.com/register360/webburnstech.com/issues/new) |
| 💡 Feature idea | [Start a discussion](https://github.com/register360/webburnstech.com/discussions) |
| ❓ Question | [GitHub Discussions](https://github.com/register360/webburnstech.com/discussions) |
| 💬 Chat | Discord (link if available) |
| 📧 Email | support@webburnstech.dev |
| 🔒 Security | security@webburnstech.dev |

### Recognition

We value all contributions! Contributors are recognized through:

- 🏆 **Contributors file** - Listed in AUTHORS.md
- 🎉 **Release notes** - Mentioned in changelogs
- 💬 **Social media** - Shoutouts on Twitter/LinkedIn
- ⭐ **Hall of Fame** - Featured on our website (top contributors)

### Mentorship Program

New to open source? We offer:
- 🎯 **"Good First Issue"** labels for beginners
- 👨‍🏫 **Mentor matching** - Connect with experienced contributors
- 📖 **Learning resources** - Curated tutorials and guides
- 💪 **Pair programming** - Work with maintainers on complex issues

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Discord** - Real-time chat and community support
- **Email** - Direct contact with maintainers

### Code Review Philosophy

We believe in constructive feedback that:
- ✅ Focuses on code, not people
- ✅ Explains "why," not just "what"
- ✅ Offers solutions, not just problems
- ✅ Recognizes good work
- ✅ Teaches and mentors

---

## 🎓 Learning Resources

### Recommended Reading

- [Git and GitHub for Beginners](https://www.freecodecamp.org/news/git-and-github-for-beginners/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [BEM CSS Methodology](https://getbem.com/)
- [JavaScript Best Practices](https://javascript.info/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tutorials

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [First Contributions](https://github.com/firstcontributions/first-contributions)
- [Pull Request Tutorial](https://www.digitalocean.com/community/tutorials/how-to-create-a-pull-request-on-github)

---

## 📜 License

By contributing to WebburnsTech, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

## 🙏 Thank You!

Every contribution, no matter how small, makes a difference. Whether you're fixing a typo, reporting a bug, or implementing a new feature, your effort helps make WebburnsTech better for everyone.

**Ready to contribute?**

1. ⭐ Star the repository
2. 🍴 Fork the project
3. 🌿 Create a branch
4. 💻 Make your changes
5. ✅ Test thoroughly
6. 📝 Submit a PR

**Questions?** Don't hesitate to ask! We're here to help.

Happy coding! 🚀

---

<div align="center">

**Made with ❤️ by the WebburnsTech Community**

[Website](http://www.weburnstech.ct.ws/) • [GitHub](https://github.com/register360/webburnstech.com) • [Discussions](https://github.com/register360/webburnstech.com/discussions)

</div>
