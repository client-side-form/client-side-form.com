---
layout: page.njk
title: "Storing Large Drafts in IndexedDB"
description: "When a draft outgrows localStorage — attachments, long rich text, hundreds of rows — move it to IndexedDB. A small promise wrapper, transaction and quota handling, storing File objects directly, and eviction you can explain to users."
slug: storing-large-drafts-in-indexeddb
type: howto
breadcrumb: "IndexedDB Drafts"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Storing Large Drafts in IndexedDB"
  parent: "Draft Persistence and Autosave"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Storing Large Drafts in IndexedDB",
      "description": "When a draft outgrows localStorage — attachments, long rich text, hundreds of rows — move it to IndexedDB. A small promise wrapper, transaction and quota handling, storing File objects directly, and eviction you can explain to users.",
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
          "name": "Draft Persistence and Autosave",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Storing Large Drafts in IndexedDB",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Persist large form drafts in IndexedDB",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Open one connection and cache the promise"
        },
        {
          "@type": "HowToStep",
          "name": "Create the store in onupgradeneeded with a key path"
        },
        {
          "@type": "HowToStep",
          "name": "Handle versionchange"
        },
        {
          "@type": "HowToStep",
          "name": "Resolve writes on complete"
        },
        {
          "@type": "HowToStep",
          "name": "Store File objects directly"
        },
        {
          "@type": "HowToStep",
          "name": "Catch quota and blocked-storage errors and keep the form working"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use a library such as idb or Dexie instead of the raw API?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Either is a good choice and removes most of the boilerplate here; idb is a thin promise wrapper and Dexie adds querying and schema helpers. The rules on this page — one connection, resolve on complete, handle versionchange, catch quota errors — apply regardless of the wrapper."
          }
        },
        {
          "@type": "Question",
          "name": "Is IndexedDB fast enough to save on every keystroke?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is fast, but you should still debounce. Each transaction has fixed overhead, and saving hundreds of times per minute gains nothing over saving a second after the user pauses. Debounce as for any draft and flush on pagehide."
          }
        },
        {
          "@type": "Question",
          "name": "Are drafts in IndexedDB private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They are readable by any script running on your origin and by anyone with access to the device profile. Do not store secrets such as passwords or full card numbers in drafts; exclude those fields from the persisted values entirely."
          }
        }
      ]
    }
  ]
}
</script>

# Storing Large Drafts in IndexedDB

A `localStorage` draft fails in three ways once forms get big: the synchronous write blocks the main thread on every autosave, the roughly 5 MB per-origin limit throws `QuotaExceededError`, and it cannot hold the `File` a user attached — so the restored draft is missing its attachment.

[Draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) sets out when and how often to save. This page is about where, once the draft is too large or too rich for a string store. IndexedDB is asynchronous, stores structured data including `Blob` and `File` natively, and has quotas measured as a share of free disk rather than a fixed few megabytes.

---

## Context and prerequisites

Move a draft to IndexedDB when any of these is true:

- **It includes files.** An attached PDF or image can be stored as the `File` itself, so a restored draft still has it. `localStorage` can only hold strings; base64-encoding a file inflates it by a third and still blows the quota.
- **It is large.** Long rich-text bodies, spreadsheets-as-forms or hundreds of repeatable rows can exceed 5 MB across all drafts on an origin.
- **Autosave causes jank.** `localStorage.setItem` with a 1 MB string can take several milliseconds on a mid-range phone, on the main thread, every debounce interval.

Keep a tiny index — draft ids, versions and timestamps — in `localStorage` if you need a synchronous read at startup, and put the bodies in IndexedDB.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison table of localStorage and IndexedDB for draft storage across API style, capacity, file support, main-thread cost and failure behaviour." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>localStorage and IndexedDB for drafts</title>
  <desc>localStorage is synchronous, limited to roughly five megabytes per origin, stores only strings so files must be encoded, blocks the main thread in proportion to size, and throws QuotaExceededError when full. IndexedDB is asynchronous, allows a large share of free disk, stores File and Blob objects natively, does its work off the main thread, and reports quota errors through the transaction.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Property</text>
  <text x="195.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">localStorage</text>
  <text x="435.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">IndexedDB</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">API</text>
  <text x="195.6" y="61.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">synchronous</text>
  <text x="435.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">asynchronous (transactions)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Capacity</text>
  <text x="195.6" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">about 5 MB per origin</text>
  <text x="435.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">share of free disk</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Files</text>
  <text x="195.6" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">strings only; base64 +33%</text>
  <text x="435.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">File and Blob stored natively</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Main thread</text>
  <text x="195.6" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">blocks while serialising</text>
  <text x="435.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">structured clone, off-thread I/O</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">When full</text>
  <text x="195.6" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">throws on setItem</text>
  <text x="435.8" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">transaction error; handle it</text>
</svg>

---

## The core pattern: a minimal promise wrapper and a drafts store

```typescript
const DB_NAME = "form-drafts";
const DB_VERSION = 1;
const STORE = "drafts";

export interface StoredDraft<T> {
  id: string;             // e.g. "claim-form:record-812"
  schemaVersion: number;  // see the migration guide
  savedAt: number;
  values: T;              // may contain File / Blob objects
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  // Reuse one connection per page: opening is slow and each open holds a lock.
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("savedAt", "savedAt");   // for age-based cleanup
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgrading the schema asks us to close; if we refuse, its
      // upgrade blocks forever.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
  }));
}

function tx<R>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  return openDb().then((db) => new Promise<R>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    // Resolve on transaction COMPLETE, not request success: a write is only
    // durable once the transaction commits.
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
  }));
}

export const drafts = {
  put: <T>(d: StoredDraft<T>) => tx("readwrite", (s) => s.put(d)),
  get: <T>(id: string) => tx<StoredDraft<T> | undefined>("readonly", (s) => s.get(id)),
  delete: (id: string) => tx("readwrite", (s) => s.delete(id)),
};
```

Values go in as they are: `File` objects, `Date`s and nested arrays survive structured cloning, so restoring a draft hands back a real `File` you can put straight back into the upload field's state.

---

## Step-by-step walkthrough

1. **Open one connection and cache the promise.** Every `indexedDB.open` is expensive; opening per save adds tens of milliseconds and contends for locks.
2. **Create the store in `onupgradeneeded` with a key path.** Using `id` as the key path lets you `put` whole draft objects and index them by `savedAt` for cleanup.
3. **Handle `versionchange`.** Close the connection when another tab needs to upgrade; otherwise a new deployment's upgrade stalls in every tab still running the old code.
4. **Resolve writes on `complete`.** A request's `success` fires before the transaction commits; if the tab closes in between, the write is lost. Wait for `oncomplete`.
5. **Store `File` objects directly.** No base64. The restored draft's file field then works with the same code as a freshly chosen file, including [validating file type and size before upload](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/validating-file-type-and-size-before-upload/).
6. **Catch quota and blocked-storage errors and keep the form working.** Show a quiet "draft not saved on this device" status; never block typing because persistence failed.

<svg viewBox="0 0 680 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards describing the parts of a draft record in IndexedDB — the key, the schema version and timestamp, the field values, and attached files stored as File objects." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a stored draft record contains</title>
  <desc>The id key combines the form name and the record id so drafts for different records never collide. The schema version and savedAt timestamp support migration and age-based cleanup through an index. The values hold ordinary field data including dates and arrays. Attached files are stored as File objects inside the values, so they come back as real files on restore.</desc>
  <rect x="0" y="0" width="680" height="128" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="100.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">id (key path)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">form name + record id</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One draft per record.</text>
  <rect x="180.5" y="12.0" width="152.5" height="100.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">schemaVersion,</text>
  <text x="192.5" y="50.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">savedAt</text>
  <text x="192.5" y="69.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Migration on load.</text>
  <text x="192.5" y="83.0" font-size="9.5" fill="#6b5f75" font-family="inherit">savedAt is indexed for</text>
  <text x="192.5" y="97.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cleanup.</text>
  <rect x="347.0" y="12.0" width="152.5" height="100.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">values</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Plain field data.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Dates and arrays survive</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cloning.</text>
  <rect x="513.5" y="12.0" width="152.5" height="100.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">File objects</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Stored as-is.</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Restored as real files.</text>
</svg>

---

## Failure modes and edge cases

### 1. Safari and private browsing

Private windows in some browsers provide an IndexedDB that works but is wiped when the window closes, or has a very small quota. Feature-detect by attempting an open and a small write at startup; if it fails, fall back to memory and tell the user drafts are not kept.

### 2. Eviction under storage pressure

Unless the origin has persistent storage, the browser may evict IndexedDB data when the disk is low. For forms where losing a draft is costly, request it:

```typescript
if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
  await navigator.storage.persist();   // browsers may grant silently or decline
}
```

Use `navigator.storage.estimate()` to show usage in settings for heavy users.

### 3. Structured-clone failures

Functions, DOM nodes, class instances with private fields and some proxies (including reactive proxies from Vue) throw `DataCloneError`. Convert state to plain objects before `put` — in Vue, `toRaw` on each level or a deliberate serialiser.

### 4. Many tabs, one database

Two tabs can write the same draft id; IndexedDB serialises transactions, so you will not corrupt data, but you can still overwrite. Combine this store with the lease from [syncing drafts across tabs with BroadcastChannel](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/syncing-drafts-across-tabs-with-broadcastchannel/).

### 5. Drafts that never get cleaned up

Delete the draft on successful submit, and periodically delete drafts older than your retention window using the `savedAt` index. Stale files attached to abandoned drafts are the main source of surprising storage use.

<svg viewBox="0 0 680 255" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of an autosave writing to IndexedDB, falling back to localStorage for small drafts on failure, then to memory only, with the status shown to the user at each level." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A resilient save path</title>
  <desc>The autosave first tries an IndexedDB put and reports saved on this device when the transaction completes. If that fails and the draft has no files and is small, it tries localStorage. If that also fails, the draft is kept in memory only and the status line says the draft will not survive closing the tab. Typing is never blocked at any level.</desc>
  <rect x="0" y="0" width="680" height="255" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="382.8" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">IndexedDB put</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Resolve on transaction complete.</text>
  <text x="426.8" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Status: saved on this device.</text>
  <path d="M205.4,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="201.4,89.0 205.4,96.0 209.4,89.0" fill="#7b4f8a"/>
  <text x="215.4" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">error</text>
  <rect x="14.0" y="97.0" width="382.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">localStorage (small, no files)</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only if the draft fits and has no File.</text>
  <text x="426.8" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Status: saved on this device (without attachments).</text>
  <path d="M205.4,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="201.4,174.0 205.4,181.0 209.4,174.0" fill="#7b4f8a"/>
  <text x="215.4" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">error</text>
  <rect x="14.0" y="182.0" width="382.8" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Memory only</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Keep state; stop retrying each keystroke.</text>
  <text x="426.8" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Status: draft will not survive closing this tab.</text>
</svg>

---

## Verification checklist

- [ ] Attaching a file, reloading and restoring the draft returns a usable `File` with the right name, type and size.
- [ ] Autosave of a large draft causes no long task on the main thread in the Performance panel.
- [ ] A deployment that bumps the database version upgrades cleanly while another tab is open.
- [ ] Writes resolve only after the transaction completes.
- [ ] Quota errors and blocked storage show a status message and never stop typing.
- [ ] Drafts are deleted after a successful submit.
- [ ] Old drafts are removed after the retention period.
- [ ] Private-browsing mode degrades to a working form with an honest status.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use a library such as idb or Dexie instead of the raw API?</strong></summary>

Either is a good choice and removes most of the boilerplate here; `idb` is a thin promise wrapper and Dexie adds querying and schema helpers. The rules on this page — one connection, resolve on complete, handle versionchange, catch quota errors — apply regardless of the wrapper.

</details>

<details>
<summary><strong>Is IndexedDB fast enough to save on every keystroke?</strong></summary>

It is fast, but you should still debounce. Each transaction has fixed overhead, and saving hundreds of times per minute gains nothing over saving a second after the user pauses. Debounce as for any draft and flush on `pagehide`.

</details>

<details>
<summary><strong>Are drafts in IndexedDB private?</strong></summary>

They are readable by any script running on your origin and by anyone with access to the device profile. Do not store secrets such as passwords or full card numbers in drafts; exclude those fields from the persisted values entirely.

</details>

---

## Related

- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
- [Autosaving Form Drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/)
- [Versioning and Migrating Saved Draft Schemas](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/versioning-and-migrating-saved-draft-schemas/)

← [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
