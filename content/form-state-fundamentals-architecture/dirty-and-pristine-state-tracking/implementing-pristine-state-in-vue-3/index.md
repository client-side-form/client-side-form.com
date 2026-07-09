---
layout: page.njk
title: "Implementing Pristine State in Vue 3"
description: "A production-focused guide to tracking untouched form fields in Vue 3 using the Composition API: immutable baselines, computed comparisons, async hydration, and per-field granularity."
slug: implementing-pristine-state-in-vue-3
type: guide
breadcrumb: "Implementing Pristine State in Vue 3"
datePublished: "2024-11-10"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Implementing Pristine State in Vue 3"
  parent: "Dirty and Pristine State Tracking"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Implementing Pristine State in Vue 3",
      "description": "A production-focused guide to tracking untouched form fields in Vue 3 using the Composition API: immutable baselines, computed comparisons, async hydration, and per-field granularity.",
      "datePublished": "2024-11-10",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Dirty and Pristine State Tracking", "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/" },
        { "@type": "ListItem", "position": 4, "name": "Implementing Pristine State in Vue 3", "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/implementing-pristine-state-in-vue-3/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement pristine state tracking in Vue 3",
      "step": [
        { "@type": "HowToStep", "name": "Clone the initial value into a plain ref as the baseline" },
        { "@type": "HowToStep", "name": "Store current form data in a separate cloned ref" },
        { "@type": "HowToStep", "name": "Use a computed property with deep equality to derive isPristine" },
        { "@type": "HowToStep", "name": "Call updateBaseline after async hydration or successful submission" },
        { "@type": "HowToStep", "name": "Expose per-field pristine flags via individual computed properties" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Vue 3 reactivity affect pristine state tracking?",
          "acceptedAnswer": { "@type": "Answer", "text": "Vue wraps objects in Proxy automatically. Comparing a reactive proxy to a plain object with === always returns false. Use structuredClone for snapshots and a deep-equality function for comparison so you work on underlying values, not proxy wrappers." }
        },
        {
          "@type": "Question",
          "name": "Should pristine state be tracked per field or globally?",
          "acceptedAnswer": { "@type": "Answer", "text": "Both. Global isPristine gates form-level actions like save-button state and submit gating. Field-level computed flags let you trigger inline validation only after a specific field changes, avoiding premature error messaging." }
        },
        {
          "@type": "Question",
          "name": "How do async form loads affect pristine evaluation?",
          "acceptedAnswer": { "@type": "Answer", "text": "If you update only current after an async fetch, the form immediately reads as dirty. Call updateBaseline(data) to replace both the baseline and current simultaneously, so the form starts pristine once the server data lands." }
        },
        {
          "@type": "Question",
          "name": "When should I use watch instead of computed for pristine evaluation?",
          "acceptedAnswer": { "@type": "Answer", "text": "Almost never for pristine. Computed properties cache their result and only re-run when tracked dependencies change. A deep watcher fires on every mutation cycle regardless of whether the value actually changed, wasting CPU on rapid keystrokes." }
        }
      ]
    }
  ]
}
</script>

# Implementing Pristine State in Vue 3

**Exact problem:** Vue 3's reactive proxy system silently breaks reference equality, making naive pristine checks return `false` even for identical data — this page shows a composable that survives proxy wrapping, async hydration, and per-field granularity.

## Context and Prerequisites

This page builds on [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — read that first if you need the conceptual model. The composable below is Vue 3-specific; for a React equivalent see [how to track dirty fields in React forms](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/how-to-track-dirty-fields-in-react-forms/).

The core challenge is that Vue wraps every `reactive()` object in a `Proxy`. A comparison like `baseline === current` will always return `false` even when both contain identical data, because you're comparing two different proxy objects, not their underlying values. The solution is to keep the baseline as a plain-value clone and compare with deep equality.

<svg viewBox="0 0 720 260" role="img" aria-label="Pristine state lifecycle in Vue 3" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:720px;display:block;margin:2rem auto;" >
  <title>Pristine state lifecycle in Vue 3</title>
  <desc>Shows the flow from initial value through structuredClone into baseline ref and current ref, then computed isPristine derived from deep equality. updateBaseline replaces both refs atomically on async hydration or successful submit.</desc>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
  <!-- Initial value box -->
  <rect x="20" y="90" width="140" height="48" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="90" y="109" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.9" font-family="monospace">initialValue</text>
  <text x="90" y="127" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">(plain object)</text>
  <!-- structuredClone label on arrow to baseline -->
  <line x1="162" y1="104" x2="240" y2="80" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="158" y="66" font-size="10" fill="currentColor" opacity="0.7" font-family="monospace">structuredClone</text>
  <!-- structuredClone label on arrow to current -->
  <line x1="162" y1="116" x2="240" y2="140" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="158" y="176" font-size="10" fill="currentColor" opacity="0.7" font-family="monospace">structuredClone</text>
  <!-- baseline ref box -->
  <rect x="242" y="52" width="140" height="48" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
  <text x="312" y="71" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.9" font-family="monospace">baseline</text>
  <text x="312" y="89" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">shallowRef (plain)</text>
  <!-- current ref box -->
  <rect x="242" y="118" width="140" height="48" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/>
  <text x="312" y="137" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.9" font-family="monospace">current</text>
  <text x="312" y="155" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">ref (v-model target)</text>
  <!-- arrows into computed -->
  <line x1="384" y1="76" x2="462" y2="110" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="384" y1="142" x2="462" y2="118" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- computed box -->
  <rect x="464" y="90" width="160" height="48" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.55" stroke-width="2"/>
  <text x="544" y="109" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.95" font-family="monospace">isPristine</text>
  <text x="544" y="127" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">computed (isEqual)</text>
  <!-- updateBaseline annotation -->
  <rect x="242" y="210" width="140" height="36" rx="5" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="312" y="227" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">updateBaseline()</text>
  <text x="312" y="241" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55">replaces both atomically</text>
  <line x1="312" y1="210" x2="312" y2="168" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <line x1="280" y1="210" x2="280" y2="102" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <!-- legend labels -->
  <text x="20" y="250" font-size="10" fill="currentColor" opacity="0.5">solid = data flow  |  dashed = atomic reset path</text>
</svg>

## Core Composable

The composable below is the single implementation to ship. Every line that touches Vue's reactivity or cloning has an inline comment explaining the non-obvious behaviour.

```typescript
import { ref, computed, type Ref, type ComputedRef } from 'vue';
import isEqual from 'lodash-es/isEqual';

// lodash-es/isEqual handles Date, RegExp, nested arrays, and NaN correctly.
// JSON.stringify is faster but silently drops undefined values and fails on Date.

export interface FieldPristineMap {
  [fieldName: string]: ComputedRef<boolean>;
}

export interface PristineStateReturn<T extends Record<string, unknown>> {
  current: Ref<T>;
  isPristine: ComputedRef<boolean>;
  fieldIsPristine: FieldPristineMap;
  reset: () => void;
  updateBaseline: (newData: T) => void;
}

export function usePristineState<T extends Record<string, unknown>>(
  initialValue: T
): PristineStateReturn<T> {
  // structuredClone produces a deep plain-object copy, breaking any reactive proxy
  // references that Vue may have already attached to initialValue's tree.
  const baseline = ref<T>(structuredClone(initialValue)) as Ref<T>;

  // current is the v-model target — Vue will proxy it, but baseline stays plain.
  const current = ref<T>(structuredClone(initialValue)) as Ref<T>;

  // computed caches the result; re-evaluates only when baseline or current changes.
  // Do NOT use a deep watcher here — it fires on every mutation tick, not just changes.
  const isPristine = computed<boolean>(() =>
    isEqual(baseline.value, current.value)
  );

  // Per-field computed flags: only re-evaluate when that field's value changes.
  // Accessing baseline.value[key] and current.value[key] inside computed() is enough
  // to register the dependency — Vue tracks property accesses during evaluation.
  const fieldIsPristine = Object.fromEntries(
    Object.keys(initialValue).map((key) => [
      key,
      computed<boolean>(() =>
        isEqual(
          (baseline.value as Record<string, unknown>)[key],
          (current.value as Record<string, unknown>)[key]
        )
      ),
    ])
  ) as FieldPristineMap;

  const reset = (): void => {
    // Cast required: structuredClone returns a deep copy typed as T.
    current.value = structuredClone(baseline.value) as T;
  };

  // Call this after async hydration or after a successful submission response.
  // Updating both refs in the same synchronous block avoids a transient dirty flash.
  const updateBaseline = (newData: T): void => {
    baseline.value = structuredClone(newData);
    current.value = structuredClone(newData);
  };

  return { current, isPristine, fieldIsPristine, reset, updateBaseline };
}
```

## Step-by-Step Walkthrough

**Step 1 — Clone before storing.** `structuredClone(initialValue)` creates a deep plain copy with no proxy wrapping. Both `baseline` and `current` start as structurally identical plain values. If you skip this and store `initialValue` directly into `baseline`, any mutation of `current` will also mutate `baseline` when nested objects share references.

**Step 2 — Keep baseline as a `ref`, not `reactive`.** Wrapping in `reactive()` would make Vue proxy `baseline`, causing `isEqual(baseline.value, current.value)` to compare two proxies. `ref()` stores the plain clone under `.value` without proxying the value's own internals (only the `.value` accessor is reactive).

**Step 3 — Derive `isPristine` as a `computed`.** The `computed` reads `baseline.value` and `current.value`, so Vue registers both as reactive dependencies. When either changes, the computed invalidates and `isEqual` re-runs on the next read. No watchers, no manual bookkeeping.

**Step 4 — Per-field flags via `Object.fromEntries`.** The loop creates one `computed` per key in `initialValue`. Each one closes over `key` and compares only that field, so updating `email` does not trigger re-evaluation of the `displayName` flag.

**Step 5 — Wire into the component with `v-model`.** Bind `v-model` to `current.value` field properties. Use `updateBaseline` in the `onMounted` lifecycle hook once async data resolves, and call it again after a successful API response to make the saved state the new baseline.

### Component Integration

```html
<script setup lang="ts">
import { onMounted } from 'vue';
import { usePristineState } from '@/composables/usePristineState';

interface UserForm {
  email: string;
  displayName: string;
  bio: string;
}

const { current, isPristine, fieldIsPristine, reset, updateBaseline } =
  usePristineState<UserForm>({ email: '', displayName: '', bio: '' });

onMounted(async () => {
  // Server data becomes the baseline — form starts pristine after hydration.
  const data = await fetchUserProfile();
  updateBaseline(data);
});

async function handleSubmit() {
  await saveUserProfile(current.value);
  // After a successful save, the saved state is the new pristine baseline.
  updateBaseline(current.value);
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <label for="email">Email</label>
    <input
      id="email"
      v-model="current.email"
      type="email"
      :aria-invalid="!fieldIsPristine.email && !isValidEmail(current.email)"
      aria-describedby="email-error"
    />
    <!-- aria-invalid reflects validation state, not pristine state -->
    <span id="email-error" role="alert" v-if="!fieldIsPristine.email && !isValidEmail(current.email)">
      Enter a valid email address.
    </span>

    <label for="displayName">Display Name</label>
    <input
      id="displayName"
      v-model="current.displayName"
      type="text"
    />

    <label for="bio">Bio</label>
    <textarea id="bio" v-model="current.bio" />

    <button type="submit" :disabled="isPristine">Save Changes</button>
    <button type="button" @click="reset">Discard Changes</button>
  </form>
</template>
```

`aria-invalid` is wired to validation state, not `isPristine`. A pristine field has not been touched yet — marking it `aria-invalid` before the user types anything would violate WCAG 2.1 success criterion 3.3.1 (Error Identification), which requires errors to be identified only after input is received.

## Failure Modes and Edge Cases

**Autofill bypass.** Browser autofill can populate inputs without triggering Vue's `input` or `change` events, meaning `current` stays at its initial empty values while the DOM shows populated fields. Use a `MutationObserver` on the form element, or listen to the `animationstart` CSS trick (autofill triggers a pseudo-class animation), to detect autofill and sync `current` manually.

**Date objects losing type fidelity.** `JSON.stringify/parse` converts `Date` to a string, so `isEqual(new Date('2024-01-01'), '2024-01-01')` returns `false`. `structuredClone` preserves `Date` as `Date` and `lodash-es/isEqual` compares by `getTime()`. If your form data contains `Date` fields, stick with this stack — do not mix in `JSON.stringify` comparisons.

**Stale baseline after optimistic updates.** If you apply an optimistic UI update to `current` before the server confirms, and then the server rejects the request, calling `reset()` restores the pre-submission state — which is correct. Do not call `updateBaseline` until the server response confirms success; otherwise a failed save permanently shifts the baseline.

**`watchEffect` triggering during SSR.** On Nuxt 3, `watchEffect` runs on the server. A `watchEffect` that reads `current` and performs pristine logic will execute in SSR context where the DOM does not exist. Use `computed` (which is SSR-safe and lazy) rather than `watchEffect` for pristine derivation. If you need side effects on pristine state change, use `watch` with `{ flush: 'post' }` and guard with `if (import.meta.client)`. See [handling Svelte form hydration mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/) for a parallel problem in another framework.

**Proxy comparison in third-party equality libraries.** Some older deep-equal implementations inspect the object's `constructor` property. Vue's `Proxy` objects report their target's constructor, so this usually works — but if you switch to a library that uses `Object.is` internally for object identity, all comparisons will return `false`. Always test your equality function against `reactive({})` vs `{}` before shipping.

## Verification Checklist

- `isPristine` is `true` immediately after `updateBaseline(serverData)` returns
- `isPristine` becomes `false` after typing in any bound input
- `reset()` restores `isPristine` to `true`
- `updateBaseline(current.value)` after a successful save keeps `isPristine` as `true`
- Each `fieldIsPristine[key]` reflects only that field's change status
- `aria-invalid` is bound to validation error state, not to `!isPristine`
- The Save button is disabled when `isPristine` is `true`
- Autofill on email and password inputs updates `current` and clears `isPristine`
- No deep watchers remain — confirm in Vue DevTools by filtering timeline for unexpected ref mutations
- SSR build (if applicable) does not throw during `usePristineState` initialisation

## FAQ

<details>
<summary><strong>How does Vue 3 reactivity affect pristine state tracking?</strong></summary>

Vue wraps objects in `Proxy` automatically. Comparing a reactive proxy to a plain object with `===` always returns `false`, even when both contain identical data. Always use `structuredClone` for snapshots and `isEqual` (or equivalent) for comparison — you are working on the underlying values, not the proxy wrappers.

</details>

<details>
<summary><strong>Should pristine state be tracked per field or globally?</strong></summary>

Both, for different purposes. Global `isPristine` controls form-level actions: disabling the Save button, showing a "you have unsaved changes" banner, or gating navigation away from the page. Field-level computed flags let you defer validation messages until a specific field has been touched, avoiding an error-heavy UI on first render.

</details>

<details>
<summary><strong>How do async form loads affect pristine evaluation?</strong></summary>

If you update only `current` after a fetch, the form immediately reads as dirty because `baseline` still holds the empty initial values. Call `updateBaseline(fetchedData)` to replace both refs atomically in the same synchronous call. The form will then read as pristine as soon as the hydration promise resolves.

</details>

<details>
<summary><strong>When should I use <code>watch</code> instead of <code>computed</code> for pristine evaluation?</strong></summary>

Almost never for the `isPristine` flag itself. `computed` caches the result and only re-evaluates when tracked dependencies actually change. A `deep` watcher fires on every mutation cycle regardless of whether the evaluated value changed, which wastes CPU during rapid keystrokes on large form payloads. Reserve `watch` for side effects — for example, persisting a draft to `localStorage` when the form becomes dirty — and even then use debouncing.

</details>

---

## Related

- [How to Track Dirty Fields in React Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/how-to-track-dirty-fields-in-react-forms/) — same baseline-snapshot pattern in a React reducer
- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) — how to wire this composable into a broader form adapter layer
- [Syncing Vue Form State with Pinia](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/syncing-vue-form-state-with-pinia/) — moving baseline and current into a Pinia store for cross-component pristine tracking
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — when pristine state integrates with validation triggers (on-blur vs on-change vs on-submit)

← [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
