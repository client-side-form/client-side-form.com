---
layout: page.njk
title: "Hydration Sync for SSR Forms"
description: "State reconciliation strategies for server-rendered forms during client hydration — preventing UI flicker, validation overrides, and accessibility regressions."
slug: hydration-sync-for-ssr-forms
type: cluster
breadcrumb: "Hydration Sync for SSR Forms"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Hydration Sync for SSR Forms"
  parent: "Framework Adapters"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Hydration Sync for SSR Forms",
      "description": "State reconciliation strategies for server-rendered forms during client hydration — preventing UI flicker, validation overrides, and accessibility regressions.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Hydration Sync for SSR Forms", "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to implement SSR form hydration sync",
      "step": [
        { "@type": "HowToStep", "name": "Embed state in SSR markup", "text": "Serialize form state into data-* attributes with a checksum during server rendering." },
        { "@type": "HowToStep", "name": "Parse and verify on mount", "text": "On client mount, read the attributes, verify the checksum, and reconcile with the client store." },
        { "@type": "HowToStep", "name": "Defer validation activation", "text": "Gate validation rule activation behind the isHydrated flag using requestAnimationFrame." },
        { "@type": "HowToStep", "name": "Sync ARIA state post-hydration", "text": "Flush live-region updates and aria-invalid attributes only after the hydration window closes." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent validation errors firing on initial SSR mount?",
          "acceptedAnswer": { "@type": "Answer", "text": "Gate schema evaluation on isHydrated. Use requestAnimationFrame or a useEffect with an empty dependency array to flip the flag after the first browser paint." }
        },
        {
          "@type": "Question",
          "name": "What happens if the server and client checksums mismatch?",
          "acceptedAnswer": { "@type": "Answer", "text": "The adapter falls back to SSR-parsed values, suppresses client-side validation, and logs a warning. Validation re-enables on the first onChange event." }
        },
        {
          "@type": "Question",
          "name": "How do I enforce a sub-50ms hydration budget?",
          "acceptedAnswer": { "@type": "Answer", "text": "Inline critical form state via data-* attributes rather than a separate API call. Lazy-load non-blocking schemas and avoid synchronous parsing of large JSON payloads." }
        },
        {
          "@type": "Question",
          "name": "Why do ARIA live regions announce noise during page load?",
          "acceptedAnswer": { "@type": "Answer", "text": "Validation messages are injected before the hydration window closes. Queue aria-live updates until isHydrated is true to prevent spurious announcements to screen reader users." }
        }
      ]
    }
  ]
}
</script>

# Hydration Sync for SSR Forms

Server-side rendering delivers a fully-populated form to the browser before a single byte of JavaScript executes. The problem arrives 50–300 ms later when the client bundle mounts: if the client store initialises from scratch instead of reconciling with the server's output, you get a window of duplicated state — two sources of truth that briefly diverge. The symptoms are familiar to anyone debugging production SSR failures: input values flash back to empty, validation errors fire on untouched fields, `aria-invalid` attributes toggle unexpectedly, and Lighthouse flags cumulative layout shift from field re-renders.

This page covers the deterministic handshake that eliminates that window. The pattern applies whenever a form is pre-rendered — Next.js App Router or Pages Router, Nuxt, SvelteKit, Astro, Remix — and the client bundle must pick up state the server already computed without re-initialising from zero.

---

## Hydration State Machine

The transition from server paint to stable interactive state passes through four explicit phases. Skipping or collapsing any two of them is the most common source of production hydration bugs.

<svg viewBox="0 0 740 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SSR form hydration state machine: SERVER_RENDERED to PARSING to RECONCILING to HYDRATED, with a FALLBACK path from RECONCILING on checksum mismatch" style="width:100%;max-width:740px;display:block;margin:2rem auto;">
  <title>SSR Form Hydration State Machine</title>
  <desc>Four-phase state machine showing the path from server-rendered HTML through payload parsing and state reconciliation to a fully hydrated interactive form, with a fallback path triggered by checksum mismatch.</desc>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
      <path d="M0,0 L8,3.5 L0,7 Z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
  <!-- State boxes -->
  <!-- SERVER_RENDERED -->
  <rect x="10" y="70" width="140" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="80" y="97" text-anchor="middle" font-size="11" font-family="inherit" fill="currentColor" font-weight="600">SERVER_RENDERED</text>
  <text x="80" y="113" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" opacity="0.7">DOM + data-* attrs</text>
  <!-- PARSING -->
  <rect x="190" y="70" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="250" y="97" text-anchor="middle" font-size="11" font-family="inherit" fill="currentColor" font-weight="600">PARSING</text>
  <text x="250" y="113" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" opacity="0.7">JSON + checksum</text>
  <!-- RECONCILING -->
  <rect x="350" y="70" width="130" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="415" y="97" text-anchor="middle" font-size="11" font-family="inherit" fill="currentColor" font-weight="600">RECONCILING</text>
  <text x="415" y="113" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" opacity="0.7">merge → store</text>
  <!-- HYDRATED -->
  <rect x="530" y="70" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
  <text x="590" y="97" text-anchor="middle" font-size="11" font-family="inherit" fill="currentColor" font-weight="600">HYDRATED</text>
  <text x="590" y="113" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" opacity="0.7">validation live</text>
  <!-- FALLBACK box -->
  <rect x="350" y="155" width="130" height="38" rx="8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5,3" opacity="0.6"/>
  <text x="415" y="172" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" font-weight="600">FALLBACK</text>
  <text x="415" y="186" text-anchor="middle" font-size="10" font-family="inherit" fill="currentColor" opacity="0.7">SSR values only</text>
  <!-- Arrows -->
  <line x1="150" y1="100" x2="188" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr)" opacity="0.7"/>
  <line x1="310" y1="100" x2="348" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr)" opacity="0.7"/>
  <line x1="480" y1="100" x2="528" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr)" opacity="0.7"/>
  <!-- Fallback arrow from RECONCILING down -->
  <line x1="415" y1="130" x2="415" y2="153" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arr)" opacity="0.6"/>
  <!-- Labels -->
  <text x="169" y="93" text-anchor="middle" font-size="9" font-family="inherit" fill="currentColor" opacity="0.6">mount</text>
  <text x="329" y="93" text-anchor="middle" font-size="9" font-family="inherit" fill="currentColor" opacity="0.6">verify</text>
  <text x="504" y="93" text-anchor="middle" font-size="9" font-family="inherit" fill="currentColor" opacity="0.6">rAF</text>
  <text x="443" y="147" text-anchor="start" font-size="9" font-family="inherit" fill="currentColor" opacity="0.6">mismatch</text>
</svg>

| Phase | Trigger | What must happen |
|---|---|---|
| `SERVER_RENDERED` | HTTP response delivered | DOM contains `data-form-state`, `data-validation-schema`, `data-checksum` |
| `PARSING` | JS bundle executes | Read attributes, JSON-parse payload, verify checksum |
| `RECONCILING` | Checksum passes | Merge server payload into client store, suppress validation rules |
| `HYDRATED` | `requestAnimationFrame` callback | Activate validation, flush queued ARIA updates, set `isHydrated = true` |
| `FALLBACK` | Checksum fails | Preserve SSR DOM values, suppress all client validation, log warning |

---

## Core Implementation

The hook below handles the full state machine. Every `AbortController` and `WeakMap` usage carries an inline comment explaining the decision — these are the two patterns most commonly mis-applied in SSR hydration code.

```typescript
import { useState, useEffect, useRef } from 'react';

// WeakMap keyed by the DOM element so entries are garbage-collected automatically
// when the element is removed — avoids the memory leak that a plain Map causes
// during SPA navigation where forms mount/unmount repeatedly.
const hydratedStateCache = new WeakMap<Element, unknown>();

type HydrationStatus = 'idle' | 'parsing' | 'reconciling' | 'hydrated' | 'fallback';

interface HydratedFormResult<T> {
  state: T | null;
  status: HydrationStatus;
  isHydrated: boolean;
}

export function useHydratedFormState<T extends Record<string, unknown>>(
  formId: string
): HydratedFormResult<T> {
  const [status, setStatus] = useState<HydrationStatus>('idle');
  const [state, setState] = useState<T | null>(null);

  // AbortController cancels any in-flight schema fetch if the component unmounts
  // before the network response arrives — without this, the setState call fires
  // on an unmounted component and leaks the pending promise into the next render.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = document.querySelector(`[data-form-id="${formId}"]`);
    if (!el) return;

    // Return early if we already reconciled this element (e.g. React StrictMode
    // double-invocation) — prevents duplicate state flips.
    if (hydratedStateCache.has(el)) {
      setState(hydratedStateCache.get(el) as T);
      setStatus('hydrated');
      return;
    }

    setStatus('parsing');

    const dataset = (el as HTMLElement).dataset;
    const rawState = dataset.formState ?? '{}';
    const serverChecksum = dataset.checksum;

    let payload: T;
    try {
      payload = JSON.parse(rawState) as T;
    } catch {
      console.warn(`[useHydratedFormState] Corrupt JSON for form "${formId}" — entering fallback`);
      setStatus('fallback');
      return;
    }

    // Inline checksum verification — replace with a real HMAC or CRC32 check.
    // The key point is: fail closed. On mismatch, use SSR values and suppress
    // client validation; never silently accept potentially stale client data.
    const isValid = serverChecksum != null && serverChecksum.length > 0;

    if (!isValid) {
      console.warn(`[useHydratedFormState] Checksum mismatch for form "${formId}" — entering fallback`);
      setStatus('fallback');
      return;
    }

    setStatus('reconciling');
    setState(payload);

    // Cache so a re-mount (StrictMode, HMR) skips the parse phase entirely.
    hydratedStateCache.set(el, payload);

    // requestAnimationFrame defers the HYDRATED transition until after the
    // browser has committed the current frame. This ensures the DOM is
    // fully painted before we activate validation rules and ARIA updates —
    // preventing the "validation fires on untouched field" failure mode.
    const rafId = requestAnimationFrame(() => {
      setStatus('hydrated');
    });

    abortRef.current = new AbortController();

    return () => {
      // Cancel any pending schema fetch initiated elsewhere in this effect.
      abortRef.current?.abort();
      // Cancel the rAF if the component unmounts between parse and stabilize.
      cancelAnimationFrame(rafId);
    };
  }, [formId]);

  return { state, status, isHydrated: status === 'hydrated' };
}
```

### Server-side: embedding state in the DOM

The hook above only works if the server embeds the payload correctly. Here is the minimal Next.js App Router pattern — the same attributes apply to Nuxt, SvelteKit, and Astro:

```typescript
// app/checkout/page.tsx  (Next.js App Router — runs on the server)
import { computeChecksum } from '@/lib/checksum'; // your HMAC/CRC32 implementation

interface CheckoutFormState {
  email: string;
  country: string;
  vatId: string;
}

export default async function CheckoutPage() {
  // Fetch the initial form state from your data layer on the server.
  const initialState: CheckoutFormState = await getCartFormDefaults();

  // Serialize and sign so the client can verify nothing was tampered with.
  const serialized = JSON.stringify(initialState);
  const checksum = computeChecksum(serialized);

  return (
    <form
      data-form-id="checkout"
      data-form-state={serialized}
      data-checksum={checksum}
    >
      <input name="email" defaultValue={initialState.email} />
      <input name="country" defaultValue={initialState.country} />
      <input name="vatId" defaultValue={initialState.vatId} />
    </form>
  );
}
```

---

## Integration with the Parent Adapter Pipeline

This pattern slots into [Framework Adapters & Custom Hooks](/framework-adapters-custom-hooks/) as the SSR entry point for any adapter's state initialisation lifecycle. Instead of calling the adapter's normal `init(defaultValues)` path, the adapter checks for a server-embedded payload first:

```typescript
// Adapter initialisation with SSR-aware branching
export function createFormAdapter<T extends Record<string, unknown>>(formId: string) {
  const { state: ssrState, isHydrated } = useHydratedFormState<T>(formId);

  // Use SSR state as the adapter's initial values if available;
  // fall back to an empty object only when running purely client-side.
  const adapter = useFormAdapter<T>(ssrState ?? ({} as T));

  // Block the adapter's validation pipeline until hydration stabilises.
  // Without this guard, validation runs against the empty initialisation
  // values, not the server-populated ones, causing phantom errors.
  adapter.setValidationEnabled(isHydrated);

  return adapter;
}
```

The `isHydrated` flag also integrates with [React Form Hook Architecture](/framework-adapters-custom-hooks/react-form-hook-architecture/) — specifically the `useEffect` dependency array discipline that prevents premature effect execution during the `RECONCILING` phase.

For Vue, the equivalent guard is a `watchEffect` with an early return on `!isHydrated`. See [Vue Composition API Form Adapters](/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) for how reactive proxies interact with the hydration window.

---

## Edge Cases and Failure Modes

### Concurrent renders during reconciliation (React 18+)

React 18's concurrent renderer can interrupt a render mid-flight and re-invoke it. If the `RECONCILING` → `HYDRATED` transition triggers a state update inside an interruptible render, you may get a double-flip of `isHydrated`. The fix: move the `requestAnimationFrame` call outside the render path (into a `useEffect`, never directly in a component body) and verify the component is still mounted before calling `setState`.

### Partial hydration in island architectures

Astro and Qwik use partial hydration: only interactive islands hydrate client-side. A form spread across two islands can produce two separate hydration timelines. Each island's adapter must read from the same `data-form-id` root element and coordinate via a shared `BroadcastChannel` or a module-level singleton so the second island to mount does not overwrite the first island's reconciled state.

### autofill overriding reconciled values

Chrome and Safari fire the `change` event for autofill *after* the hydration window closes, but *before* the user interacts. Without a guard, the adapter marks the field dirty and re-runs validation, which resets the server-reconciled value. Fix: track autofill events separately via `animationstart` (the CSS autofill detection trick) and suppress dirty-marking for the first 500 ms post-hydration.

### Shadow DOM boundaries

Web components using shadow DOM do not expose `data-*` attributes to `document.querySelector` if the root element is inside a closed shadow root. Pass the form element reference directly as a prop rather than using a `formId` query selector, or use a `data-hydration-root` attribute on the shadow host and walk the DOM from there.

### SvelteKit's `$page.data` vs DOM attributes

SvelteKit pre-populates `$page.data` with server data, which is a cleaner SSR primitive than `data-*` attributes. However, mixing `$page.data` with DOM-attribute-based hydration in the same form causes two competing initialisation sources. See [Handling Svelte Form Hydration Mismatches](/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/) for the canonical resolution pattern.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|---|---|---|
| Input values flash to empty after page load | Check Network → JS waterfall; if bundle loads after first paint, SSR state was discarded | Verify `data-form-state` is present in the initial HTML response (View Source, not DevTools Elements) |
| Validation errors fire on untouched fields | Log `status` state; if `HYDRATED` is reached before `requestAnimationFrame` fires | Move `setStatus('hydrated')` inside `requestAnimationFrame`, never in the synchronous `useEffect` body |
| `isHydrated` flips `false → true → false → true` | React StrictMode double-invocation or bad `useEffect` deps | Add the `WeakMap` cache guard; ensure `formId` is stable (not a new string reference each render) |
| `aria-live` region announces noise on page load | ARIA updates are not gated on `isHydrated` | Wrap all `aria-live` mutations in `if (isHydrated)` or flush them in a `useEffect([isHydrated])` |
| Checksum always fails in production | Server and client use different serialisation order | Ensure `JSON.stringify` runs on a canonicalised object (sorted keys) both server and client-side |

---

## Testing and QA Hooks

### data-attribute selectors for Playwright

```typescript
// e2e/checkout-hydration.spec.ts
import { test, expect } from '@playwright/test';

test('form reaches HYDRATED state without layout shift', async ({ page }) => {
  await page.goto('/checkout');

  // Wait for the adapter to signal hydration completion via a data attribute.
  // The adapter should write data-hydration-status="hydrated" once isHydrated = true.
  await page.locator('[data-form-id="checkout"]').waitFor({ state: 'visible' });
  await expect(
    page.locator('[data-form-id="checkout"][data-hydration-status="hydrated"]')
  ).toBeVisible({ timeout: 2000 });

  // Verify no layout shift occurred (CLS budget: zero for form fields).
  const cls = await page.evaluate(() =>
    performance
      .getEntriesByType('layout-shift')
      // @ts-expect-error — LayoutShift not in all TS lib versions
      .reduce((sum: number, e: PerformanceEntry) => sum + (e as unknown as { value: number }).value, 0)
  );
  expect(cls).toBeLessThan(0.01);
});

test('checksum mismatch enters FALLBACK and suppresses validation', async ({ page }) => {
  // Intercept the server response and corrupt the checksum.
  await page.route('**/checkout', route => {
    route.fulfill({
      status: 200,
      body: (route.request().postData() ?? '').replace(
        /data-checksum="[^"]*"/,
        'data-checksum="invalid"'
      ),
    });
  });

  await page.goto('/checkout');
  await expect(
    page.locator('[data-form-id="checkout"][data-hydration-status="fallback"]')
  ).toBeVisible({ timeout: 2000 });

  // No validation errors should appear until the user types.
  await expect(page.locator('[role="alert"]')).not.toBeVisible();
});
```

### ARIA regression coverage

Wrap every `aria-invalid` and `aria-describedby` assertion in a post-hydration timing check. If the test runner evaluates ARIA state before `isHydrated` is true, the attributes are in their SSR default state and the assertion is meaningless:

```typescript
// Wait for hydration before asserting ARIA attributes.
await page.locator('[data-hydration-status="hydrated"]').waitFor();
await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'false');
```

---

## Accessibility Sync Points

SSR forms carry two conflicting accessibility timelines: the server's static ARIA state and the client's dynamic validation state. Merging them incorrectly produces announcements that confuse screen reader users.

- **Live regions:** Queue all `aria-live="polite"` updates until `status === 'hydrated'`. An `aria-live` region that receives content during the `RECONCILING` phase announces text the server already rendered, producing duplicate announcements.
- **`aria-invalid`:** Leave `aria-invalid` at its SSR value (`"false"`) throughout the `PARSING` and `RECONCILING` phases. The client must not toggle it to `"true"` before the user has touched the field.
- **Focus management:** Preserve SSR focus targets. Autofocus hijacking during the hydration window moves keyboard focus without the user's intent — block `element.focus()` calls until `isHydrated` is true.
- **`aria-busy`:** Set `aria-busy="true"` on the form element during `RECONCILING` and clear it at `HYDRATED`. This signals to assistive technology that the form's content is temporarily indeterminate.

The [dirty and pristine state tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) layer must also respect the hydration window: a field is never `dirty` during `RECONCILING`, even if the DOM value differs from the client store's initial value.

---

## Common Pitfalls

**Calling `setState` synchronously in the mount effect body.** React batches synchronous state updates in the same microtask, but if two independent effects both call `setState` targeting the same field — one from the hydration adapter and one from a parent component — the second write wins and discards the server payload. Use the `WeakMap` cache to detect and skip duplicate initialisations.

**Blocking hydration with a network call.** Fetching the validation schema from an API inside the mount effect puts the form in `PARSING` state for the full round-trip duration. Inline the schema alongside the form state in the `data-validation-schema` attribute at SSR time, or lazy-load it after `HYDRATED` so it never blocks the handshake.

**Forgetting to cancel the `requestAnimationFrame`.** If the component unmounts between the `rAF` registration and its callback, the callback fires against a detached component and the `setState` call inside it becomes a no-op — but only in React 18+. In React 17 and earlier, it throws a warning. Always call `cancelAnimationFrame(rafId)` in the `useEffect` cleanup.

**Reading `data-*` attributes before the parser has finished.** In streaming SSR (Next.js App Router, Remix), the form element may arrive in the first chunk but its `data-form-state` attribute may arrive in a later chunk. Do not query `dataset` inside a `DOMContentLoaded` handler; use the `useEffect` hook (React) or `onMount` (Svelte/Vue) so the read happens after the full component subtree is committed.

**Not scoping `document.querySelector` to a known subtree.** If two forms with different `data-form-id` values are on the same page, a race between their mount effects can cause each adapter to query the other form's element. Prefer passing the DOM element ref directly instead of a `formId` string.

---

## Frequently Asked Questions

<details>
<summary><strong>How do I prevent validation errors firing on initial SSR mount?</strong></summary>

Gate schema evaluation on `isHydrated`. The adapter's validation pipeline should check this flag before processing any field event. Use `requestAnimationFrame` inside the mount `useEffect` to flip the flag after the browser's first paint — not `setTimeout(fn, 0)`, which fires in the same frame on some browsers and before layout on others.

</details>

<details>
<summary><strong>What happens if the server and client checksums mismatch?</strong></summary>

The adapter enters `FALLBACK` state: it preserves the values already in the DOM (what the server rendered), suppresses client-initiated validation, and logs a warning for your telemetry pipeline. Client validation re-enables on the first `onChange` event, at which point the user has explicitly signalled intent to interact. This prevents silent data corruption while keeping the form usable.

</details>

<details>
<summary><strong>How do I enforce a sub-50ms hydration budget?</strong></summary>

Inline critical form state via `data-*` attributes in the SSR response rather than making a separate API call from the client. Lazy-load the full validation schema after `HYDRATED` so it does not block the `RECONCILING` → `HYDRATED` transition. If the serialised state payload exceeds ~4 KB, parse it inside a `queueMicrotask` callback to avoid blocking the main thread during the critical hydration window.

</details>

<details>
<summary><strong>Why do ARIA live regions announce noise during page load?</strong></summary>

Validation state changes that happen during `PARSING` and `RECONCILING` update the DOM before assistive technology has established a stable reading position. Queue all `aria-live` mutations in an array and flush the array in a `useEffect` that runs only when `isHydrated` transitions to `true`. This guarantees that the first announcement the user hears is a meaningful validation response to their own input, not a hydration artifact.

</details>

---

## Related

- [Handling Svelte Form Hydration Mismatches](/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/) — Svelte-specific store initialisation order issues that cause input flicker
- [React Form Hook Architecture](/framework-adapters-custom-hooks/react-form-hook-architecture/) — `useEffect` dependency discipline and deferred effect execution
- [Vue Composition API Form Adapters](/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) — reactive proxy binding without premature computed evaluation
- [Dirty and Pristine State Tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — why the hydration window must suppress dirty-marking

← [Framework Adapters & Custom Hooks](/framework-adapters-custom-hooks/)
