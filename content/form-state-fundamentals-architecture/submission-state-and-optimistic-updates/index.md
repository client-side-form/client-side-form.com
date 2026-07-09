---
layout: page.njk
title: "Submission State and Optimistic Updates"
description: "Model the submit lifecycle as a state machine — optimistic apply with rollback snapshots, server errors mapped to a FieldErrorMap, retry with backoff, and idempotent duplicate-submit guards."
slug: submission-state-and-optimistic-updates
type: topic
breadcrumb: "Submission & Optimistic Updates"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Submission State and Optimistic Updates"
  parent: "Form State Fundamentals"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Submission State and Optimistic Updates",
      "description": "Model the submit lifecycle as a state machine — optimistic apply with rollback snapshots, server errors mapped to a FieldErrorMap, retry with backoff, and idempotent duplicate-submit guards.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Submission State and Optimistic Updates", "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Submission State and Optimistic Updates",
      "step": [
        { "@type": "HowToStep", "name": "Model the submit lifecycle as an explicit state machine: idle, submitting, success, error" },
        { "@type": "HowToStep", "name": "Take an immutable rollback snapshot before applying the optimistic mutation" },
        { "@type": "HowToStep", "name": "Fire the request through an AbortController so a superseding submit cancels the previous one" },
        { "@type": "HowToStep", "name": "Map a server rejection back onto a typed FieldErrorMap and restore the snapshot on failure" },
        { "@type": "HowToStep", "name": "Guard against duplicate submits with an in-flight lock and a client-generated idempotency key" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "When should I use an optimistic update versus waiting for the server?",
          "acceptedAnswer": { "@type": "Answer", "text": "Apply optimistically when the mutation is highly likely to succeed, the result is trivially predictable on the client, and a rollback is visually cheap — toggles, likes, reordering, single-field edits. Wait for the server when the operation is money-moving, produces a server-generated identifier the UI needs, or has side effects the client cannot reproduce. The deciding factor is whether a rollback would confuse the user more than a brief spinner would." }
        },
        {
          "@type": "Question",
          "name": "How do I map a 422 validation response back onto individual fields?",
          "acceptedAnswer": { "@type": "Answer", "text": "Have the server return a stable, machine-readable shape — an array of { field, code, message } or a keyed object — never a prose string. Reduce it into a FieldErrorMap keyed by the same field paths your form uses, then merge it into the error state so each control renders its own message. Reserve a form-level error slot for codes that do not map to any single field, such as a global rate-limit or a stale-version conflict." }
        },
        {
          "@type": "Question",
          "name": "Does disabling the submit button actually prevent double submission?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Disabling is a UX affordance, not a guarantee. There is a render gap between the click and the disabled attribute taking effect, the Enter key can fire a second submit before React commits, and a determined client can re-enable the button. The real guard is a synchronous in-flight boolean checked at the top of the submit handler plus a client-generated idempotency key the server deduplicates on." }
        },
        {
          "@type": "Question",
          "name": "How should retry backoff interact with the state machine?",
          "acceptedAnswer": { "@type": "Answer", "text": "Only auto-retry idempotent failures that are plausibly transient — network errors and 5xx responses — never a 4xx, which will fail identically on retry. Keep the machine in the error state between attempts and expose the attempt count and next-retry time so the UI can show a countdown. Reuse the same idempotency key across every retry of one logical submit so a request that actually succeeded server-side but failed to acknowledge is not applied twice." }
        }
      ]
    }
  ]
}
</script>

# Submission State and Optimistic Updates

Submission is where a form stops being a local state problem and becomes a distributed-systems problem. Between the click and the server's acknowledgement, the network can stall, the user can click again, a previous request can land late, and the server can reject the payload field by field. A form that models this window as a single `isSubmitting` boolean will eventually double-charge a customer, strand the UI in a permanent spinner, or paint a validation error that belongs to a request the user already abandoned.

This page specifies the submit lifecycle as an explicit state machine — `idle → submitting → success | error` — and layers on the three patterns that make it survive production: an optimistic apply backed by a rollback snapshot, a server rejection mapped onto a typed [error state map](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/), and a duplicate-submit guard built from an in-flight lock plus a client-generated idempotency key. The controller here is framework-agnostic; the React, Vue, and Svelte adapters wrap it the same way they wrap every other subsystem in [form state fundamentals](https://www.client-side-form.com/form-state-fundamentals-architecture/).

---

## Problem Statement

A submit handler has to hold four facts at once, and they are not independent:

- **Where the request is in its lifecycle** — has it started, is it in flight, did it resolve, did it reject.
- **What the UI showed the user before the request** — the snapshot it must be able to restore if the mutation fails.
- **Which fields the server rejected** — a 422 is not a single error, it is a per-field verdict that has to be routed back to individual controls.
- **Whether this submit is a duplicate** — of a click that is still in flight, or of one that already succeeded but never acknowledged.

The naive handler collapses all four into `setIsSubmitting(true); await post(); setIsSubmitting(false);`. That loses the pre-submit snapshot (so an optimistic edit cannot be undone), swallows the structured error body (so the user sees "Something went wrong" instead of "Email already taken"), and races itself (so a second click issues a second charge). The state machine below keeps the four concerns separate and makes every illegal transition unrepresentable.

---

## Submit Lifecycle State Machine

The machine has four states. `idle` is the resting state; `submitting` is the single in-flight window; `success` and `error` are terminal for a given attempt but both transition back — `success` resets to a fresh `idle` baseline, `error` either retries into `submitting` or returns to `idle` when the user edits a field.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Submit lifecycle state machine diagram" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Submit Lifecycle State Machine</title>
  <desc>States IDLE, SUBMITTING, SUCCESS, and ERROR. submit() moves IDLE to SUBMITTING after taking a rollback snapshot and applying the optimistic update. A resolved request moves SUBMITTING to SUCCESS which commits and resets the baseline back to IDLE. A rejected request moves SUBMITTING to ERROR which rolls back the snapshot; ERROR retries into SUBMITTING with the same idempotency key, or returns to IDLE when the user edits a field.</desc>
  <defs>
    <marker id="arr-submission" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
  <!-- Frame -->
  <rect x="1" y="1" width="758" height="358" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- IDLE -->
  <rect x="40" y="150" width="140" height="58" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="110" y="174" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">IDLE</text>
  <text x="110" y="192" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.78">no request</text>
  <!-- SUBMITTING -->
  <rect x="310" y="150" width="140" height="58" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="380" y="174" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">SUBMITTING</text>
  <text x="380" y="192" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.78">in flight (locked)</text>
  <!-- SUCCESS -->
  <rect x="580" y="52" width="140" height="58" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="650" y="76" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">SUCCESS</text>
  <text x="650" y="94" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.78">commit + reset</text>
  <!-- ERROR -->
  <rect x="580" y="248" width="140" height="58" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="650" y="272" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">ERROR</text>
  <text x="650" y="290" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.78">rollback + map</text>
  <!-- IDLE -> SUBMITTING -->
  <path d="M180 179 L302 179" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-submission)"/>
  <text x="241" y="169" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">submit()</text>
  <text x="241" y="200" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">snapshot + optimistic apply</text>
  <!-- SUBMITTING -> SUCCESS -->
  <path d="M451 166 C512 138 542 104 573 92" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-submission)"/>
  <text x="530" y="128" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">2xx resolve</text>
  <!-- SUBMITTING -> ERROR -->
  <path d="M451 192 C512 220 542 254 573 266" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-submission)"/>
  <text x="528" y="244" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">reject / 4xx / 5xx</text>
  <!-- ERROR -> SUBMITTING (retry) -->
  <path d="M582 292 C438 336 372 262 375 216" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr-submission)"/>
  <text x="470" y="326" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">retry (same idempotency key)</text>
  <!-- SUCCESS -> IDLE (reset) -->
  <path d="M598 60 C388 6 208 30 122 143" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr-submission)"/>
  <text x="360" y="24" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">commit new baseline → reset</text>
  <!-- ERROR -> IDLE (user edits) -->
  <path d="M596 300 C300 356 150 300 118 214" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="2 4" marker-end="url(#arr-submission)"/>
  <text x="300" y="344" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.78">user edits a field → clear</text>
</svg>

| Trigger | From state | To state | Side-effect |
|---------|-----------|----------|-------------|
| `submit()` — lock acquired | `idle` | `submitting` | take rollback snapshot, apply optimistic value, mint idempotency key, open `AbortController` |
| `submit()` — lock already held | `submitting` | `submitting` | **no-op** — the in-flight guard swallows the duplicate |
| Request resolves 2xx | `submitting` | `success` | commit optimistic value, advance pristine baseline, clear errors, release lock |
| Request rejects (4xx/5xx/network) | `submitting` | `error` | restore snapshot, reduce body into a `FieldErrorMap`, release lock |
| `retry()` on transient error | `error` | `submitting` | reuse the same idempotency key, re-open `AbortController` |
| User edits any field | `error` | `idle` | clear submit-level error, discard stale server verdict |
| Component unmount mid-flight | `submitting` | (teardown) | `controller.abort()` so the resolver never touches a dead tree |

Every recovery path in the table restores or advances a snapshot — that is the invariant that keeps optimistic UI honest.

---

## Core Implementation

The controller owns the machine. It is deliberately independent of any view layer: it exposes `getState()` and `subscribe()`, and the framework adapter mirrors those into `useSyncExternalStore`, a Vue `shallowRef`, or a Svelte store. The `apply`/`commit`/`rollback` trio is supplied by the caller so the same controller drives an in-place list edit or a whole-form POST.

```typescript
export type SubmitPhase = "idle" | "submitting" | "success" | "error";

/** Field-keyed error map — the same shape error-state mapping consumes. */
export type FieldErrorMap = Record<string, string>;

export interface SubmitState<R> {
  readonly phase: SubmitPhase;
  readonly result: R | null;
  readonly fieldErrors: FieldErrorMap;
  readonly formError: string | null;   // errors that map to no single field
  readonly attempt: number;            // 1 on first try, increments per retry
}

export interface SubmitError {
  status: number;                      // 0 for network/abort failures
  fieldErrors?: FieldErrorMap;
  formError?: string;
  retriable: boolean;
}

export interface SubmitConfig<T, R> {
  /** The network call. Receives the payload, the idempotency key, and a signal. */
  send: (payload: T, idempotencyKey: string, signal: AbortSignal) => Promise<R>;
  /** Optimistically mutate the visible model; return a rollback snapshot. */
  apply?: (payload: T) => () => void;
  /** Parse a rejection into a structured, field-routable error. */
  parseError: (err: unknown) => SubmitError;
  /** Max auto-retries for retriable failures (default 0 = manual only). */
  maxRetries?: number;
  /** Base backoff in ms; grows exponentially with full jitter. */
  backoffBaseMs?: number;
}

export function createSubmitController<T, R>(config: SubmitConfig<T, R>) {
  const { send, apply, parseError, maxRetries = 0, backoffBaseMs = 400 } = config;

  let state: SubmitState<R> = {
    phase: "idle", result: null, fieldErrors: {}, formError: null, attempt: 0,
  };

  // A synchronous lock. Checked at the top of submit() BEFORE any await, so a
  // second click in the same tick cannot slip past — unlike the disabled
  // attribute, which only takes effect after the next render commit.
  let inFlight = false;

  // One idempotency key per logical submit, reused across retries so a request
  // that succeeded server-side but failed to acknowledge is never applied twice.
  let idempotencyKey = "";

  // AbortController lets a superseding submit (or an unmount) cancel the
  // previous request. Without it, a slow first response can land AFTER a
  // second one and clobber fresher state — the classic last-writer-wins bug.
  let controller: AbortController | null = null;

  let rollback: (() => void) | null = null;
  const listeners = new Set<(s: SubmitState<R>) => void>();

  function set(patch: Partial<SubmitState<R>>): void {
    state = { ...state, ...patch };
    listeners.forEach((cb) => cb(state));
  }

  function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, ms);
      // Tie the backoff timer to the same signal so aborting kills the wait too.
      signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  }

  async function run(payload: T, attempt: number): Promise<void> {
    controller = new AbortController();
    const { signal } = controller;
    set({ phase: "submitting", attempt, fieldErrors: {}, formError: null });

    try {
      const result = await send(payload, idempotencyKey, signal);
      rollback = null;                 // commit: the optimistic value is now real
      set({ phase: "success", result });
    } catch (raw) {
      if (signal.aborted) return;      // superseded or unmounted — drop silently
      const err = parseError(raw);

      const canRetry = err.retriable && attempt <= maxRetries;
      if (canRetry) {
        // Exponential backoff with full jitter: base * 2^(n-1) * random.
        const ceiling = backoffBaseMs * 2 ** (attempt - 1);
        const delay = Math.random() * ceiling;
        try {
          await sleep(delay, signal);
        } catch {
          return;                      // aborted during the backoff wait
        }
        return run(payload, attempt + 1);   // same idempotencyKey, next attempt
      }

      rollback?.();                    // undo the optimistic mutation
      rollback = null;
      set({
        phase: "error",
        fieldErrors: err.fieldErrors ?? {},
        formError: err.formError ?? null,
      });
    } finally {
      inFlight = false;                // release the lock exactly once
    }
  }

  return {
    getState: (): SubmitState<R> => state,
    subscribe(cb: (s: SubmitState<R>) => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);   // caller MUST unsubscribe in cleanup
    },

    async submit(payload: T): Promise<void> {
      if (inFlight) return;            // the duplicate-submit guard — synchronous
      inFlight = true;
      idempotencyKey = crypto.randomUUID();
      rollback = apply ? apply(payload) : null;   // snapshot lives in the closure
      await run(payload, 1);
    },

    /** Manual retry from the error state — reuses the existing idempotency key. */
    async retry(payload: T): Promise<void> {
      if (inFlight || state.phase !== "error") return;
      inFlight = true;
      rollback = apply ? apply(payload) : null;
      await run(payload, state.attempt + 1);
    },

    /** Call when the user edits a field after a failure. */
    clearError(): void {
      if (state.phase === "error") {
        set({ phase: "idle", fieldErrors: {}, formError: null });
      }
    },

    /** Teardown — abort any in-flight request so its resolver is a no-op. */
    dispose(): void {
      controller?.abort();
      listeners.clear();
    },
  };
}
```

Three design decisions carry the weight:

- **The rollback snapshot is a closure, not serialized state.** `apply(payload)` returns a function that reverses exactly the mutation it made. This keeps rollback O(1) and scoped — it never has to diff the whole model — and it composes with the immutable snapshots described in [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/).
- **The lock is a plain boolean checked before the first `await`.** JavaScript's run-to-completion guarantees that everything up to the first `await` in `submit()` executes atomically, so two synchronous clicks cannot both pass the `if (inFlight) return` gate. The disabled attribute cannot make that guarantee.
- **One idempotency key spans all retries of a logical submit.** The key is minted in `submit()` and left untouched by `retry()` and the internal backoff loop, so the server can collapse a superseded-but-succeeded request into a single write.

---

## Mapping Server Errors to a FieldErrorMap

A 422 is a structured verdict, not a message. The server must return something reducible; the client's job is to key it by the same field paths the form uses so each control can render its own error. This is the same `FieldErrorMap` contract the [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) page consumes downstream.

```typescript
interface ApiErrorBody {
  errors?: Array<{ field?: string; code: string; message: string }>;
  message?: string;
}

/** Turn a fetch rejection into the SubmitError the controller understands. */
async function parseApiError(err: unknown): Promise<SubmitError> {
  // Network failures and aborts arrive as TypeError/DOMException, not Response.
  if (err instanceof TypeError) {
    return { status: 0, formError: "Network error — check your connection.", retriable: true };
  }
  if (!(err instanceof Response)) {
    return { status: 0, formError: "Unexpected error.", retriable: false };
  }

  // 5xx is transient and safe to retry when the request is idempotent.
  if (err.status >= 500) {
    return { status: err.status, formError: "Server error — retrying may help.", retriable: true };
  }

  const body = (await err.json().catch(() => ({}))) as ApiErrorBody;
  const fieldErrors: FieldErrorMap = {};
  let formError: string | null = null;

  for (const e of body.errors ?? []) {
    if (e.field) {
      // Keep only the FIRST error per field so the control shows one message.
      fieldErrors[e.field] ??= e.message;
    } else {
      formError = e.message;         // no field → it belongs to the form, not a control
    }
  }
  // 409 (version conflict) and 429 (rate limit) have no field owner.
  if (err.status === 409) formError ??= "This record changed since you loaded it.";
  if (err.status === 429) formError ??= "Too many attempts — wait a moment.";

  // 4xx is a client-side verdict: retrying sends the identical payload and fails again.
  return { status: err.status, fieldErrors, formError: formError ?? undefined, retriable: false };
}
```

The rules that keep this robust: never retry a 4xx (it is deterministic), always reserve a form-level slot for codes with no field owner (409, 429, 5xx), and take only the first error per field so a single control never stacks three messages. Async uniqueness checks that ran before submit — the ones covered in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — should feed the same map so pre-submit and post-submit errors render identically.

---

## Integration Guidance

The submit controller sits at the top of the form's data flow, above validation and below the network:

1. **Gate submission on the resolved form state.** Call `submit()` only after synchronous validation passes and no async validation is in flight. The controller does not validate; it assumes the payload is already the value validation produced.
2. **Feed `fieldErrors` back into the shared error map.** Do not render from `SubmitState.fieldErrors` directly — merge it into the same error store your validation writes to, so a field shows exactly one error regardless of origin. The routing rules live in [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/).
3. **Advance the pristine baseline on success.** After a 2xx, call `hydrate(result)` on your dirty-tracker so the just-saved values become the new pristine baseline and the unsaved-changes guard goes quiet — see [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/).
4. **Mirror `phase` into the view via a subscription.** In [React hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) that is a `useSyncExternalStore` over `subscribe`/`getState`; in [Vue composition adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) it is a `shallowRef` updated in the subscription callback.

The dedicated duplicate-submit mechanics — the Enter-key double fire, the disable-on-submit race, and the server-side dedup contract — are detailed in [handling double-submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

---

## Edge Cases and Failure Modes

### Late-landing response after a supersede

A user submits, the request stalls, they edit a field and submit again. Without cancellation the first (stale) response can resolve after the second and overwrite fresher state.

**Resolution:** The controller opens a fresh `AbortController` per `run()` and checks `signal.aborted` before touching state. A superseding submit must abort the previous controller first; wire `submit()` to call `controller?.abort()` when `inFlight` is being force-reset by a higher-level "cancel and resubmit" action.

### Optimistic apply that another subscriber already mutated

If `apply()` mutates shared state that a second optimistic operation also touched, the rollback closure can revert the wrong value — it captured the value at apply time, not the current one.

**Resolution:** Make `apply()` capture the specific slice it changes and restore by identity, not by absolute value. For list reordering, snapshot the moved item's index and reinsert it; do not snapshot and restore the entire array, which would also undo a sibling's concurrent edit.

### Success arrives but the component already unmounted

The user navigates away while the request is in flight. The resolver calls `set()`, the subscription fires, and React warns about updating an unmounted tree — or worse, a stale closure paints a toast on a dead route.

**Resolution:** Call `dispose()` in the teardown hook (`useEffect` cleanup, `onUnmounted`). It aborts the controller so the resolver returns at the `signal.aborted` guard and clears listeners so nothing fires.

### Idempotency key regenerated on retry

If `retry()` mints a new key, a request that actually succeeded server-side on the first attempt — but whose acknowledgement was lost — is treated as a brand-new write and applied twice.

**Resolution:** Mint the key only in `submit()`. `retry()` and the internal backoff loop reuse `idempotencyKey` unchanged. The server deduplicates on it within a time window and replays the original response.

### Backoff timer outlives the request

An auto-retry schedules a `setTimeout`, then the user cancels. Without tying the timer to the abort signal, the backoff fires and issues a request against a form the user already left.

**Resolution:** The `sleep()` helper subscribes to `signal`'s abort event and both clears the timeout and rejects, so an abort during backoff unwinds `run()` cleanly instead of firing a ghost request.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|----------------|----------------|
| Payment submitted twice on a slow network | Log the idempotency key per request; confirm two distinct keys reached the server | Check that the key is minted in `submit()` not `run()`, and that the server deduplicates on it |
| Spinner never clears after a failed request | Inspect whether `inFlight` was released; look for an early `return` that skips the `finally` | Ensure every exit path flows through `finally { inFlight = false }`; never `return` before it |
| "Something went wrong" instead of per-field errors | Log the raw response body; confirm the server returns `{ errors: [{ field, code, message }] }` | Point `parseError` at the structured body and reduce into `fieldErrors`, not a single string |
| Optimistic edit stays visible after a rejection | Confirm `apply()` returned a rollback closure and it was stored in `rollback` | Verify `rollback?.()` runs before `set({ phase: "error" })`; check the closure reverts by identity |
| Stale response overwrites a newer edit | Compare response timing against submit order in the network panel | Abort the previous controller on supersede and gate `set()` behind `signal.aborted` |

---

## Testing and QA Hooks

Mirror the machine's phase onto the form element so Playwright and Cypress assert on state rather than spinner pixels.

```typescript
// Call inside the controller subscription (useEffect for React, watch for Vue).
function syncSubmitAttributes(
  formEl: HTMLFormElement,
  state: SubmitState<unknown>
): void {
  formEl.dataset.submitPhase = state.phase;                 // idle|submitting|success|error
  formEl.dataset.attempt = String(state.attempt);
  formEl.dataset.hasFormError = String(state.formError !== null);

  // Reflect per-field server errors so field-level selectors can assert them.
  for (const [field, message] of Object.entries(state.fieldErrors)) {
    const el = formEl.elements.namedItem(field);
    if (el instanceof HTMLElement) {
      el.setAttribute("aria-invalid", "true");
      el.dataset.serverError = message;
    }
  }
}
```

Playwright coverage for the double-submit and error paths:

```typescript
// Rapid double click must issue exactly one network request.
let requests = 0;
await page.route("**/api/orders", (route) => { requests++; route.fulfill({ status: 201, body: "{}" }); });
await page.locator('[data-testid="submit"]').dblclick();
await expect(page.locator("form")).toHaveAttribute("data-submit-phase", "success");
expect(requests).toBe(1);

// A 422 lands its message on the right field.
await page.route("**/api/orders", (route) =>
  route.fulfill({ status: 422, body: JSON.stringify({ errors: [{ field: "email", code: "taken", message: "Email already taken" }] }) })
);
await page.locator('[data-testid="submit"]').click();
await expect(page.locator('[name="email"]')).toHaveAttribute("aria-invalid", "true");
await expect(page.locator('[name="email"]')).toHaveAttribute("data-server-error", "Email already taken");
```

For ARIA regression coverage, assert that `aria-busy="true"` is set on the form only during `submitting` and that the form-level error renders into an `aria-live="assertive"` region so a screen reader announces it — a submit failure the user cannot hear is a submit failure they will repeat.

---

## Common Pitfalls

**Treating the disabled attribute as the duplicate-submit guard.** It is a render-cycle behind the click and the Enter key beats it. Guard with the synchronous `inFlight` boolean and let the disabled state be cosmetic.

**Applying optimistically without capturing a rollback.** If `apply()` mutates but returns nothing, a rejection leaves the optimistic value on screen with no way to undo it. Always return the reversal closure — even for a "sure thing" mutation, because the network is never a sure thing.

**Retrying 4xx responses.** A 400 or 422 is deterministic: the identical payload fails identically. Auto-retry only network errors and 5xx, and cap the attempts so a persistent outage does not hammer the server.

**Minting a new idempotency key per attempt.** This defeats the entire point of the key — a lost acknowledgement becomes a duplicate write. One key per logical submit, reused across every retry.

**Rendering directly from `SubmitState.fieldErrors`.** Bypassing the shared error map lets a field stack a validation error and a server error simultaneously. Merge into one store with a defined precedence and render from that.

---

## Frequently Asked Questions

<details>
<summary><strong>When should I use an optimistic update versus waiting for the server?</strong></summary>

Apply optimistically when the mutation is highly likely to succeed, the result is trivially predictable on the client, and a rollback is visually cheap — toggles, likes, reordering, single-field inline edits. Wait for the server when the operation is money-moving, produces a server-generated identifier the UI needs to render, or has side effects the client cannot reproduce. The deciding factor is whether an occasional rollback would confuse the user more than a brief spinner would; for a "like" it would not, for a checkout it would.

</details>

<details>
<summary><strong>How do I map a 422 validation response back onto individual fields?</strong></summary>

Have the server return a stable, machine-readable shape — an array of `{ field, code, message }` or a keyed object — never a prose string. Reduce it into a `FieldErrorMap` keyed by the same field paths your form uses, then merge it into the error state so each control renders its own message. Reserve a form-level error slot for codes that do not map to any single field, such as a global rate-limit (429) or a stale-version conflict (409). Take only the first error per field so a control never stacks multiple messages.

</details>

<details>
<summary><strong>Does disabling the submit button actually prevent double submission?</strong></summary>

No. Disabling is a UX affordance, not a guarantee. There is a render gap between the click and the `disabled` attribute taking effect, the Enter key can fire a second submit before the framework commits, and a determined client can re-enable the button from the console. The real guard is a synchronous in-flight boolean checked at the top of the submit handler, before any `await`, plus a client-generated idempotency key the server deduplicates on. The disabled state is worth keeping for feedback, but it is not the mechanism.

</details>

<details>
<summary><strong>How should retry backoff interact with the state machine?</strong></summary>

Only auto-retry idempotent failures that are plausibly transient — network errors and 5xx responses — never a 4xx, which will fail identically on retry. Keep the machine in the `error` state between attempts and expose the attempt count and next-retry time so the UI can show a countdown rather than a frozen spinner. Reuse the same idempotency key across every retry of one logical submit so a request that actually succeeded server-side but failed to acknowledge is not applied twice, and grow the delay with exponential backoff plus jitter to avoid synchronized retries under a shared outage.

</details>

---

## Related

- [Handling Double-Submit and Idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/)
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
