---
layout: page.njk
title: "Queueing Async Validators in Order"
description: "Supersede within a field, queue across fields, bound the concurrency and stamp a generation — so several async validators in flight cannot render each other’s stale answers."
slug: queueing-async-validators-in-order
type: howto
breadcrumb: "Queueing Async Validators in Order"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Queueing Async Validators in Order"
  parent: "Asynchronous Validation Strategies"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Queueing Async Validators in Order",
      "description": "Supersede within a field, queue across fields, bound the concurrency and stamp a generation — so several async validators in flight cannot render each other’s stale answers.",
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
          "name": "Validation Logic & Schema Integration",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Asynchronous Validation Strategies",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Queueing Async Validators in Order",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Queue several async validators without stale results",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Key every job by its field"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Abort an older request for the same key"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Queue jobs for different keys behind a concurrency bound"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Stamp each job with the current generation"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Flag results from a superseded generation"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Time out every job"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Abort the whole queue on teardown"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just run every async validator in parallel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because the browser limits connections per origin, so beyond that limit they queue anyway — in an order you do not control and with no cancellation. A bounded queue gives you the ordering, lets you supersede within a field, and makes it possible to say which check is still outstanding. It also stops a form with twenty async fields from opening twenty connections and having the last few time out."
          }
        },
        {
          "@type": "Question",
          "name": "What is the generation counter for, if requests are already aborted?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Aborts race. A request can resolve in the microtask before its abort is observed, so a superseded result can still reach your handler. The generation stamp is a cheap second check at the point of use: if the result's generation is not the current one, it is stale regardless of what the abort did. Belt and braces, for two lines."
          }
        },
        {
          "@type": "Question",
          "name": "Should submit wait for pending async validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a short queue, yes — submitting while a uniqueness check is outstanding means the server does the same check a moment later and rejects, which is a wasted round trip and a worse message. For a long or slow queue, proceed and let the server decide, but then do not render the client's result when it eventually arrives: the submit has already moved past it."
          }
        }
      ]
    }
  ]
}
</script>

# Queueing Async Validators in Order

The exact problem: three async validators fire on one submit — a uniqueness check, an address lookup, a coupon check — and they resolve out of order, so the form renders the second one's result over the third's and the reader sees a verdict for a field they already fixed.

## Context and Prerequisites

The sequencing strategies are compared in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), and cancellation itself in [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/). This page is about the case those do not cover: several *different* validators in flight at once, where the answer is a queue rather than an abort.

## Core Pattern: A Per-Key Queue with a Generation Counter

```typescript
type Key = string;   // usually the field name

interface Job<T> {
  readonly key: Key;
  readonly run: (signal: AbortSignal) => Promise<T>;
  readonly generation: number;      // which round of validation asked for this
}

export function createValidationQueue<T>(concurrency = 3) {
  const inflight = new Map<Key, AbortController>();
  const generations = new Map<Key, number>();
  let active = 0;
  const waiting: Array<() => void> = [];

  async function slot(): Promise<void> {
    if (active < concurrency) { active++; return; }
    // Bounded concurrency: a form with twenty async fields must not open twenty
    // connections, or the browser queues them anyway and the last ones time out.
    await new Promise<void>((r) => waiting.push(r));
    active++;
  }

  function release(): void {
    active--;
    waiting.shift()?.();
  }

  return async function enqueue(job: Job<T>): Promise<{ value: T; current: boolean }> {
    // Per-key supersede: a newer request for the SAME field cancels the older,
    // because only the latest answer for a field is ever wanted.
    inflight.get(job.key)?.abort();
    const controller = new AbortController();
    inflight.set(job.key, controller);
    generations.set(job.key, job.generation);

    await slot();
    try {
      const value = await job.run(controller.signal);
      // "current" is the caller's guard: a result from an older generation is
      // returned but flagged, so the caller can log it and not render it.
      const current = generations.get(job.key) === job.generation;
      return { value, current };
    } finally {
      release();
      if (inflight.get(job.key) === controller) inflight.delete(job.key);
    }
  };
}
```

Two mechanisms, doing different jobs. The per-key abort handles "the reader typed again in the same field" — only the latest matters, so the older one is cancelled. The generation counter handles "a whole new round of validation started" — a result from the previous round may still resolve, and it must be recognisable as stale rather than rendered.

<svg viewBox="0 8 690 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three concurrent validators with a concurrency limit of two: two run immediately, the third waits for a slot, and a newer request for the same key aborts the older one rather than queueing behind it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Bounded concurrency across keys, supersede within a key</title>
  <desc>With a concurrency limit of two, the email uniqueness check and the address lookup start immediately while the coupon check waits for a slot. When the reader edits the email field again, the new request for that key aborts the in-flight one rather than waiting behind it, because only the newest answer for a given field is ever wanted. The freed slot is then taken by the waiting coupon check. Each result carries the generation it belongs to, so a response from a superseded round can be recognised and discarded rather than rendered over a newer one.</desc>
  <rect x="0" y="8" width="690" height="218" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">concurrency = 2</text>
  <rect x="14" y="38" width="200" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="58" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">email uniqueness</text>
  <text x="28" y="76" font-size="9.5" fill="#1e1a24" font-family="inherit">running · gen 4</text>
  <rect x="14" y="98" width="200" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="118" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">address lookup</text>
  <text x="28" y="136" font-size="9.5" fill="#1e1a24" font-family="inherit">running · gen 4</text>
  <rect x="14" y="158" width="200" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="28" y="178" font-size="10" font-weight="700" fill="#6b5f75" font-family="inherit">coupon check</text>
  <text x="28" y="196" font-size="9.5" fill="#6b5f75" font-family="inherit">waiting for a slot</text>
  <path d="M214,64 H250" stroke="#a63d6f" stroke-width="1.4"/>
  <rect x="250" y="38" width="212" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="264" y="58" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">reader edits email again</text>
  <text x="264" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">same key → abort, do not queue</text>
  <path d="M462,64 H498" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="498" y="38" width="178" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="512" y="58" font-size="10" font-weight="700" fill="#2d6342" font-family="inherit">slot freed</text>
  <text x="512" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">coupon check starts</text>
  <rect x="250" y="128" width="426" height="60" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="264" y="150" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why both mechanisms are needed</text>
  <text x="264" y="168" font-size="9.5" fill="#6b5f75" font-family="inherit">abort handles "newer request, same field" · generation handles "a whole new round started"</text>
  <text x="264" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">a result can survive an abort race, and the generation is what catches it</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="It resolves and its generation is current, which is the only case that renders. It resolves but its generation is stale, so it is logged and discarded. It is aborted because a newer request for the same field arrived, which is deliberate and must not count as a failure. Or it times out, which is neither a pass nor a fail: the field is left unjudged and the server decides at submit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four ways a job can end</title>
  <desc>It resolves and its generation is current, which is the only case that renders. It resolves but its generation is stale, so it is logged and discarded. It is aborted because a newer request for the same field arrived, which is deliberate and must not count as a failure. Or it times out, which is neither a pass nor a fail: the field is left unjudged and the server decides at submit.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Ending</text>
  <text x="210" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Render it?</text>
  <text x="380" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Count as a failure?</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">resolved, current</text>
  <text x="210" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="380" y="66" font-size="10" fill="#6b5f75" font-family="inherit">n/a</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">resolved, stale</text>
  <text x="210" y="100" font-size="10" fill="#6b5f75" font-family="inherit">no — log it</text>
  <text x="380" y="100" font-size="10" fill="#6b5f75" font-family="inherit">no</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">aborted</text>
  <text x="210" y="134" font-size="10" fill="#6b5f75" font-family="inherit">no</text>
  <text x="380" y="134" font-size="10" fill="#2d6342" font-family="inherit">no — you caused it</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">timed out</text>
  <text x="210" y="168" font-size="10" fill="#1e1a24" font-family="inherit">as "could not check"</text>
  <text x="380" y="168" font-size="10" fill="#2d6342" font-family="inherit">no — not the reader’s fault</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Only the first row writes a verdict. The other three are the reason a boolean return type is not enough for an async validator.</text>
</svg>

## Step-by-Step Walkthrough

1. **Key by field.** Two validators for different fields are independent; two for the same field are not.

2. **Supersede within a key, queue across keys.** Aborting a different field's check to run this one is wrong; both answers are wanted.

3. **Bound the concurrency.** Browsers cap connections per origin anyway; a bounded queue makes the ordering yours rather than the connection pool's.

4. **Stamp a generation.** Incremented whenever a fresh round starts — a submit, a step change, a reset.

5. **Return staleness rather than throwing it away.** A stale result is useful for logging and for spotting a validator that is consistently too slow.

6. **Abort the whole queue on teardown.** One signal that every job observes.

## Failure Modes and Edge Cases

### 1. A validator that never resolves

A hung request holds its slot forever and starves everything behind it. Give every job a timeout, and treat the timeout as retryable-unknown rather than invalid.

### 2. Head-of-line blocking

A slow but unimportant check occupying the only slot delays a critical one. Either raise the concurrency or give jobs a priority and run high-priority ones first.

### 3. The reader submits while checks are in flight

Submit must either wait for the queue to drain or proceed and let the server decide. Waiting is usually right for a short queue; either way, do not submit while showing a "checking…" state and then also render its result afterwards.

### 4. Results that arrive after the field is gone

A conditional field removed while its check was running. Discard on the key's absence rather than writing into a store entry that no longer exists.

### 5. Aborts counted as failures

An `AbortError` is deliberate. Counting it towards a retry budget makes a fast typist exhaust the budget without a single real failure.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The generation is incremented whenever the set of answers being judged changes wholesale: a submit attempt, a wizard step change, a reset, or a draft restore. Every job dispatched afterwards carries the new number. A result arriving with an older number describes a payload that no longer exists, so it is discarded regardless of whether its abort was observed in time." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a generation bump means</title>
  <desc>The generation is incremented whenever the set of answers being judged changes wholesale: a submit attempt, a wizard step change, a reset, or a draft restore. Every job dispatched afterwards carries the new number. A result arriving with an older number describes a payload that no longer exists, so it is discarded regardless of whether its abort was observed in time.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">What a generation bump means</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">submit attempt</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a new judgement of</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the whole form</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">step change</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a different set of</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">answers is current</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">reset or restore</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the values were</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">replaced wholesale</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">older results</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">describe a payload</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">that no longer exists</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Aborts race; the generation does not. It is the cheap second check at the point where the result would be used.</text>
</svg>

## Verification Checklist

- [ ] Two validators for different fields run concurrently
- [ ] A newer request for the same field aborts the older one
- [ ] Concurrency never exceeds the configured bound
- [ ] A result from a superseded generation is not rendered
- [ ] Every job has a timeout, and a timeout is not an invalid verdict
- [ ] Submitting waits for the queue, or explicitly does not
- [ ] Teardown aborts everything in flight
- [ ] `AbortError` does not count as a failure

## Common Pitfalls

- **Aborting across keys.** Cancelling the address lookup to run the coupon check discards an answer that was wanted. Supersede within a key, queue across them.
- **No timeout.** A hung request holds its slot indefinitely and starves everything behind it, which presents as validation that stopped working.
- **Counting aborts as failures.** An `AbortError` is deliberate. Counting it towards a retry budget lets a fast typist exhaust it without a single real failure.
- **Writing a stale result.** A response can resolve in the microtask before its abort is observed, so the generation check at the point of use is not redundant.
- **Submitting mid-queue without deciding.** Either wait for the queue to drain or proceed and ignore what arrives afterwards — but not both, which renders a verdict the submit already moved past.

---

**Related**

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — the four sequencing strategies
- [Cancelling Stale Async Validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/) — the single-field case
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/) — a validator this queue would run

← [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)

## Frequently Asked Questions

<details>
<summary><strong>Why not just run every async validator in parallel?</strong></summary>

Because the browser limits connections per origin, so beyond that limit they queue anyway — in an order you do not control and with no cancellation. A bounded queue gives you the ordering, lets you supersede within a field, and makes it possible to say which check is still outstanding. It also stops a form with twenty async fields from opening twenty connections and having the last few time out.

</details>

<details>
<summary><strong>What is the generation counter for, if requests are already aborted?</strong></summary>

Aborts race. A request can resolve in the microtask before its abort is observed, so a superseded result can still reach your handler. The generation stamp is a cheap second check at the point of use: if the result's generation is not the current one, it is stale regardless of what the abort did. Belt and braces, for two lines.

</details>

<details>
<summary><strong>Should submit wait for pending async validation?</strong></summary>

For a short queue, yes — submitting while a uniqueness check is outstanding means the server does the same check a moment later and rejects, which is a wasted round trip and a worse message. For a long or slow queue, proceed and let the server decide, but then do not render the client's result when it eventually arrives: the submit has already moved past it.

</details>

