---
layout: page.njk
title: "Building a Form Store With useSyncExternalStore"
description: "Keep form state outside React and subscribe each field to its own slice with useSyncExternalStore: a tiny store with path subscriptions, selector stability, tearing-free concurrent rendering, and server snapshots for SSR."
slug: building-a-form-store-with-usesyncexternalstore
type: howto
breadcrumb: "useSyncExternalStore Store"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Building a Form Store With useSyncExternalStore"
  parent: "React Form Hook Architecture"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building a Form Store With useSyncExternalStore",
      "description": "Keep form state outside React and subscribe each field to its own slice with useSyncExternalStore: a tiny store with path subscriptions, selector stability, tearing-free concurrent rendering, and server snapshots for SSR.",
      "datePublished": "2026-09-18",
      "dateModified": "2026-09-18",
      "author": {
        "@type": "Organization",
        "name": "client-side-form.com"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Framework Adapters & Custom Hooks for Form State",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "React Form Hook Architecture",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Building a Form Store With useSyncExternalStore",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-form-store-with-usesyncexternalstore/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a per-field subscribable form store with useSyncExternalStore",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Keep values outside React"
        },
        {
          "@type": "HowToStep",
          "name": "Notify per path"
        },
        {
          "@type": "HowToStep",
          "name": "Return stable snapshots"
        },
        {
          "@type": "HowToStep",
          "name": "Memoise subscribe and getSnapshot"
        },
        {
          "@type": "HowToStep",
          "name": "Derive form-wide state as primitives"
        },
        {
          "@type": "HowToStep",
          "name": "Provide a server snapshot"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is this different from putting the store in React context?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Context re-renders every consumer when its value changes. Putting the store object in context is fine because that reference never changes; putting values in context is what causes cascades. Components get the store from context and subscribe to their slice with useSyncExternalStore."
          }
        },
        {
          "@type": "Question",
          "name": "Should I use Zustand or Jotai instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Both are built on the same hook and give you selectors and atoms with less code. A hand-rolled store is worth it when you want form-specific semantics — path subscriptions, dirty baselines, error slots — without adapting a general state library. Either way, the rule about stable snapshots applies."
          }
        },
        {
          "@type": "Question",
          "name": "Does this help with uncontrolled inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Uncontrolled inputs already avoid re-renders for their values. A store adds value when other components need to react to field values — derived totals, conditional fields, dirty flags — without re-rendering the fields themselves."
          }
        }
      ]
    }
  ]
}
</script>

# Building a Form Store With useSyncExternalStore

Holding a large form's values in `useState` at the top means every keystroke re-renders the whole tree; moving them into a store outside React and letting each field subscribe to only its own value turns that into a single-field re-render — and `useSyncExternalStore` is the hook React provides to do it without tearing under concurrent rendering.

The [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) describes field hooks and adapters. This page builds the storage layer beneath them: a framework-agnostic store with path-level subscriptions, and a thin React binding. It is the same design most performant form libraries use internally, and building a small one clarifies what those libraries are doing.

---

## Context and prerequisites

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` has a precise contract:

- **`subscribe(onChange)`** registers a callback and returns an unsubscribe function. React calls `onChange` → `getSnapshot` to see whether to re-render.
- **`getSnapshot()`** must return the *same* value (by `Object.is`) when nothing relevant changed. Returning a fresh object each call causes an infinite render loop.
- **`getServerSnapshot()`** provides the value during server rendering and hydration.

The performance comes from two decisions: subscriptions are **per path**, so a change to `email` only notifies subscribers of `email`; and snapshots are **primitive or stable references**, so unaffected fields bail out without rendering.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards comparing a top-level useState form, where changing email re-renders every field, with a path-subscribed store, where only the email field and components reading form-wide derived state re-render." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Who re-renders when email changes</title>
  <desc>With all values in top-level useState, changing the email re-renders the form component and all 120 field components, unless each is memoised with stable props. With a store and path subscriptions, changing email notifies only the email field&#x27;s subscription and any subscribers to derived form-wide values such as isDirty; the other 119 fields do not render.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Top-level useState</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Form re-renders.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">All 120 fields re-render unless memoised with stable props.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Store + path subscriptions</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only the email field renders.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Plus subscribers to derived values (isDirty).</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">119 fields untouched.</text>
</svg>

---

## The core pattern: a path-subscribed store and a stable hook

```typescript
type Listener = () => void;

export function createFormStore<T extends Record<string, unknown>>(initial: T) {
  let values = initial;
  const pathListeners = new Map<string, Set<Listener>>();
  const anyListeners = new Set<Listener>();

  const notify = (path: string) => {
    pathListeners.get(path)?.forEach((l) => l());
    anyListeners.forEach((l) => l());
  };

  return {
    get: <K extends keyof T>(path: K) => values[path],
    getAll: () => values,                       // stable reference until something changes
    set<K extends keyof T>(path: K, value: T[K]) {
      if (Object.is(values[path], value)) return;          // no-op writes notify nobody
      values = { ...values, [path]: value };               // new top-level ref for getAll()
      notify(path as string);
    },
    subscribePath(path: keyof T, l: Listener) {
      const key = path as string;
      if (!pathListeners.has(key)) pathListeners.set(key, new Set());
      pathListeners.get(key)!.add(l);
      return () => { pathListeners.get(key)!.delete(l); };
    },
    subscribeAll(l: Listener) {
      anyListeners.add(l);
      return () => { anyListeners.delete(l); };
    },
  };
}
export type FormStore<T extends Record<string, unknown>> = ReturnType<typeof createFormStore<T>>;
```

```tsx
import { useCallback, useSyncExternalStore } from "react";

// One field subscribes to exactly one path. The snapshot is the field's own
// value — a primitive for text inputs — so unrelated changes never render it.
export function useFieldValue<T extends Record<string, unknown>, K extends keyof T>(store: FormStore<T>, path: K) {
  const subscribe = useCallback((l: () => void) => store.subscribePath(path, l), [store, path]);
  const getSnapshot = useCallback(() => store.get(path), [store, path]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Derived, form-wide values subscribe to everything but return a primitive,
// so they only re-render when the derived answer actually flips.
export function useIsDirty<T extends Record<string, unknown>>(store: FormStore<T>, baseline: T) {
  const getSnapshot = useCallback(
    () => Object.keys(baseline).some((k) => !Object.is(store.get(k as keyof T), baseline[k])),
    [store, baseline],
  );
  return useSyncExternalStore(store.subscribeAll, getSnapshot, getSnapshot);
}

export function TextField({ store, name, label }: { store: FormStore<any>; name: string; label: string }) {
  const value = useFieldValue(store, name) as string;
  return (
    <>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} value={value} onChange={(e) => store.set(name, e.target.value)} />
    </>
  );
}
```

---

## Step-by-step walkthrough

1. **Keep values outside React.** The store is a plain object with methods; it can be created per form instance and passed down via props or a context that holds only the (stable) store reference, never values — the separation described in [splitting form context to stop cascading re-renders](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/splitting-form-context-to-stop-cascading-renders/).
2. **Notify per path.** A `Map<path, Set<listener>>` lets `set("email")` wake only email subscribers plus any "all" subscribers.
3. **Return stable snapshots.** A field's snapshot is its value; primitives compare by value, objects by reference. Never build a new object in `getSnapshot`.
4. **Memoise `subscribe` and `getSnapshot`.** New function identities on every render make React resubscribe each time; `useCallback` keyed on store and path avoids it.
5. **Derive form-wide state as primitives.** `isDirty`, `errorCount` and `canSubmit` subscribe to all changes but return booleans or numbers, so they render only when the answer changes.
6. **Provide a server snapshot.** Passing `getSnapshot` as the third argument works when the store is created with the same initial values on server and client; otherwise hydration mismatches, as in [preventing hydration mismatch in Next.js forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/preventing-hydration-mismatch-in-nextjs-forms/).

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a keystroke in the email field calling store.set, the store notifying the email path listeners and all-listeners, React calling getSnapshot for each, and only components whose snapshot changed re-rendering." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One keystroke through the store</title>
  <desc>The email input&#x27;s change handler calls store.set with the new value. The store replaces its values object and notifies listeners registered for the email path and listeners registered for all changes. React calls getSnapshot for each notified subscription. The email field&#x27;s snapshot changed, so it re-renders. The isDirty hook&#x27;s snapshot is recomputed but is still true, so it does not re-render. No other field was notified at all.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="390.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">onChange → store.set(&quot;email&quot;, v)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No-op writes return early.</text>
  <text x="434.4" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Object.is guard skips identical values.</text>
  <path d="M209.2,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="205.2,89.0 209.2,96.0 213.2,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="390.4" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">notify(&quot;email&quot;)</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">email listeners + all-listeners.</text>
  <text x="434.4" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Other paths&#x27; listeners are not called.</text>
  <path d="M209.2,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="205.2,174.0 209.2,181.0 213.2,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="390.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">getSnapshot per subscription</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Compared with Object.is.</text>
  <text x="434.4" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">isDirty: still true → no render.</text>
  <path d="M209.2,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="205.2,259.0 209.2,266.0 213.2,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="390.4" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Email field re-renders</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only this component.</text>
  <text x="434.4" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The other fields never learned anything happened.</text>
</svg>

### Adding errors and flags to the same store

Values are only one of the things fields read. Errors, touched flags and pending-async markers follow the same rule: store each under its own path (`errors.email`, `touched.email`) and let the field subscribe to the three paths it needs. A field component then renders when its value, its error or its touched flag changes — and never when a neighbour's does. Keeping these in the same store rather than in separate React state means validators, the error summary and the submit gate all read one consistent snapshot, which removes a class of bugs where the summary shows an error that the field has already cleared.

---

## Failure modes and edge cases

### 1. Infinite loop from an unstable snapshot

`getSnapshot: () => ({ value: store.get(path) })` returns a new object every call; React sees a change every time and re-renders forever (React warns "The result of getSnapshot should be cached"). Return the value itself, or cache derived objects by input.

### 2. Nested paths

A flat `Record<string, unknown>` with dotted keys (`"address.city"`) is the simplest way to support nested fields with path subscriptions. If you store nested objects, `set` must copy each level on the way down, and path subscribers for parents (`address`) must be notified when a child changes.

### 3. Mutating the values object

Assigning `values[path] = v` in place keeps `getAll()` returning the same reference, so subscribers to the whole form never see a change. Always replace the top-level object on write.

### 4. Validation inside `set`

Running a schema on every `set` makes each keystroke as slow as validation. Store errors in the same store under their own paths, and run validators on the timing described in [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/), writing results with `set`.

### 5. Concurrent rendering and transitions

`useSyncExternalStore` forces synchronous rendering when the store changes during a transition, which is what prevents tearing (two components showing different versions of the same value). It also means store updates cannot be deferred with `startTransition`; keep expensive derived UI behind `useDeferredValue` on the snapshot instead.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of getSnapshot implementations with whether each is stable and how the component re-renders." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Snapshot choices and their re-render behaviour</title>
  <desc>Returning the field&#x27;s primitive value is stable and re-renders only when the value changes. Returning the whole values object is stable between writes but re-renders on every change to any field. Returning a new object literal built in getSnapshot is unstable and causes an infinite render loop. Returning a derived boolean such as isDirty is stable and re-renders only when the boolean flips.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">getSnapshot returns</text>
  <text x="272.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stable?</text>
  <text x="396.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Re-renders when</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">the field&#x27;s primitive value</text>
  <text x="272.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="396.6" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">that value changes</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">store.getAll()</text>
  <text x="272.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">between writes</text>
  <text x="396.6" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">any field changes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">{ value } built each call</text>
  <text x="272.4" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="396.6" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">forever (loop)</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">derived boolean (isDirty)</text>
  <text x="272.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="396.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">the answer flips</text>
</svg>

---

## Verification checklist

- [ ] Typing in one field re-renders only that field (React DevTools highlight updates).
- [ ] `getSnapshot` never allocates a new object for unchanged state.
- [ ] `subscribe` and `getSnapshot` are memoised per store and path.
- [ ] Writes that do not change a value notify no one.
- [ ] Form-wide derived values render only when their answer changes.
- [ ] Server and client produce the same initial snapshot; no hydration warnings.
- [ ] Unmounted fields unsubscribe (listener counts return to their previous size).

---

## Frequently Asked Questions

<details>
<summary><strong>How is this different from putting the store in React context?</strong></summary>

Context re-renders every consumer when its value changes. Putting the *store object* in context is fine because that reference never changes; putting *values* in context is what causes cascades. Components get the store from context and subscribe to their slice with `useSyncExternalStore`.

</details>

<details>
<summary><strong>Should I use Zustand or Jotai instead?</strong></summary>

Both are built on the same hook and give you selectors and atoms with less code. A hand-rolled store is worth it when you want form-specific semantics — path subscriptions, dirty baselines, error slots — without adapting a general state library. Either way, the rule about stable snapshots applies.

</details>

<details>
<summary><strong>Does this help with uncontrolled inputs?</strong></summary>

Uncontrolled inputs already avoid re-renders for their values. A store adds value when other components need to react to field values — derived totals, conditional fields, dirty flags — without re-rendering the fields themselves.

</details>

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
- [Custom useFormField Hook Performance Tuning](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/custom-useformfield-hook-performance-tuning/)
- [Memoization Boundaries for Form Fields](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/memoization-boundaries-for-form-fields/)

← [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
