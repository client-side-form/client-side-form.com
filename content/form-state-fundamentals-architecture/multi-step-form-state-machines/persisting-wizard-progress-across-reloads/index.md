---
layout: page.njk
title: "Persisting Wizard Progress Across Reloads"
description: "Save a wizard as answers rather than as step status, recompute the path and validity on load, and place the reader on the first step that is genuinely incomplete."
slug: persisting-wizard-progress-across-reloads
type: howto
breadcrumb: "Persisting Wizard Progress Across Reloads"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Persisting Wizard Progress Across Reloads"
  parent: "Multi-Step Form State Machines"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Persisting Wizard Progress Across Reloads",
      "description": "Save a wizard as answers rather than as step status, recompute the path and validity on load, and place the reader on the first step that is genuinely incomplete.",
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
          "name": "Multi-Step Form State Machines",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Persisting Wizard Progress Across Reloads",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Persist and resume a multi-step form across reloads",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Key the draft by form id and record id"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Version the persisted payload and discard old versions"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Persist the answers only, never derived step status"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Write on a debounce, and flush on step change and visibilitychange"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "On load, recompute the path and replay validators to rebuild status"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Place the reader on the saved step only if it is reachable"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Delete the draft once the server confirms the submission"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should a draft go in localStorage, sessionStorage or IndexedDB?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "localStorage for anything that should survive closing the tab, which is the usual expectation for a long form. sessionStorage if the draft should die with the tab — appropriate when the answers are sensitive enough that leaving them on the device is the bigger risk. IndexedDB when the draft includes files or is large enough that synchronous writes become noticeable, since it is asynchronous and has a far larger quota. For a typical wizard of text answers, localStorage with a debounced write is the right default."
          }
        },
        {
          "@type": "Question",
          "name": "How long should a draft live?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Long enough to cover the interruption you are actually protecting against, which is usually hours rather than weeks. Seven days is a reasonable outer bound for a checkout or an application form; beyond that the answers are stale, prices and availability have moved, and offering them back does the reader no favours. Store the timestamp and check it on load rather than relying on the browser to clean up, because it will not."
          }
        },
        {
          "@type": "Question",
          "name": "Should the current step be part of the persisted draft?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Save it as a hint, never as state. On load, recompute status from the answers first, then honour the saved step only if the recomputed status says that step is reachable. That way a draft written before a rule changed cannot drop the reader onto a step whose prerequisites are no longer met, and the worst case is landing one step earlier than they left off."
          }
        },
        {
          "@type": "Question",
          "name": "What should happen if the saved draft fails to parse?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Delete it and start clean. A corrupt entry means a partial write or a key collision, and there is nothing useful to recover — attempting a partial parse risks restoring half a form, which is more confusing than an empty one. Log it if you have client-side error reporting, because a pattern of corrupt drafts usually means two features are writing the same key."
          }
        }
      ]
    }
  ]
}
</script>

# Persisting Wizard Progress Across Reloads

The exact problem: a reader gets three steps into a wizard, the tab reloads — a crash, a stray refresh, a phone reclaiming memory — and the form comes back empty, or worse, comes back on step four with step two's answers gone.

## Context and Prerequisites

This page assumes the wizard is already modelled as a machine rather than as paginated markup, as described in [multi-step form state machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/). The machine's most useful property here is that its state is *derivable*: step status is a function of the answers, so persistence only has to save the answers. If your wizard stores step status directly, save the answers anyway and recompute — persisted derived state is the source of almost every "resumed on the wrong step" report.

## Core Pattern: Persist Answers, Recompute Status

```typescript
import type { WizardState, StepValues } from './types';

/** Bump when the shape of what we persist changes incompatibly. */
const DRAFT_VERSION = 2;

interface PersistedDraft {
  readonly version: number;
  readonly formId: string;        // which form, so two wizards cannot collide
  readonly recordId: string | null;  // which record — editing order 12 is not order 13
  readonly savedAt: number;       // for expiry and for conflict messages
  readonly values: Record<string, StepValues>;
  readonly currentId: string;     // a hint, re-validated on load — never trusted
}

const keyFor = (formId: string, recordId: string | null) =>
  `draft:${formId}:${recordId ?? 'new'}`;

/**
 * Save. Deliberately stores ONLY the answers plus a navigation hint: step status,
 * validity and the computed path are all recomputed on load, so a change to the
 * path function cannot resurrect a draft that no longer makes sense.
 */
export function saveDraft(state: WizardState, formId: string, recordId: string | null): void {
  const draft: PersistedDraft = {
    version: DRAFT_VERSION,
    formId,
    recordId,
    savedAt: Date.now(),
    values: state.values,
    currentId: state.currentId,
  };
  try {
    localStorage.setItem(keyFor(formId, recordId), JSON.stringify(draft));
  } catch {
    // Quota exceeded, or storage disabled in this context. A wizard that cannot
    // save a draft must still work — never let this throw into the reducer.
  }
}

/**
 * Load. Returns null for anything we cannot safely resume: wrong form, wrong
 * record, old shape, or expired. Each of those is a normal outcome, not an error.
 */
export function loadDraft(
  formId: string,
  recordId: string | null,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000,
): PersistedDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(keyFor(formId, recordId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let draft: PersistedDraft;
  try {
    draft = JSON.parse(raw) as PersistedDraft;
  } catch {
    // Corrupt entry — a partial write, or something else using the same key.
    try { localStorage.removeItem(keyFor(formId, recordId)); } catch { /* ignore */ }
    return null;
  }

  if (draft.version !== DRAFT_VERSION) return null;      // no silent migration
  if (draft.formId !== formId) return null;
  if (draft.recordId !== recordId) return null;
  if (Date.now() - draft.savedAt > maxAgeMs) return null;
  return draft;
}

/**
 * Rebuild the machine from saved answers. Status is recomputed by replaying the
 * validators, so the reader lands on the first step that is genuinely incomplete
 * rather than wherever they happened to be when the tab died.
 */
export function resume(
  draft: PersistedDraft,
  deps: { path: (v: Record<string, StepValues>) => readonly string[];
          validate: (id: string, v: StepValues) => boolean },
): WizardState {
  const path = deps.path(draft.values);
  const status: Record<string, StepStatus> = {};
  let firstIncomplete: string | null = null;

  for (const id of path) {
    const values = draft.values[id];
    // A step with no saved answers, or answers that no longer validate, is not
    // complete — regardless of what the reader had reached before the reload.
    const complete = values !== undefined && deps.validate(id, values);
    if (complete) {
      status[id] = { phase: 'complete', values: Object.freeze({ ...values }) };
    } else {
      status[id] = firstIncomplete === null ? { phase: 'available' } : { phase: 'locked' };
      if (firstIncomplete === null) firstIncomplete = id;
    }
  }

  // Honour the saved position only if it is a step the reader may actually be on.
  const hintUsable = status[draft.currentId] &&
    status[draft.currentId].phase !== 'locked';
  return {
    stepIds: path,
    currentId: hintUsable ? draft.currentId : (firstIncomplete ?? path[path.length - 1]),
    status,
    values: draft.values,
    submitAttempted: false,
  };
}
```

<svg viewBox="0 8 690 228" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Resume flow: read the stored entry, reject it if the version, form, record or age do not match, then recompute the path from the saved answers, replay each step's validator to rebuild status, and finally place the reader on the saved step only if it is not locked." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What happens between a reload and the reader seeing their answers</title>
  <desc>First, read the stored entry and reject it outright if the persisted version, the form id, the record id or the age do not match what this page expects — each rejection is a normal outcome that falls back to an empty form. Second, recompute the path from the saved answers, so conditional steps reflect what the reader actually chose rather than what the path looked like when they saved. Third, replay each step's validator over its saved answers to rebuild status from scratch. Fourth, place the reader on the saved step id only if that step is not locked by the recomputed status, and otherwise on the first genuinely incomplete step.</desc>
  <rect x="0" y="8" width="690" height="228" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Four stages, and nothing derived is trusted</text>
  <rect x="14" y="36" width="152" height="76" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="90" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · read</text>
  <text x="90" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">version, form, record,</text>
  <text x="90" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">age must all match</text>
  <text x="90" y="106" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">else: empty form</text>
  <path d="M166,74 H188" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="188" y="36" width="152" height="76" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="264" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · recompute path</text>
  <text x="264" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from the saved answers,</text>
  <text x="264" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">not from the saved path</text>
  <text x="264" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">branches stay correct</text>
  <path d="M340,74 H362" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="362" y="36" width="152" height="76" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="438" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · replay validators</text>
  <text x="438" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">status rebuilt from the</text>
  <text x="438" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">answers, step by step</text>
  <text x="438" y="106" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">rules may have changed</text>
  <path d="M514,74 H536" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="536" y="36" width="140" height="76" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="606" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">4 · place the reader</text>
  <text x="606" y="78" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">saved step, if legal;</text>
  <text x="606" y="92" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">else first incomplete</text>
  <text x="606" y="106" text-anchor="middle" font-size="9" fill="#1e1a24" font-family="inherit">never a locked step</text>
  <text x="14" y="146" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why stage 3 exists at all</text>
  <text x="14" y="164" font-size="10" fill="#6b5f75" font-family="inherit">A draft can outlive the rules that produced it. A field that was optional last week may be required today, and a step</text>
  <text x="14" y="180" font-size="10" fill="#6b5f75" font-family="inherit">that was complete then is not complete now. Replaying the validators is what makes that a corrected resume rather</text>
  <text x="14" y="196" font-size="10" fill="#6b5f75" font-family="inherit">than a form that submits values it would reject today.</text>
  <text x="14" y="220" font-size="10" fill="#6b5f75" font-family="inherit">The saved step id is a hint, not state: it can only ever move the reader forward to somewhere they were already allowed.</text>
</svg>

## Step-by-Step Walkthrough

1. **Key by form and record.** `draft:checkout:new` and `draft:checkout:order-9182` are different drafts. Sharing one key is how editing a second record shows the first record's answers.

2. **Version the payload.** When the persisted shape changes, bump `DRAFT_VERSION` and let old drafts be discarded. Writing a migration for a seven-day-old draft is work that will be wrong more often than it is right.

3. **Save the answers only.** Status, validity, progress and the path are all derived. Persisting them means persisting a snapshot of rules that may since have changed.

4. **Save on a debounce, not on every keystroke.** `localStorage` writes are synchronous and block the main thread; at one write per keystroke on a large draft that is measurable. A 500 ms debounce plus a flush on step change and on `visibilitychange` catches everything that matters.

5. **Recompute on load, then place the reader.** Replay validators to rebuild status, then use the saved step id only if the recomputed status says that step is reachable.

6. **Clear on success.** A draft that survives its own submission is how a reader who starts a second order sees the first one's answers.

<svg viewBox="0 8 668 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four moments at which the draft must be written or cleared: a debounced write while typing, a flush when the step changes, a flush when the page is hidden, and a delete after a confirmed submission. Each row says what is lost if that moment is missed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When to write, and when to delete</title>
  <desc>Debounced while typing, at around five hundred milliseconds: missing this loses everything typed since the last step change. Flush on step change: missing it is mostly covered by the debounce, but a fast reader can advance inside the debounce window. Flush on visibilitychange: this is the one that catches a phone reclaiming the tab, and it is the only reliable signal on mobile, since unload does not fire dependably there. Delete after a confirmed submission: missing it means the next reader of the same form sees the previous submission's answers offered back to them.</desc>
  <rect x="0" y="8" width="668" height="216" fill="#f9f5fb"/>
  <rect x="10" y="16" width="648" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="648" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="648" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Moment</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action</text>
  <text x="360" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Missing it costs</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">while typing</text>
  <text x="220" y="66" font-size="10" fill="#6b5f75" font-family="inherit">write, debounced 500ms</text>
  <text x="360" y="66" font-size="10" fill="#a63d6f" font-family="inherit">everything since the last step</text>
  <line x1="10" y1="80" x2="658" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">step change</text>
  <text x="220" y="100" font-size="10" fill="#6b5f75" font-family="inherit">flush immediately</text>
  <text x="360" y="100" font-size="10" fill="#6b5f75" font-family="inherit">a fast reader beats the debounce</text>
  <line x1="10" y1="114" x2="658" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">visibilitychange</text>
  <text x="220" y="134" font-size="10" fill="#6b5f75" font-family="inherit">flush immediately</text>
  <text x="360" y="134" font-size="10" fill="#a63d6f" font-family="inherit">the whole draft, on mobile</text>
  <line x1="10" y1="148" x2="658" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">confirmed submit</text>
  <text x="220" y="168" font-size="10" fill="#6b5f75" font-family="inherit">delete the entry</text>
  <text x="360" y="168" font-size="10" fill="#a63d6f" font-family="inherit">the next reader sees these answers</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Use visibilitychange rather than unload or beforeunload: on mobile those fire unreliably, and this one is the signal that matters.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Delete only after the server has confirmed — deleting on submit loses the draft when the request fails.</text>
</svg>

## Failure Modes and Edge Cases

### 1. Storage is unavailable or full

Private browsing modes, storage partitioning, and a quota already consumed by something else all make `setItem` throw. A wizard whose save path can throw is a wizard that breaks on the reader's next keystroke. Wrap every access, treat failure as "no draft", and consider surfacing it once — "we could not save your progress in this browser" is honest and lets the reader decide to finish in one sitting.

### 2. The draft outlives the rules

A field that was optional when the draft was written may be required today. Replaying the validators on load turns that into a corrected resume — the step comes back `available` rather than `complete`, and the reader is asked once. Trusting a persisted `complete` flag instead means submitting values the current rules would reject.

### 3. Two tabs, one key

Both tabs read the same key, both write it, and the last write wins silently. Listen for `storage` events to detect the other tab, and either take the newer draft or tell the reader — see [resolving conflicts when restoring a draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/) for the reconciliation itself.

### 4. Sensitive values in the draft

`localStorage` is readable by any script on the origin and survives until deleted. Card numbers, passwords, one-time codes and government identifiers must be excluded from the persisted payload — allow-list the fields you save rather than blocking the ones you do not, so a new field is excluded by default.

```typescript
// Allow-list, not deny-list: a field added next month is not persisted until
// somebody deliberately adds it here.
const PERSISTABLE: Readonly<Record<string, readonly string[]>> = {
  contact: ['email', 'phone'],
  delivery: ['line1', 'line2', 'city', 'postcode', 'method'],
  payment: [],                     // nothing from this step is ever written
};
```

### 5. The key collides with another feature

Two features writing `draft` on the same origin is not hypothetical — analytics libraries, feature-flag clients and design-system playgrounds all write to `localStorage`. Namespacing the key by form and record makes a collision unlikely; validating the parsed payload's `formId` makes it harmless.

<svg viewBox="0 8 668 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Storage key structure: a fixed prefix, the form identifier and the record identifier, with a worked example for a new checkout and for editing an existing order, and a note that the payload repeats both identifiers so a collision is detected rather than trusted." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The key namespaces the draft; the payload proves it</title>
  <desc>The key is composed of a fixed prefix, the form identifier and the record identifier, so a new checkout and an edit of an existing order occupy different entries and cannot overwrite one another. The payload repeats both identifiers, which means a key collision with another feature is detected on load rather than trusted: a parsed object whose form id does not match is discarded exactly like a corrupt one. Two worked keys are shown, one for a new checkout and one for editing order nine one eight two.</desc>
  <rect x="0" y="8" width="668" height="200" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">the key</text>
  <rect x="14" y="36" width="140" height="40" rx="7" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="84" y="61" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="inherit">draft</text>
  <rect x="166" y="36" width="180" height="40" rx="7" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="256" y="61" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="inherit">formId — "checkout"</text>
  <rect x="358" y="36" width="200" height="40" rx="7" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="458" y="61" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="inherit">recordId — or "new"</text>
  <text x="14" y="104" font-size="10" fill="#6b5f75" font-family="inherit">draft:checkout:new              — a first-time order</text>
  <text x="14" y="122" font-size="10" fill="#6b5f75" font-family="inherit">draft:checkout:order-9182       — editing an existing one</text>
  <rect x="14" y="138" width="640" height="46" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="158" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">The payload repeats both identifiers on purpose</text>
  <text x="28" y="176" font-size="9.5" fill="#6b5f75" font-family="inherit">A parsed draft whose formId does not match is discarded exactly like a corrupt one — a collision becomes harmless.</text>
  <text x="14" y="204" font-size="10" fill="#6b5f75" font-family="inherit">Never key by URL: query parameters and tracking fragments change the key without changing the form.</text>
</svg>

### 6. Restoring silently

A form that quietly fills itself in is disorienting, and for a reader using a screen reader it is invisible. Announce the restore in a live region and offer a way out: "We restored your answers from 12 minutes ago. Start again." That single sentence turns a surprising behaviour into a reassuring one.

## Verification Checklist

- [ ] Reload mid-step: the answers come back and the reader lands on the same step
- [ ] Reload after changing an answer that closes a branch: the removed step is not offered
- [ ] A draft written under an older `DRAFT_VERSION` is discarded, not partially applied
- [ ] Editing a different record shows an empty form, not the previous record's answers
- [ ] `localStorage` disabled: the wizard still works, and nothing throws
- [ ] Nothing from the payment step appears anywhere in the persisted payload
- [ ] The restore is announced in a live region and can be dismissed
- [ ] The entry is deleted after a confirmed submission, and only then

---

**Related**

- [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/) — the machine whose answers this persists
- [Autosaving Form Drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/) — the same mechanics for a single-page form
- [Resolving Conflicts When Restoring a Draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/) — when the saved draft and the server disagree

← [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)

## Frequently Asked Questions

<details>
<summary><strong>Should a draft go in localStorage, sessionStorage or IndexedDB?</strong></summary>

localStorage for anything that should survive closing the tab, which is the usual expectation for a long form. sessionStorage if the draft should die with the tab — appropriate when the answers are sensitive enough that leaving them on the device is the bigger risk. IndexedDB when the draft includes files or is large enough that synchronous writes become noticeable, since it is asynchronous and has a far larger quota. For a typical wizard of text answers, localStorage with a debounced write is the right default.

</details>

<details>
<summary><strong>How long should a draft live?</strong></summary>

Long enough to cover the interruption you are actually protecting against, which is usually hours rather than weeks. Seven days is a reasonable outer bound for a checkout or an application form; beyond that the answers are stale, prices and availability have moved, and offering them back does the reader no favours. Store the timestamp and check it on load rather than relying on the browser to clean up, because it will not.

</details>

<details>
<summary><strong>Should the current step be part of the persisted draft?</strong></summary>

Save it as a hint, never as state. On load, recompute status from the answers first, then honour the saved step only if the recomputed status says that step is reachable. That way a draft written before a rule changed cannot drop the reader onto a step whose prerequisites are no longer met, and the worst case is landing one step earlier than they left off.

</details>

<details>
<summary><strong>What should happen if the saved draft fails to parse?</strong></summary>

Delete it and start clean. A corrupt entry means a partial write or a key collision, and there is nothing useful to recover — attempting a partial parse risks restoring half a form, which is more confusing than an empty one. Log it if you have client-side error reporting, because a pattern of corrupt drafts usually means two features are writing the same key.

</details>

