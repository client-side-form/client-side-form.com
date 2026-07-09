---
layout: page.njk
title: "Dirty and Pristine State Tracking"
description: "Production patterns for tracking which form fields have been modified — preventing false-positive validation triggers, submission gating failures, and stale baseline bugs."
slug: dirty-and-pristine-state-tracking
type: topic
breadcrumb: "Dirty and Pristine State Tracking"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Dirty and Pristine State Tracking"
  parent: "Form State Fundamentals"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Dirty and Pristine State Tracking",
      "description": "Production patterns for tracking which form fields have been modified — preventing false-positive validation triggers, submission gating failures, and stale baseline bugs.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Dirty and Pristine State Tracking", "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Dirty and Pristine State Tracking",
      "step": [
        { "@type": "HowToStep", "name": "Capture an initial value snapshot on mount or after hydration" },
        { "@type": "HowToStep", "name": "Intercept user-driven input/change events and normalize values before comparison" },
        { "@type": "HowToStep", "name": "Track a dirtyFields Set per field alongside a global isDirty boolean" },
        { "@type": "HowToStep", "name": "Route programmatic data loads through a separate hydrate() path to preserve the pristine baseline" },
        { "@type": "HowToStep", "name": "Gate validation execution and submit buttons on the dirty/pristine flags" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent programmatic updates from marking a form dirty?",
          "acceptedAnswer": { "@type": "Answer", "text": "Route all programmatic mutations through a hydrate() method that updates both the initial and current value snapshots atomically. The adapter treats the incoming data as the new pristine baseline and clears all dirty flags." }
        },
        {
          "@type": "Question",
          "name": "Should validation run on pristine fields?",
          "acceptedAnswer": { "@type": "Answer", "text": "Lightweight synchronous checks (required markers, format hints) are acceptable on pristine fields. Expensive async calls should be deferred until the field is dirty or the user submits, to avoid unnecessary network requests and premature error messages." }
        },
        {
          "@type": "Question",
          "name": "How does deep equality impact performance in large forms?",
          "acceptedAnswer": { "@type": "Answer", "text": "Deep equality scales O(n) with object size and is called on every keypress — a problem above roughly 50 fields. Switch to path-based tracking with a dirtyFields Set and run per-field equality only when that specific field updates, keeping each comparison O(1)." }
        },
        {
          "@type": "Question",
          "name": "How do I reset dirty state after a successful submission?",
          "acceptedAnswer": { "@type": "Answer", "text": "Call hydrate() with the server-confirmed payload after a successful submit. This advances the pristine baseline to the saved values, clears all dirty flags, and prevents the form from showing unsaved-changes warnings after a clean save." }
        }
      ]
    }
  ]
}
</script>

# Dirty and Pristine State Tracking

The moment a user types in a field your form must answer two questions simultaneously: has this field changed from its initial value, and should validation fire yet? Getting either wrong produces the failure modes production engineers debug most often — validation errors shown before the user has typed anything, submit buttons that stay disabled after a programmatic reset, or dirty flags that survive an API hydration and confuse unsaved-change guards.

This page details the adapter pattern that distinguishes user-driven mutations from programmatic initialization, tracks change granularity down to individual fields, and integrates with [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) gating without introducing render-budget problems.

---

## Problem Statement

The core difficulty is that a form's value can change from two sources that must be treated differently:

- **User input** — a `change` or `input` event fired by human interaction. This source should flip a field from pristine to dirty and may trigger validation.
- **Programmatic initialization** — API hydration after fetch, autofill injection, default value propagation, or a post-submit server confirmation. This source must update the pristine baseline without marking anything dirty.

Conflating the two is the root cause of almost every "why is my form showing validation errors on load?" bug. A naively wired `onChange` handler that always calls `setState` treats both paths identically.

The pattern described here separates them at the adapter boundary: `update()` for user-driven mutations, `hydrate()` for programmatic initialization. Both paths produce immutable snapshots; neither leaks mutable references into consumer components.

---

## State Machine Specification

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-label="Dirty and pristine state machine diagram" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Dirty and Pristine State Machine</title>
  <desc>State transitions between PRISTINE, DIRTY, VALIDATING, and RESET states triggered by user input, hydration, blur, and submit events.</desc>
  <!-- Background -->
  <rect width="720" height="340" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- State nodes -->
  <!-- PRISTINE -->
  <rect x="40" y="130" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="105" y="152" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">PRISTINE</text>
  <text x="105" y="170" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">isDirty: false</text>
  <!-- DIRTY -->
  <rect x="295" y="50" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="360" y="72" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">DIRTY</text>
  <text x="360" y="90" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">isDirty: true</text>
  <!-- VALIDATING -->
  <rect x="295" y="230" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="360" y="252" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">VALIDATING</text>
  <text x="360" y="270" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">async in-flight</text>
  <!-- RESET / HYDRATED -->
  <rect x="550" y="130" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="615" y="152" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">RESET</text>
  <text x="615" y="170" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">new baseline set</text>
  <!-- Arrows -->
  <!-- PRISTINE → DIRTY (user input) -->
  <path d="M170 145 C220 100 260 80 295 77" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr)"/>
  <text x="220" y="96" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">update(field, value)</text>
  <!-- DIRTY → VALIDATING (blur) -->
  <path d="M360 104 L360 230" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr)"/>
  <text x="380" y="172" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">onBlur / submit</text>
  <!-- VALIDATING → DIRTY (result) -->
  <path d="M330 230 C290 200 320 140 325 104" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr)"/>
  <text x="265" y="180" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">VALID / INVALID</text>
  <!-- DIRTY → RESET (reset/hydrate) -->
  <path d="M425 77 C500 60 540 110 550 145" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr)"/>
  <text x="510" y="88" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">reset() / hydrate()</text>
  <!-- RESET → PRISTINE -->
  <path d="M550 170 C490 210 240 195 170 168" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr)"/>
  <text x="360" y="210" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">new pristine baseline</text>
  <!-- PRISTINE self-loop (hydrate on mount) -->
  <path d="M105 130 C85 95 60 85 55 110 C50 125 68 135 105 133" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr)"/>
  <text x="35" y="96" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">hydrate()</text>
  <!-- Arrow marker -->
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
</svg>

| Trigger | From state | To state | Side-effect |
|---------|-----------|----------|-------------|
| `update(field, value)` — user input | PRISTINE | DIRTY | adds field to `dirtyFields` |
| `update(field, value)` — same value | DIRTY | DIRTY | field removed from `dirtyFields`; global `isDirty` recomputed |
| `onBlur` or submit attempt | DIRTY | VALIDATING | kicks async validation |
| Validation resolves VALID/INVALID | VALIDATING | DIRTY | errors map updated |
| `reset()` | DIRTY / VALIDATING | RESET → PRISTINE | reverts to `initialValue`, clears errors |
| `hydrate(data)` | any | RESET → PRISTINE | advances both snapshots, new baseline |

---

## Core Implementation

The adapter is framework-agnostic TypeScript. React and Vue consumers wrap it in a hook or a reactive store — see [How to Track Dirty Fields in React Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/how-to-track-dirty-fields-in-react-forms/) and [Implementing Pristine State in Vue 3](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/implementing-pristine-state-in-vue-3/) for those integration layers.

```typescript
export type FieldEqualityFn<V> = (a: V, b: V) => boolean;

export interface DirtyStateAdapter<T extends Record<string, unknown>> {
  readonly initialValue: Readonly<T>;
  readonly currentValue: Readonly<T>;
  readonly isDirty: boolean;
  readonly isPristine: boolean;
  readonly dirtyFields: ReadonlySet<keyof T>;
  /** Route ALL user-driven mutations here. */
  update<K extends keyof T>(field: K, value: T[K]): void;
  /** Route ALL programmatic initializations here — never triggers dirty. */
  hydrate(data: Partial<T>): void;
  /** Revert to the most recent pristine baseline. */
  reset(): void;
  /** Subscribe to any state change; returns an unsubscribe handle. */
  subscribe(cb: (adapter: DirtyStateAdapter<T>) => void): () => void;
}

/**
 * Per-field equality registry lets you swap JSON.stringify for a cheap
 * structural comparison on specific fields without touching others.
 */
export type EqualityRegistry<T> = {
  [K in keyof T]?: FieldEqualityFn<T[K]>;
};

export function createDirtyAdapter<T extends Record<string, unknown>>(
  initial: T,
  registry: EqualityRegistry<T> = {}
): DirtyStateAdapter<T> {
  // Shallow-clone so callers can't mutate our baseline by reference.
  let _initial: T = { ...initial };
  let _current: T = { ...initial };
  const _dirty = new Set<keyof T>();

  // Listeners are held in a plain Set; no WeakMap needed here because
  // the adapter owns the listener lifetime via the returned unsubscribe fn.
  const _listeners = new Set<(a: DirtyStateAdapter<T>) => void>();

  function isFieldEqual<K extends keyof T>(field: K, a: T[K], b: T[K]): boolean {
    const fn = registry[field] as FieldEqualityFn<T[K]> | undefined;
    // Fall back to JSON.stringify for structural equality on complex values.
    // For primitives this is equivalent to strict equality after serialisation.
    return fn ? fn(a, b) : JSON.stringify(a) === JSON.stringify(b);
  }

  function notify(): void {
    _listeners.forEach(cb => cb(adapter));
  }

  const adapter: DirtyStateAdapter<T> = {
    get initialValue() { return _initial as Readonly<T>; },
    get currentValue() { return _current as Readonly<T>; },
    get isDirty() { return _dirty.size > 0; },
    get isPristine() { return _dirty.size === 0; },
    get dirtyFields(): ReadonlySet<keyof T> { return _dirty; },

    update<K extends keyof T>(field: K, value: T[K]) {
      // Guard against typos at dev-time; remove in prod with a build flag.
      if (!(field in _initial)) {
        throw new RangeError(`DirtyAdapter: unknown field "${String(field)}"`);
      }
      _current = { ..._current, [field]: value };

      if (isFieldEqual(field, _initial[field], value)) {
        // Value reverted to initial — field is no longer dirty.
        _dirty.delete(field);
      } else {
        _dirty.add(field);
      }
      notify();
    },

    hydrate(data: Partial<T>) {
      // Both snapshots advance together so the adapter never enters dirty state.
      _initial = { ..._initial, ...data };
      _current = { ..._current, ...data };
      _dirty.clear();
      notify();
    },

    reset() {
      _current = { ..._initial };
      _dirty.clear();
      notify();
    },

    subscribe(cb) {
      _listeners.add(cb);
      // Caller must invoke the returned function to avoid memory leaks,
      // especially critical inside useEffect / onUnmounted lifecycle hooks.
      return () => _listeners.delete(cb);
    }
  };

  return adapter;
}
```

Key design decisions:

- `isDirty` is derived from `_dirty.size`, not a separate boolean. This means reverting a field back to its initial value automatically removes it from the dirty set, keeping the global flag accurate without extra bookkeeping.
- `hydrate()` advances `_initial` and `_current` in lockstep. This makes the hydrated state the new pristine baseline — critical after API saves and async data loads.
- The equality registry lets you supply a fast shallow comparator for known-primitive fields while keeping the safe `JSON.stringify` fallback for complex nested objects.

---

## Event Interception and Value Normalization

Equality checks fail silently on type-coercion mismatches. Normalize values before passing them to `update()`:

```typescript
// Shared normalizers — call these in your onChange handlers before adapter.update()

function normalizeString(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function normalizeNumber(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: unknown): string | null {
  // Always compare ISO 8601 strings to avoid Date object identity mismatches.
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function normalizeMultiSelect(raw: unknown): string[] {
  // Sort + deduplicate before comparison so ["a","b"] === ["b","a"].
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(String))].sort();
}
```

Pass the appropriate normalizer as the `FieldEqualityFn` in the registry, or call it in your `onChange` handler before invoking `adapter.update()`.

---

## Integration Guidance

Dirty and pristine tracking sits between raw DOM events and the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) pipeline. The adapter answers two questions that other subsystems depend on:

1. **Should validation fire?** Suppress async validation while a field is pristine. Only trigger expensive async checks on dirty fields or at submit time.
2. **Should the submit button be enabled?** Gate the button on `isDirty && !isSubmitting` (or on the form-level error map) — never on field count alone.

[Error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) consume the same dirty flags to decide which errors to surface: a field error is shown only after that field has been dirtied (touched) or after a global submit attempt.

[Controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) determines where the source of truth lives, but the dirty-tracking adapter works identically in both modes — it stores its own snapshot independently of React controlled state or an uncontrolled ref.

For [React hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/), the adapter's `subscribe()` method maps cleanly onto a `useEffect` subscription pattern. For Vue, watch the adapter's `isDirty` getter via a shallowRef wrapper.

---

## Edge Cases and Failure Modes

### Autofill bypass

Browser autofill fires `change` events programmatically on page load, before the user has touched anything. If your adapter is already initialized, autofill goes through `update()` and marks fields dirty immediately.

**Resolution:** Debounce the first `update()` call by 100–200 ms after mount. If the first batch of changes arrives within that window and matches the expected autofill pattern (all address or credential fields at once), route them through `hydrate()` instead.

### Stale initial snapshot after async data load

If you initialize the adapter synchronously with empty defaults and then fetch the real data asynchronously, the adapter's `_initial` snapshot is wrong. Every non-empty field from the API response will appear dirty.

**Resolution:** Always call `hydrate()` once the fetch promise resolves. Never call `update()` in a `then()` handler for initial data. If the fetch is slow, render a loading state and delay adapter initialization until data arrives.

### Shadow DOM boundary events

Custom elements that render inside a shadow root may dispatch `change` events with `composed: false`. These events do not cross the shadow boundary, so a top-level event delegation strategy will miss them.

**Resolution:** Attach your event listeners inside the shadow root, or use `composed: true` custom events explicitly dispatched by the element. Web component–based design systems need to document their event composition policy.

### Cross-browser `input` vs `change` event ordering

Safari fires `change` on `<select>` and `<input type="date">` on pointer release, while Chrome fires `input` first. If your adapter listens to both, you may call `update()` twice per user interaction and trigger two notification cycles.

**Resolution:** Listen to `input` for text-like inputs and `change` for `<select>`, checkboxes, and date pickers — never both on the same element. Establish this convention in a single shared `attachFieldListener()` utility.

### Reset race with in-flight async validation

If the user resets the form while an async uniqueness check is in-flight, the validation result arrives after `reset()` has cleared the dirty set and may re-mark a field as having an error.

**Resolution:** Use an `AbortController` tied to the field's dirty state:

```typescript
// AbortController is created per-field per-validation round.
// Aborting on reset ensures stale results never land on a clean form.
let abortController: AbortController | null = null;

function validateAsync(value: string): void {
  if (abortController) {
    abortController.abort(); // cancel any in-flight request for this field
  }
  abortController = new AbortController(); // fresh controller for this round
  const { signal } = abortController;

  fetch(`/api/check?value=${encodeURIComponent(value)}`, { signal })
    .then(r => r.json())
    .then(result => {
      if (!signal.aborted) applyValidationResult(result);
    })
    .catch(err => {
      if (err.name !== "AbortError") handleValidationError(err);
    });
}

// In your reset handler:
function onReset(): void {
  if (abortController) {
    abortController.abort(); // kill in-flight validation before resetting state
    abortController = null;
  }
  adapter.reset();
}
```

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|----------------|----------------|
| Fields appear dirty immediately on mount | Check if `update()` is being called during hydration or by autofill | Audit `onChange` handlers; route initial data through `hydrate()` |
| `isDirty` stays `true` after resetting all fields to initial values | `_dirty.size` is not zero; check if `isFieldEqual` is returning `false` for equal values | Inspect the equality function for the affected field; check for type coercions (`"5"` vs `5`, date objects) |
| Async validation fires on pristine fields | The validation trigger does not check `isDirty` before calling the API | Wrap the async call in `if (adapter.dirtyFields.has(field))` before firing |
| Submit button remains disabled after successful save | `isDirty` is still `true`; `hydrate()` was not called with the server response | Call `adapter.hydrate(serverResponse)` in the success handler to advance the baseline |
| Stale validation error shown after form reset | In-flight `AbortController` was not cancelled on reset | Call `abortController.abort()` before `adapter.reset()` |

---

## Testing and QA Hooks

Attach `data-*` attributes that mirror the adapter's state to the form and individual fields. This gives Playwright and Cypress selectors a stable, semantic surface that does not depend on class names or text content.

```typescript
// Call this whenever the adapter notifies.
// For React: inside a useEffect subscription.
// For Vue: inside a watch on the adapter's reactive wrapper.
function syncDataAttributes(
  formEl: HTMLFormElement,
  adapter: DirtyStateAdapter<Record<string, unknown>>
): void {
  formEl.dataset.dirty = String(adapter.isDirty);
  formEl.dataset.pristine = String(adapter.isPristine);

  for (const field of adapter.dirtyFields) {
    const el = formEl.elements.namedItem(String(field));
    if (el instanceof HTMLElement) {
      el.dataset.dirty = "true";
    }
  }

  // Clear dirty attribute from fields no longer in the dirty set.
  for (const el of Array.from(formEl.elements)) {
    if (el instanceof HTMLElement) {
      const name = (el as HTMLInputElement).name;
      if (name && !adapter.dirtyFields.has(name)) {
        delete el.dataset.dirty;
      }
    }
  }
}
```

Playwright example:

```typescript
// Verify a field is marked dirty after user interaction
await page.fill('[name="email"]', 'user@example.com');
await expect(page.locator('[name="email"]')).toHaveAttribute('data-dirty', 'true');

// Verify form-level dirty flag
await expect(page.locator('form')).toHaveAttribute('data-dirty', 'true');

// Verify pristine after reset
await page.click('[data-testid="reset-button"]');
await expect(page.locator('form')).toHaveAttribute('data-pristine', 'true');
```

For ARIA accessibility regression coverage, ensure your `aria-invalid` and `aria-describedby` attributes are only set on fields that are both dirty and have a validation error — never on pristine fields. Axe-core will flag `aria-invalid="true"` on pristine fields as a false-positive error announcement.

---

## Common Pitfalls

**Using `===` on object or array field values.** Reference equality returns `false` on every render for non-primitive values, making every field permanently dirty. Pass a structural comparator via the equality registry.

**Running `update()` in a `useEffect` or `onMounted` hook for initial data.** This executes after mount and routes through the user-mutation path, immediately dirtying the form. Use `hydrate()` instead, which is explicitly designed for programmatic initialization.

**Debouncing `update()` itself rather than the input handler.** If you delay the adapter call, the `dirtyFields` set lags behind the real input state. Debounce the expensive downstream work (validation, comparison) instead, and call `update()` synchronously on every event.

**Comparing dates or numbers as strings without normalization.** `"2024-01-15T00:00:00.000Z"` does not equal `"2024-01-15"` even though both represent the same day. Normalize to a canonical form before comparison.

**Not calling the `subscribe` unsubscribe handle in cleanup.** In React, failing to return the unsubscribe function from `useEffect` leaks the listener across component re-mounts. In Vue, failing to call it inside `onUnmounted` causes the same leak. The adapter's `_listeners` Set retains a reference to the stale component closure.

---

## Frequently Asked Questions

<details>
<summary><strong>How do I prevent programmatic updates from marking a form dirty?</strong></summary>

Route all programmatic mutations through `hydrate()`. It updates both `_initial` and `_current` snapshots atomically, so the adapter treats the incoming data as the new pristine state and clears all dirty flags. Never call `update()` from a data-fetching callback, a `useEffect` that loads defaults, or an autofill handler.

</details>

<details>
<summary><strong>Should validation run on pristine fields?</strong></summary>

Lightweight synchronous checks (required markers, format hints) are acceptable on pristine fields because they are cheap and set user expectations. Expensive async calls — uniqueness checks, server-side rule evaluation — should be deferred until the field is dirty or the user attempts to submit. Running async validation on pristine fields wastes network budget and typically confuses users who have not yet interacted with the field.

</details>

<details>
<summary><strong>How does deep equality impact performance in large forms?</strong></summary>

`JSON.stringify` equality scales O(n) with object size and is called on every keypress — a measurable problem above roughly 50 fields or when field values are large arrays. Switch to path-based tracking: the `_dirty` Set already tracks which fields changed; only run the per-field equality check for the single field that just received an `update()` call. This keeps each comparison O(1) per event regardless of total form size.

</details>

<details>
<summary><strong>How do I reset dirty state after a successful submission?</strong></summary>

Call `adapter.hydrate(serverResponse)` in the submission success handler, passing the server-confirmed payload. This advances the pristine baseline to the saved values, clears all dirty flags, and prevents the form from showing unsaved-changes warnings after a clean save. Calling `adapter.reset()` alone reverts to the pre-submission snapshot, which is rarely what you want after a successful save.

</details>

---

## Related

- [How to Track Dirty Fields in React Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/how-to-track-dirty-fields-in-react-forms/)
- [Implementing Pristine State in Vue 3](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/implementing-pristine-state-in-vue-3/)
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
