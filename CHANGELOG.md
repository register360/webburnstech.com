# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Added
- Encouraging contributions: Future contributors should update this section with their planned changes before submitting a Pull Request.

---

## [1.0.0] - 2025-10-20

Initial Release of the WebburnsTech project. This version establishes the core marketing website and a suite of supporting backend API services.

### Added
- **Core Website and UI (Tirukoti Vinay)**:
    - Initial commit of the main landing page (`webburns_tech.html`) with Hero section, About, Team, Portfolio, and Contact sections.
    - Implementation of a modern UI/UX theme with Dark/Light mode toggle (`videos/base.css`, `videos/base.js`).
- **Comprehensive Services Pages (Tirukoti Vinay)**:
    - Dedicated detail pages for Web Development, Mobile Development, UI/UX Design, SEO Optimization, and Digital Strategy.
- **AI Assistant Integration (Tirukoti Vinay)**:
    - Integration of two separate AI chatbot backends using Mistral and DeepSeek APIs for user support and general knowledge assistance (`AI Server/server.js`, `Deepseek Server/server.js`).
- **Developer API Management (Tirukoti Vinay)**:
    - Full-stack API management system including user authentication via Email/Password, Google OAuth, GitHub OAuth, and API key generation/validation endpoints (`Developer/server.js`).
- **Contact Form Backend (Tirukoti Vinay)**:
    - Server-side logic for handling contact form submissions using Resend for reliable email delivery (`server/server.js`).
- **Job Application System (Tirukoti Vinay)**:
    - Backend API for handling multi-part job applications, including file uploads (resumes/cover letters), MongoDB storage, and email confirmation to applicants (`Job server/server.js`).
- **Documentation and Standards (Tirukoti Vinay)**:
    - Setup of essential project documentation files: `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and project citation standards (`CITATION.cff`).
    - Initial drafts of legal and support policies: `PRIVACY.md`, `SECURITY.md`, and `SUPPORT.md`.
- **Payment Processing Integration (Tirukoti Vinay)**:
    - Backend server for processing payments using Stripe, including webhook handling for status updates (`Payment Server/Server.js`).

### Fixed
- *No fixes to report in this initial release.*

### Changed
- *No changes to report in this initial release.*

### Removed
- *No features were removed in this initial release.*

---

## 📝 Contribution Note

**Encouragement for Future Contributors:**

When contributing to this project, please ensure you update this `CHANGELOG.md` file under the `[Unreleased]` section. Format your changes using the appropriate heading (**Added**, **Fixed**, **Changed**, **Removed**).

When merging a new release, follow these steps:
1.  Replace `[Unreleased]` with the new version number and current date (e.g., `[1.1.0] - YYYY-MM-DD`).
2.  Add a new empty `[Unreleased]` section at the top.
3.  Include your name in parentheses after your changes.
4.  Link any relevant Pull Requests or Issues if applicable.
