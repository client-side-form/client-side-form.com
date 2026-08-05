---
layout: page.njk
title: "Validating Only the Current Step"
description: "Keep one schema for the whole form and derive per-step views from it, so a wizard validates the step the reader is on without splitting rules into copies that drift."
slug: validating-only-the-current-step
type: howto
breadcrumb: "Validating Only the Current Step"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Validating Only the Current Step"
  parent: "Multi-Step Form State Machines"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating Only the Current Step",
      "description": "Keep one schema for the whole form and derive per-step views from it, so a wizard validates the step the reader is on without splitting rules into copies that drift.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Multi-Step Form State Machines",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Validating Only the Current Step",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate one wizard step without splitting the schema",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Keep one schema for the whole form"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Declare which fields each step owns"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Derive a per-step view with pick at the guard"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Return a field error map so the step can render messages"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Validate the whole schema once at submit"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Route cross-step rules to submit or to a dependency edge"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just write one schema per step?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because a rule then exists once per step that mentions it, and rules that appear twice diverge. The moment a postcode rule is needed on both the delivery step and a billing step, the two copies start drifting — usually in the message text first, then in the rule. Deriving step views with pick keeps the definition single while making the evaluation narrow, which is the actual goal."
          }
        },
        {
          "@type": "Question",
          "name": "What happens to cross-field rules that span two steps?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They cannot live in either step's view, and that is the right outcome. Attach them to the whole-form schema so they run at submit, and if the reader needs to know earlier, model the relationship as a dependency edge in the wizard machine so changing one step marks the other stale. A refinement smuggled into one step's schema makes that step untestable on its own and fires at a moment the reader cannot act on."
          }
        },
        {
          "@type": "Question",
          "name": "Should a blocked NEXT move focus, or just render the errors?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Move focus, to the first invalid field on that step. The reader pressed a button expecting to move, so leaving focus on the button after refusing gives them no indication of what to do next, and a screen reader reader hears nothing at all. Announce the count in a live region as well when more than one field failed, so the reader knows the size of the problem before they start."
          }
        },
        {
          "@type": "Question",
          "name": "Does picking a subset of the schema hurt performance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No, and it usually helps. Building the picked schema costs a small object allocation, which you can memoise per step if it bothers you, and running it parses a fraction of the fields the whole schema would. The saving is not the point though — the point is that the reader only sees errors for fields they can currently see."
          }
        }
      ]
    }
  ]
}
</script>

# Validating Only the Current Step

The exact problem: a wizard runs its whole schema on every step transition, so advancing from step one renders "Card number is required" against a step the reader has not reached — and the submit button is disabled for reasons that are three screens away.

## Context and Prerequisites

This builds directly on [multi-step form state machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/), where a step's `validate` function is the guard on the `NEXT` transition. It also assumes a schema layer of the kind described in [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — the technique below is about *scoping* a schema, not about which library defines it.

The instinct that causes the problem is reasonable: one schema per form is easier to keep consistent than one per step. The fix is not to abandon that, but to keep one schema and derive per-step views from it, so the definition stays single and the *evaluation* becomes narrow.

## Core Pattern: One Schema, Per-Step Views

```typescript
import { z } from 'zod';

// One definition for the whole form. This is what submit validates, what the
// server imports, and what the types are inferred from.
const checkoutSchema = z.object({
  email: z.string().email('Enter an email address we can reach you at'),
  phone: z.string().min(7, 'Enter a phone number including the area code'),
  method: z.enum(['home', 'collect']),
  line1: z.string().min(1, 'Enter the first line of the address'),
  postcode: z.string().min(4, 'Enter a postcode'),
  cardNumber: z.string().length(16, 'Enter the 16 digits on the front of the card'),
});

// Which keys each step owns. This is the only thing a step declares — the rules
// themselves stay in the schema above, so a message is written once.
const STEP_FIELDS = {
  contact:  ['email', 'phone'],
  delivery: ['method', 'line1', 'postcode'],
  payment:  ['cardNumber'],
} as const satisfies Record<string, readonly (keyof typeof checkoutSchema.shape)[]>;

type StepId = keyof typeof STEP_FIELDS;

/**
 * Build a schema covering only one step's keys. `.pick()` reuses the original
 * field schemas by reference, so a rule change lands in both the step view and
 * the whole-form schema with no chance of drift.
 */
function stepSchema(step: StepId) {
  const mask = Object.fromEntries(STEP_FIELDS[step].map((k) => [k, true as const]));
  return checkoutSchema.pick(mask as Record<string, true>);
}

/** Validate one step. Returns a field error map, empty when the step passes. */
export function validateStep(step: StepId, values: Record<string, unknown>): FieldErrorMap {
  const result = stepSchema(step).safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [String(i.path[0]), { message: i.message, code: i.code }]),
  );
}
```

The `pick` call is doing the important work. Because it reuses the field schemas by reference rather than copying them, there is exactly one place where "a postcode is at least four characters" is written down. Splitting the schema into three independent schemas would give the same narrow evaluation and immediately create three places for that rule to diverge.

<svg viewBox="0 8 690 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One whole-form schema with a per-step mask producing three step views, all sharing the same field rules by reference, and the whole schema still used for the final submit check." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One definition, three views, one submit check</title>
  <desc>A single whole-form schema sits at the centre. A per-step field mask derives three views from it: contact, covering email and phone; delivery, covering method, address line and postcode; and payment, covering the card number. Each view reuses the original field schemas by reference, so a message or rule is written once and cannot drift between a step view and the whole-form schema. The whole schema is still what the final submit validates, and what the server imports, so nothing about the split weakens the guarantee at the end.</desc>
  <rect x="0" y="8" width="690" height="224" fill="#f9f5fb"/>
  <rect x="14" y="88" width="176" height="66" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="102" y="112" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">checkoutSchema</text>
  <text x="102" y="130" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">every field, every rule</text>
  <text x="102" y="146" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">written exactly once</text>
  <path d="M190,121 H222 V48 H254" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M190,121 H254" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M190,121 H222 V194 H254" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="254" y="26" width="188" height="44" rx="7" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="268" y="46" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">pick: contact</text>
  <text x="268" y="62" font-size="9.5" fill="#6b5f75" font-family="inherit">email, phone</text>
  <rect x="254" y="99" width="188" height="44" rx="7" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="268" y="119" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">pick: delivery</text>
  <text x="268" y="135" font-size="9.5" fill="#6b5f75" font-family="inherit">method, line1, postcode</text>
  <rect x="254" y="172" width="188" height="44" rx="7" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="268" y="192" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">pick: payment</text>
  <text x="268" y="208" font-size="9.5" fill="#6b5f75" font-family="inherit">cardNumber</text>
  <path d="M442,48 H474" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M442,121 H474" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M442,194 H474" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="474" y="88" width="196" height="66" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="572" y="112" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">NEXT guard</text>
  <text x="572" y="130" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">only this step&#39;s keys</text>
  <text x="572" y="146" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">only this step&#39;s errors</text>
  <text x="14" y="42" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submit still uses</text>
  <text x="14" y="58" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the whole schema</text>
  <text x="14" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is weakened</text>
</svg>

## Step-by-Step Walkthrough

1. **Declare the field map, not three schemas.** `STEP_FIELDS` is the only thing a step owns. Adding a field to a step is a one-line change that cannot forget to bring its rule along.

2. **Derive the view at the guard.** `validateStep` runs on `NEXT` and nowhere else. Nothing calls the whole-form schema until submit.

3. **Return a map, not a boolean.** The machine only needs "did it pass", but the step needs the messages, and computing them twice is how the reader sees a blocked transition with no visible reason.

4. **Validate the whole schema once, at submit.** This is the check that matters, and it catches anything the per-step views could not see — a rule spanning two steps, or a field that belongs to no step at all.

5. **Keep cross-step rules out of the step views.** A refinement reading two steps cannot live in either `pick`. Attach it to the whole-form schema and evaluate it at submit, or model it as a dependency edge in the machine.

## Failure Modes and Edge Cases

### 1. A conditional step's fields are required unconditionally

If the delivery address is only required when `method === 'home'`, a `pick` over `line1` will demand it even for a collection order. The fix is structural rather than conditional — express the branch as a discriminated union so the field only exists in the branch that needs it:

```typescript
// The address fields exist only in the 'home' variant, so a collection order
// cannot fail a rule about a field it does not have.
const deliverySchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('home'), line1: z.string().min(1), postcode: z.string().min(4) }),
  z.object({ method: z.literal('collect'), pickupPointId: z.string().min(1) }),
]);
```

### 2. `pick` over a refined schema silently drops the refinement

A `.superRefine()` attached to the whole object does not survive a `pick`, because the refinement is a property of the object schema rather than of any field. This is usually what you want — a cross-field rule should not run inside one step — but it is worth knowing rather than discovering. If a rule genuinely belongs to one step, attach it to that step's derived schema explicitly.

### 3. The submit check finds errors no step could show

A field that belongs to no step, or a cross-step rule, can fail at submit with nowhere to render. Route those to the form-level error summary, and make the `SUBMIT` guard navigate to the step owning the first field-scoped error. An error the reader cannot reach is indistinguishable from a form that is simply broken.

### 4. Per-step validation and per-field validation disagree

The step guard runs `pick`ed rules; the field's own on-blur validation usually runs the single field schema. They must come from the same definition or a field can pass on blur and fail on `NEXT`, which reads as the form changing its mind. Deriving both from `checkoutSchema.shape[field]` keeps them identical.

<svg viewBox="0 8 668 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three validation scopes and when each runs: a single field on blur, one step's keys on next, and the whole schema at submit — with a note that all three derive from the same definition so they cannot disagree." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three scopes, three moments, one definition</title>
  <desc>A single field's schema runs on blur and reports one message beside that field. One step's picked schema runs on the next transition and reports messages for that step's fields only. The whole schema, including any cross-field refinements, runs at submit and is the check that actually guarantees correctness. Because all three are derived from the same object schema, a field cannot pass one scope and fail another for the same reason — which is what makes the narrowing safe rather than merely convenient.</desc>
  <rect x="0" y="8" width="668" height="214" fill="#f9f5fb"/>
  <rect x="14" y="30" width="206" height="92" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">one field</text>
  <text x="28" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">runs on: blur</text>
  <text x="28" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">reports: one message</text>
  <text x="28" y="110" font-size="9.5" fill="#6b5f75" font-family="inherit">shape[field]</text>
  <rect x="232" y="30" width="206" height="92" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="246" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">one step</text>
  <text x="246" y="72" font-size="9.5" fill="#1e1a24" font-family="inherit">runs on: NEXT</text>
  <text x="246" y="90" font-size="9.5" fill="#1e1a24" font-family="inherit">reports: this step only</text>
  <text x="246" y="110" font-size="9.5" fill="#1e1a24" font-family="inherit">pick(STEP_FIELDS[id])</text>
  <rect x="450" y="30" width="204" height="92" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="464" y="52" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">the whole form</text>
  <text x="464" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">runs on: SUBMIT</text>
  <text x="464" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">reports: everything</text>
  <text x="464" y="110" font-size="9.5" fill="#6b5f75" font-family="inherit">checkoutSchema</text>
  <rect x="14" y="140" width="640" height="46" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="160" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">All three derive from one object schema</text>
  <text x="28" y="178" font-size="9.5" fill="#6b5f75" font-family="inherit">so a field cannot pass on blur and fail on NEXT for the same reason — the narrowing is safe, not just convenient.</text>
  <text x="14" y="210" font-size="10" fill="#6b5f75" font-family="inherit">Only the third scope is a guarantee. The first two exist to make the reader&#39;s path to it shorter.</text>
</svg>

### 5. The reader jumps back and the later step is not re-validated

Per-step validation on `NEXT` means a step validated once and never again. When an earlier answer changes, the machine's `stale` phase is what forces the re-check; without it, a step validated under old inputs stays `complete` forever.

One last thing the step view cannot see, and where each of those belongs instead:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A rule spanning two steps cannot live in either picked view and belongs on the whole-form schema at submit. A rule about a field owned by no step, such as a hidden token, also belongs there. A remote check belongs in the validation queue rather than in any schema the step guard runs. And a rule about the path itself, such as at least one delivery option being reachable, belongs in the machine rather than in a schema at all." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a per-step view cannot judge</title>
  <desc>A rule spanning two steps cannot live in either picked view and belongs on the whole-form schema at submit. A rule about a field owned by no step, such as a hidden token, also belongs there. A remote check belongs in the validation queue rather than in any schema the step guard runs. And a rule about the path itself, such as at least one delivery option being reachable, belongs in the machine rather than in a schema at all.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The rule</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cannot live in</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Belongs in</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">spans two steps</text>
  <text x="200" y="66" font-size="10" fill="#a63d6f" font-family="inherit">either step view</text>
  <text x="400" y="66" font-size="10" fill="#2d6342" font-family="inherit">the whole-form schema, at submit</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">field owned by no step</text>
  <text x="200" y="100" font-size="10" fill="#a63d6f" font-family="inherit">any step view</text>
  <text x="400" y="100" font-size="10" fill="#2d6342" font-family="inherit">the whole-form schema, at submit</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">a remote check</text>
  <text x="200" y="134" font-size="10" fill="#a63d6f" font-family="inherit">a synchronous schema</text>
  <text x="400" y="134" font-size="10" fill="#2d6342" font-family="inherit">the validation queue</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">about the path itself</text>
  <text x="200" y="168" font-size="10" fill="#a63d6f" font-family="inherit">a schema of any kind</text>
  <text x="400" y="168" font-size="10" fill="#2d6342" font-family="inherit">the wizard machine</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">A rule you cannot place is usually a rule about the sequence rather than about any field in it.</text>
</svg>

## Verification Checklist

- [ ] Advancing from step one shows only step one's messages
- [ ] The submit button's disabled state is explained by something on the current step
- [ ] A rule message appears in exactly one place in the codebase
- [ ] Changing a field's rule changes both the on-blur message and the `NEXT` message
- [ ] A conditional step's fields are not required when that step is off the path
- [ ] Submit still validates the whole schema, including cross-field refinements
- [ ] A submit-time error with no step to render it appears in the form-level summary
- [ ] Focus moves to the first invalid field on a blocked `NEXT`, not to the step heading

---

**Related**

- [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/) — where the step guard lives
- [Discriminated Unions for Conditional Schemas](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/) — expressing a conditional step structurally
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — when each scope is allowed to speak

← [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)

## Frequently Asked Questions

<details>
<summary><strong>Why not just write one schema per step?</strong></summary>

Because a rule then exists once per step that mentions it, and rules that appear twice diverge. The moment a postcode rule is needed on both the delivery step and a billing step, the two copies start drifting — usually in the message text first, then in the rule. Deriving step views with pick keeps the definition single while making the evaluation narrow, which is the actual goal.

</details>

<details>
<summary><strong>What happens to cross-field rules that span two steps?</strong></summary>

They cannot live in either step's view, and that is the right outcome. Attach them to the whole-form schema so they run at submit, and if the reader needs to know earlier, model the relationship as a dependency edge in the wizard machine so changing one step marks the other stale. A refinement smuggled into one step's schema makes that step untestable on its own and fires at a moment the reader cannot act on.

</details>

<details>
<summary><strong>Should a blocked NEXT move focus, or just render the errors?</strong></summary>

Move focus, to the first invalid field on that step. The reader pressed a button expecting to move, so leaving focus on the button after refusing gives them no indication of what to do next, and a screen reader reader hears nothing at all. Announce the count in a live region as well when more than one field failed, so the reader knows the size of the problem before they start.

</details>

<details>
<summary><strong>Does picking a subset of the schema hurt performance?</strong></summary>

No, and it usually helps. Building the picked schema costs a small object allocation, which you can memoise per step if it bothers you, and running it parses a fraction of the fields the whole schema would. The saving is not the point though — the point is that the reader only sees errors for fields they can currently see.

</details>

