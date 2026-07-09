---
layout: section.njk
title: "Framework Adapters & Custom Hooks for Form State"
description: "Architecture guide for building framework adapters and custom hooks that manage form state across React, Vue, and Svelte — covering state lifecycles, validation pipelines, SSR hydration, and memory teardown."
slug: framework-adapters-custom-hooks
type: section
breadcrumb: "Framework Adapters & Custom Hooks"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Framework Adapters"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Framework Adapters & Custom Hooks for Form State",
      "description": "Architecture guide for building framework adapters and custom hooks that manage form state across React, Vue, and Svelte — covering state lifecycles, validation pipelines, SSR hydration, and memory teardown.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" },
      "publisher": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a framework adapter for form state",
      "step": [
        { "@type": "HowToStep", "name": "Define a typed FormStateAdapter interface", "text": "Declare getValue, setValue, validate, reset, subscribe, and destroy as the public contract every framework implementation must fulfil." },
        { "@type": "HowToStep", "name": "Implement lifecycle state machine", "text": "Model IDLE, VALIDATING, DIRTY, PRISTINE, SUBMITTING, SUCCESS, and ERROR as an explicit discriminated union so transitions are exhaustively handled." },
        { "@type": "HowToStep", "name": "Wire validation pipeline with AbortController", "text": "Debounce async validators, guard against stale responses with sequence IDs, and cancel in-flight requests on field change." },
        { "@type": "HowToStep", "name": "Propagate errors to ARIA attributes", "text": "Keep aria-invalid and aria-describedby in sync with error state on every transition — not just on blur." },
        { "@type": "HowToStep", "name": "Implement teardown", "text": "Return a destroy() function from every hook that unsubscribes validators, clears timers, aborts pending requests, and removes event listeners." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is a form state adapter?",
          "acceptedAnswer": { "@type": "Answer", "text": "A form state adapter is a thin translation layer that maps a framework's native reactivity model (React state, Vue refs, Svelte stores) onto a shared FormStateAdapter interface. This keeps validation logic, error mapping, and submission orchestration framework-agnostic." }
        },
        {
          "@type": "Question",
          "name": "How do you prevent memory leaks in custom form hooks?",
          "acceptedAnswer": { "@type": "Answer", "text": "Return a destroy() function that calls AbortController.abort(), clears debounce timers, unsubscribes store listeners, and removes DOM event listeners. In React hooks call it from useEffect's return; in Vue call it from onUnmounted; in Svelte from onDestroy." }
        },
        {
          "@type": "Question",
          "name": "When should async validators use AbortController vs sequence IDs?",
          "acceptedAnswer": { "@type": "Answer", "text": "AbortController cancels in-flight fetch requests at the network level and is the right default for HTTP-based validators. Sequence IDs are a fallback when using third-party clients that do not expose a cancellation token — increment a counter and discard resolved values whose sequence does not match the latest." }
        },
        {
          "@type": "Question",
          "name": "How do framework adapters handle SSR hydration mismatches?",
          "acceptedAnswer": { "@type": "Answer", "text": "The server renders markup from initial values. On the client, the adapter must initialise state from those same values before mounting — typically by reading a serialised JSON payload embedded in the page. Any mismatch between server markup and client initial state causes React/Vue/Svelte to replace DOM nodes on hydration, losing focus, triggering spurious dirty flags, and breaking ARIA attributes." }
        }
      ]
    }
  ]
}
</script>

# Framework Adapters & Custom Hooks for Form State

Every serious form implementation eventually collides with the same set of production failures: a validation callback fires on an already-unmounted component, an async uniqueness check resolves for a field the user has already changed, SSR markup diverges from client state during hydration and breaks ARIA attributes, or a subscription leak silently grows memory across SPA navigation. None of these are bugs in a specific library — they are architectural gaps in how form state crosses the boundary between a framework's reactivity model and the generic logic that drives validation, submission, and error display.

This guide covers the adapter and hook patterns that prevent those failures. It assumes you are debugging a production system, not building your first form.

## The Architecture Problem: Reactivity Models Diverge, Contracts Must Not

React's `useState` and `useReducer`, Vue 3's `ref`/`reactive` proxies, and Svelte's writable stores are fundamentally different reactivity primitives. A validation pipeline written directly against one of them is not portable and cannot be unit-tested independently of the rendering engine.

The solution is a typed `FormStateAdapter` interface that every framework implementation satisfies. The adapter owns the translation between native reactivity and a stable public contract. Business logic — [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) orchestration, [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/), and [error state mapping](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — operates against the interface, not the framework.

```typescript
export interface FormStateAdapter<T extends Record<string, unknown>> {
  /** Read current snapshot — cheap, synchronous, no side effects. */
  getState: () => FormSnapshot<T>;
  /** Update a single field value. Pass shouldValidate to trigger async pipeline. */
  setValue: (field: keyof T, value: unknown, shouldValidate?: boolean) => void;
  /** Run the full validation pipeline. Resolves to an error map (empty on success). */
  validate: () => Promise<Record<keyof T, string | undefined>>;
  /**
   * Reset to initial values.
   * 'shallow' reverts top-level fields; nested object references are preserved.
   * 'deep' clones the initial payload, clearing all mutation history and caches.
   */
  reset: (strategy: 'shallow' | 'deep') => void;
  /** Subscribe to state changes. Returns an unsubscribe function — always call it. */
  subscribe: (listener: (state: FormSnapshot<T>) => void) => () => void;
  /**
   * Teardown: abort in-flight requests, clear timers, remove listeners.
   * Must be called on component unmount / route change.
   */
  destroy: () => void;
}

export type FormSnapshot<T extends Record<string, unknown>> = {
  values: T;
  /** Lifecycle phase — drives UI chrome (spinner, disabled submit, error summary). */
  phase: FormPhase;
  errors: Partial<Record<keyof T, string>>;
  /** Per-field dirty flag — set on first user-driven change, cleared by reset. */
  dirtyFields: Partial<Record<keyof T, boolean>>;
};

export type FormPhase =
  | { status: 'idle' }
  | { status: 'validating'; field?: string }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; reason: string };
```

The `phase` discriminated union is the most important part. When UI components subscribe to it they can exhaustively switch on `status` — the TypeScript compiler enforces that every state is handled. A plain boolean like `isSubmitting` cannot represent the full state space and leads to impossible UI combinations (e.g. `isSubmitting && isSuccess` both true).

## State Machine Overview

The diagram below shows the lifecycle transitions that every adapter implementation must honour. The `DIRTY` and `PRISTINE` labels describe the field-level mutation flag rather than a top-level phase; they coexist with the submission phase.

<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Form state machine: transitions between IDLE, VALIDATING, SUBMITTING, SUCCESS, and ERROR phases" style="max-width:100%;height:auto;display:block;margin:1.5rem auto;">
  <title>Form lifecycle state machine</title>
  <desc>Diagram showing form state transitions: IDLE receives user input and moves to VALIDATING; VALIDATING moves to IDLE (with errors) on failure or SUBMITTING on success; SUBMITTING moves to SUCCESS or ERROR; ERROR and SUCCESS both return to IDLE on reset.</desc>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 Z" fill="currentColor"/>
    </marker>
    <style>
      .fsm-box { fill: none; stroke: currentColor; stroke-width: 1.5; rx: 8; }
      .fsm-label { font-family: system-ui, sans-serif; font-size: 13px; fill: currentColor; text-anchor: middle; dominant-baseline: middle; }
      .fsm-sublabel { font-family: system-ui, sans-serif; font-size: 10px; fill: currentColor; text-anchor: middle; dominant-baseline: middle; opacity: 0.7; }
      .fsm-edge { stroke: currentColor; stroke-width: 1.2; fill: none; marker-end: url(#arr); }
      .fsm-edge-label { font-family: system-ui, sans-serif; font-size: 10px; fill: currentColor; text-anchor: middle; dominant-baseline: middle; opacity: 0.85; }
    </style>
  </defs>
  <!-- IDLE -->
  <rect x="260" y="20" width="120" height="44" rx="8" class="fsm-box"/>
  <text x="320" y="42" class="fsm-label">IDLE</text>
  <!-- VALIDATING -->
  <rect x="220" y="130" width="200" height="44" rx="8" class="fsm-box"/>
  <text x="320" y="148" class="fsm-label">VALIDATING</text>
  <text x="320" y="163" class="fsm-sublabel">async pipeline + debounce</text>
  <!-- SUBMITTING -->
  <rect x="220" y="240" width="200" height="44" rx="8" class="fsm-box"/>
  <text x="320" y="262" class="fsm-label">SUBMITTING</text>
  <!-- SUCCESS -->
  <rect x="460" y="240" width="140" height="44" rx="8" class="fsm-box"/>
  <text x="530" y="262" class="fsm-label">SUCCESS</text>
  <!-- ERROR -->
  <rect x="40" y="240" width="140" height="44" rx="8" class="fsm-box"/>
  <text x="110" y="262" class="fsm-label">ERROR</text>
  <!-- IDLE → VALIDATING -->
  <path d="M320,64 L320,130" class="fsm-edge"/>
  <text x="340" y="97" class="fsm-edge-label">setValue</text>
  <!-- VALIDATING → IDLE (errors) -->
  <path d="M220,152 Q160,152 160,130 Q160,42 260,42" class="fsm-edge"/>
  <text x="175" y="105" class="fsm-edge-label">errors found</text>
  <!-- VALIDATING → SUBMITTING -->
  <path d="M320,174 L320,240" class="fsm-edge"/>
  <text x="345" y="207" class="fsm-edge-label">valid + submit</text>
  <!-- SUBMITTING → SUCCESS -->
  <path d="M420,262 L460,262" class="fsm-edge"/>
  <text x="440" y="252" class="fsm-edge-label">resolve</text>
  <!-- SUBMITTING → ERROR -->
  <path d="M220,262 L180,262" class="fsm-edge"/>
  <text x="200" y="252" class="fsm-edge-label">reject</text>
  <!-- SUCCESS → IDLE -->
  <path d="M530,240 Q530,42 380,42" class="fsm-edge"/>
  <text x="510" y="130" class="fsm-edge-label">reset</text>
  <!-- ERROR → IDLE -->
  <path d="M110,240 Q110,42 260,42" class="fsm-edge"/>
  <text x="128" y="130" class="fsm-edge-label">reset</text>
</svg>

The adapter's `phase` field always reflects exactly one of these states. Components that render loading indicators, disabled submit buttons, or error summaries read `phase.status` rather than deriving it from multiple boolean flags.

## React Hook Architecture

A React implementation of `FormStateAdapter` lives in a `useForm` hook that wraps `useReducer` for synchronous state transitions and `useCallback`/`useRef` for stable function references. Full patterns for composing field-level hooks, selector memoisation, and performance boundaries are covered in the [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) guide, including the [custom `useFormField` hook](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/) for field-level subscription.

The key decision is keeping the reducer pure — no side effects inside `dispatch` — and pushing async validation into `useEffect` with an `AbortController` per field:

```typescript
import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { FormStateAdapter, FormSnapshot, FormPhase } from './adapter';

type Action<T> =
  | { type: 'SET_VALUE'; field: keyof T; value: unknown }
  | { type: 'SET_PHASE'; phase: FormPhase }
  | { type: 'SET_ERRORS'; errors: Partial<Record<keyof T, string>> }
  | { type: 'RESET'; strategy: 'shallow' | 'deep'; initial: T };

function formReducer<T extends Record<string, unknown>>(
  state: FormSnapshot<T>,
  action: Action<T>
): FormSnapshot<T> {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        dirtyFields: { ...state.dirtyFields, [action.field]: true },
      };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'RESET':
      return {
        values: action.strategy === 'deep'
          ? structuredClone(action.initial)
          : { ...action.initial },
        phase: { status: 'idle' },
        errors: {},
        dirtyFields: {},
      };
    default:
      return state;
  }
}

export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  asyncValidate: (values: T, signal: AbortSignal) => Promise<Partial<Record<keyof T, string>>>
) {
  const [state, dispatch] = useReducer(formReducer<T>, {
    values: initialValues,
    phase: { status: 'idle' },
    errors: {},
    dirtyFields: {},
  });

  // Stable ref so the AbortController cleanup captures the latest controller.
  const abortRef = useRef<AbortController | null>(null);

  const setValue = useCallback((field: keyof T, value: unknown, shouldValidate = false) => {
    dispatch({ type: 'SET_VALUE', field, value });
    if (shouldValidate) {
      // Abort any in-flight validation for this field immediately.
      abortRef.current?.abort();
      abortRef.current = new AbortController();
    }
  }, []);

  // Teardown on unmount — prevents stale dispatch after component removal.
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return { state, setValue };
}
```

Stale dispatch calls after unmount are one of the most common sources of React console warnings. The cleanup function in `useEffect` guarantees that `AbortController.abort()` fires before React destroys the component, preventing the async validator from dispatching into a dead reducer.

## Vue Composition API Adapters

Vue 3's `ref` and `reactive` are synchronous and deeply tracked, which makes them a natural fit for form state — but that same deep tracking becomes a liability when validation logic mutates nested objects, triggering cascading watcher re-runs.

The adapter pattern for Vue isolates mutation to a single `reactive` store while exposing computed read-only selectors to template consumers. [Vue Composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) covers the full pattern, and [syncing Vue form state with Pinia](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/syncing-vue-form-state-with-pinia/) addresses how to lift ephemeral form state into a shared store without triggering cross-component re-renders.

```typescript
import { reactive, readonly, computed, onUnmounted } from 'vue';
import type { FormSnapshot, FormPhase } from './adapter';

export function useVueFormAdapter<T extends Record<string, unknown>>(initialValues: T) {
  // Internal mutable store — never expose this directly to templates.
  const _state = reactive<FormSnapshot<T>>({
    values: { ...initialValues } as T,
    phase: { status: 'idle' },
    errors: {},
    dirtyFields: {},
  });

  // AbortController stored outside reactive() — no need to track it.
  let activeController: AbortController | null = null;

  const setValue = (field: keyof T, value: unknown) => {
    (_state.values as Record<keyof T, unknown>)[field] = value;
    (_state.dirtyFields as Record<keyof T, boolean>)[field] = true;
  };

  const setPhase = (phase: FormPhase) => { _state.phase = phase; };

  // Expose only readonly — prevents template code from bypassing the adapter contract.
  const state = readonly(_state);
  const isDirty = computed(() =>
    Object.values(_state.dirtyFields).some(Boolean)
  );

  // Teardown registered automatically when the composable is used inside setup().
  onUnmounted(() => { activeController?.abort(); });

  return { state, isDirty, setValue, setPhase };
}
```

The `readonly()` wrapper is important: it turns runtime mutations into TypeScript errors, so templates cannot accidentally bypass `setValue` and write directly to `_state.values`. This preserves the single-source-of-truth invariant that makes the adapter testable in isolation.

## Svelte Store Integration

Svelte's compile-time reactivity requires a different approach. Rather than wrapping component lifecycle hooks, form state lives in a plain writable store that can be imported anywhere — including server-side rendering contexts. [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/) covers the full store shape, including how Svelte 5 runes change the subscription model.

```typescript
import { writable, derived, get } from 'svelte/store';
import { onDestroy } from 'svelte';
import type { FormSnapshot } from './adapter';

export function createSvelteFormStore<T extends Record<string, unknown>>(initialValues: T) {
  const _store = writable<FormSnapshot<T>>({
    values: { ...initialValues } as T,
    phase: { status: 'idle' },
    errors: {},
    dirtyFields: {},
  });

  // AbortController held outside the store — stores should hold serialisable data.
  let controller: AbortController | null = null;

  const setValue = (field: keyof T, value: unknown) => {
    _store.update(s => ({
      ...s,
      values: { ...s.values, [field]: value },
      dirtyFields: { ...s.dirtyFields, [field]: true },
    }));
  };

  // derived() is cheap — recomputes only when the upstream store emits.
  const isDirty = derived(_store, $s => Object.values($s.dirtyFields).some(Boolean));

  const destroy = () => {
    controller?.abort();
    // Svelte stores have no built-in destroy — the consumer must call this.
  };

  // When used inside a Svelte component, register teardown automatically.
  try {
    onDestroy(destroy);
  } catch {
    // Called outside component context (e.g. module-level) — caller must call destroy().
  }

  return { subscribe: _store.subscribe, isDirty, setValue, destroy };
}
```

The `try/catch` around `onDestroy` handles the common pattern of creating a store at module level for cross-component sharing. In that case the caller is responsible for calling `destroy()` — the store signals this by documenting it rather than silently swallowing the teardown.

## SSR Hydration Sync

Server-rendered forms require the client-side adapter to initialise from the same values the server used to render the markup. Without this synchronisation, React, Vue, and Svelte all replace the server-rendered DOM on mount — resetting scroll position, losing focus, and triggering spurious `dirty` flags. [Hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/) covers the full pattern, including [handling Svelte form hydration mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/).

The reliable approach is to embed initial values as a JSON payload in the server-rendered HTML and read them before the adapter initialises:

```typescript
/** Read server-rendered initial values from a <script> tag with data-form-init. */
export function readServerInitialValues<T>(formId: string, fallback: T): T {
  if (typeof document === 'undefined') return fallback; // SSR context — use fallback.

  const el = document.querySelector<HTMLScriptElement>(
    `script[data-form-init="${formId}"]`
  );
  if (!el?.textContent) return fallback;

  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    console.warn(`[form:${formId}] Failed to parse server initial values — using fallback.`);
    return fallback;
  }
}
```

The server renders:

```html
<script type="application/json" data-form-init="checkout">
  {"email":"user@example.com","country":"GB"}
</script>
```

The client passes `readServerInitialValues('checkout', defaultValues)` as the `initialValues` argument to the adapter. The hydrated DOM then matches the server output exactly.

## Error Propagation & Accessibility

Validation errors are useless unless they reach assistive technology. The adapter's error map drives three ARIA attributes on every field:

- `aria-invalid="true"` signals the field is in an error state.
- `aria-describedby` points to the element containing the error message.
- `aria-live="polite"` on the error container ensures screen readers announce new messages without interrupting ongoing speech.

```typescript
/** Apply ARIA attributes derived from the adapter's error map to a field element. */
export function syncFieldAria(
  input: HTMLElement,
  errorContainer: HTMLElement,
  errorMessage: string | undefined
): void {
  if (errorMessage) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorContainer.id);
    errorContainer.textContent = errorMessage;
    errorContainer.removeAttribute('hidden');
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    errorContainer.textContent = '';
    errorContainer.setAttribute('hidden', '');
  }
}
```

Three rules that must never be violated:

1. Never rely solely on colour to communicate an error — always pair a colour change with an icon, text, or ARIA attribute change.
2. Set `aria-invalid` on the input element, not on a wrapper `<div>` — assistive technology reads it from the interactive element.
3. Do not remove `aria-describedby` while the error container is still visible. Remove it and hide the container atomically (as the snippet above does).

[Error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) and [mapping validation errors to UI components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/) cover how to normalise validation library outputs (Zod, Yup, Valibot) into the flat `Record<keyof T, string>` map the adapter expects.

## Validation Pipeline with Race Condition Guards

Async validators are the most common source of race conditions in form implementations. The pattern below combines debounce, `AbortController` for network-level cancellation, and sequence IDs for non-cancellable validators:

```typescript
type SyncValidator<T> = (values: T) => Array<{ path: keyof T; message: string }>;
type AsyncValidator<T> = (
  values: T,
  signal: AbortSignal
) => Promise<Partial<Record<keyof T, string>> | null>;

export function createValidationPipeline<T extends Record<string, unknown>>(
  sync: SyncValidator<T>,
  async: AsyncValidator<T>[],
  debounceMs = 300
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  // Sequence ID prevents a slow validator resolving after a faster subsequent call.
  let seq = 0;

  return (values: T): Promise<Partial<Record<keyof T, string>>> => {
    // Cancel any debounced or in-flight async validation.
    if (debounceTimer) clearTimeout(debounceTimer);
    controller?.abort();

    // Run synchronous validators immediately — no network round-trip.
    const syncErrors = sync(values);
    if (syncErrors.length > 0) {
      return Promise.resolve(
        Object.fromEntries(syncErrors.map(e => [e.path, e.message]))
      ) as Promise<Partial<Record<keyof T, string>>>;
    }

    const currentSeq = ++seq;
    controller = new AbortController();
    const { signal } = controller;

    return new Promise(resolve => {
      debounceTimer = setTimeout(async () => {
        // A newer call has superseded this one — discard the result.
        if (seq !== currentSeq) return;

        const results = await Promise.allSettled(async.map(fn => fn(values, signal)));

        // Ignore if aborted or superseded between debounce and resolution.
        if (seq !== currentSeq || signal.aborted) return;

        const errors = results
          .filter(
            (r): r is PromiseFulfilledResult<Partial<Record<keyof T, string>> | null> =>
              r.status === 'fulfilled' && r.value !== null
          )
          .reduce(
            (acc, r) => ({ ...acc, ...r.value }),
            {} as Partial<Record<keyof T, string>>
          );

        resolve(errors);
      }, debounceMs);
    });
  };
}
```

The dual guard — `seq !== currentSeq || signal.aborted` — prevents two independent failure modes: the sequence check stops stale non-cancellable validators from overwriting newer results; the `signal.aborted` check stops resolved `fetch` responses from being applied after the controller was replaced.

This pattern connects directly to the [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) guide, which covers debounce tuning, retry policies, and server-side rate limit handling.

## Lifecycle Teardown Checklist

Teardown bugs are silent — they do not throw errors, they accumulate. Every adapter implementation must cover the following, in this order:

1. **Abort in-flight requests.** Call `AbortController.abort()` on any controller created during the adapter's lifetime. Store controllers in a `Set` if multiple concurrent validators can run.
2. **Clear debounce timers.** Call `clearTimeout` on every pending timer. A timer that fires after unmount will dispatch into dead state.
3. **Unsubscribe store listeners.** Svelte store subscriptions return an unsubscribe function — call it. Pinia `$subscribe` callbacks return the same. Vue `watch` and `watchEffect` return stop handles.
4. **Remove DOM event listeners.** Any listeners attached with `addEventListener` in the hook must be removed with `removeEventListener` using the exact same function reference.
5. **Expose `destroy()` on the adapter interface.** Framework lifecycle hooks (`useEffect` return, `onUnmounted`, `onDestroy`) call it automatically when the adapter is used inside a component. Module-level adapter instances require the caller to invoke `destroy()` manually on route change.

```typescript
/** Minimal teardown registry — attach to every adapter instance. */
class TeardownRegistry {
  private controllers = new Set<AbortController>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private callbacks = new Set<() => void>();

  addController(c: AbortController) { this.controllers.add(c); return c; }
  addTimer(t: ReturnType<typeof setTimeout>) { this.timers.add(t); return t; }
  addCallback(fn: () => void) { this.callbacks.add(fn); return fn; }

  destroy() {
    this.controllers.forEach(c => c.abort());
    this.timers.forEach(t => clearTimeout(t));
    this.callbacks.forEach(fn => fn());
    this.controllers.clear();
    this.timers.clear();
    this.callbacks.clear();
  }
}
```

The registry pattern scales to adapters that manage multiple fields with independent debounce timers and abort controllers — a common situation in large forms with 10+ async-validated fields.

## Common Pitfalls

**Tying validation directly to UI event handlers.** When `onChange` fires validation logic inline, every keystroke can trigger a re-render cycle in the parent component. Extract validation into the adapter's pipeline and let the component only call `setValue`.

**Not debouncing async validators.** A 50ms keystroke interval against a remote uniqueness check translates to hundreds of parallel requests per form session. Always debounce with a minimum of 250ms; 400ms is typical for email/username checks.

**Shallow resets that miss nested state.** When `reset('shallow')` is called on a form with nested objects, child object references remain pointing to mutated values. Use `structuredClone` for deep resets, or track nested mutations explicitly.

**Discarding `AbortController` without aborting.** Assigning a new controller to a variable without calling `.abort()` on the previous one leaks the pending request and can cause stale resolution. Always abort before replacing.

**Global form adapter state in a module singleton.** Sharing one adapter instance across multiple form instances via a module-level variable means reset operations and error states bleed between them. Each form instance must own its adapter instance.

**Ignoring [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) for programmatic updates.** When code calls `setValue` to populate fields (e.g. autofill, address lookup), the `dirty` flag should not be set. Distinguish programmatic mutations from user-driven ones by adding a `source: 'user' | 'programmatic'` argument to `setValue`.

**Setting ARIA attributes only on blur.** Screen readers navigate by field without triggering blur events. Set `aria-invalid` and `aria-describedby` on every validation state change, not only when the user leaves the field.

## Frequently Asked Questions

**What is the difference between shallow and deep reset strategies?**

Shallow reset copies only the top-level keys of the initial values object back to the current state, leaving nested object references in place. This is fast but incorrect if nested objects were mutated. Deep reset uses `structuredClone` (or a recursive clone) to produce a fully independent copy of the initial payload, clearing all mutation history, async pending flags, and validation caches.

**When should async validators use `AbortController` vs sequence IDs?**

`AbortController` cancels in-flight `fetch` requests at the network level and is the correct default for HTTP-based validators. Sequence IDs are a lightweight fallback when using third-party SDK clients that do not expose a cancellation token — increment a counter on each call and discard results whose sequence number does not match the latest. Use both for belt-and-suspenders correctness, as the code sample above demonstrates.

**How do custom hooks improve form validation architecture?**

They encapsulate validation pipelines, state transitions, and error mapping into reusable composables. This separates business logic from rendering, enabling deterministic unit tests without a DOM, easier migration between framework versions, and simpler composition of cross-field dependency rules.

**How should a design system expose form primitives across React, Vue, and Svelte?**

Define the `FormStateAdapter` interface in a framework-agnostic package. Each framework adapter implements it, and design system components accept an adapter instance as a prop or composable argument. UI components call `adapter.getState()` and `adapter.setValue()` — they do not know which framework is underneath.

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)

← [Home](https://www.client-side-form.com/)
