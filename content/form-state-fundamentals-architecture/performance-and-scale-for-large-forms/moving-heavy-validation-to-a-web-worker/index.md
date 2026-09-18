---
layout: page.njk
title: "Moving Heavy Validation to a Web Worker"
description: "When a schema parse, cross-row rule or checksum takes tens of milliseconds, run it in a Web Worker: a typed request/response protocol, cancellation of superseded runs, transferring large payloads, and keeping cheap checks on the main thread."
slug: moving-heavy-validation-to-a-web-worker
type: howto
breadcrumb: "Validation in a Worker"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Moving Heavy Validation to a Web Worker"
  parent: "Performance and Scale for Large Forms"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Moving Heavy Validation to a Web Worker",
      "description": "When a schema parse, cross-row rule or checksum takes tens of milliseconds, run it in a Web Worker: a typed request/response protocol, cancellation of superseded runs, transferring large payloads, and keeping cheap checks on the main thread.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Performance and Scale for Large Forms",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Moving Heavy Validation to a Web Worker",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/moving-heavy-validation-to-a-web-worker/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Run expensive form validation in a Web Worker",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Profile first"
        },
        {
          "@type": "HowToStep",
          "name": "Split validation into cheap and heavy"
        },
        {
          "@type": "HowToStep",
          "name": "Give every request an id"
        },
        {
          "@type": "HowToStep",
          "name": "Resolve superseded runs as null"
        },
        {
          "@type": "HowToStep",
          "name": "Return plain issue objects"
        },
        {
          "@type": "HowToStep",
          "name": "Show a pending state for the heavy checks"
        },
        {
          "@type": "HowToStep",
          "name": "Terminate on unmount"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I use Comlink instead of a hand-written protocol?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Comlink wraps postMessage so worker functions look like async calls, which removes the id bookkeeping for the request itself. You still need supersession: track the latest call on the main thread and ignore older results, because Comlink does not cancel them."
          }
        },
        {
          "@type": "Question",
          "name": "Would requestIdleCallback or scheduler.yield be enough?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If the work can be split into small chunks, yielding between chunks with scheduler.yield() or setTimeout keeps the main thread responsive without a worker. A single monolithic schema parse cannot be chunked, which is when a worker is the simpler answer."
          }
        },
        {
          "@type": "Question",
          "name": "How many workers should a form use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "One per form is almost always enough; heavy checks are debounced, so there is rarely more than one run in flight. Share one worker across forms on the same page if memory matters, keyed by a form id in each message."
          }
        }
      ]
    }
  ]
}
</script>

# Moving Heavy Validation to a Web Worker

Some validation is genuinely expensive — parsing a 2,000-row pasted spreadsheet against a schema, checking uniqueness across every row of a repeatable group, verifying a large JSON configuration — and running it on the main thread freezes typing for as long as it takes.

[Performance and scale for large forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/) covers reducing render cost. This page handles the other half: compute that cannot be made cheap. A Web Worker runs it in parallel so the input stays responsive, but introduces asynchrony, serialisation cost and stale results — all of which the form must handle deliberately.

---

## Context and prerequisites

Move validation to a worker only when profiling shows it matters. A useful threshold: if a validation pass regularly takes more than about 16 ms (one frame) on a throttled mid-range device, it will make typing or scrolling stutter. Typical candidates:

- Whole-form schema validation of large nested data (hundreds of rows).
- Cross-row rules: duplicates, totals, overlapping date ranges across a list.
- Parsing and validating pasted or uploaded CSV, JSON or XML before import.
- Expensive checks such as password strength estimation with large dictionaries.

Keep cheap per-field checks — required, format, length — on the main thread. They give instant feedback, and a worker round trip (message, clone, schedule, reply) costs more than they do.

<svg viewBox="0 0 680 182" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline comparing a 60 millisecond validation pass run on the main thread, which blocks four keystrokes, with the same pass run in a worker while keystrokes are handled immediately." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A 60 ms validation pass on and off the main thread</title>
  <desc>On the main thread, validation runs from 0 to 60 milliseconds and keystrokes arriving at 20, 35 and 50 milliseconds wait until it finishes, so the user sees the characters appear late in a burst. With a worker, the main thread handles each keystroke immediately; the worker runs validation in parallel and posts results at 64 milliseconds, and a superseded run is discarded.</desc>
  <rect x="0" y="0" width="680" height="182" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Main thread only</text>
  <rect x="164.0" y="14.0" width="295.2" height="14" rx="3" fill="#a63d6f"/>
  <text x="164.0" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">validate: typing blocked</text>
  <rect x="459.2" y="14.0" width="88.6" height="14" rx="3" fill="#b07a55"/>
  <text x="459.2" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">catch-up</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Main thread + worker</text>
  <rect x="164.0" y="56.0" width="19.7" height="14" rx="3" fill="#2d6342"/>
  <rect x="262.4" y="56.0" width="19.7" height="14" rx="3" fill="#2d6342"/>
  <rect x="336.2" y="56.0" width="19.7" height="14" rx="3" fill="#2d6342"/>
  <rect x="410.0" y="56.0" width="19.7" height="14" rx="3" fill="#2d6342"/>
  <text x="410.0" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">keystrokes painted</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Worker</text>
  <rect x="173.8" y="98.0" width="305.0" height="14" rx="3" fill="#7b4f8a"/>
  <text x="173.8" y="124.0" font-size="9" fill="#6b5f75" font-family="inherit">validate in parallel</text>
  <text x="164.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="262.4" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">20ms</text>
  <text x="360.8" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">40ms</text>
  <text x="459.2" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">60ms</text>
  <text x="557.6" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">80ms</text>
  <text x="656.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">100ms</text>
  <text x="14.0" y="170.0" font-size="10" fill="#6b5f75" font-family="inherit">The worker does not make validation faster; it stops validation from delaying what the user sees.</text>
</svg>

---

## The core pattern: a typed worker with run ids and supersession

```typescript
// validate.worker.ts
import { RowsSchema } from "./schema";   // the same schema the server uses

type Req = { id: number; rows: unknown[] };
type Res = { id: number; issues: { path: (string | number)[]; message: string }[] };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, rows } = e.data;
  const result = RowsSchema.safeParse(rows);
  const issues = result.success ? [] : result.error.issues.map((i) => ({ path: i.path, message: i.message }));
  (self as unknown as Worker).postMessage({ id, issues } satisfies Res);
};
```

```typescript
// worker-validator.ts (main thread)
type Issue = { path: (string | number)[]; message: string };

export function createWorkerValidator() {
  const worker = new Worker(new URL("./validate.worker.ts", import.meta.url), { type: "module" });
  let latest = 0;
  const pending = new Map<number, (issues: Issue[] | null) => void>();

  worker.onmessage = (e: MessageEvent<{ id: number; issues: Issue[] }>) => {
    const resolve = pending.get(e.data.id);
    pending.delete(e.data.id);
    // A result for a superseded run resolves to null: the caller ignores it.
    resolve?.(e.data.id === latest ? e.data.issues : null);
  };

  return {
    validate(rows: unknown[]): Promise<Issue[] | null> {
      const id = ++latest;
      // Resolve every older pending run as superseded right away, so callers
      // awaiting them can stop waiting (a worker cannot abort a sync parse).
      for (const [oldId, r] of pending) { r(null); pending.delete(oldId); }
      return new Promise((resolve) => {
        pending.set(id, resolve);
        worker.postMessage({ id, rows });   // structured clone of rows
      });
    },
    destroy() {
      worker.terminate();                   // also frees the worker's memory
      for (const r of pending.values()) r(null);
      pending.clear();
    },
  };
}
```

Bundlers such as Vite and webpack 5 recognise `new Worker(new URL(..., import.meta.url))` and emit the worker as its own chunk, including its imports — so the worker can import the same schema module as the main thread without duplication in your source.

---

## Step-by-step walkthrough

1. **Profile first.** Confirm with the Performance panel that validation, not rendering, is the long task — the procedure is in [profiling form re-renders in DevTools](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/profiling-form-re-renders-in-devtools/).
2. **Split validation into cheap and heavy.** Per-field format checks stay on the main thread and run per keystroke; heavy whole-form or cross-row checks go to the worker and run debounced.
3. **Give every request an id.** The worker echoes it; the main thread only applies the result for the latest id. This is the worker equivalent of [cancelling stale async validation](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).
4. **Resolve superseded runs as `null`.** A synchronous parse inside a worker cannot be interrupted, but the caller does not need to wait for it. For very long runs, `terminate()` the worker and start a fresh one instead.
5. **Return plain issue objects.** Error instances and schema-library classes do not survive structured cloning intact; map to `{ path, message }` in the worker.
6. **Show a pending state for the heavy checks.** While the worker runs, mark affected rows as "checking" rather than showing stale results.
7. **Terminate on unmount.** A leaked worker keeps its memory and any large data it received.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards dividing validation work between the main thread and the worker, with examples of each and when they run." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What runs where</title>
  <desc>The main thread runs cheap per-field checks such as required, format and length on every keystroke, and renders all results. The worker runs heavy checks such as whole-form schema parses of large data, cross-row duplicates and totals, and import parsing, debounced, returning plain issue objects tagged with a run id.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Main thread</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required, format, length per field.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Runs every keystroke; instant feedback.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Renders every result, including worker issues.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Worker</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Whole-form parse of large data.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Cross-row duplicates, totals, overlaps.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Debounced; returns { id, issues }.</text>
</svg>

---

## Failure modes and edge cases

### 1. Cloning cost exceeds the savings

`postMessage` structured-clones its payload on the main thread. Sending a 5 MB object on every keystroke can cost more than validating it. Send only what changed — the edited row and its index — and keep the full dataset in the worker's own memory, or transfer an `ArrayBuffer` with the transfer list for raw data.

### 2. Different code paths for client and server

If the worker imports a *copy* of your schema rather than the shared module, the two drift. Import the same module; the bundler handles it. See [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/).

### 3. Content Security Policy

A strict `worker-src` or `script-src` policy can block workers created from blob URLs, which some bundler configurations emit in development. Use real module URLs and allow `worker-src 'self'`.

### 4. Server rendering

Workers do not exist during SSR. Create the validator in an effect or on mount, never at module scope in a file imported by server code.

### 5. Submit must wait for the heavy check

On submit, run the heavy check again and `await` it — if the debounced run has not finished, the form must not submit with stale worker results. Disable nothing; show "Checking…" on the submit button with `aria-busy` while waiting.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of validation types with their typical cost and whether to move each to a worker." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Is a worker worth it?</title>
  <desc>Required and format checks cost microseconds and should stay on the main thread. A schema parse of a small form costs well under a millisecond and should stay. A schema parse of hundreds of rows can cost tens of milliseconds and is a good worker candidate. Cross-row duplicate and total checks over large lists are good candidates. CSV import parsing is a strong candidate. Remote availability checks are asynchronous network calls and gain nothing from a worker.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Validation</text>
  <text x="305.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Typical cost</text>
  <text x="499.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Worker?</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">required / format / length</text>
  <text x="305.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">microseconds</text>
  <text x="499.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">schema parse, small form</text>
  <text x="305.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">under 1 ms</text>
  <text x="499.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">schema parse, hundreds of rows</text>
  <text x="305.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">tens of ms</text>
  <text x="499.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">cross-row duplicates and totals</text>
  <text x="305.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">grows with rows</text>
  <text x="499.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">CSV or JSON import parse</text>
  <text x="305.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">tens to hundreds of ms</text>
  <text x="499.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">remote availability check</text>
  <text x="305.9" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">network-bound</text>
  <text x="499.8" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no gain</text>
</svg>

---

## Verification checklist

- [ ] Typing stays under one frame of main-thread work per keystroke while heavy validation runs.
- [ ] Results from superseded runs are never applied.
- [ ] The worker imports the same schema module as the main thread and server.
- [ ] Issues crossing the worker boundary are plain objects with path and message.
- [ ] Rows awaiting worker results show a checking state, not stale errors.
- [ ] Submit waits for a fresh heavy check before sending.
- [ ] The worker is terminated when the form unmounts.
- [ ] The app renders on the server without touching `Worker`.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I use Comlink instead of a hand-written protocol?</strong></summary>

Yes. Comlink wraps `postMessage` so worker functions look like async calls, which removes the id bookkeeping for the request itself. You still need supersession: track the latest call on the main thread and ignore older results, because Comlink does not cancel them.

</details>

<details>
<summary><strong>Would requestIdleCallback or scheduler.yield be enough?</strong></summary>

If the work can be split into small chunks, yielding between chunks with `scheduler.yield()` or `setTimeout` keeps the main thread responsive without a worker. A single monolithic schema parse cannot be chunked, which is when a worker is the simpler answer.

</details>

<details>
<summary><strong>How many workers should a form use?</strong></summary>

One per form is almost always enough; heavy checks are debounced, so there is rarely more than one run in flight. Share one worker across forms on the same page if memory matters, keyed by a form id in each message.

</details>

---

## Related

- [Performance and Scale for Large Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/)
- [Keystroke Latency Budgets and INP for Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/keystroke-latency-budgets-and-inp-for-forms/)
- [Queueing Async Validators in Order](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/)

← [Performance and Scale for Large Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/)
