---
layout: page.njk
title: "Discriminated Unions for Conditional Schemas"
description: "Express a branch structurally instead of as a conditional rule, so the impossible combination stops compiling and choosing nothing produces one message rather than every branch’s required errors."
slug: discriminated-unions-for-conditional-schemas
type: howto
breadcrumb: "Discriminated Unions for Conditional Schemas"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Discriminated Unions for Conditional Schemas"
  parent: "Integrating Zod for Schema Validation"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Discriminated Unions for Conditional Schemas",
      "description": "Express a branch structurally instead of as a conditional rule, so the impossible combination stops compiling and choosing nothing produces one message rather than every branch’s required errors.",
      "datePublished": "2026-08-05",
      "dateModified": "2026-08-05",
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
          "item": "https://www.client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Validation Logic & Schema Integration",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Integrating Zod for Schema Validation",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Discriminated Unions for Conditional Schemas",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Model a conditional form branch as a discriminated union",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Identify the field the reader picks first"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Give it a literal type in every branch"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Put branch-specific fields only in their branch"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Render the field list from the selected branch"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Decide what the unchosen state parses as"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Flatten to the API shape in one adapter"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "When is a discriminated union the wrong shape?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "When there is no field the reader picks that determines the rest. A threshold rule — 'a reason is required when the amount is over 500' — has no discriminator, only a predicate, so it is a refinement. A union also gets unwieldy past three or four branches if each renders a completely different field set, at which point separate forms are often clearer than one form with four faces."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle the state before the reader has chosen?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Either default the discriminator to the most common branch, which makes the value always parseable, or wrap the union in an optional and treat 'unchosen' as a distinct state your rendering understands. The one thing to avoid is letting an unchosen value fall through to a parse that reports required errors for every branch's fields — the reader sees six messages about fields they have not been shown."
          }
        },
        {
          "@type": "Question",
          "name": "Do refinements still work on a discriminated union?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and they are the right place for rules that span branches or that involve fields outside the union. Attach the refinement to the object containing the union rather than to a branch, so it can see everything, and set the path explicitly to reach a field inside the selected branch. A refinement on a single branch is fine too; it simply never runs when another branch is selected."
          }
        }
      ]
    }
  ]
}
</script>

# Discriminated Unions for Conditional Schemas

The exact problem: a form has a delivery method with two branches, and the schema expresses it as an object where every branch's fields are optional plus a refinement that makes some of them required — so the type says a collection order might have a post code, and nothing stops code from reading one.

## Context and Prerequisites

This is the structural alternative to the conditional rules in [conditional required fields without cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/), built on the Zod foundations in [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/). The difference it makes is not stylistic: with a union, the impossible combination stops compiling.

## Core Pattern

```typescript
import { z } from 'zod';

// The discriminator must be a literal in every branch. Zod uses it to pick a
// branch WITHOUT trying the others, which is why errors stay specific.
const deliverySchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('home'),
    line1: z.string().min(1, 'Enter the first line of the address'),
    postcode: z.string().min(4, 'Enter a post code, for example M1 4AB'),
  }),
  z.object({
    method: z.literal('collect'),
    pickupPointId: z.string().min(1, 'Choose a collection point'),
    // No address fields exist here at all — not optional, absent.
  }),
]);

type Delivery = z.infer<typeof deliverySchema>;

// The payoff is at the type level: this does not compile, because postcode is
// not a property of the collect branch.
function label(d: Delivery): string {
  if (d.method === 'collect') return d.pickupPointId;   // narrowed
  return d.postcode;                                     // narrowed the other way
}
```

Compare that with the optional-plus-refinement shape, where `postcode` is `string | undefined` in every branch, every consumer needs a non-null assertion, and the refinement is the only thing preventing a collection order from carrying an address.

<svg viewBox="0 8 690 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of a discriminated union against an all-optional object with a refinement, across what the type says, where an error is attached, whether the impossible state is representable, and how errors read when the discriminator is missing." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two ways to model a branch, and what each costs later</title>
  <desc>With a discriminated union, the inferred type narrows on the discriminator so each branch exposes only its own fields, an impossible combination cannot be constructed, errors are attached to the fields of the selected branch only, and a missing discriminator produces one clear message about the discriminator itself. With an all-optional object plus a refinement, every branch-specific field is possibly undefined so consumers need assertions, an impossible combination is representable and only a runtime rule prevents it, errors come from the refinement and must set their own paths, and a missing discriminator produces required-field errors for every branch at once.</desc>
  <rect x="0" y="8" width="690" height="216" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Question</text>
  <text x="240" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">discriminated union</text>
  <text x="460" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">optional + refinement</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">what the type says</text>
  <text x="240" y="66" font-size="10" fill="#2d6342" font-family="inherit">narrows per branch</text>
  <text x="460" y="66" font-size="10" fill="#a63d6f" font-family="inherit">everything possibly undefined</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">impossible combination</text>
  <text x="240" y="100" font-size="10" fill="#2d6342" font-family="inherit">unrepresentable</text>
  <text x="460" y="100" font-size="10" fill="#a63d6f" font-family="inherit">representable; a rule forbids it</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">where errors attach</text>
  <text x="240" y="134" font-size="10" fill="#2d6342" font-family="inherit">the selected branch only</text>
  <text x="460" y="134" font-size="10" fill="#6b5f75" font-family="inherit">wherever the refinement says</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">no discriminator yet</text>
  <text x="240" y="168" font-size="10" fill="#2d6342" font-family="inherit">one message, about it</text>
  <text x="460" y="168" font-size="10" fill="#a63d6f" font-family="inherit">required errors for every branch</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">The last row is what readers notice: choosing nothing should ask them to choose, not list six fields they have never seen.</text>
</svg>

<svg viewBox="0 8 690 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A discriminated union is strongest: the type narrows, an impossible combination cannot be constructed, and choosing nothing produces one message about the chooser. A plain union without a discriminator still narrows but Zod must try every branch, so a failure reports every branch's errors and the reader sees a wall. An all-optional object with a refinement narrows nothing, so every consumer needs assertions and only a runtime rule prevents the impossible state." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three ways to express a branch, ranked</title>
  <desc>A discriminated union is strongest: the type narrows, an impossible combination cannot be constructed, and choosing nothing produces one message about the chooser. A plain union without a discriminator still narrows but Zod must try every branch, so a failure reports every branch's errors and the reader sees a wall. An all-optional object with a refinement narrows nothing, so every consumer needs assertions and only a runtime rule prevents the impossible state.</desc>
  <rect x="0" y="8" width="690" height="206" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="132" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Expression</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Type narrows?</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Errors on failure</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">discriminated union</text>
  <text x="220" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes, on the tag</text>
  <text x="400" y="66" font-size="10" fill="#2d6342" font-family="inherit">one branch’s, or the tag’s</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">plain union</text>
  <text x="220" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="400" y="100" font-size="10" fill="#a63d6f" font-family="inherit">every branch’s, together</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">optional + refinement</text>
  <text x="220" y="134" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="400" y="134" font-size="10" fill="#1e1a24" font-family="inherit">whatever the rule says</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">The middle row is why the discriminator matters: without it every branch is attempted and every branch’s errors are reported.</text>
</svg>

## Step-by-Step Walkthrough

1. **Find the discriminator.** It is the field the reader picks first — a radio group, a select. If there is no such field, a union is the wrong shape.

2. **Give it a literal type in every branch.** `z.literal('home')`, not `z.string()`.

3. **Put each branch's fields only in that branch.** Not optional in a shared object.

4. **Render from the branch.** The form's field list for the current branch comes from the same union, so a new branch cannot be added without its fields appearing.

5. **Handle the not-yet-chosen state.** Before the reader picks, the value matches no branch. Either default the discriminator or make the wrapper optional and treat "unchosen" as its own state.

6. **Compose with the whole form.** The union is one property of the form object; the rest of the schema is unaffected.

## Failure Modes and Edge Cases

### 1. The discriminator is not set yet

`safeParse` reports that the discriminator is invalid, which is the right message — but only if you render it against the chooser. Attach it to the radio group, not to a field inside a branch that does not exist yet.

### 2. Shared fields duplicated across branches

A field present in every branch is noise repeated per branch. Intersect a shared object with the union rather than copying it.

### 3. Values kept from the other branch

Switching from home to collect leaves the address values in state, and the union no longer parses them — usually harmlessly, since they are dropped, but they will reappear if the reader switches back, which is often what you want. Decide deliberately rather than discovering it.

### 4. Three or more branches

Unions scale fine; the form does not, if every branch renders a different field set with no shared layout. Keep the branch-specific part small.

### 5. The server does not model it as a union

If the API accepts a flat object with optional fields, the union has to be flattened on the way out. Do it in one adapter, and keep the union as the client's model.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The chooser is always rendered — it is the discriminator, and it is what the reader picks. The selected branch's fields are rendered from the same union that validates them, so a branch cannot gain a field without the form showing it. The other branch's fields are not rendered, and their values are not submitted, because the union drops them. And the decision about whether to keep those values in state for a switch back is made once, deliberately." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the form renders, per branch</title>
  <desc>The chooser is always rendered — it is the discriminator, and it is what the reader picks. The selected branch's fields are rendered from the same union that validates them, so a branch cannot gain a field without the form showing it. The other branch's fields are not rendered, and their values are not submitted, because the union drops them. And the decision about whether to keep those values in state for a switch back is made once, deliberately.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">What the form renders, per branch</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">the chooser</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">always rendered —</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">it is the discriminator</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">this branch</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">fields come from the</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">same union</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">the other branch</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">not rendered, not</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">submitted</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">its old values</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">kept or dropped —</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">decide once</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Deriving the rendered field list from the union is what stops a new branch shipping without its fields appearing.</text>
</svg>

## Verification Checklist

- [ ] The discriminator has a literal type in every branch
- [ ] Branch-specific fields exist only in their branch
- [ ] The type narrows — reading the wrong branch's field is a compile error
- [ ] Choosing nothing produces one message, on the chooser
- [ ] Shared fields are intersected, not duplicated
- [ ] Switching branches has a decided behaviour for the other branch's values
- [ ] The flat payload the API wants is produced by one adapter

## Common Pitfalls

- **A union without a discriminator.** Every branch is attempted, so a failure reports every branch’s errors at once and the reader sees a wall of messages about fields they never chose.
- **Optional fields plus a refinement.** The type narrows nothing, every consumer needs an assertion, and only a runtime rule prevents an impossible record.
- **Duplicating shared fields per branch.** The same field repeated in three branches is three places to change it. Intersect a shared object with the union instead.
- **Leaving the unchosen state undefined.** A value matching no branch produces required errors for every branch’s fields. Default the discriminator, or treat unchosen as its own state.
- **Rendering a hand-written field list.** Derive the rendered fields from the same union that validates them, or a new branch ships without its fields appearing.

---

**Related**

- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — the foundations
- [Conditional Required Fields Without Cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/) — the rule-based alternative
- [Validating Only the Current Step](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/) — where a conditional step meets a union

← [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)

## Frequently Asked Questions

<details>
<summary><strong>When is a discriminated union the wrong shape?</strong></summary>

When there is no field the reader picks that determines the rest. A threshold rule — 'a reason is required when the amount is over 500' — has no discriminator, only a predicate, so it is a refinement. A union also gets unwieldy past three or four branches if each renders a completely different field set, at which point separate forms are often clearer than one form with four faces.

</details>

<details>
<summary><strong>How do I handle the state before the reader has chosen?</strong></summary>

Either default the discriminator to the most common branch, which makes the value always parseable, or wrap the union in an optional and treat 'unchosen' as a distinct state your rendering understands. The one thing to avoid is letting an unchosen value fall through to a parse that reports required errors for every branch's fields — the reader sees six messages about fields they have not been shown.

</details>

<details>
<summary><strong>Do refinements still work on a discriminated union?</strong></summary>

Yes, and they are the right place for rules that span branches or that involve fields outside the union. Attach the refinement to the object containing the union rather than to a branch, so it can see everything, and set the path explicitly to reach a field inside the selected branch. A refinement on a single branch is fine too; it simply never runs when another branch is selected.

</details>

