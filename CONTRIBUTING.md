# Contributing to WebburnsTech 🤝

Thank you for your interest in contributing to WebburnsTech! We're excited to have you join our community of developers, students, and technology enthusiasts. This guide will help you get started with contributing to our project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Code Style Standards](#code-style-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating. We're committed to providing a welcoming and inclusive environment for all contributors.

## 🚀 Getting Started

### Prerequisites

- Git 2.25+
- Node.js 16+
- npm or yarn
- A GitHub account

### First Time Setup

1. **Fork the repository**
   ```bash
   # Click the 'Fork' button on GitHub, then:
   git clone https://github.com/your-username/webburnstech.com.git
   cd webburnstech.com
   Add upstream remote

bash
git remote add upstream https://github.com/register360/webburnstech.com.git
Install dependencies

bash
npm install
Create a development branch

bash
git checkout -b feature/your-feature-name
🌿 Branching Strategy
Branch Naming Convention
All branches must follow this pattern:

text
<type>/<description>-<issue-number>
Branch Types
Type	Purpose	Example
feature/	New functionality	feature/user-auth-42
bugfix/	Bug fixes	bugfix/login-error-57
hotfix/	Critical production fixes	hotfix/security-patch-89
docs/	Documentation updates	docs/api-reference-23
refactor/	Code restructuring	refactor/auth-service-34
test/	Test additions/improvements	test/coverage-67
Branch Protection Rules
main branch requires pull request reviews

develop branch is the integration branch

All branches must be up-to-date before merging

Status checks must pass before merging

💾 Commit Conventions
Commit Message Format
text
<type>(<scope>): <description>

<body>

<footer>
Commit Types
Type	Description
feat	New feature
fix	Bug fix
docs	Documentation
style	Formatting, missing semi-colons
refactor	Code restructuring
test	Adding tests
chore	Build process or auxiliary tool changes
Examples
# Good commit messages
feat(auth): add OAuth2 integration with GitHub

fix(api): resolve null pointer in user endpoint

docs(readme): update installation instructions

# Bad commit messages
fixed stuff
update
changes
Commit Body Guidelines
Use the imperative mood ("Add feature" not "Added feature")

Explain what and why, not how

Reference issues with Closes #123 or Fixes #456

🔄 Pull Request Process
Creating a Pull Request
Ensure your branch is updated

bash
git fetch upstream
git rebase upstream/develop
Run tests locally

bash
npm test
npm run lint
Push your changes

bash
git push origin feature/your-feature-name
Create PR on GitHub with our template

PR Title Format
text
[Type] Brief description (#IssueNumber)
Examples:

text
[Feature] Add user authentication (#42)
[Bugfix] Resolve login redirect issue (#57)
[Docs] Update API documentation (#23)
PR Description Template
markdown
## Description
<!-- Clearly describe what this PR implements -->

## Related Issue
<!-- Link to the issue this PR addresses -->
Fixes #<issue-number>

## Type of Change
- [ ] 🎉 New feature (non-breaking change)
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ♻️ Refactor (non-breaking change)
- [ ] 💥 Breaking change (fix or feature that would break existing functionality)
- [ ] 📚 Documentation update
- [ ] 🧪 Test addition/update

## Testing Checklist
- [ ] ✅ Unit tests added/updated
- [ ] ✅ Integration tests passing
- [ ] ✅ All existing tests pass
- [ ] ✅ Manual testing performed

## Screenshots
<!-- If applicable, add screenshots to help explain your changes -->

## Additional Notes
<!-- Any additional information reviewers should know -->
PR Review Process
Automated Checks

✅ All tests pass

✅ Code coverage maintained/increased

✅ Linting passes

✅ Build succeeds

Manual Review

👀 At least 1 maintainer approval required

💬 Address all review comments

🔄 Update PR based on feedback

Merge Requirements

📋 PR description completed

🎯 Linked to relevant issue

✅ All checks passing

👍 Required approvals obtained

🎨 Code Style Standards
HTML Standards
html
<!-- Use semantic HTML5 -->
<main class="main-content">
  <article class="article-card">
    <header class="article-card__header">
      <h1 class="article-card__title">Article Title</h1>
    </header>
    <section class="article-card__content">
      <p class="article-card__text">Content here</p>
    </section>
  </article>
</main>

<!-- Avoid -->
<div class="main">
  <div class="card">
    <div class="card-header">
      <div class="title">Article Title</div>
    </div>
    <div class="card-body">
      <div class="text">Content here</div>
    </div>
  </div>
</div>
CSS Standards (BEM Methodology)
css
/* Block */
.button {
  display: inline-block;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Element */
.button__icon {
  margin-right: 8px;
}

/* Modifier */
.button--primary {
  background-color: #0366d6;
  color: white;
}

.button--disabled {
  background-color: #6a737d;
  cursor: not-allowed;
}
JavaScript Standards
javascript
// Use ES6+ features
const userService = {
  // Use descriptive variable names
  async fetchUserProfile(userId) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw new Error('User not found');
    }
  },
  
  // Use destructuring
  updateUser({ id, name, email }) {
    return api.put(`/users/${id}`, { name, email });
  }
};

// Avoid
function getuser(x) {
  // ...
}
File Organization
text
src/
├── components/          # Reusable UI components
│   ├── Button/
│   │   ├── Button.js
│   │   ├── Button.module.css
│   │   └── Button.test.js
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── utils/              # Helper functions
├── constants/          # App constants
└── styles/             # Global styles
🧪 Testing Requirements
Test Structure
javascript
describe('UserService', () => {
  describe('fetchUserProfile', () => {
    it('should return user data for valid ID', async () => {
      // Arrange
      const userId = '123';
      const mockUser = { id: userId, name: 'John Doe' };
      
      // Act
      const result = await userService.fetchUserProfile(userId);
      
      // Assert
      expect(result).toEqual(mockUser);
    });
    
    it('should throw error for invalid ID', async () => {
      // Arrange
      const invalidId = 'invalid';
      
      // Act & Assert
      await expect(userService.fetchUserProfile(invalidId))
        .rejects.toThrow('User not found');
    });
  });
});
Testing Commands
bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/Button/Button.test.js

# Run linting
npm run lint

# Run type checking (if using TypeScript)
npm run type-check
Coverage Requirements
Statement coverage: ≥ 80%

Branch coverage: ≥ 70%

Function coverage: ≥ 80%

Line coverage: ≥ 80%

📚 Documentation
Inline Documentation
javascript
/**
 * Fetches user profile by ID
 * @param {string} userId - The user's unique identifier
 * @returns {Promise<User>} User profile data
 * @throws {Error} When user is not found
 * @example
 * const user = await fetchUserProfile('123');
 */
async function fetchUserProfile(userId) {
  // Implementation
}
README Updates
Update documentation for new features

Include code examples

Update API references

Add migration guides for breaking changes

🐛 Issue Reporting
Bug Report Template
markdown
## Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Environment
- OS: [e.g., Windows, macOS]
- Browser: [e.g., Chrome, Safari]
- Version: [e.g., 1.0.0]

## Additional Context
Screenshots, logs, etc.
Feature Request Template
markdown
## Problem Statement
What problem are you trying to solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other solutions you've considered?

## Additional Context
Screenshots, examples, etc.
👥 Community
Getting Help
Discussions: Check our GitHub Discussions

Discord: Join our community chat

Issues: Search existing issues before creating new ones

Recognition
We recognize contributors through:

👏 Shout-outs in release notes

🏆 Featured contributor spotlights

📈 Contribution leaderboards

Mentorship
New to open source? We offer:

🎯 "Good First Issue" labels

👨‍🏫 Mentor matching

📖 Detailed onboarding guides

🎉 Your First Contribution
Good First Issues
Look for issues labeled:

good first issue

help wanted

documentation

Steps for First Contribution
Find an issue labeled "good first issue"

Comment that you'd like to work on it

Follow the contribution guide

Ask questions in discussions if stuck

Submit your PR with "WIP" if it's a work in progress

<div align="center">
💫 Ready to Contribute?
We're excited to see what you'll build! Remember:

Every contribution matters - from documentation to bug fixes to new features.

Need help? Don't hesitate to ask in our Discussions or Discord.

Happy coding! 🚀

</div>
