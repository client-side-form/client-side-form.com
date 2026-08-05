---
layout: page.njk
title: "Draft Persistence and Autosave"
description: "Model autosave as its own state machine — debounced writes, lifecycle flushes, honest status, and a conflict phase the reader resolves rather than one you merge silently."
slug: draft-persistence-and-autosave
type: topic
breadcrumb: "Form State Fundamentals & Architecture > Draft Persistence and Autosave"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Draft Persistence and Autosave"
  parent: "Form State Fundamentals"
  order: 8
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Draft Persistence and Autosave",
      "description": "Model autosave as its own state machine — debounced writes, lifecycle flushes, honest status, and a conflict phase the reader resolves rather than one you merge silently.",
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
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How often should a draft actually be written?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On settle rather than on a schedule: debounce around eight hundred milliseconds after the last change, and flush immediately on visibilitychange, on step change and before navigation. An interval-based save both writes when nothing changed and misses the change made just before the reader closed the tab. The lifecycle flush is the one that matters most on mobile, where a tab can be reclaimed without any unload event firing."
          }
        },
        {
          "@type": "Question",
          "name": "Should autosaved values be validated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Validate on restore, not on write. Writing an invalid draft is correct — half-finished input is exactly what a draft is for, and refusing to save it defeats the purpose. Restoring is different: the rules may have changed since, so replay the validators as the draft loads and show the reader which answers need another look before they reach the submit button."
          }
        },
        {
          "@type": "Question",
          "name": "What should the status indicator actually say?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Three states, in the reader's terms: unsaved changes, saving, and saved with a relative time. Put it in a polite live region so a screen reader reader is told without being interrupted, and make the failed state actionable — 'Not saved. Retrying…' with a manual retry control beats a silent spinner. Never show only 'Saved', because an indicator that cannot say anything else tells the reader nothing."
          }
        },
        {
          "@type": "Question",
          "name": "Is autosaving to localStorage a privacy problem?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It can be, and the default should be caution. localStorage is readable by any script on the origin and survives until something deletes it, so a draft is a copy of the reader's data sitting on a possibly shared device. Use an allow-list of persistable fields so a newly added field is excluded until someone deliberately includes it, never persist payment details, credentials or one-time codes, and set an expiry so an abandoned draft does not live indefinitely."
          }
        }
      ]
    }
  ]
}
</script>

# Draft Persistence and Autosave

Autosave is the feature readers never mention when it works and never forgive when it does not. It is also the feature most likely to be added late, wired to a `setInterval`, and shipped without anyone deciding what should happen when the saved copy and the server disagree — which is the only part that is actually hard.

## Problem Statement

The sub-problem is *reconciliation under uncertainty*. Saving is easy. The difficulty is that a draft is a claim about what the reader intended at some past moment, and by the time it is restored, three other things may have changed: the record on the server, the validation rules, and the reader's own memory of what they were doing. A draft system that ignores any of those produces a specific, reportable failure — silently overwriting a colleague's edit, restoring answers that no longer validate, or filling a form the reader believed was blank.

This topic applies to any form where the cost of losing input is higher than the cost of storing it: long applications, content editors, anything filled on a phone, anything behind an unreliable connection. It does not apply to short forms, and it should be actively avoided for sensitive input — a draft is a copy of data that outlives the session, and that is a liability as often as it is a feature.

Four questions have to be answered before any code, and answering them differently produces genuinely different systems:

- **Where does the draft live?** Device storage is instant, private to the device, and lost when the device is. A server draft survives a device change and can be shared, at the cost of a request and an authorisation model.
- **What triggers a write?** Time, input, or a lifecycle event — and in practice all three, because each covers a gap the others leave.
- **What is stored?** The answers, or the answers plus everything derived from them. Storing derived state is how a restored draft lands in an inconsistent condition.
- **Who wins on conflict?** The draft, the server, or the reader. Only the third is safe in the general case, and it is the one that requires interface design rather than code.

## State Machine Specification

A draft has a lifecycle of its own, running alongside the form's. Modelling it explicitly is what makes the "saving…" indicator honest — and an honest indicator is most of the perceived value of autosave.

```typescript
type DraftState =
  | { phase: 'clean' }                                    // nothing unsaved
  | { phase: 'dirty'; since: number }                     // changes not yet written
  | { phase: 'saving'; attempt: number }                  // a write is in flight
  | { phase: 'saved'; at: number }                        // written and confirmed
  | { phase: 'failed'; at: number; retryable: boolean }   // the write did not land
  | { phase: 'conflict'; local: Draft; remote: Draft };   // both sides changed
```

The `conflict` phase only exists for server-side drafts, and the temptation is to leave it out. Doing so does not remove conflicts; it removes your ability to notice them, and the last write silently wins.

| Event | From | To | Notes |
|---|---|---|---|
| field changed | any | `dirty` | starts the debounce; cancels a pending `saved` fade |
| debounce elapsed | `dirty` | `saving` | one write per settle, not one per keystroke |
| write confirmed | `saving` | `saved` | record the timestamp; it is what the reader is shown |
| write rejected, 5xx | `saving` | `failed` (retryable) | back off and retry; keep the local copy |
| write rejected, 409 | `saving` | `conflict` | the remote changed under us — ask, do not merge |
| page hidden | `dirty` | `saving` | flush; this is the write that saves a phone session |
| submit confirmed | any | `clean` | delete the draft, after the server confirms |

<svg viewBox="0 8 690 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Draft lifecycle: clean becomes dirty on a change, dirty becomes saving when the debounce elapses or the page is hidden, saving becomes saved on confirmation, failed on a server error with a retry path back to saving, and conflict when the remote copy changed too." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The draft's own lifecycle, running alongside the form's</title>
  <desc>Clean means nothing is unsaved. A field change moves it to dirty and starts a debounce. When the debounce elapses, or the page is hidden, it moves to saving. A confirmed write moves it to saved, which is the state the timestamp shown to the reader comes from. A server error moves it to failed, from which a backoff retry returns it to saving while the local copy is kept. A rejection indicating the remote copy also changed moves it to conflict, which is resolved by the reader rather than automatically. A confirmed submission returns it to clean and deletes the stored draft.</desc>
  <rect x="0" y="8" width="690" height="234" fill="#f9f5fb"/>
  <rect x="14" y="96" width="128" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="78" y="120" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">clean</text>
  <text x="78" y="138" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing unsaved</text>
  <path d="M142,124 H184" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="163" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a change</text>
  <rect x="184" y="96" width="128" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="248" y="120" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">dirty</text>
  <text x="248" y="138" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">debounce running</text>
  <path d="M312,124 H354" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="333" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">settled</text>
  <rect x="354" y="96" width="128" height="56" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="418" y="120" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">saving</text>
  <text x="418" y="138" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">write in flight</text>
  <path d="M482,110 H548" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="515" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">2xx</text>
  <rect x="548" y="30" width="128" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="612" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">saved</text>
  <text x="612" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">timestamp shown</text>
  <rect x="548" y="98" width="128" height="52" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="612" y="120" text-anchor="middle" font-size="10.5" font-weight="700" fill="#b07a55" font-family="inherit">failed</text>
  <text x="612" y="138" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">back off, retry</text>
  <path d="M482,138 H504 V190 H548" fill="none" stroke="#a63d6f" stroke-width="1.4"/>
  <text x="452" y="184" font-size="9.5" fill="#a63d6f" font-family="inherit">409</text>
  <rect x="548" y="166" width="128" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="612" y="188" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">conflict</text>
  <text x="612" y="206" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the reader decides</text>
  <path d="M548,124 H520 V166 H482" fill="none" stroke="#b07a55" stroke-width="1.4" stroke-dasharray="4 3"/>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">The dashed line is the retry: the local copy is never discarded while a write is</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">outstanding, so a failure costs latency rather than data.</text>
  <text x="14" y="232" font-size="10" fill="#6b5f75" font-family="inherit">A confirmed submission returns every phase to clean and deletes the stored copy.</text>
  <text x="14" y="42" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Five phases the "Saving…" label is derived from</text>
  <text x="14" y="60" font-size="10" fill="#6b5f75" font-family="inherit">An indicator that only ever says "Saved" is a decoration; one derived from</text>
  <text x="14" y="76" font-size="10" fill="#6b5f75" font-family="inherit">these phases is a promise the reader can rely on.</text>
</svg>

## Core Implementation

```typescript
type Values = Record<string, unknown>;

interface DraftStore {
  read(key: string): Promise<Draft | null>;
  write(key: string, draft: Draft): Promise<void>;   // may reject with a ConflictError
  remove(key: string): Promise<void>;
}

/**
 * The autosave controller. Deliberately storage-agnostic: the same logic drives
 * a localStorage draft and a server draft, and only the DraftStore differs.
 */
export function createAutosave(opts: {
  key: string;
  store: DraftStore;
  debounceMs?: number;
  onState: (s: DraftState) => void;
  /** Allow-list of persistable fields. Anything not named here is never written. */
  persistable: readonly string[];
}) {
  const { key, store, debounceMs = 800, onState, persistable } = opts;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Values | null = null;
  // The controller for the in-flight write, so a newer save supersedes an older one.
  let inflight: AbortController | null = null;
  let attempt = 0;

  const pick = (values: Values): Values =>
    Object.fromEntries(Object.entries(values).filter(([k]) => persistable.includes(k)));

  async function flush(): Promise<void> {
    if (pending === null) return;
    const payload = pick(pending);
    pending = null;
    // Supersede any write still in flight: it carries older values by definition.
    inflight?.abort();
    inflight = new AbortController();
    onState({ phase: 'saving', attempt });
    try {
      await store.write(key, { values: payload, savedAt: Date.now() });
      attempt = 0;
      onState({ phase: 'saved', at: Date.now() });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;      // superseded, not failed
      if (err instanceof ConflictError) {
        onState({ phase: 'conflict', local: err.local, remote: err.remote });
        return;                                              // never auto-merge
      }
      attempt += 1;
      onState({ phase: 'failed', at: Date.now(), retryable: attempt < 5 });
      if (attempt < 5) {
        // Exponential backoff with a ceiling; the local copy is still intact.
        pending = payload;
        timer = setTimeout(flush, Math.min(30_000, 2 ** attempt * 500));
      }
    }
  }

  return {
    /** Call when values settle — on change, not on every keystroke of a long paste. */
    schedule(values: Values): void {
      pending = values;
      onState({ phase: 'dirty', since: Date.now() });
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, debounceMs);
    },
    /** Call on visibilitychange and before navigation: writes now, ignores the debounce. */
    flushNow(): Promise<void> {
      if (timer) clearTimeout(timer);
      return flush();
    },
    /** Call once the SERVER has confirmed the submission, never before. */
    async discard(): Promise<void> {
      if (timer) clearTimeout(timer);
      inflight?.abort();
      pending = null;
      await store.remove(key);
      onState({ phase: 'clean' });
    },
  };
}
```

Three details carry most of the reliability. A newer write aborts the older one, so a slow save cannot land after a fast one and resurrect stale answers — the same reasoning as [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/). A conflict is never merged automatically. And `discard` runs after server confirmation, not on submit, so a failed submission leaves the draft intact.

## Integration Guidance

Autosave subscribes to the same settled-value events that [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) already produces, which means it needs no new instrumentation in the fields — if the form knows a field became dirty, it knows enough to schedule a save. Reusing that signal also gets the normalisation for free: a value that is not really different should not trigger a write.

For a wizard, the draft is the answers map from the [multi-step machine](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/) and nothing else. Persisting the machine's derived status is the mistake that produces a resume on the wrong step.

The interface side matters more than the storage side. A reader needs to know three things at a glance: whether their work is safe right now, when it was last safe, and what to do if it is not. One live-region-backed status line covers all three, and it must be polite rather than assertive — a save confirmation that interrupts what a screen reader reader is currently hearing is worse than no confirmation at all.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of a device-local draft and a server draft across five properties: what survives, whether it works offline, whether conflicts are possible, the privacy exposure, and what it costs to build." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Device storage or the server — the trade is not close to even</title>
  <desc>A device-local draft survives a reload and a crash but not a device change, works fully offline, cannot conflict because there is only one copy, leaves data on the device until it is deleted, and costs almost nothing to build. A server draft survives a device change and can be picked up elsewhere, requires a connection to save, can conflict with edits from another session, keeps the data under your existing access controls, and costs an endpoint, an authorisation model and a conflict interface. Many teams end up with both: device storage as the always-available fallback, and the server as the durable copy.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Property</text>
  <text x="250" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Device storage</text>
  <text x="460" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Server draft</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">survives</text>
  <text x="250" y="66" font-size="10" fill="#6b5f75" font-family="inherit">reload, crash, close</text>
  <text x="460" y="66" font-size="10" fill="#2d6342" font-family="inherit">a change of device</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">offline</text>
  <text x="250" y="100" font-size="10" fill="#2d6342" font-family="inherit">fully</text>
  <text x="460" y="100" font-size="10" fill="#a63d6f" font-family="inherit">needs a connection</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">conflicts</text>
  <text x="250" y="134" font-size="10" fill="#2d6342" font-family="inherit">impossible — one copy</text>
  <text x="460" y="134" font-size="10" fill="#b07a55" font-family="inherit">possible, must be designed for</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">privacy</text>
  <text x="250" y="168" font-size="10" fill="#a63d6f" font-family="inherit">left on the device</text>
  <text x="460" y="168" font-size="10" fill="#2d6342" font-family="inherit">under your access controls</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Many forms want both: device storage as the always-available fallback, the server as the durable copy that follows the reader.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">If you ship both, the device copy is the one that must never be authoritative — it cannot know what anyone else did.</text>
</svg>

## Edge Cases and Failure Modes

**The reader has the form open twice.** Two tabs on the same draft key will overwrite one another silently with device storage, and produce a stream of conflicts with a server draft. Listen for `storage` events to detect the sibling tab, and either lock the second one out or make the conflict visible.

**The connection returns mid-backoff.** A failed write that is retrying on a thirty-second ceiling looks broken when the connection has been back for twenty-five of those seconds. Listen for `online` and flush immediately rather than waiting out the timer.

**The draft is bigger than the quota.** A form with a long free-text answer plus a base64 image will exceed a five-megabyte quota faster than anyone expects, and `setItem` throws synchronously. Keep files out of the draft entirely — store a reference and re-upload — and treat quota failures as a reason to fall back to a server draft rather than as an error to show.

**Submitting from a stale draft.** A draft restored after a rule change may contain values the current schema rejects. Validate on restore, not only on submit, so the reader is told immediately rather than after they press the button.

**Autosaving a form the reader is abandoning.** Someone who opens a form, types two characters and leaves has not asked you to remember anything. A draft that greets them on their next visit is noise. Requiring a minimum amount of input — one completed field, or a step advanced — before the first write removes most of that.

What the reader is told is most of what autosave is worth, so the status line deserves the same care as the write path:

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Clean says nothing at all, because there is nothing to reassure about. Dirty says unsaved changes, so a reader who is about to close the tab knows. Saving says saving, in a polite region so it never interrupts. Saved says saved with a relative time, which is the answer to the only question a reader actually has. Failed says not saved and offers a manual retry, because a silent spinner gives them nothing to act on. Conflict names the other version and asks, rather than picking one." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each draft phase should say out loud</title>
  <desc>Clean says nothing at all, because there is nothing to reassure about. Dirty says unsaved changes, so a reader who is about to close the tab knows. Saving says saving, in a polite region so it never interrupts. Saved says saved with a relative time, which is the answer to the only question a reader actually has. Failed says not saved and offers a manual retry, because a silent spinner gives them nothing to act on. Conflict names the other version and asks, rather than picking one.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Phase</text>
  <text x="170" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The status line says</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Announced how</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">clean</text>
  <text x="170" y="66" font-size="10" fill="#6b5f75" font-family="inherit">nothing</text>
  <text x="400" y="66" font-size="10" fill="#6b5f75" font-family="inherit">not at all</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">dirty</text>
  <text x="170" y="100" font-size="10" fill="#6b5f75" font-family="inherit">"Unsaved changes"</text>
  <text x="400" y="100" font-size="10" fill="#6b5f75" font-family="inherit">politely, once</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">saving</text>
  <text x="170" y="134" font-size="10" fill="#6b5f75" font-family="inherit">"Saving…"</text>
  <text x="400" y="134" font-size="10" fill="#6b5f75" font-family="inherit">politely</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">saved</text>
  <text x="170" y="168" font-size="10" fill="#2d6342" font-family="inherit">"Saved 2 minutes ago"</text>
  <text x="400" y="168" font-size="10" fill="#6b5f75" font-family="inherit">politely</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">failed</text>
  <text x="170" y="202" font-size="10" fill="#a63d6f" font-family="inherit">"Not saved. Retry"</text>
  <text x="400" y="202" font-size="10" fill="#a63d6f" font-family="inherit">assertively — data is at risk</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">An indicator that can only ever say "Saved" is decoration; one derived from the phase is a promise.</text>
</svg>

## Troubleshooting Reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| "Saved" shows but nothing was written | Check whether the write promise is awaited before the phase changes | Move the `saved` transition inside the resolved branch |
| Draft restores on a form the reader never filled | Log how many fields were non-empty at the first write | Require a minimum before the first save |
| Saves stop after a network blip | Check whether the backoff has hit its ceiling with no `online` listener | Flush on `online`; reset `attempt` on success |
| Restored draft fails validation immediately | Compare the draft's version against the current schema version | Validate on restore and tell the reader which answers need another look |
| Two tabs fight | Watch for alternating writes in the `storage` event log | Detect the sibling and surface it; do not merge silently |

## Testing and QA Hooks

The controller is testable without a DOM by supplying a fake `DraftStore`. The sequences worth asserting are the ones where timing is the bug: a write scheduled and then superseded, a failure followed by a success, a flush racing a debounce, and a discard arriving while a write is in flight. Each of those is two lines of test and a class of production incident.

For end-to-end coverage, expose the phase as a data attribute on the status element — `data-draft-phase="saving"` — so a browser test can wait on the real state rather than on the word "Saving" appearing, which a copy change will break. Pair that with an assertion that the live region announced at most once per settle: an autosave that announces every keystroke is technically working and practically unusable with a screen reader.

## Common Pitfalls

- **Saving on an interval.** A timer that fires every ten seconds writes when nothing changed and misses the change made at second nine. Debounced writes plus lifecycle flushes cover both.
- **Announcing every save assertively.** "Saved" interrupting mid-sentence, every few seconds, is the fastest way to make a form unusable with a screen reader.
- **Deleting the draft on submit rather than on confirmation.** A failed submission then loses everything, which is the exact moment the draft was most needed.
- **Storing derived state.** Validity, step status and progress are all recomputable, and persisting them means restoring conclusions drawn under rules that may have changed.
- **Treating a conflict as an error.** Two people editing the same record is normal. The interface for it is a design problem, not an exception to log.

---

**Related**

- [Autosaving Form Drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/) — the device-storage implementation end to end
- [Resolving Conflicts When Restoring a Draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/) — what to do when both copies changed
- [Persisting Wizard Progress Across Reloads](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/) — the same problem with a step machine on top
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the signal autosave subscribes to

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)

## Frequently Asked Questions

<details>
<summary><strong>How often should a draft actually be written?</strong></summary>

On settle rather than on a schedule: debounce around eight hundred milliseconds after the last change, and flush immediately on visibilitychange, on step change and before navigation. An interval-based save both writes when nothing changed and misses the change made just before the reader closed the tab. The lifecycle flush is the one that matters most on mobile, where a tab can be reclaimed without any unload event firing.

</details>

<details>
<summary><strong>Should autosaved values be validated?</strong></summary>

Validate on restore, not on write. Writing an invalid draft is correct — half-finished input is exactly what a draft is for, and refusing to save it defeats the purpose. Restoring is different: the rules may have changed since, so replay the validators as the draft loads and show the reader which answers need another look before they reach the submit button.

</details>

<details>
<summary><strong>What should the status indicator actually say?</strong></summary>

Three states, in the reader's terms: unsaved changes, saving, and saved with a relative time. Put it in a polite live region so a screen reader reader is told without being interrupted, and make the failed state actionable — 'Not saved. Retrying…' with a manual retry control beats a silent spinner. Never show only 'Saved', because an indicator that cannot say anything else tells the reader nothing.

</details>

<details>
<summary><strong>Is autosaving to localStorage a privacy problem?</strong></summary>

It can be, and the default should be caution. localStorage is readable by any script on the origin and survives until something deletes it, so a draft is a copy of the reader's data sitting on a possibly shared device. Use an allow-list of persistable fields so a newly added field is excluded until someone deliberately includes it, never persist payment details, credentials or one-time codes, and set an expiry so an abandoned draft does not live indefinitely.

</details>

