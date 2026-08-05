---
layout: page.njk
title: "Handling Svelte Form Hydration Mismatches"
description: "Fix SvelteKit hydration mismatches in forms by gating client-side validation behind a reactive hydration flag, wiring accessible ARIA state, and cleaning up on navigation."
slug: "handling-svelte-form-hydration-mismatches"
type: howto
breadcrumb: "Handling Svelte Form Hydration Mismatches"
datePublished: "2025-09-01"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Handling Svelte Form Hydration Mismatches"
  parent: "Hydration Sync for SSR Forms"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Handling Svelte Form Hydration Mismatches",
      "description": "Fix SvelteKit hydration mismatches in forms by gating client-side validation behind a reactive hydration flag, wiring accessible ARIA state, and cleaning up on navigation.",
      "datePublished": "2025-09-01",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Hydration Sync for SSR Forms", "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/" },
        { "@type": "ListItem", "position": 4, "name": "Handling Svelte Form Hydration Mismatches", "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Fix SvelteKit Form Hydration Mismatches",
      "step": [
        { "@type": "HowToStep", "position": 1, "text": "Wrap server-supplied form data in a writable store and mirror prop changes reactively." },
        { "@type": "HowToStep", "position": 2, "text": "Create an isHydrated flag and set it to true inside onMount after awaiting tick()." },
        { "@type": "HowToStep", "position": 3, "text": "Gate all validation logic and aria-invalid mutations behind the hydration flag." },
        { "@type": "HowToStep", "position": 4, "text": "Register a beforeNavigate cleanup that resets the flag and cancels pending requests." },
        { "@type": "HowToStep", "position": 5, "text": "Verify zero hydration warnings in DevTools and zero axe-core violations post-hydration." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does onMount validation trigger hydration warnings even when the DOM looks correct?",
          "acceptedAnswer": { "@type": "Answer", "text": "Svelte checksums the server HTML before mounting. Synchronous attribute mutations inside onMount run before the checksum clears, so Svelte sees a divergence even if the final visual output is identical. Awaiting tick() lets Svelte complete reconciliation first." }
        },
        {
          "@type": "Question",
          "name": "Does the hydration gate delay validation noticeably for users?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. tick() resolves in a single microtask — typically under 2 ms — so users never experience a validation delay. The gate only affects the brief window between server render and client mount." }
        },
        {
          "@type": "Question",
          "name": "How do I test for hydration mismatches in CI?",
          "acceptedAnswer": { "@type": "Answer", "text": "Attach a console.warn spy in Playwright or Cypress and assert it is never called with the string 'Hydration mismatch'. Also assert aria-invalid is false on all inputs immediately after page load." }
        },
        {
          "@type": "Question",
          "name": "Does this pattern work with Svelte 5 runes?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Replace writable stores with $state and $derived runes and keep the same onMount/tick() fence. The hydration lifecycle is identical; only the reactivity primitives change." }
        }
      ]
    }
  ]
}
</script>

# Handling Svelte Form Hydration Mismatches

**Exact problem:** a SvelteKit form runs validation or mutates ARIA attributes synchronously during the hydration window, causing Svelte to detect a server/client DOM divergence and log a hydration mismatch warning — which also corrupts `aria-invalid` state and triggers visible UI flicker before the user has touched anything.

## Context and prerequisites

This page drills into one specific failure mode inside the broader topic of [hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/). Before reading on, you should be familiar with how SvelteKit's `$page.form` object carries server action results back to the client. You should also understand [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/) because the fix wraps that same store pattern with a lifecycle gate.

The diagram below shows the two timelines — server render and client hydration — and the narrow window where premature validation causes the mismatch:

<svg role="img" aria-label="Timeline showing the server render lane above the client lane, with the window between the hydration checksum and the first tick marked as the mismatch danger zone and everything after it marked safe to validate" viewBox="0 30 640 190" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:1.5rem 0">
  <title>Svelte hydration mismatch window</title>
  <desc>Two parallel horizontal timelines. The top lane, Server, shows HTML render and form serialisation completing before the client connects. The bottom lane, Client, runs JS parse, then the hydration checksum, then onMount, then tick. The window over the hydration checksum is marked as the mismatch danger zone; everything from the segment after tick onward is marked safe to validate.</desc>
  <rect x="0" y="30" width="640" height="190" fill="#f9f5fb"/>
  <text x="10" y="52" font-size="13" fill="#1e1a24" font-family="sans-serif" font-weight="600">Server</text>
  <text x="10" y="145" font-size="13" fill="#1e1a24" font-family="sans-serif" font-weight="600">Client</text>
  <rect x="80" y="38" width="200" height="24" rx="4" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="180" y="55" font-size="10.5" fill="#1e1a24" text-anchor="middle" font-family="sans-serif">HTML render + serialize $page.form</text>
  <rect x="162" y="96" width="100" height="26" rx="4" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="212" y="113" font-size="10" fill="#a63d6f" text-anchor="middle" font-family="sans-serif" font-weight="600">mismatch zone</text>
  <rect x="80" y="128" width="80" height="24" rx="4" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="120" y="145" font-size="11" fill="#1e1a24" text-anchor="middle" font-family="sans-serif">JS parse</text>
  <rect x="162" y="128" width="100" height="24" rx="4" fill="#ede5f2" stroke="#a63d6f" stroke-width="2"/>
  <text x="212" y="145" font-size="10" fill="#a63d6f" text-anchor="middle" font-family="sans-serif">checksum</text>
  <rect x="264" y="128" width="80" height="24" rx="4" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="304" y="145" font-size="11" fill="#1e1a24" text-anchor="middle" font-family="sans-serif">onMount</text>
  <rect x="346" y="128" width="60" height="24" rx="4" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="376" y="145" font-size="11" fill="#1e1a24" text-anchor="middle" font-family="sans-serif">tick()</text>
  <rect x="408" y="128" width="140" height="24" rx="4" fill="#ede5f2" stroke="#2d6342" stroke-width="2"/>
  <text x="478" y="145" font-size="11" fill="#2d6342" text-anchor="middle" font-family="sans-serif">safe to validate</text>
  <line x1="280" y1="62" x2="280" y2="126" stroke="#6b5f75" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="288" y="82" font-size="10" fill="#6b5f75" font-family="sans-serif">HTML delivered</text>
  <line x1="80" y1="188" x2="555" y2="188" stroke="#7b4f8a" stroke-width="1.5"/>
  <polygon points="555,184 563,188 555,192" fill="#7b4f8a"/>
  <text x="316" y="208" font-size="11" fill="#6b5f75" text-anchor="middle" font-family="sans-serif">time</text>
</svg>

## Core pattern: the hydration gate

The single implementation below addresses the entire mismatch class. Every non-obvious line carries an inline comment.

```html
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { writable, derived, type Readable } from 'svelte/store';
  import { beforeNavigate } from '$app/navigation';

  // ── Types ──────────────────────────────────────────────────────────────────
  interface FormData {
    email: string;
    username: string;
    [key: string]: string;
  }

  type FieldErrors = Record<string, string>;

  // ── Props ──────────────────────────────────────────────────────────────────
  export let form: Partial<FormData> = {};

  // ── Stores ─────────────────────────────────────────────────────────────────
  // Wrap the server-supplied prop in a store so derived() can subscribe to it.
  // A plain prop cannot be used inside derived() — stores are required.
  const formStore = writable<Partial<FormData>>(form);
  $: formStore.set(form); // mirror future server-action updates reactively

  // The hydration gate. Stays false until Svelte finishes reconciling the DOM.
  // NEVER set this true synchronously — doing so re-introduces the mismatch.
  const isHydrated = writable(false);

  const validationErrors = writable<FieldErrors>({});

  // Derived validity bypasses all schema checks while the gate is closed.
  // This is what prevents aria-invalid from being set during the danger zone.
  const isValid: Readable<boolean> = derived(
    [formStore, validationErrors, isHydrated],
    ([$form, $errors, $hydrated]) => {
      if (!$hydrated) return true; // treat as valid during hydration — no attribute mutations
      return Object.keys($errors).length === 0;
    }
  );

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  onMount(async () => {
    // tick() yields to the microtask queue, giving Svelte one full pass to
    // reconcile server HTML with the initial client vdom. Only after that
    // completes is it safe to mutate DOM-visible reactive state.
    await tick();
    isHydrated.set(true);

    // Return cleanup: runs on component destroy (navigation away or unmount).
    return () => {
      isHydrated.set(false);       // reset so the gate closes if component remounts
      validationErrors.set({});    // clear stale errors — they don't belong to the next route
    };
  });

  // Reset the gate on SvelteKit client-side navigation to prevent stale state
  // from a previous route leaking into the next one during the transition.
  beforeNavigate(() => {
    isHydrated.set(false);
    validationErrors.set({});
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  // AbortController is used here to cancel any async uniqueness checks if the
  // user types again before the previous request resolves. Without this, a
  // slow response can overwrite a newer, correct validation result.
  let abortController: AbortController | null = null;

  async function validateField(name: string, value: string): Promise<void> {
    // Hard guard: never run validation during the hydration window.
    // $isHydrated reads the current store value synchronously via the $ prefix.
    if (!$isHydrated) return;

    // Cancel any in-flight async validation for this field before starting a new one.
    abortController?.abort();
    abortController = new AbortController(); // each call gets a fresh token
    const signal = abortController.signal;   // pass signal into fetch() to cancel

    try {
      const result = runSchemaValidation($formStore);

      // If the signal aborted while runSchemaValidation was executing, discard the result.
      if (signal.aborted) return;

      validationErrors.update(errors => ({
        ...errors,
        [name]: result[name] ?? '',
      }));
    } catch (err) {
      // AbortError is expected and benign — swallow it silently.
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[form] validation error:', err);
      }
    }
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const { name, value } = target;
    formStore.update(f => ({ ...f, [name]: value }));
    void validateField(name, value);
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    // Full-form validation and submission logic goes here.
  }

  // Stub — replace with your actual schema library (Zod, Valibot, etc.)
  function runSchemaValidation(data: Partial<FormData>): FieldErrors {
    const errors: FieldErrors = {};
    if (!data.email?.includes('@')) errors.email = 'Enter a valid email address.';
    if (!data.username || data.username.length < 3) errors.username = 'Username must be at least 3 characters.';
    return errors;
  }
</script>

<form on:submit={handleSubmit} novalidate>
  <div class="field">
    <label for="email">Email</label>
    <input
      id="email"
      name="email"
      type="email"
      value={$formStore.email ?? ''}
      on:input={handleInput}
      aria-invalid={$validationErrors.email ? 'true' : 'false'}
      aria-describedby={$validationErrors.email ? 'email-error' : undefined}
    />
    {#if $validationErrors.email && $isHydrated}
      <!-- role="alert" triggers screen-reader announcement on insertion -->
      <span id="email-error" role="alert" class="error-text">
        {$validationErrors.email}
      </span>
    {/if}
  </div>

  <div class="field">
    <label for="username">Username</label>
    <input
      id="username"
      name="username"
      type="text"
      value={$formStore.username ?? ''}
      on:input={handleInput}
      aria-invalid={$validationErrors.username ? 'true' : 'false'}
      aria-describedby={$validationErrors.username ? 'username-error' : undefined}
    />
    {#if $validationErrors.username && $isHydrated}
      <span id="username-error" role="alert" class="error-text">
        {$validationErrors.username}
      </span>
    {/if}
  </div>

  <button type="submit">Submit</button>
</form>
```

## Step-by-step walkthrough

1. **Wrap the prop in a store (lines `formStore = writable(form)` and `$: formStore.set(form)`).** A component prop cannot be passed directly to `derived()`. Wrapping it lets the derived validity store subscribe and react when the server sends a new `$page.form` payload after a form action round-trip.

2. **Create `isHydrated` as a `writable(false)` store.** This is the gate. All reactive expressions that would mutate DOM-visible attributes read this store via `derived()`, so they evaluate to safe defaults while the gate is closed.

3. **Open the gate inside `onMount` after `await tick()`.** `onMount` runs after the component first renders on the client. `tick()` yields until Svelte finishes its DOM reconciliation pass. Setting `isHydrated` to `true` before that pass completes is the most common mistake — it re-introduces the very mismatch you are trying to prevent.

4. **Return a cleanup function from `onMount`.** Svelte calls the returned function when the component is destroyed. Resetting `isHydrated` and `validationErrors` ensures that if this component is ever re-mounted (e.g., in a Svelte 5 `{#snippet}` context), it starts clean rather than inheriting stale state from a previous mount.

5. **Register `beforeNavigate` to reset both stores.** SvelteKit's client-side router does not destroy and recreate components on every navigation. Without this, the gate remains open from the previous route and the next route's hydration is unprotected.

6. **Gate `validateField` with `if (!$isHydrated) return`.** This is the inline guard — a second line of defence in case the derived store's value has not yet propagated when an input event fires very early.

7. **Use `AbortController` to cancel in-flight async validation.** Each call to `validateField` aborts the previous controller and creates a fresh one. The `signal` is checked after any async operation to discard stale results — this is the pattern described in [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/).

The gate is a single boolean, but its lifetime spans mount, navigation and teardown — and each of those has to move it deliberately:

<svg viewBox="0 8 664 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lifecycle of the isHydrated flag: it starts false at module evaluation and during server render, becomes true inside onMount after awaiting tick, stays true while the reader interacts, and is reset to false in beforeNavigate so the next route starts closed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The hydration flag's lifetime</title>
  <desc>The flag is false when the module is evaluated and throughout the server render, so no ARIA attribute is written into the server HTML. It stays false during the first client pass. Inside onMount, after awaiting tick so that reconciliation has finished, it becomes true. While it is true, validation may write aria-invalid and the live region freely. In beforeNavigate it is reset to false, so a client-side navigation to another instance of the same form starts from a closed gate instead of inheriting an open one.</desc>
  <rect x="0" y="8" width="664" height="198" fill="#f9f5fb"/>
  <rect x="14" y="34" width="150" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">false</text>
  <text x="89" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">server render and</text>
  <text x="89" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">first client pass</text>
  <path d="M164,67 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="34" width="150" height="66" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">onMount + tick</text>
  <text x="261" y="74" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">reconciliation done,</text>
  <text x="261" y="88" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">then flip it</text>
  <path d="M336,67 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="34" width="150" height="66" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="433" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">true</text>
  <text x="433" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">ARIA writes allowed,</text>
  <text x="433" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">validation live</text>
  <path d="M508,67 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="34" width="118" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="589" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">beforeNavigate</text>
  <text x="589" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reset to false,</text>
  <text x="589" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">abort in flight</text>
  <text x="14" y="132" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why the reset matters on a client-side navigation</text>
  <text x="14" y="150" font-size="10" fill="#6b5f75" font-family="inherit">Navigating to the same route with different parameters can reuse the component instance. Without the reset the gate is</text>
  <text x="14" y="166" font-size="10" fill="#6b5f75" font-family="inherit">already open, so validation writes into markup the new data has not finished replacing.</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">A module-level flag has the same bug across every instance at once; keep it per component.</text>
</svg>

## Failure modes and edge cases

### 1. Setting `isHydrated = true` without `await tick()`

If you call `isHydrated.set(true)` synchronously inside `onMount`, the derived store re-evaluates before Svelte reconciles the DOM. The `aria-invalid` attributes are now set based on client state while the server HTML still has different attribute values — Svelte detects the mismatch and logs the warning.

**Fix:** always `await tick()` before opening the gate.

### 2. Browser autofill fires before `onMount`

Browsers can autofill input values immediately after parsing the HTML, which can trigger `input` events before `onMount` runs. The inline `if (!$isHydrated) return` guard in `validateField` handles this — the event fires, the guard exits early, and no validation runs until the gate opens.

```html
<!-- Explicit autocomplete attributes reduce autofill-timing surprises -->
<input name="email" type="email" autocomplete="email" ... />
```

### 3. Stale closure over `$isHydrated` in a debounce wrapper

If you debounce `handleInput` and capture `$isHydrated` in the debounce closure at call time, the captured value may be `false` even though the gate has since opened by the time the debounced function actually runs.

```typescript
// WRONG — $isHydrated captured at call time (before gate opens)
const debouncedValidate = debounce((name: string, value: string) => {
  if (!$isHydrated) return; // always false if debounce fires early
}, 300);
```

**Fix:** read the store value inside the debounced callback, not at the point of call. With Svelte's `$` auto-subscription, `$isHydrated` inside a `<script>` block is always the current value — but only inside the reactive Svelte context. If you extract the debounce to a plain `.ts` module, use `get(isHydrated)` from `svelte/store` instead.

### 4. `beforeNavigate` not firing on hard navigation

`beforeNavigate` only fires for SvelteKit's client-side router transitions. A full page reload bypasses it. This is fine — a hard reload re-runs the full SSR cycle, so there is no stale state to reset. Do not add a `beforeunload` listener as a workaround; it causes problems with browser back/forward cache.

### 5. Design system wrapper components that forward ARIA props

If you use a component library where `<Input>` wraps a native `<input>`, confirm the wrapper forwards `aria-invalid` and `aria-describedby` directly to the underlying element. Wrappers that cache ARIA props internally may delay propagation, making the gate ineffective for those attributes.

Not everything needs gating, and gating too much makes a form feel dead for the first frame. The line falls between what the server could have rendered and what only the client knows:

<svg viewBox="0 8 690 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="What must be behind the hydration gate and what must not: writing aria-invalid and swapping live region text must wait, while rendering server-supplied errors, marking required fields and wiring describedby to static hint ids can all happen in the server pass." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Gate the client-only writes, not the whole form</title>
  <desc>Behind the gate: writing aria-invalid, swapping live region text, focusing the first invalid field, and running any validator that reads the clock or storage — all of these either differ across the boundary or announce something before the reader has done anything. In front of the gate: rendering errors the server already returned, marking required fields, wiring aria-describedby to hint elements whose ids are deterministic, and disabling the submit button while a server action is pending — none of these differ between the two renders, so gating them only delays correct markup.</desc>
  <rect x="0" y="8" width="690" height="206" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">Behind the gate — differs across the boundary</text>
  <rect x="14" y="36" width="326" height="140" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="60" font-size="10" fill="#1e1a24" font-family="inherit">writing aria-invalid on a field</text>
  <text x="28" y="84" font-size="10" fill="#1e1a24" font-family="inherit">swapping live region text</text>
  <text x="28" y="108" font-size="10" fill="#1e1a24" font-family="inherit">focusing the first invalid field</text>
  <text x="28" y="132" font-size="10" fill="#1e1a24" font-family="inherit">validators reading the clock or storage</text>
  <text x="28" y="158" font-size="9.5" fill="#6b5f75" font-family="inherit">each of these either differs, or speaks too early</text>
  <text x="364" y="26" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">In front of it — identical on both sides</text>
  <rect x="364" y="36" width="312" height="140" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="378" y="60" font-size="10" fill="#1e1a24" font-family="inherit">errors the server action already returned</text>
  <text x="378" y="84" font-size="10" fill="#1e1a24" font-family="inherit">required and pattern attributes</text>
  <text x="378" y="108" font-size="10" fill="#1e1a24" font-family="inherit">describedby pointing at static hint ids</text>
  <text x="378" y="132" font-size="10" fill="#1e1a24" font-family="inherit">disabling submit while an action is pending</text>
  <text x="378" y="158" font-size="9.5" fill="#6b5f75" font-family="inherit">gating these only delays correct markup</text>
  <text x="14" y="202" font-size="10" fill="#6b5f75" font-family="inherit">The right-hand column is why a gated form still works with JavaScript disabled: everything essential was already in the HTML.</text>
</svg>

## Verification checklist

- Open DevTools console on initial page load — zero "Hydration mismatch" warnings appear
- `aria-invalid` is `false` on all inputs immediately after load before the user types anything
- After the first `input` event, `aria-invalid` toggles correctly and `role="alert"` errors are announced by VoiceOver / NVDA
- Simulate 3G in Chrome DevTools — no validation errors flash during page load
- Navigate away and back using SvelteKit's client router — confirm no stale error state on return
- Run `axe-core` post-hydration — zero violations for `aria-live` regions or invalid attribute combinations
- In CI, assert `console.warn` is never called with the substring `Hydration mismatch` during form load (Playwright: `page.on('console', ...)`)
- Rapid input typing does not accumulate orphaned validation errors from aborted async requests

## FAQ

<details>
<summary><strong>Why does <code>onMount</code> validation trigger hydration warnings even when the DOM looks correct?</strong></summary>

Svelte computes a checksum of the server-rendered HTML before the client mounts. If `onMount` mutates any attribute — `class`, `data-*`, `aria-*` — synchronously, the checksum comparison is still running when the mutation lands, and Svelte flags a divergence. The visual output might look identical to you, but the internal tree comparison has already failed. Awaiting `tick()` defers the mutation until after the comparison clears.

</details>

<details>
<summary><strong>Does the hydration gate delay validation noticeably for users?</strong></summary>

No. `tick()` resolves in a single microtask, typically under 2 ms on any modern device. The gate is invisible to users — it only covers the window between the initial HTML parse and the component mount, before the user could realistically have interacted with the form.

</details>

<details>
<summary><strong>How do I test for hydration mismatches in CI?</strong></summary>

In Playwright, attach a `console` event listener before navigating to the page and collect all warnings. After the page load completes, assert that none of the collected messages contain `'Hydration mismatch'`. Pair this with an `axe-core` scan to assert `aria-invalid` is `false` on every input at load time — that combination catches both the mismatch and its accessibility side-effect.

</details>

<details>
<summary><strong>Does this pattern work with Svelte 5 runes?</strong></summary>

Yes. Replace `writable` with `$state` and `derived` with `$derived`. Keep the same `onMount` / `tick()` fence — the hydration lifecycle has not changed in Svelte 5, only the reactivity primitives. The `beforeNavigate` call and `AbortController` pattern carry over unchanged.

</details>

---

**Related**

- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/) — the parent topic covering the full hydration sync approach across frameworks
- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/) — how to structure writable and derived stores for form state management
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/) — the `AbortController` cancellation pattern used in the validation gate above
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — broader async validation patterns including debounce and retry

← [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
