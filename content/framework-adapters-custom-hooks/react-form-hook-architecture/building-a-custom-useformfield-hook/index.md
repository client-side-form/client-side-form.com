---
layout: page.njk
title: "Building a Custom useFormField Hook"
description: "Step-by-step guide to encapsulating validation pipelines and error mapping in a reusable React useFormField hook, with AbortController race-condition guards and SSR hydration safety."
slug: building-a-custom-useformfield-hook
type: howto
breadcrumb:
  - label: "Framework Adapters & Custom Hooks"
    url: "/framework-adapters-custom-hooks/"
  - label: "React Form Hook Architecture"
    url: "/framework-adapters-custom-hooks/react-form-hook-architecture/"
  - label: "Building a Custom useFormField Hook"
    url: "/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/"
datePublished: "2024-03-01"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Building a Custom useFormField Hook"
  parent: "React Form Hook Architecture"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building a Custom useFormField Hook",
      "description": "Step-by-step guide to encapsulating validation pipelines and error mapping in a reusable React useFormField hook, with AbortController race-condition guards and SSR hydration safety.",
      "datePublished": "2024-03-01",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" },
      "publisher": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 2, "name": "React Form Hook Architecture", "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Building a Custom useFormField Hook", "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a Custom useFormField Hook",
      "step": [
        { "@type": "HowToStep", "name": "Define the field state shape and reducer", "text": "Create a typed FieldState interface and a fieldReducer that handles SET_VALUE, SET_TOUCHED, SET_VALIDATING, and SET_ERROR actions." },
        { "@type": "HowToStep", "name": "Wire DOM events to dispatch calls", "text": "Bind onChange, onBlur, and onFocus handlers to dispatch the correct actions with no side effects in the handlers themselves." },
        { "@type": "HowToStep", "name": "Add an async validation queue with AbortController", "text": "Use a request-ID counter and AbortController to cancel stale requests; debounce the trigger to avoid firing on every keystroke." },
        { "@type": "HowToStep", "name": "Guard against SSR hydration mismatches", "text": "Defer validation until useLayoutEffect confirms client-side hydration to prevent checksum errors in Next.js and Remix." },
        { "@type": "HowToStep", "name": "Expose a cleanup function", "text": "Return a teardown from useEffect that aborts the active controller and clears the debounce timer on unmount." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I test async race conditions deterministically in CI?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use Playwright's page.route() or Cypress cy.intercept() to delay validation responses by 1–2 seconds. Trigger rapid input changes and assert that only the final request resolves while earlier ones are cancelled." }
        },
        {
          "@type": "Question",
          "name": "Can this hook work with Zod or Yup schemas?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Pass validateAsync and validateSync as hook parameters. The queue and recovery protocol are schema-agnostic; wire them to .parseAsync() / .safeParse() as appropriate." }
        },
        {
          "@type": "Question",
          "name": "Why useLayoutEffect instead of useEffect for the hydration guard?",
          "acceptedAnswer": { "@type": "Answer", "text": "useLayoutEffect fires synchronously after DOM mutations but before the browser paints. This ensures the hydrated flag is set before React commits the first client render, preventing any async validation from firing against server-rendered markup." }
        },
        {
          "@type": "Question",
          "name": "How do I surface accessibility errors during degraded validation states?",
          "acceptedAnswer": { "@type": "Answer", "text": "Pair aria-invalid with aria-describedby pointing to an error container. During timeout fallback, emit a validation:degraded custom event and update a role='alert' region to inform assistive technology without interrupting input flow." }
        }
      ]
    }
  ]
}
</script>

# Building a Custom `useFormField` Hook

**Exact problem this page addresses:** how to encapsulate async validation, error state, and SSR hydration safety into a single, reusable `useFormField` hook — without leaking stale async results into the UI after a component unmounts or a faster request supersedes a slower one.

Before diving in, make sure you understand the broader context in [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/), which covers how individual field hooks compose into a full form pipeline.

---

## State shape and reducer

The hook owns four atomic properties. Keeping them flat avoids deep-equality pitfalls in `useEffect` dependency arrays.

```typescript
type FieldState = {
  value: string;
  touched: boolean;    // true once the field has ever been blurred
  validating: boolean; // true while an async check is in flight
  error: string | null;
};

type FieldAction =
  | { type: 'SET_VALUE';      payload: string }
  | { type: 'SET_TOUCHED';    payload: boolean }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_ERROR';      payload: string | null };

function fieldReducer(state: FieldState, action: FieldAction): FieldState {
  switch (action.type) {
    case 'SET_VALUE':      return { ...state, value: action.payload };
    case 'SET_TOUCHED':    return { ...state, touched: action.payload };
    case 'SET_VALIDATING': return { ...state, validating: action.payload };
    case 'SET_ERROR':      return { ...state, error: action.payload };
    default:               return state;
  }
}
```

Using `useReducer` here instead of multiple `useState` calls guarantees that co-dependent state updates (e.g. clearing `error` while setting `validating: true`) are committed in a single render rather than two.

---

## Step-by-step walkthrough

The full hook is assembled in five stages. Each stage maps to a concept from the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/).

### Stage 1 — Bind DOM events to dispatch

```typescript
import { useReducer } from 'react';

const initialState: FieldState = {
  value: '',
  touched: false,
  validating: false,
  error: null,
};

function useFieldState() {
  const [state, dispatch] = useReducer(fieldReducer, initialState);

  // onChange never triggers validation directly — it only records the new value.
  // Validation is the caller's responsibility (see Stage 2).
  const onChange = (val: string) =>
    dispatch({ type: 'SET_VALUE', payload: val });

  // Mark the field as touched on blur so error messages appear after interaction.
  const onBlur = () => dispatch({ type: 'SET_TOUCHED', payload: true });

  // Clear error and cancel any in-progress validation indicator on re-focus.
  const onFocus = () => {
    if (!state.touched) dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_VALIDATING', payload: false });
  };

  return { state, dispatch, onChange, onBlur, onFocus };
}
```

Attach `aria-invalid={!!state.error}` and `aria-describedby="field-error"` to the input element. Screen readers must announce errors when `onBlur` fires — verify this with VoiceOver or NVDA before shipping.

### Stage 2 — Async validation queue with AbortController

Overlapping promise resolutions corrupt field state in high-latency environments. The solution uses an incrementing request ID to identify and discard stale results.

```typescript
import { useRef } from 'react';

// The shape every async validator must return.
type ValidateAsync = (
  value: string,
  signal: AbortSignal // Pass the signal so fetch() / XHR can honour cancellation.
) => Promise<{ error: string | null }>;

function useAsyncValidation(
  dispatch: React.Dispatch<FieldAction>,
  validateAsync: ValidateAsync
) {
  // Increment on every new run; stale closures that hold an older ID are ignored.
  const requestIdRef = useRef(0);

  // AbortController for the currently active network request.
  const controllerRef = useRef<AbortController | null>(null);

  // Debounce timer handle — cleared before each new run.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = (value: string) => {
    // Cancel the previous debounce window and abort any in-flight request.
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current; // Capture the ID for this run.

    dispatch({ type: 'SET_VALIDATING', payload: true });

    timerRef.current = setTimeout(async () => {
      try {
        const result = await validateAsync(value, controller.signal);

        // Only apply the result if no newer run has started since this one.
        if (requestIdRef.current === requestId) {
          dispatch({ type: 'SET_ERROR', payload: result.error });
        }
      } catch (err) {
        // AbortError is expected — suppress it, propagate everything else.
        if (
          (err as Error).name !== 'AbortError' &&
          requestIdRef.current === requestId
        ) {
          dispatch({ type: 'SET_ERROR', payload: 'Validation failed' });
        }
      } finally {
        // Clear the spinner only if we are still the active request.
        if (requestIdRef.current === requestId) {
          dispatch({ type: 'SET_VALIDATING', payload: false });
        }
      }
    }, 300); // 300 ms debounce keeps network traffic low without feeling sluggish.
  };

  const cleanup = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort(); // Prevent state updates after unmount.
  };

  return { runValidation, cleanup };
}
```

**Debugging tip:** open the Network panel, throttle to Slow 3G, and type rapidly. Only the final request should complete; previous ones should appear as `(cancelled)`.

This pattern is closely related to [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/), which applies the same AbortController technique to a live uniqueness endpoint.

### Stage 3 — SSR hydration guard

Server-rendered React does not execute `useEffect`. If async validation fires before React reconciles the hydrated DOM, Next.js or Remix will throw a checksum mismatch. Guard against this with `useLayoutEffect`.

```typescript
import { useState, useLayoutEffect, useEffect } from 'react';

export function useFormField(validateAsync: ValidateAsync) {
  // false on the server; flipped to true synchronously after first client paint.
  const [hydrated, setHydrated] = useState(false);

  const { state, dispatch, onChange, onBlur, onFocus } = useFieldState();
  const { runValidation, cleanup } = useAsyncValidation(dispatch, validateAsync);

  // useLayoutEffect fires before the browser paints — the hydrated flag is set
  // before any child effects can read it, so validation is guaranteed to be
  // suppressed during the server-rendered phase.
  useLayoutEffect(() => {
    setHydrated(true);
  }, []);

  // Clean up timers and abort controllers when the field unmounts.
  useEffect(() => {
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Programmatic setValue bypasses the debounce for instant feedback (e.g. autofill).
  const setValue = (val: string) => {
    dispatch({ type: 'SET_VALUE', payload: val });
    if (hydrated) runValidation(val);
  };

  const handleChange = (val: string) => {
    onChange(val);
    if (hydrated) runValidation(val);
  };

  return { state, setValue, handleChange, onBlur, onFocus };
}
```

**QA step:** run `next build && next start`, open `view-source:`, and compare the server-rendered markup to the hydrated DOM. No `Hydration failed` warning should appear in the console.

For a broader treatment of hydration mismatches across frameworks, see [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/).

---

## State machine diagram

The diagram below maps the four field lifecycle states to their transition triggers. The `VALIDATING` state can resolve to `VALID` or `INVALID`, or be superseded by a new `CHANGE` event that restarts the cycle.

<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="useFormField state machine: IDLE transitions to VALIDATING on change, then to VALID or INVALID on result, and back to IDLE on focus." style="width:100%;max-width:640px;display:block;margin:1.5rem auto;">
  <title>useFormField state machine</title>
  <desc>Four states: IDLE, VALIDATING, VALID, and INVALID. IDLE transitions to VALIDATING when the user changes the field value. VALIDATING transitions to VALID when the async check passes or to INVALID when it fails. Any VALID or INVALID state returns to VALIDATING on a new change event. Focus clears error and resets INVALID to IDLE.</desc>
  <rect x="0" y="0" width="640" height="260" fill="#f9f5fb"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6 Z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- IDLE -->
  <rect x="20" y="100" width="110" height="52" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="75" y="130" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">IDLE</text>
  <!-- VALIDATING -->
  <rect x="240" y="100" width="130" height="52" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="305" y="130" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">VALIDATING</text>
  <!-- VALID -->
  <rect x="480" y="30" width="110" height="52" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="535" y="60" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">VALID</text>
  <!-- INVALID -->
  <rect x="480" y="178" width="110" height="52" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="535" y="208" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="sans-serif">INVALID</text>
  <!-- IDLE → VALIDATING -->
  <line x1="130" y1="126" x2="238" y2="126" stroke="#7b4f8a" stroke-width="1.4" marker-end="url(#arr)"/>
  <text x="184" y="118" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">onChange</text>
  <!-- VALIDATING → VALID -->
  <line x1="370" y1="114" x2="478" y2="72" stroke="#7b4f8a" stroke-width="1.4" marker-end="url(#arr)"/>
  <text x="436" y="84" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">passes</text>
  <!-- VALIDATING → INVALID -->
  <line x1="370" y1="140" x2="478" y2="185" stroke="#7b4f8a" stroke-width="1.4" marker-end="url(#arr)"/>
  <text x="436" y="178" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">fails</text>
  <!-- VALID → VALIDATING (new change) -->
  <path d="M535,82 C535,95 420,95 370,126" fill="none" stroke="#6b5f75" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="460" y="108" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">onChange</text>
  <!-- INVALID → VALIDATING (new change) -->
  <path d="M535,178 C535,165 420,165 370,140" fill="none" stroke="#6b5f75" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="460" y="160" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">onChange</text>
  <!-- INVALID → IDLE (focus clears) -->
  <path d="M480,204 C390,240 90,240 75,152" fill="none" stroke="#6b5f75" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="260" y="248" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="sans-serif">onFocus (clears error)</text>
</svg>

---

Before adding anything to the reducer, it is worth being able to point at which action each interaction dispatches. Most bugs in a field hook are an interaction wired to the wrong one:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactions mapped to reducer actions and the state each one changes: typing dispatches change and updates value only, leaving the field dispatches blur and sets touched, a validation result dispatches settle and sets error, a programmatic reset dispatches reset and restores everything, and a server rejection dispatches setError without touching the value." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which action each interaction dispatches</title>
  <desc>Typing dispatches a change action, which updates the value and clears any error that was shown, but does not set touched. Leaving the field dispatches blur, which sets touched and triggers validation but never changes the value. A validation result dispatches settle, which writes the error and clears the validating flag. A programmatic reset dispatches reset, which restores the value, clears the error and clears touched together, so no intermediate state is observable. A server rejection dispatches setError, which writes an error without touching the value, because the value the reader typed is still the value they meant.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Interaction</text>
  <text x="196" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action</text>
  <text x="320" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Touches</text>
  <text x="500" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Deliberately leaves alone</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">reader types</text>
  <text x="196" y="66" font-size="10" fill="#6b5f75" font-family="inherit">change</text>
  <text x="320" y="66" font-size="10" fill="#6b5f75" font-family="inherit">value, clears error</text>
  <text x="500" y="66" font-size="10" fill="#6b5f75" font-family="inherit">touched</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">reader leaves the field</text>
  <text x="196" y="100" font-size="10" fill="#6b5f75" font-family="inherit">blur</text>
  <text x="320" y="100" font-size="10" fill="#6b5f75" font-family="inherit">touched, validating</text>
  <text x="500" y="100" font-size="10" fill="#6b5f75" font-family="inherit">value</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">validator resolves</text>
  <text x="196" y="134" font-size="10" fill="#6b5f75" font-family="inherit">settle</text>
  <text x="320" y="134" font-size="10" fill="#6b5f75" font-family="inherit">error, validating</text>
  <text x="500" y="134" font-size="10" fill="#6b5f75" font-family="inherit">value, touched</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">programmatic reset</text>
  <text x="196" y="168" font-size="10" fill="#6b5f75" font-family="inherit">reset</text>
  <text x="320" y="168" font-size="10" fill="#6b5f75" font-family="inherit">everything, at once</text>
  <text x="500" y="168" font-size="10" fill="#6b5f75" font-family="inherit">nothing</text>
  <line x1="10" y1="182" x2="690" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">server rejects the submit</text>
  <text x="196" y="202" font-size="10" fill="#6b5f75" font-family="inherit">setError</text>
  <text x="320" y="202" font-size="10" fill="#6b5f75" font-family="inherit">error only</text>
  <text x="500" y="202" font-size="10" fill="#7b4f8a" font-family="inherit">value — never discard their typing</text>
</svg>

## Failure modes and edge cases

### 1. Autofill bypass

Browsers inject autofilled values via a synthetic `change` event that fires before React's synthetic event system is ready. If `hydrated` is still `false` at that point, autofill silently skips validation.

**Fix:** listen for the native `animationstart` event fired by the browser's autofill CSS animation and manually trigger `runValidation` when it fires:

```typescript
useEffect(() => {
  const el = inputRef.current;
  if (!el) return;
  const handler = () => { if (hydrated) runValidation(el.value); };
  el.addEventListener('animationstart', handler);
  return () => el.removeEventListener('animationstart', handler);
}, [hydrated]);
```

### 2. Stale closure over `hydrated` inside the debounce timer

The `setTimeout` callback closes over `hydrated` at the time `runValidation` is called. If hydration completes in the 300 ms debounce window, the closure still sees `false`.

**Fix:** store `hydrated` in a ref and read it inside the callback rather than closing over the state variable:

```typescript
const hydratedRef = useRef(false);
useLayoutEffect(() => {
  setHydrated(true);
  hydratedRef.current = true; // Keep the ref in sync.
}, []);
```

Then guard with `hydratedRef.current` inside `setTimeout`.

### 3. Safari `input` event quirk on `<input type="date">`

Safari fires the `input` event for date pickers on every wheel scroll step, generating dozens of validation calls per second. The 300 ms debounce is insufficient.

**Fix:** increase the debounce to 600 ms specifically for `type="date"` inputs, or switch to `onChange` (which Safari defers until the picker is closed).

### 4. Missing `AbortError` guard in custom `validateAsync` implementations

If a custom `validateAsync` does not propagate the `AbortSignal` to its inner `fetch()`, the request completes even after the controller aborts. The request-ID guard still prevents the stale result from reaching the UI, but the network round-trip is wasted.

**Fix:** always pass `signal` to `fetch`:

```typescript
const res = await fetch('/api/check-email', { signal }); // Not optional.
```

### 5. `eslint-disable` mask hiding a real exhaustive-deps bug

The `useEffect(() => cleanup, [])` pattern intentionally omits `cleanup` from the dependency array — the cleanup function reference changes on every render, and including it would restart the effect on each render. The lint suppression comment is correct but hides future mistakes if the effect body grows.

**Fix:** extract `cleanup` from the hook return value and memoize it with `useCallback` so the reference is stable.

---

The last row is worth dwelling on, because "clear the error on change" and "keep the server error until the value changes" pull in opposite directions:

<svg viewBox="0 8 664 208" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two error origins and how long each survives. A local validation error is cleared on the next keystroke because the reader is already fixing it. A server error is kept until the value actually differs from the value that was rejected, so it does not vanish on a stray keypress." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Local errors clear on change; server errors clear on difference</title>
  <desc>A local validation error is produced by a rule the client can re-run, so the moment the reader types it is out of date and clearing it immediately is correct. A server error was produced by information the client does not have — a uniqueness check, a business rule — so it cannot be re-evaluated locally. Clearing it on the first keystroke means a stray keypress makes it disappear while the underlying problem remains. Keeping it until the value differs from the exact value that was rejected preserves it through cursor movement and re-typing of the same characters, and clears it the moment the reader genuinely changes their answer.</desc>
  <rect x="0" y="8" width="664" height="208" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">local error — the client can re-run the rule</text>
  <rect x="14" y="36" width="300" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="58" font-size="10" fill="#6b5f75" font-family="inherit">produced by: a rule in the schema</text>
  <text x="28" y="76" font-size="10" fill="#6b5f75" font-family="inherit">cleared by: the next keystroke</text>
  <text x="28" y="94" font-size="10" fill="#2d6342" font-family="inherit">safe — it is re-derived immediately</text>
  <text x="350" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">server error — the client cannot</text>
  <rect x="350" y="36" width="300" height="66" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="364" y="58" font-size="10" fill="#6b5f75" font-family="inherit">produced by: data only the server has</text>
  <text x="364" y="76" font-size="10" fill="#6b5f75" font-family="inherit">cleared by: the value actually differing</text>
  <text x="364" y="94" font-size="10" fill="#7b4f8a" font-family="inherit">keep the rejected value to compare against</text>
  <rect x="14" y="120" width="636" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="142" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">The rule that covers both</text>
  <text x="28" y="160" font-size="9.5" fill="#6b5f75" font-family="inherit">Store the origin with the error. On change, clear it if origin is local, or if origin is server and value !== rejectedValue.</text>
  <text x="14" y="196" font-size="10" fill="#6b5f75" font-family="inherit">Without the origin field there is no way to express this, which is why an error of type string is not enough for a real form.</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Re-announce a server error that survives a change, or a reader who is editing will not know it is still there.</text>
</svg>

## Verification checklist

- Typing rapidly in Network → Slow 3G shows only the last request completing; earlier ones are `(cancelled)` in the Network tab.
- Unmounting the component mid-validation produces no `Can't perform a React state update on an unmounted component` warning.
- `view-source:` markup matches the hydrated DOM in a Next.js / Remix production build — no `Hydration failed` in the console.
- `aria-invalid` toggles to `true` after blur with a validation error; toggles back to `false` after the error is cleared.
- `aria-busy` reflects `state.validating` — confirmed with a screen reader or axe-core DevTools scan.
- Autofill (Chrome's address form, Safari's password suggestion) triggers validation correctly.
- `role="alert"` error container announces the error message to VoiceOver/NVDA without requiring focus.
- No TypeScript errors on `strict: true` — all `payload` types and `FieldAction` variants are exhaustive.

---

## FAQ

**Q: How do I test async race conditions deterministically in CI?**

Use `page.route()` in Playwright or `cy.intercept()` in Cypress to delay validation responses by 1–2 seconds. Fire rapid `input` events programmatically, then assert that only the final network request resolves and the earlier ones were cancelled. The `requestIdRef` counter is an internal implementation detail — test the observable outcome (error state reflects the last value typed), not the ref value.

**Q: Can this hook work with Zod or Yup schemas?**

Yes. The `validateAsync` and `validateSync` parameters are schema-agnostic interfaces. Wire Zod's `.parseAsync()` or Yup's `.validate()` to the async slot, and `.safeParse()` / `.validateSync()` (with `{ abortEarly: true }`) to the sync fallback. See [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) for the full wiring pattern.

**Q: Why `useLayoutEffect` instead of `useEffect` for the hydration guard?**

`useLayoutEffect` fires synchronously after DOM mutations but before the browser paints. This means the `hydrated` flag is set before any `useEffect` in the same component tree reads it. If you used `useEffect`, there is a brief window during which a child effect could fire validation against server-rendered markup, causing a mismatch.

**Q: How do I surface accessibility errors during degraded validation states?**

Pair `aria-invalid` with `aria-describedby` pointing to an error container. During timeout fallback, dispatch a `validation:degraded` custom event and update a `role="alert"` region. The alert fires without moving focus, so the user can keep typing. Use `aria-busy={state.validating}` on the input to signal ongoing checks.

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) — the parent context for how this hook fits into a complete form pipeline
- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/) — deeper treatment of server/client reconciliation across frameworks
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — patterns for debouncing, cancellation, and retry at the validation-layer level
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — how to propagate field-level errors up to form-level and UI components

← [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
