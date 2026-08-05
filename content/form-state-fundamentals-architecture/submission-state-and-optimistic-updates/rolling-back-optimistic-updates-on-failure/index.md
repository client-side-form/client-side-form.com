---
layout: page.njk
title: "Rolling Back Optimistic Updates on Failure"
description: "A rollback has four things to restore, not one — values, dirty flags, errors and enabled state — captured frozen before the write and replayed in reverse order."
slug: rolling-back-optimistic-updates-on-failure
type: howto
breadcrumb: "Rolling Back Optimistic Updates on Failure"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Rolling Back Optimistic Updates on Failure"
  parent: "Submission State and Optimistic Updates"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Rolling Back Optimistic Updates on Failure",
      "description": "A rollback has four things to restore, not one — values, dirty flags, errors and enabled state — captured frozen before the write and replayed in reverse order.",
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
          "name": "Submission State and Optimistic Updates",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Rolling Back Optimistic Updates on Failure",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/rolling-back-optimistic-updates-on-failure/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Roll back an optimistic form update correctly",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Capture a frozen snapshot before applying the change"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Apply the optimistic patch and mark it saved"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "On failure, re-enable the controls first"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Attach the server errors"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Restore the dirty flags"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Restore the values last"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Announce the failure assertively"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What if the reader edits the field while the request is in flight?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Compare the field's current value against the value you optimistically applied. If they match, the reader has not touched it and the rollback is safe. If they differ, the reader has moved on and restoring would destroy their newer edit — so restore everything except that field, keep the server's error attached to it, and let them decide. This is the same staleness comparison used for server errors generally."
          }
        },
        {
          "@type": "Question",
          "name": "Should a 409 conflict trigger a rollback?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. A conflict means the remote record moved on, not that the reader's change was wrong, so discarding their edit is exactly the wrong response. Route it to reconciliation, where the reader can see both versions and choose. Rolling back a conflict is how a legitimate edit disappears because someone else touched a different field of the same record."
          }
        },
        {
          "@type": "Question",
          "name": "How do I roll back a batch where some items succeeded?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You mostly cannot, which is an argument for not applying a batch optimistically at all. If the endpoint can be made atomic, do that. If not, apply each item optimistically and independently so each one has its own snapshot and its own rollback — the reader then sees three rows confirmed and two reverted, which is the truth, rather than five rows reverted or five left wrong."
          }
        }
      ]
    }
  ]
}
</script>

# Rolling Back Optimistic Updates on Failure

The exact problem: a form renders a rename before the server has agreed, the request fails, and the reader is left looking at a value the server never accepted — on a form that believes it has no unsaved changes.

## Context and Prerequisites

The lifecycle and the safety rules are in [submission state and optimistic updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/), including which operations may be rendered optimistically at all. This page is about the rollback: what has to be captured before the write, and what has to be restored after the failure.

## Core Pattern: Capture, Apply, Restore

```typescript
interface Snapshot<T> {
  readonly values: Readonly<T>;
  readonly dirty: Readonly<Record<string, boolean>>;
  readonly errors: Readonly<Record<string, FieldError>>;
  readonly disabled: readonly string[];
}

/**
 * Capture BEFORE the optimistic write, and freeze it. A snapshot that shares
 * structure with live state is rewritten by the reader's next keystroke, and
 * the rollback then restores whatever they typed in the meantime.
 */
function capture<T extends object>(s: FormState<T>): Snapshot<T> {
  return Object.freeze({
    values: Object.freeze({ ...s.values }),
    dirty: Object.freeze({ ...s.dirty }),
    errors: Object.freeze({ ...s.errors }),
    disabled: Object.freeze([...s.disabled]),
  });
}

export async function optimistic<T extends object>(
  s: FormState<T>, patch: Partial<T>, send: () => Promise<Response>,
): Promise<void> {
  const before = capture(s);
  s.apply(patch);
  s.markSaved();                       // the optimistic claim: this is now saved

  try {
    const res = await send();
    if (res.ok) { s.confirm(await res.json()); return; }
    // Rollback in the REVERSE order of application: values last, so the reader
    // sees the field return to its old value after the controls come back.
    s.enable(before.disabled);
    s.setErrors(await mapServerErrors(res, patch));
    s.setDirty(before.dirty);          // still unsaved — this is the one that is missed
    s.setValues(before.values);
    s.announce('That change was not saved. Your edit is still here.', 'assertive');
  } catch {
    s.enable(before.disabled);
    s.setDirty(before.dirty);
    s.setValues(before.values);
    s.announce('We could not reach the service. Try again.', 'assertive');
  }
}
```

`setDirty(before.dirty)` is the line that decides whether the rollback is correct. Restoring values without restoring the dirty flags leaves a form that shows the old value *and* believes it is saved — so the save button is disabled, and the reader has no way to retry the change they just made.

<svg viewBox="0 8 690 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four things a snapshot must carry and what goes wrong if each is not restored: values, dirty flags, errors and disabled controls." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four things to capture, four distinct failures if you do not</title>
  <desc>Values: not restoring them leaves the reader looking at a change the server refused, which they will assume succeeded. Dirty flags: not restoring them leaves the form claiming to be saved while holding unsaved work, so the save control stays disabled and there is no way to retry. Errors: not restoring them leaves messages from before the attempt mixed with messages the server has just returned, so the reader cannot tell which are current. Disabled controls: not restoring them leaves the form permanently locked, because the enable step is usually written only on the success path.</desc>
  <rect x="0" y="8" width="690" height="216" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Captured</text>
  <text x="180" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">If it is not restored</text>
  <text x="470" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What the reader sees</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">values</text>
  <text x="180" y="66" font-size="10" fill="#6b5f75" font-family="inherit">a refused change stays on screen</text>
  <text x="470" y="66" font-size="10" fill="#a63d6f" font-family="inherit">it looks like it saved</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">dirty flags</text>
  <text x="180" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the form claims to be saved</text>
  <text x="470" y="100" font-size="10" fill="#a63d6f" font-family="inherit">save is disabled; no retry</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">errors</text>
  <text x="180" y="134" font-size="10" fill="#6b5f75" font-family="inherit">old and new messages mix</text>
  <text x="470" y="134" font-size="10" fill="#a63d6f" font-family="inherit">cannot tell which is current</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">disabled controls</text>
  <text x="180" y="168" font-size="10" fill="#6b5f75" font-family="inherit">the enable only ran on success</text>
  <text x="470" y="168" font-size="10" fill="#a63d6f" font-family="inherit">the form is locked</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">The second row is the one that reaches production: the values look right, so the bug is only found when someone tries to retry.</text>
</svg>

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A frozen snapshot is taken before anything changes. The patch is applied and the form claims to be saved. On success the snapshot is discarded along with the idempotency key, because there is nothing left to undo. On failure everything in the snapshot is restored in reverse order and the failure is announced — and the key is kept, because a corrected retry is still the same logical request." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Capture, apply, and the two ways it ends</title>
  <desc>A frozen snapshot is taken before anything changes. The patch is applied and the form claims to be saved. On success the snapshot is discarded along with the idempotency key, because there is nothing left to undo. On failure everything in the snapshot is restored in reverse order and the failure is announced — and the key is kept, because a corrected retry is still the same logical request.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Capture, apply, and the two ways it ends</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">capture</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">frozen snapshot,</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">before anything moves</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">apply</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the patch lands,</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the form claims saved</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">success</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">discard the snapshot</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">and the key</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">failure</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">restore in reverse,</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">keep the key</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Freezing is not ceremony: an unfrozen snapshot is rewritten by the reader’s next keystroke, and the rollback restores that.</text>
</svg>

## Step-by-Step Walkthrough

1. **Capture before applying.** After the optimistic write the old values are gone.

2. **Freeze the snapshot.** Sharing structure with live state means the reader's next keystroke rewrites your rollback target.

3. **Restore in reverse order.** Enable first, then errors, then dirty, then values — so the reader sees a form that works before they see the value move.

4. **Restore the dirty flags.** The edit is still unsaved; the form must agree.

5. **Announce assertively.** A value changing back on its own, with no announcement, is indistinguishable from the reader's own typing being lost.

6. **Do not roll back a 409.** A conflict means the remote moved, not that the change was wrong — route it to reconciliation instead.

## Failure Modes and Edge Cases

### 1. The reader edited during the request

The rollback would overwrite their newer edit with the pre-request value. Compare the current value against the optimistically applied one: if it already differs, restore everything *except* that field, and keep the error.

### 2. Two optimistic writes in flight

The second one's snapshot contains the first one's optimistic values, so rolling back the second restores an unconfirmed state. Either serialise the writes, or capture against the last *confirmed* state rather than the current one.

### 3. Rolling back a partial success

A batch where three of five items succeeded cannot be rolled back wholesale. Either make the endpoint atomic, or apply optimistically per item so each rolls back independently.

### 4. The snapshot outlives the form

A rollback firing after unmount writes into nothing, or throws. Abort the request in the teardown and check before restoring.

### 5. Announcing the wrong thing

"Something went wrong" for a 422 hides the reason. Map the server's field errors first, then announce the count — the reader needs to know it was their input, not your service.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Controls are re-enabled first, so the form is usable before anything about it changes. Errors are attached next, so the reason is on screen before the value moves. Dirty flags are restored third, so the form knows it holds unsaved work before that work reappears. Values are restored last, which is the step the reader actually sees. Doing it in the reverse order — values first — flashes the old value onto a form that is still disabled and still claiming to be saved." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The rollback order, and what each step depends on</title>
  <desc>Controls are re-enabled first, so the form is usable before anything about it changes. Errors are attached next, so the reason is on screen before the value moves. Dirty flags are restored third, so the form knows it holds unsaved work before that work reappears. Values are restored last, which is the step the reader actually sees. Doing it in the reverse order — values first — flashes the old value onto a form that is still disabled and still claiming to be saved.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Order</text>
  <text x="90" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Restore</text>
  <text x="250" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">So that</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">1</text>
  <text x="90" y="66" font-size="10" fill="#6b5f75" font-family="inherit">enabled state</text>
  <text x="250" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the form is usable before anything changes</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">2</text>
  <text x="90" y="100" font-size="10" fill="#6b5f75" font-family="inherit">errors</text>
  <text x="250" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the reason is visible before the value moves</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">3</text>
  <text x="90" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">dirty flags</text>
  <text x="250" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the form knows it holds unsaved work</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">4</text>
  <text x="90" y="168" font-size="10" fill="#6b5f75" font-family="inherit">values</text>
  <text x="250" y="168" font-size="10" fill="#6b5f75" font-family="inherit">the visible change comes last</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Reverse this and the reader sees the old value flash back onto a form that is still disabled and still says "saved".</text>
</svg>

## Verification Checklist

- [ ] The snapshot is captured before the optimistic write and is frozen
- [ ] A failed write restores values, dirty flags, errors and enabled state
- [ ] The save control is usable again after a failure
- [ ] An edit made during the request is not overwritten by the rollback
- [ ] A 409 goes to reconciliation, not to rollback
- [ ] The failure is announced assertively
- [ ] Unmounting during the request does not throw

## Common Pitfalls

- **Sharing structure with live state.** A snapshot that is not frozen is rewritten by the reader’s next keystroke, so the rollback restores whatever they typed while waiting.
- **Restoring values but not dirty flags.** The form shows the old value and believes it is saved, so the save control stays disabled and there is no way to retry the change.
- **Rolling back a conflict.** A 409 means the remote moved, not that the reader was wrong. Discarding their edit is exactly the wrong response.
- **Rolling back a partial batch.** Three of five items succeeded and the client cannot undo them. Apply optimistically per item, or make the endpoint atomic.
- **Reverting silently.** A value changing back on its own with no announcement is indistinguishable from the reader’s own typing being lost.

---

**Related**

- [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) — which operations may be optimistic
- [Retrying Failed Submissions with Backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/) — what happens after the rollback
- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/) — routing the response that caused it

← [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)

## Frequently Asked Questions

<details>
<summary><strong>What if the reader edits the field while the request is in flight?</strong></summary>

Compare the field's current value against the value you optimistically applied. If they match, the reader has not touched it and the rollback is safe. If they differ, the reader has moved on and restoring would destroy their newer edit — so restore everything except that field, keep the server's error attached to it, and let them decide. This is the same staleness comparison used for server errors generally.

</details>

<details>
<summary><strong>Should a 409 conflict trigger a rollback?</strong></summary>

No. A conflict means the remote record moved on, not that the reader's change was wrong, so discarding their edit is exactly the wrong response. Route it to reconciliation, where the reader can see both versions and choose. Rolling back a conflict is how a legitimate edit disappears because someone else touched a different field of the same record.

</details>

<details>
<summary><strong>How do I roll back a batch where some items succeeded?</strong></summary>

You mostly cannot, which is an argument for not applying a batch optimistically at all. If the endpoint can be made atomic, do that. If not, apply each item optimistically and independently so each one has its own snapshot and its own rollback — the reader then sees three rows confirmed and two reverted, which is the truth, rather than five rows reverted or five left wrong.

</details>

