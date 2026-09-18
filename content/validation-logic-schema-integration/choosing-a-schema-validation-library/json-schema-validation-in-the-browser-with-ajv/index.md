---
layout: page.njk
title: "JSON Schema Validation in the Browser With Ajv"
description: "Validate forms against JSON Schema when the schema comes from a backend, a CMS or an OpenAPI spec: compiling with Ajv, allErrors and formats, mapping instancePath to fields, readable messages, and precompiling to avoid CSP and bundle-size problems."
slug: json-schema-validation-in-the-browser-with-ajv
type: howto
breadcrumb: "JSON Schema With Ajv"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "JSON Schema Validation in the Browser With Ajv"
  parent: "Choosing a Schema Validation Library"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "JSON Schema Validation in the Browser With Ajv",
      "description": "Validate forms against JSON Schema when the schema comes from a backend, a CMS or an OpenAPI spec: compiling with Ajv, allErrors and formats, mapping instancePath to fields, readable messages, and precompiling to avoid CSP and bundle-size problems.",
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
          "name": "JSON Schema Validation in the Browser With Ajv",
          "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/json-schema-validation-in-the-browser-with-ajv/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate a form against JSON Schema with Ajv",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Compile each schema once"
        },
        {
          "@type": "HowToStep",
          "name": "Enable allErrors and add formats"
        },
        {
          "@type": "HowToStep",
          "name": "Map instancePath to form paths"
        },
        {
          "@type": "HowToStep",
          "name": "Fix required paths"
        },
        {
          "@type": "HowToStep",
          "name": "Replace messages with templates keyed by keyword"
        },
        {
          "@type": "HowToStep",
          "name": "Precompile for production when possible"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I convert JSON Schema to Zod instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Converters exist and are useful when the schema is known at build time and you want Zod's ergonomics in the frontend. For runtime schemas, or to guarantee exactly the same semantics as other services validating the same JSON Schema, validate the JSON Schema directly."
          }
        },
        {
          "@type": "Question",
          "name": "How do I get field labels from JSON Schema?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use title on each property, as above, or a separate UI schema (as form builders often do) keyed by JSON Pointer. Do not derive labels from property names; postal_code makes a poor label."
          }
        },
        {
          "@type": "Question",
          "name": "Is Ajv fast enough for keystroke validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Compiled Ajv validators are among the fastest JavaScript validators available. The costs to watch are compilation (do it once) and error mapping on large forms; validate the changed field's subschema where possible."
          }
        }
      ]
    }
  ]
}
</script>

# JSON Schema Validation in the Browser With Ajv

When form rules are defined outside the frontend — in an OpenAPI spec, a Python or Java backend, a CMS that lets editors build forms — rewriting them as Zod schemas means maintaining two copies that drift. JSON Schema is the language-neutral format those systems already emit, and Ajv validates it in the browser quickly.

The friction points are specific: Ajv compiles schemas with `new Function`, which a strict Content Security Policy blocks; its default errors are developer-oriented (`must have required property 'email'`) and attached to the *parent* object for required properties; and `format: "email"` does nothing unless you add `ajv-formats`. This page, part of [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/), addresses each.

---

## Context and prerequisites

Choose JSON Schema and Ajv when:

- **The schema is authored elsewhere** — generated from backend models, published in an OpenAPI document, or defined by a form builder.
- **Several languages must agree** — a Go service, a Python worker and a web form validating the same payload.
- **Schemas arrive at runtime** — a CMS-driven form whose fields are not known at build time.

Key Ajv options for forms:

- **`allErrors: true`** — report every failure, not just the first (Ajv stops at the first by default).
- **`ajv-formats`** — adds `email`, `date`, `uri` and others; without it, `format` keywords are ignored or rejected depending on `strict` settings.
- **`coerceTypes`** — converts form strings to numbers and booleans; convenient but lenient, like any coercion.
- **Standalone code generation** — compile schemas to JavaScript modules at build time, so the browser never calls `new Function`.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the fields in an Ajv error object — instancePath, keyword, params and message — with an example and how a form uses each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Ajv error objects and what a form needs from them</title>
  <desc>instancePath is a JSON Pointer to the invalid value, such as slash address slash postcode, and is mapped to a form field; for required properties it points to the parent object, so the missing property name must be read from params. keyword names the failed rule, such as required, minLength or format, and selects the user-facing message template. params carries rule details such as missingProperty or limit, used in messages. message is Ajv&#x27;s English default and should not be shown to users.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="168.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Example</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Form uses it to</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">instancePath</text>
  <text x="168.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">/address/postcode</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">find the field (JSON Pointer)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">keyword</text>
  <text x="168.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">minLength, format, required</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">choose the message</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">params</text>
  <text x="168.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">{ missingProperty: &quot;email&quot; }</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">fill in details; fix required paths</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">message</text>
  <text x="168.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">must NOT have fewer than 5 characters</text>
  <text x="386.2" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">not for users</text>
</svg>

---

## The core pattern: compile once, map errors to fields with readable messages

```typescript
import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

// A schema that might come from an API or a CMS.
const contactSchema = {
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string", minLength: 1, title: "your name" },
    email: { type: "string", format: "email", title: "your email address" },
    age: { type: "integer", minimum: 16, title: "your age" },
    address: {
      type: "object",
      required: ["postcode"],
      properties: { postcode: { type: "string", pattern: "^[A-Za-z0-9 ]{3,10}$", title: "your postcode" } },
    },
  },
  additionalProperties: false,
} as const;

const ajv = new Ajv({ allErrors: true, strict: true, coerceTypes: false });
addFormats(ajv, ["email", "date", "uri"]);
const validate = ajv.compile(contactSchema);        // compile ONCE, reuse

// "/address/postcode" → "address.postcode"; required errors point at the parent.
function fieldPath(e: ErrorObject): string {
  const base = e.instancePath.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (e.keyword === "required") base.push(String((e.params as { missingProperty: string }).missingProperty));
  return base.join(".");
}

// Find the subschema's title to name the field in messages.
function labelFor(path: string): string {
  let node: any = contactSchema;
  for (const key of path.split(".")) node = node?.properties?.[key];
  return node?.title ?? "this field";
}

const templates: Record<string, (label: string, p: any) => string> = {
  required: (l) => `Enter ${l}.`,
  minLength: (l, p) => (p.limit <= 1 ? `Enter ${l}.` : `${cap(l)} must be at least ${p.limit} characters.`),
  maxLength: (l, p) => `${cap(l)} must be ${p.limit} characters or fewer.`,
  format: (l, p) => (p.format === "email" ? "Enter an email address like name@example.com." : `Check the format of ${l}.`),
  pattern: (l) => `Check ${l}.`,
  minimum: (l, p) => `${cap(l)} must be ${p.limit} or more.`,
  type: (l, p) => (p.type === "integer" || p.type === "number" ? `Enter ${l} as a number.` : `Check ${l}.`),
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function validateContact(values: unknown): Record<string, string> {
  if (validate(values)) return {};
  const errors: Record<string, string> = {};
  for (const e of validate.errors ?? []) {
    if (e.keyword === "additionalProperties") continue;       // a client bug, not a user error
    const path = fieldPath(e);
    const t = templates[e.keyword];
    errors[path] ??= t ? t(labelFor(path), e.params) : `Check ${labelFor(path)}.`;
  }
  return errors;
}
```

---

## Step-by-step walkthrough

1. **Compile each schema once.** `ajv.compile` is the expensive step; cache the resulting function per schema (by `$id` for runtime schemas).
2. **Enable `allErrors` and add formats.** Forms need every error at once, and `format: "email"` must actually validate.
3. **Map `instancePath` to form paths.** It is a JSON Pointer; unescape `~1` and `~0` and join with dots, following [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/).
4. **Fix `required` paths.** For missing properties Ajv reports the parent's path; append `params.missingProperty` so the error lands on the field.
5. **Replace messages with templates keyed by `keyword`.** Use the schema's `title` (or a separate labels map) to name the field. Ajv's `message` is for developers; `ajv-i18n` offers translated defaults if you want a starting point.
6. **Precompile for production when possible.** Ajv's standalone mode generates validation modules at build time, removing the runtime compiler from the bundle and the need for `unsafe-eval` in CSP.

### Why precompiling matters for the browser

Ajv's speed comes from generating specialised JavaScript for each schema at runtime with `new Function`. In the browser, that has two costs: the compiler itself is a large part of Ajv's bundle, and `new Function` requires the `unsafe-eval` CSP source, which security-conscious sites forbid. When schemas are known at build time — the common OpenAPI case — standalone code generation produces small, dependency-light validation modules that run under a strict CSP. Runtime compilation remains necessary only for schemas that truly arrive at runtime, such as CMS-built forms, and even then it can move to a server endpoint that returns validation results.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for choosing between compiling JSON Schemas with Ajv at runtime in the browser, precompiling them at build time, or validating on the server, depending on when schemas are known and CSP constraints." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Runtime compile or precompile?</title>
  <desc>If schemas are known at build time, precompile them with Ajv standalone code generation, which keeps the compiler out of the bundle and works with a strict CSP. If schemas arrive at runtime and the CSP allows unsafe-eval, compile them at runtime in the browser and cache the functions. If schemas arrive at runtime and the CSP forbids unsafe-eval, validate on the server or use an interpreter-based validator that does not generate code.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Schemas known at build time?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Precompile (standalone)</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">CSP allows unsafe-eval?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Compile at runtime, cache</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Server-side or interpreter validator</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No code generation in the page.</text>
</svg>

---

## Failure modes and edge cases

### 1. `additionalProperties: false` rejects form extras

Forms often carry fields the API does not (a confirm-password field, UI flags). With `additionalProperties: false`, those produce errors. Strip UI-only fields before validating, and treat any remaining `additionalProperties` error as a developer bug, not a message for users.

### 2. Coercion and empty strings

`coerceTypes: true` turns `""` into `0` for numbers and `null`-able types into `null` — the same trap as other coercion. Prefer converting form strings explicitly, as in [coercing form strings with Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/), then validating typed data.

### 3. Conditional schemas

`if`/`then`/`else`, `oneOf` and `anyOf` produce many errors from alternative branches, most irrelevant to the user. Prefer `if`/`then` over `oneOf` for conditional required fields, and filter `oneOf`/`anyOf` wrapper errors when leaf errors exist.

### 4. Draft versions

Ajv's default class targets draft-07; JSON Schema 2019-09 and 2020-12 need `Ajv2019` or `Ajv2020`. OpenAPI 3.1 uses 2020-12. A schema compiled with the wrong class fails on unknown keywords under `strict`.

### 5. Unicode in patterns

JSON Schema `pattern` uses ECMA-262 regex syntax; Ajv compiles patterns with the `u` flag by default in recent versions. Patterns written for other engines (Python, PCRE) may not behave the same — test them in the browser.

<svg viewBox="0 0 680 171" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of Ajv reporting a missing required postcode on the address object, the mapper appending the missing property to the path, finding the field&#x27;s title, and placing a readable message on the postcode field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A required-field error from Ajv to the form</title>
  <desc>The form calls the compiled validate function with an address object lacking a postcode. Ajv reports an error with keyword required, instancePath slash address and params missingProperty postcode. The mapper converts the pointer to address and appends postcode, giving address dot postcode. It looks up the subschema title your postcode and applies the required template, producing enter your postcode, which the form shows under the postcode input.</desc>
  <rect x="0" y="0" width="680" height="171" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Ajv validate</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Error mapper</text>
  <path d="M122.7,41.0 V155.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V155.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V155.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validate({ address: {} })</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">required @ /address, missingProperty:</text>
  <text x="348.0" y="105.0" font-size="9.5" fill="#a63d6f" font-family="inherit">postcode</text>
  <path d="M340.0,109.0 H549.3" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,105.0 556.3,109.0 549.3,113.0" fill="#7b4f8a"/>
  <text x="130.7" y="133.0" font-size="9.5" fill="#2d6342" font-family="inherit">address.postcode: &quot;Enter your postcode.&quot;</text>
  <path d="M557.3,137.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,133.0 123.7,137.0 130.7,141.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] Schemas are compiled once and cached.
- [ ] `allErrors` is on and required formats are registered.
- [ ] Missing required properties produce errors on the missing field, not the parent.
- [ ] No Ajv default message reaches users.
- [ ] UI-only fields are stripped before validation.
- [ ] The correct Ajv class is used for the schema's draft.
- [ ] Production builds precompile schemas where they are known at build time.
- [ ] The page works under the site's Content Security Policy.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I convert JSON Schema to Zod instead?</strong></summary>

Converters exist and are useful when the schema is known at build time and you want Zod's ergonomics in the frontend. For runtime schemas, or to guarantee exactly the same semantics as other services validating the same JSON Schema, validate the JSON Schema directly.

</details>

<details>
<summary><strong>How do I get field labels from JSON Schema?</strong></summary>

Use `title` on each property, as above, or a separate UI schema (as form builders often do) keyed by JSON Pointer. Do not derive labels from property names; `postal_code` makes a poor label.

</details>

<details>
<summary><strong>Is Ajv fast enough for keystroke validation?</strong></summary>

Compiled Ajv validators are among the fastest JavaScript validators available. The costs to watch are compilation (do it once) and error mapping on large forms; validate the changed field's subschema where possible.

</details>

---

## Related

- [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
- [Problem Details (RFC 9457) for Form Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/problem-details-rfc-9457-for-form-errors/)
- [Standard Schema for Library-Agnostic Forms](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/)

← [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
