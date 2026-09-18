---
layout: page.njk
title: "Resetting the Dirty Baseline After a Successful Save"
description: "After a save succeeds the form must become pristine again — but only for the values that were actually saved. How to rebase the baseline from the server response without discarding edits typed while the request was in flight."
slug: resetting-the-dirty-baseline-after-a-successful-save
type: howto
breadcrumb: "Rebasing After Save"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Resetting the Dirty Baseline After a Successful Save"
  parent: "Dirty and Pristine State Tracking"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Resetting the Dirty Baseline After a Successful Save",
      "description": "After a save succeeds the form must become pristine again — but only for the values that were actually saved. How to rebase the baseline from the server response without discarding edits typed while the request was in flight.",
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
          "name": "Dirty and Pristine State Tracking",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Resetting the Dirty Baseline After a Successful Save",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/resetting-the-dirty-baseline-after-a-successful-save/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Rebase a form's dirty baseline after a successful save",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Snapshot with structuredClone before awaiting"
        },
        {
          "@type": "HowToStep",
          "name": "Number every save"
        },
        {
          "@type": "HowToStep",
          "name": "Rebase to the echo, else the snapshot"
        },
        {
          "@type": "HowToStep",
          "name": "Recompute dirty keys against the live values"
        },
        {
          "@type": "HowToStep",
          "name": "Decide what to do about server normalisation"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just disable the form while saving so nothing changes in flight?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Disabling inputs during every save makes autosave unusable and, for explicit saves, throws away focus and interrupts typing for the length of a network round trip. It also removes the fields from the accessibility tree's operable set. Snapshotting is cheaper and keeps the form responsive."
          }
        },
        {
          "@type": "Question",
          "name": "Is structuredClone safe for form values?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes for plain data — strings, numbers, dates, arrays, objects, File and Blob. It throws on functions and DOM nodes, which should not be in form values anyway. If your state holds class instances with methods, serialise to plain objects before snapshotting."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test the in-flight edit case?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Control the response timing: with a mocked server that resolves on demand, trigger the save, type into a field, then resolve. Assert that field is still dirty and that the others are pristine. Mocking async validators with MSW shows the deferred-response technique."
          }
        }
      ]
    }
  ]
}
</script>

# Resetting the Dirty Baseline After a Successful Save

When a save succeeds the form should stop reporting unsaved changes, but the naive fix — copy the current values into the baseline — silently marks as saved anything the user typed while the request was in flight, and they lose it on the next navigation.

[Dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) defines dirtiness as "current differs from baseline". That definition only stays honest if the baseline always equals what the server has. So the rebase must be driven by what was sent and what came back, not by what happens to be in the inputs when the response lands.

---

## Context and prerequisites

A save has three moments that matter: the moment you **snapshot** the values to send, the moment the **response** arrives, and every edit in between. With autosave or a slow network, "in between" is often seconds long, and users keep typing. There are three plausible rebase targets:

1. **The current values at response time.** Wrong: includes unsent edits.
2. **The snapshot you sent.** Close: correct unless the server normalised or rejected part of it.
3. **The server's echo of the saved record.** Best: it is literally what the server now holds — trimmed strings, generated ids, rounded numbers and all.

Rebase to (3) when the API returns the saved entity, fall back to (2) when it returns only a status, and never use (1). Then recompute dirtiness against the new baseline, which leaves in-flight edits correctly flagged as dirty.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of a save request with the snapshot taken at 0 milliseconds, the user editing a field at 400 milliseconds, and the response arriving at 900 milliseconds, showing which values each rebase strategy marks as saved." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Edits made while a save is in flight</title>
  <desc>The snapshot is taken and the request sent at time zero. At 400 milliseconds, while the request is still in flight, the user edits the bio field. The response arrives at 900 milliseconds. Rebasing to current values marks the bio edit as saved even though it was never sent. Rebasing to the snapshot or the server echo leaves the bio edit dirty, so the unsaved-changes guard still protects it.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Request</text>
  <rect x="164.0" y="14.0" width="369.0" height="14" rx="3" fill="#7b4f8a"/>
  <text x="164.0" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">PUT /profile (snapshot v1)</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">User</text>
  <rect x="328.0" y="56.0" width="102.5" height="14" rx="3" fill="#b07a55"/>
  <text x="328.0" y="82.0" font-size="9" fill="#6b5f75" font-family="inherit">edits bio</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Rebase to current</text>
  <rect x="533.0" y="98.0" width="123.0" height="14" rx="3" fill="#a63d6f"/>
  <text x="533.0" y="124.0" font-size="9" fill="#a63d6f" font-family="inherit">bio edit lost</text>
  <text x="14.0" y="150.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Rebase to echo</text>
  <rect x="533.0" y="140.0" width="123.0" height="14" rx="3" fill="#2d6342"/>
  <text x="533.0" y="166.0" font-size="9" fill="#2d6342" font-family="inherit">bio still dirty</text>
  <text x="164.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="287.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">300ms</text>
  <text x="410.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">600ms</text>
  <text x="533.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">900ms</text>
  <text x="656.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1200ms</text>
  <path d="M533.0,10.0 V178.0" stroke="#7b4f8a" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
</svg>

---

## The core pattern: snapshot, send, rebase from the echo

```typescript
type Values = Record<string, unknown>;

export interface SaveResult<T extends Values> {
  saved: T | null;     // the server's echo of the stored record, when the API returns one
}

export class FormBaseline<T extends Values> {
  private baseline: T;
  private inflight = 0;               // guards against out-of-order responses

  constructor(initial: T, private equals: (a: unknown, b: unknown) => boolean) {
    this.baseline = structuredClone(initial);
  }

  dirtyKeys(current: T): (keyof T)[] {
    return (Object.keys(current) as (keyof T)[]).filter((k) => !this.equals(current[k], this.baseline[k]));
  }

  async save(current: T, send: (payload: T) => Promise<SaveResult<T>>): Promise<(keyof T)[]> {
    // Snapshot BEFORE the await. structuredClone detaches it from later edits,
    // so mutations to `current` during the request cannot leak into it.
    const snapshot = structuredClone(current);
    const ticket = ++this.inflight;
    const result = await send(snapshot);

    // An older save resolving after a newer one must not roll the baseline back.
    if (ticket !== this.inflight) return this.dirtyKeys(current);

    // Prefer the server's echo: it reflects normalisation (trimmed strings,
    // rounded numbers, generated ids) that the snapshot does not.
    this.baseline = structuredClone(result.saved ?? snapshot);
    return this.dirtyKeys(current);   // edits made in flight remain dirty
  }

  /** Server echo may differ from what the user sees; offer to adopt it. */
  normalisedFields(current: T): (keyof T)[] {
    return this.dirtyKeys(current);
  }
}
```

The return value is the list of fields still dirty after the rebase. Usually it is empty. When it is not, those fields were edited during the save — or the server changed them — and they stay flagged, so a navigation guard and the save button still reflect reality.

---

## Step-by-step walkthrough

1. **Snapshot with `structuredClone` before awaiting.** A shallow copy shares nested objects with live state, so an edit to an address line during the request would change the "sent" snapshot too.
2. **Number every save.** Keep a monotonically increasing ticket and ignore any response whose ticket is not the latest. This is the same stale-response rule used for [cancelling stale async validation](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/), applied to saves.
3. **Rebase to the echo, else the snapshot.** Never to the live values.
4. **Recompute dirty keys against the live values.** Anything typed in flight is still different from the new baseline, so it stays dirty and will be picked up by the next save.
5. **Decide what to do about server normalisation.** If the echo trimmed "Ada " to "Ada", the live input still shows the space and is now dirty. Either write the echoed value back into untouched fields (safe — the user did not edit them in flight) or accept the dirty flag until the next save.

<svg viewBox="0 0 680 261" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram with the form, the baseline and the server where save one is sent, save two is sent, save two responds first and rebases, then save one responds late and is ignored because its ticket is stale." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Out-of-order save responses</title>
  <desc>The form sends save one with ticket one, then the user edits and the form sends save two with ticket two. The server answers save two first, and the baseline rebases to its echo. Then the server answers save one. Because ticket one is no longer the latest, the baseline ignores it. Without the ticket check the late response would roll the baseline back to older values and mark saved fields as dirty again.</desc>
  <rect x="0" y="0" width="680" height="261" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Baseline</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">save #1 (ticket 1)</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">user edits, save #2 (ticket 2)</text>
  <path d="M122.7,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">#2 echo arrives first</text>
  <path d="M557.3,125.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,121.0 341.0,125.0 348.0,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">rebase to #2, form pristine</text>
  <path d="M340.0,153.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">#1 echo arrives late</text>
  <path d="M557.3,181.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="348.0,177.0 341.0,181.0 348.0,185.0" fill="#7b4f8a"/>
  <text x="130.7" y="205.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">ticket 1 is stale: ignored</text>
  <path d="M340.0,209.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,205.0 123.7,209.0 130.7,213.0" fill="#7b4f8a"/>
  <text x="14.0" y="249.0" font-size="10" fill="#6b5f75" font-family="inherit">Autosave makes this ordering common rather than exotic: a debounced save can easily overlap the previous one on a slow connection.</text>
</svg>

---

## Failure modes and edge cases

### 1. Resetting the whole form after save

`form.reset()` or a library `reset()` with no arguments restores the *initial* values from first mount — it does not adopt the saved ones. After a successful save, call `reset(savedValues)` or rebase as above; otherwise the next reset takes the user back to pre-save data.

### 2. The server normalises a field the user is still editing

If the echo differs from the live value *and* the field was edited in flight, do not overwrite it: the user's newest text wins, and the field stays dirty. Only write echoed values into fields whose live value still equals the snapshot.

```typescript
for (const k of Object.keys(echo) as (keyof T)[]) {
  if (equals(current[k], snapshot[k]) && !equals(echo[k], current[k])) setField(k, echo[k]);
}
```

### 3. Partial saves

A PATCH that sends only dirty fields must rebase only those fields. Merging the echo into the baseline field by field (`baseline = { ...baseline, ...pick(echo, sentKeys) }`) keeps unsent fields' baselines intact.

### 4. Validation failure is not success

A `422` must not rebase anything. Keep the baseline, keep the form dirty, and route the errors as described in [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).

### 5. Draft storage still holds the pre-save draft

If you persist drafts, clear or overwrite the stored draft in the same step as the rebase. A leftover draft offered on the next visit is a stale copy of data that is already saved, as covered in [autosaving form drafts to localStorage](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/autosaving-form-drafts-to-localstorage/).

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table mapping four save response shapes to the correct rebase target and whether untouched fields should adopt server values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to rebase to, by API response shape</title>
  <desc>When the API returns the full saved entity, rebase to that echo and write server-normalised values into fields the user did not touch in flight. When it returns only a status such as 204, rebase to the snapshot that was sent. When it returns a partial echo for a PATCH, merge the echoed fields into the existing baseline. When it returns a 422 validation error, do not rebase at all.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Response</text>
  <text x="219.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rebase to</text>
  <text x="447.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Adopt server values?</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">200 with full entity</text>
  <text x="219.6" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">the echo</text>
  <text x="447.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes, for fields untouched in flight</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">204 No Content</text>
  <text x="219.6" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">the sent snapshot</text>
  <text x="447.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">nothing to adopt</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">200 with partial echo (PATCH)</text>
  <text x="219.6" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">baseline merged with echoed keys</text>
  <text x="447.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes, for echoed keys only</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">422 / 409</text>
  <text x="219.6" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">do not rebase</text>
  <text x="447.8" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no; keep the form dirty</text>
</svg>

---

## Verification checklist

- [ ] After a successful save with no further typing, the form reports pristine and the unsaved-changes guard is silent.
- [ ] Typing during a slow save leaves those fields dirty after the response arrives.
- [ ] Two overlapping saves never roll the baseline back to the older one.
- [ ] A server-trimmed value appears in an untouched field after save; a field edited in flight keeps the user's text.
- [ ] `reset()` after a save restores the saved values, not the original ones.
- [ ] A 422 response leaves the form dirty and the baseline unchanged.
- [ ] Any stored draft is cleared or replaced when the save succeeds.

---

## Frequently Asked Questions

<details>
<summary><strong>Why not just disable the form while saving so nothing changes in flight?</strong></summary>

Disabling inputs during every save makes autosave unusable and, for explicit saves, throws away focus and interrupts typing for the length of a network round trip. It also removes the fields from the accessibility tree's operable set. Snapshotting is cheaper and keeps the form responsive.

</details>

<details>
<summary><strong>Is structuredClone safe for form values?</strong></summary>

Yes for plain data — strings, numbers, dates, arrays, objects, `File` and `Blob`. It throws on functions and DOM nodes, which should not be in form values anyway. If your state holds class instances with methods, serialise to plain objects before snapshotting.

</details>

<details>
<summary><strong>How do I test the in-flight edit case?</strong></summary>

Control the response timing: with a mocked server that resolves on demand, trigger the save, type into a field, then resolve. Assert that field is still dirty and that the others are pristine. [Mocking async validators with MSW](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/mocking-async-validators-with-msw/) shows the deferred-response technique.

</details>

---

## Related

- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
- [Deep Equality for Dirty Detection on Nested Values](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/deep-equality-for-dirty-detection-on-nested-values/)
- [Handling Double Submit and Idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/)

← [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
