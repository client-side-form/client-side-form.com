---
layout: page.njk
title: "Migrating From Yup to Zod"
description: "Move form validation from Yup to Zod without changing behaviour: mapping the APIs, Yup's implicit casting versus Zod's strict types, when/conditional rules, error paths and messages, and an incremental migration that runs both side by side."
slug: migrating-from-yup-to-zod
type: howto
breadcrumb: "Yup to Zod"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Migrating From Yup to Zod"
  parent: "Choosing a Schema Validation Library"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Migrating From Yup to Zod",
      "description": "Move form validation from Yup to Zod without changing behaviour: mapping the APIs, Yup's implicit casting versus Zod's strict types, when/conditional rules, error paths and messages, and an incremental migration that runs both side by side.",
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
          "name": "Migrating From Yup to Zod",
          "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-yup-to-zod/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Migrate form schemas from Yup to Zod incrementally",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Inventory Yup features in use"
        },
        {
          "@type": "HowToStep",
          "name": "Make Yup's casting explicit"
        },
        {
          "@type": "HowToStep",
          "name": "Move when and ref rules to the parent object"
        },
        {
          "@type": "HowToStep",
          "name": "Port messages exactly"
        },
        {
          "@type": "HowToStep",
          "name": "Run both schemas side by side"
        },
        {
          "@type": "HowToStep",
          "name": "Switch per form, then remove Yup"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is migrating worth it if Yup works?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If your team is on TypeScript and maintaining separate types for form values, Zod's inference removes that duplication and catches mismatches at compile time. If types are not a pain point, the migration risk may not be worth it."
          }
        },
        {
          "@type": "Question",
          "name": "Can Yup infer TypeScript types too?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — Yup v1 offers InferType and improved typings. The gap has narrowed; Zod's inference is still more precise for unions, transforms and input versus output types, which matters for forms with coercion."
          }
        },
        {
          "@type": "Question",
          "name": "Should I go straight to Valibot instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If bundle size is the priority, possibly. The same behaviour-first process applies; see migrating from Zod to Valibot for the API differences, which are larger than Yup-to-Zod."
          }
        }
      ]
    }
  ]
}
</script>

# Migrating From Yup to Zod

Teams move from Yup to Zod for TypeScript inference, and the mechanical API swap takes an afternoon — then forms start behaving differently, because Yup casts values by default (an empty string becomes `undefined` for numbers, `"1"` becomes `1`) while Zod checks types strictly, and conditional rules written with Yup's `when` have no direct equivalent.

A behaviour-preserving migration maps the concepts, not just the method names, and verifies each form against both schemas before switching. This page, part of [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/), covers that mapping and an incremental rollout.

---

## Context and prerequisites

The conceptual differences that matter for forms:

- **Casting.** Yup's `validate` casts input before checking (`number()` turns `"42"` into `42` and `""` into a type error or `undefined` depending on configuration; `string().trim()` transforms). Zod never coerces unless you ask with `z.coerce` or `preprocess`.
- **Nullability.** Yup distinguishes `optional()`, `nullable()`, `defined()` and `required()`. Zod has `.optional()`, `.nullable()` and `.nullish()`; "required" is the absence of those, plus `.min(1)` for non-empty strings.
- **Conditionals.** Yup's `.when("other", { is, then, otherwise })` makes a field's rules depend on another field. Zod expresses this with `superRefine` on the parent object or a discriminated union.
- **Error collection.** Yup's `abortEarly: false` collects all errors; Zod always collects all issues.
- **Paths.** Yup's `ValidationError.inner[].path` is a dotted string with bracketed indices (`items[2].qty`); Zod's issue `path` is an array (`["items", 2, "qty"]`).

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table mapping common Yup schema features to their Zod equivalents, with notes on behavioural differences for forms." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Yup concepts and their Zod equivalents</title>
  <desc>Yup string required maps to Zod string min one with a message. Yup number with automatic casting maps to Zod preprocess or coerce, with empty strings handled explicitly. Yup nullable maps to Zod nullable. Yup when conditional rules map to superRefine on the parent object or a discriminated union. Yup oneOf maps to Zod enum. Yup ref for comparing fields maps to superRefine comparing values. The abortEarly false option has no Zod equivalent because Zod always collects all issues.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Yup</text>
  <text x="222.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Zod</text>
  <text x="449.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Watch out for</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">string().required()</text>
  <text x="222.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">z.string().min(1, msg)</text>
  <text x="449.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;&quot; passes z.string() alone</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">number() (casts)</text>
  <text x="222.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">preprocess / z.coerce.number()</text>
  <text x="449.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;&quot; → 0 with coerce</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">nullable()</text>
  <text x="222.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.nullable()</text>
  <text x="449.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">optional ≠ nullable</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">when(&quot;x&quot;, {…})</text>
  <text x="222.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">superRefine on parent / union</text>
  <text x="449.2" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">rule moves up a level</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">oneOf([…])</text>
  <text x="222.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">z.enum([…])</text>
  <text x="449.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">enum needs string literals</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">ref(&quot;password&quot;)</text>
  <text x="222.4" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">superRefine comparing fields</text>
  <text x="449.2" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">put issue on the right path</text>
</svg>

---

## The core pattern: a translated schema and a side-by-side check

```typescript
// BEFORE: Yup
import * as yup from "yup";
export const signupYup = yup.object({
  accountType: yup.mixed<"personal" | "business">().oneOf(["personal", "business"]).required(),
  company: yup.string().when("accountType", {
    is: "business",
    then: (s) => s.required("Enter your company name."),
    otherwise: (s) => s.strip(),
  }),
  age: yup.number().typeError("Enter your age as a number.").min(16, "You must be 16 or over.").required("Enter your age."),
  password: yup.string().min(12, "Use at least 12 characters.").required("Create a password."),
  confirm: yup.string().oneOf([yup.ref("password")], "Passwords do not match.").required("Re-enter your password."),
});
```

```typescript
// AFTER: Zod — same behaviour, made explicit
import { z } from "zod";
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const signupZod = z.object({
  accountType: z.enum(["personal", "business"], { required_error: "Choose an account type." }),
  company: z.string().trim().optional(),
  // Yup's cast, made explicit: "" → missing, "42" → 42, "abc" → type error.
  age: z.preprocess((v) => { const e = emptyToUndefined(v); return typeof e === "string" && e !== "" && !Number.isNaN(Number(e)) ? Number(e) : e; },
    z.number({ required_error: "Enter your age.", invalid_type_error: "Enter your age as a number." })
      .min(16, "You must be 16 or over.")),
  password: z.string().min(1, "Create a password.").min(12, "Use at least 12 characters."),
  confirm: z.string().min(1, "Re-enter your password."),
}).superRefine((v, ctx) => {
  // Yup's when(): the conditional rule moves to the parent.
  if (v.accountType === "business" && !v.company) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["company"], message: "Enter your company name." });
  }
  // Yup's ref(): cross-field comparison on the parent.
  if (v.confirm && v.password !== v.confirm) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm"], message: "Passwords do not match." });
  }
}).transform((v) => (v.accountType === "business" ? v : { ...v, company: undefined })); // Yup's strip()
```

```typescript
// During migration: run both on real inputs and report any disagreement.
export async function compareSchemas(input: Record<string, unknown>) {
  const yupErrors = await signupYup.validate(input, { abortEarly: false }).then(() => ({}))
    .catch((e: yup.ValidationError) => Object.fromEntries(e.inner.map((i) => [i.path, i.message])));
  const z = signupZod.safeParse(input);
  const zodErrors = z.success ? {} : Object.fromEntries(z.error.issues.map((i) => [i.path.join("."), i.message]));
  const keys = new Set([...Object.keys(yupErrors), ...Object.keys(zodErrors)]);
  return [...keys].filter((k) => (yupErrors as any)[k] !== (zodErrors as any)[k])
    .map((k) => ({ field: k, yup: (yupErrors as any)[k], zod: (zodErrors as any)[k] }));
}
```

---

## Step-by-step walkthrough

1. **Inventory Yup features in use.** `when`, `ref`, `test`, `transform`, `strip`, `lazy`, custom `typeError` messages. These are where behaviour lives; plain `string().min()` translates trivially.
2. **Make Yup's casting explicit.** For every `number()`, `date()` and `boolean()` field, add the preprocessing that reproduces Yup's cast — empty to missing, numeric strings to numbers — as in [coercing form strings with Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/).
3. **Move `when` and `ref` rules to the parent object.** Use `superRefine` with issues placed on the dependent field's path, or a discriminated union when the condition selects whole sets of fields.
4. **Port messages exactly.** Keep wording identical during migration so any difference in behaviour stands out.
5. **Run both schemas side by side.** In development and tests, validate real and fixture inputs with both and report disagreements; fix until the list is empty.
6. **Switch per form, then remove Yup.** Resolvers make this a one-line change per form (`yupResolver` → `zodResolver`); remove Yup once the last form moves.

### Why behaviour, not syntax, is the migration

A migration that only translates method calls will pass type checks and most tests, because tests usually cover valid input and one or two obvious errors. The regressions hide in the edges Yup handled implicitly: an optional number field left empty, a whitespace-only name, a conditional field hidden by an earlier answer. Users meet those edges on the first day. Treating the old schema as the specification — and diffing the new one against it on a corpus of real inputs, including recorded submissions if you have them — catches the regressions before users do, and turns implicit behaviour into explicit, reviewed code.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of an incremental Yup to Zod migration — inventory, translate one form, diff both schemas on fixtures, switch the resolver, repeat, remove Yup." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>An incremental migration</title>
  <desc>First inventory Yup features in use across forms. Then translate one form&#x27;s schema to Zod, making casting explicit and moving conditional rules to the parent. Run both schemas on a set of fixture inputs and fix every disagreement. Switch that form&#x27;s resolver to Zod behind a flag and monitor. Repeat for each form. When no form uses Yup, remove the dependency.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="398.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Inventory Yup features</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">when, ref, test, casts, strip.</text>
  <text x="442.7" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Where the behaviour actually lives.</text>
  <path d="M213.4,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="209.4,89.0 213.4,96.0 217.4,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="398.7" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Translate one form</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Explicit casting; rules to parent.</text>
  <text x="442.7" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Messages copied verbatim.</text>
  <path d="M213.4,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="209.4,174.0 213.4,181.0 217.4,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="398.7" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Diff on fixtures</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">compareSchemas(input) until empty.</text>
  <text x="442.7" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Include blanks, whitespace, hidden conditionals.</text>
  <path d="M213.4,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="209.4,259.0 213.4,266.0 217.4,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="398.7" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Switch resolver, repeat, remove Yup</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One form at a time.</text>
  <text x="442.7" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Delete the dependency after the last form.</text>
</svg>

---

## Failure modes and edge cases

### 1. Empty strings that used to be `undefined`

Yup's `number()` treats `""` as a cast failure (or `undefined` with `.transform`), while `z.string()` accepts `""` as a valid string. Required text fields need `.min(1)` in Zod — the single most common regression.

### 2. `.strip()` and unknown keys

Yup can strip fields conditionally; Zod's `.strip()` removes *unknown* keys only. Reproduce conditional stripping with a `.transform` on the parent, or rely on your payload builder's relevance rules.

### 3. Refinements that break `.pick` and `.partial`

Once the object has `superRefine`, you cannot `.pick` steps from it. Keep a base object without refinements, as in [partial Zod schemas for drafts and wizard steps](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/partial-schemas-for-drafts-and-steps/).

### 4. Error path formats

Code that reads `errors["items[2].qty"]` from Yup breaks with Zod's `items.2.qty`. Normalise paths in one adapter during migration.

### 5. Async tests

Yup's `test` supports async functions naturally. Zod supports async refinements with `parseAsync`; if the form library calls the synchronous parse, async refinements throw. Check that your resolver uses async parsing, or move remote checks out of the schema.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing fixture input categories that reveal behavioural differences between a Yup schema and its Zod translation." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The fixture inputs that catch migration regressions</title>
  <desc>Blank inputs, meaning empty strings in required and optional fields, reveal casting and required differences. Whitespace-only inputs reveal differences in trimming. Hidden conditional fields filled with stale values reveal differences in when and strip behaviour. Numeric strings and non-numeric text in number fields reveal differences between Yup&#x27;s casting and Zod&#x27;s strict types.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Blank strings</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Required and optional fields</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">left empty.</text>
  <rect x="180.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Whitespace only</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot; &quot; in name and email.</text>
  <rect x="347.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Hidden conditionals</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Company filled, then</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">account switched to</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">personal.</text>
  <rect x="513.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Number strings</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;42&quot;, &quot;4 2&quot;, &quot;abc&quot;, &quot;&quot; in age.</text>
</svg>

---

## Verification checklist

- [ ] Every Yup feature in use has a documented Zod equivalent.
- [ ] Numeric, date and boolean fields reproduce Yup's casting explicitly.
- [ ] Required text fields reject empty strings.
- [ ] Conditional and cross-field rules place issues on the same fields as before.
- [ ] Both schemas agree on a fixture set including blank, whitespace and hidden-field cases.
- [ ] Error paths are normalised for code that reads them.
- [ ] Yup is removed from the bundle after the last form migrates.

---

## Frequently Asked Questions

<details>
<summary><strong>Is migrating worth it if Yup works?</strong></summary>

If your team is on TypeScript and maintaining separate types for form values, Zod's inference removes that duplication and catches mismatches at compile time. If types are not a pain point, the migration risk may not be worth it.

</details>

<details>
<summary><strong>Can Yup infer TypeScript types too?</strong></summary>

Yes — Yup v1 offers `InferType` and improved typings. The gap has narrowed; Zod's inference is still more precise for unions, transforms and input versus output types, which matters for forms with coercion.

</details>

<details>
<summary><strong>Should I go straight to Valibot instead?</strong></summary>

If bundle size is the priority, possibly. The same behaviour-first process applies; see [migrating from Zod to Valibot](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-zod-to-valibot/) for the API differences, which are larger than Yup-to-Zod.

</details>

---

## Related

- [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
- [Zod vs Yup vs Valibot Bundle Size and Performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/)
- [Wiring React Hook Form to a Zod Resolver](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/wiring-react-hook-form-to-a-zod-resolver/)

← [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
