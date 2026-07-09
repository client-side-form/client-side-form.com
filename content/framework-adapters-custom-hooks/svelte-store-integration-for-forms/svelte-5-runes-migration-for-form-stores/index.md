---
layout: page.njk
title: "Svelte 5 Runes Migration for Form Stores"
description: "Migrate a writable-store form model to Svelte 5 $state/$derived/$effect runes — with equivalences, deep-proxy gotchas, $effect cleanup, and cross-component sharing via .svelte.ts."
slug: svelte-5-runes-migration-for-form-stores
type: long_tail
breadcrumb: "Svelte 5 Runes Migration"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Svelte 5 Runes Migration for Form Stores"
  parent: "Svelte Store Integration for Forms"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Svelte 5 Runes Migration for Form Stores",
      "description": "Migrate a writable-store form model to Svelte 5 $state/$derived/$effect runes — with equivalences, deep-proxy gotchas, $effect cleanup, and cross-component sharing via .svelte.ts.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Svelte Store Integration for Forms", "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/" },
        { "@type": "ListItem", "position": 4, "name": "Svelte 5 Runes Migration for Form Stores", "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/svelte-5-runes-migration-for-form-stores/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Migrate a Svelte writable form store to runes",
      "step": [
        { "@type": "HowToStep", "name": "Replace the writable() values object with a single $state rune holding the form model" },
        { "@type": "HowToStep", "name": "Convert every derived() store (isDirty, errors) into a $derived expression" },
        { "@type": "HowToStep", "name": "Move the reactive .set/.update code into a .svelte.ts module and export getters" },
        { "@type": "HowToStep", "name": "Replace store subscriptions and lifecycle side-effects with $effect and its cleanup return" },
        { "@type": "HowToStep", "name": "Delete the $store auto-subscription syntax and reference the reactive fields directly" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I have to migrate every writable store to runes at once?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Runes and the classic store contract interoperate. A $state object can be wrapped to satisfy the store contract, and an existing writable store is still readable with the $store syntax inside a .svelte file. Migrate the form model first, keep leaf stores until you have time, and avoid mixing both as the source of truth for the same field." }
        },
        {
          "@type": "Question",
          "name": "Why does mutating a nested field not trigger my $derived?",
          "acceptedAnswer": { "@type": "Answer", "text": "$state proxies objects and arrays deeply, but only values reachable from the rune at read time are tracked. If you replaced the whole object with a plain (non-proxied) snapshot — for example an object returned by structuredClone or JSON.parse — later mutations bypass the proxy. Assign new data back into the existing $state fields, or reassign the $state variable itself, so the proxy stays in the reactivity graph." }
        },
        {
          "@type": "Question",
          "name": "How do I share a runes-based form store across components?",
          "acceptedAnswer": { "@type": "Answer", "text": "Put the $state and $derived in a .svelte.ts (or .svelte.js) module and export functions or getter objects — not the raw variable. Exporting a reassignable let breaks reactivity across the module boundary because importers capture the value, not the binding. Return an object with getters, or expose setter functions that mutate the module-scoped $state." }
        },
        {
          "@type": "Question",
          "name": "Does $effect replace onDestroy for cleanup?",
          "acceptedAnswer": { "@type": "Answer", "text": "For reactive side-effects, yes. The function you return from $effect runs before the effect re-runs and once more when the component unmounts, so it covers both dependency-change teardown and final cleanup. Keep onDestroy only for cleanup that is unrelated to reactive dependencies, such as tearing down a manually created third-party widget." }
        }
      ]
    }
  ]
}
</script>

# Svelte 5 Runes Migration for Form Stores

You have a form model built on `writable()` and `derived()` stores, and moving to Svelte 5 means translating that store graph into `$state`, `$derived`, and `$effect` without silently losing reactivity on nested field mutations or leaking subscriptions.

This walkthrough assumes you already have a working store-based adapter of the kind described in [Svelte store integration for forms](/framework-adapters-custom-hooks/svelte-store-integration-for-forms/), and it focuses narrowly on the mechanical and semantic differences you hit during migration. It is not an introduction to runes; it is a field guide for the three bugs that bite when you convert a real form.

---

## Context and prerequisites

The classic pattern is a `writable` holding the values object, one or more `derived` stores for `isDirty` and `errors`, and component code that reads them through the `$store` auto-subscription. Runes change the ownership model: reactivity is now a property of a variable declared with `$state`, not of a store object you pass around. That single shift is the source of every migration gotcha below, so keep it in mind — you are converting *transferable subscribable objects* into *reactive variables scoped to a module or component*.

If your form store also drives validation, review how the validation lifecycle expects to be triggered before you rewire the effects, because the flush timing of `$effect` differs from a store subscription callback.

---

## The equivalence map, as one focused module

Here is a complete before/after of a form store expressed as a shareable `.svelte.ts` module. Read it top to bottom — the inline comments call out every non-obvious line.

```typescript
// form-store.svelte.ts
// The .svelte.ts extension is REQUIRED: runes are only compiled in
// .svelte, .svelte.ts, and .svelte.js files. A plain .ts file will
// throw "$state is not defined" at build time.

export interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export function createLoginForm(initial: LoginForm) {
  // BEFORE: const values = writable({ ...initial });
  // AFTER: $state deeply proxies this object. Every property read inside a
  // $derived or $effect (or template) is tracked; every assignment notifies.
  let values = $state<LoginForm>({ ...initial });

  // The pristine baseline is intentionally NOT a rune. It is a plain snapshot
  // we compare against; making it reactive would create a self-referential
  // dependency inside the isDirty derivation below.
  let baseline: LoginForm = { ...initial };

  // BEFORE: const isDirty = derived(values, $v => !shallowEqual($v, baseline));
  // AFTER: $derived re-computes lazily whenever any tracked property of
  // `values` that it reads changes. No manual subscription, no store object.
  const isDirty = $derived(
    values.email !== baseline.email ||
    values.password !== baseline.password ||
    values.remember !== baseline.remember
  );

  // $derived.by is the multi-statement form — use it when the computation
  // needs locals or branching rather than a single expression.
  const errors = $derived.by(() => {
    const e: Partial<Record<keyof LoginForm, string>> = {};
    if (!values.email.includes("@")) e.email = "Enter a valid email";
    if (values.password.length < 8) e.password = "Min 8 characters";
    return e;
  });

  const isValid = $derived(Object.keys(errors).length === 0);

  // Setter functions are the public write surface. Exporting these — rather
  // than the raw `values` binding — is what keeps reactivity intact across
  // module boundaries (see the cross-component section below).
  function update<K extends keyof LoginForm>(key: K, value: LoginForm[K]) {
    // Mutating a property of the proxied object keeps the proxy in the graph.
    // Do NOT do `values = structuredClone(values)` with a plain object — that
    // swaps in an unproxied value and freezes reactivity.
    values[key] = value;
  }

  function hydrate(data: Partial<LoginForm>) {
    // Advance both the live model and the baseline so isDirty stays false.
    Object.assign(values, data);
    baseline = { ...$state.snapshot(values) };
    // $state.snapshot returns a plain, non-proxied deep copy — the correct
    // way to read a rune's value for storage, structured-clone, or an API body.
  }

  function reset() {
    Object.assign(values, baseline);
  }

  // Return an object of GETTERS. A getter re-reads the reactive source on each
  // access, so importers always see current values. Returning `{ values }`
  // instead would capture a one-time snapshot and break downstream reactivity.
  return {
    get values() { return values; },
    get isDirty() { return isDirty; },
    get errors() { return errors; },
    get isValid() { return isValid; },
    update,
    hydrate,
    reset,
  };
}
```

---

## Step-by-step walkthrough

1. **Replace the values `writable` with a single `$state` object.** Move the initial object into `$state<T>({ ...initial })`. Keep the spread so the caller's object is not aliased into the proxy.

2. **Convert each `derived` store into `$derived` (single expression) or `$derived.by` (block).** Drop the explicit dependency argument — runes track reads automatically. Anything you read inside the expression becomes a dependency; anything you do not read is not tracked, which is exactly why the `baseline` snapshot must be read for `isDirty` to update.

3. **Move the whole thing into a `.svelte.ts` module** and export getters plus setter functions. This is where cross-component sharing lives; do it now rather than retrofitting later.

4. **Replace `store.subscribe(...)` side-effects with `$effect`.** Any code that previously ran inside a subscription callback — syncing to `localStorage`, firing analytics, pushing to a validation queue — moves into `$effect`, and its teardown moves into the returned cleanup function.

5. **Delete the `$store` auto-subscription syntax in components.** Where a `.svelte` file wrote `{$errors.email}`, it now writes `{form.errors.email}` against the object returned by `createLoginForm`. There is no leading `$`; the getter is already reactive.

---

## Failure modes and fixes

### 1. Nested mutation on a detached snapshot loses reactivity

The single most common migration bug. You read the model out for an API call, clone it, and later assign the clone back:

```typescript
// BROKEN: JSON round-trip produces a plain object; assigning it replaces
// the proxy with an inert value, so subsequent field edits stop updating $derived.
values = JSON.parse(JSON.stringify(await res.json()));
```

Fix by mutating the existing proxy instead of overwriting it, or by reassigning through a path that keeps `$state` semantics:

```typescript
// CORRECT: Object.assign mutates the existing proxied object in place.
Object.assign(values, await res.json());
```

### 2. Exporting a `let` from `.svelte.ts` breaks reactivity for importers

```typescript
// BROKEN: importers capture the value at import time, not the live binding.
export let isDirty = $derived(/* ... */);
```

An imported `let` is a snapshot; reassignment inside the module is invisible to the importer. Always export a getter or a function:

```typescript
// CORRECT: the getter re-reads the reactive source on every access.
export const form = { get isDirty() { return isDirty; } };
```

### 3. `$effect` fires more often than the old subscription

A `writable` subscription fired once per `.set()`. `$effect` re-runs whenever *any* tracked read changes, batched per microtask. If you touch `values.email` and `values.password` in the same tick, the effect runs once — but if your effect reads the whole `values` object, editing any field re-runs it. Scope the reads:

```typescript
$effect(() => {
  // Reading only `values.email` narrows the dependency to that one field.
  localStorage.setItem("draft-email", values.email);
});
```

### 4. Missing `$effect` cleanup leaks timers and listeners

Subscriptions returned an unsubscribe function; runes use a returned cleanup callback with identical intent.

```typescript
$effect(() => {
  const id = setInterval(() => autosave($state.snapshot(values)), 5000);
  // The returned function runs before each re-run AND on component destroy.
  // Omitting it leaks one interval per effect re-run — a classic runaway.
  return () => clearInterval(id);
});
```

### 5. `$state.snapshot` forgotten when serializing

Passing a proxied `$state` object directly to `structuredClone`, `postMessage`, or some third-party libraries throws `DataCloneError` or silently serializes proxy internals. Always unwrap with `$state.snapshot(values)` before crossing a boundary that expects a plain object, exactly as the `hydrate` and autosave code above does.

---

## Verification checklist

- [ ] Editing every field (including nested objects and array items) updates isDirty and errors.
- [ ] hydrate() advances the baseline so a freshly loaded form reports isDirty === false.
- [ ] The store lives in a .svelte.ts module and exposes getters, not raw let bindings.
- [ ] Two components importing the same form instance see each other's edits.
- [ ] Every $effect that creates a timer, listener, or subscription returns a cleanup function.
- [ ] $state.snapshot() is used everywhere the model crosses a serialization boundary.
- [ ] No $store auto-subscription syntax remains for the migrated model.
- [ ] Keyboard-only interaction still moves focus and announces errors identically to the pre-migration form (no regression in the accessibility layer).
- [ ] Build passes with no "rune outside .svelte" or "cannot export reassignable binding" warnings.

---

## Frequently Asked Questions

<details>
<summary><strong>Do I have to migrate every writable store to runes at once?</strong></summary>

No. Runes and the classic store contract interoperate. A `$state` object can be wrapped to satisfy the store contract, and an existing `writable` store is still readable with the `$store` syntax inside a `.svelte` file. Migrate the form model first, keep leaf stores until you have time, and avoid mixing both as the source of truth for the same field.

</details>

<details>
<summary><strong>Why does mutating a nested field not trigger my $derived?</strong></summary>

`$state` proxies objects and arrays deeply, but only values reachable from the rune at read time are tracked. If you replaced the whole object with a plain (non-proxied) snapshot — for example an object returned by `structuredClone` or `JSON.parse` — later mutations bypass the proxy. Assign new data back into the existing `$state` fields, or reassign the `$state` variable itself, so the proxy stays in the reactivity graph.

</details>

<details>
<summary><strong>How do I share a runes-based form store across components?</strong></summary>

Put the `$state` and `$derived` in a `.svelte.ts` (or `.svelte.js`) module and export functions or getter objects — not the raw variable. Exporting a reassignable `let` breaks reactivity across the module boundary because importers capture the value, not the binding. Return an object with getters, or expose setter functions that mutate the module-scoped `$state`.

</details>

<details>
<summary><strong>Does $effect replace onDestroy for cleanup?</strong></summary>

For reactive side-effects, yes. The function you return from `$effect` runs before the effect re-runs and once more when the component unmounts, so it covers both dependency-change teardown and final cleanup. Keep `onDestroy` only for cleanup that is unrelated to reactive dependencies, such as tearing down a manually created third-party widget.

</details>

---

## Related

- [Svelte Store Integration for Forms](/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Handling Svelte Form Hydration Mismatches](/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/)
- [Framework Adapters & Custom Hooks](/framework-adapters-custom-hooks/)

← [Svelte Store Integration for Forms](/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
