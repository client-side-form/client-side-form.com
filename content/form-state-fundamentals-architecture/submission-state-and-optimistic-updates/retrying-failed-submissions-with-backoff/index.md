---
layout: page.njk
title: "Retrying Failed Submissions with Backoff"
description: "Retry only the failures that are about the network, reuse one idempotency key across every attempt, jitter the delay, and hand the reader a manual retry once the cap is reached."
slug: retrying-failed-submissions-with-backoff
type: howto
breadcrumb: "Retrying Failed Submissions with Backoff"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Retrying Failed Submissions with Backoff"
  parent: "Submission State and Optimistic Updates"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Retrying Failed Submissions with Backoff",
      "description": "Retry only the failures that are about the network, reuse one idempotency key across every attempt, jitter the delay, and hand the reader a manual retry once the cap is reached.",
      "datePublished": "2026-08-05",
      "dateModified": "2026-08-05",
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
          "item": "https://www.client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Submission State and Optimistic Updates",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Retrying Failed Submissions with Backoff",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Retry a failed form submission safely",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Mint one idempotency key before the first attempt"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Classify the response before deciding to retry"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Honour a Retry-After header when present"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Apply full jitter to the exponential delay"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Cap both the attempt count and the elapsed time"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Retry immediately when the connection returns"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Hand the reader a manual retry after the cap"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Which responses should never be retried?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Anything that will fail identically the second time: a 422, because the payload is understood and rejected; a 409, because repeating the request does not resolve a conflict and can lose the reader's edit; a 401 or 403, which need a different credential rather than another attempt; and a 501, which will never be implemented by that server. Everything else worth retrying is either a network failure, a rate limit, or a 5xx."
          }
        },
        {
          "@type": "Question",
          "name": "Why jitter the delay?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because a service failure usually fails many clients at once, and if they all compute the same exponential delay they all come back at the same instant — reproducing the load spike that caused the failure, on a schedule. Full jitter, a random value between zero and the exponential bound, spreads the retries out. It is one Math.random call and it is the difference between a recovery and a second outage."
          }
        },
        {
          "@type": "Question",
          "name": "Should a retry be automatic or offered to the reader?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Automatic for the first few attempts, over a few seconds, with an honest status message — readers do not want to press a button because a packet was dropped. After the cap, hand it to them: a visible retry control with the reason. Silent indefinite retrying is the worst option, because a spinner that never resolves gives them nothing to act on and no idea whether their work is safe."
          }
        }
      ]
    }
  ]
}
</script>

# Retrying Failed Submissions with Backoff

The exact problem: a submit fails on a flaky connection, the form retries immediately three times, and the server — which received all three — creates three records.

## Context and Prerequisites

Two prerequisites make retrying safe rather than dangerous: an idempotency key that survives the retry, described in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/), and a response classification that distinguishes "your input was wrong" from "we could not reach the service", described in [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/). Retrying without either is how a network blip becomes a billing incident.

## Core Pattern

```typescript
interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly ceilingMs: number;
}

const DEFAULT: RetryPolicy = { maxAttempts: 4, baseMs: 500, ceilingMs: 20_000 };

/** Only these are worth retrying. Everything else is a decision, not a blip. */
function isRetryable(res: Response | null): boolean {
  if (res === null) return true;                    // network failure or timeout
  if (res.status === 429) return true;              // rate limited — honour Retry-After
  return res.status >= 500 && res.status !== 501;   // 501 will never succeed
}

function delayFor(attempt: number, res: Response | null, p: RetryPolicy): number {
  const header = res?.headers.get('retry-after');
  // A server that tells you when to come back is always right; obey it.
  if (header) return Number(header) * 1000;
  const exponential = Math.min(p.ceilingMs, p.baseMs * 2 ** attempt);
  // Full jitter: without it, every client that failed together retries together
  // and reproduces the load spike that caused the failure.
  return Math.random() * exponential;
}

export async function submitWithRetry(
  send: (key: string, signal: AbortSignal) => Promise<Response>,
  key: string, signal: AbortSignal, p: RetryPolicy = DEFAULT,
): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < p.maxAttempts; attempt++) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    try {
      // The SAME key on every attempt. This is what makes the retry safe:
      // a request the server already processed returns its original result.
      lastRes = await send(key, signal);
      if (lastRes.ok || !isRetryable(lastRes)) return lastRes;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      lastRes = null;
    }
    if (attempt === p.maxAttempts - 1) break;
    await sleep(delayFor(attempt, lastRes, p), signal);
  }
  return lastRes ?? Response.error();
}
```

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Which responses are retried and which are not: network failures, timeouts, 429 and 5xx are retried with the same idempotency key, while 2xx, 4xx validation failures, 409 conflicts and 501 are returned to the caller immediately." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Retry the failures that are about the network, not about the payload</title>
  <desc>Retried: a network failure or timeout, where nothing is known about whether the request arrived; a 429, where the server has explicitly asked for a delay and usually named one; and a 5xx other than 501, where the service failed rather than the payload. Not retried: any 2xx, which succeeded; a 422 or other validation failure, where the same payload will be rejected identically; a 409 conflict, which needs reconciliation rather than repetition; a 401 or 403, which needs a different credential; and a 501, which will never succeed. Every retry carries the same idempotency key, so a request the server already processed returns its original result rather than creating a second record.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">retry — the network failed</text>
  <rect x="14" y="38" width="326" height="140" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#1e1a24" font-family="inherit">network failure or timeout</text>
  <text x="28" y="80" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is known about whether it arrived</text>
  <text x="28" y="106" font-size="10" fill="#1e1a24" font-family="inherit">429 — honour Retry-After</text>
  <text x="28" y="124" font-size="9.5" fill="#6b5f75" font-family="inherit">the server named a time; obey it</text>
  <text x="28" y="150" font-size="10" fill="#1e1a24" font-family="inherit">5xx, except 501</text>
  <text x="28" y="168" font-size="9.5" fill="#6b5f75" font-family="inherit">the service failed, not the payload</text>
  <text x="364" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">do not retry — it is a decision</text>
  <rect x="364" y="38" width="312" height="140" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="378" y="62" font-size="10" fill="#1e1a24" font-family="inherit">422 — the same payload fails the same way</text>
  <text x="378" y="88" font-size="10" fill="#1e1a24" font-family="inherit">409 — reconcile, do not repeat</text>
  <text x="378" y="114" font-size="10" fill="#1e1a24" font-family="inherit">401, 403 — a different credential is needed</text>
  <text x="378" y="140" font-size="10" fill="#1e1a24" font-family="inherit">501 — it will never succeed</text>
  <text x="378" y="166" font-size="9.5" fill="#6b5f75" font-family="inherit">every retry reuses the same idempotency key</text>
  <text x="14" y="210" font-size="10" fill="#6b5f75" font-family="inherit">Full jitter on the delay: without it, every client that failed at the same moment comes back at the same moment.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="With a base of five hundred milliseconds and a ceiling of twenty seconds, the exponential bound doubles each attempt: five hundred milliseconds, one second, two seconds, four seconds. Full jitter picks a random delay between zero and that bound, so the actual waits are shorter and, crucially, different for every client that failed at the same moment. The fourth attempt is the last, after which the reader gets a manual retry control rather than an indefinite wait." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A worked backoff, with full jitter</title>
  <desc>With a base of five hundred milliseconds and a ceiling of twenty seconds, the exponential bound doubles each attempt: five hundred milliseconds, one second, two seconds, four seconds. Full jitter picks a random delay between zero and that bound, so the actual waits are shorter and, crucially, different for every client that failed at the same moment. The fourth attempt is the last, after which the reader gets a manual retry control rather than an indefinite wait.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Attempt</text>
  <text x="130" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Exponential bound</text>
  <text x="300" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Actual wait</text>
  <text x="480" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cumulative</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">1 → 2</text>
  <text x="130" y="66" font-size="10" fill="#6b5f75" font-family="inherit">500ms</text>
  <text x="300" y="66" font-size="10" fill="#6b5f75" font-family="inherit">0–500ms, random</text>
  <text x="480" y="66" font-size="10" fill="#6b5f75" font-family="inherit">under 1s</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">2 → 3</text>
  <text x="130" y="100" font-size="10" fill="#6b5f75" font-family="inherit">1s</text>
  <text x="300" y="100" font-size="10" fill="#6b5f75" font-family="inherit">0–1s, random</text>
  <text x="480" y="100" font-size="10" fill="#6b5f75" font-family="inherit">under 2s</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">3 → 4</text>
  <text x="130" y="134" font-size="10" fill="#6b5f75" font-family="inherit">2s</text>
  <text x="300" y="134" font-size="10" fill="#6b5f75" font-family="inherit">0–2s, random</text>
  <text x="480" y="134" font-size="10" fill="#6b5f75" font-family="inherit">under 4s</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">after 4</text>
  <text x="130" y="168" font-size="10" fill="#6b5f75" font-family="inherit">—</text>
  <text x="300" y="168" font-size="10" fill="#2d6342" font-family="inherit">hand it to the reader</text>
  <text x="480" y="168" font-size="10" fill="#2d6342" font-family="inherit">a visible retry</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Four attempts inside about four seconds. Longer than that and an automatic retry stops being help and starts being a hang.</text>
</svg>

## Step-by-Step Walkthrough

1. **Mint the key before the first attempt.** Every retry reuses it; a fresh key per attempt is what turns a retry into a duplicate.

2. **Classify before retrying.** A 422 retried is a wasted round trip; a 409 retried is a lost edit.

3. **Honour `Retry-After`.** A server that names a time knows something you do not.

4. **Jitter the delay.** Full jitter — a random value between zero and the exponential bound — prevents a synchronised thundering herd.

5. **Cap attempts and total time.** Four attempts and a twenty-second ceiling is a reasonable default; beyond that the reader deserves a manual retry control instead.

6. **Keep the reader informed.** "Trying again…" with an attempt count is honest; a spinner that never resolves is not.

## Failure Modes and Edge Cases

### 1. Retrying a request that already succeeded

A response lost in transit looks identical to a request that never arrived. Only the idempotency key distinguishes them, which is why it is a prerequisite rather than an enhancement.

### 2. Retrying past a session expiry

A long backoff can outlive the token. Refresh before retrying, or the last attempt fails with a 401 that the classification correctly refuses to retry — and the reader is told to sign in, having waited twenty seconds for it.

### 3. Retrying after the reader navigated away

Abort in the teardown. A retry that resolves into an unmounted form writes nowhere at best.

### 4. Retrying a body that has been consumed

A `ReadableStream` body can be sent once. Serialise the payload before the loop and re-create the request each attempt.

### 5. Backoff that ignores reconnection

If the connection returns after two seconds of a twenty-second wait, waiting out the remainder looks broken. Listen for `online` and retry immediately.

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="During the automatic attempts the reader needs to know that something is still happening and that their work is safe, without being asked to do anything: a polite status that says it is trying again. Once the attempts are exhausted the message changes character — it becomes assertive, it says plainly that the submission did not go through, and it offers a control. Saying nothing during the retries and then failing silently is the version readers report as the button not working." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the reader is told while this happens</title>
  <desc>During the automatic attempts the reader needs to know that something is still happening and that their work is safe, without being asked to do anything: a polite status that says it is trying again. Once the attempts are exhausted the message changes character — it becomes assertive, it says plainly that the submission did not go through, and it offers a control. Saying nothing during the retries and then failing silently is the version readers report as the button not working.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">while retrying</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#1e1a24" font-family="inherit">"Trying again…"</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">polite — no interruption</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">their work is stated as safe</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">no action asked of them</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">once exhausted</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#1e1a24" font-family="inherit">"Not submitted. Try again."</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">assertive — it changes what to do</text>
  <text x="366" y="106" font-size="10" fill="#2d6342" font-family="inherit">a real, focusable retry control</text>
  <text x="366" y="128" font-size="10" fill="#2d6342" font-family="inherit">the draft is still intact</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">Silence during the retries followed by silence at the end is the version readers report as "the button does nothing".</text>
</svg>

## Verification Checklist

- [ ] Every attempt sends the same idempotency key
- [ ] A 422 is returned immediately, not retried
- [ ] A 409 is routed to reconciliation
- [ ] `Retry-After` is honoured when present
- [ ] Delays are jittered, not fixed multiples
- [ ] Attempts and total elapsed time are both capped
- [ ] Reconnecting cancels the remaining wait
- [ ] Navigating away aborts the loop

## Common Pitfalls

- **Minting a key per attempt.** Each retry then looks like an unrelated request, and a reader on a flaky connection is charged once per attempt. One key per intent, reused.
- **Retrying a 422.** The payload was understood and rejected, so the same payload gets the same answer. The retry has to wait for the reader to change something.
- **Fixed delays.** Every client that failed together comes back together, reproducing the load spike that caused the failure. Full jitter costs one call and prevents it.
- **Ignoring `Retry-After`.** A server that names a time knows something about its own recovery that your exponential curve does not.
- **Retrying forever.** A spinner that never resolves gives the reader nothing to act on and no idea whether their work is safe. Cap it and hand them a visible retry.

---

**Related**

- [Handling Double Submit and Idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/) — the key that makes retrying safe
- [Rolling Back Optimistic Updates on Failure](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/rolling-back-optimistic-updates-on-failure/) — what happens when retries run out
- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/) — the classification this depends on

← [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)

## Frequently Asked Questions

<details>
<summary><strong>Which responses should never be retried?</strong></summary>

Anything that will fail identically the second time: a 422, because the payload is understood and rejected; a 409, because repeating the request does not resolve a conflict and can lose the reader's edit; a 401 or 403, which need a different credential rather than another attempt; and a 501, which will never be implemented by that server. Everything else worth retrying is either a network failure, a rate limit, or a 5xx.

</details>

<details>
<summary><strong>Why jitter the delay?</strong></summary>

Because a service failure usually fails many clients at once, and if they all compute the same exponential delay they all come back at the same instant — reproducing the load spike that caused the failure, on a schedule. Full jitter, a random value between zero and the exponential bound, spreads the retries out. It is one Math.random call and it is the difference between a recovery and a second outage.

</details>

<details>
<summary><strong>Should a retry be automatic or offered to the reader?</strong></summary>

Automatic for the first few attempts, over a few seconds, with an honest status message — readers do not want to press a button because a packet was dropped. After the cap, hand it to them: a visible retry control with the reason. Silent indefinite retrying is the worst option, because a spinner that never resolves gives them nothing to act on and no idea whether their work is safe.

</details>

