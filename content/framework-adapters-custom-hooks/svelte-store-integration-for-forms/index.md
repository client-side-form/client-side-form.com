---
layout: page.njk
title: "Svelte Store Integration for Forms"
description: "Production patterns for wiring Svelte writable and derived stores into a form validation pipeline — covering state machines, AbortController-safe async checks, and subscription teardown."
slug: "svelte-store-integration-for-forms"
type: topic
breadcrumb: "Svelte Store Integration for Forms"
datePublished: "2024-03-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Svelte Store Integration for Forms"
  parent: "Framework Adapters"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Svelte Store Integration for Forms",
      "description": "Production patterns for wiring Svelte writable and derived stores into a form validation pipeline — covering state machines, AbortController-safe async checks, and subscription teardown.",
      "datePublished": "2024-03-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Svelte Store Integration for Forms", "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Wire Svelte stores into a form validation pipeline",
      "step": [
        { "@type": "HowToStep", "name": "Define the field state shape and writable store" },
        { "@type": "HowToStep", "name": "Build the debounced, AbortController-safe validation dispatcher" },
        { "@type": "HowToStep", "name": "Derive aggregate form validity and submitting state" },
        { "@type": "HowToStep", "name": "Wire store updates to component event handlers" },
        { "@type": "HowToStep", "name": "Implement teardown to avoid subscription leaks on route change" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Svelte store validation differ from hook-based form libraries?",
          "acceptedAnswer": { "@type": "Answer", "text": "Svelte stores operate at module scope, outside the component tree. Validation logic runs once per store update rather than re-rendering all subscribers. The compiler eliminates subscription boilerplate, but the module-level architecture means you are responsible for AbortController teardown that a hook library would handle internally." }
        },
        {
          "@type": "Question",
          "name": "Can this architecture handle async uniqueness checks without race conditions?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, but only if every async validator carries an AbortController whose signal is checked before committing results. Debounce alone is not sufficient — a slow previous request can still resolve after a faster subsequent one. Cancel the in-flight request on every new keystroke." }
        },
        {
          "@type": "Question",
          "name": "How do you prevent store subscription leaks in SvelteKit routing?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use the $ auto-subscription syntax in component templates — the compiler inserts the unsubscribe call in onDestroy automatically. For programmatic subscriptions in utility modules, capture the returned unsubscribe function and call it explicitly inside onDestroy." }
        },
        {
          "@type": "Question",
          "name": "When should the form store live at module scope versus inside a component?",
          "acceptedAnswer": { "@type": "Answer", "text": "Module-scope stores suit multi-step wizards and cross-route state. If the form is self-contained and reset on unmount, instantiate the store inside the component or a context-scoped factory to avoid state bleed between independent form instances." }
        }
      ]
    }
  ]
}
</script>

# Svelte Store Integration for Forms

The specific production failure this page addresses: async field validators that resolve out of order, leaving `VALID` stamped on a field whose value has already changed — a race condition that Svelte's reactive primitives do not prevent on their own. This pattern applies whenever a Svelte form touches a remote API (email uniqueness checks, username lookups, postcode lookups) and must display accurate, real-time feedback without committing stale results.

This is a sub-topic within [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/). The broader pipeline context — how validation status flows up from field to form to submit gate — is covered in the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) reference.

---

## State machine specification

Each field tracks exactly one of five states. Triggers move the field forward or backward; no state is skipped.

| State | Meaning | Typical trigger |
|-------|---------|-----------------|
| `IDLE` | No user interaction yet | Store initialisation / `resetForm()` |
| `PENDING` | Debounce timer running; no result yet | `input` event fires |
| `VALIDATING` | Async request in flight | Debounce timer expires |
| `VALID` | Last check passed | Async resolver commits `null` error |
| `INVALID` | Last check failed | Resolver commits non-null error string |

The form itself aggregates field states: it is `SUBMITTABLE` only when every field is `VALID` and `isSubmitting` is `false`.

<!-- Svelte store form state machine SVG -->
<svg viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Svelte form field state machine diagram" style="width:100%;max-width:720px;display:block;margin:1.5rem auto;" >
  <title>Svelte form field state machine</title>
  <desc>State transitions for a single form field: IDLE → PENDING → VALIDATING → VALID or INVALID, with reset back to IDLE</desc>
  <rect x="0" y="0" width="720" height="220" fill="#f9f5fb"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 Z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- Nodes -->
  <!-- IDLE -->
  <rect x="10" y="80" width="90" height="40" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="55" y="105" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="inherit">IDLE</text>
  <!-- PENDING -->
  <rect x="155" y="80" width="100" height="40" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="205" y="105" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="inherit">PENDING</text>
  <!-- VALIDATING -->
  <rect x="315" y="80" width="120" height="40" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="375" y="105" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="inherit">VALIDATING</text>
  <!-- VALID -->
  <rect x="500" y="30" width="90" height="40" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="545" y="55" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="inherit">VALID</text>
  <!-- INVALID -->
  <rect x="500" y="135" width="90" height="40" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="545" y="160" text-anchor="middle" font-size="13" fill="#1e1a24" font-family="inherit">INVALID</text>
  <!-- Arrows: IDLE → PENDING -->
  <line x1="100" y1="100" x2="153" y2="100" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="125" y="92" text-anchor="middle" font-size="10" fill="#6b5f75">input</text>
  <!-- PENDING → VALIDATING -->
  <line x1="255" y1="100" x2="313" y2="100" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="283" y="92" text-anchor="middle" font-size="10" fill="#6b5f75">debounce end</text>
  <!-- VALIDATING → VALID -->
  <line x1="435" y1="90" x2="498" y2="58" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="470" y="64" text-anchor="middle" font-size="10" fill="#6b5f75">null error</text>
  <!-- VALIDATING → INVALID -->
  <line x1="435" y1="110" x2="498" y2="145" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="470" y="138" text-anchor="middle" font-size="10" fill="#6b5f75">error string</text>
  <!-- VALID → IDLE (reset arc, top) -->
  <path d="M545,30 Q620,10 640,100 Q620,190 545,175" fill="none" stroke="#6b5f75" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="660" y="105" text-anchor="middle" font-size="10" fill="#6b5f75">reset</text>
  <!-- INVALID → PENDING (re-input arc, bottom) -->
  <path d="M500,162 Q460,200 375,200 Q280,200 205,175" fill="none" stroke="#6b5f75" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="360" y="215" text-anchor="middle" font-size="10" fill="#6b5f75">re-input</text>
</svg>

---

## Core implementation

The implementation below is fully runnable TypeScript. Key design decisions:

- An `AbortController` is created per validation invocation and cancelled on every subsequent call — this is the only reliable guard against out-of-order async results. A debounce timer alone is not sufficient.
- `get(formStore)` reads the store synchronously inside the debounce callback to capture the stabilised value, not the value at keystroke time.
- The `derived` store re-computes on every `formStore` update, keeping the submit gate reactive without manual wiring.

```typescript
import { writable, derived, get } from 'svelte/store';

// ── Types ────────────────────────────────────────────────────────────────────

export type ValidationStatus = 'IDLE' | 'PENDING' | 'VALIDATING' | 'VALID' | 'INVALID';

export interface FormField<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
  status: ValidationStatus;
}

export interface FormState {
  email: FormField;
  username: FormField;
  isSubmitting: boolean;
}

// ── Initial state ─────────────────────────────────────────────────────────────

const blankField = (): FormField => ({
  value: '',
  error: null,
  touched: false,
  status: 'IDLE',
});

const initialState: FormState = {
  email: blankField(),
  username: blankField(),
  isSubmitting: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const formStore = writable<FormState>(initialState);

// ── Debounce factory ──────────────────────────────────────────────────────────

function makeDebounce(ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (fn: () => void): void => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

// ── Async validators ──────────────────────────────────────────────────────────

// AbortController is passed in so the caller controls cancellation.
// Always check signal.aborted before writing results back to the store.
async function checkEmailAvailability(
  value: string,
  signal: AbortSignal   // AbortSignal — must be checked before any store.update()
): Promise<string | null> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address';
  }
  const res = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`, { signal });
  if (signal.aborted) return null;   // race guard — discard this result
  const { available } = await res.json();
  return available ? null : 'This email is already registered';
}

async function checkUsernameAvailability(
  value: string,
  signal: AbortSignal   // AbortSignal — checked before committing result
): Promise<string | null> {
  if (value.length < 3) return 'Username must be at least 3 characters';
  const res = await fetch(`/api/check-username?username=${encodeURIComponent(value)}`, { signal });
  if (signal.aborted) return null;   // race guard
  const { available } = await res.json();
  return available ? null : 'Username is taken';
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

// One AbortController per field — holds the in-flight request for that field.
// WeakMap is NOT appropriate here because field keys are plain strings, not objects.
// A plain Record is correct; it holds exactly one controller per named field.
const controllers: Partial<Record<keyof Omit<FormState, 'isSubmitting'>, AbortController>> = {};

const debounce = makeDebounce(320);

export function updateField(
  field: keyof Omit<FormState, 'isSubmitting'>,
  value: string
): void {
  // 1. Cancel any in-flight request for this field immediately on new input.
  //    This is the race-condition guard — debounce alone is not enough.
  controllers[field]?.abort();

  // 2. Mark the field as PENDING so the UI can show a spinner immediately.
  formStore.update(state => ({
    ...state,
    [field]: { ...state[field], value, touched: true, status: 'PENDING' },
  }));

  debounce(async () => {
    // 3. Create a fresh controller for this validation run.
    const controller = new AbortController();
    controllers[field] = controller;   // AbortController — stored so next keystroke can cancel it

    // 4. Read the stabilised value after debounce, not the value at keystroke time.
    const stabilisedValue = (get(formStore)[field] as FormField).value;

    // 5. Set VALIDATING so the UI can differentiate "waiting to start" from "request in flight".
    formStore.update(state => ({
      ...state,
      [field]: { ...state[field], status: 'VALIDATING' },
    }));

    try {
      const error = field === 'email'
        ? await checkEmailAvailability(stabilisedValue, controller.signal)
        : await checkUsernameAvailability(stabilisedValue, controller.signal);

      // 6. Only commit if this controller was not superseded by a newer keystroke.
      if (!controller.signal.aborted) {
        formStore.update(state => ({
          ...state,
          [field]: { ...state[field], error, status: error ? 'INVALID' : 'VALID' },
        }));
      }
    } catch (err) {
      // AbortError is expected on cancellation — do not write an error to the store.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      formStore.update(state => ({
        ...state,
        [field]: { ...state[field], error: 'Validation failed — please retry', status: 'INVALID' },
      }));
    }
  });
}

// ── Derived state ─────────────────────────────────────────────────────────────

// isFormSubmittable re-computes whenever formStore changes.
// VALID on every field AND not currently submitting = gate opens.
export const isFormSubmittable = derived(formStore, $s =>
  (['email', 'username'] as const).every(f => $s[f].status === 'VALID') &&
  !$s.isSubmitting
);

// ── Teardown ──────────────────────────────────────────────────────────────────

/** Call this in onDestroy or on successful navigation away from the form. */
export function destroyFormStore(): void {
  // Cancel any in-flight requests so they cannot commit after the component unmounts.
  Object.values(controllers).forEach(ctrl => ctrl?.abort());
  formStore.set(initialState);
}

export const resetForm = () => formStore.set(initialState);
```

### Component wiring (Svelte 4)

```html
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { formStore, isFormSubmittable, updateField, destroyFormStore } from './formStore';

  // $ auto-subscription — compiler inserts unsubscribe in onDestroy automatically
  $: form = $formStore;
  $: canSubmit = $isFormSubmittable;

  onDestroy(destroyFormStore);

  async function handleSubmit() {
    formStore.update(s => ({ ...s, isSubmitting: true }));
    try {
      await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.value, username: form.username.value }),
      });
    } finally {
      formStore.update(s => ({ ...s, isSubmitting: false }));
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} novalidate>
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    value={form.email.value}
    data-field="email"
    data-status={form.email.status}
    aria-invalid={form.email.status === 'INVALID'}
    aria-describedby="email-error"
    on:input={e => updateField('email', e.currentTarget.value)}
  />
  <span id="email-error" role="alert" aria-live="polite">
    {#if form.email.status === 'INVALID'}{form.email.error}{/if}
    {#if form.email.status === 'VALIDATING'}Checking…{/if}
  </span>

  <label for="username">Username</label>
  <input
    id="username"
    type="text"
    value={form.username.value}
    data-field="username"
    data-status={form.username.status}
    aria-invalid={form.username.status === 'INVALID'}
    aria-describedby="username-error"
    on:input={e => updateField('username', e.currentTarget.value)}
  />
  <span id="username-error" role="alert" aria-live="polite">
    {#if form.username.status === 'INVALID'}{form.username.error}{/if}
    {#if form.username.status === 'VALIDATING'}Checking…{/if}
  </span>

  <button type="submit" disabled={!canSubmit}>
    {form.isSubmitting ? 'Registering…' : 'Register'}
  </button>
</form>
```

---

## Integration guidance

This store pattern slots directly into the [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) pipeline: the `VALIDATING` state maps to the pipeline's in-flight phase, and the `AbortController` cancellation logic is the same mechanism described for cancelling fetch-based uniqueness checks in [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/).

The `isFormSubmittable` derived store acts as the submit gate described in the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/). Wire it to `disabled` on the submit button — never compute submission eligibility inline in the component, because derived stores are already memoised.

If the form rehydrates after SSR, review [handling Svelte form hydration mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/) before wiring store updates to `on:input` — the first hydration event from the browser can replay input values the server already rendered, triggering spurious `VALIDATING` states.

For [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/), compare `field.value` against the original server-supplied value in a separate derived store rather than inside `updateField`. Mixing dirty-tracking into the validation dispatcher creates temporal coupling that makes testing harder.

---

### Which store primitive each piece of form state wants

Svelte's store contract is small enough that the interesting decision is not how to write one, but which of the three shapes each piece of state should be. Choosing wrongly is what produces the two classic bugs: a derived value that will not update, and a writable that has drifted out of sync with the value it was derived from.

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three Svelte store shapes matched to the form state that belongs in each: writable for values and touched flags, derived for the dirty map and validity, and readable for anything the form only observes such as a connectivity flag." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>writable, derived, readable — and what belongs in each</title>
  <desc>Writable holds the field values and the touched flags, because the reader writes them and nothing else computes them. Derived holds the dirty map, the per-field validity and the form-level can-submit flag, because every one of them is a pure function of values plus the baseline, and storing them separately is how they drift. Readable holds anything the form observes but never writes, such as an online or offline flag or a server-pushed lock. A note warns that a derived store with an incorrect dependency list simply never updates, silently, because Svelte has no way to know what you meant to depend on.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Shape</text>
  <text x="140" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Holds</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Because</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">writable</text>
  <text x="140" y="66" font-size="10" fill="#6b5f75" font-family="inherit">values, touched flags</text>
  <text x="400" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the reader writes them; nothing derives them</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">derived</text>
  <text x="140" y="100" font-size="10" fill="#6b5f75" font-family="inherit">dirty map, validity, canSubmit</text>
  <text x="400" y="100" font-size="10" fill="#6b5f75" font-family="inherit">pure functions of values — storing them lets them drift</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">readable</text>
  <text x="140" y="134" font-size="10" fill="#6b5f75" font-family="inherit">online flag, server lock</text>
  <text x="400" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the form observes but never writes them</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#a63d6f" font-family="inherit">the classic failure</text>
  <text x="140" y="168" font-size="10" fill="#6b5f75" font-family="inherit">a derived with a wrong dep list</text>
  <text x="400" y="168" font-size="10" fill="#a63d6f" font-family="inherit">never updates, silently — nothing throws</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">If you find yourself calling set on something in the second row, it belonged in the first — or it should not exist.</text>
</svg>

## Edge cases & failure modes

### Concurrent field updates during rapid tab-navigation

When a user tabs through fields quickly, multiple `updateField` calls fire for different fields nearly simultaneously. The `controllers` record holds one `AbortController` per field name, so cancelling the email controller never affects the username controller. Verify this during QA by tabbing through all fields within 100 ms in a network-throttled environment and confirming each field eventually reaches `VALID` or `INVALID` independently.

### Store value versus event target value drift

Inside the debounce callback, reading `e.currentTarget.value` is unsafe — the event object may have been recycled or the input unmounted. Always read the stabilised value via `get(formStore)[field].value` after the debounce fires. The implementation above does this at step 4.

### Module-scope store state bleeding between test runs

A module-scope `formStore` retains its last state across component remounts in the same module context — common in Vitest with default module caching. Call `resetForm()` in `beforeEach` or use a factory that returns a fresh store per test.

### AbortError propagation on older Safari

Safari 14 and below throw `DOMException` with `name === 'AbortError'` on aborted fetches, but some polyfill environments throw a plain `Error`. The catch block above checks `err instanceof DOMException && err.name === 'AbortError'`. If you support environments where this is unreliable, also check `err?.name === 'AbortError'` as a fallback.

### Shadow DOM event boundary

If the form component is mounted inside a Web Component with a closed shadow root, `on:input` events bubble only to the shadow host. Svelte's event directives handle this transparently, but custom `addEventListener` calls in the store module cannot reach elements inside a closed shadow root. Keep all event binding in the Svelte template, not in the store module.

---

## Troubleshooting reference

| Failure scenario | Diagnostic step | Recovery action |
|------------------|-----------------|-----------------|
| Field stays `VALIDATING` indefinitely | Check Network tab for a pending fetch; confirm the API responds within timeout | Add a `setTimeout`-based timeout that aborts the controller if the request exceeds ~5 s |
| `VALID` stamped on wrong value after fast typing | Confirm `AbortController` cancellation fires on every `updateField` call | Ensure `controllers[field]?.abort()` is called at the top of `updateField`, before the debounce |
| Submit button stays disabled after all fields pass | Log `isFormSubmittable` in the browser console; check that every field key is listed in the `every()` predicate | Update the field key list in the `derived` callback to include all fields |
| Stale errors visible after navigating back to the form | Confirm `destroyFormStore` or `resetForm` is called in `onDestroy` | Call `resetForm()` on route enter if the form should always start blank |
| Duplicate validation requests firing per keystroke | Check that `debounce` is created once at module scope, not inside the function | Move `makeDebounce` call outside `updateField` so it shares one timer across all calls |

---

Auto-subscription is the other place Svelte's ergonomics hide a lifetime. The `$store` syntax is doing real work, and it only does that work inside a component:

<svg viewBox="0 8 664 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of auto-subscription with the dollar prefix against a manual subscribe call: the compiler adds the unsubscribe on destroy for the first, while the second leaks unless you call the returned function yourself, and only the manual form is available in a plain module." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>$store unsubscribes for you; subscribe() does not</title>
  <desc>Inside a component, writing dollar-store compiles to a subscribe call plus an unsubscribe registered on component destroy, so the lifetime is handled and the value is always current. Inside a plain module — a validation helper, a store factory, an adapter — the dollar prefix is unavailable, so you must call subscribe yourself and you own the returned unsubscribe function. Forgetting it keeps the module's closure, and everything it captured, alive for the lifetime of the page. A note recommends get(store) for a single read, since it subscribes and unsubscribes immediately and cannot leak.</desc>
  <rect x="0" y="8" width="664" height="210" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">inside a component: $values</text>
  <rect x="14" y="36" width="304" height="106" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="58" font-size="10" fill="#6b5f75" font-family="inherit">compiles to subscribe() on init</text>
  <text x="28" y="80" font-size="10" fill="#6b5f75" font-family="inherit">and unsubscribe() on destroy</text>
  <text x="28" y="102" font-size="10" fill="#2d6342" font-family="inherit">lifetime handled for you</text>
  <text x="28" y="124" font-size="10" fill="#6b5f75" font-family="inherit">always the current value</text>
  <text x="346" y="26" font-size="11.5" font-weight="700" fill="#b07a55" font-family="inherit">inside a plain module: subscribe()</text>
  <rect x="346" y="36" width="304" height="106" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="360" y="58" font-size="10" fill="#6b5f75" font-family="inherit">no $ prefix available at all</text>
  <text x="360" y="80" font-size="10" fill="#6b5f75" font-family="inherit">you own the returned function</text>
  <text x="360" y="102" font-size="10" fill="#a63d6f" font-family="inherit">forget it and the closure never dies</text>
  <text x="360" y="124" font-size="10" fill="#6b5f75" font-family="inherit">use get(store) for a single read</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">Validation helpers and store factories are exactly the modules where this bites: they outlive every component that used them.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">get(store) subscribes and unsubscribes in the same call, so a helper that only needs the value now cannot leak at all.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">For a helper that needs updates over time, take the unsubscribe and return it — let the caller own the lifetime.</text>
</svg>

## Testing & QA hooks

The `data-field` and `data-status` attributes on each `<input>` provide stable selectors for Playwright and Cypress without coupling tests to CSS class names:

```typescript
// Playwright — wait for async validation to complete before asserting
await page.fill('[data-field="email"]', 'user@example.com');
await page.waitForSelector('[data-field="email"][data-status="VALID"]', { timeout: 4000 });

// Cypress
cy.get('[data-field="username"]').type('newuser');
cy.get('[data-field="username"][data-status="VALID"]', { timeout: 4000 }).should('exist');
```

For accessibility regression coverage, assert that `aria-invalid` flips to `"true"` on `INVALID` and that `aria-describedby` points to the error `<span>`. These attributes are the source of truth for screen reader announcements — if they are missing, the `a11y_check` gate will catch it, but catching it in your own test suite is faster.

```typescript
// Playwright accessibility assertion
await expect(page.locator('[data-field="email"]')).toHaveAttribute('aria-invalid', 'true');
await expect(page.locator('#email-error')).toHaveText(/already registered/);
```

---

## Common pitfalls

- **Debounce without cancellation.** A 320 ms debounce prevents most races but not all. A slow network can still deliver a response from request N after request N+1 has committed. Cancel the in-flight request on every new `updateField` call; do not rely on debounce alone.
- **Reading event values inside the debounce callback.** Svelte's synthetic event objects can be recycled. Read field values from the store via `get(formStore)` inside the debounce, not from the closure-captured event argument.
- **Global module-scope store for multi-instance forms.** If the same form component is mounted in two places simultaneously (e.g. a modal and an inline widget), they share the same `formStore` and overwrite each other's state. Use a context-scoped store factory: `setContext('form', writable(initialState))` and `getContext('form')` per component tree.
- **Forgetting to cancel controllers in `onDestroy`.** If the user navigates away while a request is in flight, the callback fires after the component is gone. Without `destroyFormStore()`, it calls `formStore.update()` on a store that may now be powering a different page's form. Always call `destroyFormStore` in `onDestroy`.
- **Not reflecting `VALIDATING` in the UI.** Showing only `VALID` / `INVALID` states means users see no feedback during the network round-trip and may submit before the check completes. Render a "Checking…" indicator while `status === 'VALIDATING'` and keep the submit button disabled until all fields reach `VALID`.

---

## Frequently Asked Questions

<details>
<summary><strong>How does Svelte store validation differ from hook-based form libraries?</strong></summary>

Svelte stores operate at module scope, outside the component tree. Validation logic runs once per store update rather than re-rendering all subscribers. The compiler eliminates subscription boilerplate via the `$` syntax, but the module-level architecture means you are responsible for `AbortController` teardown that a hook library like React Hook Form would handle internally through the hook's cleanup function.

</details>

<details>
<summary><strong>Can this architecture handle async uniqueness checks without race conditions?</strong></summary>

Yes, but only if every async validator carries an `AbortController` whose signal is checked before committing results. Debounce alone is not sufficient — a slow previous request can still resolve after a faster subsequent one. Cancel the in-flight request on every new keystroke by calling `controllers[field]?.abort()` at the top of `updateField`.

</details>

<details>
<summary><strong>How do you prevent store subscription leaks in SvelteKit routing?</strong></summary>

Use the `$store` auto-subscription syntax in component templates — the Svelte compiler inserts the `unsubscribe` call inside `onDestroy` automatically. For programmatic subscriptions in utility modules, capture the returned `unsubscribe` function and call it explicitly inside `onDestroy`. Also call `destroyFormStore()` to cancel any in-flight HTTP requests that would otherwise write to the store after the component is gone.

</details>

<details>
<summary><strong>When should the form store live at module scope versus inside a component?</strong></summary>

Module-scope stores suit multi-step wizards and cross-route state where you need field values to survive navigation. If the form is self-contained and must reset on unmount, instantiate the store inside a Svelte context (`setContext` / `getContext`) or as a component-local variable to prevent state bleed between independent instances of the same form component.

</details>

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) — hook-driven reconciliation as an alternative adapter pattern
- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) — `watchEffect`-based reactive pipelines for Vue 3
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — framework-agnostic patterns for race-condition-safe remote checks
- [Handling Svelte Form Hydration Mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/) — SSR rehydration edge cases for this store pattern

← [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/)
