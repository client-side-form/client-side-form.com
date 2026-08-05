---
layout: page.njk
title: "Svelte 5 Runes Migration for Form Stores"
description: "Migrate a writable-store form model to Svelte 5 $state/$derived/$effect runes — with equivalences, deep-proxy gotchas, $effect cleanup, and cross-component sharing via .svelte.ts."
slug: svelte-5-runes-migration-for-form-stores
type: howto
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

This walkthrough assumes you already have a working store-based adapter of the kind described in [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/), and it focuses narrowly on the mechanical and semantic differences you hit during migration. It is not an introduction to runes; it is a field guide for the three bugs that bite when you convert a real form.

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

The migration is mostly mechanical, and holding the equivalences in one picture keeps it that way:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Store to rune equivalences: writable becomes state, derived becomes derived, the dollar prefix becomes a plain read, subscribe becomes an effect, and get becomes a plain read. Each row notes the semantic difference that is not purely syntactic." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Store idiom to rune idiom, with the differences that are not cosmetic</title>
  <desc>A writable store becomes state, and the difference is that state is deeply reactive while a writable is replaced wholesale, so mutating a nested property now notifies where before it did not. A derived store becomes derived, and dependencies are now tracked automatically rather than declared, which removes the wrong-dependency-list failure entirely. The dollar prefix becomes a plain property read, which works in modules as well as components. Subscribe becomes an effect, whose cleanup is returned rather than being a separate unsubscribe you hold. Get becomes a plain read, with the caveat that reading inside an effect creates a dependency where get did not.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stores</text>
  <text x="160" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Runes</text>
  <text x="300" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The difference that is not syntax</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">writable(v)</text>
  <text x="160" y="66" font-size="10" fill="#6b5f75" font-family="inherit">$state(v)</text>
  <text x="300" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">deeply reactive — nested mutation now notifies</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">derived([a,b], fn)</text>
  <text x="160" y="100" font-size="10" fill="#6b5f75" font-family="inherit">$derived(fn)</text>
  <text x="300" y="100" font-size="10" fill="#2d6342" font-family="inherit">deps tracked, not declared — one bug class gone</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">$values in markup</text>
  <text x="160" y="134" font-size="10" fill="#6b5f75" font-family="inherit">values</text>
  <text x="300" y="134" font-size="10" fill="#2d6342" font-family="inherit">works in modules too, not only components</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">store.subscribe(fn)</text>
  <text x="160" y="168" font-size="10" fill="#6b5f75" font-family="inherit">$effect(fn)</text>
  <text x="300" y="168" font-size="10" fill="#7b4f8a" font-family="inherit">cleanup is returned from the effect body</text>
  <line x1="10" y1="182" x2="690" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">get(store)</text>
  <text x="160" y="202" font-size="10" fill="#6b5f75" font-family="inherit">values</text>
  <text x="300" y="202" font-size="10" fill="#a63d6f" font-family="inherit">inside an effect this creates a dependency</text>
</svg>

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

That last row is the one that bites during a migration, because the old code deliberately used `get` to read *without* subscribing:

<svg viewBox="0 8 664 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A validation effect that reads both the values and the baseline. Under stores, get(baseline) read it without subscribing, so the effect ran only when values changed. Under runes, reading baseline inside the effect subscribes to it too, so the effect now also runs whenever the baseline changes, which a syncBaseline call does." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>get() did not subscribe; a plain read does</title>
  <desc>Before: an effect subscribed to values with the dollar prefix and read the baseline with get, which deliberately did not create a subscription, so the effect ran once per value change. After a naive migration: the same effect reads both as plain properties, which subscribes to both, so it now also runs whenever the baseline is replaced — and syncBaseline replaces it after every save, re-running validation for no reason and potentially announcing results the reader did not ask for. The fix is to read the baseline through untrack, which is the rune equivalent of the old get.</desc>
  <rect x="0" y="8" width="664" height="214" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">before — one dependency, on purpose</text>
  <rect x="14" y="36" width="304" height="92" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="58" font-size="10" fill="#6b5f75" font-family="inherit">reads $values → subscribes</text>
  <text x="28" y="80" font-size="10" fill="#6b5f75" font-family="inherit">reads get(baseline) → does not</text>
  <text x="28" y="102" font-size="10" fill="#2d6342" font-family="inherit">runs when values change. Only then.</text>
  <text x="346" y="26" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">after a naive migration — two</text>
  <rect x="346" y="36" width="304" height="92" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="360" y="58" font-size="10" fill="#6b5f75" font-family="inherit">reads values → subscribes</text>
  <text x="360" y="80" font-size="10" fill="#6b5f75" font-family="inherit">reads baseline → also subscribes</text>
  <text x="360" y="102" font-size="10" fill="#a63d6f" font-family="inherit">also runs after every syncBaseline</text>
  <rect x="14" y="144" width="636" height="46" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="164" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">The fix: untrack(() =&gt; baseline) is the rune spelling of the old get()</text>
  <text x="28" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">Read it, do not depend on it — the same intent the original code expressed by choosing get over the $ prefix.</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Symptom to look for: validation re-running, and errors re-announcing, immediately after a successful save.</text>
</svg>

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

## Migrating incrementally rather than in one commit

Runes and stores interoperate, which means the migration does not have to be atomic. Ordering it by dependency direction keeps every intermediate commit shippable.

<svg viewBox="0 8 668 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four migration stages in dependency order: convert leaf derived stores first, then the writable values store, then the components that read them, and finally delete the compatibility bridges. Each stage is independently shippable." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four shippable stages, in dependency order</title>
  <desc>Stage one: convert the leaf derived stores — the dirty map, validity, can-submit — since nothing depends on them except the view, and expose each through a small readable bridge so existing consumers keep working. Stage two: convert the writable values store to state, keeping the same bridge so components are untouched. Stage three: convert the components, replacing the dollar prefix with plain reads and deleting their bridges one by one. Stage four: delete the remaining bridges and the compatibility helpers. Every stage compiles and ships on its own, so the migration can pause indefinitely at any point.</desc>
  <rect x="0" y="8" width="668" height="210" fill="#f9f5fb"/>
  <rect x="14" y="34" width="150" height="80" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="89" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · leaf deriveds</text>
  <text x="89" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">dirty, validity,</text>
  <text x="89" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">canSubmit</text>
  <text x="89" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">bridge kept</text>
  <path d="M164,74 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="34" width="150" height="80" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · the values store</text>
  <text x="261" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">writable becomes</text>
  <text x="261" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">$state</text>
  <text x="261" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">components untouched</text>
  <path d="M336,74 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="34" width="150" height="80" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="433" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · the components</text>
  <text x="433" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">$ prefix becomes</text>
  <text x="433" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a plain read</text>
  <text x="433" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">one file at a time</text>
  <path d="M508,74 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="34" width="118" height="80" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="589" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">4 · bridges</text>
  <text x="589" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">delete them and</text>
  <text x="589" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the helpers</text>
  <text x="589" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">migration done</text>
  <text x="14" y="150" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why leaves first</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">A derived store has no dependants except the view, so converting one cannot break anything upstream. Converting the</text>
  <text x="14" y="184" font-size="10" fill="#6b5f75" font-family="inherit">values store first would change what every derived reads, and the migration stops being reviewable in small pieces.</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Each stage compiles and ships on its own, so the work can pause indefinitely without leaving a half-migrated form.</text>
</svg>

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

- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Handling Svelte Form Hydration Mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/)
- [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/)

← [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
