---
layout: page.njk
title: "Focusing Dynamically Added Fields"
description: "When an answer reveals new fields, a row is added or an 'Other' box appears, decide whether focus should move: rules for revealed follow-up questions, added rows and error-driven reveals, timing focus after render in React, Vue and Svelte, and announcing what appeared."
slug: focusing-dynamically-added-fields
type: howto
breadcrumb: "Focus on New Fields"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Focusing Dynamically Added Fields"
  parent: "Focus Management After Validation"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Focusing Dynamically Added Fields",
      "description": "When an answer reveals new fields, a row is added or an 'Other' box appears, decide whether focus should move: rules for revealed follow-up questions, added rows and error-driven reveals, timing focus after render in React, Vue and Svelte, and announcing what appeared.",
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
          "name": "Focus Management After Validation",
          "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Focusing Dynamically Added Fields",
          "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focusing-dynamically-added-fields/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Manage focus when form fields are added dynamically",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Classify the trigger"
        },
        {
          "@type": "HowToStep",
          "name": "Place new content right after its trigger in DOM order"
        },
        {
          "@type": "HowToStep",
          "name": "Focus after render"
        },
        {
          "@type": "HowToStep",
          "name": "Announce additions"
        },
        {
          "@type": "HowToStep",
          "name": "Expose reveal relationships"
        },
        {
          "@type": "HowToStep",
          "name": "Label new groups with their position"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the \"Please specify\" field be required when revealed?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only if you genuinely need the detail. If it is required, say so in its label and validate it only when relevant; an optional \"Tell us more\" is kinder and avoids trapping users who picked \"Other\" for lack of a better option."
          }
        },
        {
          "@type": "Question",
          "name": "Is autofocus on the new field acceptable?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The autofocus attribute only applies on page load or dialog open; it does not fire for elements inserted later. Focus programmatically after render instead."
          }
        },
        {
          "@type": "Question",
          "name": "What about content that appears after an async load?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If the user triggered the load (pressing \"Find address\"), move focus to the results or announce them when they arrive. If it loads by itself, do not move focus; announce politely if it matters."
          }
        }
      ]
    }
  ]
}
</script>

# Focusing Dynamically Added Fields

When selecting "Other" reveals a text box, or pressing "Add another address" inserts a new group of fields, sighted users see the change instantly — but keyboard and screen-reader users are left where they were, with no signal that anything appeared, and often discover the new fields only when an error sends them back.

The opposite mistake is just as common: moving focus every time *anything* appears, so choosing a radio option yanks focus into a follow-up field the user was not ready for. This page, part of [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/), sets out when focus should move, when it should stay and be announced instead, and how to time the move so the new element exists when you focus it.

---

## Context and prerequisites

Three kinds of dynamic field, with different rules:

- **Revealed follow-up questions** — choosing "Other" shows "Please specify"; ticking "Different billing address" shows an address block. The user is still interacting with the triggering control (arrowing through radios, perhaps). **Do not move focus.** Place the new content immediately after the trigger in DOM order so the next Tab reaches it, and make its appearance perceivable.
- **User-requested additions** — pressing "Add another item" or "Add a contact". The user asked for new fields and wants to fill them. **Move focus** to the first new field.
- **Error-driven reveals** — a submit fails because a field inside a collapsed section is invalid. **Reveal, then focus**, via the error summary or first-invalid-field logic.

In every case, the new content must come *after* the trigger in the DOM, so sequential navigation finds it without searching.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of dynamic field situations with whether focus should move, where it should go, and what else should happen." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Should focus move?</title>
  <desc>When choosing Other reveals a text field, focus should not move; the field is placed right after the options and the reveal is indicated by aria-expanded or a hint. When a checkbox reveals a billing address block, focus should not move; the block follows the checkbox in DOM order. When the user presses Add another item, focus should move to the new row&#x27;s first field and the addition should be announced. When a failed submit reveals a collapsed section, the section is expanded and focus moves to the invalid field through the error summary.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Situation</text>
  <text x="261.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Move focus?</text>
  <text x="394.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Where / what else</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;Other&quot; reveals a text box</text>
  <text x="261.1" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="394.5" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">next in DOM order; hint or aria-controls</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">checkbox reveals address block</text>
  <text x="261.1" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="394.5" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">block directly after the checkbox</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;Add another item&quot;</text>
  <text x="261.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="394.5" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">new row&#x27;s first field; announce</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">submit fails inside collapsed section</text>
  <text x="261.1" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="394.5" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expand, then focus the field</text>
</svg>

---

## The core pattern: focus after the DOM exists, only when requested

```tsx
import { useEffect, useRef, useState } from "react";

// 1) User-requested addition: focus the new row's first field AFTER it renders.
export function useFocusNewRow<T extends { id: string }>(rows: T[]) {
  const pendingFocus = useRef<string | null>(null);
  const firstFieldRefs = useRef(new Map<string, HTMLInputElement>());

  // Runs after commit, so the new input exists in the DOM.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    firstFieldRefs.current.get(id)?.focus();
  }, [rows]);

  return {
    requestFocus: (id: string) => { pendingFocus.current = id; },
    registerFirstField: (id: string) => (el: HTMLInputElement | null) => {
      if (el) firstFieldRefs.current.set(id, el); else firstFieldRefs.current.delete(id);
    },
  };
}

// 2) Revealed follow-up: no focus move; expose the relationship.
export function OtherReason() {
  const [reason, setReason] = useState("");
  return (
    <fieldset>
      <legend>Why are you cancelling?</legend>
      {["Too expensive", "Missing features", "Other"].map((r) => (
        <div key={r}>
          <input type="radio" id={`r-${r}`} name="reason" value={r}
                 checked={reason === r} onChange={() => setReason(r)}
                 aria-controls={r === "Other" ? "other-detail" : undefined}
                 aria-expanded={r === "Other" ? reason === "Other" : undefined} />
          <label htmlFor={`r-${r}`}>{r}</label>
        </div>
      ))}
      {/* Immediately after the options in DOM order: the next Tab reaches it. */}
      {reason === "Other" && (
        <div id="other-detail">
          <label htmlFor="other-text">Tell us more (optional)</label>
          <input id="other-text" name="otherText" />
        </div>
      )}
    </fieldset>
  );
}
```

In Vue, move focus in `nextTick()` after the state change (or in an `onUpdated` guarded by a pending flag); in Svelte, `await tick()` before calling `focus()`. The rule is the same everywhere: change state, wait for the framework to render, then focus.

---

## Step-by-step walkthrough

1. **Classify the trigger.** Did the user ask for new fields (move focus), or did an answer reveal a follow-up (do not move)?
2. **Place new content right after its trigger in DOM order.** Visual placement elsewhere (a side panel) breaks sequential navigation; keep DOM order and reading order aligned.
3. **Focus after render.** Record the intent in the event handler, and perform the focus in an effect, `nextTick` or `tick` — focusing an element that does not exist yet silently fails.
4. **Announce additions.** "Item 3 added" through the page announcer, so the change is confirmed even though focus moved — see [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/).
5. **Expose reveal relationships.** `aria-controls` and `aria-expanded` on disclosure-like triggers (checkboxes that show sections) tell assistive technology that more content is available.
6. **Label new groups with their position.** "Item 3 of 3" in a legend lets users confirm where they are after focus moves, as in [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/).

### Why revealed questions should not steal focus

A radio group is operated with arrow keys, and arrowing *selects*. A keyboard user comparing options by arrowing past "Other" would, with an auto-focus rule, be thrown into the "Please specify" box every time they pass it — and arrowing further would then edit text instead of changing the selection. Even with a mouse, pulling focus away as soon as something is clicked prevents users from changing their minds. Leaving focus on the trigger and placing the follow-up next in order respects the user's pace: they reach the new field with one Tab when they are ready.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a keyboard user pressing Add another item, the component recording a pending focus, the framework rendering the new row, the effect focusing its first field and the announcer confirming the addition." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Adding a row, with focus and announcement</title>
  <desc>The user presses Add another item. The click handler adds a row with a new id to state and records that the new row&#x27;s first field should receive focus. The framework renders the new row. After the commit, the effect finds the pending id and focuses the new row&#x27;s description field. The announcer says item 3 added after a short pause, and the screen reader reads the new field&#x27;s label and the legend item 3 of 3.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Handler</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Framework</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Announcer</text>
  <path d="M95.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Add another item</text>
  <path d="M95.5,69.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,65.0 257.5,69.0 250.5,73.0" fill="#7b4f8a"/>
  <text x="266.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">rows += new; pendingFocus = id</text>
  <path d="M258.5,97.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,93.0 420.5,97.0 413.5,101.0" fill="#7b4f8a"/>
  <text x="266.5" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">committed: effect runs</text>
  <path d="M421.5,125.0 H266.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="266.5,121.0 259.5,125.0 266.5,129.0" fill="#7b4f8a"/>
  <text x="103.5" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">focus → new row&#x27;s first field</text>
  <path d="M258.5,153.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,149.0 96.5,153.0 103.5,157.0" fill="#7b4f8a"/>
  <text x="266.5" y="177.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">&quot;Item 3 added&quot;</text>
  <path d="M258.5,181.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,177.0 583.5,181.0 576.5,185.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Focusing too early

Calling `focus()` in the click handler, before the re-render, targets nothing (or the previous row). Always focus after the framework has committed the DOM.

### 2. Content inserted before the trigger

Rows added at the *top* of a list, or follow-up questions rendered above their trigger, are skipped by Tab and read out of order. Insert after the trigger, or move focus explicitly when order cannot be changed.

### 3. Animation delays

If new content animates in (height from 0), focusing during the animation can scroll oddly or fail on `display: none` stages. Focus when the element is focusable (not hidden), and respect `prefers-reduced-motion` to skip the animation.

### 4. Hidden then invalid

A revealed field that becomes invalid and then is hidden again by another answer must not keep blocking submit. Apply relevance rules, per [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/).

### 5. Scroll position on mobile

Focusing a newly added field scrolls it into view, but on mobile the on-screen keyboard can cover it. Ensure `scroll-margin` accounts for sticky headers and footers, as in [scrolling invalid fields into view under sticky headers](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/scrolling-invalid-fields-into-view-under-sticky-headers/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing where dynamically added content should be placed in the DOM relative to its trigger and why." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Placement rules for new content</title>
  <desc>A revealed follow-up belongs immediately after its trigger control, so the next Tab reaches it. A new repeatable row belongs at the end of the list, just before the Add button, so focus moves forward. A revealed section in response to an error belongs where it already was, expanded in place, so the error summary link lands in the right context.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Follow-up question</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Right after the trigger.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus stays; next Tab reaches it.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">New row</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">End of the list, before Add.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus moves into it.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Error reveal</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Expanded in place.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Summary link focuses the field.</text>
</svg>

---

## Verification checklist

- [ ] Choosing an option that reveals a follow-up does not move focus.
- [ ] The follow-up is the next Tab stop after the trigger.
- [ ] Pressing "Add another…" focuses the new row's first field.
- [ ] Additions are announced once.
- [ ] Focus calls happen after the framework renders the new element.
- [ ] Reveal triggers expose `aria-controls` and `aria-expanded` where appropriate.
- [ ] New rows have legends with their position.
- [ ] Focused new fields are visible above sticky UI and the mobile keyboard.

---

## Frequently Asked Questions

<details>
<summary><strong>Should the "Please specify" field be required when revealed?</strong></summary>

Only if you genuinely need the detail. If it is required, say so in its label and validate it only when relevant; an optional "Tell us more" is kinder and avoids trapping users who picked "Other" for lack of a better option.

</details>

<details>
<summary><strong>Is autofocus on the new field acceptable?</strong></summary>

The `autofocus` attribute only applies on page load or dialog open; it does not fire for elements inserted later. Focus programmatically after render instead.

</details>

<details>
<summary><strong>What about content that appears after an async load?</strong></summary>

If the user triggered the load (pressing "Find address"), move focus to the results or announce them when they arrive. If it loads by itself, do not move focus; announce politely if it matters.

</details>

---

## Related

- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
- [Undoing Row Deletion in Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/)
- [Focus Management in Multi-Step Wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/)

← [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
