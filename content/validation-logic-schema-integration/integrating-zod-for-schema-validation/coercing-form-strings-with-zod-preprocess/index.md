---
layout: page.njk
title: "Coercing Form Strings With Zod preprocess and coerce"
description: "Form inputs produce strings; schemas want numbers, dates, booleans and optional values. When z.coerce is enough, when to use z.preprocess, how to treat empty strings as missing, and the coercions that silently turn bad input into valid data."
slug: coercing-form-strings-with-zod-preprocess
type: howto
breadcrumb: "Coercing Form Strings"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Coercing Form Strings With Zod preprocess and coerce"
  parent: "Integrating Zod for Schema Validation"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Coercing Form Strings With Zod preprocess and coerce",
      "description": "Form inputs produce strings; schemas want numbers, dates, booleans and optional values. When z.coerce is enough, when to use z.preprocess, how to treat empty strings as missing, and the coercions that silently turn bad input into valid data.",
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
          "name": "Coercing Form Strings With Zod preprocess and coerce",
          "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Coerce form input strings safely with Zod",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Decide what \"empty\" means for each field"
        },
        {
          "@type": "HowToStep",
          "name": "Convert empty to undefined before type checks"
        },
        {
          "@type": "HowToStep",
          "name": "Keep unparsable input as the original string"
        },
        {
          "@type": "HowToStep",
          "name": "Parse checkboxes by presence"
        },
        {
          "@type": "HowToStep",
          "name": "Keep date-only values as calendar strings"
        },
        {
          "@type": "HowToStep",
          "name": "Chain domain rules with .pipe"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is z.coerce ever the right choice for forms?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, where the input cannot be empty or ambiguous — a select with no blank option whose values are numeric ids, for example. Anywhere a user can leave the field blank, handle empty explicitly first."
          }
        },
        {
          "@type": "Question",
          "name": "How do I show the user's original text when parsing fails?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Keep the raw string in form state and validate it, rather than replacing the field's value with the parsed number. The preprocess helper above returns the original string on failure, so error messages and the input both reflect what was typed."
          }
        },
        {
          "@type": "Question",
          "name": "Does this apply to Valibot or Yup?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same questions apply. Valibot uses pipe with transform actions and has no implicit coercion; Yup casts by default, with the same empty-string pitfalls as z.coerce. Whatever the library, decide empty-to-missing explicitly."
          }
        }
      ]
    }
  ]
}
</script>

# Coercing Form Strings With Zod preprocess and coerce

Every value that comes out of a form is a string — or a `File`, or missing — and a schema written for your domain types rejects it: `z.number()` fails on `"42"`, `z.date()` fails on `"2026-10-01"`, and the quick fix `z.coerce.number()` then happily turns an empty field into `0` and the text `"abc"` into a failed parse with a confusing message.

Coercion is where form validation meets type conversion, and [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) depends on getting it right. This page sorts the input shapes forms produce, shows which Zod tool fits each, and builds a small set of reusable field helpers that treat empty as missing and garbage as an error — never as a plausible value.

---

## Context and prerequisites

What arrives from a form, by control:

- **Text, email, number, date inputs** — strings, `""` when empty. (`FormData` gives strings even for `type="number"`.)
- **Checkboxes** — the `value` string (default `"on"`) when checked, *absent* when unchecked.
- **Selects and radios** — the chosen option's value string, or absent if no radio is checked.
- **File inputs** — `File`, with an empty `File` (size 0, name `""`) when nothing was chosen.

Zod offers two tools:

- **`z.coerce.<type>()`** applies the JavaScript constructor (`Number(x)`, `String(x)`, `Boolean(x)`, `new Date(x)`) before validating. Fast and short, but it inherits JavaScript's conversions: `Number("")` is `0`, `Boolean("false")` is `true`.
- **`z.preprocess(fn, schema)`** runs your function first, then the schema. You decide what empty and invalid mean.

<svg viewBox="0 0 680 194" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of form input strings and the result of z.coerce.number, z.coerce.boolean and z.coerce.date on each, highlighting surprising results." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What z.coerce does to typical form strings</title>
  <desc>For an empty string, coerce number gives 0 and passes validation, coerce boolean gives false, and coerce date gives an invalid date that fails. For the string abc, coerce number gives NaN and fails with a type message. For the string false, coerce boolean gives true, which is almost never intended. For a date string like 2026-10-01, coerce date parses it as midnight UTC, which can display as the previous day in western time zones.</desc>
  <rect x="0" y="0" width="680" height="194" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Input string</text>
  <text x="159.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">coerce.number</text>
  <text x="322.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">coerce.boolean</text>
  <text x="485.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">coerce.date</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;&quot; (empty)</text>
  <text x="159.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">0 (passes!)</text>
  <text x="322.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">false</text>
  <text x="485.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Invalid Date (fails)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;abc&quot;</text>
  <text x="159.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NaN (fails)</text>
  <text x="322.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">true</text>
  <text x="485.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Invalid Date (fails)</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;false&quot;</text>
  <text x="159.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">NaN (fails)</text>
  <text x="322.8" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">true</text>
  <text x="485.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Invalid Date (fails)</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;2026-10-01&quot;</text>
  <text x="159.8" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NaN (fails)</text>
  <text x="322.8" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">true</text>
  <text x="485.8" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">midnight UTC</text>
  <text x="14.0" y="182.0" font-size="10" fill="#6b5f75" font-family="inherit">The dangerous cells are the ones that pass: an empty required number becomes 0 and &quot;false&quot; becomes true.</text>
</svg>

---

## The core pattern: small field helpers with explicit empty handling

```typescript
import { z } from "zod";

// Empty string and whitespace-only mean "the user did not answer".
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/** A number field. Empty → undefined (so .optional() or a required message applies). */
export const formNumber = (opts: { required?: string; invalid?: string } = {}) =>
  z.preprocess(
    (v) => {
      const e = emptyToUndefined(v);
      if (typeof e !== "string") return e;
      // Accept "1,234.5"? Decide explicitly. Here: strip thousands separators.
      const n = Number(e.replace(/,/g, ""));
      return Number.isNaN(n) ? e : n;          // keep the bad string so the type check fails clearly
    },
    z.number({
      required_error: opts.required ?? "Enter a number.",
      invalid_type_error: opts.invalid ?? "Enter a number, like 12 or 12.5.",
    }),
  );

/** A checkbox: present ("on" or its value) → true, absent → false. */
export const formCheckbox = () =>
  z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** A date-only field: keep the calendar date as a string, validated, never shifted by time zones. */
export const formDate = (msg = "Enter a date, like 2026-10-01.") =>
  z.preprocess(emptyToUndefined, z.string({ required_error: msg }).regex(/^\d{4}-\d{2}-\d{2}$/, msg)
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), msg));

/** Optional text: empty → undefined, otherwise trimmed. */
export const formText = () => z.preprocess(emptyToUndefined, z.string().trim().optional());

// Usage
export const Booking = z.object({
  guests: formNumber({ required: "Enter the number of guests." }).pipe(z.number().int().min(1).max(12)),
  checkIn: formDate(),
  childFriendly: formCheckbox(),
  notes: formText(),
  budget: formNumber().optional(),               // truly optional number: empty → undefined
});
```

---

## Step-by-step walkthrough

1. **Decide what "empty" means for each field.** For almost every form field, an empty string means "not answered" — `undefined` — not `0`, `false` or `""`.
2. **Convert empty to `undefined` before type checks.** Then `.optional()` does the right thing for optional fields, and required fields fail with a required message rather than passing as zero.
3. **Keep unparsable input as the original string.** Returning the string lets the type check fail with your "Enter a number" message; returning `NaN` gives a less helpful error and loses the input for display.
4. **Parse checkboxes by presence.** An unchecked box is absent from `FormData`; `Boolean(undefined)` is fine, but `Boolean("false")` is not — handle strings explicitly.
5. **Keep date-only values as calendar strings.** Converting `"2026-10-01"` to a `Date` introduces a time zone; validate the string and convert only where an instant is truly needed, as explained in [validating dates across time zones](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/validating-dates-across-time-zones/).
6. **Chain domain rules with `.pipe`.** `formNumber().pipe(z.number().int().min(1))` separates "is it a number" from "is it an allowed number", so messages stay specific.

### Why coercion belongs at the edge, not in the domain schema

It is tempting to add `z.coerce` throughout a shared domain schema so it "just works" with forms. That makes the schema lenient everywhere it is used: an API endpoint validating JSON would now accept `"42"` for a number and `"false"` as `true`, and data that should have been rejected slips into the system with the wrong meaning. Keep the domain schema strict — numbers are numbers — and put form-specific coercion in a thin layer that wraps it: `FormBooking = Booking.extend({ guests: formNumber().pipe(Booking.shape.guests) })`, or a preprocessing step that turns `FormData` into typed input before the strict parse. The form edge converts; the domain validates.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a number field&#x27;s raw string passing through empty handling, parsing, the number type check and the domain rules, with the message produced at each failing step." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A number field through preprocess and pipe</title>
  <desc>The raw string from FormData first goes through empty handling, where an empty or whitespace string becomes undefined and fails the required check with enter the number of guests. Otherwise commas are stripped and the string is parsed; unparsable text stays a string and fails the type check with enter a number. A parsed number then goes through the domain rules in pipe, such as integer and minimum one, each with its own message.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="363.6" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Raw: &quot; 3 &quot;</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">From FormData, always a string.</text>
  <text x="407.6" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Empty or whitespace → undefined → required message.</text>
  <path d="M195.8,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.8,89.0 195.8,96.0 199.8,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="363.6" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Parse</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Strip separators; Number().</text>
  <text x="407.6" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Unparsable → keep the string → &quot;Enter a number&quot;.</text>
  <path d="M195.8,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.8,174.0 195.8,181.0 199.8,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="363.6" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">z.number()</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Type check.</text>
  <text x="407.6" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Passes for 3.</text>
  <path d="M195.8,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.8,259.0 195.8,266.0 199.8,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="363.6" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">.pipe(int, min 1, max 12)</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Domain rules.</text>
  <text x="407.6" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each rule has its own message.</text>
</svg>

---

## Failure modes and edge cases

### 1. Required numbers that pass as zero

`z.coerce.number().min(0)` accepts an empty field as `0`. For quantities, prices and ages this silently submits a value the user never entered. Always handle empty before coercing.

### 2. Locale decimal separators

`"1,5"` in German is one and a half; stripping commas turns it into fifteen. If your audience writes decimal commas, parse with the locale's separators — see [locale-aware number and currency inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/) — rather than a blanket replace.

### 3. Multiple values for one name

Checkbox groups and multi-selects send several values under one name. `Object.fromEntries(formData)` keeps only the last. Build input with `formData.getAll(name)` for those fields and validate with `z.array(z.string())`.

### 4. Empty file inputs

An unfilled file input submits an empty `File` with `size === 0` and `name === ""`. Treat it as missing with a preprocess step: `(v) => v instanceof File && v.size === 0 ? undefined : v`.

### 5. Input and output types diverge

With preprocess, the schema's input type is `unknown` for those fields while the output is precise. Form libraries that type fields from the input type need the three-generic setup described in [wiring React Hook Form to a Zod resolver](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/wiring-react-hook-form-to-a-zod-resolver/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards recommending the Zod coercion approach for number fields, checkboxes, date-only fields and optional text." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which tool for which field</title>
  <desc>For number fields, use preprocess that maps empty to undefined and keeps unparsable strings, then pipe into domain rules. For checkboxes, preprocess by presence of the on value. For date-only fields, validate the calendar string and avoid converting to a Date. For optional text, map empty to undefined and trim. z.coerce alone is suitable only where empty cannot occur, such as a select with no blank option.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Numbers</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">preprocess: &quot;&quot; → undefined.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">pipe into rules.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Checkboxes</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Presence → true.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Absent → false.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Dates (date-only)</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Validate the string.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No Date object.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Optional text</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;&quot; → undefined, trim.</text>
</svg>

---

## Verification checklist

- [ ] An empty required number field fails with a required message, not as `0`.
- [ ] An empty optional number field produces `undefined`.
- [ ] Text like `"abc"` in a number field fails with "Enter a number".
- [ ] An unchecked checkbox parses as `false`; a checked one as `true`.
- [ ] Date-only values are not shifted by the user's time zone.
- [ ] Checkbox groups and multi-selects are read with `getAll`.
- [ ] Empty file inputs are treated as missing.
- [ ] The domain schema used by APIs remains strict; coercion lives in the form layer.

---

## Frequently Asked Questions

<details>
<summary><strong>Is z.coerce ever the right choice for forms?</strong></summary>

Yes, where the input cannot be empty or ambiguous — a select with no blank option whose values are numeric ids, for example. Anywhere a user can leave the field blank, handle empty explicitly first.

</details>

<details>
<summary><strong>How do I show the user's original text when parsing fails?</strong></summary>

Keep the raw string in form state and validate it, rather than replacing the field's value with the parsed number. The preprocess helper above returns the original string on failure, so error messages and the input both reflect what was typed.

</details>

<details>
<summary><strong>Does this apply to Valibot or Yup?</strong></summary>

The same questions apply. Valibot uses `pipe` with `transform` actions and has no implicit coercion; Yup casts by default, with the same empty-string pitfalls as `z.coerce`. Whatever the library, decide empty-to-missing explicitly.

</details>

---

## Related

- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Controlled Number Inputs and Intermediate Values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/)
- [Reading Values With FormData on Submit](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/reading-values-with-formdata-on-submit/)

← [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
