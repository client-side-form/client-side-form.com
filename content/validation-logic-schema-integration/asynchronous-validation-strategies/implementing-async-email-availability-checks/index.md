---
layout: page.njk
title: "Implementing Async Email Availability Checks"
description: "Production patterns for debounced async email validation with AbortController race-condition prevention, LRU caching, exponential-backoff retries, and ARIA live-region wiring."
slug: implementing-async-email-availability-checks
type: howto
breadcrumb: "Implementing Async Email Availability Checks"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Implementing Async Email Availability Checks"
  parent: "Asynchronous Validation Strategies"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Implementing Async Email Availability Checks",
      "description": "Production patterns for debounced async email validation with AbortController race-condition prevention, LRU caching, exponential-backoff retries, and ARIA live-region wiring.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Asynchronous Validation Strategies", "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/" },
        { "@type": "ListItem", "position": 4, "name": "Implementing Async Email Availability Checks", "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Async Email Availability Checks",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Define the finite-state machine and hook contract" },
        { "@type": "HowToStep", "position": 2, "name": "Build the debounced fetch with AbortController cancellation" },
        { "@type": "HowToStep", "position": 3, "name": "Add LRU caching and request-ID guard" },
        { "@type": "HowToStep", "position": 4, "name": "Wire ARIA live regions to validation state" },
        { "@type": "HowToStep", "position": 5, "name": "Implement exponential-backoff retry on network failure" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not validate on every keystroke without debounce?",
          "acceptedAnswer": { "@type": "Answer", "text": "Unthrottled requests saturate the network, produce race conditions, and degrade server performance. A 400 ms debounce aligns with average typing cadence while ensuring the settled input value is what gets validated." }
        },
        {
          "@type": "Question",
          "name": "What happens if the user submits while status is VALIDATING?",
          "acceptedAnswer": { "@type": "Answer", "text": "The onSubmit handler must await the in-flight promise before deciding whether to proceed. Block the submission gate until the status resolves to AVAILABLE or TAKEN, then surface the appropriate error if needed." }
        },
        {
          "@type": "Question",
          "name": "How do I handle syntactically valid but RFC 5322-violating emails?",
          "acceptedAnswer": { "@type": "Answer", "text": "Run a synchronous regex check first. If it fails, return ERROR immediately and skip the network call. Only dispatch async requests for inputs that already pass local format validation." }
        },
        {
          "@type": "Question",
          "name": "How do I verify the LRU cache is working during QA?",
          "acceptedAnswer": { "@type": "Answer", "text": "In a development build, temporarily expose the cache Map on window. Type the same normalized email twice and confirm the Network tab shows only one outbound request." }
        }
      ]
    }
  ]
}
</script>

# Implementing Async Email Availability Checks

**Exact problem:** a stale `TAKEN` response from a slow network hop overwrites the `AVAILABLE` result that arrived a moment later, silently blocking a valid registration — because there is no request-ID guard on the state commit.

Fixing this requires four tightly coordinated pieces: a debounced fetch, an `AbortController` that cancels in-flight requests on every new keystroke, a request-ID guard that rejects out-of-order responses, and an LRU cache that short-circuits identical lookups. This page walks through each piece, then covers failure modes and the ARIA wiring your screen-reader users depend on.

## Context and prerequisites

This page is a focused how-to that sits under [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), which covers the full debounce-and-cancel lifecycle model that the hook below implements. If you are deciding whether to colocate this logic inside a Zod `.superRefine()` call or keep it separate, read [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) first — async Zod refinements carry different abort semantics than the manual pattern shown here.

---

## State machine diagram

The hook moves through six states. Understanding these transitions is the fastest way to diagnose production incidents.

<svg viewBox="0 0 640 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="State machine: IDLE to DEBOUNCING to VALIDATING then to AVAILABLE, TAKEN, or ERROR" style="width:100%;max-width:640px;display:block;margin:1.5rem auto;">
  <title>Async email validation state machine</title>
  <desc>Diagram showing six states: IDLE, DEBOUNCING, VALIDATING, AVAILABLE, TAKEN, ERROR. IDLE transitions to DEBOUNCING on onChange. DEBOUNCING transitions to VALIDATING after 400ms debounce. VALIDATING transitions to AVAILABLE, TAKEN, or ERROR based on the server response. ERROR can transition back to VALIDATING on retry.</desc>
  <rect x="0" y="0" width="640" height="220" fill="#f9f5fb"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- State boxes -->
  <!-- IDLE -->
  <rect x="10" y="80" width="80" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="50" y="103" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">IDLE</text>
  <!-- DEBOUNCING -->
  <rect x="140" y="80" width="110" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="195" y="103" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">DEBOUNCING</text>
  <!-- VALIDATING -->
  <rect x="305" y="80" width="100" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="355" y="103" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">VALIDATING</text>
  <!-- AVAILABLE -->
  <rect x="460" y="20" width="100" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="510" y="43" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">AVAILABLE</text>
  <!-- TAKEN -->
  <rect x="460" y="80" width="100" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="510" y="103" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">TAKEN</text>
  <!-- ERROR -->
  <rect x="460" y="140" width="100" height="36" rx="6" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="510" y="163" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="monospace">ERROR</text>
  <!-- Arrows -->
  <!-- IDLE -> DEBOUNCING -->
  <line x1="90" y1="98" x2="138" y2="98" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="114" y="92" text-anchor="middle" font-size="10" fill="#6b5f75">onChange</text>
  <!-- DEBOUNCING -> VALIDATING -->
  <line x1="250" y1="98" x2="303" y2="98" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="277" y="92" text-anchor="middle" font-size="10" fill="#6b5f75">400ms</text>
  <!-- VALIDATING -> AVAILABLE -->
  <line x1="405" y1="88" x2="458" y2="48" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="428" y="60" text-anchor="middle" font-size="10" fill="#6b5f75">free</text>
  <!-- VALIDATING -> TAKEN -->
  <line x1="405" y1="98" x2="458" y2="98" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="432" y="92" text-anchor="middle" font-size="10" fill="#6b5f75">in use</text>
  <!-- VALIDATING -> ERROR -->
  <line x1="405" y1="108" x2="458" y2="148" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="428" y="138" text-anchor="middle" font-size="10" fill="#6b5f75">failure</text>
  <!-- ERROR -> VALIDATING (retry arc) -->
  <path d="M 510 176 Q 510 210 355 210 Q 280 210 355 118" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="430" y="207" text-anchor="middle" font-size="10" fill="#6b5f75">retry</text>
</svg>

---

## Core implementation

The hook below is the complete, production-ready implementation. Every non-obvious line carries an inline comment.

```typescript
import { useEffect, useRef, useState } from 'react';

type ValidationState =
  | 'IDLE'
  | 'DEBOUNCING'
  | 'VALIDATING'
  | 'AVAILABLE'
  | 'TAKEN'
  | 'ERROR';

interface UseAsyncEmailAvailabilityReturn {
  status: ValidationState;
  error: Error | null;
}

// Module-level LRU cache shared across hook instances.
// Keyed by normalized (lowercase + trimmed) email so equivalent addresses
// never trigger duplicate network calls within the same page session.
const cache = new Map<string, ValidationState>();
const MAX_CACHE_SIZE = 50;

function evictIfFull(): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Map preserves insertion order — delete the oldest key.
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

async function fetchAvailability(
  normalized: string,
  signal: AbortSignal // AbortSignal threads the cancellation token into fetch;
                     // if the controller fires, fetch rejects with AbortError.
): Promise<ValidationState> {
  const res = await fetch(
    `/api/validate-email?email=${encodeURIComponent(normalized)}`,
    { signal }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Re-check abort state after every await — the signal can fire between
  // the fetch resolve and this line if the user typed again very quickly.
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const data = (await res.json()) as { isAvailable: boolean };
  return data.isAvailable ? 'AVAILABLE' : 'TAKEN';
}

export function useAsyncEmailAvailability(
  email: string,
  { debounceMs = 400, maxRetries = 3 } = {}
): UseAsyncEmailAvailabilityReturn {
  const [status, setStatus] = useState<ValidationState>('IDLE');
  const [error, setError] = useState<Error | null>(null);

  // useRef holds the AbortController so the cleanup function always closes
  // over the *current* controller, not the one captured at render time.
  const controllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const cycleIdRef = useRef(0); // monotonically incrementing request-ID guard

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('IDLE');
      return;
    }

    const normalized = trimmed.toLowerCase();

    // Fast path: return the cached result without touching the network.
    const cached = cache.get(normalized);
    if (cached) {
      setStatus(cached);
      return;
    }

    setStatus('DEBOUNCING');
    retryCountRef.current = 0;

    const timerId = setTimeout(async () => {
      // Cancel any previous in-flight request immediately.
      // Calling .abort() on an already-aborted controller is a no-op.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      // Increment the cycle ID. The async callback will reject its own
      // result if this counter has moved on by the time it resolves.
      const thisCycleId = ++cycleIdRef.current;

      const attempt = async (retryIndex: number): Promise<void> => {
        try {
          setStatus('VALIDATING');
          const result = await fetchAvailability(normalized, controller.signal);

          // Guard: only commit state if this cycle is still the latest one.
          if (thisCycleId !== cycleIdRef.current) return;

          evictIfFull();
          cache.set(normalized, result);
          setStatus(result);
          setError(null);
        } catch (err) {
          if ((err as DOMException).name === 'AbortError') return; // user moved on — discard silently

          if (thisCycleId !== cycleIdRef.current) return;

          if (retryIndex < maxRetries) {
            // Exponential backoff: 500ms → 1000ms → 2000ms
            const delay = 500 * Math.pow(2, retryIndex);
            setTimeout(() => attempt(retryIndex + 1), delay);
          } else {
            setStatus('ERROR');
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      };

      await attempt(0);
    }, debounceMs);

    // Cleanup: cancel the debounce timer and abort the in-flight request
    // when email changes before the timer fires, or on unmount.
    return () => {
      clearTimeout(timerId);
      controllerRef.current?.abort();
    };
  }, [email, debounceMs, maxRetries]);

  return { status, error };
}
```

---

## Step-by-step walkthrough

1. **Normalize the email first.** `email.trim().toLowerCase()` before any cache lookup or network call ensures `User@Example.com` and `user@example.com` share the same cached result and never generate duplicate requests.

2. **Check the LRU cache.** If the normalized email is already in `cache`, call `setStatus(cached)` and return immediately. The `useEffect` cleanup will not run because there is no timer or controller to clear.

3. **Set `DEBOUNCING` and start the timer.** The `setTimeout` with `debounceMs` (default 400 ms) delays the actual fetch. Any new keystroke before the timer fires will cause React to re-run the effect, which will call the cleanup, which calls `clearTimeout(timerId)` — the timer never fires.

4. **Instantiate a fresh `AbortController` for this cycle.** Immediately call `controllerRef.current?.abort()` on the *previous* controller before assigning the new one. This pattern is the single most important line in the hook: it ensures that a slow response from a previous cycle cannot overwrite the current state.

5. **Increment `cycleIdRef.current` and capture `thisCycleId`.** Even if two fetches are in flight simultaneously (edge case: abort signal arrives late), the commit guard `if (thisCycleId !== cycleIdRef.current) return` prevents the slower one from writing state.

6. **Set `VALIDATING` and call `fetchAvailability`.** Pass `controller.signal` through to `fetch`. The function re-checks `signal.aborted` after every `await` — this catches the race where the abort fires between the `fetch` resolve and the `res.json()` call.

7. **On success, write to cache and commit state.** `evictIfFull()` prevents unbounded memory growth by removing the oldest entry when the 50-item limit is reached.

8. **On `AbortError`, return silently.** These are not failures — they are deliberate cancellations. Surfacing them as errors confuses users.

9. **On other errors, retry with exponential backoff.** Each retry increments `retryIndex`. After `maxRetries` attempts the hook sets `ERROR` and surfaces the underlying error object.

---

An availability check is a claim with a shelf life, and every state the field can be in needs a distinct treatment — including the two that are neither valid nor invalid:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five states of an availability-checked field and the treatment of each: not yet checked, checking, available, taken, and could-not-check. Each row gives what aria-invalid should be, what the reader sees, and whether submit is blocked." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Five states, and only one of them blocks the submit</title>
  <desc>Not yet checked: aria-invalid is absent, nothing is shown, and submit is allowed because the server will check anyway. Checking: aria-invalid is absent, a busy indicator is shown, and submit is allowed but queued behind the check. Available: aria-invalid is false, a confirmation is shown, and submit proceeds. Taken: aria-invalid is true, the reason is shown, and the submit is blocked — the only row that blocks. Could not check, meaning the request failed: aria-invalid is absent, a neutral note is shown, and submit is allowed, because a network problem is not the reader's mistake.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">State</text>
  <text x="168" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">aria-invalid</text>
  <text x="290" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Reader sees</text>
  <text x="520" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submit</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">not yet checked</text>
  <text x="168" y="66" font-size="10" fill="#6b5f75" font-family="inherit">absent</text>
  <text x="290" y="66" font-size="10" fill="#6b5f75" font-family="inherit">nothing</text>
  <text x="520" y="66" font-size="10" fill="#2d6342" font-family="inherit">allowed</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">checking</text>
  <text x="168" y="100" font-size="10" fill="#6b5f75" font-family="inherit">absent</text>
  <text x="290" y="100" font-size="10" fill="#6b5f75" font-family="inherit">a busy indicator</text>
  <text x="520" y="100" font-size="10" fill="#6b5f75" font-family="inherit">allowed, queued</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">available</text>
  <text x="168" y="134" font-size="10" fill="#6b5f75" font-family="inherit">false</text>
  <text x="290" y="134" font-size="10" fill="#2d6342" font-family="inherit">a confirmation</text>
  <text x="520" y="134" font-size="10" fill="#2d6342" font-family="inherit">allowed</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">taken</text>
  <text x="168" y="168" font-size="10" fill="#a63d6f" font-family="inherit">true</text>
  <text x="290" y="168" font-size="10" fill="#a63d6f" font-family="inherit">the reason, and a way forward</text>
  <text x="520" y="168" font-size="10" fill="#a63d6f" font-family="inherit">blocked</text>
  <line x1="10" y1="182" x2="690" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">could not check</text>
  <text x="168" y="202" font-size="10" fill="#6b5f75" font-family="inherit">absent</text>
  <text x="290" y="202" font-size="10" fill="#6b5f75" font-family="inherit">a neutral note</text>
  <text x="520" y="202" font-size="10" fill="#2d6342" font-family="inherit">allowed</text>
</svg>

## Failure modes and edge cases

**Stale `TAKEN` overwrites `AVAILABLE`**

This is the race condition the cycle-ID guard prevents. If you see a free address briefly flash as taken during rapid typing, check that `thisCycleId !== cycleIdRef.current` is evaluated *before* `setStatus` is called, not after.

**Autofill bypasses debounce**

Browser autofill fires a single synthetic `change` event (not a stream of `input` events), so the debounce will fire exactly once. No special handling needed. However, some password managers dispatch `input` followed immediately by `change` — confirm in DevTools that both events are handled by the same controlled input so the hook sees only the final settled value.

**Safari `AbortError` vs `DOMException` naming**

Older Safari versions throw `DOMException` with `.name === 'AbortError'` but `.message` as an empty string. The guard `(err as DOMException).name === 'AbortError'` is safe across all current browsers; do not rely on `err instanceof DOMException` alone.

**Component unmounts while `VALIDATING`**

The `useEffect` cleanup calls `controllerRef.current?.abort()`. This aborts the in-flight fetch, which rejects with `AbortError`, which is silently discarded. No state updates fire after unmount.

**Cache serves stale `TAKEN` for a reclaimed email**

If a user abandons registration and the email becomes free again, the module-level cache will serve the old `TAKEN` result until the page is refreshed. For high-churn sign-up flows, add a timestamp to each cache entry and expire results older than a threshold (e.g., 5 minutes).

---

## ARIA live-region wiring

Wire the six states to ARIA attributes so screen readers announce status changes without interrupting typing. Use a separate status `<span>` — never `aria-live` on the input itself.

```tsx
export function EmailField() {
  const [email, setEmail] = React.useState('');
  const { status, error } = useAsyncEmailAvailability(email);

  const statusMessage: Record<ValidationState, string> = {
    IDLE: '',
    DEBOUNCING: '',
    VALIDATING: 'Checking availability…',
    AVAILABLE: 'Email address is available.',
    TAKEN: 'This email is already registered.',
    ERROR: 'Could not verify availability. Please try again.',
  };

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        aria-invalid={status === 'TAKEN' || status === 'ERROR'}
        aria-describedby="email-status"
        data-validation-state={status} {/* Playwright/Cypress selector hook */}
      />
      {/* aria-live="polite" announces after the user pauses typing.
          role="status" is equivalent but polite is more widely supported. */}
      <span
        id="email-status"
        aria-live="polite"
        aria-atomic="true"
        style={{ display: 'block', minHeight: '1.2em' }}
      >
        {statusMessage[status]}
      </span>
    </div>
  );
}
```

State-to-ARIA mapping summary:

| State | aria-invalid | aria-live | Notes |
|---|---|---|---|
| `IDLE` / `DEBOUNCING` | — | polite | Do not announce anything while the user is typing |
| `VALIDATING` | — | polite | "Checking availability…" — brief, non-intrusive |
| `AVAILABLE` | `false` | polite | Positive confirmation read once |
| `TAKEN` | `true` | polite | Error wired via `aria-describedby` to the status span |
| `ERROR` | `true` | polite | Include a retry affordance with a descriptive `aria-label` |

---

There is also a privacy dimension that a purely technical treatment misses. An availability endpoint is an account-existence oracle, and how you build it decides how cheaply it can be harvested:

<svg viewBox="0 8 690 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three mitigations for an availability endpoint doubling as an account-existence oracle: rate limiting per client, checking only on blur rather than on every keystroke, and returning a generic result on a sign-in form while keeping the specific one on registration." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The check is also an account-existence oracle</title>
  <desc>Rate limit per client and per address: an unlimited endpoint lets an attacker test a leaked address list at network speed, which the reader never notices. Check on blur rather than on every keystroke: keystroke checking multiplies the request count by roughly the length of an address, and gives an attacker prefix-level feedback for free. Distinguish the surface: on a registration form, telling the reader an address is taken is the whole point; on a sign-in or password-reset form the same information leaks whether an account exists, so the response there must be identical either way.</desc>
  <rect x="0" y="8" width="690" height="210" fill="#f9f5fb"/>
  <rect x="14" y="26" width="212" height="108" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">rate limit</text>
  <text x="28" y="70" font-size="9.5" fill="#6b5f75" font-family="inherit">per client and per address</text>
  <text x="28" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">an open endpoint tests a</text>
  <text x="28" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">leaked list at network speed</text>
  <text x="28" y="124" font-size="9.5" fill="#a63d6f" font-family="inherit">invisible to your readers</text>
  <rect x="238" y="26" width="212" height="108" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="252" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">check on blur</text>
  <text x="252" y="70" font-size="9.5" fill="#6b5f75" font-family="inherit">not on every keystroke</text>
  <text x="252" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">keystroke checks give</text>
  <text x="252" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">prefix-level feedback free</text>
  <text x="252" y="124" font-size="9.5" fill="#2d6342" font-family="inherit">and cut traffic ~20×</text>
  <rect x="462" y="26" width="214" height="108" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="476" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">split by surface</text>
  <text x="476" y="70" font-size="9.5" fill="#6b5f75" font-family="inherit">registration: be specific</text>
  <text x="476" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">sign-in and reset: never</text>
  <text x="476" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">reveal whether it exists</text>
  <text x="476" y="124" font-size="9.5" fill="#2d6342" font-family="inherit">same response either way</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">On registration the disclosure is inherent: the reader must be told the address is taken, or they cannot proceed.</text>
  <text x="14" y="184" font-size="10" fill="#6b5f75" font-family="inherit">That is an argument for limiting the rate, not for removing the feedback — the alternative is a submit that always fails.</text>
  <text x="14" y="204" font-size="10" fill="#6b5f75" font-family="inherit">Pair the "taken" message with a route forward — a sign-in link, or a reset link — so the dead end is one click deep.</text>
</svg>

## Verification checklist

- Network tab shows only one outbound request after rapid typing (10+ characters per second)
- Aborting a slow request (throttle to Slow 3G, type quickly) does not cause a "TAKEN" flash on a free email
- Submitting while `status === 'VALIDATING'` blocks the form and waits for resolution
- Screen reader announces "Email address is available" only once after the user pauses — not on every keystroke
- `aria-invalid="true"` appears on the input when `status === 'TAKEN'`
- Going offline triggers exponential-backoff retry, then surfaces `ERROR` after three failures
- The same normalized email typed twice produces exactly one network request (cache hit confirmed in Network tab)
- Component unmount during `VALIDATING` produces no React "state update on unmounted component" warning

---

## FAQ

<details>
<summary>Why not validate on every keystroke without debounce?</summary>

Unthrottled requests saturate the network, produce race conditions, and degrade server performance. A 400 ms debounce aligns with average typing cadence while ensuring the settled input value is what gets validated. You can reduce the delay to 250 ms for fields where users typically paste an email rather than type it.
</details>

<details>
<summary><span>What happens if the user submits while <code>status</code> is <code>VALIDATING</code>?</span></summary>

The `onSubmit` handler must be a blocking gate. The cleanest approach is to surface the pending state as a form-level `submitting` guard: if `status !== 'AVAILABLE'`, call `event.preventDefault()` and display a "Verifying email…" banner. If you use React Hook Form, pass the `status` into a custom `validate` function on the field that returns a promise — React Hook Form will await it before running `handleSubmit`.
</details>

<details>
<summary>How do I handle syntactically valid but RFC 5322-violating emails?</summary>

Run a synchronous regex check before the hook fires. If it fails, short-circuit to `ERROR` immediately and skip the network call. The hook itself can accept an optional `skipNetwork` flag, or you can gate the `email` prop: only pass a non-empty string to the hook once the local format check passes.
</details>

<details>
<summary>How do I verify the LRU cache is working during QA?</summary>

In a development build, temporarily add `(window as any).__emailCache = cache` after the `cache` declaration. Open the console, type a valid email, wait for `AVAILABLE`, then type the same email again. Confirm in the Network tab that no second request fires, and `window.__emailCache.get('user@example.com')` returns `'AVAILABLE'`.
</details>

---

## Related

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — debounce architecture, cancel tokens, and retry coordination patterns
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — async `.superRefine()` and how Zod's abort semantics differ from manual AbortController usage
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — how async validators plug into the full onChange → onBlur → onSubmit pipeline
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — propagating `TAKEN` and `ERROR` states through to accessible UI components

← [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
