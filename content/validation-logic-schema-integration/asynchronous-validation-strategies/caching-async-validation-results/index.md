---
layout: page.njk
title: "Caching Async Validation Results"
description: "Stop re-checking the same username, postcode or VAT number every time a user edits back to a value: a small TTL cache keyed by normalised value, in-flight request sharing, negative-result caching rules, and invalidation when the answer can change."
slug: caching-async-validation-results
type: howto
breadcrumb: "Caching Async Results"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Caching Async Validation Results"
  parent: "Asynchronous Validation Strategies"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Caching Async Validation Results",
      "description": "Stop re-checking the same username, postcode or VAT number every time a user edits back to a value: a small TTL cache keyed by normalised value, in-flight request sharing, negative-result caching rules, and invalidation when the answer can change.",
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
          "name": "Caching Async Validation Results",
          "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/caching-async-validation-results/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Cache async validation results safely",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Normalise the key the way the server compares"
        },
        {
          "@type": "HowToStep",
          "name": "Return cached answers synchronously in effect"
        },
        {
          "@type": "HowToStep",
          "name": "Share in-flight requests"
        },
        {
          "@type": "HowToStep",
          "name": "Keep cancellation per caller"
        },
        {
          "@type": "HowToStep",
          "name": "Cache only real answers, with asymmetric TTLs"
        },
        {
          "@type": "HowToStep",
          "name": "Invalidate on known changes"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the cache persist across page loads?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Rarely. Stable facts could be persisted in sessionStorage, but availability answers go stale quickly, and a persisted \"available\" is misleading next time. An in-memory cache for the life of the page covers the back-and-forth editing that motivates caching."
          }
        },
        {
          "@type": "Question",
          "name": "Does TanStack Query or SWR solve this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Largely, yes: they cache by key, deduplicate in-flight requests, and support stale times. Wrap your availability lookup in a query keyed by the normalised value, set staleTime per answer type, and keep the per-keystroke cancellation behaviour in your validator."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test the cache?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use fake timers to move past TTLs, a mocked fetch that counts calls, and assertions that repeated checks within the TTL make one call — the techniques in testing debounced validation with fake timers."
          }
        }
      ]
    }
  ]
}
</script>

# Caching Async Validation Results

Users edit back and forth — type a username, delete a letter, retype it — and an uncached async validator sends a request for every value it settles on, so the same "is `ada_l` available?" question hits the server three times in ten seconds, the field flickers through "Checking…" each time, and rate limits arrive sooner than they should.

A small cache turns repeated questions into instant answers. The subtle part is deciding *what* can be cached and for *how long*, because some answers change (a username can be taken a minute later) and some never do (a postcode's format validity). This page builds a cache for async validators, part of the [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) topic, and pairs it with the cancellation patterns already covered there.

---

## Context and prerequisites

Three kinds of async answer, with different cache lifetimes:

- **Stable facts** — "is this postcode real?", "does this VAT number exist?", "what city is this postcode in?" Answers change rarely; cache for the session or longer.
- **Volatile availability** — "is this username/email free?" A *taken* answer is stable (it will stay taken); an *available* answer can become wrong at any moment. Cache "taken" longer than "available", and always re-check at submit.
- **Rate- or error-dependent** — timeouts, 429s, 5xx. These are not answers about the value; never cache them as if they were.

Two techniques combine: a **result cache** (value → answer with an expiry) and **in-flight sharing** (value → pending promise), so two validators asking the same question at the same time send one request.

<svg viewBox="0 0 680 122" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of a user typing a username, deleting a character, and retyping it, comparing requests sent without a cache and with a cache." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Editing a username with and without a cache</title>
  <desc>The user settles on ada_l at one second, and both versions send a request. The user deletes the l and settles on ada_ at three seconds; both send a request for the new value. The user retypes l and settles on ada_l again at five seconds. Without a cache a third request is sent and the field shows checking again. With a cache the earlier answer for ada_l is reused instantly with no request.</desc>
  <rect x="0" y="0" width="680" height="122" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">No cache</text>
  <rect x="208.6" y="14.0" width="37.3" height="14" rx="3" fill="#7b4f8a"/>
  <text x="208.6" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">ada_l</text>
  <rect x="357.7" y="14.0" width="37.3" height="14" rx="3" fill="#7b4f8a"/>
  <text x="357.7" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">ada_</text>
  <rect x="506.9" y="14.0" width="37.3" height="14" rx="3" fill="#a63d6f"/>
  <text x="506.9" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">ada_l again</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">With cache</text>
  <rect x="208.6" y="56.0" width="37.3" height="14" rx="3" fill="#7b4f8a"/>
  <text x="208.6" y="82.0" font-size="9" fill="#6b5f75" font-family="inherit">ada_l</text>
  <rect x="357.7" y="56.0" width="37.3" height="14" rx="3" fill="#7b4f8a"/>
  <text x="357.7" y="82.0" font-size="9" fill="#6b5f75" font-family="inherit">ada_</text>
  <rect x="506.9" y="56.0" width="6.0" height="14" rx="3" fill="#2d6342"/>
  <text x="506.9" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">cached, instant</text>
  <text x="134.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="208.6" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1000ms</text>
  <text x="283.1" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2000ms</text>
  <text x="357.7" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">3000ms</text>
  <text x="432.3" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">4000ms</text>
  <text x="506.9" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">5000ms</text>
  <text x="581.4" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">6000ms</text>
  <text x="656.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">7000ms</text>
</svg>

---

## The core pattern: a TTL cache with in-flight sharing

```typescript
type Answer = { ok: true } | { ok: false; reason: "taken" | "invalid" };

interface Entry { answer: Answer; expires: number }

export function createValidationCache(opts: {
  ttlPositiveMs: number;          // how long "available/valid" is trusted
  ttlNegativeMs: number;          // how long "taken/invalid" is trusted (usually longer)
  maxEntries?: number;
  normalise: (v: string) => string;
}) {
  const results = new Map<string, Entry>();
  const inflight = new Map<string, Promise<Answer>>();
  const max = opts.maxEntries ?? 200;

  function remember(key: string, answer: Answer) {
    const ttl = answer.ok ? opts.ttlPositiveMs : opts.ttlNegativeMs;
    results.delete(key);                       // re-insert to refresh LRU order
    results.set(key, { answer, expires: Date.now() + ttl });
    if (results.size > max) results.delete(results.keys().next().value!);   // evict oldest
  }

  return {
    async check(raw: string, fetchAnswer: (v: string, signal: AbortSignal) => Promise<Answer>, signal: AbortSignal) {
      const key = opts.normalise(raw);

      const hit = results.get(key);
      if (hit && hit.expires > Date.now()) return hit.answer;          // instant, no request

      // Share an in-flight request for the same key. Each caller still honours
      // its OWN signal: abandoning the wait does not cancel the shared request
      // for other callers.
      let p = inflight.get(key);
      if (!p) {
        const shared = new AbortController();   // the shared request's own lifetime
        p = fetchAnswer(key, shared.signal)
          .then((a) => { remember(key, a); return a; })   // only real answers are cached
          .finally(() => inflight.delete(key));
        inflight.set(key, p);
      }
      return raceAbort(p, signal);
    },
    invalidate(raw?: string) { raw === undefined ? results.clear() : results.delete(opts.normalise(raw)); },
  };
}

function raceAbort<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
```

```typescript
const usernames = createValidationCache({
  ttlPositiveMs: 30_000,        // "available" trusted for 30 s
  ttlNegativeMs: 10 * 60_000,   // "taken" trusted for 10 min
  normalise: (v) => v.trim().toLowerCase(),
});
// In the field's validator, with a per-keystroke AbortController:
// const answer = await usernames.check(value, fetchAvailability, controller.signal);
```

---

## Step-by-step walkthrough

1. **Normalise the key the way the server compares.** If the server treats usernames case-insensitively, `Ada_L` and `ada_l` must share a cache entry.
2. **Return cached answers synchronously in effect.** A hit resolves immediately, so the field never shows "Checking…" for a value it has already seen — see [accessible pending state for async validation](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/accessible-pending-state-for-async-validation/).
3. **Share in-flight requests.** Two triggers asking about the same value (blur and a debounced change, or two fields using the same lookup) wait on one promise.
4. **Keep cancellation per caller.** Each caller races the shared promise against its own `AbortSignal`, preserving the stale-result protection from [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).
5. **Cache only real answers, with asymmetric TTLs.** "Taken" rarely becomes "available"; "available" can become "taken". Errors, timeouts and 429s are never cached.
6. **Invalidate on known changes.** After the user successfully registers a username, invalidate it; after a failed submit says "taken", overwrite the entry.

### Why the submit must still check

A cache makes the form feel faster and reduces load, but it cannot make a volatile answer true. Between the cached "available" and the submit, another user may take the username; between a cached "valid VAT number" and the submit, the business may have deregistered. The server's check at submit is the authority, and its answer should overwrite the cache entry. Treat the cache as a way to avoid asking the same question twice in quick succession — not as a way to avoid asking at the moment it matters.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of async validation answer types with a recommended cache duration and whether they may be cached at all." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to cache, and for how long</title>
  <desc>Postcode or address existence can be cached for the session. VAT or company number validity can be cached for the session. Username or email taken can be cached for several minutes. Username or email available should be cached briefly, around thirty seconds, and re-checked at submit. Timeouts, 429 rate limits and 5xx errors should never be cached as answers.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Answer</text>
  <text x="251.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cache for</text>
  <text x="403.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Notes</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">postcode / address exists</text>
  <text x="251.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">session</text>
  <text x="403.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">stable facts</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">VAT or company number valid</text>
  <text x="251.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">session</text>
  <text x="403.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">re-check at submit</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">username taken</text>
  <text x="251.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">minutes</text>
  <text x="403.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">rarely becomes free</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">username available</text>
  <text x="251.4" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">~30 s</text>
  <text x="403.1" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">can be taken any moment</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">timeout, 429, 5xx</text>
  <text x="251.4" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">never</text>
  <text x="403.1" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">not an answer about the value</text>
</svg>

---

## Failure modes and edge cases

### 1. Caching errors as answers

If a 503 is stored as "invalid", the user is blocked until the entry expires, even after the service recovers. Only resolved domain answers enter the cache; failures are handled by [handling timeouts and 429s in async validators](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/handling-timeouts-and-429s-in-async-validators/).

### 2. Shared request cancelled by one caller

If the shared fetch used the first caller's signal, that caller's next keystroke would cancel the request for everyone waiting on it. Give the shared request its own controller and let callers only stop *waiting*.

### 3. Unbounded growth

A cache keyed by every value typed into a search-like field grows without limit on long sessions. Bound it (LRU with a maximum size) and prefer short TTLs for high-cardinality keys.

### 4. Cross-user leakage

A module-level cache persists across users on the same device only if the app keeps running between sign-ins. Clear validation caches on sign-out, especially for answers that depend on the user's permissions.

### 5. Server-side caching instead

HTTP caching (`Cache-Control: max-age` on GET lookups) can achieve much of this without client code, for stable facts. Keep volatile availability answers `no-store` at the HTTP layer and let the client cache decide briefly.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a blur trigger and a debounced change trigger both checking the same value, sharing one in-flight request, and both receiving the answer, which is then cached." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two triggers sharing one request</title>
  <desc>The debounced change validator asks the cache about ada_l; there is no entry, so the cache starts a request and records it as in flight. A moment later the blur validator asks about the same value; the cache returns the same pending promise instead of sending a second request. The server answers taken. The cache stores taken with a long expiry and both validators receive the answer.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Change validator</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Blur validator</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Cache</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M95.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">check(&quot;ada_l&quot;)</text>
  <path d="M95.5,69.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,65.0 420.5,69.0 413.5,73.0" fill="#7b4f8a"/>
  <text x="429.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">GET /available?u=ada_l</text>
  <path d="M421.5,97.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,93.0 583.5,97.0 576.5,101.0" fill="#7b4f8a"/>
  <text x="266.5" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">check(&quot;ada_l&quot;) → same promise</text>
  <path d="M258.5,125.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,121.0 420.5,125.0 413.5,129.0" fill="#7b4f8a"/>
  <text x="429.5" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">taken</text>
  <path d="M584.5,153.0 H429.5" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="429.5,149.0 422.5,153.0 429.5,157.0" fill="#7b4f8a"/>
  <text x="103.5" y="177.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">taken (cached 10 min)</text>
  <path d="M421.5,181.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,177.0 96.5,181.0 103.5,185.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] Editing back to a previously checked value shows its result without a request.
- [ ] Two simultaneous checks for the same value send one request.
- [ ] A caller's abort does not cancel the shared request for other callers.
- [ ] "Taken" answers are cached longer than "available" answers.
- [ ] Errors, timeouts and 429s are never cached.
- [ ] The cache has a size limit and is cleared on sign-out.
- [ ] The submit endpoint re-checks and its answer overwrites the cache.

---

## Frequently Asked Questions

<details>
<summary><strong>Should the cache persist across page loads?</strong></summary>

Rarely. Stable facts could be persisted in `sessionStorage`, but availability answers go stale quickly, and a persisted "available" is misleading next time. An in-memory cache for the life of the page covers the back-and-forth editing that motivates caching.

</details>

<details>
<summary><strong>Does TanStack Query or SWR solve this?</strong></summary>

Largely, yes: they cache by key, deduplicate in-flight requests, and support stale times. Wrap your availability lookup in a query keyed by the normalised value, set `staleTime` per answer type, and keep the per-keystroke cancellation behaviour in your validator.

</details>

<details>
<summary><strong>How do I test the cache?</strong></summary>

Use fake timers to move past TTLs, a mocked fetch that counts calls, and assertions that repeated checks within the TTL make one call — the techniques in [testing debounced validation with fake timers](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/testing-debounced-validation-with-fake-timers/).

</details>

---

## Related

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
- [Queueing Async Validators in Order](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/)
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/)

← [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
