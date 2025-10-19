# Security Policy

## Supported Versions

We currently support the latest version of this website available in the `main` branch. Older versions may not receive security updates or patches.

| Version | Supported |
|---------|-----------|
| main    | ✅        |
| others  | ❌        |

## Reporting a Vulnerability

We take security seriously at **WebburnsTech**. If you discover any security vulnerabilities in this project, please follow the steps below to responsibly disclose them.

### 📫 Contact

- **Email:**webburnstech@gmail.com  
- **GitHub Issues (preferred for non-sensitive bugs):** [Open an issue](https://github.com/register360/webburnstech.com/issues)

For sensitive issues, please use email and provide:
- A detailed description of the vulnerability.
- Steps to reproduce the issue.
- Any proof of concept (PoC) code, if available.

We aim to acknowledge and respond to all security reports within **3 working days**.

## Disclosure Policy

- We request that you **do not disclose** the vulnerability publicly until we’ve had a reasonable amount of time to investigate and patch the issue.
- We will provide public credit (with your permission) after the vulnerability is confirmed and resolved.

## Scope
# Security Policy for WebburnsTech

Last updated: 2025-10-19

## Introduction

WebburnsTech is committed to protecting the security, privacy, and safety of our users, our services, and the open-source software we publish. We take reports of security vulnerabilities seriously and welcome responsible disclosure from the security research community. This document describes how to report vulnerabilities, how we handle reports, what is in- and out-of-scope, and the expectations we have for researchers and contributors.

## Contact — How to Report a Vulnerability

For reporting security issues, please use the following:

- Primary email (preferred for sensitive reports): security@webburnstech.dev
- For less-sensitive issues (e.g., non-exploitable bugs): open a GitHub issue at https://github.com/register360/webburnstech.com/issues and prefix the title with [SECURITY]. Do not include exploit details in a public issue.

When emailing, please include:

- Affected component(s) (repository name, web URL, API endpoint, versions).
- Clear steps to reproduce, expected vs actual behavior.
- Proof-of-concept (PoC) code or screenshots where applicable (encrypt attachments if they contain sensitive details).
- Any temporary mitigation/workaround that reduces risk.
- Your contact preference for follow-up and whether you request anonymity or credit.

## Encryption for Sensitive Reports

To protect sensitive PoC and exploit details, you may encrypt messages to us:

- PGP key ID: 0xD4C3B2A1F0E9D8C7
- Fingerprint: D4C3 B2A1 F0E9 D8C7 0123 4567 89AB CDEF 1234 5678

If you require the public key file or cannot use PGP, please contact security@webburnstech.dev and we will provide an alternative secure channel.

## Rules for Responsible Disclosure

We appreciate coordinated and responsible disclosure. By reporting vulnerabilities you agree to:

- Do not disclose the vulnerability publicly (including blog posts, social media, or public issues) until we have resolved the issue and coordinated disclosure with you.
- Do not sell, transfer, or otherwise publish exploit code or active exploits.
- Only perform testing on systems and accounts you own or that you have explicit permission to test.
- Avoid privacy-invasive techniques or exfiltrating user data beyond what is strictly necessary to demonstrate the issue.
- Avoid service degradation actions such as large-scale denial-of-service testing.
- Stop testing immediately if requested by the WebburnsTech security team.

Failure to follow these rules may result in revocation of safe-harbor protections and could require us to involve law enforcement or take legal action.

## How We Handle Reports

When you report a vulnerability, we will follow these steps:

1. Acknowledgement
   - We will acknowledge receipt of your report within 3 business days.

2. Triage
   - We will triage the report and assign an initial severity level within 7 business days.
   - Triage may include reproducing the issue, determining affected versions/components, and estimating exploitability.

3. Remediation
   - For confirmed issues we will:
     - Prioritize fixes according to severity and impact.
     - Provide mitigations or workarounds when an immediate fix is not available.
     - Create and track a private issue, branch, or advisory as needed.

   - Target remediation timelines:
     - Critical / actively exploited: aim to provide patch/mitigation within 72 hours, or publish a mitigation if a full fix requires more time.
     - High severity: aim to provide a patch or mitigation within 30 days.
     - Medium/Low severity: timelines will vary; we will communicate estimated timelines in our triage response.

4. Public Disclosure & Credit
   - We will coordinate public disclosure with the reporter. We will not publicly disclose details before a fix or an agreed coordination period.
   - We will offer public credit to the reporter unless they request anonymity.
   - When applicable we will publish a security advisory, release notes, and, where appropriate, request or assign a CVE identifier.

## Scope

In-scope
- All code and assets in repositories under the register360/webburnstech.com GitHub organization.
- WebburnsTech public web applications and APIs hosted by WebburnsTech (the “WebburnsTech site” and related endpoints).
- Documentation, build tooling, and CI/CD pipelines that are part of the project and maintained by the WebburnsTech team.
- Third-party dependencies used directly by our repositories (we expect reporters to follow responsible disclosure for third-party projects and notify maintainers as appropriate).

Out-of-scope
- Vulnerabilities in third-party software or services not maintained or bundled by WebburnsTech (report to the upstream vendor).
- Robustness issues that require physical access to hardware or the user’s device.
- Social-engineering attacks targeting WebburnsTech staff or users.
- Denial-of-Service testing of production systems without prior written permission.

If you are unsure whether something is in-scope, please contact security@webburnstech.dev before testing.

## Security Best Practices for Contributors

We ask contributors and maintainers to follow secure development practices:

- Never commit secrets, credentials, API keys, or private keys to the repository. Use environment variables, secret managers, or CI secret storage.
- Use .gitignore and secret-scanning tools to prevent accidental commits of sensitive data.
- Enable two-factor authentication (2FA) on GitHub accounts and prefer hardware-backed keys.
- Sign commits and tags where practical to ensure provenance.
- Follow secure coding practices: validate inputs, use parameterized queries, sanitize outputs, and follow the principle of least privilege.
- Keep dependencies up to date and enable dependency scanning (e.g., Dependabot or other SCA tools).
- Require code review for all pull requests and include security-focused reviewers for sensitive areas.
- Run automated tests, linters, and security tooling in CI pipelines.

## Incident Response Process

If an incident is detected or reported, our incident response follows this high-level process:

1. Detect & Triage — Confirm the incident and scope impacted systems.
2. Contain — Apply immediate mitigations to prevent further damage (take affected services offline if needed).
3. Eradicate — Remove the root cause and affected artifacts (e.g., malicious code, compromised credentials).
4. Recover — Restore services to full operation and verify systems are hardened.
5. Notify — Notify affected users, partners, and regulatory bodies as required by law and our policies. Notifications will include:
   - What happened and the scope of impact
   - What the company did in response
   - Steps users should take to protect themselves
   - Contact information for follow-up
6. Post-incident review — Conduct a postmortem, identify improvements, and publish a summary where appropriate.

We will communicate status updates to the reporter during the incident and publish a public advisory when appropriate.

## Legal Safe Harbor

WebburnsTech supports good-faith security research and will not pursue legal action against researchers who:

- Follow this policy,
- Avoid privacy-invasive actions and disruption of production services,
- Immediately stop testing if asked to do so by the WebburnsTech security team.

This safe-harbor does not apply to researchers who go beyond these boundaries, exfiltrate data, introduce persistent harmful modifications, or engage in extortion. We reserve the right to involve law enforcement when necessary.

This policy does not provide authorization to hack or access systems that you do not have explicit permission to test. If you are unsure, ask us first at security@webburnstech.dev.

## Disclosure Timeline Example (Illustrative)

- Acknowledgement: within 3 business days
- Triage: within 7 business days
- Temporary mitigation for critical issues: within 72 hours where feasible
- Patch for critical/high issues: ideally within 30 days, depending on complexity
- Coordinated public disclosure: after a patch and mutual agreement, typically within 30–90 days

Actual timelines may vary; we will communicate status and expected timelines during triage.

## Reporting Template (Suggested)

To help us triage faster, please include:

- Component / repo / URL:
- Affected versions / branches:
- Severity (if you have an estimate):
- Detailed steps to reproduce:
- Proof-of-concept (code/snippets/screenshots) — encrypt if sensitive:
- Mitigations or rollback steps you recommend:
- Your contact preference and whether you want public credit:

The security policy applies to the following components:

- HTML/CSS/JavaScript in this repository (`webburns_tech.html`, `style.css`, etc.)
- Any public APIs or integrations visible via this website.
- Third-party dependencies used in this repository (excluding external links to services not under our control).

## Out of Scope

- Social engineering attacks.
- Denial of Service (DoS) without proof of exploitability.
- Vulnerabilities requiring physical access to the user's device.
- Issues related to browsers, frameworks, or platforms beyond our control.

## Best Practices Followed

- ✅ No sensitive credentials are committed to the repository.
- ✅ All form inputs are validated client-side (and optionally server-side if backend exists).
- ✅ External scripts are reviewed and monitored for changes.

---
## Thank You

We sincerely appreciate the time and effort of security researchers and contributors who help us improve WebburnsTech’s security posture. Your responsible disclosure helps keep our users and systems safe. If you find a vulnerability, please reach out to security@webburnstech.dev — we will treat your report with the utmost priority and respect.
Thank you for helping us keep **WebburnsTech** safe!
-- The WebburnsTech Security Team
