---
layout: page.njk
title: "Partial Zod Schemas for Drafts and Wizard Steps"
description: "Derive draft and per-step schemas from one full Zod schema with partial, pick, deepPartial alternatives and extend — so saving an incomplete draft, validating the current wizard step and validating the final submit all use the same rules."
slug: partial-schemas-for-drafts-and-steps
type: howto
breadcrumb: "Partial Schemas"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Partial Zod Schemas for Drafts and Wizard Steps"
  parent: "Integrating Zod for Schema Validation"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Partial Zod Schemas for Drafts and Wizard Steps",
      "description": "Derive draft and per-step schemas from one full Zod schema with partial, pick, deepPartial alternatives and extend — so saving an incomplete draft, validating the current wizard step and validating the final submit all use the same rules.",
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
          "name": "Partial Zod Schemas for Drafts and Wizard Steps",
          "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/partial-schemas-for-drafts-and-steps/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Derive draft and step schemas from one Zod schema",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Define a base object with per-field rules and no object-level refinements"
        },
        {
          "@type": "HowToStep",
          "name": "Write refinements as standalone functions"
        },
        {
          "@type": "HowToStep",
          "name": "Derive step schemas with .pick"
        },
        {
          "@type": "HowToStep",
          "name": "Decide what \"draft\" means"
        },
        {
          "@type": "HowToStep",
          "name": "Attach cross-step refinements only at submit"
        },
        {
          "@type": "HowToStep",
          "name": "Strip unknown keys in drafts"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just validate the whole form on every step and filter errors?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It works for small forms, and it is a reasonable shortcut. It becomes costly with async refinements or large schemas, and error filtering by step needs its own mapping. Picking a step schema is clearer and cheaper."
          }
        },
        {
          "@type": "Question",
          "name": "Can the draft schema reuse base rules at all?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, selectively. Rules that should hold even for drafts — a maximum length that protects storage, an enum value that must be one of the options — can be copied into the draft schema by picking from the base for those fields and merging with the relaxed ones."
          }
        },
        {
          "@type": "Question",
          "name": "How does this work in Zod 4?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same methods exist on object schemas (pick, omit, partial, extend), and refinements still need to be kept off the base to preserve them. Check your version's release notes for changes to merge and to how refinements compose."
          }
        }
      ]
    }
  ]
}
</script>

# Partial Zod Schemas for Drafts and Wizard Steps

A multi-step application form usually ends up with three schemas that drift apart: the full schema for final submit, a hand-written "draft" schema that is looser, and per-step schemas copied from bits of the full one — until a rule changes in one place, and a user who completed step 2 is told at submit that step 2 is invalid.

Zod can derive all three from the full schema: `.pick()` for a step's fields, `.partial()` for drafts, and `.extend()` or `.merge()` to recombine. This page builds that derivation so every rule lives in one place. It serves both [validating only the current step](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/) and [versioning and migrating saved draft schemas](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/versioning-and-migrating-saved-draft-schemas/), within [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/).

---

## Context and prerequisites

Three validation moments, three strictness levels:

- **Draft save** — accept anything the user has typed so far, but reject values that are *wrong*, not merely *missing*. An email field containing "ada@" is incomplete and can be saved; a field holding an object where a string belongs is corrupt and should not be.
- **Step validation** — the current step's fields must be complete and valid; other steps are ignored.
- **Final submit** — the whole object must satisfy every rule, including cross-step refinements.

The derivation tools:

- **`.pick({ a: true })` / `.omit({ b: true })`** — select fields from an object schema, keeping each field's rules.
- **`.partial()`** — make every field optional (shallow). `.partial({ a: true })` for specific fields.
- **`.required()`** — the inverse, for fields that were optional.
- **`.extend()` / `.merge()`** — add or combine shapes.

The catch: refinements attached with `.refine`/`.superRefine` on an object are not carried through `.pick` or `.partial`, because those methods need the plain object shape. Keep object-level refinements separate and apply them where they belong.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of a base object shape feeding three derived schemas — a draft schema made with partial, step schemas made with pick, and a submit schema that adds cross-field refinements." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One base shape, three derived schemas</title>
  <desc>The base shape holds every field and its per-field rules, with no object-level refinements. The draft schema is the base made partial, so missing fields are allowed but present fields must be well typed. Each step schema picks that step&#x27;s fields from the base, keeping their rules exactly. The submit schema is the full base plus cross-field refinements such as end date after start date, applied last.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Draft = base.partial()</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Missing allowed.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Present values still typed.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Step = base.pick(fields)</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same rules, this step only.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Plus step-local refinements.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Submit = base + refinements</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Every field, every rule.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Cross-step checks last.</text>
</svg>

---

## The core pattern: base shape, derived schemas, refinements kept apart

```typescript
import { z } from "zod";

// 1. Base shape: every field with its per-field rules. NO .refine() here,
//    so .pick() and .partial() remain available.
export const ApplicationBase = z.object({
  fullName: z.string().trim().min(1, "Enter your full name."),
  email: z.string().trim().email("Enter an email like name@example.com."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a start date."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter an end date."),
  employer: z.string().trim().min(1, "Enter your employer."),
  salary: z.number().int().positive("Enter your salary."),
});

// 2. Reusable refinements, written against the fields they need.
const datesInOrder = <T extends { startDate?: string; endDate?: string }>(v: T, ctx: z.RefinementCtx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after the start date." });
  }
};

// 3. Steps pick their fields and add only the refinements that are local to them.
export const steps = {
  about: ApplicationBase.pick({ fullName: true, email: true }),
  dates: ApplicationBase.pick({ startDate: true, endDate: true }).superRefine(datesInOrder),
  employment: ApplicationBase.pick({ employer: true, salary: true }),
} as const;

// 4. Draft: every field optional, but anything present must be the right type.
//    Format rules are relaxed so half-typed values can be saved.
export const ApplicationDraft = z.object({
  fullName: z.string(),
  email: z.string(),               // "ada@" is fine in a draft
  startDate: z.string(),
  endDate: z.string(),
  employer: z.string(),
  salary: z.number(),
}).partial().strip();

// 5. Final submit: the full base plus every cross-step refinement.
export const ApplicationSubmit = ApplicationBase.superRefine(datesInOrder);

export type Application = z.infer<typeof ApplicationSubmit>;
```

---

## Step-by-step walkthrough

1. **Define a base object with per-field rules and no object-level refinements.** This keeps `.pick`, `.omit` and `.partial` available — refined schemas are `ZodEffects` and lose them.
2. **Write refinements as standalone functions.** A function taking the value and `ctx` can be attached to a step schema and to the submit schema without duplication.
3. **Derive step schemas with `.pick`.** Each step validates exactly the base's rules for its fields, then adds refinements whose fields all live on that step.
4. **Decide what "draft" means.** Usually: types must match, formats need not. That is a *different* schema from `base.partial()` (which would still reject "ada@"), so derive it deliberately — here, the same keys with type-only rules.
5. **Attach cross-step refinements only at submit.** A rule comparing a step-1 field with a step-3 field cannot run on either step alone; it belongs on the full schema, and its error should route the user back to the right step, as in [building a review step before final submit](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/building-a-review-step-before-final-submit/).
6. **Strip unknown keys in drafts.** `.strip()` removes fields that no longer exist, which matters when old drafts are restored after a release.

### Why "partial" is not the same as "draft"

`ApplicationBase.partial()` makes fields optional but keeps every rule on the fields that *are* present. For drafts, that is often too strict: a user halfway through typing an email has `"ada@"`, which fails `.email()`, so an autosave would be rejected at exactly the moment it is most useful. A draft schema answers a different question — "is this safe to store and restore?" — not "is this a valid answer?" Types must be right, so a restored draft cannot crash the form; formats and minimums can wait for step or submit validation. Keeping the two concepts separate avoids autosave failures that users never see but that silently lose their work.

<svg viewBox="0 0 680 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing how three example inputs — an empty email, a half-typed email, and end date before start date — are judged by the draft schema, the step schema and the submit schema." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The same value under each derived schema</title>
  <desc>An empty email is accepted by the draft schema, rejected by the about step schema with enter an email, and rejected at submit. A half-typed email ada@ is accepted by the draft, rejected by the step, and rejected at submit. An end date before the start date is accepted by the draft, rejected by the dates step because the refinement is local to that step, and rejected at submit.</desc>
  <rect x="0" y="0" width="680" height="160" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="132.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Input</text>
  <text x="250.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Draft</text>
  <text x="378.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Step</text>
  <text x="534.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submit</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">email: &quot;&quot;</text>
  <text x="250.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">saved</text>
  <text x="378.3" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;Enter an email…&quot;</text>
  <text x="534.3" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">email: &quot;ada@&quot;</text>
  <text x="250.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">saved</text>
  <text x="378.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;Enter an email…&quot;</text>
  <text x="534.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">endDate before startDate</text>
  <text x="250.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">saved</text>
  <text x="378.3" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">dates step: &quot;End date must</text>
  <text x="378.3" y="134.0" font-size="9.5" fill="#a63d6f" font-family="inherit">be after…&quot;</text>
  <text x="534.3" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
</svg>

---

## Failure modes and edge cases

### 1. `.pick` is not a function

Calling `.pick` on a schema that has `.refine` attached fails, because the result is an effects wrapper, not an object schema. Keep refinements off the base and apply them to derived schemas.

### 2. Nested objects and `.partial()`

`.partial()` is shallow: an optional `address` object still requires its own fields when present. For drafts with nested objects, build the draft shape explicitly or apply `.partial()` at each level. (Zod 3's `.deepPartial()` is deprecated; do not rely on it.)

### 3. Step schemas out of sync with step UI

If the step schema picks `email` but the step's UI no longer renders it, the user is blocked by an invisible field. Derive both from one step definition — a list of field names used for rendering *and* for `.pick`.

### 4. Discriminated unions

Conditional sections modelled with `z.discriminatedUnion` cannot be `.pick`ed across branches. Pick per branch, or validate the step against the union after merging defaults, as in [discriminated unions for conditional schemas](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/).

### 5. Type inference for drafts

`z.infer<typeof ApplicationDraft>` has every field optional, which is right for draft storage. Do not use the draft type for the submit payload; the submit type is `z.infer<typeof ApplicationSubmit>`.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for choosing the draft, step or submit schema depending on whether the form is autosaving, moving to the next step, or submitting." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which schema to run at each moment</title>
  <desc>If the form is autosaving a draft, run the draft schema, which requires correct types but allows missing and half-typed values. If the user is moving to the next step, run that step&#x27;s schema, which enforces every rule for the step&#x27;s fields and its local refinements. If the user is submitting, run the full submit schema with every cross-step refinement.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Autosaving a draft?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">ApplicationDraft</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Moving to the next step?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">steps[current]</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">ApplicationSubmit</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Every rule, including cross-step.</text>
</svg>

---

## Verification checklist

- [ ] Every field rule is defined once, in the base shape.
- [ ] Step schemas are derived with `.pick`, not rewritten.
- [ ] Cross-step refinements run at submit and route errors to the right step.
- [ ] Autosave accepts half-typed values and rejects wrong types.
- [ ] Restored drafts with removed fields are stripped cleanly.
- [ ] Step UI and step schema share one list of field names.
- [ ] Changing a rule in the base changes step and submit validation together.

---

## Frequently Asked Questions

<details>
<summary><strong>Why not just validate the whole form on every step and filter errors?</strong></summary>

It works for small forms, and it is a reasonable shortcut. It becomes costly with async refinements or large schemas, and error filtering by step needs its own mapping. Picking a step schema is clearer and cheaper.

</details>

<details>
<summary><strong>Can the draft schema reuse base rules at all?</strong></summary>

Yes, selectively. Rules that should hold even for drafts — a maximum length that protects storage, an enum value that must be one of the options — can be copied into the draft schema by picking from the base for those fields and merging with the relaxed ones.

</details>

<details>
<summary><strong>How does this work in Zod 4?</strong></summary>

The same methods exist on object schemas (`pick`, `omit`, `partial`, `extend`), and refinements still need to be kept off the base to preserve them. Check your version's release notes for changes to `merge` and to how refinements compose.

</details>

---

## Related

- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Modelling a Branching Wizard With XState](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/modelling-a-branching-wizard-with-xstate/)
- [How to Validate Dependent Fields With Zod](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/)

← [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
