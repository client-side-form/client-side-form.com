---
layout: page.njk
title: "Asynchronous Validation Strategies"
description: "How to orchestrate pending states, cancel stale requests with AbortController, handle race conditions, and integrate async refinements into schema validators — without blocking form submission or leaking memory."
slug: "asynchronous-validation-strategies"
type: "cluster"
breadcrumb: "Asynchronous Validation Strategies"
datePublished: "2025-11-01"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Asynchronous Validation Strategies"
  parent: "Validation Logic"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Asynchronous Validation Strategies",
      "description": "How to orchestrate pending states, cancel stale requests with AbortController, handle race conditions, and integrate async refinements into schema validators — without blocking form submission or leaking memory.",
      "datePublished": "2025-11-01",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Asynchronous Validation Strategies", "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement race-condition-free async form validation",
      "step": [
        { "@type": "HowToStep", "name": "Define an explicit state machine", "text": "Replace boolean flags with a typed ValidationState union: idle | validating | valid | error | retryable." },
        { "@type": "HowToStep", "name": "Debounce and gate requests", "text": "Use a debounce timer to coalesce rapid keystrokes before issuing a network request." },
        { "@type": "HowToStep", "name": "Attach an AbortController per request cycle", "text": "Cancel the previous in-flight request before starting a new one; check signal.aborted before committing state." },
        { "@type": "HowToStep", "name": "Guard against timeouts", "text": "Set a client-side timeout that transitions the field to retryable rather than leaving it in an indefinite loading state." },
        { "@type": "HowToStep", "name": "Integrate with schema async refinements", "text": "Run Zod .parseAsync() so async .refine() callbacks are awaited before mapping errors to UI state." },
        { "@type": "HowToStep", "name": "Wire ARIA attributes", "text": "Set aria-busy on the field during validation and aria-invalid + aria-describedby on resolution to keep screen readers in sync." },
        { "@type": "HowToStep", "name": "Expose a cleanup function", "text": "Abort pending requests, clear timers, and reset state when the component unmounts." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent race conditions when users type rapidly?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use an AbortController per keystroke cycle paired with a debounce timer. Check signal.aborted before committing any state transition so only the latest intent resolves."
          }
        },
        {
          "@type": "Question",
          "name": "Should async validation run on every keystroke or only on blur?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use debounced keystroke validation for real-time feedback, but confirm state on blur before form submission. This balances UX responsiveness with server load."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle validation when the user is offline?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Detect network status via navigator.onLine or service worker fetch failures. Transition the validator to retryable, cache the last known valid input, and defer async checks until connectivity is restored."
          }
        },
        {
          "@type": "Question",
          "name": "Can I combine Zod sync rules with async server checks in one pass?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Add an async .refine() or .superRefine() callback to your Zod schema and call .safeParseAsync() instead of .safeParse(). Sync rules run first; the async callback only fires if they pass, saving unnecessary network calls."
          }
        }
      ]
    }
  ]
}
</script>

# Asynchronous Validation Strategies

Synchronous rules catch shape and format errors instantly, but a whole class of constraints — username uniqueness, coupon code validity, email domain deliverability, inventory availability — can only be verified by the server. Wiring those checks into a form without producing race conditions, memory leaks, or indefinite loading states is the core engineering challenge this page addresses.

The patterns here sit inside the broader [Validation Logic & Schema Integration](/validation-logic-schema-integration/) pipeline. They are most relevant when you already have [synchronous validation patterns](/validation-logic-schema-integration/synchronous-validation-patterns/) in place and need to bolt remote checks on top without destabilising the state model.

---

## State Machine Specification

Every async validator field must live in one of five exclusive states. Using a TypeScript discriminated union rather than a pair of `isLoading`/`isError` booleans prevents impossible combinations such as `isLoading: true, isValid: true`.

```typescript
export type ValidationState =
  | 'idle'        // no check has run or field is empty
  | 'validating'  // a request is in flight
  | 'valid'       // server confirmed the value is acceptable
  | 'error'       // server rejected the value (shows message)
  | 'retryable';  // network failure — user can retry without retyping
```

The diagram below shows every permitted transition. Arrows from `validating` to `idle` represent an aborted request (stale — should produce no UI change).

<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Async validation state machine diagram" style="width:100%;max-width:700px;display:block;margin:1.5rem auto;">
  <title>Async Validation State Machine</title>
  <desc>State diagram showing transitions between idle, validating, valid, error, and retryable states for an async form validator.</desc>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor"/>
    </marker>
  </defs>
  <!-- IDLE -->
  <ellipse cx="90" cy="170" rx="68" ry="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="90" y="175" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">idle</text>
  <!-- VALIDATING -->
  <ellipse cx="310" cy="170" rx="80" ry="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="310" y="175" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">validating</text>
  <!-- VALID -->
  <ellipse cx="560" cy="80" rx="68" ry="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2"/>
  <text x="560" y="85" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">valid</text>
  <!-- ERROR -->
  <ellipse cx="560" cy="170" rx="68" ry="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2"/>
  <text x="560" y="175" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">error</text>
  <!-- RETRYABLE -->
  <ellipse cx="560" cy="260" rx="80" ry="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2"/>
  <text x="560" y="265" text-anchor="middle" font-size="13" fill="currentColor" font-family="sans-serif">retryable</text>
  <!-- idle -> validating (input change) -->
  <line x1="158" y1="170" x2="228" y2="170" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="193" y="162" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">input</text>
  <!-- validating -> idle (aborted) -->
  <path d="M290,145 Q230,95 158,152" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 2" marker-end="url(#arr)"/>
  <text x="210" y="108" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">aborted</text>
  <!-- validating -> valid -->
  <line x1="385" y1="152" x2="490" y2="97" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="448" y="113" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">isValid</text>
  <!-- validating -> error -->
  <line x1="390" y1="170" x2="490" y2="170" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="440" y="163" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">!isValid</text>
  <!-- validating -> retryable -->
  <line x1="375" y1="190" x2="477" y2="247" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="438" y="233" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">timeout/err</text>
  <!-- valid -> idle (re-input) -->
  <path d="M492,80 Q300,20 158,152" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arr)"/>
  <text x="310" y="32" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">re-input</text>
  <!-- error -> idle (re-input) -->
  <path d="M495,158 Q400,300 165,185" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arr)"/>
  <text x="348" y="308" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">re-input</text>
  <!-- retryable -> validating (retry) -->
  <path d="M482,248 Q360,310 305,202" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3" marker-end="url(#arr)"/>
  <text x="380" y="326" text-anchor="middle" font-size="10" fill="currentColor" font-family="sans-serif">retry</text>
</svg>

**Trigger table:**

| Trigger | Source state | Target state |
|---|---|---|
| User types (debounced) | `idle` / `valid` / `error` | `validating` |
| Request aborted (stale) | `validating` | `idle` |
| Server returns `true` | `validating` | `valid` |
| Server returns `false` | `validating` | `error` |
| Timeout or network error | `validating` | `retryable` |
| User retypes | `retryable` / `error` / `valid` | `idle` → `validating` |

---

## Core Implementation

The factory below is framework-agnostic TypeScript. It handles debounce, `AbortController` cancellation, client-side timeout, and typed state transitions. Wire it into React with `useEffect`, into Vue with a `watch`, or call it directly from a vanilla DOM event listener.

```typescript
export type ValidationState =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'error'
  | 'retryable';

export interface AsyncValidatorOptions {
  /** The remote check: receives the current value plus the AbortSignal.
   *  Return true if the value is acceptable. */
  fetchFn: (value: string, signal: AbortSignal) => Promise<boolean>;
  /** Milliseconds to wait after the last keystroke before firing the request.
   *  Defaults to 300 ms — increase for expensive endpoints. */
  debounceMs?: number;
  /** Hard deadline for the fetch. On expiry the state moves to 'retryable'
   *  and the in-flight request is cancelled via the same AbortController. */
  timeoutMs?: number;
  /** Called on every state transition so the UI layer can re-render. */
  onStateChange?: (state: ValidationState) => void;
}

export function createAsyncValidator({
  fetchFn,
  debounceMs = 300,
  timeoutMs = 5000,
  onStateChange,
}: AsyncValidatorOptions) {
  let currentState: ValidationState = 'idle';

  // Timers are stored so cleanup() can cancel them from outside.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // One AbortController per request cycle.
  // Keeping a reference lets us cancel the previous cycle when a new one starts.
  let currentController: AbortController | null = null;

  function setState(state: ValidationState): void {
    currentState = state;
    onStateChange?.(state);
  }

  async function validate(value: string): Promise<ValidationState> {
    // Cancel any pending debounce from the previous keystroke.
    if (debounceTimer) clearTimeout(debounceTimer);

    // Abort the in-flight request from the previous cycle.
    // The fetch will throw a DOMException with name 'AbortError', caught below.
    if (currentController) currentController.abort();

    // Clear any existing timeout guard.
    if (timeoutTimer) clearTimeout(timeoutTimer);

    setState('validating');

    // Fresh controller for this cycle — passed into fetchFn so it can
    // attach to fetch() directly: fetch(url, { signal }).
    currentController = new AbortController();
    const { signal } = currentController;

    return new Promise<ValidationState>((resolve) => {
      debounceTimer = setTimeout(async () => {
        // Timeout guard: if fetchFn takes longer than timeoutMs, abort it
        // and surface a retryable state instead of an indefinite spinner.
        timeoutTimer = setTimeout(() => {
          currentController?.abort();
          setState('retryable');
          resolve('retryable');
        }, timeoutMs);

        try {
          const isValid = await fetchFn(value, signal);

          // Clear the timeout guard — the request returned in time.
          if (timeoutTimer) clearTimeout(timeoutTimer);

          // If the signal was aborted between the fetch completing and this
          // line, a newer request is already running — do not overwrite its state.
          if (signal.aborted) return resolve('idle');

          const next: ValidationState = isValid ? 'valid' : 'error';
          setState(next);
          resolve(next);
        } catch (err) {
          if (timeoutTimer) clearTimeout(timeoutTimer);

          // AbortError means this cycle was superseded — not a real failure.
          if (err instanceof DOMException && err.name === 'AbortError') {
            return resolve('idle');
          }

          setState('error');
          resolve('error');
        }
      }, debounceMs);
    });
  }

  function cleanup(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    // Cancel any in-flight request so it does not resolve after unmount.
    if (currentController) currentController.abort();
    setState('idle');
  }

  return { validate, getState: () => currentState, cleanup };
}
```

**React usage (minimal):**

```typescript
import { useEffect, useRef, useState } from 'react';
import { createAsyncValidator, ValidationState } from './createAsyncValidator';

export function UsernameField() {
  const [state, setState] = useState<ValidationState>('idle');
  const validatorRef = useRef(
    createAsyncValidator({
      fetchFn: async (value, signal) => {
        const res = await fetch(`/api/username-available?q=${encodeURIComponent(value)}`, { signal });
        const data = await res.json();
        return data.available as boolean;
      },
      onStateChange: setState,
    })
  );

  // Abort in-flight request on unmount — prevents state updates on dead components.
  useEffect(() => () => validatorRef.current.cleanup(), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validatorRef.current.validate(e.target.value);
  };

  return (
    <div>
      <input
        id="username"
        type="text"
        onChange={handleChange}
        aria-busy={state === 'validating'}
        aria-invalid={state === 'error'}
        aria-describedby="username-hint"
      />
      <span id="username-hint" role="status" aria-live="polite">
        {state === 'validating' && 'Checking availability…'}
        {state === 'valid' && 'Username is available.'}
        {state === 'error' && 'Username is taken.'}
        {state === 'retryable' && 'Network error — please try again.'}
      </span>
    </div>
  );
}
```

---

## Integration Guidance

### Wiring into the parent validation pipeline

Async checks are the final gate in the [validation logic & schema integration](/validation-logic-schema-integration/) pipeline, not a replacement for client-side rules. The recommended order:

1. **Structural / format rules** (sync) — run on every keystroke via [synchronous validation patterns](/validation-logic-schema-integration/synchronous-validation-patterns/). Reject malformed input immediately so the async check never fires on a value that would definitely fail.
2. **Schema parse** — run `schema.safeParse(value)` (e.g. Zod) to validate shape, type coercions, and enum membership.
3. **Async refinement** — fire the remote check only after sync rules pass. Gate on a minimum field length to avoid hitting the API with partial input.

```typescript
import { z } from 'zod';

// Sync rules run first; the async refinement only fires when they pass.
const usernameSchema = z
  .string()
  .min(3, 'At least 3 characters')
  .max(30, 'At most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only')
  // async .refine() requires .parseAsync() / .safeParseAsync() — see below.
  .refine(
    async (value) => {
      const res = await fetch(`/api/username-available?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      return data.available as boolean;
    },
    { message: 'Username is already taken' }
  );

// MUST use safeParseAsync — regular safeParse() ignores async refinements.
const result = await usernameSchema.safeParseAsync(inputValue);
```

See [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) for composing async refinements with `.superRefine()` for richer typed error shapes, and [cross-field dependency logic](/validation-logic-schema-integration/cross-field-dependency-logic/) for cases where the async check involves more than one field (e.g. validating a coupon code against a cart total).

### Connecting to [error state mapping patterns](/form-state-fundamentals-architecture/error-state-mapping-patterns/)

The validator's `ValidationState` value must map to your UI's error display. Feed it into the same adapter that handles sync schema errors so error message rendering is consistent:

```typescript
function mapValidationState(
  state: ValidationState,
  schemaError?: string
): { message: string | null; pending: boolean } {
  if (state === 'validating') return { message: null, pending: true };
  if (state === 'error') return { message: schemaError ?? 'Value is invalid', pending: false };
  if (state === 'retryable') return { message: 'Network error — tap to retry', pending: false };
  return { message: null, pending: false };
}
```

---

## Edge Cases and Failure Modes

### Race condition on rapid input

**Problem:** Request A is in flight; the user types another character; request B is dispatched; B resolves first; then A resolves and overwrites B's state with stale data.

**Resolution:** Abort request A when request B is created (see `currentController.abort()` in the factory above). Always check `signal.aborted` before calling `setState`.

### Hydration mismatch in SSR frameworks

**Problem:** The server renders a field with `state='idle'` but the client rehydrates and immediately fires a validation request, causing a hydration mismatch or a flicker from `valid` to `validating`.

**Resolution:** Gate the initial `validate()` call behind a `useEffect` (React) or `onMounted` (Vue) so it never runs during SSR. Initialise the state from the server-rendered value, not from a fresh check.

### `AbortController` browser support edge case

`AbortController` is supported in all modern browsers but does not exist in some older WebViews. Polyfill with `abortcontroller-polyfill` when targeting in-app browsers or older Android WebViews. Do not use a no-op stub — a stub means the `signal` never fires and stale requests accumulate.

### Shadow DOM event boundary

`CustomEvent` dispatched inside a shadow root does not cross the shadow boundary unless `composed: true` is set. If your validator emits custom events for debugging (as in the state dispatch pattern), add `composed: true` to the event options, or use a plain callback rather than a DOM event.

### Concurrent mode tearing (React 18+)

In React 18 concurrent mode, `setState` calls inside `useEffect` cleanup may be batched differently, leading to a visual flicker if a state update arrives just as a component suspends. Wrap the `onStateChange` callback with `flushSync` when the field is inside a `<Suspense>` boundary that you control, or use a `useTransition` wrapper on the validation trigger.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|---|---|---|
| Field stays in `validating` indefinitely | Open Network tab — check whether the request is pending or complete; look for CORS preflight failures | Add explicit `timeoutMs`; check server returns within SLA; verify CORS headers |
| Validation fires twice on blur | Confirm the `onBlur` handler calls `validate()` AND there is a debounced `onChange` that also calls `validate()` on the same character | Deduplicate: skip the `onBlur` call if the last validated value equals the current value |
| `AbortError` reaches the UI as an error message | `catch` block is not filtering `DOMException.name === 'AbortError'` before calling `setState('error')` | Add the guard shown in the factory above |
| Stale `valid` state after server data changes | Async result is cached; the same input resolves from a stale HTTP cache | Set `Cache-Control: no-store` on the uniqueness endpoint, or append a cache-busting timestamp to the request |
| Memory leak warning on unmount | `cleanup()` is not being called in the component's teardown lifecycle | Call `cleanup()` in `useEffect` return, `onUnmounted` (Vue), or `onDestroy` (Svelte) |

---

## Testing and QA Hooks

### Data-attribute strategy for Playwright / Cypress

Encode the `ValidationState` in a `data-*` attribute on the input wrapper. This gives end-to-end tests a stable, semantic selector that does not depend on class names or text content.

```typescript
// Rendered by the field component
<div
  data-field="username"
  data-validation-state={state}  // 'idle' | 'validating' | 'valid' | 'error' | 'retryable'
>
  <input ... />
  <span role="status">...</span>
</div>
```

```typescript
// Playwright test
await expect(page.locator('[data-field="username"][data-validation-state="valid"]')).toBeVisible();
```

### Mocking the `fetchFn` in unit tests

The `createAsyncValidator` factory accepts `fetchFn` as a dependency, so you can inject a mock without patching `global.fetch`:

```typescript
import { createAsyncValidator } from './createAsyncValidator';

test('transitions to valid when server returns true', async () => {
  const states: string[] = [];
  const validator = createAsyncValidator({
    fetchFn: async () => true,            // mock: always available
    debounceMs: 0,                        // skip debounce in tests
    onStateChange: (s) => states.push(s),
  });

  await validator.validate('newuser');
  expect(states).toEqual(['validating', 'valid']);
  validator.cleanup();
});

test('transitions to retryable on timeout', async () => {
  const states: string[] = [];
  const validator = createAsyncValidator({
    fetchFn: () => new Promise(() => {}),  // never resolves — simulates hang
    debounceMs: 0,
    timeoutMs: 10,
    onStateChange: (s) => states.push(s),
  });

  await validator.validate('anyvalue');
  expect(states).toContain('retryable');
  validator.cleanup();
});
```

### ARIA regression coverage

Check these attributes after every validation state transition in your accessibility test suite:

- `aria-busy="true"` on the input during `validating`
- `aria-invalid="true"` on the input in `error` state
- `aria-describedby` pointing to the live-region element
- `role="status"` on the hint element (polite announcements for screen readers)

---

## Common Pitfalls

**Not checking `signal.aborted` before `setState`:** A fast network can resolve a cancelled request before the abort propagates. Always guard with `if (signal.aborted) return`.

**Running sync schema parsing on every keystroke before the debounce:** Heavy Zod or Yup schemas parse on every event, blocking the main thread. Run full schema validation inside the debounced callback, not in the raw event handler.

**Missing `cleanup()` call on unmount:** Not aborting the validator on component teardown allows the `onStateChange` callback to fire on an unmounted component, causing React's "Can't perform a state update on an unmounted component" warning and potential memory leaks.

**Using the same `AbortController` for multiple fields:** Each field must have its own controller. Sharing one controller means aborting one field's request also aborts every other field currently validating.

**Silently swallowing network errors:** Catching all errors and returning `false` from `fetchFn` makes `error` and `retryable` states indistinguishable. Re-throw network errors so the factory can differentiate and surface the correct state.

---

## Frequently Asked Questions

<details>
<summary><strong>How do I prevent race conditions when users type rapidly?</strong></summary>

Use an `AbortController` per keystroke cycle paired with a debounce timer. The critical line is `currentController.abort()` at the top of `validate()` — this cancels the previous in-flight request before the new one starts. Then check `signal.aborted` before committing any state transition to guarantee only the latest intent resolves.

</details>

<details>
<summary><strong>Should async validation run on every keystroke or only on blur?</strong></summary>

Debounced keystroke validation provides real-time feedback that users expect for uniqueness checks. Confirm state on `blur` before submission to catch any unvalidated state. The two triggers are complementary, not alternatives — just deduplicate by skipping the `blur` call if the value hasn't changed since the last validation ran.

</details>

<details>
<summary><strong>How do I handle validation when the user is offline?</strong></summary>

Detect network status via `navigator.onLine` before calling `validate()`. If offline, immediately transition to `retryable` without issuing a request. Listen for the `online` event and re-run the last value through `validate()` automatically when connectivity returns. Show a non-blocking banner — do not silently fail or block form submission.

</details>

<details>
<summary><strong>Can I combine Zod sync rules with async server checks in one pass?</strong></summary>

Yes. Add an async `.refine()` or `.superRefine()` to your Zod schema and call `.safeParseAsync()` instead of `.safeParse()`. Zod runs sync rules first and only invokes the async callback when they all pass, saving unnecessary network calls for values that are structurally invalid.

</details>

---

## Related

- [Implementing Async Email Availability Checks](/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/) — end-to-end walkthrough of the pattern above applied to email validation with rate-limiting
- [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — type-safe composition of sync and async refinements
- [Synchronous Validation Patterns](/validation-logic-schema-integration/synchronous-validation-patterns/) — the sync layer that gates async checks
- [Error State Mapping Patterns](/form-state-fundamentals-architecture/error-state-mapping-patterns/) — mapping `ValidationState` to accessible UI feedback

← [Validation Logic & Schema Integration](/validation-logic-schema-integration/)
