---
layout: page.njk
title: "Handling Timeouts and 429s in Async Validators"
description: "An availability check that times out or hits a rate limit is not a validation failure. How to add timeouts with AbortSignal.timeout, honour Retry-After, back off, show an 'unable to check' state that does not block submit, and keep the server as the final authority."
slug: handling-timeouts-and-429s-in-async-validators
type: howto
breadcrumb: "Timeouts & 429s"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Handling Timeouts and 429s in Async Validators"
  parent: "Asynchronous Validation Strategies"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Handling Timeouts and 429s in Async Validators",
      "description": "An availability check that times out or hits a rate limit is not a validation failure. How to add timeouts with AbortSignal.timeout, honour Retry-After, back off, show an 'unable to check' state that does not block submit, and keep the server as the final authority.",
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
          "name": "Validation Logic & Schema Integration",
          "item": "https://client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Asynchronous Validation Strategies",
          "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Handling Timeouts and 429s in Async Validators",
          "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/handling-timeouts-and-429s-in-async-validators/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Handle timeouts and rate limits in async validators",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give every check a timeout"
        },
        {
          "@type": "HowToStep",
          "name": "Tell the abort causes apart"
        },
        {
          "@type": "HowToStep",
          "name": "Map status codes to verdicts, not to errors"
        },
        {
          "@type": "HowToStep",
          "name": "Honour Retry-After"
        },
        {
          "@type": "HowToStep",
          "name": "Retry once, then stop"
        },
        {
          "@type": "HowToStep",
          "name": "Let unknown through to submit"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What timeout should an availability check use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Long enough for a slow mobile connection and a busy server, short enough that the user is not left wondering — 3 to 8 seconds is typical. Measure your endpoint's p99 and set the timeout comfortably above it."
          }
        },
        {
          "@type": "Question",
          "name": "Should I show the unknown state at all, or just hide the indicator?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Show it briefly and neutrally. Hiding it leaves users unsure whether the check happened, and a silent success indicator that never appears looks like a bug. A short note plus letting them continue is honest and low-friction."
          }
        },
        {
          "@type": "Question",
          "name": "How do I avoid 429s in the first place?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Debounce checks, skip them until synchronous validation passes, cache answers, and deduplicate in-flight requests. Together these usually reduce requests by an order of magnitude compared with checking every keystroke."
          }
        }
      ]
    }
  ]
}
</script>

# Handling Timeouts and 429s in Async Validators

When an async validator's request times out or returns 429 Too Many Requests, most implementations do one of two wrong things: they report the value as invalid ("This username is taken") because the check did not return "available", or they leave the field spinning in "Checking…" forever and block the submit button with it.

Neither outcome is about the user's input. A failed *check* means "we do not know", and the form should say so and move on. This page, within [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), adds explicit timeouts, interprets 429 and `Retry-After`, retries politely, and gives the field a third state — unknown — that is visible, accessible and non-blocking.

---

## Context and prerequisites

The outcomes an async validator must distinguish:

- **Valid** — the server answered and the value is acceptable.
- **Invalid** — the server answered and the value is not acceptable ("taken", "not a real postcode").
- **Unknown** — no answer: network error, timeout, 429, 5xx. The value may be fine.
- **Superseded** — the user changed the value; this result no longer matters (handled by cancellation).

`fetch` has no timeout by default; a hung connection can wait minutes. `AbortSignal.timeout(ms)` creates a signal that aborts after `ms`, and `AbortSignal.any([a, b])` combines it with the per-keystroke cancellation signal, so either cause stops the request — and they can be told apart by the abort reason's name (`TimeoutError` versus `AbortError`).

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table mapping async validator outcomes — 2xx answers, timeouts, network errors, 429 rate limits and 5xx errors — to the field state, whether to retry, and whether submit is blocked." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Response classes and the validator&#x27;s verdict</title>
  <desc>A 2xx answer with an acceptable value makes the field valid. A 2xx answer with an unacceptable value makes it invalid and blocks submit. A timeout or network error makes it unknown, retries once, and does not block submit. A 429 makes it unknown, waits for the Retry-After time before any retry, and does not block submit. A 5xx makes it unknown, retries with backoff, and does not block submit. In every unknown case the server re-checks at submit.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Outcome</text>
  <text x="208.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field state</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Retry</text>
  <text x="534.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Blocks submit</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">2xx: acceptable</text>
  <text x="208.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="534.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">no</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">2xx: not acceptable</text>
  <text x="208.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="534.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">yes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">timeout / network</text>
  <text x="208.3" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">unknown</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">once, soon</text>
  <text x="534.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">no</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">429</text>
  <text x="208.3" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">unknown</text>
  <text x="350.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">after Retry-After</text>
  <text x="534.3" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">no</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">5xx</text>
  <text x="208.3" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">unknown</text>
  <text x="350.0" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">backoff</text>
  <text x="534.3" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">no</text>
</svg>

---

## The core pattern: a resilient check with an explicit unknown state

```typescript
export type CheckResult =
  | { state: "valid" }
  | { state: "invalid"; message: string }
  | { state: "unknown"; message: string; retryAfterMs?: number };

const TIMEOUT_MS = 5000;

export async function checkUsername(value: string, cancel: AbortSignal): Promise<CheckResult> {
  // Either the user's next keystroke (cancel) or the timeout stops the request.
  const signal = AbortSignal.any([cancel, AbortSignal.timeout(TIMEOUT_MS)]);
  let res: Response;
  try {
    res = await fetch(`/api/usernames/${encodeURIComponent(value)}`, { signal });
  } catch (err) {
    if (cancel.aborted) throw err;                         // superseded: caller ignores it
    const timedOut = (err as DOMException)?.name === "TimeoutError";
    return { state: "unknown", message: timedOut
      ? "We couldn't check this username right now. You can still continue."
      : "You seem to be offline. We'll check this username when you submit." };
  }

  if (res.status === 429) {
    return { state: "unknown", message: "We couldn't check this username right now. You can still continue.",
             retryAfterMs: parseRetryAfter(res.headers.get("Retry-After")) };
  }
  if (res.status >= 500) {
    return { state: "unknown", message: "We couldn't check this username right now. You can still continue." };
  }
  if (res.status === 404) return { state: "valid" };      // no such user: available
  if (res.ok) return { state: "invalid", message: "That username is taken. Try another." };
  return { state: "unknown", message: "We couldn't check this username right now." };
}

// Retry-After is either delay-seconds or an HTTP date.
export function parseRetryAfter(h: string | null): number | undefined {
  if (!h) return undefined;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(h);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

// Field-level policy: one automatic retry for unknowns, honouring Retry-After,
// and never more often than the server allows.
export function scheduleRetry(result: CheckResult, retry: () => void, alreadyRetried: boolean) {
  if (result.state !== "unknown" || alreadyRetried) return undefined;
  const base = result.retryAfterMs ?? 2000;
  const delay = base + Math.random() * 500;              // jitter: avoid synchronised retries
  return setTimeout(retry, delay);
}
```

The field renders the three states differently: valid shows a quiet confirmation, invalid shows an error and sets `aria-invalid`, and unknown shows a neutral note *without* `aria-invalid` and without blocking submit.

---

## Step-by-step walkthrough

1. **Give every check a timeout.** `AbortSignal.timeout(5000)` bounds the wait; combine it with the cancellation signal using `AbortSignal.any`.
2. **Tell the abort causes apart.** A `TimeoutError` means "unknown"; an `AbortError` from the user's own signal means "superseded" — do nothing.
3. **Map status codes to verdicts, not to errors.** Only a successful response with a clear answer can make the field invalid. 429 and 5xx are unknown.
4. **Honour `Retry-After`.** Retrying before the server allows prolongs the rate limit and is impolite. If no header is present, use a modest delay with jitter.
5. **Retry once, then stop.** An unknown state is acceptable; hammering the endpoint is not. Retrying at submit time is the natural second chance.
6. **Let unknown through to submit.** The server performs the same check at submit and is authoritative; route its answer back with the field mapping in [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).

### Why "unknown" must not block

Blocking submit whenever an availability check fails turns an outage in a non-essential service into an outage of your whole sign-up flow. The availability check exists to give users early feedback, not to protect data — the server enforces uniqueness at submit regardless. So an unknown result costs almost nothing if it lets the user continue: at worst, they learn at submit that the username is taken and pick another. Blocking, by contrast, costs every user who arrives during a rate-limit window or a slow deploy. Design the unknown state as a normal, calm part of the UI.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a username check receiving 429 with Retry-After, the field showing an unknown state, a single retry after the delay succeeding, and the field becoming valid." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A 429 during a username check</title>
  <desc>The validator requests the username check. The server responds 429 with Retry-After of 3 seconds. The field shows a neutral message saying the username could not be checked right now, without marking it invalid, and submit remains available. After three seconds plus jitter, one retry is sent. The server responds that the username is available, and the field shows it as valid.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Field</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Validator</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="348.0" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">GET /usernames/ada_l</text>
  <path d="M340.0,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">429, Retry-After: 3</text>
  <path d="M557.3,97.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,93.0 341.0,97.0 348.0,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">unknown: &quot;couldn&#x27;t check right now&quot;</text>
  <path d="M340.0,125.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,121.0 123.7,125.0 130.7,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">retry after ~3 s</text>
  <path d="M340.0,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">404: available</text>
  <path d="M557.3,181.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,177.0 341.0,181.0 348.0,185.0" fill="#7b4f8a"/>
  <text x="130.7" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <path d="M340.0,209.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,205.0 123.7,209.0 130.7,213.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. `AbortSignal.any` support

`AbortSignal.any` and `AbortSignal.timeout` are available in current browsers. For older targets, create a controller, `setTimeout` its abort with a `TimeoutError` reason, and forward the cancellation signal's abort to it manually.

### 2. Caching unknowns

Never store an unknown result in a validation cache — the next check should try again. The caching rules are in [caching async validation results](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/caching-async-validation-results/).

### 3. Retries that outlive the field

A scheduled retry must be cleared when the value changes or the form unmounts; otherwise it fires for a value the user abandoned. Keep the timer id with the field's check state and clear it in the same place you abort the request.

### 4. Retry storms after an outage

When a service recovers, every open form retrying at the same moment can knock it over again. Jitter and a single retry per field keep the load spread; honouring `Retry-After` lets the server shape it.

### 5. Wording that blames the user

"Invalid username" on a timeout tells the user their input is wrong. Say what happened and what they can do: "We couldn't check this username right now. You can still continue."

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing how an async-validated field presents the valid, invalid and unknown states, including ARIA attributes and submit behaviour." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The three visible states of an async field</title>
  <desc>In the valid state the field shows a quiet confirmation, has no aria-invalid and allows submit. In the invalid state it shows an error message linked with aria-describedby, sets aria-invalid true and blocks submit. In the unknown state it shows a neutral note linked with aria-describedby, does not set aria-invalid and allows submit, because the server will check again.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Valid</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;ada_l is available&quot;</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No aria-invalid.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit allowed.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Invalid</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;That username is taken.&quot;</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid=&quot;true&quot;.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit blocked.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Unknown</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;We couldn&#x27;t check right now.&quot;</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No aria-invalid.</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit allowed; server re-checks.</text>
</svg>

---

## Verification checklist

- [ ] A hung request ends after the timeout with an unknown state.
- [ ] A 429 shows an unknown state and the next retry waits for `Retry-After`.
- [ ] A 5xx never marks the value invalid.
- [ ] Unknown results do not set `aria-invalid` and do not block submit.
- [ ] Only one automatic retry happens per value.
- [ ] Changing the value cancels both the request and any scheduled retry.
- [ ] The submit endpoint re-checks and its answer reaches the field.
- [ ] Messages for unknown states do not blame the user.

---

## Frequently Asked Questions

<details>
<summary><strong>What timeout should an availability check use?</strong></summary>

Long enough for a slow mobile connection and a busy server, short enough that the user is not left wondering — 3 to 8 seconds is typical. Measure your endpoint's p99 and set the timeout comfortably above it.

</details>

<details>
<summary><strong>Should I show the unknown state at all, or just hide the indicator?</strong></summary>

Show it briefly and neutrally. Hiding it leaves users unsure whether the check happened, and a silent success indicator that never appears looks like a bug. A short note plus letting them continue is honest and low-friction.

</details>

<details>
<summary><strong>How do I avoid 429s in the first place?</strong></summary>

Debounce checks, skip them until synchronous validation passes, cache answers, and deduplicate in-flight requests. Together these usually reduce requests by an order of magnitude compared with checking every keystroke.

</details>

---

## Related

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
- [Retrying Failed Submissions With Backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/)
- [Cancelling Angular Async Validators With switchMap](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/cancelling-angular-async-validators-with-switchmap/)

← [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
