---
layout: page.njk
title: "Handling Double-Submit and Idempotency"
description: "Stop duplicate form submissions at the source — a synchronous in-flight guard, the disable-on-submit race, the Enter-key double fire, and a client-generated idempotency key the server deduplicates."
slug: "handling-double-submit-and-idempotency"
type: "long_tail"
breadcrumb: "Double-Submit & Idempotency"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Handling Double-Submit and Idempotency"
  parent: "Submission State and Optimistic Updates"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Handling Double-Submit and Idempotency",
      "description": "Stop duplicate form submissions at the source — a synchronous in-flight guard, the disable-on-submit race, the Enter-key double fire, and a client-generated idempotency key the server deduplicates.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Submission State and Optimistic Updates", "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/" },
        { "@type": "ListItem", "position": 4, "name": "Handling Double-Submit and Idempotency", "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Handling Double-Submit and Idempotency",
      "description": "Prevent duplicate form submissions using a synchronous in-flight guard and a client-generated idempotency key deduplicated on the server.",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Guard synchronously before the first await", "text": "Check an in-flight boolean at the top of the submit handler so a second call in the same tick returns immediately." },
        { "@type": "HowToStep", "position": 2, "name": "Mint an idempotency key per logical submit", "text": "Generate a UUID once when the guard is acquired and send it as a request header." },
        { "@type": "HowToStep", "position": 3, "name": "Neutralize the Enter-key double fire", "text": "Let the browser's implicit submit drive one path and prevent a second click-driven submit." },
        { "@type": "HowToStep", "position": 4, "name": "Release the guard in finally", "text": "Reset the in-flight boolean on every exit path so the form is not permanently locked after an error." },
        { "@type": "HowToStep", "position": 5, "name": "Deduplicate on the server", "text": "Store the idempotency key and replay the original response for any repeat within the window." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why is disabling the submit button not enough on its own?",
          "acceptedAnswer": { "@type": "Answer", "text": "The disabled attribute only applies after the framework commits the next render, which is at least a tick after the click. A second click or an Enter keypress fired in that gap still reaches the handler. Disabling is correct for feedback but the actual guarantee is a synchronous in-flight boolean checked before the first await, backed by a server-side idempotency key." }
        },
        {
          "@type": "Question",
          "name": "Where should the idempotency key be generated — client or server?",
          "acceptedAnswer": { "@type": "Answer", "text": "The client generates it, once per logical submit, and reuses it across retries. Only the client knows that two requests represent the same user intent; the server sees two independent HTTP calls. Generating it server-side would give each retry a distinct key and defeat deduplication for the exact case idempotency exists to cover — a request that succeeded but whose acknowledgement was lost." }
        },
        {
          "@type": "Question",
          "name": "How do I stop the Enter key from submitting twice?",
          "acceptedAnswer": { "@type": "Answer", "text": "Enter in a single-line input triggers the form's implicit submit, which can coincide with a click handler on the button. Bind one submit path — the form's onSubmit — and let the button be type=submit so Enter and click funnel through the same handler. The in-flight guard then collapses any overlap into a single request." }
        }
      ]
    }
  ]
}
</script>

# Handling Double-Submit and Idempotency

The precise problem: a user clicks Submit twice on a slow connection — or presses Enter while a click handler is also bound — and the form issues two identical POSTs, creating two orders, two charges, or two records.

This builds directly on the submit lifecycle described in [submission state and optimistic updates](/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/); here we isolate the single concern of never letting one user intent become two server writes. The defense has two layers that must both exist: a synchronous client guard that stops most duplicates before they leave the browser, and a server-deduplicated idempotency key that catches the ones a client guard structurally cannot.

## Context and Prerequisites

You need the submit controller's in-flight lock from the parent page — the boolean checked before the first `await`. If you have not read [submission state and optimistic updates](/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/), start there, because the idempotency key lives in the same controller closure that owns that lock, and the key's reuse-across-retries rule only makes sense against that machine.

## Why the Client Guard and the Key Are Both Required

The client guard stops duplicates that originate in one browser tab within one in-flight window. It cannot stop: a user who submits, loses the response to a dropped connection, and resubmits from a fresh page load; two tabs open on the same form; or a retry after a 5xx. Those are exactly the cases the server-side key catches. Neither layer is redundant — the guard makes duplicates rare and cheap, the key makes the rare survivors harmless.

```typescript
/**
 * A minimal double-submit-safe wrapper around a network call.
 * Combines a synchronous in-flight guard with a per-submit idempotency key.
 */
export function createIdempotentSubmit<T, R>(
  send: (payload: T, key: string, signal: AbortSignal) => Promise<R>
) {
  // Synchronous lock. JavaScript runs each function to completion before the
  // next task, so nothing between here and the first `await` can be interleaved
  // by a second call — that is what makes this check race-free, unlike a
  // disabled attribute which the browser only applies after the next paint.
  let inFlight = false;

  // One key per logical submit. Held in the closure so a retry reuses it and a
  // succeeded-but-unacknowledged request is deduplicated server-side, not
  // re-applied. Regenerating per attempt would silently reintroduce duplicates.
  let key = "";

  // AbortController lets an unmount cancel the request so its resolver never
  // touches a torn-down form; also used to supersede a stuck attempt.
  let controller: AbortController | null = null;

  return {
    isInFlight: () => inFlight,

    async submit(payload: T): Promise<R | undefined> {
      if (inFlight) return undefined;      // the guard: drop the duplicate, no throw
      inFlight = true;
      key = crypto.randomUUID();           // mint once, before any await
      controller = new AbortController();

      try {
        return await send(payload, key, controller.signal);
      } finally {
        // Release on EVERY path — success, throw, or abort — or the form locks
        // permanently after the first error and the user can never resubmit.
        inFlight = false;
      }
    },

    /** Reuse the SAME key so the server treats a retry as the same intent. */
    async retry(payload: T): Promise<R | undefined> {
      if (inFlight || !key) return undefined;
      inFlight = true;
      controller = new AbortController();
      try {
        return await send(payload, key, controller.signal);   // key unchanged
      } finally {
        inFlight = false;
      }
    },

    dispose(): void {
      controller?.abort();                 // stop an in-flight request on teardown
    },
  };
}
```

And the request side, sending the key as a header the server deduplicates on:

```typescript
async function sendOrder(payload: OrderInput, key: string, signal: AbortSignal): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Standard-ish header; the server stores this key and, for any repeat
      // within its window, replays the first response instead of writing again.
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw res;                   // let the caller's parseError route it
  return res.json() as Promise<Order>;
}
```

## Step-by-Step Walkthrough

1. **First click acquires the guard.** `submit()` sees `inFlight === false`, flips it to `true`, and mints a key — all synchronously, before the first `await`. Any code path that yields to the event loop happens only after the guard is held.

2. **The duplicate click is dropped.** A second click in the same in-flight window hits `if (inFlight) return undefined` and returns without issuing a request or throwing. Returning silently — rather than throwing — keeps the duplicate invisible to the user, which is the correct behavior.

3. **The key travels with the request.** `send()` puts the key in the `Idempotency-Key` header. The server records it keyed to the resulting write and, for any later request bearing the same key, replays the stored response instead of executing again.

4. **The guard releases in `finally`.** Whether the request resolves, throws, or aborts, `inFlight` returns to `false`. Skipping this on the error path is the single most common way to permanently lock a form after one failure.

5. **A retry reuses the key.** If the first attempt failed transiently, `retry()` sends the identical key. If the original write had actually succeeded and only its acknowledgement was lost, the server recognizes the key and returns the original result — no second order.

## Failure Modes and Edge Cases

### 1. The Enter-key double fire

Pressing Enter in a single-line input triggers the form's implicit submission. If a `click` handler is also bound to the button, both can fire and race the guard.

```typescript
// Bind ONE path. Make the button type="submit" and handle the form's onSubmit;
// do not also attach an onClick to the button. Enter and click both funnel here.
<form onSubmit={(e) => { e.preventDefault(); void controller.submit(values); }}>
  {/* ... */}
  <button type="submit">Place order</button>
</form>
```

Even if both paths did fire, the synchronous guard collapses them into one request — but funneling through a single handler removes the ambiguity entirely.

### 2. Guard never releases after an early return

An early `return` before the `finally`, or a `set` that throws, can leave `inFlight` stuck at `true`. The form then silently ignores every future submit.

```typescript
// Wrong — an early return skips the reset and locks the form forever.
async submit(payload) {
  if (inFlight) return;
  inFlight = true;
  if (!isValid(payload)) return;   // BUG: inFlight is still true
  await send(payload);
  inFlight = false;
}
```

Validate before acquiring the guard, and only ever release inside `finally`.

### 3. Idempotency key regenerated on retry

A retry that mints a fresh key defeats deduplication precisely when it matters — the lost-acknowledgement case — producing a duplicate write.

```typescript
// Wrong: new key per attempt makes every retry a brand-new server intent.
async retry(payload) {
  key = crypto.randomUUID();   // BUG — must reuse the existing key
  return send(payload, key, controller.signal);
}
```

Mint in `submit()`; leave `key` untouched in `retry()`.

### 4. Two browser tabs, same form

Two tabs each hold their own `inFlight` boolean, so the client guard cannot coordinate across them. Only the server-side key stops the duplicate.

Derive the key from a submission identity the server can recognize — or accept that cross-tab dedup is the server's job and make sure the `Idempotency-Key` window is long enough to cover a realistic user round-trip.

### 5. Non-idempotent server without key support

If the endpoint does not honor an idempotency key, the client guard is your only defense and it does not survive a page reload. Treat this as a server bug, not a client one.

Until the server supports it, gate the risky operation behind a server-issued single-use token fetched on form load and consumed on submit, which achieves the same one-write guarantee.

## Verification Checklist

- [ ] A rapid double-click issues exactly one network request (assert with a request counter in Playwright)
- [ ] Pressing Enter in a text field submits once, through the form's onSubmit, not a separate click path
- [ ] The Idempotency-Key header is present and identical across a submit and its retry
- [ ] inFlight returns to false after a rejected request (submit again succeeds, no permanent lock)
- [ ] Validation runs before the guard is acquired, so an invalid payload never holds the lock
- [ ] The submit button shows aria-busy="true" and disabled state during flight for feedback, without relying on it for correctness
- [ ] Aborting on unmount does not throw an unhandled rejection (the resolver checks signal.aborted)
- [ ] The server replays the original response for a repeated key rather than writing twice (integration test against the real endpoint)

## Frequently Asked Questions

<details>
<summary><strong>Why is disabling the submit button not enough on its own?</strong></summary>

The `disabled` attribute only applies after the framework commits the next render, which is at least a tick after the click. A second click or an Enter keypress fired in that gap still reaches the handler. Disabling is correct for feedback — it tells the user something is happening — but the actual guarantee is a synchronous in-flight boolean checked before the first `await`, backed by a server-side idempotency key for the duplicates a client guard cannot see, such as a resubmit after a lost response.

</details>

<details>
<summary><strong>Where should the idempotency key be generated — client or server?</strong></summary>

The client generates it, once per logical submit, and reuses it across retries. Only the client knows that two requests represent the same user intent; the server sees two independent HTTP calls. Generating it server-side would give each retry a distinct key and defeat deduplication for the exact case idempotency exists to cover — a request that succeeded but whose acknowledgement was lost on the network. `crypto.randomUUID()` is sufficient; the key needs to be unique per intent, not secret.

</details>

<details>
<summary><strong>How do I stop the Enter key from submitting twice?</strong></summary>

Enter in a single-line input triggers the form's implicit submit, which can coincide with a `click` handler bound to the button. Bind one submit path — the form's `onSubmit` — and make the button `type="submit"` so Enter and click both funnel through the same handler. The in-flight guard then collapses any residual overlap into a single request. Do not attach a separate `onClick` to the submit button; that is what creates the second path in the first place.

</details>

---

**Related**

- [Submission State and Optimistic Updates](/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) — the full submit state machine this guard plugs into
- [Error State Mapping Patterns](/form-state-fundamentals-architecture/error-state-mapping-patterns/) — route a server rejection onto the right field after a guarded submit
- [Asynchronous Validation Strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/) — cancel and dedup pre-submit checks with the same discipline

← [Submission State and Optimistic Updates](/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)
