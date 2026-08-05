---
layout: page.njk
title: "Async Refinements for Remote Checks with Zod"
description: "Keep the schema the form validates with synchronous, and extend it for submit — because one async refinement makes the whole schema async, which is the guard rather than the problem."
slug: async-refinements-for-remote-checks-with-zod
type: howto
breadcrumb: "Async Refinements for Remote Checks with Zod"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Async Refinements for Remote Checks with Zod"
  parent: "Integrating Zod for Schema Validation"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Async Refinements for Remote Checks with Zod",
      "description": "Keep the schema the form validates with synchronous, and extend it for submit — because one async refinement makes the whole schema async, which is the guard rather than the problem.",
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
          "name": "Async Refinements for Remote Checks with Zod",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/async-refinements-for-remote-checks-with-zod/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Add a remote check to a Zod schema without making every keystroke async",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Keep the base schema fully synchronous"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Extend it with an async superRefine for submit"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Always set a path on the issue"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Debounce a separate field-level check for early feedback"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Treat a failed request as unknown rather than invalid"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Share the submit schema with the server"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not put the async check in the schema the form validates with?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because any async refinement makes the entire schema async, so every change-handler call becomes a promise and a network round trip. The reader would get one request per keystroke and the form would lose its synchronous validity answer, which the submit button and the step guard both depend on. Keeping the base synchronous and extending it for submit gives you one definition and two costs."
          }
        },
        {
          "@type": "Question",
          "name": "Do async refinements run if another field is invalid?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Refinements run only after the base object parses successfully, so a malformed email means the uniqueness check never fires. That is usually the behaviour you want — there is no point asking whether an invalid address is taken — but it does mean the remote result is absent rather than passing, and code reading the result should not treat its absence as success."
          }
        },
        {
          "@type": "Question",
          "name": "How do I cancel an in-flight refinement?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Zod does not thread an AbortSignal through refinements, so close over one from the caller and check it at the top of the refinement before issuing the request. On submit that is rarely needed, since the reader is waiting for the result anyway. It matters for the debounced field-level check, which is not a refinement at all — it is a plain validator running through the validation queue."
          }
        }
      ]
    }
  ]
}
</script>

# Async Refinements for Remote Checks with Zod

The exact problem: a Zod schema needs to check that an email address is not already registered, and the obvious implementation — an async refinement inside the schema used for every keystroke — fires a request per character and makes `safeParse` a network call.

## Context and Prerequisites

The synchronous half of this is in [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/), and the sequencing in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/). The key structural decision is made before any code: **the async check does not belong in the schema the form validates on every change.**

## Core Pattern: Two Schemas, One Definition

```typescript
import { z } from 'zod';

// The schema the form uses on every change and on every step. Fully
// synchronous, so safeParse stays a pure function and costs microseconds.
export const signupSchema = z.object({
  email: z.string().email('Enter an address we can reach you at'),
  password: z.string().min(12, 'Use 12 characters or more'),
});

/**
 * The schema used at submit, and only there. superRefine's callback may be
 * async, which makes the whole schema async — hence parseAsync, and hence the
 * separation: nothing that runs per keystroke should be able to await.
 */
export const signupSubmitSchema = signupSchema.superRefine(async (values, ctx) => {
  const taken = await isEmailTaken(values.email);
  if (taken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      // The path is what attaches the message to a field. Omit it and the
      // issue lands on the object root, where no input can render it.
      path: ['email'],
      message: 'That address is already registered',
    });
  }
});

// At submit — note parseAsync/safeParseAsync, not safeParse.
const result = await signupSubmitSchema.safeParseAsync(values);
```

An async refinement makes the *entire* schema async: `safeParse` throws rather than returning a result. That is the mechanism forcing the separation, and it is a good one — it makes the expensive path impossible to call by accident.

<svg viewBox="-2 46 694 177" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two schemas from one definition: the synchronous base runs on every change and on blur, while the extended schema adding an async refinement runs only at submit and must be called with safeParseAsync." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The synchronous schema is the one that runs constantly</title>
  <desc>One base object schema defines every field and every synchronous rule. It runs on change and on blur, costs microseconds, and is safe to call as often as the form likes. Extending it with an async superRefine produces a second schema that adds the remote check. Because any async refinement makes the whole schema async, that second schema can only be called with safeParseAsync — which means it cannot be invoked from a synchronous change handler by accident. It is used at submit, and by the server, which is the other consumer that has to run the same remote check.</desc>
  <rect x="-2" y="46" width="694" height="177" fill="#f9f5fb"/>
  <rect x="14" y="66" width="200" height="72" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="114" y="90" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">signupSchema</text>
  <text x="114" y="110" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">every field, sync rules</text>
  <text x="114" y="126" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">safeParse — microseconds</text>
  <path d="M214,86 H250" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M214,118 H250" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="250" y="62" width="190" height="44" rx="7" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="264" y="82" font-size="10" fill="#2d6342" font-family="inherit">on change, on blur</text>
  <text x="264" y="98" font-size="9.5" fill="#6b5f75" font-family="inherit">as often as you like</text>
  <rect x="250" y="112" width="190" height="52" rx="7" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="264" y="132" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">.superRefine(async …)</text>
  <text x="264" y="150" font-size="9.5" fill="#6b5f75" font-family="inherit">the remote check</text>
  <path d="M440,138 H476" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="476" y="112" width="200" height="52" rx="7" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="490" y="132" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">safeParseAsync only</text>
  <text x="490" y="150" font-size="9.5" fill="#6b5f75" font-family="inherit">at submit, and on the server</text>
  <text x="14" y="188" font-size="10" fill="#6b5f75" font-family="inherit">Any async refinement makes the WHOLE schema async — safeParse throws on it. That is the guard, not a limitation.</text>
  <text x="14" y="204" font-size="10" fill="#6b5f75" font-family="inherit">It makes calling the expensive schema from a change handler a type error rather than a performance incident.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="safeParse is synchronous and returns a result object; it is what the change handler and the step guard call, on the base schema. parse is synchronous and throws; it belongs at a trust boundary such as reading configuration, not in a form. safeParseAsync returns a promise of a result object and is what submit calls on the extended schema. parseAsync throws asynchronously and has the same narrow use as parse. Calling a synchronous entry point on a schema with an async refinement throws, which is the guard rather than a trap." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which parse entry point to call, and when</title>
  <desc>safeParse is synchronous and returns a result object; it is what the change handler and the step guard call, on the base schema. parse is synchronous and throws; it belongs at a trust boundary such as reading configuration, not in a form. safeParseAsync returns a promise of a result object and is what submit calls on the extended schema. parseAsync throws asynchronously and has the same narrow use as parse. Calling a synchronous entry point on a schema with an async refinement throws, which is the guard rather than a trap.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Entry point</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Returns</text>
  <text x="380" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Called by</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">safeParse</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">a result object</text>
  <text x="380" y="66" font-size="10" fill="#2d6342" font-family="inherit">change handlers and step guards</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">parse</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the value, or throws</text>
  <text x="380" y="100" font-size="10" fill="#6b5f75" font-family="inherit">trust boundaries, not forms</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">safeParseAsync</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">a promise of a result</text>
  <text x="380" y="134" font-size="10" fill="#2d6342" font-family="inherit">submit, on the extended schema</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">parseAsync</text>
  <text x="200" y="168" font-size="10" fill="#6b5f75" font-family="inherit">a promise, or rejects</text>
  <text x="380" y="168" font-size="10" fill="#6b5f75" font-family="inherit">rarely — same use as parse</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Calling safeParse on a schema carrying an async refinement throws — which is how the expensive path stays uncallable by accident.</text>
</svg>

## Step-by-Step Walkthrough

1. **Keep the base schema synchronous.** It is the one that runs constantly.

2. **Extend, do not modify.** `signupSchema.superRefine(...)` reuses every field rule by reference, so nothing can drift.

3. **Always set `path`.** An issue with no path lands on the object root and no field renders it.

4. **Debounce the field-level check separately.** The submit-time refinement is the guarantee; a debounced check on blur is the courtesy that stops the reader reaching submit to find out.

5. **Treat a failed check as unknown, not invalid.** If the request errors, do not mark the field invalid — let the server decide.

6. **Share the submit schema with the server.** It is the same check; running it in both places from one definition is most of the value.

## Failure Modes and Edge Cases

### 1. `safeParse` on an async schema

It throws rather than returning a result. The fix is always to call the right schema; a `try`/`catch` around it hides a structural mistake.

### 2. Refinements do not run when the base fails

An async refinement only runs if the object parsed. That is usually right — no point asking whether a malformed address is taken — but it means the remote check is silently skipped whenever anything else is invalid.

### 3. No cancellation inside a refinement

Zod does not thread an `AbortSignal`. Close over one from the caller, and check it inside the refinement before issuing the request.

### 4. Several async refinements

They run concurrently within one parse, so three remote checks are three simultaneous requests. That is usually fine at submit and never fine per keystroke.

### 5. The message differs between client and server

If the server has its own copy of the rule with different wording, the reader sees one message on blur and another after submit. Sharing the schema fixes it.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="On blur, a debounced validator runs the remote check through the validation queue and reports early, so the reader is not surprised at the end. On submit, the extended schema runs the same check as a refinement and is the actual guarantee. The two use one implementation of the check itself, so the wording and the verdict agree, and the early one is a courtesy that the late one does not depend on." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two checks of the same rule, at two moments</title>
  <desc>On blur, a debounced validator runs the remote check through the validation queue and reports early, so the reader is not surprised at the end. On submit, the extended schema runs the same check as a refinement and is the actual guarantee. The two use one implementation of the check itself, so the wording and the verdict agree, and the early one is a courtesy that the late one does not depend on.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Two checks of the same rule, at two moments</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">on blur</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">debounced, through</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the validation queue</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">reported early</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the reader is not</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">surprised at the end</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">on submit</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the same check, as</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a schema refinement</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">the guarantee</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">and the server runs</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the same schema</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">One implementation of the check, called from two places — otherwise the blur message and the submit message drift apart.</text>
</svg>

## Verification Checklist

- [ ] The synchronous schema has no async refinement
- [ ] The submit schema is only ever called with `safeParseAsync`
- [ ] Every async issue sets a `path`
- [ ] A field-level check is debounced and separate from the schema
- [ ] A failed request does not mark the field invalid
- [ ] The server imports the same submit schema
- [ ] Cancellation is threaded in from the caller

## Common Pitfalls

- **One schema for both paths.** An async refinement makes the whole schema async, so the change handler becomes a promise and a network call per keystroke.
- **Omitting the issue `path`.** The issue lands on the object root, no field renders it, and the submit fails with nothing visible.
- **Treating a failed request as invalid.** A network problem is not the reader’s mistake, and marking the field invalid blocks a submit the server would have accepted.
- **Assuming the refinement ran.** Refinements only run after the base object parses, so any other invalid field silently skips the remote check.
- **Duplicating the rule on the server.** Two copies of a uniqueness rule with different wording means the reader sees one message on blur and another after submit.

---

**Related**

- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — the synchronous half
- [Discriminated Unions for Conditional Schemas](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/) — the other structural refinement
- [Queueing Async Validators in Order](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/) — where the debounced field check runs

← [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)

## Frequently Asked Questions

<details>
<summary><strong>Why not put the async check in the schema the form validates with?</strong></summary>

Because any async refinement makes the entire schema async, so every change-handler call becomes a promise and a network round trip. The reader would get one request per keystroke and the form would lose its synchronous validity answer, which the submit button and the step guard both depend on. Keeping the base synchronous and extending it for submit gives you one definition and two costs.

</details>

<details>
<summary><strong>Do async refinements run if another field is invalid?</strong></summary>

No. Refinements run only after the base object parses successfully, so a malformed email means the uniqueness check never fires. That is usually the behaviour you want — there is no point asking whether an invalid address is taken — but it does mean the remote result is absent rather than passing, and code reading the result should not treat its absence as success.

</details>

<details>
<summary><strong>How do I cancel an in-flight refinement?</strong></summary>

Zod does not thread an AbortSignal through refinements, so close over one from the caller and check it at the top of the refinement before issuing the request. On submit that is rarely needed, since the reader is waiting for the result anyway. It matters for the debounced field-level check, which is not a refinement at all — it is a plain validator running through the validation queue.

</details>

