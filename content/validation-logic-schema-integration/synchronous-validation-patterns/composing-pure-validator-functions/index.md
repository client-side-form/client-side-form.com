---
layout: page.njk
title: "Composing Pure Validator Functions"
description: "Build synchronous validation from small pure functions — required, minLength, pattern, custom rules — composed with first-error and all-errors combinators, conditional rules, typed messages and field context, without a schema library."
slug: composing-pure-validator-functions
type: howto
breadcrumb: "Composing Validators"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Composing Pure Validator Functions"
  parent: "Synchronous Validation Patterns"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Composing Pure Validator Functions",
      "description": "Build synchronous validation from small pure functions — required, minLength, pattern, custom rules — composed with first-error and all-errors combinators, conditional rules, typed messages and field context, without a schema library.",
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
          "name": "Composing Pure Validator Functions",
          "item": "https://client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/composing-pure-validator-functions/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Compose small pure validators into field and form validation",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Write atomic rules that check one thing"
        },
        {
          "@type": "HowToStep",
          "name": "Order rules with first"
        },
        {
          "@type": "HowToStep",
          "name": "Pass form values as context"
        },
        {
          "@type": "HowToStep",
          "name": "Express conditions with when"
        },
        {
          "@type": "HowToStep",
          "name": "Return codes as well as messages"
        },
        {
          "@type": "HowToStep",
          "name": "Keep the rules table next to the form"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use this instead of Zod?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They solve overlapping problems. Composed validators excel at field-level UX rules with precise ordering and messages; schemas excel at typed data contracts, nesting and coercion. Many teams use a schema for the payload and a few composed rules for fine-grained field feedback."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle async rules in the same table?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Keep them separate. Synchronous rules run instantly and gate the async ones: only when the synchronous validator for a field passes should an availability check start, as in implementing async email availability checks."
          }
        },
        {
          "@type": "Question",
          "name": "Where do translated messages fit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pass message keys instead of sentences (required(\"errors.email.required\")) and translate at render, or build the rules table per locale. Codes make both approaches straightforward."
          }
        }
      ]
    }
  ]
}
</script>

# Composing Pure Validator Functions

Validation code that starts as `if (!email) errors.email = "Required"; else if (!email.includes("@")) …` grows into a nested thicket where every field reimplements "required", messages drift in wording, and adding one rule to one field means reading all of them.

Small pure functions composed with a couple of combinators give the same power as a schema library for the synchronous, per-field case — with no dependency and code you can read in one sitting. This page builds that toolkit, part of the [synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) topic, and shows where it hands over to schemas and async checks.

---

## Context and prerequisites

A validator here is a pure function from a value (and optional context) to either `null` (valid) or an error. Pure means: no DOM access, no side effects, same output for the same input. That makes validators trivial to test, safe to run on every keystroke, and reusable on the server.

Composition needs two decisions:

- **First error or all errors?** Most fields show one message at a time, the first failure in a sensible order ("Enter your password" before "Use at least 12 characters"). Password rule checklists want all failures at once.
- **How do rules see other fields?** Cross-field rules ("confirm must match password") need the whole form's values as context, passed as a second argument — never read from a closure over mutable state.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing the building blocks of composable validation — atomic rules, a first-error combinator, a conditional wrapper and a form-level runner." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The building blocks</title>
  <desc>Atomic rules such as required, min length and pattern each check one thing and return an error code and message or null. The first combinator runs rules in order and returns the first failure. The when wrapper applies a rule only if a condition on the form values holds. The form runner applies each field&#x27;s composed validator with the whole form as context and collects one error per field.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Atomic rules</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required, minLength,</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">pattern, custom.</text>
  <path d="M156.0,47.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,43.5 183.0,47.5 176.0,51.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">first(...)</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Run in order.</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Return the first failure.</text>
  <path d="M326.0,47.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,43.5 353.0,47.5 346.0,51.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">when(cond, rule)</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Conditional rules from</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">form values.</text>
  <path d="M496.0,47.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,43.5 523.0,47.5 516.0,51.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">validateForm</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One error per field.</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Form values as context.</text>
</svg>

---

## The core pattern: typed rules and combinators

```typescript
export interface RuleError { code: string; message: string }
export type Rule<V, F = Record<string, unknown>> = (value: V, form: F) => RuleError | null;

// ---- Atomic rules: each checks ONE thing -------------------------------
const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export const required = (message: string): Rule<unknown> =>
  (v) => (isBlank(v) ? { code: "required", message } : null);

export const minLength = (n: number, message: string): Rule<string> =>
  // Skip blank values: "required" is responsible for them, so a blank optional
  // field never shows "too short".
  (v) => (!isBlank(v) && v.trim().length < n ? { code: "minLength", message } : null);

export const pattern = (re: RegExp, message: string): Rule<string> =>
  (v) => (!isBlank(v) && !re.test(v) ? { code: "pattern", message } : null);

export const oneOf = <T>(allowed: readonly T[], message: string): Rule<T> =>
  (v) => (!isBlank(v) && !allowed.includes(v) ? { code: "oneOf", message } : null);

// ---- Combinators -------------------------------------------------------
export const first = <V, F>(...rules: Rule<V, F>[]): Rule<V, F> =>
  (v, form) => { for (const r of rules) { const e = r(v, form); if (e) return e; } return null; };

export const all = <V, F>(...rules: Rule<V, F>[]) =>
  (v: V, form: F): RuleError[] => rules.map((r) => r(v, form)).filter((e): e is RuleError => e !== null);

export const when = <V, F>(cond: (form: F) => boolean, rule: Rule<V, F>): Rule<V, F> =>
  (v, form) => (cond(form) ? rule(v, form) : null);

export const matches = <F extends Record<string, unknown>>(other: keyof F, message: string): Rule<unknown, F> =>
  (v, form) => (!isBlank(v) && v !== form[other] ? { code: "matches", message } : null);

// ---- Form runner -------------------------------------------------------
export function validateForm<F extends Record<string, unknown>>(
  values: F,
  fields: { [K in keyof F]?: Rule<F[K], F> },
): Partial<Record<keyof F, RuleError>> {
  const out: Partial<Record<keyof F, RuleError>> = {};
  for (const key of Object.keys(fields) as (keyof F)[]) {
    const e = fields[key]!(values[key], values);
    if (e) out[key] = e;
  }
  return out;
}
```

```typescript
type Signup = { accountType: "personal" | "business"; company: string; email: string; password: string; confirm: string };

const signupRules = {
  company: when((f: Signup) => f.accountType === "business", required("Enter your company name.")),
  email: first(required("Enter your email address."), pattern(/^[^\s@]+@[^\s@]+$/, "Enter an email like name@example.com.")),
  password: first(required("Create a password."), minLength(12, "Use at least 12 characters.")),
  confirm: first(required("Re-enter your password."), matches<Signup>("password", "Passwords do not match.")),
};

const errors = validateForm(values, signupRules);
```

---

## Step-by-step walkthrough

1. **Write atomic rules that check one thing.** `required` checks presence; `minLength` checks length and deliberately passes blanks so an optional field never says "too short".
2. **Order rules with `first`.** Presence, then format, then business rules — so the message always addresses the most basic problem.
3. **Pass form values as context.** Cross-field rules read `form`, not outer variables, so they stay pure and testable — the approach in [password confirmation validation pattern](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/).
4. **Express conditions with `when`.** A rule that only applies for business accounts is data-driven and visible in the rules table, matching the relevance idea in [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/).
5. **Return codes as well as messages.** Codes let the UI choose presentation (a required marker, a checklist tick) and let translation happen outside the rule.
6. **Keep the rules table next to the form.** One object describes every field's validation; reviewers see all of it at once.

### Why pure functions pay off beyond forms

Because each rule is a plain function with no dependencies, the same rules table can run in the browser on blur, in a unit test with a table of inputs, in a Web Worker for large forms, and on the server in a Node API route. The table becomes a small, shared contract. Compared with ad-hoc `if` chains inside components, pure rules also make timing a separate concern: *what* is valid is defined once, and *when* to show it is decided by the form's timing policy — the split that [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/) depends on.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing, for one example signup input, the rules each field runs in order and the error returned." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The signup rules table evaluated for one input</title>
  <desc>For a personal account, the company rule is skipped by when, so no error. For the email ada at, required passes and the pattern fails, returning enter an email like name at example dot com. For the password short, required passes and minimum length fails, returning use at least 12 characters. For the confirm field containing shorter, required passes and matches fails, returning passwords do not match.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="128.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Value</text>
  <text x="258.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rules run</text>
  <text x="467.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Result</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">company</text>
  <text x="128.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;&quot; (personal)</text>
  <text x="258.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">when → skipped</text>
  <text x="467.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">none</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">email</text>
  <text x="128.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;ada@&quot;</text>
  <text x="258.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required ✓ → pattern ✗</text>
  <text x="467.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Enter an email like name@example.com.</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">password</text>
  <text x="128.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;short&quot;</text>
  <text x="258.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">required ✓ → minLength ✗</text>
  <text x="467.4" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Use at least 12 characters.</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">confirm</text>
  <text x="128.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;shorter&quot;</text>
  <text x="258.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required ✓ → matches ✗</text>
  <text x="467.4" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Passwords do not match.</text>
</svg>

---

## Failure modes and edge cases

### 1. Rules that depend on "now"

A "must be in the future" rule that calls `new Date()` inside is impure and flaky in tests. Pass the current time in context (`form.__now` or a separate context argument) so tests can fix it.

### 2. Blank handling in every rule

If `minLength` does not skip blanks, an empty optional field shows "too short". Centralise `isBlank` and use it in every rule except `required`.

### 3. Trimming inconsistently

One rule trims, another does not, and `"  "` is "present" to one and "blank" to another. Decide once: trim for presence and length checks, and normalise the stored value on blur if leading and trailing spaces are never meaningful.

### 4. Growing into a schema library

When you need nested objects, arrays with index paths, type coercion and inferred TypeScript types, a schema library does it better. Keep composed validators for field-level UX rules, and let a schema such as Zod own the data contract — the trade-off discussed in [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/).

### 5. Performance

Pure rules are cheap, but running every rule of a 300-field form on each keystroke is wasteful. Validate the changed field (and its dependents) per keystroke, and the whole table on submit.

<svg viewBox="0 0 680 102" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing how many field validators run for one keystroke when validating the whole form versus only the changed field and its dependents." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Rules run per keystroke in a 300-field form</title>
  <desc>Counting validator invocations for one keystroke in a form of 300 fields where the edited field has two dependents. Validating the whole form runs all 300 field validators. Validating only the changed field and its dependents runs three.</desc>
  <rect x="0" y="0" width="680" height="102" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="64.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">validate whole form</text>
  <rect x="204.0" y="16.0" width="352.0" height="14" rx="3" fill="#a63d6f"/>
  <text x="564.0" y="26.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">300 validators</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">changed field + dependents</text>
  <rect x="204.0" y="42.0" width="3.5" height="14" rx="3" fill="#2d6342"/>
  <text x="215.5" y="52.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">3 validators</text>
  <text x="14.0" y="90.0" font-size="10" fill="#6b5f75" font-family="inherit">A count, not a timing: the whole-form pass belongs on submit.</text>
</svg>

---

## Verification checklist

- [ ] Every rule is a pure function of value and form context.
- [ ] Blank optional fields never show length or format errors.
- [ ] Each field shows the most basic failure first.
- [ ] Conditional rules are expressed with `when`, visible in the rules table.
- [ ] Errors carry a code and a message.
- [ ] Rules are unit-tested with a table of inputs and expected codes.
- [ ] Keystroke validation runs only the changed field and its dependents.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use this instead of Zod?</strong></summary>

They solve overlapping problems. Composed validators excel at field-level UX rules with precise ordering and messages; schemas excel at typed data contracts, nesting and coercion. Many teams use a schema for the payload and a few composed rules for fine-grained field feedback.

</details>

<details>
<summary><strong>How do I handle async rules in the same table?</strong></summary>

Keep them separate. Synchronous rules run instantly and gate the async ones: only when the synchronous validator for a field passes should an availability check start, as in [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/).

</details>

<details>
<summary><strong>Where do translated messages fit?</strong></summary>

Pass message keys instead of sentences (`required("errors.email.required")`) and translate at render, or build the rules table per locale. Codes make both approaches straightforward.

</details>

---

## Related

- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/)
- [Email Validation Without Regex Overreach](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/email-validation-without-regex-overreach/)
- [Property-Based Testing for Validators](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/property-based-testing-for-validators/)

← [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/)
