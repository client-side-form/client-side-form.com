---
layout: page.njk
title: "Autosaving Form Drafts to localStorage"
description: "A debounced, deduplicated, allow-listed write path for browser-local form drafts — with the quota, blocked-storage, second-tab and expiry failures handled rather than assumed away."
slug: autosaving-form-drafts-to-localstorage
type: howto
breadcrumb: "Autosaving Form Drafts to localStorage"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Autosaving Form Drafts to localStorage"
  parent: "Draft Persistence and Autosave"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Autosaving Form Drafts to localStorage",
      "description": "A debounced, deduplicated, allow-listed write path for browser-local form drafts — with the quota, blocked-storage, second-tab and expiry failures handled rather than assumed away.",
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
          "name": "Draft Persistence and Autosave",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Autosaving Form Drafts to localStorage",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Autosave a form draft to localStorage safely",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Namespace the storage key and validate the form id in the payload"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Version the stored shape and discard older versions on load"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Allow-list the fields that may be persisted"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Debounce writes and skip when the payload is unchanged"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Flush on visibilitychange so a reclaimed tab still saves"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Validate restored answers and announce the restore politely"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Delete the draft only after the server confirms the submission"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much can I safely store in localStorage?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Assume around five megabytes per origin, shared with everything else on it, and treat that as a ceiling rather than a budget. A form of text answers will use kilobytes; the moment a file or a base64 image enters the payload you are in a different regime and should store an upload reference instead. Because the API is synchronous, size also costs time — a megabyte-scale write is measurable on a mid-range phone, which is another reason to keep the payload to the answers alone."
          }
        },
        {
          "@type": "Question",
          "name": "Why visibilitychange rather than beforeunload?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because beforeunload does not fire reliably when a mobile browser reclaims a backgrounded tab, which is the exact scenario the draft exists for. visibilitychange fires when the tab is hidden, which covers switching apps, locking the phone and closing the tab, and it fires early enough for a synchronous write to complete. Keep a beforeunload flush as well if you like, but treat it as the redundant one."
          }
        },
        {
          "@type": "Question",
          "name": "Should the restore happen automatically or on request?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Restore the values automatically, then tell the reader and let them undo it. Making the reader click 'restore' before they can see anything means an extra step for the common case where the draft is exactly what they wanted. Filling the form silently is the other failure — a reader who does not know why the fields are populated cannot trust them. Restore, announce politely, and offer 'start again'."
          }
        },
        {
          "@type": "Question",
          "name": "Does this work with uncontrolled inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and it is slightly simpler: read the values with FormData at flush time rather than mirroring them into state on every keystroke. Restoring means setting each input's value and dispatching an input event so anything else listening — validation, dirty tracking — sees the change, since a programmatic assignment fires nothing on its own."
          }
        }
      ]
    }
  ]
}
</script>

# Autosaving Form Drafts to localStorage

The exact problem: a form needs to survive a reload without a server round trip, and the naive implementation — write the whole form object on every keystroke — blocks the main thread, fills the quota, and leaves sensitive values on a shared device.

## Context and Prerequisites

This is the device-storage half of [draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/), which covers the lifecycle and the conflict model. Here we are only concerned with getting the write path right: what is stored, when, and how the failure modes of a synchronous, quota-limited, origin-shared API are handled.

`localStorage` is a deceptively simple API. Three of its properties cause every problem below: it is synchronous, so a large write blocks; it is string-only, so everything is serialised; and it is shared across every tab and script on the origin, so it is neither private nor exclusively yours.

## Core Pattern

```typescript
const VERSION = 3;
const MIN_FIELDS_BEFORE_FIRST_SAVE = 1;

interface StoredDraft {
  v: number;
  formId: string;
  savedAt: number;
  values: Record<string, unknown>;
}

/**
 * Field allow-list. Anything not named here is never written, so a field added
 * next month is excluded by default rather than leaked by default.
 */
const PERSISTABLE = ['fullName', 'email', 'organisation', 'message'] as const;

const keyFor = (formId: string) => `csf.draft.${formId}`;

function serialise(formId: string, values: Record<string, unknown>): string {
  const kept = Object.fromEntries(
    Object.entries(values).filter(([k, v]) =>
      (PERSISTABLE as readonly string[]).includes(k) && v !== '' && v != null),
  );
  const draft: StoredDraft = { v: VERSION, formId, savedAt: Date.now(), values: kept };
  return JSON.stringify(draft);
}

export function createLocalDraft(formId: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWritten = '';

  function writeNow(values: Record<string, unknown>): 'ok' | 'skipped' | 'unavailable' {
    const payload = serialise(formId, values);
    // Cheap guard: identical payload means nothing changed that we persist, so
    // skip the write entirely rather than paying for a synchronous string write.
    if (payload === lastWritten) return 'skipped';
    const filled = Object.keys(JSON.parse(payload).values as object).length;
    if (filled < MIN_FIELDS_BEFORE_FIRST_SAVE && lastWritten === '') return 'skipped';
    try {
      localStorage.setItem(keyFor(formId), payload);
      lastWritten = payload;
      return 'ok';
    } catch {
      // QuotaExceededError, or storage blocked by the browsing context.
      // A draft is a nicety; the form must keep working without it.
      return 'unavailable';
    }
  }

  return {
    schedule(values: Record<string, unknown>, ms = 800) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => writeNow(values), ms);
    },
    flush(values: Record<string, unknown>) {
      if (timer) clearTimeout(timer);
      return writeNow(values);
    },
    load(maxAgeMs = 7 * 24 * 3_600_000): StoredDraft | null {
      let raw: string | null = null;
      try { raw = localStorage.getItem(keyFor(formId)); } catch { return null; }
      if (!raw) return null;
      try {
        const d = JSON.parse(raw) as StoredDraft;
        if (d.v !== VERSION || d.formId !== formId) return null;
        if (Date.now() - d.savedAt > maxAgeMs) { this.clear(); return null; }
        return d;
      } catch {
        this.clear();      // corrupt or foreign payload — nothing to salvage
        return null;
      }
    },
    clear() {
      if (timer) clearTimeout(timer);
      lastWritten = '';
      try { localStorage.removeItem(keyFor(formId)); } catch { /* nothing to do */ }
    },
  };
}
```

Wiring it up needs exactly three listeners, and the third is the one most implementations miss:

```typescript
const draft = createLocalDraft('contact');

form.addEventListener('input', () => draft.schedule(readValues(form)));

// Fires when a tab is backgrounded, hidden or reclaimed — the only lifecycle
// event that is reliable on mobile, where unload and beforeunload are not.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') draft.flush(readValues(form));
});

// After the SERVER confirms. Clearing on submit loses the draft when the
// request fails, which is the moment the reader most needs it.
onSubmitConfirmed(() => draft.clear());
```

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The write path from an input event to storage, showing the three guards a write passes through: the debounce, an identical-payload check, and the field allow-list, with the failure branch when the quota is exceeded." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three guards between a keystroke and a write</title>
  <desc>An input event schedules a write. The debounce collapses a burst of keystrokes into one attempt. The attempt is then compared against the last payload written, and skipped entirely if nothing that we persist has changed — which is common, because most keystrokes change a field that is not on the allow-list or produce the same serialised result. The allow-list then strips everything not explicitly named, so a newly added field is excluded by default. Only then is the synchronous write performed, and a quota failure returns unavailable rather than throwing into the form.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="14" y="40" width="120" height="60" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="74" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">input event</text>
  <text x="74" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">one per keystroke</text>
  <path d="M134,70 H156" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="156" y="40" width="128" height="60" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="220" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">debounce 800ms</text>
  <text x="220" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a burst becomes one</text>
  <path d="M284,70 H306" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="306" y="40" width="128" height="60" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="370" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">same as last?</text>
  <text x="370" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">skip if unchanged</text>
  <path d="M434,70 H456" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="456" y="40" width="128" height="60" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="520" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">allow-list</text>
  <text x="520" y="84" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">strip everything else</text>
  <path d="M520,100 V128" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="396" y="128" width="128" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="460" y="152" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">written</text>
  <text x="460" y="170" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">synchronously</text>
  <rect x="546" y="128" width="130" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="611" y="152" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">unavailable</text>
  <text x="611" y="170" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">quota or blocked</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">The middle two guards exist for cost: a synchronous write of a large payload is measurable, and most keystrokes do not change it.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">The allow-list exists for safety, and it is a list of what to keep precisely so that forgetting to update it fails closed.</text>
</svg>

## Step-by-Step Walkthrough

1. **Namespace the key.** `csf.draft.contact` will not collide with an analytics library's `draft`. Validate the `formId` inside the payload too, so a collision is detected rather than trusted.

2. **Version the payload.** Bump `VERSION` whenever the stored shape changes, and let old drafts be discarded on load. Migrating a week-old draft is more risk than value.

3. **Allow-list the fields.** Naming what to keep, rather than what to drop, means a field added later is excluded until somebody decides otherwise.

4. **Debounce, then dedupe.** The debounce collapses a burst; the payload comparison skips the write entirely when nothing persisted changed. Together they turn dozens of synchronous writes per sentence into roughly one.

5. **Flush on `visibilitychange`.** This is the event that fires when a phone reclaims the tab. `beforeunload` does not fire reliably on mobile, and `unload` is worse.

6. **Validate on load, then announce.** Replay the validators over the restored answers so a draft written under older rules is corrected, then tell the reader in a polite live region that answers were restored — and give them a way to discard.

## Failure Modes and Edge Cases

### 1. The quota is exceeded

`setItem` throws synchronously and the exception name varies by browser. Treat any throw as "storage unavailable", keep the form working, and consider telling the reader once. The commonest cause is a file or an image encoded into the draft, which should not be there at all — store an upload reference instead.

### 2. Storage is blocked entirely

Some browsing contexts make even reading `localStorage` throw, not return null. Every access — read, write and remove — needs its own guard. A single unguarded `getItem` at module scope will break the whole form in those contexts.

### 3. A second tab overwrites the draft

Both tabs write the same key and the last one wins with no signal. Listening for `storage` gives you the signal:

```typescript
// Fires in OTHER tabs on the same origin, never in the tab that wrote.
window.addEventListener('storage', (e) => {
  if (e.key !== keyFor(formId)) return;
  if (e.newValue === null) return;            // the other tab submitted and cleared
  onSiblingWrote(JSON.parse(e.newValue) as StoredDraft);
});
```

What to do with that signal is a design decision, covered in [resolving conflicts when restoring a draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/). What you must not do is nothing.

### 4. Sensitive values reach the draft

The allow-list is the mechanism, but it only works if it is reviewed. Passwords, card details, one-time codes, and anything that would be regulated at rest do not belong in device storage at all. If the form has such fields, the safest structure is to keep them in a separate component that never routes values through the draft path.

### 5. The draft outlives its usefulness

An expiry check on load costs one comparison and prevents a reader being offered answers from a month ago, when prices, availability and their own intent have all moved on. Seven days is a reasonable ceiling for most forms and far too long for some.

<svg viewBox="0 8 668 208" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four reasons a stored draft is rejected on load — a version mismatch, a form id mismatch, an age beyond the maximum, and a parse failure — each falling back to an empty form rather than a partial restore." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Every rejection path ends in an empty form, never a partial one</title>
  <desc>A version mismatch means the stored shape predates the current code, so the entry is ignored and left for the next write to replace. A form id mismatch means something else on the origin used this key, and the entry is ignored. An age beyond the configured maximum means the draft is stale, and it is deleted as well as ignored. A parse failure means a partial write or a foreign payload, and it is deleted. In all four cases the reader gets a clean, empty form — never half a restore, which is more confusing than none.</desc>
  <rect x="0" y="8" width="668" height="208" fill="#f9f5fb"/>
  <rect x="10" y="16" width="648" height="136" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="648" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="648" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rejected because</text>
  <text x="230" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Meaning</text>
  <text x="470" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Delete it too?</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">version mismatch</text>
  <text x="230" y="66" font-size="10" fill="#6b5f75" font-family="inherit">written by older code</text>
  <text x="470" y="66" font-size="10" fill="#6b5f75" font-family="inherit">no — the next write replaces it</text>
  <line x1="10" y1="80" x2="658" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">form id mismatch</text>
  <text x="230" y="100" font-size="10" fill="#6b5f75" font-family="inherit">a key collision</text>
  <text x="470" y="100" font-size="10" fill="#a63d6f" font-family="inherit">no — it is not yours to delete</text>
  <line x1="10" y1="114" x2="658" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">too old, or unparseable</text>
  <text x="230" y="134" font-size="10" fill="#6b5f75" font-family="inherit">stale, or a partial write</text>
  <text x="470" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes — nothing to salvage</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">Note the second row: a payload whose formId is not yours may belong to another feature, so ignore it rather than removing it.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Half a restore is worse than none — a form showing three of five saved answers looks like it lost two.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Log rejections in development: a steady stream of them usually means the version is being bumped on every deploy.</text>
</svg>

The cost of the synchronous write is worth knowing in numbers, because it is what decides the debounce interval:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A payload of about two kilobytes, which is a typical text form, serialises and writes in well under a millisecond and can be written per settle without any concern. Around fifty kilobytes, which is a long free-text answer, costs a small but measurable fraction of a frame. Around five hundred kilobytes, which usually means structured data that should not be in a draft, costs several milliseconds per write and is felt on a mid-range phone. Anything with an encoded file in it is in a different regime entirely and belongs in IndexedDB or an upload reference." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Roughly what a localStorage write costs</title>
  <desc>A payload of about two kilobytes, which is a typical text form, serialises and writes in well under a millisecond and can be written per settle without any concern. Around fifty kilobytes, which is a long free-text answer, costs a small but measurable fraction of a frame. Around five hundred kilobytes, which usually means structured data that should not be in a draft, costs several milliseconds per write and is felt on a mid-range phone. Anything with an encoded file in it is in a different regime entirely and belongs in IndexedDB or an upload reference.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Payload size</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Serialise + write</text>
  <text x="380" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What to do</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">~2 kB — a text form</text>
  <text x="220" y="66" font-size="10" fill="#2d6342" font-family="inherit">well under 1ms</text>
  <text x="380" y="66" font-size="10" fill="#6b5f75" font-family="inherit">write on settle, no concern</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">~50 kB — long free text</text>
  <text x="220" y="100" font-size="10" fill="#6b5f75" font-family="inherit">a fraction of a frame</text>
  <text x="380" y="100" font-size="10" fill="#6b5f75" font-family="inherit">keep the debounce; do not shorten it</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">~500 kB — structured data</text>
  <text x="220" y="134" font-size="10" fill="#1e1a24" font-family="inherit">several ms</text>
  <text x="380" y="134" font-size="10" fill="#6b5f75" font-family="inherit">trim the payload, or move to IndexedDB</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">an encoded file</text>
  <text x="220" y="168" font-size="10" fill="#a63d6f" font-family="inherit">tens of ms</text>
  <text x="380" y="168" font-size="10" fill="#6b5f75" font-family="inherit">store an upload reference instead</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">The write is synchronous, so every one of these numbers is time the main thread is not handling input.</text>
</svg>

## Verification Checklist

- [ ] Typing a sentence produces roughly one write, not one per character
- [ ] A keystroke in a non-persisted field produces no write at all
- [ ] Backgrounding the tab on a phone flushes the draft
- [ ] Reload restores the answers and announces the restore politely
- [ ] The restore can be dismissed, and dismissing deletes the entry
- [ ] With storage disabled, the form works and nothing throws
- [ ] No password, card or one-time-code field appears in the stored payload
- [ ] The draft is deleted after the server confirms, not when submit is pressed

---

**Related**

- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) — the lifecycle this write path sits inside
- [Resolving Conflicts When Restoring a Draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/) — what to do when two copies disagree
- [Best Practices for Uncontrolled Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) — why a restore must dispatch an input event

← [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)

## Frequently Asked Questions

<details>
<summary><strong>How much can I safely store in localStorage?</strong></summary>

Assume around five megabytes per origin, shared with everything else on it, and treat that as a ceiling rather than a budget. A form of text answers will use kilobytes; the moment a file or a base64 image enters the payload you are in a different regime and should store an upload reference instead. Because the API is synchronous, size also costs time — a megabyte-scale write is measurable on a mid-range phone, which is another reason to keep the payload to the answers alone.

</details>

<details>
<summary><strong>Why visibilitychange rather than beforeunload?</strong></summary>

Because beforeunload does not fire reliably when a mobile browser reclaims a backgrounded tab, which is the exact scenario the draft exists for. visibilitychange fires when the tab is hidden, which covers switching apps, locking the phone and closing the tab, and it fires early enough for a synchronous write to complete. Keep a beforeunload flush as well if you like, but treat it as the redundant one.

</details>

<details>
<summary><strong>Should the restore happen automatically or on request?</strong></summary>

Restore the values automatically, then tell the reader and let them undo it. Making the reader click 'restore' before they can see anything means an extra step for the common case where the draft is exactly what they wanted. Filling the form silently is the other failure — a reader who does not know why the fields are populated cannot trust them. Restore, announce politely, and offer 'start again'.

</details>

<details>
<summary><strong>Does this work with uncontrolled inputs?</strong></summary>

Yes, and it is slightly simpler: read the values with FormData at flush time rather than mirroring them into state on every keystroke. Restoring means setting each input's value and dispatching an input event so anything else listening — validation, dirty tracking — sees the change, since a programmatic assignment fires nothing on its own.

</details>

