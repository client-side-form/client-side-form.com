---
layout: page.njk
title: "Email Validation Without Regex Overreach"
description: "Strict email regexes reject real addresses — plus tags, long TLDs, internationalised domains, apostrophes. What a client-side email check should actually catch, a permissive rule that does it, typo suggestions for common domains, and why confirmation beats validation."
slug: email-validation-without-regex-overreach
type: howto
breadcrumb: "Email Validation"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Email Validation Without Regex Overreach"
  parent: "Synchronous Validation Patterns"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Email Validation Without Regex Overreach",
      "description": "Strict email regexes reject real addresses — plus tags, long TLDs, internationalised domains, apostrophes. What a client-side email check should actually catch, a permissive rule that does it, typo suggestions for common domains, and why confirmation beats validation.",
      "datePublished": "2026-09-18",
      "dateModified": "2026-09-18",
      "author": {
        "@type": "Organization",
        "name": "client-side-form.com"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Validation Logic & Schema Integration",
          "item": "https://client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Synchronous Validation Patterns",
          "item": "https://client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Email Validation Without Regex Overreach",
          "item": "https://client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/email-validation-without-regex-overreach/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate email addresses without rejecting real ones",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Use type=\"email\" with autocomplete=\"email\""
        },
        {
          "@type": "HowToStep",
          "name": "Check shape, not spec compliance"
        },
        {
          "@type": "HowToStep",
          "name": "Trim, and lowercase only the domain"
        },
        {
          "@type": "HowToStep",
          "name": "Suggest, never auto-correct"
        },
        {
          "@type": "HowToStep",
          "name": "Validate on blur"
        },
        {
          "@type": "HowToStep",
          "name": "Confirm by sending mail"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Isn't there an official regex for email addresses?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The full RFC 5322 grammar allows quoted local parts, comments and other forms that no real user types, and a regex implementing it is enormous. The HTML specification defines a simpler \"valid email address\" pattern for type=\"email\". Neither tells you whether an address works; only sending mail does."
          }
        },
        {
          "@type": "Question",
          "name": "Should I validate that the domain has MX records?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is possible on the server with a DNS lookup and catches some typos, but DNS failures, slow resolvers and domains that accept mail without MX records (falling back to A records) cause false rejections. If you do it, treat failure as a warning, not a block."
          }
        },
        {
          "@type": "Question",
          "name": "Which common domains should the suggestion list include?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The ones your users actually use — check your existing sign-up data for the top domains and their frequent misspellings. A short, relevant list produces fewer wrong suggestions than a long generic one."
          }
        }
      ]
    }
  ]
}
</script>

# Email Validation Without Regex Overreach

The email regex copied from a decade-old answer rejects `o'brien@example.com`, `ada+receipts@example.com`, `user@example.museum` and `jose@correo.españa` — real addresses belonging to real customers, who are told their email is "invalid" and cannot sign up.

A client-side email check has a modest job: catch obvious typing mistakes quickly and help the user correct them. Whether an address *exists* can only be answered by sending mail to it. This page, part of [synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/), replaces overreaching patterns with a permissive rule, adds typo suggestions that catch the mistakes people actually make, and places real verification where it belongs.

---

## Context and prerequisites

The address formats that strict patterns commonly reject, all valid and in use:

- **Plus addressing** — `ada+newsletter@example.com` (Gmail, Fastmail, many providers).
- **Apostrophes and other punctuation in the local part** — `o'brien@`, `first.last@`, `a_b-c@`.
- **Long and new TLDs** — `.museum`, `.photography`, `.london`; patterns with `{2,4}` for the TLD fail these.
- **Internationalised domain names** — `correo.españa` (sent over the wire as punycode `xn--espaa-rta`), and internationalised local parts under SMTPUTF8.
- **Subdomains** — `name@mail.department.example.ac.uk`.

Meanwhile the mistakes users actually make are different: a missing `@`, a space, a trailing dot, a comma instead of a dot, and domain typos such as `gmial.com` or `hotmail.con`. A good client check targets those.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of valid email addresses and whether a commonly copied strict regex accepts them, compared with a permissive rule." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Real addresses against a typical strict pattern</title>
  <desc>The address ada plus receipts at example dot com is rejected by a strict pattern that forbids plus signs and accepted by the permissive rule. o apostrophe brien at example dot com is rejected by the strict pattern and accepted permissively. user at example dot museum is rejected by a pattern limiting TLDs to four letters and accepted permissively. jose at correo dot españa is rejected by an ASCII-only pattern and accepted permissively. ada at example with no dot is accepted by both but flagged permissively as needing a domain ending.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Address</text>
  <text x="310.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Strict pattern</text>
  <text x="485.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Permissive rule</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">ada+receipts@example.com</text>
  <text x="310.2" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="485.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">accepted</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">o&#x27;brien@example.com</text>
  <text x="310.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="485.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">accepted</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">user@example.museum</text>
  <text x="310.2" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="485.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">accepted</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">jose@correo.españa</text>
  <text x="310.2" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="485.2" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">accepted</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">ada@example</text>
  <text x="310.2" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">accepted</text>
  <text x="485.2" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">asks for a domain ending</text>
</svg>

---

## The core pattern: a permissive check plus typo suggestions

```typescript
export type EmailCheck =
  | { ok: true; normalised: string; suggestion?: string }
  | { ok: false; message: string };

// One @, something before it, a dot somewhere after it with something on both
// sides, no whitespace. That is all a client can usefully require.
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/u;

const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "proton.me"];

export function checkEmail(raw: string): EmailCheck {
  const value = raw.trim();
  if (value === "") return { ok: false, message: "Enter your email address." };
  if (/\s/.test(value)) return { ok: false, message: "Email addresses cannot contain spaces." };
  const at = value.split("@").length - 1;
  if (at === 0) return { ok: false, message: "Enter an email address with an @, like name@example.com." };
  if (at > 1) return { ok: false, message: "Enter an email address with only one @." };
  if (value.endsWith(".")) return { ok: false, message: "Email addresses cannot end with a dot." };
  if (!SHAPE.test(value)) return { ok: false, message: "Enter the part after the @, like example.com." };

  const [local, domain] = value.split("@");
  // Normalise ONLY the domain: domains are case-insensitive; local parts may not be.
  const normalised = `${local}@${domain.toLowerCase()}`;
  const suggestion = suggestDomain(domain.toLowerCase());
  return { ok: true, normalised, suggestion: suggestion ? `${local}@${suggestion}` : undefined };
}

// Suggest a common domain if the typed one is within edit distance 2 (and not identical).
function suggestDomain(domain: string): string | undefined {
  let best: { d: string; dist: number } | undefined;
  for (const d of COMMON_DOMAINS) {
    const dist = levenshtein(domain, d);
    if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) best = { d, dist };
  }
  // Also catch wrong TLDs on common providers: gmail.con, hotmail.co
  const tldFix = domain.replace(/\.(con|cmo|comm|co)$/i, ".com");
  if (!best && tldFix !== domain && COMMON_DOMAINS.includes(tldFix)) return tldFix;
  return best?.d;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
```

A suggestion is not an error: show "Did you mean ada@gmail.com?" with a button to accept it, and let the user submit their original if it is correct.

---

## Step-by-step walkthrough

1. **Use `type="email"` with `autocomplete="email"`.** Mobile keyboards show `@` and `.`, and browsers autofill saved addresses — see [autocomplete tokens for autofill-friendly forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/).
2. **Check shape, not spec compliance.** One `@`, a non-empty local part, a domain containing a dot, no whitespace. Specific messages for each common mistake are more useful than one generic "invalid".
3. **Trim, and lowercase only the domain.** Leading and trailing spaces from copy-paste are never intended. Local parts are technically case-sensitive; most providers ignore case, but you should not change what the user typed there.
4. **Suggest, never auto-correct.** A typo suggestion is a question. Silently changing `gmial.com` to `gmail.com` would be wrong for the user whose domain really is `gmial.com`.
5. **Validate on blur.** Email is typed in bursts; checking per keystroke shows "Enter the part after the @" while the user is still typing it. Use the timing in [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/).
6. **Confirm by sending mail.** The only real validation is a confirmation link or code. Design the flow so an unverified address can be corrected easily.

### Why "confirm your email" fields do not help

Asking users to type their email twice feels like it should catch typos, but people copy the first field into the second, or make the same slip twice, and the second field adds friction for everyone — especially on mobile and for people using switch access or voice input. A clear display of the entered address before submit ("We'll send your receipt to ada@example.com — change"), typo suggestions for common domains, and a confirmation email with an easy way to correct the address catch far more mistakes with less effort.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of email handling from the input&#x27;s type and autocomplete attributes, through the permissive blur check and typo suggestion, to server normalisation and a confirmation email." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>From typing to a verified address</title>
  <desc>The input uses type email and autocomplete email so mobile keyboards and autofill help. On blur, the permissive check catches missing at signs, spaces and missing domain endings with specific messages. If the domain looks like a typo of a common provider, a suggestion is offered and the user may accept it. The server repeats the shape check and normalises the domain. A confirmation email proves the address works, with a way to change it if it does not arrive.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="347.3" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Input attributes</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">type=email, autocomplete=email</text>
  <text x="391.3" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Right keyboard; autofill fills most addresses correctly.</text>
  <path d="M187.7,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="183.7,89.0 187.7,96.0 191.7,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="347.3" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Permissive check on blur</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">@, domain ending, no spaces.</text>
  <text x="391.3" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Specific message per mistake.</text>
  <path d="M187.7,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="183.7,174.0 187.7,181.0 191.7,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="347.3" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Typo suggestion</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">gmial.com → gmail.com?</text>
  <text x="391.3" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A question with an Accept button, never an auto-correction.</text>
  <path d="M187.7,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="183.7,259.0 187.7,266.0 191.7,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="347.3" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Confirmation email</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The only real verification.</text>
  <text x="391.3" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Easy to change the address if nothing arrives.</text>
</svg>

---

## Failure modes and edge cases

### 1. The browser's own `type="email"` validation

Native validation for `type="email"` uses a deliberately simple pattern defined in the HTML spec, which does not accept internationalised domains in Unicode form in every browser. With `novalidate` and your own rule you control this; without it, some browsers block `jose@correo.españa`.

### 2. Disposable-domain blocklists

Blocking disposable email providers is a business decision with a cost: blocklists are incomplete and occasionally include legitimate providers. If you do it, do it on the server with a clear message, not as a client "invalid email".

### 3. Uniqueness checks

"This email is already registered" is an async check, run after the shape passes — see [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/). Consider the privacy implication: it reveals which addresses have accounts.

### 4. Schema library defaults

`z.string().email()` and similar helpers use their own patterns, which have changed between versions and may reject some valid addresses. Test your library's rule against the table above, and substitute a custom `refine` with the permissive check if needed.

### 5. Case-sensitive comparisons

If accounts are looked up by exact string match, `Ada@Example.com` and `ada@example.com` become two accounts. Normalise the domain everywhere, and decide deliberately whether to lowercase the local part for lookups.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting the goals of a client-side email check with the goals that only server-side verification can meet." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the client check is for</title>
  <desc>The client-side check should catch missing at signs, spaces, missing domain endings and common domain typos quickly, with specific messages and suggestions. It should not try to decide whether an address exists, whether its mailbox accepts mail, or whether a domain is disposable; those need the server and a confirmation email.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Client check does</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Missing @, spaces, trailing dot.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Missing domain ending.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Typo suggestions for common domains.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Client check does not</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Decide the address exists.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Decide the mailbox accepts mail.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Police disposable domains.</text>
</svg>

---

## Verification checklist

- [ ] Plus-addressed, apostrophe, long-TLD and internationalised addresses are accepted.
- [ ] Missing `@`, spaces and trailing dots get specific messages.
- [ ] Common domain typos produce an optional suggestion, not an error.
- [ ] Leading and trailing whitespace is trimmed; the local part's case is preserved.
- [ ] Validation runs on blur, not mid-typing.
- [ ] The input uses `type="email"` and `autocomplete="email"`.
- [ ] Accounts are looked up with a normalised domain.
- [ ] A confirmation email verifies the address, with an easy way to correct it.

---

## Frequently Asked Questions

<details>
<summary><strong>Isn't there an official regex for email addresses?</strong></summary>

The full RFC 5322 grammar allows quoted local parts, comments and other forms that no real user types, and a regex implementing it is enormous. The HTML specification defines a simpler "valid email address" pattern for `type="email"`. Neither tells you whether an address works; only sending mail does.

</details>

<details>
<summary><strong>Should I validate that the domain has MX records?</strong></summary>

It is possible on the server with a DNS lookup and catches some typos, but DNS failures, slow resolvers and domains that accept mail without MX records (falling back to A records) cause false rejections. If you do it, treat failure as a warning, not a block.

</details>

<details>
<summary><strong>Which common domains should the suggestion list include?</strong></summary>

The ones your users actually use — check your existing sign-up data for the top domains and their frequent misspellings. A short, relevant list produces fewer wrong suggestions than a long generic one.

</details>

---

## Related

- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/)
- [Composing Pure Validator Functions](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/composing-pure-validator-functions/)
- [Writing Error Messages That Tell the Reader What to Do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/)

← [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/)
