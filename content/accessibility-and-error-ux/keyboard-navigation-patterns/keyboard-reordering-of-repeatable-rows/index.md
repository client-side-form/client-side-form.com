---
layout: page.njk
title: "Keyboard Reordering of Repeatable Rows"
description: "Let keyboard and screen-reader users reorder repeatable form rows: Move up and Move down buttons as the baseline, a grab-and-move keyboard mode as an enhancement, keeping focus on the moved row, announcing new positions, and pairing with drag-and-drop."
slug: keyboard-reordering-of-repeatable-rows
type: howto
breadcrumb: "Keyboard Reordering"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Keyboard Reordering of Repeatable Rows"
  parent: "Keyboard Navigation Patterns"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Keyboard Reordering of Repeatable Rows",
      "description": "Let keyboard and screen-reader users reorder repeatable form rows: Move up and Move down buttons as the baseline, a grab-and-move keyboard mode as an enhancement, keeping focus on the moved row, announcing new positions, and pairing with drag-and-drop.",
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
          "name": "Accessibility & Error UX for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Keyboard Navigation Patterns for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Keyboard Reordering of Repeatable Rows",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-reordering-of-repeatable-rows/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Make repeatable rows reorderable by keyboard",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give each row Move up and Move down buttons"
        },
        {
          "@type": "HowToStep",
          "name": "Swap by row id, not by index"
        },
        {
          "@type": "HowToStep",
          "name": "Refocus the pressed button after re-render"
        },
        {
          "@type": "HowToStep",
          "name": "Update legends with positions"
        },
        {
          "@type": "HowToStep",
          "name": "Announce each move politely"
        },
        {
          "@type": "HowToStep",
          "name": "Layer drag-and-drop on top"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is a \"Move to position\" select an alternative?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and it is efficient for long lists: a select or number input per row (\"Position: 2\") moves a row directly. It works well alongside Move up/down buttons; announce the result the same way."
          }
        },
        {
          "@type": "Question",
          "name": "Do drag-and-drop libraries handle keyboard access?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Some provide keyboard sensors and announcements (for example dnd-kit). Test them with keyboard and screen readers before relying on them, and keep visible move buttons for switch, voice and touch users who cannot use either drag or keyboard shortcuts."
          }
        },
        {
          "@type": "Question",
          "name": "Should reordering mark the form dirty?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If order is meaningful — itineraries, priorities — yes. If the collection is unordered, reordering should not count as a change; that is the list-versus-set decision in deep equality for dirty detection on nested values."
          }
        }
      ]
    }
  ]
}
</script>

# Keyboard Reordering of Repeatable Rows

Drag-and-drop is the usual way to reorder itinerary stops, priority lists and survey questions in a form — and for keyboard users, many switch and voice-control users, and screen-reader users, it is the only operation on the page they cannot perform at all.

WCAG 2.2's "Dragging Movements" criterion (2.5.7) requires a single-pointer alternative to dragging, and keyboard operability (2.1.1) requires the function to work from a keyboard. The simplest design satisfies both: explicit Move up and Move down buttons on each row. This page, part of [keyboard navigation patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/), builds those buttons with correct focus and announcements, then adds an optional keyboard "grab" mode for power users — on top of the identity model from [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/).

---

## Context and prerequisites

What reordering must preserve and communicate:

- **Identity** — rows move as units with their values, errors and state; keys are stable row ids, per [stable keys for reorderable field arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/).
- **Focus** — after moving, focus stays on the control the user pressed, in the row's new position, so repeated presses keep moving the same row.
- **Position** — each row's legend states its position ("Stop 2 of 5") so the new order is perceivable.
- **Announcement** — a polite message ("Paris moved to position 2 of 5") confirms the move without the user having to explore.

Three interaction models, in order of how universally they work:

1. **Move up / Move down buttons** — work for keyboard, screen readers, switch access, voice control and touch.
2. **Keyboard grab mode** — focus a handle, press Space to pick up, arrows to move, Space to drop, Escape to cancel. Faster for keyboard users; must be announced.
3. **Drag and drop** — pointer only; an enhancement layered on the other two.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of three row reordering models — move buttons, keyboard grab mode and drag and drop — with which users each works for and its role." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Reordering models and who they serve</title>
  <desc>Move up and Move down buttons work for keyboard, screen-reader, switch, voice-control and touch users and are the baseline. Keyboard grab mode works for keyboard and screen-reader users when announced, and is an enhancement for speed. Drag and drop works for mouse and some touch users only and must never be the sole method.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Model</text>
  <text x="206.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Works for</text>
  <text x="509.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Role</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Move up / Move down buttons</text>
  <text x="206.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">keyboard, SR, switch, voice, touch</text>
  <text x="509.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">baseline</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Keyboard grab (Space, arrows)</text>
  <text x="206.0" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">keyboard, SR (if announced)</text>
  <text x="509.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">enhancement</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Drag and drop</text>
  <text x="206.0" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">pointer users only</text>
  <text x="509.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">enhancement</text>
</svg>

---

## The core pattern: move buttons with focus retention and announcements

```tsx
import { useLayoutEffect, useRef, useState } from "react";

type Row = { id: string; place: string };

export function Itinerary({ initial, announce }: { initial: Row[]; announce: (m: string) => void }) {
  const [rows, setRows] = useState(initial);
  // Remember which button to refocus after the move re-renders the list.
  const refocus = useRef<{ id: string; dir: "up" | "down" } | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const move = (id: string, dir: "up" | "down") => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      announce(`${prev[i].place} moved to position ${j + 1} of ${prev.length}.`);
      refocus.current = { id, dir };
      return next;
    });
  };

  useLayoutEffect(() => {
    const r = refocus.current;
    if (!r) return;
    refocus.current = null;
    const same = buttons.current.get(`${r.id}:${r.dir}`);
    // At the top or bottom the pressed button becomes disabled; focus its sibling.
    const other = buttons.current.get(`${r.id}:${r.dir === "up" ? "down" : "up"}`);
    (same && !same.disabled ? same : other)?.focus();
  }, [rows]);

  const reg = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el); else buttons.current.delete(key);
  };

  return (
    <ol className="itinerary">
      {rows.map((r, i) => (
        <li key={r.id}>
          <fieldset>
            <legend>Stop {i + 1} of {rows.length}: {r.place}</legend>
            {/* …the row's fields… */}
            <button type="button" ref={reg(`${r.id}:up`)} disabled={i === 0} onClick={() => move(r.id, "up")}>
              Move up<span className="visually-hidden"> {r.place}</span>
            </button>
            <button type="button" ref={reg(`${r.id}:down`)} disabled={i === rows.length - 1} onClick={() => move(r.id, "down")}>
              Move down<span className="visually-hidden"> {r.place}</span>
            </button>
          </fieldset>
        </li>
      ))}
    </ol>
  );
}
```

---

## Step-by-step walkthrough

1. **Give each row Move up and Move down buttons.** Real `<button type="button">` elements, named with the row ("Move Paris up"), so voice-control users can say them and screen-reader users know which row they affect.
2. **Swap by row id, not by index.** State is keyed by id, so the row's values and errors move with it.
3. **Refocus the pressed button after re-render.** Its row has a new position; focusing the same button there lets users press repeatedly to keep moving. At the ends, move focus to the opposite button instead of leaving it on a disabled one.
4. **Update legends with positions.** "Stop 2 of 5: Paris" makes the order perceivable to everyone.
5. **Announce each move politely.** "Paris moved to position 2 of 5", through the page announcer from [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/) — key it by row so rapid presses announce only the final position.
6. **Layer drag-and-drop on top.** When a drag library reports `(from, to)`, translate to ids and reuse the same move-and-announce logic.

### Why disabled end buttons need care

Disabling "Move up" on the first row is correct — the action is impossible — but if focus is on that button when it becomes disabled (because the user just moved the row to the top), focus is lost to the document body in some browsers, and the user is dropped out of the list. Moving focus to the row's other move button keeps them in place, and the announcement tells them why. An alternative is to keep the buttons enabled and announce "Paris is already first" on press; either approach avoids losing focus, which is the failure that matters.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a keyboard user pressing Move up twice on the third row of an itinerary, with focus retained on the moved row&#x27;s button and announcements after each move." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Moving a row twice with the keyboard</title>
  <desc>Focus is on Move Paris up in stop three of five. The user presses Enter; Paris swaps with the row above, the list re-renders, and focus returns to Move Paris up now in stop two. The announcer says Paris moved to position 2 of 5. The user presses Enter again; Paris moves to position one, its Move up button becomes disabled, so focus moves to Move Paris down, and the announcer says Paris moved to position 1 of 5.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">List</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Announcer</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Enter on &quot;Move Paris up&quot; (stop 3)</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#2d6342" font-family="inherit">focus stays on Move Paris up (stop 2)</text>
  <path d="M340.0,97.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,93.0 123.7,97.0 130.7,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Paris moved to position 2 of 5.&quot;</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Enter again</text>
  <path d="M122.7,153.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,149.0 339.0,153.0 332.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">top: Move up disabled → focus Move down</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
  <text x="348.0" y="205.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Paris moved to position 1 of 5.&quot;</text>
  <path d="M340.0,209.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,205.0 556.3,209.0 549.3,213.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Drag-and-drop only

A list reorderable only by dragging fails WCAG 2.5.7 and 2.1.1. Buttons are the minimum; a drag library's built-in keyboard support is an enhancement to test, not a replacement.

### 2. Focus on the wrong row after re-render

Keying the list by index means the button at the old position keeps focus while the row moves away. Key by row id and refocus the moved row's button.

### 3. Announcements on every press in a burst

Pressing Move down five times quickly produces five announcements. Coalesce by row key so only the final position is spoken.

### 4. Grab mode without instructions

A keyboard grab mode (Space to lift, arrows to move) is invisible to users who do not know it. Announce instructions when the handle receives focus ("Press Space to reorder"), and announce each position change and the drop.

### 5. Errors after reordering

Server errors for rows are reported by index; translate them with the order that was submitted, per [keeping array errors aligned after reorder and delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards describing the states of an optional keyboard grab mode for reordering — resting with instructions, lifted, moving with arrow keys, and dropped or cancelled." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A keyboard grab mode, as an enhancement</title>
  <desc>At rest, the row&#x27;s handle is a focusable button whose description says press Space to reorder. Pressing Space lifts the row, announcing that Paris is lifted at position 3 of 5 and to use the arrow keys. Arrow keys move it, announcing each new position. Space drops it and announces the final position; Escape cancels and returns it to where it started.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rest</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Handle button.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Press Space to reorder.&quot;</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Lifted</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Space.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Paris lifted, position 3 of 5.&quot;</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Moving</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">↑ / ↓.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each position announced.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Drop / cancel</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Space: drop, announce.</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Escape: back to start.</text>
</svg>

---

## Verification checklist

- [ ] Every reorderable row has Move up and Move down buttons named with the row.
- [ ] Moving keeps focus on the moved row's control.
- [ ] At the ends, focus moves to an enabled button rather than being lost.
- [ ] Legends show each row's position out of the total.
- [ ] Each move is announced, and bursts announce only the final position.
- [ ] Row values, errors and state move with the row.
- [ ] Drag-and-drop, if present, is optional and uses the same move logic.
- [ ] Any grab mode announces instructions, positions, drop and cancel.

---

## Frequently Asked Questions

<details>
<summary><strong>Is a "Move to position" select an alternative?</strong></summary>

Yes, and it is efficient for long lists: a select or number input per row ("Position: 2") moves a row directly. It works well alongside Move up/down buttons; announce the result the same way.

</details>

<details>
<summary><strong>Do drag-and-drop libraries handle keyboard access?</strong></summary>

Some provide keyboard sensors and announcements (for example dnd-kit). Test them with keyboard and screen readers before relying on them, and keep visible move buttons for switch, voice and touch users who cannot use either drag or keyboard shortcuts.

</details>

<details>
<summary><strong>Should reordering mark the form dirty?</strong></summary>

If order is meaningful — itineraries, priorities — yes. If the collection is unordered, reordering should not count as a change; that is the list-versus-set decision in [deep equality for dirty detection on nested values](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/deep-equality-for-dirty-detection-on-nested-values/).

</details>

---

## Related

- [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
- [Undoing Row Deletion in Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/)
- [Dynamic FormArray Controls in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/dynamic-formarray-controls-in-angular/)

← [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
