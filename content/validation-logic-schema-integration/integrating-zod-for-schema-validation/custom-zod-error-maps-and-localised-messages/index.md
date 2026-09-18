---
layout: page.njk
title: "Custom Zod Error Maps and Localised Messages"
description: "Replace Zod's developer-facing defaults like 'String must contain at least 1 character(s)' with user-facing, localised messages: per-schema messages, a global error map keyed by issue code, field labels in messages, and message catalogues for i18n."
slug: custom-zod-error-maps-and-localised-messages
type: howto
breadcrumb: "Zod Error Maps & i18n"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Custom Zod Error Maps and Localised Messages"
  parent: "Integrating Zod for Schema Validation"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Custom Zod Error Maps and Localised Messages",
      "description": "Replace Zod's developer-facing defaults like 'String must contain at least 1 character(s)' with user-facing, localised messages: per-schema messages, a global error map keyed by issue code, field labels in messages, and message catalogues for i18n.",
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
          "name": "Integrating Zod for Schema Validation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Custom Zod Error Maps and Localised Messages",
          "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/custom-zod-error-maps-and-localised-messages/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Customise and localise Zod validation messages",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Write messages as instructions"
        },
        {
          "@type": "HowToStep",
          "name": "Key the catalogue by meaning, not by Zod code"
        },
        {
          "@type": "HowToStep",
          "name": "Treat \"min length 1\" as required"
        },
        {
          "@type": "HowToStep",
          "name": "Inject field labels by path"
        },
        {
          "@type": "HowToStep",
          "name": "Pass the map per parse, not globally, if locales vary per request"
        },
        {
          "@type": "HowToStep",
          "name": "Keep specific overrides in the schema"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I put translation keys in the schema instead of messages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "That works well: .min(1, { message: \"errors.name.required\" }), then translate keys at render time. It keeps schemas language-neutral while allowing per-field specificity. The error map approach covers the fields that do not need a specific key."
          }
        },
        {
          "@type": "Question",
          "name": "Are there ready-made translations for Zod?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Community packages such as zod-i18n-map provide error maps backed by i18next with many locales, and Zod 4 includes built-in locales. They translate Zod's generic messages; you will still want your own wording for key fields."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test messages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Snapshot the messages for a table of invalid inputs per locale, and assert that none contains Zod's default phrasing (a regex for \"must contain at least\" or \"Expected\" catches regressions)."
          }
        }
      ]
    }
  ]
}
</script>

# Custom Zod Error Maps and Localised Messages

Zod's default messages are written for developers — "String must contain at least 1 character(s)", "Expected number, received nan", "Invalid enum value. Expected 'uk' | 'us', received ''" — and shipping them to users is one of the most common ways a well-engineered form ends up with confusing, untranslatable error text.

There are three layers at which to fix this: messages written inline in the schema, a global error map that rewrites issues by code, and a translation step that turns stable issue codes into localised sentences. This page combines them so every field gets a message that says what to do, in the user's language, without scattering strings through schemas. It extends [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/).

---

## Context and prerequisites

How Zod produces a message:

- Each failed check creates an **issue** with a `code` (`too_small`, `invalid_type`, `invalid_string`, `invalid_enum_value`, `custom`, …), a `path`, and code-specific details (`minimum`, `validation: "email"`, `received`, `options`).
- The message is chosen, in priority order, from: a message passed to that specific check (`.min(1, "…")`), a schema-level error map, a contextual error map passed to `parse`, and finally the **global error map** (`z.setErrorMap`, or `z.config({ customError })` in Zod 4), falling back to Zod's defaults.

So a single global map can translate every issue the application produces, while individual schemas can still override where a field needs a specific sentence.

<svg viewBox="0 0 680 425" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of the order in which Zod chooses an issue message — the message on the check, the schema&#x27;s error map, the contextual map passed to parse, the global error map, and the built-in default." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where Zod looks for a message</title>
  <desc>When a check fails, Zod first uses a message passed directly to that check, such as min one with enter your name. If there is none, it uses an error map attached to the schema. Then a contextual error map passed in the parse call. Then the global error map set once for the application. Only if none of these provides a message does it use its built-in English default, which is written for developers.</desc>
  <rect x="0" y="0" width="680" height="425" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="380.8" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Message on the check</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">.min(1, &quot;Enter your name.&quot;)</text>
  <text x="424.8" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Most specific; use for sentences unique to one field.</text>
  <path d="M204.4,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.4,89.0 204.4,96.0 208.4,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="380.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Schema error map</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">z.string({ errorMap })</text>
  <text x="424.8" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Per-field overrides by code.</text>
  <path d="M204.4,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.4,174.0 204.4,181.0 208.4,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="380.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Contextual map in parse()</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">schema.parse(v, { errorMap })</text>
  <text x="424.8" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Per-request locale, if needed.</text>
  <path d="M204.4,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.4,259.0 204.4,266.0 208.4,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="380.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Global error map</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Set once at startup.</text>
  <text x="424.8" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Translates every remaining issue by code.</text>
  <path d="M204.4,324.0 V344.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.4,344.0 204.4,351.0 208.4,344.0" fill="#7b4f8a"/>
  <rect x="14.0" y="352.0" width="380.8" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="375.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Built-in default</text>
  <text x="26.0" y="394.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;String must contain at least 1 character(s)&quot;</text>
  <text x="424.8" y="374.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Developer-facing; never let it reach users.</text>
</svg>

---

## The core pattern: a global map keyed by code, plus field labels

```typescript
import { z } from "zod";

type Locale = "en" | "de";
type Catalogue = Record<string, (p: Record<string, unknown>) => string>;

// Messages keyed by stable codes. Each says what to DO, not which rule failed.
const catalogues: Record<Locale, Catalogue> = {
  en: {
    required: ({ label }) => `Enter ${label}.`,
    tooShort: ({ label, min }) => `${cap(label)} must be at least ${min} characters.`,
    tooLong: ({ label, max }) => `${cap(label)} must be ${max} characters or fewer.`,
    email: () => "Enter an email address like name@example.com.",
    number: ({ label }) => `Enter ${label} as a number.`,
    minNumber: ({ label, min }) => `${cap(label)} must be ${min} or more.`,
    choose: ({ label }) => `Choose ${label}.`,
    invalid: ({ label }) => `Check ${label}.`,
  },
  de: {
    required: ({ label }) => `Geben Sie ${label} ein.`,
    tooShort: ({ label, min }) => `${cap(label)} muss mindestens ${min} Zeichen lang sein.`,
    tooLong: ({ label, max }) => `${cap(label)} darf höchstens ${max} Zeichen lang sein.`,
    email: () => "Geben Sie eine E-Mail-Adresse wie name@beispiel.de ein.",
    number: ({ label }) => `Geben Sie ${label} als Zahl ein.`,
    minNumber: ({ label, min }) => `${cap(label)} muss mindestens ${min} sein.`,
    choose: ({ label }) => `Wählen Sie ${label}.`,
    invalid: ({ label }) => `Prüfen Sie ${label}.`,
  },
};
const cap = (s: unknown) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

// Field labels per locale, keyed by path ("address.postcode").
export type Labels = Record<string, string>;

export function makeErrorMap(locale: Locale, labels: Labels): z.ZodErrorMap {
  const t = catalogues[locale];
  return (issue, ctx) => {
    const label = labels[issue.path.join(".")] ?? labels[String(issue.path.at(-1))] ?? "this field";
    switch (issue.code) {
      case z.ZodIssueCode.invalid_type:
        if (issue.received === "undefined" || issue.received === "null") return { message: t.required({ label }) };
        if (issue.expected === "number") return { message: t.number({ label }) };
        break;
      case z.ZodIssueCode.too_small:
        if (issue.type === "string") return { message: Number(issue.minimum) <= 1 ? t.required({ label }) : t.tooShort({ label, min: issue.minimum }) };
        if (issue.type === "number") return { message: t.minNumber({ label, min: issue.minimum }) };
        break;
      case z.ZodIssueCode.too_big:
        if (issue.type === "string") return { message: t.tooLong({ label, max: issue.maximum }) };
        break;
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === "email") return { message: t.email({ label }) };
        break;
      case z.ZodIssueCode.invalid_enum_value:
        return { message: t.choose({ label }) };
    }
    // Unknown case: a neutral, still user-facing fallback — never the raw default.
    return { message: ctx.defaultError && t.invalid({ label }) };
  };
}

// Apply per request/render with the user's locale and the form's labels.
export function parseWithMessages<T extends z.ZodTypeAny>(schema: T, data: unknown, locale: Locale, labels: Labels) {
  return schema.safeParse(data, { errorMap: makeErrorMap(locale, labels) });
}
```

```typescript
const labels = { name: "your name", email: "your email address", age: "your age", country: "a country" };
const result = parseWithMessages(Signup, input, "en", labels);
// name "" → "Enter your name."  ·  age "x" → "Enter your age as a number."
```

---

## Step-by-step walkthrough

1. **Write messages as instructions.** "Enter your name", "Choose a country" — the guidance in [writing error messages that tell the reader what to do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/).
2. **Key the catalogue by meaning, not by Zod code.** `required`, `tooShort`, `email` are stable concepts a translator understands; the error map translates Zod's codes into them.
3. **Treat "min length 1" as required.** `z.string().min(1)` is how most schemas express required text; mapping it to "Enter …" rather than "at least 1 character" reads naturally.
4. **Inject field labels by path.** Messages that name the field ("Enter your email address") are clearer in summaries, where the message appears away from the input.
5. **Pass the map per parse, not globally, if locales vary per request.** On a server handling many locales, a global map is shared state; the contextual `errorMap` argument is request-scoped.
6. **Keep specific overrides in the schema.** A field whose rule needs a unique sentence ("Your password needs a symbol") uses an inline message, which takes priority over the map.

### Why messages should not be built in the schema module

Inline strings in a shared schema lock it to one language and one tone, and they travel everywhere the schema does — including server code, where messages might be logged, and other apps with different vocabulary. Keeping the schema free of user-facing text (or limited to rare, field-specific overrides with translation keys) and applying the error map at the edge where the user's locale is known keeps the schema reusable and the messages consistent. It also gives translators one catalogue to work through instead of strings scattered across validation code.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of Zod default messages for common issues alongside the user-facing English replacement produced by the error map." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Default messages and their replacements</title>
  <desc>String must contain at least 1 character becomes Enter your name. String must contain at least 8 characters becomes Password must be at least 8 characters. Invalid email becomes Enter an email address like name at example dot com. Expected number, received nan becomes Enter your age as a number. Invalid enum value with expected options becomes Choose a country. Required becomes Enter your email address.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Zod default</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">User-facing message</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">String must contain at least 1 character(s)</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">Enter your name.</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">String must contain at least 8 character(s)</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">Password must be at least 8 characters.</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Invalid email</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">Enter an email address like name@example.com.</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Expected number, received nan</text>
  <text x="350.0" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">Enter your age as a number.</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Invalid enum value. Expected &#x27;uk&#x27; | &#x27;us&#x27;…</text>
  <text x="350.0" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">Choose a country.</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Required</text>
  <text x="350.0" y="209.0" font-size="9.5" fill="#2d6342" font-family="inherit">Enter your email address.</text>
</svg>

---

## Failure modes and edge cases

### 1. Zod 3 vs Zod 4 APIs

Zod 4 replaced `errorMap` with a unified `error` parameter and `z.config({ customError })`, and ships built-in locales via `z.config(z.locales.de())`. The approach is identical — map issue codes to your messages — but the function signature differs. Check which version your adapters (form library resolvers) expect.

### 2. Messages that expose internals

Fallbacks like `ctx.defaultError` can leak "Expected string, received object" for malformed API input. Always return a neutral user-facing sentence in the fallback and log the original for developers.

### 3. Grammar in other languages

Interpolating a label into a sentence works poorly in languages with grammatical gender or case ("Geben Sie Ihre E-Mail-Adresse ein" vs "Ihren Namen"). For such locales, store full sentences per field rather than a template plus label, or use ICU message format with select clauses.

### 4. Server and client messages disagree

If the client uses the error map and the server returns raw Zod messages in a 422, users see two voices. Run the same map on the server with the request's locale, or return issue codes and translate on the client — see [localising form error messages](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/localising-form-error-messages/).

### 5. Refinement messages

`superRefine` issues use code `custom`, which the map cannot interpret generically. Give custom issues a `params: { key: "passwordsMatch" }` and translate by key in the map.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the roles of inline schema messages, the error map and the message catalogue in producing validation messages." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three layers, three jobs</title>
  <desc>Inline messages in the schema handle the rare field that needs a unique sentence. The error map translates Zod issue codes and details into stable message keys plus parameters such as label and minimum. The message catalogue turns keys and parameters into localised sentences, and is what translators edit.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Inline message</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Rare, field-specific sentences.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Error map</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Zod code → message key + params.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Catalogue</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Key + params → localised sentence.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">What translators edit.</text>
</svg>

---

## Verification checklist

- [ ] No Zod default message text appears anywhere in the UI.
- [ ] Required text fields say "Enter …", not "at least 1 character".
- [ ] Messages name the field when shown in the error summary.
- [ ] Switching locale changes every validation message.
- [ ] Server-returned validation messages use the same catalogue and locale.
- [ ] Custom refinement messages are translatable by key.
- [ ] Unknown issue codes fall back to a neutral user-facing sentence.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I put translation keys in the schema instead of messages?</strong></summary>

That works well: `.min(1, { message: "errors.name.required" })`, then translate keys at render time. It keeps schemas language-neutral while allowing per-field specificity. The error map approach covers the fields that do not need a specific key.

</details>

<details>
<summary><strong>Are there ready-made translations for Zod?</strong></summary>

Community packages such as `zod-i18n-map` provide error maps backed by i18next with many locales, and Zod 4 includes built-in locales. They translate Zod's generic messages; you will still want your own wording for key fields.

</details>

<details>
<summary><strong>How do I test messages?</strong></summary>

Snapshot the messages for a table of invalid inputs per locale, and assert that none contains Zod's default phrasing (a regex for "must contain at least" or "Expected" catches regressions).

</details>

---

## Related

- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Mapping Validation Errors to UI Components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/)
- [Localising Form Error Messages](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/localising-form-error-messages/)

← [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
