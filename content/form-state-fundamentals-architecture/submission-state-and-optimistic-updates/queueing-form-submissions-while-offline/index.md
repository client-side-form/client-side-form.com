---
layout: page.njk
title: "Queueing Form Submissions While Offline"
description: "Accept a form submission with no connection, store it durably, send it when the network returns, and tell the user honestly what state it is in — with idempotency keys, a persisted outbox, Background Sync where available, and conflict handling on replay."
slug: queueing-form-submissions-while-offline
type: howto
breadcrumb: "Offline Submission Queue"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Queueing Form Submissions While Offline"
  parent: "Submission State and Optimistic Updates"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Queueing Form Submissions While Offline",
      "description": "Accept a form submission with no connection, store it durably, send it when the network returns, and tell the user honestly what state it is in — with idempotency keys, a persisted outbox, Background Sync where available, and conflict handling on replay.",
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
          "name": "Submission State and Optimistic Updates",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Queueing Form Submissions While Offline",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/queueing-form-submissions-while-offline/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Queue form submissions for delivery when the device is back online",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Generate the idempotency key at capture"
        },
        {
          "@type": "HowToStep",
          "name": "Persist before sending"
        },
        {
          "@type": "HowToStep",
          "name": "Drain in order, one at a time"
        },
        {
          "@type": "HowToStep",
          "name": "Classify responses"
        },
        {
          "@type": "HowToStep",
          "name": "Trigger from several signals"
        },
        {
          "@type": "HowToStep",
          "name": "Show the truth"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Background Sync required?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. It improves delivery when the tab is closed, and it is available in Chromium-based browsers. Without it, entries are sent the next time the app is opened or the online event fires, which is enough for most forms as long as the UI is honest about pending items."
          }
        },
        {
          "@type": "Question",
          "name": "Can I queue file uploads?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — IndexedDB stores Blob and File objects directly. Large files make the queue slow to drain and can hit storage quotas, so show the size of pending uploads and consider resumable chunked uploads for anything over a few megabytes."
          }
        },
        {
          "@type": "Question",
          "name": "Should the form clear after an offline submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Clear the form so the user can start the next one, but keep the submission visible in a pending list with its state. Users who fill many forms offline need to see what is waiting and what has gone."
          }
        }
      ]
    }
  ]
}
</script>

# Queueing Form Submissions While Offline

A field worker completes an inspection form in a basement with no signal, presses Submit, sees a network error, and has to keep the tab open and retry every few minutes — or loses the work when the browser reclaims the tab.

[Submission state and optimistic updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) assumes the request either succeeds or fails promptly. Offline-capable forms add a third outcome: *accepted locally, delivery pending*. This page builds that as an outbox — a durable queue of submissions with idempotency keys, a sender that drains it when connectivity returns, and UI that never claims "sent" before the server has said so.

---

## Context and prerequisites

The outbox pattern has four parts:

1. **Capture** — on submit, serialise the payload with a client-generated idempotency key and write it to IndexedDB *before* attempting the network.
2. **Send** — try immediately; on success delete the entry, on network failure leave it queued.
3. **Drain** — when connectivity returns (the `online` event, Background Sync, next app load, or a periodic retry), send queued entries in order.
4. **Report** — show each submission's real state: queued, sending, delivered, or needs attention (the server rejected it).

The idempotency key is non-negotiable. A request that timed out may have reached the server; replaying it without a key creates duplicates.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a submission from capture into the outbox, an immediate send attempt, remaining queued while offline, draining when back online, and ending delivered or needing attention." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The life of a queued submission</title>
  <desc>On submit the payload and a fresh idempotency key are written to the outbox in IndexedDB. An immediate send is attempted. If the device is offline or the request fails at the network level, the entry stays queued and the user sees saved on this device, will send when online. When connectivity returns, the drain sends entries in order. A 2xx response deletes the entry and shows delivered. A 4xx response moves the entry to needs attention so the user can fix it, and it is not retried automatically.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="330.9" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Capture into outbox</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">payload + idempotency key → IndexedDB</text>
  <text x="374.9" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Written before any network attempt, so a crash cannot lose it.</text>
  <path d="M179.5,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="175.5,89.0 179.5,96.0 183.5,89.0" fill="#7b4f8a"/>
  <text x="189.5" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">try now</text>
  <rect x="14.0" y="97.0" width="330.9" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Queued</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Network failure or offline.</text>
  <text x="374.9" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">UI: saved on this device, will send when you are back online.</text>
  <path d="M179.5,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="175.5,174.0 179.5,181.0 183.5,174.0" fill="#7b4f8a"/>
  <text x="189.5" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">online / sync / reload</text>
  <rect x="14.0" y="182.0" width="330.9" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Draining</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Send in order, same key.</text>
  <text x="374.9" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">UI: sending…</text>
  <path d="M179.5,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="175.5,259.0 179.5,266.0 183.5,259.0" fill="#7b4f8a"/>
  <text x="189.5" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">response</text>
  <rect x="14.0" y="267.0" width="330.9" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Delivered or needs attention</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">2xx: delete entry. 4xx: park it.</text>
  <text x="374.9" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Rejections are never retried automatically; the user fixes them.</text>
</svg>

---

## The core pattern: a persisted outbox with idempotent replay

```typescript
export interface OutboxEntry {
  id: string;                 // idempotency key, generated once at capture
  url: string;
  body: unknown;              // plain JSON; attachments as Blobs are fine in IndexedDB
  createdAt: number;
  attempts: number;
  state: "queued" | "sending" | "rejected";
  lastError?: string;
}

export interface OutboxStore {
  put(e: OutboxEntry): Promise<void>;
  delete(id: string): Promise<void>;
  listQueued(): Promise<OutboxEntry[]>;   // ordered by createdAt
}

export async function submitWithOutbox(store: OutboxStore, url: string, body: unknown, onChange: () => void) {
  const entry: OutboxEntry = {
    id: crypto.randomUUID(), url, body, createdAt: Date.now(), attempts: 0, state: "queued",
  };
  await store.put(entry);          // durable BEFORE the first attempt
  onChange();
  await drain(store, onChange);    // try immediately; stays queued on failure
  return entry.id;
}

let draining: Promise<void> | null = null;

export function drain(store: OutboxStore, onChange: () => void): Promise<void> {
  // One drain at a time: 'online', sync and manual retries can fire together.
  return (draining ??= (async () => {
    try {
      for (const e of await store.listQueued()) {
        await store.put({ ...e, state: "sending", attempts: e.attempts + 1 });
        onChange();
        let res: Response;
        try {
          res = await fetch(e.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Idempotency-Key": e.id },
            body: JSON.stringify(e.body),
          });
        } catch {
          // Network-level failure: back to queued and stop — later entries
          // would fail the same way, and order must be preserved.
          await store.put({ ...e, state: "queued", attempts: e.attempts + 1 });
          onChange();
          return;
        }
        if (res.ok || res.status === 409) {
          // 409 with the same key usually means "already processed": treat as delivered
          // only if your API documents that; otherwise inspect the body.
          await store.delete(e.id);
        } else if (res.status >= 400 && res.status < 500) {
          await store.put({ ...e, state: "rejected", attempts: e.attempts + 1, lastError: await res.text() });
        } else {
          await store.put({ ...e, state: "queued", attempts: e.attempts + 1 });
          return;                  // 5xx: server trouble; retry later with backoff
        }
        onChange();
      }
    } finally {
      draining = null;
    }
  })());
}

// Triggers: any of these may fire; drain() coalesces them.
export function startDrainTriggers(store: OutboxStore, onChange: () => void) {
  const run = () => void drain(store, onChange);
  addEventListener("online", run);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });
  run();                           // also on startup: entries may survive from last session
}
```

A service worker can call the same `drain` from a Background Sync `sync` event where the browser supports it, so queued entries are sent even after the tab is closed. Where it is not supported, the startup and `online` triggers cover the common case.

---

## Step-by-step walkthrough

1. **Generate the idempotency key at capture.** One key per user intent, reused on every retry. The server stores processed keys and returns the original result for repeats, as described in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).
2. **Persist before sending.** If the tab crashes between pressing Submit and the response, the entry is still in IndexedDB. The storage details are in [storing large drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/).
3. **Drain in order, one at a time.** Order matters when submissions depend on each other (create, then update). Stop at the first network failure.
4. **Classify responses.** 2xx is delivered. 4xx is a rejection the user must address — never retry it automatically. 5xx and network errors are transient and stay queued with backoff, as in [retrying failed submissions with backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/).
5. **Trigger from several signals.** `online`, `visibilitychange`, startup and Background Sync are each unreliable alone; together they drain promptly.
6. **Show the truth.** "Saved on this device — will send when you're back online" is not "Sent". Offer a list of pending submissions with their state.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table mapping network errors and HTTP status classes during an outbox drain to the entry state, whether draining continues and what the user sees." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Response classes during a drain</title>
  <desc>A network error returns the entry to queued, stops the drain and shows will send when online. A 2xx response deletes the entry, continues the drain and shows delivered. A 4xx rejection parks the entry as needs attention, continues with the next entry and shows a message with a link to fix it. A 5xx response returns the entry to queued, stops the drain for backoff and shows will retry shortly.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Result</text>
  <text x="165.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Entry becomes</text>
  <text x="321.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Drain</text>
  <text x="449.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">User sees</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">network error</text>
  <text x="165.7" y="61.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">queued</text>
  <text x="321.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">stop</text>
  <text x="449.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">will send when online</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">2xx</text>
  <text x="165.7" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">deleted</text>
  <text x="321.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">continue</text>
  <text x="449.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">delivered</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">4xx</text>
  <text x="165.7" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="321.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">continue</text>
  <text x="449.2" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">needs attention: fix and resend</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">5xx</text>
  <text x="165.7" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">queued</text>
  <text x="321.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">stop, back off</text>
  <text x="449.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">will retry shortly</text>
</svg>

---

## Failure modes and edge cases

### 1. `navigator.onLine` lies

`navigator.onLine === true` means "connected to some network", not "the server is reachable" — captive portals and dead Wi-Fi report online. Always attempt the request and classify the result; use `online` only as a trigger to try.

### 2. Stale submissions

A form submitted offline on Monday and delivered on Thursday may conflict with changes made elsewhere in between. Include the base version the user edited in the payload so the server can answer with a conflict the user resolves, per [handling 409 conflicts on form submit](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/handling-409-conflicts-on-form-submit/).

### 3. Authentication expires while queued

A token valid at capture may be expired at delivery, producing 401 for every entry. Treat 401 as "pause the queue and ask the user to sign in", not as a rejection of each submission.

### 4. Sensitive data at rest

Queued payloads sit in IndexedDB unencrypted. Exclude secrets, and delete entries promptly once delivered. For shared devices, clear the outbox on sign-out after warning about undelivered items.

### 5. Duplicate triggers

`online` and Background Sync can fire at the same moment. The single `draining` promise ensures only one drain runs; without it, two drains can send the same entry concurrently — which the idempotency key makes harmless, but only if the server implements it.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards with the status wording to show for each outbox state — queued, sending, delivered and needs attention." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Honest status wording</title>
  <desc>For a queued entry show saved on this device, it will be sent when you are back online. For an entry being sent show sending. For a delivered entry show sent, with the time. For a rejected entry show that it could not be sent, the reason, and a link to fix and resend. Never show sent for a queued entry.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Queued</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Saved on this device. We&#x27;ll</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">send it when you&#x27;re back</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">online.&quot;</text>
  <rect x="180.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Sending</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Sending…&quot;</text>
  <rect x="347.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Delivered</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Sent at 14:32.&quot;</text>
  <rect x="513.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Needs attention</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Couldn&#x27;t be sent: postcode</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">not recognised. Fix and</text>
  <text x="525.5" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">resend.&quot;</text>
</svg>

---

## Verification checklist

- [ ] Submitting in airplane mode shows a queued state and the entry survives a reload.
- [ ] Reconnecting sends queued entries in order without user action.
- [ ] Each entry carries the same idempotency key on every attempt.
- [ ] A 4xx rejection is shown to the user and never retried automatically.
- [ ] A 401 pauses the queue and prompts for sign-in rather than rejecting entries.
- [ ] Concurrent triggers never run two drains at once.
- [ ] The UI never says "sent" for an entry that has not received a 2xx.
- [ ] Delivered entries are deleted from storage.

---

## Frequently Asked Questions

<details>
<summary><strong>Is Background Sync required?</strong></summary>

No. It improves delivery when the tab is closed, and it is available in Chromium-based browsers. Without it, entries are sent the next time the app is opened or the `online` event fires, which is enough for most forms as long as the UI is honest about pending items.

</details>

<details>
<summary><strong>Can I queue file uploads?</strong></summary>

Yes — IndexedDB stores `Blob` and `File` objects directly. Large files make the queue slow to drain and can hit storage quotas, so show the size of pending uploads and consider [resumable chunked uploads](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/resumable-chunked-uploads-for-large-files/) for anything over a few megabytes.

</details>

<details>
<summary><strong>Should the form clear after an offline submit?</strong></summary>

Clear the form so the user can start the next one, but keep the submission visible in a pending list with its state. Users who fill many forms offline need to see what is waiting and what has gone.

</details>

---

## Related

- [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)
- [Retrying Failed Submissions With Backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/)
- [Cancelling In-Flight Submissions on Navigation](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/cancelling-in-flight-submissions-on-navigation/)

← [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)
