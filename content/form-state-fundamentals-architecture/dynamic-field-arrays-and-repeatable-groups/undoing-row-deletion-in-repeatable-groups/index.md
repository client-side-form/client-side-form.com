---
layout: page.njk
title: "Undoing Row Deletion in Repeatable Groups"
description: "Replace 'Are you sure?' dialogs with an undo: keep removed rows with their values, errors and position, restore them exactly, move focus sensibly on remove and restore, and announce both to screen-reader users."
slug: undoing-row-deletion-in-repeatable-groups
type: howto
breadcrumb: "Undo Row Deletion"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Undoing Row Deletion in Repeatable Groups"
  parent: "Dynamic Field Arrays and Repeatable Groups"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Undoing Row Deletion in Repeatable Groups",
      "description": "Replace 'Are you sure?' dialogs with an undo: keep removed rows with their values, errors and position, restore them exactly, move focus sensibly on remove and restore, and announce both to screen-reader users.",
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
          "name": "Dynamic Field Arrays and Repeatable Groups",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Undoing Row Deletion in Repeatable Groups",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Add undo to row deletion in a repeatable group",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Move removed rows into a removal record"
        },
        {
          "@type": "HowToStep",
          "name": "Anchor position to a neighbour"
        },
        {
          "@type": "HowToStep",
          "name": "Move focus on remove"
        },
        {
          "@type": "HowToStep",
          "name": "Announce the removal with the undo"
        },
        {
          "@type": "HowToStep",
          "name": "Restore and refocus on undo"
        },
        {
          "@type": "HowToStep",
          "name": "Expire on submit or after a generous window"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is a confirmation dialog ever the better choice?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "When the deletion is immediately irreversible on the server and cannot be deferred — deleting a saved record with side effects — a confirmation naming exactly what will be lost is appropriate. For rows in an unsaved form, undo is almost always better."
          }
        },
        {
          "@type": "Question",
          "name": "How long should the undo window be?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Long enough to notice and reach the button without hurry: at least ten seconds, and many teams keep removals until the next submit. Short timeouts penalise users who navigate slowly, which is the population undo most needs to serve."
          }
        },
        {
          "@type": "Question",
          "name": "Should Ctrl+Z trigger undo?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Inside a text field, Ctrl+Z belongs to the browser's text undo; do not intercept it there. A group-level shortcut outside text fields is a nice addition for power users, but the visible Undo button is the accessible baseline."
          }
        }
      ]
    }
  ]
}
</script>

# Undoing Row Deletion in Repeatable Groups

A confirmation dialog on every row delete trains users to click "Yes" without reading, and does nothing for the delete they did not mean to make; an undo lets them remove rows at full speed and still recover the one that mattered — with everything they had typed into it.

In the [dynamic field arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/) model, a removed row moves into a `removed` state rather than vanishing. This page implements that state: what to keep, how long to keep it, how to restore it into the right position when other rows have changed since, and how to handle focus and announcements so that undo works for keyboard and screen-reader users as well as mouse users.

---

## Context and prerequisites

A faithful undo restores the row as it was:

- **its values** — including uncontrolled inputs and attached files,
- **its id** — so any state keyed by id (touched flags, expanded panels) lines up again,
- **its errors** — if it was invalid before, it is invalid after,
- **its position** — relative to its neighbours, not a raw index that other edits may have invalidated.

It must also be *findable*. A toast in the corner that disappears after four seconds is not an undo for a screen-reader user or someone with a motor impairment. The undo control should stay available long enough to reach, and removal should be announced with the undo offered.

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards comparing a confirmation dialog on delete with an undo after delete, across speed, protection against mistakes and accessibility." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Confirm dialog versus undo</title>
  <desc>A confirmation dialog interrupts every delete, is quickly dismissed out of habit, and protects nothing once confirmed; it also moves focus into a modal and back. An undo keeps deletion instant, protects against mistakes noticed a few seconds later, restores everything the row held, and when announced through a live region with a reachable button it works for keyboard and screen-reader users.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;Are you sure?&quot; dialog</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Interrupts every delete.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Confirmed out of habit.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No recovery once confirmed.</text>
  <text x="26.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves focus into a modal and back.</text>
  <rect x="347.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Undo</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Delete stays instant.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Recovers mistakes noticed later.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Restores values, errors and position.</text>
  <text x="359.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Announced, with a reachable button.</text>
</svg>

---

## The core pattern: a removal record anchored to neighbours

```typescript
type RowId = string;

interface Removal<V> {
  id: RowId;
  value: V;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  // Anchor to the NEIGHBOUR, not the index: other rows may be added,
  // removed or moved before the user clicks Undo.
  after: RowId | null;          // the row that was directly above it (null = first)
  removedAt: number;
}

export interface GroupState<V> {
  order: RowId[];
  rows: Record<RowId, V>;
  errors: Record<RowId, Record<string, string>>;
  touched: Record<RowId, Record<string, boolean>>;
  removals: Removal<V>[];       // most recent last
}

export function remove<V>(s: GroupState<V>, id: RowId): GroupState<V> {
  const i = s.order.indexOf(id);
  if (i === -1) return s;
  const removal: Removal<V> = {
    id, value: s.rows[id], errors: s.errors[id] ?? {}, touched: s.touched[id] ?? {},
    after: i > 0 ? s.order[i - 1] : null, removedAt: Date.now(),
  };
  const { [id]: _v, ...rows } = s.rows;
  const { [id]: _e, ...errors } = s.errors;
  const { [id]: _t, ...touched } = s.touched;
  return { ...s, rows, errors, touched, order: s.order.filter((r) => r !== id), removals: [...s.removals, removal] };
}

export function undo<V>(s: GroupState<V>, id?: RowId): GroupState<V> {
  const r = id ? s.removals.find((x) => x.id === id) : s.removals[s.removals.length - 1];
  if (!r) return s;
  // Re-insert after its old upper neighbour if that row still exists;
  // otherwise fall back to the top, which is where the user will look first.
  const anchor = r.after && s.order.includes(r.after) ? s.order.indexOf(r.after) + 1 : 0;
  const order = [...s.order];
  order.splice(anchor, 0, r.id);
  return {
    ...s, order,
    rows: { ...s.rows, [r.id]: r.value },
    errors: { ...s.errors, [r.id]: r.errors },
    touched: { ...s.touched, [r.id]: r.touched },
    removals: s.removals.filter((x) => x !== r),
  };
}

// Removals are discarded on submit or after the undo window.
export const expire = <V>(s: GroupState<V>, now: number, windowMs = 30_000): GroupState<V> =>
  ({ ...s, removals: s.removals.filter((r) => now - r.removedAt < windowMs) });
```

The removed row keeps its original id, so restoring it brings back the same identity — any state keyed by that id elsewhere (an expanded accordion, a pending file upload) reconnects automatically.

---

## Step-by-step walkthrough

1. **Move removed rows into a removal record.** Keep values, errors, touched flags and the id; take them out of the live maps so no other row can inherit them.
2. **Anchor position to a neighbour.** "After row B" survives other edits; "index 2" does not. If the neighbour is gone too, restore at the top of the group.
3. **Move focus on remove.** Focus the next row's legend (made focusable with `tabindex="-1"`), or the previous row's if it was the last, or the Add button if the group is now empty. Never leave focus on the removed button, which no longer exists.
4. **Announce the removal with the undo.** A polite live region says "Contact 2, Grace Hopper, removed", and an "Undo remove Grace Hopper" button appears in a fixed place in the group — see [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/) for keeping several quick removals from flooding the region.
5. **Restore and refocus on undo.** Re-insert the row, move focus to its first field or legend, and announce "Grace Hopper restored".
6. **Expire on submit or after a generous window.** Thirty seconds or until the next submit is typical; WCAG's timing guidance favours letting users extend or turn off short limits, so do not make the window tiny.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a keyboard user removing a row, focus moving to the next row, a live region announcing the removal with undo available, the user activating undo, and the row being restored with focus returned to it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Remove and undo with focus and announcements</title>
  <desc>The user presses the Remove button on Grace&#x27;s row. The group moves Grace into a removal record anchored after Ada, moves focus to Alan&#x27;s row legend, and the live region announces that Grace Hopper was removed and that undo is available. The user tabs to the Undo button and activates it. The group re-inserts Grace after Ada with her values and errors, moves focus to her first field and the live region announces that she was restored.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Group</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Live region</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Remove (Grace)</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">focus → Alan&#x27;s legend</text>
  <path d="M340.0,97.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,93.0 123.7,97.0 130.7,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Grace Hopper removed. Undo available.&quot;</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Undo remove Grace Hopper</text>
  <path d="M122.7,153.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,149.0 339.0,153.0 332.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">re-insert after Ada; focus → her name field</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
  <text x="348.0" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;Grace Hopper restored.&quot;</text>
  <path d="M340.0,209.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,205.0 556.3,209.0 549.3,213.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Undo only in a vanishing toast

Toasts that auto-dismiss after a few seconds and live outside the form are hard to reach by keyboard in time and may never be announced. Put the undo inside the group, keep it for the whole window, and make it a real button with a specific accessible name.

### 2. Files in removed rows

If a removed row had an uploaded file, keep the file reference (and any object URL) until the removal expires, then revoke it — as in [image previews with object URLs without leaks](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/image-previews-with-object-urls-without-leaks/). Revoking on remove makes undo restore a broken preview.

### 3. Server-backed rows

If rows are saved immediately (each row is its own record), "remove" should be a soft delete that the undo reverses, or the delete request should wait until the undo window expires. Deleting on the server and re-creating on undo produces a new server id and loses history.

### 4. Minimum count

Removing below the minimum shows the group's minimum message immediately; undo must clear it again. Derive the message from the live rows rather than setting it imperatively, as in [validating minimum and maximum row counts](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/).

### 5. Several removals in a row

Keep a stack, and offer undo for each removed row by name ("Undo remove Grace Hopper", "Undo remove Alan Turing"), not just the last. Users who remove three rows and realise the first was a mistake should not have to undo the other two.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of structural actions in a repeatable group and where focus should move after each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where focus goes after each action</title>
  <desc>After removing a row that has a following row, focus moves to the following row&#x27;s legend. After removing the last row when others remain, focus moves to the previous row&#x27;s legend. After removing the only row, focus moves to the Add button. After undo, focus moves to the restored row&#x27;s first field. After adding a row, focus moves to the new row&#x27;s first field.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action</text>
  <text x="313.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus moves to</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">remove, a row follows</text>
  <text x="313.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">the next row&#x27;s legend</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">remove the last row</text>
  <text x="313.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">the previous row&#x27;s legend</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">remove the only row</text>
  <text x="313.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">the Add button</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">undo</text>
  <text x="313.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">the restored row&#x27;s first field</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">add</text>
  <text x="313.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">the new row&#x27;s first field</text>
</svg>

---

## Verification checklist

- [ ] Removing a row keeps focus inside the group on a sensible neighbour.
- [ ] The removal is announced once, naming the row, with undo available.
- [ ] The undo button has a specific accessible name and is reachable by Tab.
- [ ] Undo restores values, errors, touched state and position relative to neighbours.
- [ ] Undo after other rows were added or moved restores next to the original upper neighbour.
- [ ] Files attached to removed rows remain usable until the removal expires.
- [ ] Removals expire on submit or after the window, and are never submitted.
- [ ] Removing below the minimum shows the count message, and undo clears it.

---

## Frequently Asked Questions

<details>
<summary><strong>Is a confirmation dialog ever the better choice?</strong></summary>

When the deletion is immediately irreversible on the server and cannot be deferred — deleting a saved record with side effects — a confirmation naming exactly what will be lost is appropriate. For rows in an unsaved form, undo is almost always better.

</details>

<details>
<summary><strong>How long should the undo window be?</strong></summary>

Long enough to notice and reach the button without hurry: at least ten seconds, and many teams keep removals until the next submit. Short timeouts penalise users who navigate slowly, which is the population undo most needs to serve.

</details>

<details>
<summary><strong>Should Ctrl+Z trigger undo?</strong></summary>

Inside a text field, Ctrl+Z belongs to the browser's text undo; do not intercept it there. A group-level shortcut outside text fields is a nice addition for power users, but the visible Undo button is the accessible baseline.

</details>

---

## Related

- [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
- [Focusing Dynamically Added Fields](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focusing-dynamically-added-fields/)
- [Keyboard Reordering of Repeatable Rows](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-reordering-of-repeatable-rows/)

← [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
