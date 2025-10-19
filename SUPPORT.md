```markdown
# Support Guide — WebburnsTech

Last updated: 2025-10-19

## Purpose

This document explains how to get help for WebburnsTech products, websites, and open-source projects maintained under register360/webburnstech.com. It describes our preferred contact channels, what information to provide, expected response targets, and escalation paths. Our goal is to resolve issues quickly while protecting user privacy and ensuring responsible handling of sensitive data.

## When to Contact Support

Use the channels below depending on the nature of your request:

- Report a security vulnerability: Do NOT use public issues — see SECURITY.md and contact security@webburnstech.dev.
- Production outage, service interruption, or data loss: Use Email escalation (see "Emergency / Outage Reporting" below).
- Bug reports, usage questions, or feature requests for this repository: Open a GitHub issue (public, non-sensitive) or email support if you prefer private handling.
- Billing, account, or service-administration issues: Email support@webburnstech.dev.

## Contact Channels

- Primary (sensitive or account-related): support@webburnstech.dev
- Public (non-sensitive): GitHub Issues — https://github.com/register360/webburnstech.com/issues
  - When opening an issue, prefix the title with “[SUPPORT]”.
  - Do not include passwords, private API keys, or other secrets in public issues.

If you need encrypted communication for sensitive attachments, see the Encryption note below.

## How to File an Effective Support Request

Providing clear, complete information helps us triage and resolve issues faster. When contacting us, please include the following:

- Subject / short summary:
- Component / repository / URL(s) affected:
- Environment:
  - Web browser and version, OS, device
  - Application version, commit SHA, or branch (if applicable)
- Steps to reproduce (detailed, numbered):
- Expected result vs actual result:
- Error messages or HTTP response codes (copy/paste logs if possible):
- Screenshots, recordings, or PoC code (encrypt if sensitive):
- Time (UTC) when the problem occurred:
- Severity / impact estimate (High / Medium / Low) and business impact:
- Contact information and preferred method/time for follow-up:
- Any temporary mitigations you have tried (and their results):

Suggested subject format for email: [SUPPORT] <Component> — Short description

## Support Triage and Response Targets

We aim to respond and resolve issues in a timely, transparent manner. Targets below are guidelines and may vary by workload, complexity, and support tier.

- Acknowledgement: within 1 business day (usually within 24 hours)
- Critical / Service outage (production degraded, data loss, active compromise): initial response within 4 business hours; continuous updates until contained.
- High (major functionality broken for many users): initial response within 1 business day; target remediation or mitigation within 7–30 days depending on complexity.
- Medium (single-user impact or non-critical functionality): initial response within 3 business days; remediation timeline depends on priority and release schedule.
- Low (cosmetic, enhancement requests): response within 7 business days; scheduled per roadmap.

If you require an SLA with guaranteed response or remediation times, contact support@webburnstech.dev to discuss commercial support options.

## Emergency / Outage Reporting

For incidents causing active service disruption or security incidents that affect production availability, email support@webburnstech.dev with:

- Subject: OUTAGE — <service or site name> or SECURITY — <short summary>
- Include: Affected service, severity, timestamps, and contact phone/alternate email (if immediate follow-up is required).

We will make best-effort outreach to incident responders and provide status updates until service is restored.

## Supported Versions and Releases

We support the latest published release and the active main branch for the webburnstech.com site and repositories. For clarity:

- Supported branch: main (latest)
- Supported releases: see repository releases/tags

If your report affects an older unreleased branch or a third-party dependency, indicate that in your request; remediation may require updating dependencies or addressing upstream issues.

## Privacy, Logs, and Data Sharing

- Do not share user-sensitive data or PII in public GitHub issues.
- If logs or attachments contain sensitive information, encrypt them or send via email to support@webburnstech.dev. By default, we will treat provided data as necessary to investigate and will follow applicable privacy practices.
- We may request temporary access (e.g., test account credentials). Provide such access via secure channels and do not share production user credentials.

## Encryption for Sensitive Attachments

If you must share sensitive proof-of-concept files, logs, or credentials, use PGP or another secure channel. For PGP, contact support@webburnstech.dev to obtain the current public key or instructions for secure upload.

## Escalation

If a support request is not progressing or needs faster attention:

1. Reply to the support ticket/email quoting the original ticket ID or GitHub issue URL.
2. If no response within the stated target for your severity, add “ESCALATE” to the subject (email) or comment on the support issue.
3. For critical matters that remain unresolved, clearly indicate business impact and request an escalation to management by emailing support@webburnstech.dev with “URGENT ESCALATION” in the subject.

## What We Do Not Support via This Channel

- Public disclosure of security vulnerabilities: use security@webburnstech.dev (see SECURITY.md).
- General questions about third-party services or tooling not included in our repositories — contact the upstream project.
- Social-engineering or account takeover requests — these are investigated and routed through secure account recovery channels.

## Contributing & Community Support

For contributions, bug fixes, or feature requests, see CONTRIBUTING.md (if present) and open a well-scoped GitHub pull request. Community discussions (feature ideas, general help) are encouraged via repository issues labeled “discussion” or by following contribution guidelines in the repo.

## Supporter / Maintainer Responsibilities

Maintainers will:
- Acknowledge incoming requests promptly.
- Triage and assign severity based on impact and reproducibility.
- Communicate progress and expected timelines to the requester.
- Coordinate with security and operations teams where appropriate.
- Keep sensitive investigations out of public issues until coordinated disclosure is agreed.

## Support Request Template (Copy / Paste)

Subject: [SUPPORT] <Component> — <Short description>

Body:
- Component / repo / URL:
- Environment (browser, OS, version, commit SHA):
- Steps to reproduce:
- Expected vs actual behavior:
- Error messages / logs:
- Attachments: (encrypted if sensitive)
- Severity / business impact:
- Preferred contact & availability:

## Thank You

We appreciate your patience and your contributions to improving WebburnsTech. Clear, well-formed reports help us resolve issues faster — thank you for working with us to keep WebburnsTech reliable and useful.

For security reports, please consult SECURITY.md and email security@webburnstech.dev.
```
