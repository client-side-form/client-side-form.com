---
layout: page.njk
title: "Debouncing Validation Triggers in React"
description: "Stop validation from firing on every keystroke: a production-ready useDebouncedValidation hook with race-condition safety, stale closure prevention, and accessibility wiring."
slug: debouncing-validation-triggers-in-react
type: howto
breadcrumb:
  - label: "Validation Logic & Schema Integration"
    url: "/validation-logic-schema-integration/"
  - label: "Synchronous Validation Patterns"
    url: "/validation-logic-schema-integration/synchronous-validation-patterns/"
  - label: "Debouncing Validation Triggers in React"
    url: "/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Debouncing Validation Triggers in React"
  parent: "Synchronous Validation Patterns"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Debouncing Validation Triggers in React",
      "description": "Stop validation from firing on every keystroke: a production-ready useDebouncedValidation hook with race-condition safety, stale closure prevention, and accessibility wiring.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 2, "name": "Synchronous Validation Patterns", "item": "https://client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/" },
        { "@type": "ListItem", "position": 3, "name": "Debouncing Validation Triggers in React", "item": "https://client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Debounce validation triggers in React without race conditions",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Scaffold the hook skeleton with timer and request refs" },
        { "@type": "HowToStep", "position": 2, "name": "Stabilize the validation predicate with useCallback" },
        { "@type": "HowToStep", "position": 3, "name": "Guard against stale async results with a monotonic request counter" },
        { "@type": "HowToStep", "position": 4, "name": "Return cleanup to clear pending timers on unmount" },
        { "@type": "HowToStep", "position": 5, "name": "Wire the error output to an aria-live region" },
        { "@type": "HowToStep", "position": 6, "name": "Add a synchronous fallback on blur and submit" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should debounced validation replace synchronous validation entirely?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Debouncing optimizes intermediate keystrokes, but a synchronous or immediate check must still run on blur and on form submission to guarantee correctness before the payload is dispatched."
          }
        },
        {
          "@type": "Question",
          "name": "What is the optimal debounce delay for form validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "300–500 ms covers most typing cadences. Profile your validation function's execution time and add it to the target delay. For schema-heavy validators (Zod parse on a large object) you may need 400–600 ms to avoid perceivable stutter on slower devices."
          }
        },
        {
          "@type": "Question",
          "name": "How does debouncing affect screen reader announcements?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Delayed error insertion into an aria-live region means the announcement arrives after the debounce window closes. Pair this with an immediate synchronous check on blur so keyboard-only users receive feedback as soon as they leave the field."
          }
        },
        {
          "@type": "Question",
          "name": "Why does my validation loop infinitely after adding useCallback?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If the validate function is defined inline in the parent component without its own useCallback wrapper, a new function reference is created every render. useCallback(validate, [validate]) stabilizes a derived reference but does not help if the source keeps changing. Wrap the validator at its definition site with useCallback and the correct dependency array."
          }
        }
      ]
    }
  ]
}
</script>

# Debouncing Validation Triggers in React

**Exact problem:** validation that runs on every `onChange` event floods the render queue with premature error states and wastes CPU on schema evaluation mid-keystroke, degrading both UX and performance.

## Context and Prerequisites

This page focuses narrowly on the debounce mechanism inside React. It sits under [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/), which defines the broader evaluation pipeline — read that first to understand where debouncing fits in the `INPUT_CHANGE → VALIDATE_SYNC → UPDATE_ERROR_MAP` chain. If your validators are async (remote uniqueness checks, email availability), the race-condition techniques here also apply, but the full async story lives in [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/).

The debounce hook described below is a React-specific adapter. The underlying validation predicate it wraps is framework-agnostic and can be sourced from any schema library.

---

## State Transition Diagram

The hook drives four distinct states. Understanding the legal transitions prevents the most common bug: error state persisting from a previous debounce cycle after the user corrects their input.

<svg viewBox="-6 -11 607 168" role="img" aria-label="Debounce validation state machine: IDLE, PENDING, VALIDATING, SETTLED" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;display:block;margin:1.5rem auto;">
  <title>Debounce Validation State Machine</title>
  <desc>State diagram showing transitions: IDLE transitions to PENDING on keystroke; PENDING resets to PENDING on another keystroke or transitions to VALIDATING when the debounce window closes; VALIDATING transitions to SETTLED (VALID or INVALID); SETTLED transitions back to PENDING on keystroke.</desc>
  <rect x="-6" y="-11" width="607" height="168" fill="#f9f5fb"/>
  <defs>
    <marker id="dbv-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- Nodes -->
  <rect x="10" y="75" width="90" height="40" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="55" y="100" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">IDLE</text>
  <rect x="160" y="75" width="90" height="40" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="205" y="100" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">PENDING</text>
  <rect x="320" y="75" width="110" height="40" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="375" y="100" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">VALIDATING</text>
  <rect x="495" y="55" width="90" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="540" y="78" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="sans-serif">VALID</text>
  <rect x="495" y="105" width="90" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="540" y="128" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="sans-serif">INVALID</text>
  <!-- Arrows -->
  <!-- IDLE → PENDING -->
  <line x1="100" y1="95" x2="158" y2="95" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#dbv-arrow)"/>
  <text x="129" y="88" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="sans-serif">keystroke</text>
  <!-- PENDING → PENDING (self-loop) -->
  <path d="M205,75 Q205,42 230,42 Q255,42 255,75" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#dbv-arrow)"/>
  <text x="230" y="36" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="sans-serif">new keystroke resets timer</text>
  <!-- PENDING → VALIDATING -->
  <line x1="250" y1="95" x2="318" y2="95" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#dbv-arrow)"/>
  <text x="284" y="88" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="sans-serif">delay elapses</text>
  <!-- VALIDATING → VALID -->
  <line x1="430" y1="87" x2="493" y2="74" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#dbv-arrow)"/>
  <!-- VALIDATING → INVALID -->
  <line x1="430" y1="103" x2="493" y2="116" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#dbv-arrow)"/>
  <!-- VALID/INVALID → PENDING (arc back) -->
  <path d="M540,55 Q540,20 375,20 Q205,20 205,73" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#dbv-arrow)"/>
  <text x="375" y="14" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="sans-serif">user types again</text>
</svg>

---

## Core Pattern: `useDebouncedValidation`

The hook accepts the current controlled value, a validation predicate, and a configurable delay. A `useRef` holds the timeout identifier so it persists across render cycles without triggering state updates. A monotonic request counter in a second ref eliminates stale async results.

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

// Predicate may be sync or async — the hook handles both uniformly
type ValidationFn<T> = (value: T) => string | null | Promise<string | null>;

export function useDebouncedValidation<T>(
  value: T,
  validate: ValidationFn<T>,
  delay: number = 300
): string | null {
  const [error, setError] = useState<string | null>(null);

  // useRef — not useState — so the timer ID survives re-renders without
  // causing additional renders when it changes
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monotonic counter: increments on every effect run so an older async
  // result arriving late can be discarded without touching state
  const requestIdRef = useRef(0);

  // Stabilize the predicate reference. If `validate` is defined inline at
  // the call site without its own useCallback, its reference changes every
  // render and this effect would re-trigger continuously (infinite loop).
  const stableValidate = useCallback(validate, [validate]);

  useEffect(() => {
    // Claim the current slot before any async work
    const currentId = ++requestIdRef.current;

    // Cancel the previous pending evaluation before scheduling a new one
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Guard: a newer keystroke may have already incremented requestIdRef
      if (currentId !== requestIdRef.current) return;

      try {
        const result = await stableValidate(value);
        // Guard again: an async predicate may have yielded to a newer request
        if (currentId === requestIdRef.current) {
          setError(result);
        }
      } catch {
        if (currentId === requestIdRef.current) {
          // Surface a safe fallback; do not swallow errors silently
          setError('Validation encountered an unexpected error.');
        }
      }
    }, delay);

    // Cleanup: cancel the pending timeout when value/delay/validate changes
    // or when the component unmounts — prevents setState on detached trees
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [value, stableValidate, delay]);

  return error;
}
```

---

## Step-by-Step Walkthrough

**Step 1 — Refs over state for the timer.**
`timerRef` stores the `setTimeout` return value. Using `useRef` instead of `useState` means updating the timer ID never causes a re-render, so rapid keystrokes do not cascade into unnecessary component updates.

**Step 2 — Stabilize the predicate.**
`useCallback(validate, [validate])` prevents the predicate itself from triggering the effect when the parent component re-renders for unrelated reasons. The important rule: also wrap the validator at its definition site if it captures component state or props — otherwise the outer `useCallback` reference still changes every render.

**Step 3 — Claim a request slot.**
`const currentId = ++requestIdRef.current` increments the counter synchronously before the timer fires. Any async work that resolves after a newer request was scheduled compares its captured `currentId` against `requestIdRef.current` and bails out rather than overwriting a more-recent error state.

**Step 4 — Cancel, then reschedule.**
`clearTimeout(timerRef.current)` runs at the top of the effect body (not just in the cleanup return) so that a new keystroke arriving before the window closes genuinely resets the countdown. If you omit this, the effect cleanup from the previous render cancels the old timer but only after the current render has already scheduled a new one — which is the correct behaviour — but making the cancel explicit at the top makes the intent unmistakable during code review.

**Step 5 — Cleanup on unmount.**
The cleanup function returned from `useEffect` calls `clearTimeout`, preventing a scheduled callback from calling `setError` on a component that has since been removed from the tree. React's development mode will warn about this if you skip it; production builds silently retain the component in memory until garbage collection.

**Step 6 — Wire to an `aria-live` region.**
The returned `error` string must be inserted into a live region so screen readers announce it after the debounce window closes:

```tsx
function EmailField() {
  const [email, setEmail] = useState('');

  // validate must be wrapped in useCallback here because it is defined inline
  const validate = useCallback((v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address'
  , []);

  const error = useDebouncedValidation(email, validate, 350);

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        aria-describedby="email-error"
        aria-invalid={error !== null}
        // Synchronous blur check: validates immediately on focus loss
        // without waiting for the debounce window, preserving keyboard UX
        onBlur={() => {
          const result = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? null
            : 'Enter a valid email address';
          // In a real implementation, expose a setError setter from the hook
          // or run the predicate directly here
          void result;
        }}
      />
      {/* aria-live="polite" announces errors without interrupting speech */}
      <span id="email-error" role="alert" aria-live="polite">
        {error}
      </span>
    </div>
  );
}
```

---

Debounce and throttle are often used interchangeably in conversation and are not interchangeable in a form. The difference is entirely in what happens while the reader keeps typing:

<svg viewBox="0 8 668 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two timelines over a two-second burst of typing. A 400 millisecond debounce runs the validator once, after the reader stops. A 400 millisecond throttle runs it five times during the burst, showing intermediate verdicts about half-typed values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Debounce waits for a pause; throttle does not</title>
  <desc>Over a two-second burst of continuous typing with a four hundred millisecond interval: a debounce resets its timer on every keystroke, so the validator runs exactly once, four hundred milliseconds after the last character. A throttle runs the validator at most once per interval regardless of whether the reader has stopped, so it fires about five times during the same burst — each time judging a half-finished value and, if the result is announced, telling the reader five times that an incomplete email address is invalid. For validation the reader sees, debounce is almost always what is wanted; throttle suits things that must stay live, such as a character counter.</desc>
  <rect x="0" y="8" width="668" height="218" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#2d6342" font-family="inherit">debounce 400ms — one verdict, about a finished value</text>
  <rect x="14" y="36" width="640" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="58" font-size="9.5" fill="#6b5f75" font-family="inherit">typing ································································· stops</text>
  <text x="28" y="78" font-size="9.5" fill="#2d6342" font-family="inherit">validator runs: once, 400ms after the last keystroke</text>
  <text x="14" y="118" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">throttle 400ms — five verdicts, four about half-typed values</text>
  <rect x="14" y="128" width="640" height="52" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="28" y="150" font-size="9.5" fill="#6b5f75" font-family="inherit">typing ································································· stops</text>
  <text x="28" y="170" font-size="9.5" fill="#1e1a24" font-family="inherit">validator runs: at 400, 800, 1200, 1600 and 2000ms</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">For anything the reader is told about, debounce: a verdict on "ada@exam" is noise, and announcing it five times is worse.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Throttle suits things that must stay live and cannot be wrong — a character counter, a password-strength meter.</text>
</svg>

## Failure Modes and Edge Cases

**Stale closure capturing outdated props.** If `validate` reads component props or context values without listing them in `useCallback`'s dependency array, the validator evaluates against the prop values that existed when `useCallback` last ran. The symptom is validation that passes even though a sibling field has since changed. Fix: declare every external value the predicate reads as a dependency.

**Autofill bypassing the debounce window.** Browser autofill fires a single `onChange` or `input` event that sets the entire field value at once. Debounce treats this identically to a keystroke, so validation fires 300–500 ms later. This is usually correct, but if your form has a "submit on autofill" shortcut, run a synchronous pre-flight check immediately after detecting the autofill event (identifiable via `event.isTrusted && event.inputType === undefined` in some browsers).

**Unmounted component setState.**  If the component unmounts while a debounce timer is pending — common in route transitions — the timeout fires and tries to call `setError` on a detached tree. The `clearTimeout` in the cleanup return prevents this; verify it is present before deploying.

**Infinite re-render loop.**  If `validate` is defined inline without `useCallback`, every parent render creates a new function reference, which changes `stableValidate`, which triggers the `useEffect`, which schedules a validation, which may cause a state update, which re-renders the parent. The fix is `useCallback` at the call site with the correct dependency array — not an empty array, which would cause the stale-closure problem above.

**Safari `input` event quirk.**  Safari fires `input` events for IME composition keystrokes (CJK character selection) differently from Chrome. If your field targets multilingual users, listen for `compositionend` and run an immediate synchronous validation there rather than relying solely on the debounced `onChange` path.

---

Whatever the interval, the timer is a resource, and there are four moments where failing to clear it produces a distinct bug:

<svg viewBox="0 8 690 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four moments a debounce timer must be cleared: on the next keystroke, on blur, on submit, and on unmount. Each row states what happens if it is not cleared at that moment." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four places the timer has to be cleared</title>
  <desc>On the next keystroke: not clearing it is not a debounce at all — every keystroke schedules its own run and they all fire. On blur: the reader has finished, so the pending run should be flushed immediately rather than waited for; leaving it means the error appears four hundred milliseconds after focus has already moved on. On submit: a pending validation must be flushed and awaited before the submit decision, or the form submits against a verdict that has not been computed. On unmount: an uncleared timer fires into a destroyed component, which is a state update on an unmounted tree at best and a retained closure at worst.</desc>
  <rect x="0" y="8" width="690" height="210" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="136" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Moment</text>
  <text x="180" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What to do</text>
  <text x="340" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">If you do not</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">next keystroke</text>
  <text x="180" y="66" font-size="10" fill="#6b5f75" font-family="inherit">clear and reschedule</text>
  <text x="340" y="66" font-size="10" fill="#a63d6f" font-family="inherit">every keystroke fires — not a debounce</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">blur</text>
  <text x="180" y="100" font-size="10" fill="#6b5f75" font-family="inherit">flush immediately</text>
  <text x="340" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the error lands after focus has moved</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">submit</text>
  <text x="180" y="134" font-size="10" fill="#6b5f75" font-family="inherit">flush and await</text>
  <text x="340" y="134" font-size="10" fill="#a63d6f" font-family="inherit">submitting against an uncomputed verdict</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">And on unmount: an uncleared timer fires into a destroyed tree — a warning at best, a retained closure at worst.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Returning the clear function from the effect that created the timer covers the last row for free.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">"Flush" needs to be part of the hook&#39;s API — a debounce you cannot force is a debounce you cannot submit through.</text>
</svg>

## Verification Checklist

- Rapid typing (holding down a key) triggers only one validation call after the delay elapses, not one per keystroke — confirm in React DevTools Profiler
- Unmounting the component mid-typing produces no "Can't perform a React state update on an unmounted component" warning in development mode
- The `validate` function at the call site is wrapped in `useCallback` with the correct dependency array
- An older async result arriving after a newer one does not overwrite the displayed error (test by mocking a slow validator that takes 1000 ms and typing quickly)
- The `aria-live` region announces the error after the debounce window closes — verify with a screen reader or the accessibility panel in browser DevTools
- A synchronous validation runs on `onBlur` so keyboard-only users receive immediate feedback on field exit
- The form's `onSubmit` handler runs a synchronous or immediate-resolve validation pass before dispatching — debounced state alone is insufficient to gate submission
- `aria-invalid` on the input toggles correctly when error transitions between `null` and a string value

---

## FAQ

<details>
<summary><strong>Should debounced validation replace synchronous validation entirely?</strong></summary>

No. Debouncing optimises intermediate keystrokes; it does not replace the synchronous check that must run on blur, on submission, and (in SSR contexts) on initial mount. If you gate form submission purely on the debounced `error` value you risk dispatching an invalid payload during the debounce window. Always run a final synchronous or immediately-resolved async check in the `onSubmit` handler before sending the request.

</details>

<details>
<summary><strong>What is the optimal debounce delay for form validation?</strong></summary>

300–500 ms covers the vast majority of typing cadences. Start at 350 ms for most fields. For validators that are expensive — a [Zod schema](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) parsing a large nested object — add the schema's median execution time (measure in DevTools Performance panel) to your base delay. On entry-level Android devices, Zod parsing can take 20–80 ms, pushing the effective delay close to 500 ms before it becomes imperceptible.

</details>

<details>
<summary><strong>How does debouncing affect screen reader announcements?</strong></summary>

An `aria-live="polite"` region will announce error text only after the debounce window closes, which is intentional — you do not want the reader interrupting every keystroke. However, users navigating by keyboard expect validation when they leave a field (`onBlur`). Run an immediate synchronous check on blur and insert the result into the same live region so the announcement arrives as soon as focus leaves the input, not 350 ms later. This satisfies WCAG 2.1 Success Criterion 3.3.1 (Error Identification) for keyboard users.

</details>

<details>
<summary><strong>Why does my validation loop infinitely after adding useCallback?</strong></summary>

`useCallback(validate, [validate])` inside the hook only stabilises a derived reference — it does not help if the source function changes every render. The validator defined inline in the parent creates a new reference on every render, which changes the `validate` prop, which changes `stableValidate` inside the hook, which re-triggers the effect. Fix: wrap the validator at its definition site (`const validate = useCallback(() => ..., [dep1, dep2])`) with the dependencies it actually reads. An empty array `[]` would suppress the loop but introduce the stale-closure failure mode where the validator ignores updated props.

</details>

---

## Related

- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) — the evaluation pipeline this hook participates in
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — when the predicate makes network calls
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — pairing Zod parse with the debounce hook

← [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/)
