---
layout: page.njk
title: "Resolving Conflicts When Restoring a Draft"
description: "Compare a draft against its base version and the current remote to separate the three silent cases from the one real conflict, then ask the reader about fields rather than whole records."
slug: resolving-conflicts-when-restoring-a-draft
type: howto
breadcrumb: "Resolving Conflicts When Restoring a Draft"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Resolving Conflicts When Restoring a Draft"
  parent: "Draft Persistence and Autosave"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Resolving Conflicts When Restoring a Draft",
      "description": "Compare a draft against its base version and the current remote to separate the three silent cases from the one real conflict, then ask the reader about fields rather than whole records.",
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
          "name": "Resolving Conflicts When Restoring a Draft",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Reconcile a saved draft against a changed remote record",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Record the base version the draft started from"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Normalise both sides before comparing"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Short-circuit the cases with nothing to decide"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Merge fields only one side changed"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Ask the reader about contested fields individually"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Re-base to the current remote version after resolving"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can conflicts be merged automatically?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Non-contested ones, yes — if the two sides changed different fields, taking each side's change is unambiguous and asking the reader is a question with only one sensible answer. Contested fields, where both sides changed the same field to different values, cannot be merged safely: there is no rule that reliably picks the right one, and 'last write wins' is just automatic data loss with better branding. Ask, and ask about the field rather than the record."
          }
        },
        {
          "@type": "Question",
          "name": "What if the reader dismisses the conflict view?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Treat dismissal as 'do nothing yet' rather than as a choice. Keep the draft, keep the remote, leave the form in a read-only or clearly-flagged state, and make the conflict reachable again from a persistent control. A dismissal that silently picks a side is the same data loss you built the view to prevent, and readers dismiss things by reflex."
          }
        },
        {
          "@type": "Question",
          "name": "Do device-local drafts need conflict handling at all?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, because a second tab is a concurrent editor. Two tabs on the same origin share the same storage key, so the second tab's write overwrites the first with no signal unless you listen for storage events. The reconciliation is the same shape as the server case; only the source of the competing copy differs."
          }
        },
        {
          "@type": "Question",
          "name": "Should the base version be a timestamp or a version number?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A version number, an ETag or a monotonic sequence issued by the server. Device clocks are unreliable and two devices need not agree, so a timestamp comparison can order two edits backwards. Keep timestamps for what you show the reader — 'saved 12 minutes ago' — and use the version for every decision."
          }
        }
      ]
    }
  ]
}
</script>

# Resolving Conflicts When Restoring a Draft

The exact problem: a reader returns to a form, a saved draft is found, and the record on the server has also changed since that draft was written. Restoring the draft silently discards someone's edit; discarding the draft silently loses the reader's work. Both are data loss, and only one of them will be reported.

## Context and Prerequisites

This assumes drafts already exist, whether in device storage as described in [autosaving form drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/) or on the server as described in [draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/). The reconciliation below applies to both — the second tab is as real a concurrent editor as a colleague.

Three timestamps decide everything, and a draft system that does not record all three cannot reconcile at all:

- **`baseVersion`** — what the record looked like when the draft started. Usually a version number or ETag, not a clock.
- **`draftSavedAt`** — when the reader last touched the draft.
- **`remoteUpdatedAt`** — when the server copy last changed.

## The Four Cases

Comparing the draft's `baseVersion` against the server's current version, and checking whether the draft actually differs from its base, yields four cases. Only one of them is a genuine conflict.

<svg viewBox="0 8 690 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A two-by-two of whether the draft differs from its base and whether the remote has moved on: nothing to do, a stale empty draft, a clean fast-forward, and a genuine conflict requiring the reader to choose." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Only one of the four cases is a conflict</title>
  <desc>If the draft matches its base and the remote has not moved, there is nothing to reconcile and nothing to say. If the draft matches its base but the remote has moved, the draft carries no unsaved work, so it is discarded and the fresh remote copy is loaded silently. If the draft differs from its base and the remote has not moved, the draft can be applied directly — a clean fast-forward, which is the common case after a reload. Only when the draft differs from its base and the remote has also moved is there a genuine conflict, and that is the one case where the reader has to be asked.</desc>
  <rect x="0" y="8" width="690" height="226" fill="#f9f5fb"/>
  <text x="228" y="34" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">remote unchanged</text>
  <text x="500" y="34" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">remote moved on</text>
  <text x="14" y="80" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">draft ==</text>
  <text x="14" y="96" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">its base</text>
  <text x="14" y="168" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">draft has</text>
  <text x="14" y="184" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">changes</text>
  <rect x="96" y="44" width="264" height="72" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="110" y="66" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">nothing to do</text>
  <text x="110" y="86" font-size="9.5" fill="#6b5f75" font-family="inherit">no unsaved work, no divergence</text>
  <text x="110" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">say nothing at all</text>
  <rect x="376" y="44" width="300" height="72" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="390" y="66" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">discard the draft, load remote</text>
  <text x="390" y="86" font-size="9.5" fill="#6b5f75" font-family="inherit">the draft carried nothing the reader typed</text>
  <text x="390" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">silent — there is nothing to lose</text>
  <rect x="96" y="132" width="264" height="72" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="110" y="154" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">fast-forward</text>
  <text x="110" y="174" font-size="9.5" fill="#6b5f75" font-family="inherit">apply the draft, announce it</text>
  <text x="110" y="192" font-size="9.5" fill="#6b5f75" font-family="inherit">the common case after a reload</text>
  <rect x="376" y="132" width="300" height="72" rx="8" fill="#e2d6ec" stroke="#a63d6f" stroke-width="2"/>
  <text x="390" y="154" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">a real conflict — ask</text>
  <text x="390" y="174" font-size="9.5" fill="#1e1a24" font-family="inherit">both sides changed since the base</text>
  <text x="390" y="192" font-size="9.5" fill="#1e1a24" font-family="inherit">the only case worth a dialog</text>
  <text x="14" y="224" font-size="10" fill="#6b5f75" font-family="inherit">Systems that prompt on every restore are collapsing all four cases into the fourth, which trains readers to dismiss the prompt.</text>
</svg>

## Core Pattern

```typescript
type Values = Record<string, unknown>;

interface Draft { baseVersion: string; savedAt: number; values: Values; }
interface Remote { version: string; updatedAt: number; values: Values; }

type Reconciliation =
  | { kind: 'none' }
  | { kind: 'take-remote'; values: Values }
  | { kind: 'take-draft'; values: Values }
  | { kind: 'conflict'; fields: FieldDiff[]; draft: Draft; remote: Remote };

interface FieldDiff {
  field: string;
  base: unknown;
  draft: unknown;
  remote: unknown;
  /** True when both sides changed this field to DIFFERENT values. */
  contested: boolean;
}

export function reconcile(draft: Draft, remote: Remote, base: Values): Reconciliation {
  const draftChanged = changedFields(base, draft.values);
  const remoteMoved = draft.baseVersion !== remote.version;

  if (draftChanged.length === 0) {
    // The draft carries nothing the reader typed. Whatever the remote says wins.
    return remoteMoved ? { kind: 'take-remote', values: remote.values } : { kind: 'none' };
  }
  if (!remoteMoved) {
    // Nobody else touched it — a clean fast-forward, no question needed.
    return { kind: 'take-draft', values: draft.values };
  }

  // Both moved. Compute a per-field diff so the question can be specific.
  const remoteChanged = changedFields(base, remote.values);
  const touched = new Set([...draftChanged, ...remoteChanged]);
  const fields: FieldDiff[] = [...touched].map((field) => ({
    field,
    base: base[field],
    draft: draft.values[field],
    remote: remote.values[field],
    // Only fields BOTH sides changed, to different values, are actually contested.
    contested: draftChanged.includes(field) && remoteChanged.includes(field) &&
      !Object.is(draft.values[field], remote.values[field]),
  }));

  // A "conflict" where no field is contested is a merge, not a decision:
  // take each side's change to the fields only it touched.
  if (!fields.some((f) => f.contested)) {
    const merged: Values = { ...base };
    for (const f of fields) {
      merged[f.field] = remoteChanged.includes(f.field) ? f.remote : f.draft;
    }
    return { kind: 'take-draft', values: merged };
  }
  return { kind: 'conflict', fields, draft, remote };
}

const changedFields = (a: Values, b: Values): string[] =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => !Object.is(normalise(a[k]), normalise(b[k])));
```

The non-contested merge is what stops this being annoying in practice. Two people editing the same record usually edit different fields — one updates the address, the other the phone number — and asking the reader to choose between two whole documents when the changes do not overlap is a question with an obvious answer that you made them answer anyway.

## Step-by-Step Walkthrough

1. **Record the base.** Store the version the draft started from. Without it there is no way to tell "the reader changed this" from "it was always like that".

2. **Normalise before comparing.** Trim, coerce and treat empty as null on both sides, exactly as in [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/). A trailing space must not create a conflict.

3. **Short-circuit the three easy cases.** Most restores are `none` or `take-draft`. Handling them silently is what earns the right to interrupt for the fourth.

4. **Merge the non-contested fields.** Only fields both sides changed, to different values, need a decision.

5. **Ask about fields, not documents.** "Keep mine / keep theirs" on the whole record forces the reader to lose something. Per-field choice usually lets them lose nothing.

6. **Re-base after resolving.** The merged result's base becomes the remote's current version, or the very next save conflicts again.

## Failure Modes and Edge Cases

### 1. Clocks instead of versions

`draftSavedAt > remoteUpdatedAt` is not a valid ordering. Device clocks are wrong, sometimes by hours, and two devices need not agree. Use a version, an ETag or a monotonic sequence from the server; use timestamps only for prose the reader reads.

### 2. The base was never stored

Retrofitting drafts onto an existing form usually means early drafts have no `baseVersion`. Treat a missing base as "assume everything in the draft is a change" — that over-reports conflicts, which is the safe direction — and let the next save write a proper base.

### 3. Structural changes

A field renamed or removed between the draft being written and restored will show as a change on both sides. Versioning the payload catches the incompatible cases; for compatible ones, drop unknown keys on load rather than presenting a conflict about a field that no longer exists.

### 4. Resolving into a stale base

If the reader resolves a conflict and the remote moves again before they save, the save conflicts once more — which is correct, but infuriating if the second conflict is presented as if the first never happened. Carry the resolved values forward and re-run `reconcile` against the new remote; usually the second pass is a clean merge.

### 5. The conflict dialog is inaccessible

A modal that appears without moving focus, without a heading, and without an announcement is invisible to a screen reader reader — who will then continue typing into a form that is about to be overwritten. Everything in [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) applies, and the stakes are higher than a validation error.

<svg viewBox="0 8 690 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A per-field conflict view: three fields listed with the base value, the reader's draft value and the remote value, showing two fields changed by only one side each and merged automatically, and one contested field where the reader chooses." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Ask about the one field that is actually contested</title>
  <desc>Three fields are shown with their base value, the reader's draft value and the current remote value. The phone field was changed only in the draft, so the draft value is taken automatically. The job title was changed only on the remote, so the remote value is taken automatically. The address was changed on both sides to different values, so it is the only row the reader is asked about — and the question is about one field rather than about the whole record.</desc>
  <rect x="0" y="8" width="690" height="218" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="136" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="140" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">base</text>
  <text x="290" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">your draft</text>
  <text x="440" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">theirs</text>
  <text x="560" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">outcome</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">phone</text>
  <text x="140" y="66" font-size="10" fill="#6b5f75" font-family="inherit">0161 …</text>
  <text x="290" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">0161 496 …</text>
  <text x="440" y="66" font-size="10" fill="#6b5f75" font-family="inherit">unchanged</text>
  <text x="560" y="66" font-size="10" fill="#2d6342" font-family="inherit">yours, silently</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">job title</text>
  <text x="140" y="100" font-size="10" fill="#6b5f75" font-family="inherit">Engineer</text>
  <text x="290" y="100" font-size="10" fill="#6b5f75" font-family="inherit">unchanged</text>
  <text x="440" y="100" font-size="10" fill="#7b4f8a" font-family="inherit">Lead Engineer</text>
  <text x="560" y="100" font-size="10" fill="#2d6342" font-family="inherit">theirs, silently</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">address</text>
  <text x="140" y="134" font-size="10" fill="#6b5f75" font-family="inherit">12 Mill St</text>
  <text x="290" y="134" font-size="10" fill="#a63d6f" font-family="inherit">14 Mill St</text>
  <text x="440" y="134" font-size="10" fill="#a63d6f" font-family="inherit">12 Mill Street</text>
  <text x="560" y="134" font-size="10" fill="#a63d6f" font-family="inherit">you choose</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">One question, about one field, with both values visible — instead of "keep mine or keep theirs" over the whole record.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Show the base too: it is what makes "12 Mill Street" recognisable as a formatting fix rather than a different address.</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">After resolving, re-base to the remote&#39;s current version — otherwise the very next save conflicts again.</text>
</svg>

And the three states the conflict view itself can be in, each of which needs a decided behaviour:

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Presented: the view has focus, both values are visible with the base for reference, and nothing has been written yet. Resolved: the reader chose per field, the merged values are applied, and the base is moved forward to the current remote version so the next save does not conflict again. Dismissed: nothing was chosen, so nothing is written, the form stays flagged, and the conflict remains reachable from a persistent control rather than being silently resolved by whichever side happened to be in state." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The conflict view is a state, not a moment</title>
  <desc>Presented: the view has focus, both values are visible with the base for reference, and nothing has been written yet. Resolved: the reader chose per field, the merged values are applied, and the base is moved forward to the current remote version so the next save does not conflict again. Dismissed: nothing was chosen, so nothing is written, the form stays flagged, and the conflict remains reachable from a persistent control rather than being silently resolved by whichever side happened to be in state.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">The conflict view is a state, not a moment</text>
  <rect x="14" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="117" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">presented</text>
  <text x="117" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">has focus, shows the base</text>
  <text x="117" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing written yet</text>
  <path d="M220,80 H242" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="242" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="345" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">resolved</text>
  <text x="345" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">merged values applied,</text>
  <text x="345" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">base moved forward</text>
  <path d="M448,80 H470" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="470" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="573" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">dismissed</text>
  <text x="573" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing written, still flagged,</text>
  <text x="573" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reachable again</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Dismissal must not pick a side — readers dismiss by reflex, and a reflex should not decide whose edit survives.</text>
</svg>

## Verification Checklist

- [ ] A reload with no remote change restores silently, with a polite announcement
- [ ] A draft with no unsaved changes is discarded without a prompt
- [ ] Two people editing different fields produces a merge, not a question
- [ ] Two people editing the same field produces one question about that field
- [ ] The conflict view shows the base value as well as both sides
- [ ] Ordering uses a server version, never a device clock
- [ ] Resolving re-bases, so the next save does not conflict again
- [ ] The conflict view takes focus, has a heading, and is announced

---

**Related**

- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) — the lifecycle that produces the conflict phase
- [Autosaving Form Drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/) — detecting the second tab
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the normalisation the comparison depends on

← [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)

## Frequently Asked Questions

<details>
<summary><strong>Can conflicts be merged automatically?</strong></summary>

Non-contested ones, yes — if the two sides changed different fields, taking each side's change is unambiguous and asking the reader is a question with only one sensible answer. Contested fields, where both sides changed the same field to different values, cannot be merged safely: there is no rule that reliably picks the right one, and 'last write wins' is just automatic data loss with better branding. Ask, and ask about the field rather than the record.

</details>

<details>
<summary><strong>What if the reader dismisses the conflict view?</strong></summary>

Treat dismissal as 'do nothing yet' rather than as a choice. Keep the draft, keep the remote, leave the form in a read-only or clearly-flagged state, and make the conflict reachable again from a persistent control. A dismissal that silently picks a side is the same data loss you built the view to prevent, and readers dismiss things by reflex.

</details>

<details>
<summary><strong>Do device-local drafts need conflict handling at all?</strong></summary>

Yes, because a second tab is a concurrent editor. Two tabs on the same origin share the same storage key, so the second tab's write overwrites the first with no signal unless you listen for storage events. The reconciliation is the same shape as the server case; only the source of the competing copy differs.

</details>

<details>
<summary><strong>Should the base version be a timestamp or a version number?</strong></summary>

A version number, an ETag or a monotonic sequence issued by the server. Device clocks are unreliable and two devices need not agree, so a timestamp comparison can order two edits backwards. Keep timestamps for what you show the reader — 'saved 12 minutes ago' — and use the version for every decision.

</details>

