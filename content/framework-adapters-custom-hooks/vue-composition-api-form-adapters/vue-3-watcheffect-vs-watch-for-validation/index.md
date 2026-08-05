---
layout: page.njk
title: "Vue 3 watchEffect vs watch for Validation Triggers"
description: "When to use watch vs watchEffect to fire form validation in Vue 3 — explicit deps and old/new values vs auto-tracking, flush timing (post/pre/sync), stopping watchers, and avoiding double-fire."
slug: vue-3-watcheffect-vs-watch-for-validation
type: howto
breadcrumb: "watchEffect vs watch"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Vue 3 watchEffect vs watch for Validation Triggers"
  parent: "Vue Composition API Form Adapters"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Vue 3 watchEffect vs watch for Validation Triggers",
      "description": "When to use watch vs watchEffect to fire form validation in Vue 3 — explicit deps and old/new values vs auto-tracking, flush timing (post/pre/sync), stopping watchers, and avoiding double-fire.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Vue Composition API Form Adapters", "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/" },
        { "@type": "ListItem", "position": 4, "name": "Vue 3 watchEffect vs watch for Validation Triggers", "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/vue-3-watcheffect-vs-watch-for-validation/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Choose between watch and watchEffect for validation triggers",
      "step": [
        { "@type": "HowToStep", "name": "List the exact reactive sources that should re-run validation for the field" },
        { "@type": "HowToStep", "name": "Use watch with an explicit source when you need old/new values or lazy (no eager) firing" },
        { "@type": "HowToStep", "name": "Use watchEffect only when every dependency is read synchronously and eager firing is acceptable" },
        { "@type": "HowToStep", "name": "Pick a flush mode: pre for logic, post for DOM/ARIA reads, sync only for rare immediate needs" },
        { "@type": "HowToStep", "name": "Capture the stop handle and call it on unmount, or scope the watcher to setup for automatic teardown" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use watch or watchEffect to trigger field validation?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use watch for validation. You almost always need the new value (and often the old value to short-circuit no-op changes), you usually want it lazy so it does not fire on initial render before the user has touched the field, and an explicit source list prevents accidental dependencies on unrelated reactive state. watchEffect fits derived read-only side-effects, not gated validation." }
        },
        {
          "@type": "Question",
          "name": "Why does my watchEffect fire twice per keystroke?",
          "acceptedAnswer": { "@type": "Answer", "text": "watchEffect re-runs whenever ANY reactive value it read on the previous run changes. If your callback reads both the field value and an errors object that it also writes to, you create a feedback loop, or you track more sources than intended. Switch to watch with an explicit source, or narrow the reads so the effect only depends on the single field value." }
        },
        {
          "@type": "Question",
          "name": "What flush timing should validation use?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use the default flush: 'pre' for computing errors, because it runs before the component re-renders so the DOM updates once with the new error state. Use flush: 'post' only when the validation logic must read the already-updated DOM, such as measuring a rendered field or moving focus. Reserve flush: 'sync' for cases needing the reaction before any batching, which is rare and can cause redundant runs." }
        },
        {
          "@type": "Question",
          "name": "Do I need to stop watchers manually?",
          "acceptedAnswer": { "@type": "Answer", "text": "Watchers created synchronously inside setup or <script setup> are bound to the component instance and stop automatically on unmount. You must call the returned stop handle yourself only when you create a watcher asynchronously (inside a promise, timeout, or event callback) or when you want to stop watching before unmount, such as after a one-shot async validation resolves." }
        }
      ]
    }
  ]
}
</script>

# Vue 3 watchEffect vs watch for Validation Triggers

Choosing `watch` or `watchEffect` to fire form validation in Vue 3 decides whether your errors update once per real change or fire spuriously on mount and re-run on every unrelated state mutation.

This page assumes you are building on the composition-API adapter described in [Vue composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/), and it drills into the one decision that trips up production forms: which watcher primitive drives validation, with what flush timing, and how to keep it from double-firing. If your validation is asynchronous, pair this with the cancellation patterns in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/).

---

## Context and prerequisites

Both primitives observe reactive state and run a callback, but they differ on three axes that matter for validation: **dependency source** (explicit list vs auto-tracked reads), **initial run** (`watch` is lazy by default, `watchEffect` is eager), and **access to the previous value** (`watch` gives you `(newVal, oldVal)`, `watchEffect` gives you neither). Validation almost always wants explicit deps, lazy firing, and the old value — which is why `watch` is the default answer and `watchEffect` is the exception. The rest of this page justifies that and shows the exceptions.

---

## The decision, as one focused adapter

```typescript
import { reactive, ref, watch, watchEffect, onWatcherCleanup } from "vue";

interface SignupForm {
  email: string;
  username: string;
}

export function useValidation(form: SignupForm & Record<string, unknown>) {
  const errors = reactive<Partial<Record<keyof SignupForm, string>>>({});

  // --- CASE 1: watch — the correct default for validation ---------------
  // Explicit source (a getter returning the field). The callback is LAZY:
  // it does NOT run on mount, so a pristine field shows no premature error.
  const stopEmail = watch(
    () => form.email,
    (value, previous) => {
      // The old value lets us short-circuit no-op notifications (e.g. an
      // IME composition event that re-sets the same string).
      if (value === previous) return;
      errors.email = value.includes("@") ? "" : "Enter a valid email";
    },
    // flush: 'pre' (the default) runs before re-render, so the DOM paints
    // the new error in a single pass. See the flush section below.
    { flush: "pre" }
  );

  // --- CASE 2: watch multiple sources for cross-field rules -------------
  // An array source fires when EITHER changes and gives you tuples of
  // new/old values, which single-source watchEffect cannot express cleanly.
  watch(
    [() => form.username, () => form.email],
    ([username, email]) => {
      errors.username =
        username && username === email.split("@")[0]
          ? "Username must differ from your email handle"
          : "";
    }
  );

  // --- CASE 3: watchEffect — only for eager, read-only derivations ------
  // Legitimate use: mirror validity into an aria-live status string. It reads
  // `errors` and writes a DIFFERENT ref, so there is no self-feedback loop.
  const statusMessage = ref("");
  watchEffect(() => {
    const count = Object.values(errors).filter(Boolean).length;
    // Every reactive value READ here becomes a dependency automatically.
    // We deliberately read only `errors`, never write to it.
    statusMessage.value = count === 0 ? "" : `${count} field(s) need attention`;
  });

  // --- CASE 4: async validation with cancellation ----------------------
  watch(
    () => form.username,
    (username) => {
      if (!username) return;
      // AbortController cancels the previous in-flight request when the
      // field changes again, so a slow earlier response cannot overwrite a
      // newer one (the classic stale-async race).
      const controller = new AbortController();
      // onWatcherCleanup runs before the next invocation and on stop; it is
      // the flush-safe replacement for tracking the controller in a ref.
      onWatcherCleanup(() => controller.abort());
      fetch(`/api/username-available?u=${encodeURIComponent(username)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((res) => {
          errors.username = res.available ? "" : "Username taken";
        })
        .catch((err) => {
          if (err.name !== "AbortError") errors.username = "Check failed";
        });
    }
  );

  // Return the stop handle for the one watcher a caller might stop early
  // (e.g. after the field is confirmed valid once).
  return { errors, statusMessage, stopEmail };
}
```

---

## Step-by-step walkthrough

1. **Enumerate the reactive sources that should re-run validation for the field.** For a single field it is just that field; for a rule spanning two fields it is both. Writing them down decides whether you can even use `watchEffect` (you can only if you are comfortable auto-tracking whatever the callback happens to read).

2. **Reach for `watch` first.** Give it a getter source `() => form.field`, take `(value, previous)`, and short-circuit when they are equal. This is lazy, so pristine fields do not flash errors on mount — the behavior users expect and the reason `watch` beats `watchEffect` here.

3. **Use an array source for cross-field rules.** `watch([() => a, () => b], ([a, b]) => …)` fires on either change and hands you both current values. Expressing this with `watchEffect` forces you to read both inside the body and accept eager firing.

4. **Confine `watchEffect` to eager, read-only derivations** such as an `aria-live` summary string. It must not write to any reactive source it also reads.

5. **Pick a flush mode deliberately** and stop watchers you created outside synchronous setup.

---

Before timing, the choice itself. The two differ in one respect that decides almost every case: who names the dependencies.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of watchEffect and watch across five properties: how dependencies are determined, whether the callback runs immediately, whether the previous value is available, what happens when a conditional branch is not taken, and which validation shapes each suits." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>watchEffect infers dependencies; watch is told them</title>
  <desc>Dependencies: watchEffect tracks whatever the callback reads on its last run, while watch uses exactly the sources you list. First run: watchEffect always runs immediately, while watch waits for a change unless immediate is set. Previous value: watchEffect has none, while watch receives the old value as its second argument. Conditional reads: a dependency read inside a branch that was not taken is not tracked by watchEffect, so the effect stops reacting to it — a real and silent failure — while watch is unaffected. Suits: watchEffect for validation that always reads the same handful of fields, watch for cross-field rules where you need the previous value or must not run on mount.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Property</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">watchEffect</text>
  <text x="450" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">watch</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">dependencies</text>
  <text x="220" y="66" font-size="10" fill="#6b5f75" font-family="inherit">whatever the last run read</text>
  <text x="450" y="66" font-size="10" fill="#6b5f75" font-family="inherit">exactly the sources listed</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">runs on mount</text>
  <text x="220" y="100" font-size="10" fill="#6b5f75" font-family="inherit">always</text>
  <text x="450" y="100" font-size="10" fill="#6b5f75" font-family="inherit">only with immediate: true</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">previous value</text>
  <text x="220" y="134" font-size="10" fill="#a63d6f" font-family="inherit">not available</text>
  <text x="450" y="134" font-size="10" fill="#2d6342" font-family="inherit">second argument</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">reads inside a branch</text>
  <text x="220" y="168" font-size="10" fill="#a63d6f" font-family="inherit">untracked if not taken</text>
  <text x="450" y="168" font-size="10" fill="#2d6342" font-family="inherit">unaffected</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">The last row is the one that produces a validator that "works, then stops": a field read only in the else branch is dropped.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Rule of thumb: unconditional reads of a fixed set, watchEffect. Anything conditional or comparative, watch.</text>
</svg>

## Flush timing

`flush` controls *when* in the update cycle the callback runs:

- **`pre`** (default) — before the component re-renders. Correct for computing error state, because Vue then renders the field and its error in one pass rather than painting twice.
- **`post`** — after the DOM has been patched. Use it only when validation must read the updated DOM: measuring a rendered element, or moving focus to a newly revealed error. This is the mode to use when your logic coordinates with the [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) that render the message element.
- **`sync`** — fires synchronously on every mutation, before batching. It defeats Vue's coalescing and can run many times per interaction; reserve it for cases that genuinely cannot wait a microtask.

---

The conditional-dependency failure is worth drawing, because the code that produces it looks completely reasonable:

<svg viewBox="0 8 668 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three runs of a watchEffect whose body reads the postcode field only when the country is set to a value requiring it. On the first run country is empty so postcode is never read and never tracked; changing postcode therefore does not re-run the effect, and the validation error never appears." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A dependency that was never read is a dependency you do not have</title>
  <desc>Run one, on mount: country is empty, so the branch that reads postcode is not taken, and the tracked set contains country only. The reader then edits postcode: because postcode is not in the tracked set, the effect does not run and no validation happens. The reader sets country to a value that requires a postcode: country is tracked, so the effect runs, now reads postcode, and postcode joins the tracked set. From this point the effect behaves correctly — which is why the bug is so often reported as intermittent.</desc>
  <rect x="0" y="8" width="668" height="224" fill="#f9f5fb"/>
  <rect x="14" y="30" width="200" height="84" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">run 1 · on mount</text>
  <text x="28" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">country is empty</text>
  <text x="28" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">branch not taken</text>
  <text x="28" y="106" font-size="9.5" fill="#a63d6f" font-family="inherit">tracked: { country }</text>
  <path d="M214,72 H240" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="240" y="30" width="200" height="84" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="254" y="52" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">reader edits postcode</text>
  <text x="254" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">postcode is not tracked</text>
  <text x="254" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">effect does not run</text>
  <text x="254" y="106" font-size="9.5" fill="#a63d6f" font-family="inherit">no validation, no error</text>
  <path d="M440,72 H466" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="466" y="30" width="188" height="84" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="480" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">reader sets country</text>
  <text x="480" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">country IS tracked</text>
  <text x="480" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">effect runs, reads postcode</text>
  <text x="480" y="106" font-size="9.5" fill="#2d6342" font-family="inherit">tracked: { country, postcode }</text>
  <rect x="14" y="134" width="640" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="156" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Two fixes, both one line</text>
  <text x="28" y="174" font-size="9.5" fill="#6b5f75" font-family="inherit">Read every dependency before the branch, or use watch([country, postcode], …) and declare them.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Reported as "validation is flaky": it is deterministic, but the determining factor is the order the reader filled the form in.</text>
  <text x="14" y="224" font-size="10" fill="#6b5f75" font-family="inherit">A test that fills fields top to bottom will never reproduce it; fill postcode first and it fails every time.</text>
</svg>

## Failure modes and fixes

### 1. `watchEffect` fires on mount and shows premature errors

`watchEffect` runs immediately. If it writes `errors.email`, a pristine form shows a required-field error before the user types.

```typescript
// FIX: use watch (lazy). It does not run until form.email actually changes.
watch(() => form.email, (v) => { errors.email = v ? "" : "Required"; });
```

### 2. Double-fire from a self-referential `watchEffect`

Reading and writing the same reactive object inside `watchEffect` creates a loop:

```typescript
// BROKEN: reads errors, writes errors → re-triggers itself.
watchEffect(() => { errors.count = Object.keys(errors).length; });
```

Use `watch` with an explicit source, or ensure the effect writes to a *different* ref than any it reads (as `statusMessage` does above).

### 3. Watcher created in an async callback never stops

A watcher set up inside a `setTimeout`, promise, or event handler is *not* bound to the component and leaks past unmount.

```typescript
// FIX: capture and store the stop handle; call it on unmount.
let stop: (() => void) | undefined;
onMounted(async () => {
  await ready();
  stop = watch(() => form.email, validateEmail);
});
onUnmounted(() => stop?.());
```

### 4. Deep object field not detected

`watch(() => form.address, …)` with a getter returning the same object reference will not fire on nested mutation.

```typescript
// FIX: add deep, or watch a specific nested getter instead.
watch(() => form.address, onChange, { deep: true });
```

### 5. Stale async result overwrites a newer one

Without cancellation, a slow earlier request resolves after a faster later one and clobbers current state. Use `AbortController` with `onWatcherCleanup` as shown in Case 4 above; do not track the controller in an ad-hoc `ref`, because cleanup ordering with flush timing gets subtle.

---

Async validation adds one more requirement that neither option handles by itself: the run you started may not be the run whose answer you want.

<svg viewBox="0 8 664 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two overlapping async validation runs. Without onWatcherCleanup the first, slower run resolves last and overwrites the second run's correct result. With cleanup, the first run is aborted when the second starts, so only the newest answer is ever written." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The last answer to arrive is not the answer you want</title>
  <desc>Without cleanup: run A starts for the value "ad" and takes eight hundred milliseconds. Run B starts for "ada" and takes two hundred. B resolves first and writes the correct result, then A resolves and overwrites it with a result for a value the field no longer holds. With cleanup registered through the watcher's cleanup hook: starting run B aborts run A's request, so A never resolves, and the field ends on B's answer. The general rule is that the guard belongs in the watcher, not in the validator, because only the watcher knows a newer run has begun.</desc>
  <rect x="0" y="8" width="664" height="214" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">no cleanup — the slow answer wins</text>
  <rect x="14" y="36" width="300" height="80" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="58" font-size="9.5" fill="#6b5f75" font-family="inherit">run A ("ad") starts — 800ms</text>
  <text x="28" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">run B ("ada") starts — 200ms</text>
  <text x="28" y="94" font-size="9.5" fill="#2d6342" font-family="inherit">B resolves: correct result written</text>
  <text x="28" y="110" font-size="9.5" fill="#a63d6f" font-family="inherit">A resolves: overwrites it, stale</text>
  <text x="350" y="26" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">with cleanup — A never resolves</text>
  <rect x="350" y="36" width="300" height="80" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="364" y="58" font-size="9.5" fill="#6b5f75" font-family="inherit">run A ("ad") starts — 800ms</text>
  <text x="364" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">run B starts, cleanup aborts A</text>
  <text x="364" y="94" font-size="9.5" fill="#2d6342" font-family="inherit">B resolves: correct result written</text>
  <text x="364" y="110" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing else can write after it</text>
  <text x="14" y="150" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why the guard belongs in the watcher</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">Only the watcher knows a newer run has started. A validator that checks "is my value still current" has to reach back</text>
  <text x="14" y="184" font-size="10" fill="#6b5f75" font-family="inherit">into form state, which couples it to the form and makes it untestable in isolation.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Both watch and watchEffect give you the cleanup hook, so this is one thing the choice above does not affect.</text>
</svg>

## Verification checklist

- [ ] A pristine field shows no error until the user changes it (validation is lazy).
- [ ] Editing a field runs its validator exactly once per real change, not twice.
- [ ] Cross-field rules re-run when either dependent field changes.
- [ ] No watchEffect writes to a reactive source it also reads.
- [ ] Error computation uses flush: 'pre'; DOM/focus-reading logic uses flush: 'post'.
- [ ] Async validators cancel the previous request via AbortController before starting a new one.
- [ ] Watchers created outside synchronous setup are explicitly stopped on unmount.
- [ ] The aria-live status announces validity changes without duplicating per-field messages.
- [ ] No console warnings about infinite update loops during rapid typing.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use watch or watchEffect to trigger field validation?</strong></summary>

Use `watch` for validation. You almost always need the new value (and often the old value to short-circuit no-op changes), you usually want it lazy so it does not fire on initial render before the user has touched the field, and an explicit source list prevents accidental dependencies on unrelated reactive state. `watchEffect` fits derived read-only side-effects, not gated validation.

</details>

<details>
<summary><strong>Why does my watchEffect fire twice per keystroke?</strong></summary>

`watchEffect` re-runs whenever *any* reactive value it read on the previous run changes. If your callback reads both the field value and an errors object that it also writes to, you create a feedback loop, or you track more sources than intended. Switch to `watch` with an explicit source, or narrow the reads so the effect only depends on the single field value.

</details>

<details>
<summary><strong>What flush timing should validation use?</strong></summary>

Use the default `flush: 'pre'` for computing errors, because it runs before the component re-renders so the DOM updates once with the new error state. Use `flush: 'post'` only when the validation logic must read the already-updated DOM, such as measuring a rendered field or moving focus. Reserve `flush: 'sync'` for cases needing the reaction before any batching, which is rare and can cause redundant runs.

</details>

<details>
<summary><strong>Do I need to stop watchers manually?</strong></summary>

Watchers created synchronously inside `setup` or `<script setup>` are bound to the component instance and stop automatically on unmount. You must call the returned stop handle yourself only when you create a watcher asynchronously (inside a promise, timeout, or event callback) or when you want to stop watching before unmount, such as after a one-shot async validation resolves.

</details>

---

## Related

- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
- [Syncing Vue Form State with Pinia](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/syncing-vue-form-state-with-pinia/)

← [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
