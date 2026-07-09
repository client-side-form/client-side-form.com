---
layout: page.njk
title: "Performance and Scale for Large Forms"
description: "Profiling and rendering forms with 100+ fields without input lag — render budgets, subscription isolation, memoization boundaries, virtualization, and off-main-thread validation."
slug: performance-and-scale-for-large-forms
type: topic
breadcrumb: "Performance & Scale"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Performance and Scale for Large Forms"
  parent: "Form State Fundamentals"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Performance and Scale for Large Forms",
      "description": "Profiling and rendering forms with 100+ fields without input lag — render budgets, subscription isolation, memoization boundaries, virtualization, and off-main-thread validation.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Performance and Scale for Large Forms", "item": "https://client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep a large form responsive under input load",
      "step": [
        { "@type": "HowToStep", "name": "Measure input latency", "text": "Instrument the input-to-paint path with performance.now() and the Long Tasks API to find where the budget is spent." },
        { "@type": "HowToStep", "name": "Isolate subscriptions", "text": "Give each field a selector subscription so a keystroke re-renders only the field that changed, not the whole tree." },
        { "@type": "HowToStep", "name": "Place memoization boundaries", "text": "Wrap field components in a memo boundary keyed on the field's own slice so sibling updates are skipped." },
        { "@type": "HowToStep", "name": "Virtualize long fieldsets", "text": "Render only the fields inside the viewport plus an overscan buffer; keep off-screen values in the store." },
        { "@type": "HowToStep", "name": "Move heavy validation off the main thread", "text": "Run expensive schema traversal in a Web Worker and post normalized errors back to the store." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does typing in one field re-render every other field?",
          "acceptedAnswer": { "@type": "Answer", "text": "Because the whole form reads from one shared state object. Every keystroke produces a new state reference, and any component subscribed to that object re-renders. Fix it by giving each field a selector that subscribes only to its own slice, so an update to values.email never notifies the component reading values.phone." }
        },
        {
          "@type": "Question",
          "name": "At what field count do I need virtualization?",
          "acceptedAnswer": { "@type": "Answer", "text": "There is no fixed number, but mount cost becomes the dominant metric once you exceed roughly 150 to 200 rendered inputs. Before that, subscription isolation and memoization solve the keystroke-latency problem. Reach for virtualization when the initial mount or a full re-render exceeds your frame budget even with isolated subscriptions." }
        },
        {
          "@type": "Question",
          "name": "How do I measure input latency in a form?",
          "acceptedAnswer": { "@type": "Answer", "text": "Record performance.now() in the input event handler and again in a requestAnimationFrame callback scheduled from that handler. The delta approximates input-to-next-paint. Cross-reference with the Long Tasks API (PerformanceObserver for 'longtask' entries) to catch any task over 50ms that blocks the main thread." }
        },
        {
          "@type": "Question",
          "name": "Does moving validation to a Web Worker help input latency?",
          "acceptedAnswer": { "@type": "Answer", "text": "It helps when validation is CPU-bound — large Zod schemas, cross-field graphs, or regex over long strings — because that work no longer competes with input handling on the main thread. It does not help when latency comes from rendering; a Worker cannot re-render your fields. Profile first to see whether the long task is in validation or in reconciliation." }
        }
      ]
    }
  ]
}
</script>

# Performance and Scale for Large Forms

A form with a dozen fields forgives almost any architecture. A form with three hundred — an insurance application, a tax return, a bulk product editor — punishes every shortcut. The failure is always the same shape: the user types, and the character appears a beat late. That beat is a dropped frame, and on large forms it compounds until every keystroke feels like wading. The cause is almost never the input handler itself; it is the blast radius of the state update the handler triggers, the reconciliation work that update forces, and occasionally a synchronous validator hogging the main thread while the browser waits to paint.

This page is about keeping input latency inside a frame budget as field count grows. It covers how to measure the input-to-paint path, why the [controlled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) pattern creates render pressure at scale, how field-level subscription stores contain that pressure, where to draw memoization boundaries, when to virtualize long fieldsets, and how to move expensive validation off the main thread. It sits under [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/) and assumes you already have a working state machine — the problem here is not correctness but throughput.

---

## Problem Statement

Input latency on a large form is a budget problem. The browser has roughly 16.7ms to turn a keystroke into a painted frame at 60fps; on a 120Hz display that shrinks to 8.3ms. Inside that window the runtime must run your input handler, apply the state update, reconcile the affected component tree, run layout, and paint. If the sum exceeds the budget, the frame drops and latency becomes visible.

The naive controlled form spends that budget carelessly. One shared state object holds every field's value. Each keystroke replaces that object, and every component subscribed to it re-renders — three hundred field components reconciling because one of them changed a character. Even if each field's render is cheap, three hundred cheap renders in one synchronous pass will blow an 8ms budget. Add a synchronous schema validation that walks the whole object on every change, and the main thread stalls long enough to drop several frames in a row.

The techniques below attack the budget from three angles: **shrink the blast radius** so one keystroke touches one field, **skip work** at memoization boundaries so unaffected subtrees never reconcile, and **evict work from the critical path** by virtualizing off-screen fields and running heavy validation on a Worker.

---

## Render Budget and Data Flow

The mental model that keeps a large form fast is a single input event fanning out to exactly the fields that subscribe to what changed — and nothing else. The diagram below traces one keystroke through an isolated subscription store and shows where the budget is spent.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Render budget data flow: an input event updates one store slice, which notifies only the subscribed field while other fields are skipped, all within a 16 millisecond frame budget" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Render Budget Data Flow for a Single Keystroke</title>
  <desc>A keystroke enters the input handler, updates one slice of the subscription store, and notifies only the subscribed field component. Two sibling fields are skipped at their memo boundaries. The whole path must complete inside a 16 millisecond frame budget.</desc>
  <defs>
    <marker id="arr-perf" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.75"/>
    </marker>
  </defs>
  <rect width="760" height="360" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- Frame budget banner -->
  <rect x="30" y="24" width="700" height="30" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5"/>
  <text x="380" y="43" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor" opacity="0.8">frame budget: 16.7ms @ 60fps  ·  8.3ms @ 120Hz  —  the entire path below must fit inside it</text>
  <!-- input event -->
  <rect x="40" y="100" width="130" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="105" y="122" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">input event</text>
  <text x="105" y="139" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">1 keystroke</text>
  <!-- store slice update -->
  <rect x="250" y="100" width="150" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="325" y="122" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">store.setField</text>
  <text x="325" y="139" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">writes slice[email]</text>
  <!-- notifier -->
  <rect x="480" y="100" width="150" height="50" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="555" y="122" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">notify(email)</text>
  <text x="555" y="139" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">selector diff</text>
  <!-- subscribed field (re-renders) -->
  <rect x="480" y="215" width="150" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.75"/>
  <text x="555" y="237" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">Field: email</text>
  <text x="555" y="254" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.7">re-renders ✓</text>
  <!-- skipped siblings -->
  <rect x="250" y="215" width="150" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="5 3"/>
  <text x="325" y="237" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor" opacity="0.6">Field: phone</text>
  <text x="325" y="254" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.55">skipped at memo</text>
  <rect x="40" y="215" width="150" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="5 3"/>
  <text x="115" y="237" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor" opacity="0.6">Field: address</text>
  <text x="115" y="254" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.55">skipped at memo</text>
  <!-- paint -->
  <rect x="480" y="300" width="150" height="42" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.55"/>
  <text x="555" y="326" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">layout + paint</text>
  <!-- arrows -->
  <line x1="170" y1="125" x2="242" y2="125" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-perf)"/>
  <line x1="400" y1="125" x2="472" y2="125" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-perf)"/>
  <line x1="555" y1="150" x2="555" y2="207" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-perf)"/>
  <line x1="555" y1="267" x2="555" y2="292" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-perf)"/>
  <!-- notify does NOT reach siblings: faint blocked links -->
  <line x1="505" y1="150" x2="360" y2="207" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.25" stroke-dasharray="3 4"/>
  <line x1="500" y1="150" x2="175" y2="207" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.25" stroke-dasharray="3 4"/>
  <text x="300" y="185" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.55">no subscription match → no notification</text>
</svg>

The budget table below is the target every technique on this page serves. Numbers assume a mid-tier laptop; halve them for a throttled mobile CPU.

| Stage | Target budget (60fps) | What blows it | Primary fix |
|-------|----------------------|---------------|-------------|
| Input handler | < 1ms | Synchronous validation inside `onChange` | Debounce/defer validation off the handler |
| State update | < 1ms | Deep-cloning the whole values object | Update one slice, keep the rest referentially stable |
| Reconciliation | < 8ms | Every field re-rendering on one keystroke | Subscription isolation + memo boundaries |
| Layout + paint | < 4ms | Hundreds of mounted DOM inputs | Virtualize off-screen fieldsets |
| Heavy validation | off critical path | Blocking schema traversal on the main thread | Run in a Web Worker, post errors back |

---

## Why Controlled Forms Re-render

A controlled form binds each input's value to a slice of a shared state object and writes back on every change. The convenience — validation, formatting, and conditional logic all read live values — comes with a structural cost: the state object is a single subscription target. When the update replaces that object, any consumer that read from it is notified, regardless of which key changed. This is not a framework bug; it is the direct consequence of subscribing a whole tree to one reference.

You can confirm this is your bottleneck rather than guessing. React's Profiler flamegraph shows every field committing on a single keystroke; Vue's performance timeline shows a component patch fanning across the whole form. If the flamegraph is wide — many sibling components in one commit — the fix is subscription isolation. If it is tall — one component doing expensive work — the fix is memoization or moving that work off-thread. Diagnose before you optimize; the two problems have different cures and applying the wrong one adds complexity without moving the number.

---

## Subscription Isolation with a Field-Level Store

The structural fix is to stop subscribing components to the whole state object and instead let each field subscribe to a selector over its own slice. A field is notified only when the value it selects actually changes. The store below is framework-agnostic; a React or Vue adapter wraps `subscribe` in `useSyncExternalStore` or a reactive effect — see [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) for the hook layer that consumes it.

```typescript
// A field-level subscription store: writes touch one slice, notifications
// are scoped to the selectors whose output actually changed.
type Listener = () => void;

interface FieldStore<T extends Record<string, unknown>> {
  getField<K extends keyof T>(key: K): T[K];
  setField<K extends keyof T>(key: K, value: T[K]): void;
  // subscribe returns an unsubscribe handle; the selector picks the slice
  // this listener cares about so unrelated writes never wake it.
  subscribe<S>(selector: (state: T) => S, onChange: (next: S) => void): () => void;
  snapshot(): Readonly<T>;
}

function createFieldStore<T extends Record<string, unknown>>(initial: T): FieldStore<T> {
  let state: T = { ...initial };

  // Each subscription records its selector and its last selected value, so
  // notify() can skip listeners whose slice is unchanged (Object.is compare).
  type Sub<S> = { selector: (s: T) => S; last: S; onChange: (n: S) => void };
  // A Set keeps insertion cheap and iteration order stable; we never key by
  // field name here because one listener may span several fields via its selector.
  const subs = new Set<Sub<unknown>>();

  function notify(): void {
    for (const sub of subs) {
      const next = sub.selector(state);
      // Only fire the listener when its selected value changed. This is what
      // stops a keystroke in `email` from re-rendering the `phone` field.
      if (!Object.is(next, sub.last)) {
        sub.last = next;
        sub.onChange(next);
      }
    }
  }

  return {
    getField(key) {
      return state[key];
    },
    setField(key, value) {
      if (Object.is(state[key], value)) return; // no-op writes never notify
      // Replace only the changed key; every other slice keeps its reference,
      // so field selectors reading unchanged slices short-circuit in notify().
      state = { ...state, [key]: value };
      notify();
    },
    subscribe(selector, onChange) {
      const sub: Sub<unknown> = {
        selector: selector as (s: T) => unknown,
        last: selector(state),
        onChange: onChange as (n: unknown) => void,
      };
      subs.add(sub);
      // Caller MUST invoke this in cleanup (useEffect return / onUnmounted)
      // or the store retains the component closure after unmount.
      return () => subs.delete(sub);
    },
    snapshot() {
      return state;
    },
  };
}
```

The critical property is in `setField`: it replaces exactly one key and preserves the reference of every other slice. A field component that subscribes with `state => state.phone` gets a selected value that is `Object.is`-identical after an `email` write, so `notify()` skips it. The blast radius of a keystroke collapses from the whole form to one field. This is the same principle behind [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/), where a per-field `Set` avoids whole-object equality — here the per-field selector avoids whole-tree re-rendering.

---

## Memoization Boundaries

Subscription isolation stops the store from *notifying* unrelated fields, but the framework can still re-render a child because its parent re-rendered. A memo boundary is what makes a child ignore a parent render when the child's own inputs are unchanged. The rule is precise: memoize the field component, and make sure every prop crossing that boundary is referentially stable, or the boundary leaks and the memo is a no-op.

The two most common leaks are inline event handlers and object props recreated on each parent render. A handler defined as `onChange={v => store.setField('email', v)}` is a new function every render, so a memoized child sees a changed prop and re-renders anyway. Bind the handler once — via the store's stable `setField` plus a stable field key — so the boundary holds. The full treatment of where to place these boundaries and how to keep handlers stable is in [memoization boundaries for form fields](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/memoization-boundaries-for-form-fields/); the short version is that the boundary belongs at the field component, keyed on the field's own slice, with handlers hoisted out of render.

Vue's equivalent is a `computed` per field over the store plus a component that only reads that computed — the reactivity graph gives you the same skip for free, provided you do not spread the whole form state into a child's props.

---

## Virtualizing Long Fieldsets

Isolation and memoization fix keystroke latency but not mount cost. Three hundred mounted `<input>` elements are three hundred DOM nodes, layout boxes, and attached listeners; the initial mount and any full re-render (theme change, locale switch) pay for all of them. Virtualization renders only the fields inside the viewport plus a small overscan buffer, keeping off-screen values in the store where they stay valid and submittable.

The pattern is a windowed list keyed on a stable field id, with each row reading its own slice from the field store. Because values live in the store rather than in component state, scrolling a field out of view and back does not lose data — the remounted row reads the current value on mount. The concrete windowing implementation, including how to defer initialization of non-visible fieldsets so the first paint is cheap, is covered in [rendering 100+ field forms without jank](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/rendering-100-plus-field-forms-without-jank/).

Two caveats matter for correctness. First, native form submission (`FormData` from the form element) only sees mounted inputs, so a virtualized form must submit from the store snapshot, not from the DOM. Second, in-page find (Ctrl+F) and anchor-jump-to-error cannot reach an unmounted field; wire your error-summary links to scroll the virtualizer to the target field before focusing it, so [error state mapping](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) still lands focus on the right input.

---

## Off-Main-Thread Validation

When profiling shows the long task is validation rather than rendering — a large [Zod schema](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/), a cross-field dependency graph, or regex over long strings — the fix is to evict that work from the main thread entirely. A Web Worker runs the schema and posts normalized errors back; the input handler stays under budget because it no longer waits for validation to finish.

```typescript
// Main-thread side: dispatch values to a worker, receive normalized errors.
// Each round carries a monotonic id so a stale reply can be discarded.
interface ValidateRequest { id: number; values: Record<string, unknown>; }
interface ValidateReply { id: number; errors: Record<string, string>; }

function createWorkerValidator(worker: Worker) {
  let latest = 0;
  let onErrors: (errors: Record<string, string>) => void = () => {};

  worker.addEventListener('message', (e: MessageEvent<ValidateReply>) => {
    // Discard any reply that is not for the most recent request. Without this
    // guard a slow earlier validation can overwrite a newer, correct result.
    if (e.data.id !== latest) return;
    onErrors(e.data.errors);
  });

  return {
    validate(values: Record<string, unknown>) {
      const id = ++latest;
      worker.postMessage({ id, values } satisfies ValidateRequest);
    },
    onResult(cb: (errors: Record<string, string>) => void) {
      onErrors = cb;
    },
    destroy() {
      // Terminate releases the worker thread and its heap; always call this
      // on unmount or the worker leaks for the page's lifetime.
      worker.terminate();
    },
  };
}
```

Two rules keep this from introducing new bugs. First, tag every request with a monotonic id and drop replies that are not the latest — a Worker is asynchronous, so a slow earlier validation can otherwise clobber a newer result, exactly the stale-result race that [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) also guards against. Second, a Worker only helps CPU-bound validation; if the long task is reconciliation, the Worker sits idle while the main thread still stalls. Profile before reaching for it.

---

## Edge Cases and Failure Modes

**Referential instability defeats every memo.** A single object literal prop — `style={{}}`, `rules={[...]}` — recreated each render invalidates the child's memo and re-renders the whole windowed list. Hoist stable props out of render or memoize them.

**Debounced validation fires after unmount.** On a virtualized form, a field scrolled out of view unmounts while its debounce timer is pending; the timer then writes into a dead component. Clear timers in cleanup and route results through the store, not component state.

**Autofill floods the store.** Browser autofill dispatches many `change` events in one tick. With unbatched `setField`, that is many notify passes in a frame. Batch autofill writes into a single `setState`-style transaction, or coalesce with a microtask.

**Selectors that allocate break isolation.** A selector returning a fresh object (`state => ({ v: state.email })`) is never `Object.is`-equal to its previous output, so the listener fires on every write. Return the raw slice, or use a shallow-equal comparator in the subscription.

**Worker serialization cost exceeds validation savings.** For small value sets, `postMessage` structured-clone overhead can cost more than validating on the main thread. Only offload when the schema traversal itself is the measured long task.

---

## Troubleshooting Reference

| Scenario | Diagnostic | Recovery |
|----------|-----------|----------|
| Typing lags on a 200-field form | React Profiler shows a wide commit — every field in one pass | Move to a field-level subscription store; verify only the typed field commits |
| One field is slow, rest are fine | Flamegraph is tall on one component | Memoize expensive children; move heavy validation to a Worker |
| Memo boundary never skips | Log prop identity across renders; a handler or object prop changes each time | Hoist handlers via stable `setField`; memoize object props |
| Initial mount janks before any input | Long Tasks API shows a >50ms task at mount | Virtualize the fieldset; defer non-visible section init |
| Stale errors flash after fast typing | Worker replies arrive out of order | Tag requests with a monotonic id; drop non-latest replies |

---

## Testing and QA Hooks

Expose the metrics your budget targets as `data-*` attributes so Playwright can assert on them without scraping the profiler. Instrument the input-to-paint delta and publish it alongside a render counter per field.

```typescript
// Publish per-field render counts and last input latency for E2E assertions.
// Increment in each field's render; sample latency in the input handler.
function markFieldRender(el: HTMLElement, count: number): void {
  el.dataset.renderCount = String(count);
}

function measureInputLatency(el: HTMLElement): void {
  const start = performance.now();
  // requestAnimationFrame fires just before the next paint, so the delta
  // approximates input-to-next-paint for this keystroke.
  requestAnimationFrame(() => {
    el.dataset.inputLatencyMs = (performance.now() - start).toFixed(2);
  });
}
```

```typescript
// Playwright: assert that typing in one field does not re-render its sibling.
const before = await page.locator('[name="phone"]').getAttribute('data-render-count');
await page.fill('[name="email"]', 'user@example.com');
const after = await page.locator('[name="phone"]').getAttribute('data-render-count');
expect(after).toBe(before); // sibling never re-rendered

// Assert input latency stayed within a frame budget.
const latency = Number(await page.locator('[name="email"]').getAttribute('data-input-latency-ms'));
expect(latency).toBeLessThan(16);
```

For accessibility regression, confirm virtualization does not strip the error summary's link targets: an [error summary](https://www.client-side-form.com/accessibility-and-error-ux/) link must still scroll-and-focus a field that is currently unmounted, and screen-reader field counts must reflect the logical form, not the windowed subset.

---

## Common Pitfalls

**Optimizing before profiling.** A wide flamegraph and a tall one need opposite fixes. Read the profiler first; do not scatter `React.memo` across a form whose real bottleneck is a blocking validator.

**Subscribing the whole tree to one store value.** The default `useContext`/`useStore()` that returns the entire state object re-renders every consumer. Always subscribe through a selector.

**Virtualizing a form that submits from the DOM.** Windowed inputs are not all mounted, so `new FormData(formEl)` loses off-screen values. Submit from the store snapshot.

**Leaving Web Workers un-terminated.** A Worker created per form instance but never terminated leaks a thread and its heap for the page's lifetime. Call `terminate()` in teardown.

---

## Frequently Asked Questions

<details>
<summary><strong>Why does typing in one field re-render every other field?</strong></summary>

Because the whole form reads from one shared state object. Every keystroke produces a new state reference, and any component subscribed to that object re-renders. Fix it by giving each field a selector that subscribes only to its own slice, so an update to `values.email` never notifies the component reading `values.phone`. The subscription store on this page implements exactly that: `setField` replaces one key and keeps every other slice referentially stable, and `notify()` skips any listener whose selected value is `Object.is`-unchanged.

</details>

<details>
<summary><strong>At what field count do I need virtualization?</strong></summary>

There is no fixed number, but mount cost becomes the dominant metric once you exceed roughly 150 to 200 rendered inputs. Below that, subscription isolation and memoization solve the keystroke-latency problem without windowing. Reach for virtualization when the initial mount or a full re-render exceeds your frame budget even with isolated subscriptions — measure it with the Long Tasks API rather than guessing from field count alone.

</details>

<details>
<summary><strong>How do I measure input latency in a form?</strong></summary>

Record `performance.now()` in the input event handler and again inside a `requestAnimationFrame` callback scheduled from that handler; the delta approximates input-to-next-paint. Cross-reference with the Long Tasks API — a `PerformanceObserver` watching `'longtask'` entries — to catch any task over 50ms that blocks the main thread. If a long task lines up with your keystrokes, that task is your latency, and the flamegraph tells you whether it is rendering or validation.

</details>

<details>
<summary><strong>Does moving validation to a Web Worker help input latency?</strong></summary>

It helps when validation is CPU-bound — large schemas, cross-field graphs, or regex over long strings — because that work stops competing with input handling on the main thread. It does not help when latency comes from rendering; a Worker cannot re-render your fields. Profile first: if the long task is in reconciliation, isolate subscriptions and add memo boundaries instead, and keep the Worker for genuinely expensive validation.

</details>

---

## Related

- [Rendering 100+ Field Forms Without Jank](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/rendering-100-plus-field-forms-without-jank/) — windowing, uncontrolled inputs with subscription reads, deferred fieldset init
- [Memoization Boundaries for Form Fields](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/memoization-boundaries-for-form-fields/) — where to place memo/selector boundaries and how to keep handlers referentially stable
- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — the value-ownership choice that drives render pressure
- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) — the hook layer that consumes a subscription store

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
