---
layout: page.njk
title: "Standard Schema for Library-Agnostic Forms"
description: "Write form code that accepts any Standard Schema–compliant validator — Zod, Valibot, ArkType and others — through the shared ~standard interface: validating, reading issues and paths, typing inputs and outputs, and handling sync and async results."
slug: standard-schema-for-library-agnostic-forms
type: howto
breadcrumb: "Standard Schema"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Standard Schema for Library-Agnostic Forms"
  parent: "Choosing a Schema Validation Library"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Standard Schema for Library-Agnostic Forms",
      "description": "Write form code that accepts any Standard Schema–compliant validator — Zod, Valibot, ArkType and others — through the shared ~standard interface: validating, reading issues and paths, typing inputs and outputs, and handling sync and async results.",
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
          "name": "Standard Schema for Library-Agnostic Forms",
          "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate forms against any Standard Schema library",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Depend on the spec's types, not a library"
        },
        {
          "@type": "HowToStep",
          "name": "Call ~standard.validate and normalise sync and async"
        },
        {
          "@type": "HowToStep",
          "name": "Normalise paths"
        },
        {
          "@type": "HowToStep",
          "name": "Separate root issues from field issues"
        },
        {
          "@type": "HowToStep",
          "name": "Type inputs and outputs from the schema"
        },
        {
          "@type": "HowToStep",
          "name": "Keep library-specific features at the edges"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do form libraries already support Standard Schema?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Many do or are adding it: there are Standard Schema resolvers and adapters for popular form libraries, and newer libraries accept any compliant schema directly. Check your library's docs; if it supports Standard Schema, you may not need custom helpers at all."
          }
        },
        {
          "@type": "Question",
          "name": "Does using Standard Schema cost performance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No meaningful cost: ~standard.validate is a thin wrapper around the library's own parse. The interface adds a function call and a result object."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use it on the server too?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. API frameworks can accept any Standard Schema for request validation, which lets client and server share schemas without agreeing on a single library across teams."
          }
        }
      ]
    }
  ]
}
</script>

# Standard Schema for Library-Agnostic Forms

Form utilities written against one validation library — a submit helper that calls `schema.safeParse`, an error mapper that reads `ZodError.issues` — lock the whole codebase to that library, and switching later means touching every form.

Standard Schema is a small shared interface implemented by Zod (3.24+), Valibot (1.0+), ArkType and others. A schema from any of them exposes a `~standard` property with a `validate` function and a common result shape. Form code written against that interface works with every compliant library. This page, part of [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/), builds form helpers on it.

---

## Context and prerequisites

The interface, in essence:

- **`schema["~standard"].version`** — `1`.
- **`schema["~standard"].vendor`** — `"zod"`, `"valibot"`, `"arktype"`…
- **`schema["~standard"].validate(value)`** — returns a result, *or a Promise of one* (for async schemas): `{ value }` on success, `{ issues }` on failure.
- **Each issue** has a `message` and an optional `path`: an array whose items are property keys or objects `{ key }`.
- **Types**: `StandardSchemaV1.InferInput<S>` and `InferOutput<S>` extract input and output types.

The `~` prefix keeps the property out of editor autocomplete for everyday use; it is meant for library and tooling authors — which is what a form layer is.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of form helpers talking to a single Standard Schema interface, which is implemented by several validation libraries." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One interface, many libraries</title>
  <desc>The form helpers — a submit wrapper, an error mapper and typed field bindings — call only the ~standard validate function and read issues with message and path. Zod, Valibot, ArkType and other compliant libraries each implement that interface on their schemas, so any of them can be passed to the same helpers.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Form helpers</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit, error mapper, typed fields.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Call ~standard.validate only.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">~standard interface</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validate(value) → { value } | { issues }.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Sync or Promise.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Compliant libraries</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Zod, Valibot, ArkType, …</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each schema exposes ~standard.</text>
</svg>

---

## The core pattern: library-agnostic validate and error mapping

```typescript
import type { StandardSchemaV1 } from "@standard-schema/spec";   // types only; no runtime dependency

export type FieldErrors = Record<string, string>;

/** Normalise a Standard Schema issue path to "a.b.2.c". */
export function pathOf(issue: StandardSchemaV1.Issue): string {
  return (issue.path ?? [])
    .map((seg) => (typeof seg === "object" && seg !== null ? seg.key : seg))
    .map(String)
    .join(".");
}

/**
 * Validate with ANY compliant schema. Always returns a Promise so callers do
 * not need to care whether the schema is sync or async.
 */
export async function validateForm<S extends StandardSchemaV1>(
  schema: S,
  input: unknown,
): Promise<{ ok: true; value: StandardSchemaV1.InferOutput<S> } | { ok: false; errors: FieldErrors; formErrors: string[] }> {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise) result = await result;

  if (!result.issues) return { ok: true, value: result.value as StandardSchemaV1.InferOutput<S> };

  const errors: FieldErrors = {};
  const formErrors: string[] = [];
  for (const issue of result.issues) {
    const p = pathOf(issue);
    if (!p) formErrors.push(issue.message);   // root-level issue: no field to attach to
    else errors[p] ??= issue.message;         // first message per field
  }
  return { ok: false, errors, formErrors };
}

/** A typed submit wrapper usable with any library's schema. */
export function withSchema<S extends StandardSchemaV1>(
  schema: S,
  onValid: (value: StandardSchemaV1.InferOutput<S>) => Promise<void>,
  onInvalid: (errors: FieldErrors, formErrors: string[]) => void,
) {
  return async (input: StandardSchemaV1.InferInput<S>) => {
    const r = await validateForm(schema, input);
    if (r.ok) await onValid(r.value);
    else onInvalid(r.errors, r.formErrors);
  };
}
```

```typescript
// The same helper, three libraries:
import { z } from "zod";
import * as v from "valibot";
import { type } from "arktype";

const zodSchema = z.object({ email: z.string().email("Enter an email like name@example.com.") });
const valibotSchema = v.object({ email: v.pipe(v.string(), v.email("Enter an email like name@example.com.")) });
const arkSchema = type({ email: "string.email" });

await validateForm(zodSchema, { email: "x" });      // { ok: false, errors: { email: "…" } }
await validateForm(valibotSchema, { email: "x" });  // same shape
await validateForm(arkSchema, { email: "x" });      // same shape (ArkType's own message)
```

---

## Step-by-step walkthrough

1. **Depend on the spec's types, not a library.** `@standard-schema/spec` provides types only; your helpers have no runtime dependency on any validator.
2. **Call `~standard.validate` and normalise sync and async.** Awaiting the result when it is a Promise lets one code path serve every schema.
3. **Normalise paths.** Path segments may be plain keys or `{ key }` objects; flatten both to dotted strings your form uses, as in [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/).
4. **Separate root issues from field issues.** An issue with no path belongs to the form, not a field — route it to form-level messaging.
5. **Type inputs and outputs from the schema.** `InferInput` types what the form holds; `InferOutput` types what submit receives, keeping the distinction from [wiring React Hook Form to a Zod resolver](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/wiring-react-hook-form-to-a-zod-resolver/).
6. **Keep library-specific features at the edges.** Error maps, localisation and schema composition stay in library code; your form layer only validates and reads issues.

### Why the interface is deliberately small

Standard Schema standardises validation results, not schema construction, error-message configuration or introspection. That is intentional: those areas are where libraries differ most and compete. For a form layer, the small surface is enough — validate, read messages and paths, infer types — and it is stable because it asks so little. What it does not give you is a way to read constraints (like "this field is required" or "max length 50") to render hints or HTML attributes; code that needs that still talks to a specific library, or to a separate metadata layer.

<svg viewBox="0 0 680 265" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table listing form concerns and whether the Standard Schema interface covers them or whether library-specific code is still needed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What Standard Schema covers for forms</title>
  <desc>Validating a value is covered. Reading issue messages and paths is covered. Inferring input and output types is covered. Async validation is covered because validate may return a promise. Configuring and localising messages is not covered and stays library-specific. Reading constraints such as required or max length to render HTML attributes is not covered. Building schemas is not covered; each library keeps its own API.</desc>
  <rect x="0" y="0" width="680" height="265" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="236.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Concern</text>
  <text x="284.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Covered?</text>
  <text x="415.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Otherwise</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">validate a value</text>
  <text x="284.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">issue messages and paths</text>
  <text x="284.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">input and output types</text>
  <text x="284.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">async validation</text>
  <text x="284.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes (Promise)</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">message config, i18n</text>
  <text x="284.8" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="415.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">library error maps</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">read constraints (required, max)</text>
  <text x="284.8" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="415.2" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">library introspection</text>
  <line x1="14" y1="219.0" x2="666" y2="219.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="238.5" font-size="9.5" fill="#1e1a24" font-family="inherit">build schemas</text>
  <text x="284.8" y="238.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="415.2" y="238.5" font-size="9.5" fill="#6b5f75" font-family="inherit">each library&#x27;s API</text>
</svg>

### Where library-agnostic helpers pay off

The benefit shows up in shared infrastructure rather than individual forms. A design system's form components, an internal submit helper used by fifty forms, a testing utility that asserts "this input produces this field error", an API client that validates responses — each of these would otherwise pick one validation library and impose it on every team. Written against Standard Schema, they let teams choose the library that suits their constraints (Valibot where bundle size matters, Zod where its ecosystem helps, ArkType where its type-level syntax fits) while sharing the same tooling. It also turns a future library migration from a codebase-wide rewrite into a per-schema change.

---

## Failure modes and edge cases

### 1. Assuming synchronous results

Some schemas are async (they contain async refinements). Code that reads `result.issues` without awaiting will see a Promise and treat the input as valid. Always await.

### 2. Different messages per library

Default messages differ between libraries. If you swap libraries, set up that library's message configuration so users see the same wording — see [custom Zod error maps and localised messages](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/custom-zod-error-maps-and-localised-messages/).

### 3. Path segment types

Array indices appear as numbers, object keys as strings, and some libraries use symbols for special cases. `String(seg)` in the normaliser keeps them printable; decide how your form represents indices (dots versus brackets) and stick to it.

### 4. Older library versions

Standard Schema support requires recent versions (Zod 3.24+, Valibot 1.0+). Older schemas lack `~standard`; detect with `"~standard" in schema` and fail loudly in development.

### 5. Transforms and output types

Libraries apply transforms before returning `value`. Your submit handler receives the transformed output, which may differ from what the form displays — trimmed strings, parsed numbers. Keep form display state separate from the validated output.

<svg viewBox="0 0 680 354" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a form submit through the Standard Schema helper, from calling validate, awaiting a possible promise, and branching into typed output or normalised errors." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A submit through the library-agnostic helper</title>
  <desc>The submit handler passes form values to withSchema. The helper calls the schema&#x27;s ~standard validate function and awaits the result if it is a promise. If there are no issues, the typed output value goes to the onValid callback. Otherwise each issue&#x27;s path is normalised to a dotted string; issues with a path become field errors, keeping the first message per field, and issues without a path become form-level errors.</desc>
  <rect x="0" y="0" width="680" height="354" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">~standard.validate(input)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Any compliant library.</text>
  <text x="466.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Sync result or Promise.</text>
  <path d="M225.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,89.0 225.0,96.0 229.0,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Await if needed</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One code path for both.</text>
  <text x="466.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Async refinements handled transparently.</text>
  <path d="M225.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,174.0 225.0,181.0 229.0,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Issues? branch</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">none → onValid(output)</text>
  <text x="466.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Output is typed with InferOutput.</text>
  <path d="M225.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,259.0 225.0,266.0 229.0,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="422.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Normalise and route</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">path → field errors</text>
  <text x="26.0" y="323.0" font-size="9.5" fill="#6b5f75" font-family="inherit">no path → form errors</text>
  <text x="466.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">First message per field.</text>
</svg>

---

## Verification checklist

- [ ] Form helpers import only `@standard-schema/spec` types, no validator library.
- [ ] Validation awaits results, so async schemas work.
- [ ] Issue paths are normalised to the form's path format.
- [ ] Root-level issues are shown as form-level messages.
- [ ] Swapping a form's schema to another compliant library needs no helper changes.
- [ ] Message wording is configured per library to stay consistent.
- [ ] Missing `~standard` is detected with a clear development error.

---

## Frequently Asked Questions

<details>
<summary><strong>Do form libraries already support Standard Schema?</strong></summary>

Many do or are adding it: there are Standard Schema resolvers and adapters for popular form libraries, and newer libraries accept any compliant schema directly. Check your library's docs; if it supports Standard Schema, you may not need custom helpers at all.

</details>

<details>
<summary><strong>Does using Standard Schema cost performance?</strong></summary>

No meaningful cost: `~standard.validate` is a thin wrapper around the library's own parse. The interface adds a function call and a result object.

</details>

<details>
<summary><strong>Can I use it on the server too?</strong></summary>

Yes. API frameworks can accept any Standard Schema for request validation, which lets client and server share schemas without agreeing on a single library across teams.

</details>

---

## Related

- [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
- [Migrating From Zod to Valibot](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-zod-to-valibot/)
- [Sharing One Zod Schema Between Client and Server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/)

← [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
