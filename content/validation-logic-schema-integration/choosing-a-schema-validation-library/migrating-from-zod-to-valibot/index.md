---
layout: page.njk
title: "Migrating From Zod to Valibot"
description: "Move form schemas from Zod's method chains to Valibot's pipe-based functions for smaller bundles: mapping the APIs, pipes and actions, forward() for cross-field issues, flatten() for form errors, and resolver changes in form libraries."
slug: migrating-from-zod-to-valibot
type: howto
breadcrumb: "Zod to Valibot"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Migrating From Zod to Valibot"
  parent: "Choosing a Schema Validation Library"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Migrating From Zod to Valibot",
      "description": "Move form schemas from Zod's method chains to Valibot's pipe-based functions for smaller bundles: mapping the APIs, pipes and actions, forward() for cross-field issues, flatten() for form errors, and resolver changes in form libraries.",
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
          "name": "Choosing a Schema Validation Library",
          "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Migrating From Zod to Valibot",
          "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-zod-to-valibot/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Migrate form schemas from Zod to Valibot",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Translate leaf schemas first"
        },
        {
          "@type": "HowToStep",
          "name": "Replace .optional(), .nullable() and .default() with wrappers"
        },
        {
          "@type": "HowToStep",
          "name": "Translate cross-field refinements to forward(partialCheck(...))"
        },
        {
          "@type": "HowToStep",
          "name": "Use flatten for form errors"
        },
        {
          "@type": "HowToStep",
          "name": "Swap the resolver or adapter"
        },
        {
          "@type": "HowToStep",
          "name": "Measure the bundle before and after"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Valibot always smaller than Zod?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For typical form schemas, it is usually much smaller because only used functions are bundled. Zod 4 introduced a smaller \"mini\" variant with a functional API aimed at the same goal. Measure your app, because the saving depends on how much validation code is shared across routes."
          }
        },
        {
          "@type": "Question",
          "name": "Can I migrate one form at a time?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. The libraries are independent, and resolvers are per form. During the transition both are in the bundle, so finish the migration once started."
          }
        },
        {
          "@type": "Question",
          "name": "How do I share Valibot schemas with the server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same way as Zod: a dependency-free module imported by both sides, as in sharing one Zod schema between client and server. Valibot runs on Node, Deno, Bun and edge runtimes."
          }
        }
      ]
    }
  ]
}
</script>

# Migrating From Zod to Valibot

Valibot's appeal for forms is bundle size: its API is made of standalone functions, so bundlers include only the validators a form actually uses, and a signup form's validation can shrink to a small fraction of what a method-chaining library ships. The price is a different API shape — `pipe(string(), email())` instead of `z.string().email()` — and a different way of attaching cross-field errors.

This page, part of [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/), maps the Zod constructs forms depend on to their Valibot equivalents, shows how to place cross-field issues on the right field with `forward`, and covers the form-library side of the switch.

---

## Context and prerequisites

The structural differences:

- **Schemas and actions are functions.** `string()`, `number()`, `object({...})` create schemas; `email()`, `minLength(1)`, `trim()` are *actions* combined with `pipe(schema, ...actions)`.
- **Tree-shaking is per function.** Unused validators are not in the bundle. With Zod's methods on a prototype, bundlers cannot remove unused ones as easily.
- **Parsing** uses `parse(schema, input)` or `safeParse(schema, input)`, returning `{ success, output, issues }`.
- **Errors**: `issues` is an array; `flatten(issues)` groups them into `{ root, nested }` keyed by dot path — convenient for forms.
- **Cross-field checks** use `check` or `partialCheck` actions on the object pipe, and `forward` to move the resulting issue to a specific field path.
- **Transforms** are the `transform` action inside a pipe; coercion is explicit.

<svg viewBox="0 0 680 265" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table mapping common Zod schema constructs used in forms to their Valibot equivalents." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Zod constructs and Valibot equivalents</title>
  <desc>z.string().min(1) with a message maps to pipe of string with minLength one and the message. z.string().email() maps to pipe of string with email. z.number().int() maps to pipe of number with integer. z.enum maps to picklist. .optional() maps to optional wrapping the schema. superRefine on an object with an issue on a path maps to pipe of object with forward of partialCheck. safeParse maps to safeParse with the schema as the first argument. z.infer maps to InferOutput.</desc>
  <rect x="0" y="0" width="680" height="265" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="236.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Zod</text>
  <text x="323.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Valibot</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">z.string().min(1, m)</text>
  <text x="323.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">pipe(string(), minLength(1, m))</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">z.string().email(m)</text>
  <text x="323.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">pipe(string(), email(m))</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">z.number().int()</text>
  <text x="323.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">pipe(number(), integer())</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">z.enum([&quot;a&quot;, &quot;b&quot;])</text>
  <text x="323.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">picklist([&quot;a&quot;, &quot;b&quot;])</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">x.optional()</text>
  <text x="323.6" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">optional(x)</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">obj.superRefine(→ path)</text>
  <text x="323.6" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">pipe(obj, forward(partialCheck(…), [&quot;path&quot;]))</text>
  <line x1="14" y1="219.0" x2="666" y2="219.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="238.5" font-size="9.5" fill="#1e1a24" font-family="inherit">z.infer&lt;typeof S&gt;</text>
  <text x="323.6" y="238.5" font-size="9.5" fill="#6b5f75" font-family="inherit">InferOutput&lt;typeof S&gt;</text>
</svg>

---

## The core pattern: the same signup schema, translated

```typescript
// Zod version (for reference)
import { z } from "zod";
export const SignupZ = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter an email like name@example.com."),
  password: z.string().min(12, "Use at least 12 characters."),
  confirm: z.string().min(1, "Re-enter your password."),
  plan: z.enum(["free", "pro"], { errorMap: () => ({ message: "Choose a plan." }) }),
}).superRefine((v, ctx) => {
  if (v.password !== v.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "Passwords do not match." });
});
```

```typescript
// Valibot version
import * as v from "valibot";

export const SignupV = v.pipe(
  v.object({
    email: v.pipe(v.string(), v.trim(), v.minLength(1, "Enter your email address."), v.email("Enter an email like name@example.com.")),
    password: v.pipe(v.string(), v.minLength(12, "Use at least 12 characters.")),
    confirm: v.pipe(v.string(), v.minLength(1, "Re-enter your password.")),
    plan: v.picklist(["free", "pro"], "Choose a plan."),
  }),
  // partialCheck runs only when the listed fields are themselves valid, so a
  // short password does not ALSO report "do not match". forward() moves the
  // issue from the object root to the confirm field.
  v.forward(
    v.partialCheck([["password"], ["confirm"]], (i) => i.password === i.confirm, "Passwords do not match."),
    ["confirm"],
  ),
);

export type Signup = v.InferOutput<typeof SignupV>;

// Form-friendly errors: one message per field path.
export function formErrors(input: unknown): Record<string, string> {
  const r = v.safeParse(SignupV, input);
  if (r.success) return {};
  const flat = v.flatten<typeof SignupV>(r.issues);
  return Object.fromEntries(Object.entries(flat.nested ?? {}).map(([k, msgs]) => [k, msgs![0]]));
}
```

```typescript
// React Hook Form: swap the resolver; everything else is unchanged.
import { valibotResolver } from "@hookform/resolvers/valibot";
// useForm({ resolver: valibotResolver(SignupV) })
```

---

## Step-by-step walkthrough

1. **Translate leaf schemas first.** Each `z.x().a().b()` chain becomes `pipe(x(), a(), b())`, keeping argument order and messages.
2. **Replace `.optional()`, `.nullable()` and `.default()` with wrappers.** `optional(schema, default)` combines optionality and a default.
3. **Translate cross-field refinements to `forward(partialCheck(...))`.** `partialCheck` lists the fields it reads and skips when they are invalid; `forward` places the issue on the field the user should change — the same placement principle as [how to validate dependent fields with Zod](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/).
4. **Use `flatten` for form errors.** `flatten(issues).nested` gives `Record<path, string[]>`, matching what most form UIs want.
5. **Swap the resolver or adapter.** `@hookform/resolvers/valibot`, VeeValidate's Valibot adapter, Superforms' `valibot` adapter — or Standard Schema adapters that accept either library, per [standard schema for library-agnostic forms](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/).
6. **Measure the bundle before and after.** Confirm the saving with your bundler's analyser; it depends on how many validators the app uses overall.

### Why partialCheck matters for forms

A plain `check` on the object runs the comparison even when one of the passwords is itself invalid, so a user who typed a short password sees both "Use at least 12 characters" and "Passwords do not match" — two messages about one mistake. `partialCheck` declares which fields the rule depends on and runs only when those fields passed their own validation, which gives the ordering users expect: fix the password first, then the match is checked. It is the Valibot expression of "most basic problem first", the same rule that [composing pure validator functions](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/composing-pure-validator-functions/) implements with `first`.

<svg viewBox="0 0 680 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing, conceptually, how much of each library a small signup form pulls into the bundle, showing Zod including its whole schema class and methods and Valibot including only the functions used." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Why Valibot can be smaller — what gets bundled</title>
  <desc>A conceptual comparison of the validators a small signup form needs. The form uses about eight validation functions. With Valibot&#x27;s function-based API, roughly those eight functions and their shared helpers are bundled. With a method-chaining API, the schema classes carry every method, so a much larger share of the library ships regardless of use. Exact sizes depend on versions and on everything else the app imports; measure with a bundle analyser.</desc>
  <rect x="0" y="0" width="680" height="128" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="90.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">functions the form uses</text>
  <rect x="204.0" y="16.0" width="28.2" height="14" rx="3" fill="#2d6342"/>
  <text x="240.2" y="26.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">~8 functions</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">Valibot: bundled</text>
  <rect x="204.0" y="42.0" width="42.2" height="14" rx="3" fill="#2d6342"/>
  <text x="254.2" y="52.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">used + helpers</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">method-chaining: bundled</text>
  <rect x="204.0" y="68.0" width="352.0" height="14" rx="3" fill="#b07a55"/>
  <text x="564.0" y="78.5" font-size="9.5" font-weight="700" fill="#1e1a24" font-family="inherit">most of the classes</text>
  <text x="14.0" y="116.0" font-size="10" fill="#6b5f75" font-family="inherit">A conceptual illustration, not measured byte sizes: see the bundle-size comparison page for measurements.</text>
</svg>

### Reading pipes as a sequence

A useful mental model for reviewing translated schemas: a Valibot pipe is a list executed in order, and each action sees the output of the previous one. `pipe(string(), trim(), minLength(1), email())` checks that the value is a string, trims it, requires something to be left, then checks the email shape — in exactly that order. Zod chains behave similarly, but the order is less visible because some methods are checks and others are transforms attached to the same object. When porting, write each pipe in the order you want users to meet problems: type, normalisation, presence, format, business rules. Reviewers can then read the schema top to bottom as the sequence of questions the form asks about a value.

---

## Failure modes and edge cases

### 1. Issue paths as objects

Valibot issues carry `path` as an array of path items (objects with `key` and more). Use `getDotPath(issue)` or `flatten` rather than reading `issue.path` as strings.

### 2. `check` without `forward`

A cross-field `check` on the object produces an issue at the object root, which form libraries do not render next to any field. Always wrap with `forward` to the relevant field.

### 3. Async validation

Async actions require `pipeAsync`, `objectAsync` and `parseAsync`/`safeParseAsync`. Mixing sync and async variants is a type error; make sure your resolver runs the async parse when the schema is async.

### 4. Coercion

Valibot does not coerce. Form strings need explicit transforms (`pipe(string(), transform(Number), number())` or a preprocessing step), with the same empty-string care as in Zod.

### 5. Messages and i18n

Valibot supports global message configuration and official translations via `@valibot/i18n`. Port your Zod error map to Valibot's `setGlobalMessage` / `setSpecificMessage`, keeping the same catalogue of user-facing messages.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing what changes when migrating form schemas from Zod to Valibot — schema definitions, cross-field rules and form library integration." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What changes in the codebase</title>
  <desc>Schema definitions change from method chains to pipe calls with the same messages. Cross-field rules change from superRefine with addIssue to forward wrapping partialCheck, which also avoids duplicate messages. Form library integration changes only the resolver or adapter import; components, field wiring and error rendering stay the same.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Schemas</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Chains → pipe(…).</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Messages unchanged.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Cross-field rules</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">superRefine → forward(partialCheck).</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Fewer duplicate messages.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Form integration</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Swap the resolver import.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Components unchanged.</text>
</svg>

---

## Verification checklist

- [ ] Every Zod schema has a Valibot equivalent with identical messages.
- [ ] Cross-field issues appear on the intended field via `forward`.
- [ ] A short password shows only the length message, not also the mismatch.
- [ ] Form errors are produced with `flatten` or `getDotPath`, not raw path objects.
- [ ] Async schemas use the async variants end to end.
- [ ] Form strings are converted explicitly before type checks.
- [ ] The bundle analyser confirms the expected size reduction.

---

## Frequently Asked Questions

<details>
<summary><strong>Is Valibot always smaller than Zod?</strong></summary>

For typical form schemas, it is usually much smaller because only used functions are bundled. Zod 4 introduced a smaller "mini" variant with a functional API aimed at the same goal. Measure your app, because the saving depends on how much validation code is shared across routes.

</details>

<details>
<summary><strong>Can I migrate one form at a time?</strong></summary>

Yes. The libraries are independent, and resolvers are per form. During the transition both are in the bundle, so finish the migration once started.

</details>

<details>
<summary><strong>How do I share Valibot schemas with the server?</strong></summary>

The same way as Zod: a dependency-free module imported by both sides, as in [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/). Valibot runs on Node, Deno, Bun and edge runtimes.

</details>

---

## Related

- [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
- [Zod vs Yup vs Valibot Bundle Size and Performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/)
- [Migrating From Yup to Zod](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-yup-to-zod/)

← [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
