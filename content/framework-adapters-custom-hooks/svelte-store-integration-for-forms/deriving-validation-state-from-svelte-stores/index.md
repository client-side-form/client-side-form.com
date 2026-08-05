---
layout: page.njk
title: "Deriving Validation State from Svelte Stores"
description: "Three writable stores and three derived ones: values, touched and submit count are written, and every error, visibility and can-submit answer is computed — so nothing can disagree."
slug: deriving-validation-state-from-svelte-stores
type: howto
breadcrumb: "Deriving Validation State from Svelte Stores"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Deriving Validation State from Svelte Stores"
  parent: "Svelte Store Integration for Forms"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Deriving Validation State from Svelte Stores",
      "description": "Three writable stores and three derived ones: values, touched and submit count are written, and every error, visibility and can-submit answer is computed — so nothing can disagree.",
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
          "name": "Framework Adapters & Custom Hooks",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Svelte Store Integration for Forms",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Deriving Validation State from Svelte Stores",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/deriving-validation-state-from-svelte-stores/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Derive form validation state in Svelte instead of storing it",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Keep values, touched and submit count as the only writables"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Derive every schema issue from values alone"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Derive visibility separately from validity"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Never assign to a derived store"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "List every dependency rather than reading with get"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Reset by assigning values and clearing touched"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Bring async results in through their own writable"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not keep errors in a writable store?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because it is a copy of something computable, and copies go stale. Every handler that changes a value has to remember to update the errors too, a reset has to clear both, and the moment one path forgets, the form shows an error for a value that no longer exists. A derived store cannot be forgotten: it recomputes whenever its inputs change, which is exactly the guarantee you want from validation state."
          }
        },
        {
          "@type": "Question",
          "name": "How do async validation results fit into a derived graph?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They do not belong in a derivation, because they need debouncing, cancellation and a staleness check that a derived store has no way to express. Put the async results in their own writable, populated by the validation queue, and add a final derivation that merges the synchronous issues with the async ones. That keeps the pure part pure and confines the messy part to one store."
          }
        },
        {
          "@type": "Question",
          "name": "Is per-field derivation worth the extra wiring?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not until you can measure it. Re-parsing a schema of a few dozen fields on each keystroke is microseconds, and the single derivation is much easier to reason about. Once the form is large enough that the parse shows up in a profile, derive per field so only the edited field's rules re-run — and keep the whole-form derivation for the submit check, so there is still one place that answers 'is this form valid'."
          }
        }
      ]
    }
  ]
}
</script>

# Deriving Validation State from Svelte Stores

The exact problem: a Svelte form keeps `errors` in a writable store and updates it from three different event handlers, so the error state and the values disagree after a reset — and nobody can say which handler was responsible.

## Context and Prerequisites

The store shapes are covered in [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/). The principle here is narrower and worth stating plainly: **validation state is derived, so it belongs in a `derived` store, not a `writable` one.** Anything computable from the values plus the touched flags should never be stored separately, because a stored copy of a derived value is a copy that can be wrong.

## Core Pattern

```typescript
import { writable, derived, get } from 'svelte/store';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Enter an address we can reach you at'),
  password: z.string().min(12, 'Use 12 characters or more'),
});

// Written by the reader. These two are the only writable stores in the form.
export const values = writable({ email: '', password: '' });
export const touched = writable<Record<string, boolean>>({});
export const submitCount = writable(0);

/** Every issue the schema reports, keyed by field. Pure, and always current. */
const issues = derived(values, ($values) => {
  const r = schema.safeParse($values);
  if (r.success) return {} as Record<string, string>;
  return Object.fromEntries(
    r.error.issues.map((i) => [String(i.path[0]), i.message]),
  );
});

/**
 * What the reader is actually shown: an issue, but only for fields that have
 * earned a message. Separating "is invalid" from "should be told" is what lets
 * the form be quiet while composing without a second copy of the errors.
 */
export const visibleErrors = derived(
  [issues, touched, submitCount],
  ([$issues, $touched, $submitCount]) =>
    Object.fromEntries(
      Object.entries($issues).filter(([field]) => $submitCount > 0 || $touched[field]),
    ),
);

export const canSubmit = derived(issues, ($issues) => Object.keys($issues).length === 0);
```

Three writable stores and three derived ones. Nothing writes `errors`, so nothing can write it wrongly, and a reset is one assignment to `values` plus clearing `touched` — every downstream value follows.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A store graph with three writable sources — values, touched and submit count — feeding derived issues, visible errors and a can-submit flag, with a note that nothing writes the derived stores." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three things are written; everything else is computed</title>
  <desc>The values store is written by the reader's input. The touched store is written on blur. The submit count is written on each submit attempt. From those three, a derived store computes every schema issue keyed by field; a second derived store filters those issues down to the ones the reader has earned the right to see, using touched and the submit count; and a third derives whether the form may be submitted at all. Nothing writes the derived stores, which is why the error state cannot disagree with the values — and why a reset is a single assignment.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <rect x="14" y="30" width="164" height="44" rx="7" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="96" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">values</text>
  <text x="96" y="66" text-anchor="middle" font-size="9" fill="#1e1a24" font-family="inherit">writable · the reader</text>
  <rect x="14" y="86" width="164" height="44" rx="7" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="96" y="106" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">touched</text>
  <text x="96" y="122" text-anchor="middle" font-size="9" fill="#1e1a24" font-family="inherit">writable · on blur</text>
  <rect x="14" y="142" width="164" height="44" rx="7" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="96" y="162" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">submitCount</text>
  <text x="96" y="178" text-anchor="middle" font-size="9" fill="#1e1a24" font-family="inherit">writable · on submit</text>
  <path d="M178,52 H222" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="222" y="30" width="180" height="44" rx="7" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="312" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">issues</text>
  <text x="312" y="66" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">derived · every schema issue</text>
  <path d="M402,52 H440 V116 H478" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,108 H440" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,164 H440 V116" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="478" y="94" width="198" height="44" rx="7" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="577" y="114" text-anchor="middle" font-size="10" font-weight="700" fill="#2d6342" font-family="inherit">visibleErrors</text>
  <text x="577" y="130" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">derived · what is rendered</text>
  <path d="M402,52 H478" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="478" y="30" width="198" height="44" rx="7" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="577" y="50" text-anchor="middle" font-size="10" font-weight="700" fill="#2d6342" font-family="inherit">canSubmit</text>
  <text x="577" y="66" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">derived · no issues at all</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Nothing writes the right-hand column, so a reset is one assignment to values plus clearing touched — everything follows.</text>
</svg>

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A value the reader types is written. A flag set when they leave a field is written. A count incremented on submit is written. Everything else on this list is computed from those three: whether a field has an error, whether an error should be shown, whether the form may be submitted, how many problems there are, and which field the summary should link to first. If a fourth writable appears, the test is whether anything other than the reader causes it to change." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Is it writable, or is it derived?</title>
  <desc>A value the reader types is written. A flag set when they leave a field is written. A count incremented on submit is written. Everything else on this list is computed from those three: whether a field has an error, whether an error should be shown, whether the form may be submitted, how many problems there are, and which field the summary should link to first. If a fourth writable appears, the test is whether anything other than the reader causes it to change.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">State</text>
  <text x="240" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Written or derived</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">From</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">field values</text>
  <text x="240" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">written</text>
  <text x="400" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the reader</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">touched flags</text>
  <text x="240" y="100" font-size="10" fill="#7b4f8a" font-family="inherit">written</text>
  <text x="400" y="100" font-size="10" fill="#6b5f75" font-family="inherit">blur</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">submit count</text>
  <text x="240" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">written</text>
  <text x="400" y="134" font-size="10" fill="#6b5f75" font-family="inherit">submit attempts</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">per-field errors</text>
  <text x="240" y="168" font-size="10" fill="#2d6342" font-family="inherit">derived</text>
  <text x="400" y="168" font-size="10" fill="#6b5f75" font-family="inherit">values</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">shown errors, canSubmit, count</text>
  <text x="240" y="202" font-size="10" fill="#2d6342" font-family="inherit">derived</text>
  <text x="400" y="202" font-size="10" fill="#6b5f75" font-family="inherit">the three above</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">The test for a proposed fourth writable: does anything other than the reader cause it to change? If not, it is derived.</text>
</svg>

## Step-by-Step Walkthrough

1. **Keep the writable set minimal.** Values, touched, submit count. If a fourth appears, check whether it is derivable.

2. **Derive issues from values alone.** Pure, cheap, and always current.

3. **Derive visibility separately.** "Is invalid" and "should be shown" are different questions, and conflating them is what forces a writable errors store.

4. **Never write a derived store.** If you find yourself wanting to, the value belongs in the writable set or the derivation is wrong.

5. **Use `get` sparingly.** Reading a store outside a reactive context is fine in an event handler and wrong in a derivation, where it silently drops the dependency.

6. **Reset by assignment.** One write to `values`, one clear of `touched`, and the whole graph follows.

## Failure Modes and Edge Cases

### 1. A derived store that never updates

Almost always a dependency read through `get` instead of being listed. `derived` tracks only what is in its dependency array.

### 2. Re-parsing the whole schema per keystroke

Fine up to a few dozen fields; beyond that, derive per field so only the edited field's rules re-run.

### 3. Async validation in a derived store

`derived` supports an asynchronous set callback, but a remote check does not belong there — it needs cancellation, debouncing and a stale check. Keep it in a writable populated by the validation queue, and merge the two in a further derivation.

### 4. Subscribing in a plain module

The `$` prefix only exists in components. A helper module must call `subscribe` and own the unsubscribe, or use `get` for a single read.

### 5. Store values captured in a closure

An event handler closing over `$values` from render time sees a stale snapshot. Read through `get` inside the handler.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Assign the initial values. Clear the touched map. Zero the submit count. Nothing else — the issues, the visible errors and the can-submit flag all recompute because their inputs changed. A reset that has to clear an errors store as well is a reset that can forget to, and a form that shows an error for a field that has just been emptied is exactly that bug." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a reset touches</title>
  <desc>Assign the initial values. Clear the touched map. Zero the submit count. Nothing else — the issues, the visible errors and the can-submit flag all recompute because their inputs changed. A reset that has to clear an errors store as well is a reset that can forget to, and a form that shows an error for a field that has just been emptied is exactly that bug.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">What a reset touches</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">values</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">assign the initial</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">object</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">touched</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">clear the map</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">entirely</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">submitCount</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">back to zero</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit"></text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">everything else</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">recomputes —</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing to clear</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Three writes and a reset is complete. Add a writable errors store and it becomes four, one of which will be forgotten.</text>
</svg>

## Verification Checklist

- [ ] Only values, touched and submit count are writable
- [ ] Nothing assigns to a derived store
- [ ] Every derived store lists all its dependencies
- [ ] "Invalid" and "shown" are separate derivations
- [ ] Reset is one assignment plus one clear
- [ ] Async results enter through a writable, not a derivation
- [ ] Helper modules own their unsubscribes

## Common Pitfalls

- **A writable errors store.** It is a copy of something computable, so every handler that changes a value has to remember to update it, and one of them will not.
- **Reading a dependency with `get` inside a derivation.** The dependency is not tracked, so the derived store silently stops updating — with no error and no warning.
- **Conflating invalid with shown.** They are different questions, and merging them is what forces a writable store to hold the answer to the second.
- **Async results in a derivation.** A remote check needs debouncing, cancellation and a staleness check, none of which a derived store can express. Give it its own writable and merge afterwards.
- **Subscribing in a module without unsubscribing.** The `$` prefix only exists in components; a helper module owns the returned function, and forgetting it keeps the closure alive for the page’s lifetime.

---

**Related**

- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/) — the store shapes
- [Svelte 5 Runes Migration for Form Stores](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/svelte-5-runes-migration-for-form-stores/) — the same graph in runes
- [Queueing Async Validators in Order](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/) — where the async results come from

← [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)

## Frequently Asked Questions

<details>
<summary><strong>Why not keep errors in a writable store?</strong></summary>

Because it is a copy of something computable, and copies go stale. Every handler that changes a value has to remember to update the errors too, a reset has to clear both, and the moment one path forgets, the form shows an error for a value that no longer exists. A derived store cannot be forgotten: it recomputes whenever its inputs change, which is exactly the guarantee you want from validation state.

</details>

<details>
<summary><strong>How do async validation results fit into a derived graph?</strong></summary>

They do not belong in a derivation, because they need debouncing, cancellation and a staleness check that a derived store has no way to express. Put the async results in their own writable, populated by the validation queue, and add a final derivation that merges the synchronous issues with the async ones. That keeps the pure part pure and confines the messy part to one store.

</details>

<details>
<summary><strong>Is per-field derivation worth the extra wiring?</strong></summary>

Not until you can measure it. Re-parsing a schema of a few dozen fields on each keystroke is microseconds, and the single derivation is much easier to reason about. Once the form is large enough that the parse shows up in a profile, derive per field so only the edited field's rules re-run — and keep the whole-form derivation for the submit check, so there is still one place that answers 'is this form valid'.

</details>

