---
layout: page.njk
title: "Syncing Drafts Across Tabs With BroadcastChannel"
description: "Two tabs editing the same saved draft overwrite each other silently. How to coordinate them with BroadcastChannel and the storage event: single-writer leases, change notifications, and a stale-tab banner instead of last-write-wins."
slug: syncing-drafts-across-tabs-with-broadcastchannel
type: howto
breadcrumb: "Cross-Tab Drafts"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Syncing Drafts Across Tabs With BroadcastChannel"
  parent: "Draft Persistence and Autosave"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Syncing Drafts Across Tabs With BroadcastChannel",
      "description": "Two tabs editing the same saved draft overwrite each other silently. How to coordinate them with BroadcastChannel and the storage event: single-writer leases, change notifications, and a stale-tab banner instead of last-write-wins.",
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
          "name": "Syncing Drafts Across Tabs With BroadcastChannel",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/syncing-drafts-across-tabs-with-broadcastchannel/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Coordinate a form draft across browser tabs",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Create one channel per draft key"
        },
        {
          "@type": "HowToStep",
          "name": "Claim on first edit, not on load"
        },
        {
          "@type": "HowToStep",
          "name": "Gate every autosave on isOwner()"
        },
        {
          "@type": "HowToStep",
          "name": "Go read-only when ownership moves"
        },
        {
          "@type": "HowToStep",
          "name": "Announce each save with a version"
        },
        {
          "@type": "HowToStep",
          "name": "Close the channel on teardown"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I use the storage event alone instead of BroadcastChannel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and it works in older browsers, but you have to write to storage to send a message, and it never fires in the tab that made the change. BroadcastChannel is a cleaner message bus; the storage event is a useful backstop because it is delivered to tabs that were frozen when the broadcast went out."
          }
        },
        {
          "@type": "Question",
          "name": "Does this protect drafts stored in IndexedDB too?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The coordination is independent of where the draft lives. Keep the lease in localStorage for its synchronous read, and store the draft body in IndexedDB if it is large; the channel messages carry only ids and versions."
          }
        },
        {
          "@type": "Question",
          "name": "Should the read-only tab hide the form entirely?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Show the current draft read-only so the user can see it, explain why editing is paused, and offer one button to continue here. Hiding the form makes a user who simply switched tabs think their work is gone."
          }
        }
      ]
    }
  ]
}
</script>

# Syncing Drafts Across Tabs With BroadcastChannel

When the same form is open in two tabs and both autosave to one storage key, whichever tab saved last wins, and the other tab's work vanishes the next time the draft is restored — with no error anywhere.

[Draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) covers the single-tab lifecycle. This page adds the second tab. The goal is not real-time collaborative editing; it is making sure two tabs never silently destroy each other's input, and that the user always knows which tab holds the live draft.

---

## Context and prerequisites

People open the same form twice more often than you would expect: a reopened tab from history, a link clicked in an email while the original is still open, a mobile browser restoring a tab it had suspended. With a single `localStorage` key per draft, the sequence is predictable:

1. Tab A restores the draft and the user edits the address.
2. Tab B restores the same draft and the user edits the phone number.
3. Tab A autosaves (address edited, phone original).
4. Tab B autosaves (address original, phone edited) — overwriting A's address change.

Two browser primitives make coordination cheap. **`BroadcastChannel`** delivers messages to every same-origin context listening on a named channel, and is supported in every current browser. The **`storage` event** fires in *other* tabs when `localStorage` changes, which makes it a useful fallback and a cross-check. Neither needs a server.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of tab A and tab B both restoring the same draft from storage, editing different fields, and saving in turn so that tab B&#x27;s save overwrites tab A&#x27;s address edit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two tabs, one draft key, and a silent overwrite</title>
  <desc>Tab A and tab B each read the same stored draft. Tab A edits the address and saves the whole draft. Tab B, which never saw that change, edits the phone number and saves its whole draft, overwriting the stored address with the original value. Next time the draft is restored, the address edit is gone and no error was ever shown.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Tab A</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Storage</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Tab B</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">restore draft v1</text>
  <path d="M340.0,69.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,65.0 123.7,69.0 130.7,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">restore draft v1</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">save: address edited</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">save: phone edited, old address</text>
  <path d="M557.3,153.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">next restore: address edit gone</text>
  <path d="M340.0,181.0 H130.7" stroke="#a63d6f" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
  <text x="14.0" y="221.0" font-size="10" fill="#6b5f75" font-family="inherit">Whole-draft writes are the root cause: each tab writes fields it did not change, using values it read before the other tab&#x27;s edit.</text>
</svg>

---

## The core pattern: a writer lease plus change notifications

The simplest correct policy is **single writer**: at any moment one tab owns the draft and may autosave it; other tabs show the draft read-only with a clear way to take over. Ownership is a lease announced over `BroadcastChannel` and written into storage so late-opening tabs can see it.

```typescript
type Msg =
  | { type: "claim"; tabId: string; at: number }
  | { type: "saved"; tabId: string; version: number };

interface Lease { tabId: string; at: number }

export class DraftCoordinator {
  readonly tabId = crypto.randomUUID();
  private channel: BroadcastChannel;
  private leaseKey: string;

  constructor(private draftKey: string, private onLostOwnership: () => void,
              private onRemoteSave: (version: number) => void) {
    this.leaseKey = `${draftKey}:lease`;
    this.channel = new BroadcastChannel(`draft:${draftKey}`);
    this.channel.onmessage = (e: MessageEvent<Msg>) => this.handle(e.data);
    // Fallback for contexts where a message was missed (e.g. a tab frozen by
    // the browser while backgrounded): storage events are delivered on thaw.
    addEventListener("storage", this.onStorage);
  }

  isOwner(): boolean {
    const lease = this.readLease();
    return lease?.tabId === this.tabId;
  }

  /** Take ownership — on first edit in this tab, or when the user clicks "edit here". */
  claim(): void {
    const lease: Lease = { tabId: this.tabId, at: Date.now() };
    localStorage.setItem(this.leaseKey, JSON.stringify(lease));
    this.channel.postMessage({ type: "claim", ...lease } satisfies Msg);
  }

  announceSave(version: number): void {
    this.channel.postMessage({ type: "saved", tabId: this.tabId, version } satisfies Msg);
  }

  private handle(msg: Msg) {
    if (msg.tabId === this.tabId) return;
    if (msg.type === "claim") this.onLostOwnership();      // someone else is writing now
    if (msg.type === "saved") this.onRemoteSave(msg.version);
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === this.leaseKey && e.newValue) {
      const lease = JSON.parse(e.newValue) as Lease;
      if (lease.tabId !== this.tabId) this.onLostOwnership();
    }
  };

  private readLease(): Lease | null {
    try { return JSON.parse(localStorage.getItem(this.leaseKey) ?? "null"); }
    catch { return null; }                                   // storage blocked or corrupt
  }

  destroy() {
    this.channel.close();
    removeEventListener("storage", this.onStorage);
  }
}
```

Wire it so the first `input` event in a tab calls `claim()` if the tab is not already the owner, the autosave function checks `isOwner()` before writing, and `onLostOwnership` switches the form into a read-only "this draft is being edited in another tab" state with an **Edit here instead** button that calls `claim()` and reloads the latest draft.

---

## Step-by-step walkthrough

1. **Create one channel per draft key.** Naming the channel after the draft means tabs editing different records never hear each other.
2. **Claim on first edit, not on load.** A tab that is merely open should not steal ownership from the tab the user is typing in. Claiming lazily also means a restored background tab stays passive.
3. **Gate every autosave on `isOwner()`.** The lease in storage is the source of truth; the broadcast message is the fast notification.
4. **Go read-only when ownership moves.** Keep the user's unsaved in-memory edits, disable autosave, and show a banner. If they choose to take over, merge their unsaved fields onto the latest stored draft using the conflict rules from [resolving conflicts when restoring a draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/).
5. **Announce each save with a version.** Passive tabs use it to refresh their read-only view so it never shows stale data.
6. **Close the channel on teardown.** An unclosed `BroadcastChannel` keeps the page out of the back/forward cache in some browsers and leaks the listener.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow showing tab A owning the draft and autosaving, the user typing in tab B which claims the lease and broadcasts it, tab A switching to read-only with a banner, and tab A later reclaiming via Edit here instead." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Ownership moving from tab A to tab B</title>
  <desc>Tab A owns the lease and autosaves. The user types in tab B, which writes a new lease to storage and broadcasts a claim message. Tab A receives the claim, stops autosaving, keeps its unsaved edits in memory and shows a banner saying the draft is being edited in another tab. If the user returns to tab A and clicks Edit here instead, tab A claims the lease, loads the latest stored draft and merges its unsaved fields onto it.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="392.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Tab A owns the lease</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Autosave enabled.</text>
  <text x="436.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Lease in storage: { tabId: A }.</text>
  <path d="M210.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="206.0,89.0 210.0,96.0 214.0,89.0" fill="#7b4f8a"/>
  <text x="220.0" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">user types in B</text>
  <rect x="14.0" y="97.0" width="392.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Tab B claims</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Writes lease, broadcasts claim.</text>
  <text x="436.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">B becomes the only tab allowed to write the draft.</text>
  <path d="M210.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="206.0,174.0 210.0,181.0 214.0,174.0" fill="#7b4f8a"/>
  <text x="220.0" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">claim received</text>
  <rect x="14.0" y="182.0" width="392.0" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Tab A goes read-only</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Autosave off, edits kept in memory.</text>
  <text x="436.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Banner: this draft is being edited in another tab.</text>
  <path d="M210.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="206.0,259.0 210.0,266.0 214.0,259.0" fill="#7b4f8a"/>
  <text x="220.0" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">Edit here instead</text>
  <rect x="14.0" y="267.0" width="392.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Tab A reclaims and merges</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Loads latest draft, merges its unsaved fields.</text>
  <text x="436.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Nothing typed in either tab is lost.</text>
</svg>

---

## Failure modes and edge cases

### 1. The owning tab is closed without releasing

A closed tab cannot announce anything reliably — `pagehide` handlers may not run on mobile. Treat the lease as stale after a timeout (say 30 seconds without a heartbeat or save) and allow the next editing tab to claim it silently.

### 2. Frozen background tabs

Browsers freeze background tabs to save battery. A frozen tab misses broadcast messages and receives them in a burst, or not at all, when it thaws. Re-check `isOwner()` on `visibilitychange` to visible and on the `resume` event, not only in the message handler.

### 3. Storage blocked in private modes

If `localStorage` throws, the lease cannot be persisted. Fall back to broadcast-only coordination (last claimer wins) and degrade gracefully, as [autosaving form drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/) does for the draft itself.

### 4. Field-level merge instead of single writer

If both tabs genuinely need to write, store per-field timestamps and merge field by field rather than writing whole drafts. That turns the overwrite in the first diagram into a merge where A's address and B's phone both survive — but it is more code, and conflicting edits to the *same* field still need a user decision.

### 5. Service workers and iframes

`BroadcastChannel` reaches same-origin iframes, workers and service workers too. Filter by `tabId` so an embedded preview frame of the same form does not claim the lease.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing last write wins, single-writer lease and per-field merge across data loss risk, implementation cost and user experience." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Coordination strategies compared</title>
  <desc>Last write wins has high risk of silent data loss, no implementation cost and confusing results. A single-writer lease has no silent loss, low cost and a clear read-only banner in passive tabs. Per-field merge has loss only for same-field conflicts, moderate cost, and lets both tabs keep editing.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Strategy</text>
  <text x="187.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Silent loss</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cost</text>
  <text x="513.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Experience</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Last write wins</text>
  <text x="187.0" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">likely</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">none</text>
  <text x="513.0" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">edits vanish on restore</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Single-writer lease</text>
  <text x="187.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">none</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">low</text>
  <text x="513.0" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">passive tabs go read-only</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Per-field merge</text>
  <text x="187.0" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">same-field conflicts only</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">moderate</text>
  <text x="513.0" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">both tabs keep editing</text>
</svg>

---

## Verification checklist

- [ ] Opening the form in a second tab does not change which tab can autosave until the user types there.
- [ ] Typing in the second tab puts the first tab into a read-only state with a visible, announced banner.
- [ ] Unsaved edits in the demoted tab are kept in memory and survive taking ownership back.
- [ ] Passive tabs refresh their read-only view when the owner saves.
- [ ] Closing the owning tab lets another tab claim after the lease timeout without a prompt.
- [ ] A tab thawed from the background re-checks ownership before its next autosave.
- [ ] With storage blocked, the form still works and does not throw.
- [ ] The channel is closed and the storage listener removed on unmount.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I use the storage event alone instead of BroadcastChannel?</strong></summary>

Yes, and it works in older browsers, but you have to write to storage to send a message, and it never fires in the tab that made the change. BroadcastChannel is a cleaner message bus; the storage event is a useful backstop because it is delivered to tabs that were frozen when the broadcast went out.

</details>

<details>
<summary><strong>Does this protect drafts stored in IndexedDB too?</strong></summary>

The coordination is independent of where the draft lives. Keep the lease in `localStorage` for its synchronous read, and store the draft body in [IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/) if it is large; the channel messages carry only ids and versions.

</details>

<details>
<summary><strong>Should the read-only tab hide the form entirely?</strong></summary>

No. Show the current draft read-only so the user can see it, explain why editing is paused, and offer one button to continue here. Hiding the form makes a user who simply switched tabs think their work is gone.

</details>

---

## Related

- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
- [Storing Large Drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/)
- [Versioning and Migrating Saved Draft Schemas](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/versioning-and-migrating-saved-draft-schemas/)

← [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
