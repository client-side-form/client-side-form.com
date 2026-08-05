---
layout: page.njk
title: "Building an Accessible Error Summary"
description: "A focusable, link-driven error summary that announces its count once, reveals collapsed targets before focusing them, and re-announces correctly on a second failed submit."
slug: building-an-accessible-error-summary
type: howto
breadcrumb: "Building an Accessible Error Summary"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Building an Accessible Error Summary"
  parent: "Error Summary and Messaging"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building an Accessible Error Summary",
      "description": "A focusable, link-driven error summary that announces its count once, reveals collapsed targets before focusing them, and re-announces correctly on a second failed submit.",
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
          "name": "Accessibility & Error UX for Forms",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Error Summary and Messaging",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Building an Accessible Error Summary",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build an error summary a keyboard and screen reader user can actually use",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Build entries in document order from the error map"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Skip the summary when there is only one error"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Put the count in the heading"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Render real links pointing at field ids"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Reveal collapsed targets before moving focus"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Focus the container after inserting it"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Change the heading text on each subsequent attempt"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why tabindex minus one rather than zero?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because minus one makes the container focusable programmatically without inserting it into the tab sequence. With zero, every reader tabbing through the page stops on the summary container on every pass, including before any error exists if the container is always present. Minus one gives you the focus target you need and costs nobody a keystroke."
          }
        },
        {
          "@type": "Question",
          "name": "Should the summary be re-focused on every failed submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and the heading text should change too. Re-focusing an element that already has focus does not re-announce in several screen readers, so a reader who fixes one problem and introduces another can be left with no feedback at all. Rewriting the heading — even just the count — gives the reader something new to hear."
          }
        },
        {
          "@type": "Question",
          "name": "What about an error that has no field to link to?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Include it, without a link, and word it so the reader knows what to do — 'Your session expired. Sign in again to continue.' Leaving it out makes the count disagree with the list and hides the actual reason the submit failed, which is the failure mode the summary exists to prevent."
          }
        }
      ]
    }
  ]
}
</script>

# Building an Accessible Error Summary

The exact problem: a form renders a list of errors above the fields after a failed submit, and a keyboard or screen-reader user never learns it exists — because nothing moved focus, nothing was announced, and the list is not reachable from where they are.

## Context and Prerequisites

This is the implementation of the summary described in [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/), and it assumes the branch rule from [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/): one error focuses that field, two or more render and focus the summary.

## Core Pattern

```typescript
interface SummaryEntry { fieldId: string; label: string; action: string; }

export function renderSummary(entries: SummaryEntry[], root: HTMLElement): HTMLElement | null {
  root.replaceChildren();
  if (entries.length < 2) return null;      // one problem goes straight to its field

  const box = document.createElement('div');
  box.className = 'error-summary';
  // Programmatically focusable, but NOT a tab stop: -1 keeps it out of the
  // sequence while letting focus() land on it.
  box.tabIndex = -1;
  box.id = 'error-summary';

  const h = document.createElement('h2');
  // The count goes in the heading because the heading is what a screen reader
  // announces first when focus lands — scope before detail.
  h.textContent = `There is a problem with ${entries.length} answers`;

  const list = document.createElement('ul');
  for (const e of entries) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${e.fieldId}`;
    a.textContent = `${e.label} — ${e.action}`;
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const field = document.getElementById(e.fieldId);
      if (!field) return;
      // Reveal first: a collapsed section or an unreached step must open before
      // focus can land, or focus() silently no-ops on a hidden element.
      revealAncestors(field);
      (field as HTMLElement).focus();
    });
    li.appendChild(a);
    list.appendChild(li);
  }

  box.append(h, list);
  root.appendChild(box);
  // Focus AFTER insertion, in the same task: focusing a detached node does nothing.
  box.focus();
  return box;
}
```

Two lines carry most of the accessibility. `tabIndex = -1` makes the container focusable without adding a tab stop — a summary in the tab sequence is an extra stop every reader passes through on every pass. And `box.focus()` after insertion is what announces it: the focus move causes the heading and the list to be read, which is why the container must not also be a live region.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ordered sequence after a failed submit with three errors: render the summary, move focus to it, the screen reader announces the heading and count, the reader activates an entry, the target section is revealed, and focus moves to the field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Six steps from a failed submit to the reader editing the right field</title>
  <desc>The submit handler counts three errors and renders the summary into the document. Focus is then moved to the summary container, which is programmatically focusable but not a tab stop. The focus move causes the screen reader to announce the heading, which contains the count, followed by the list. The reader activates an entry. Any collapsed section or unreached step containing the target field is revealed first, because focus cannot land on a hidden element. Finally focus moves to the field itself, which carries aria-invalid and its own message.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <rect x="14" y="36" width="150" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · render</text>
  <text x="89" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">3 errors, so a</text>
  <text x="89" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">summary is built</text>
  <path d="M164,69 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="36" width="150" height="66" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · focus it</text>
  <text x="261" y="76" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">after insertion,</text>
  <text x="261" y="90" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">same task</text>
  <path d="M336,69 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="36" width="150" height="66" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="433" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">3 · announced</text>
  <text x="433" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">heading, count,</text>
  <text x="433" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">then the list</text>
  <path d="M508,69 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="36" width="146" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="603" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">4 · reader picks</text>
  <text x="603" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">one entry, with</text>
  <text x="603" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">Enter or a click</text>
  <rect x="186" y="126" width="222" height="60" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="297" y="148" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">5 · reveal the target</text>
  <text x="297" y="168" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">open the section, or go to the step</text>
  <path d="M408,156 H430" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="430" y="126" width="222" height="60" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="541" y="148" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">6 · focus the field</text>
  <text x="541" y="168" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid, message, caret ready</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Step 5 is the one usually missing: focus() on a hidden element does nothing and returns nothing, so the entry looks broken.</text>
</svg>

## Step-by-Step Walkthrough

1. **Build entries in document order.** The list should read in the same direction the form does.

2. **Skip the summary for a single error.** Focus that field instead; a list of one is a detour.

3. **Put the count in the heading.** It is the first thing announced when focus lands, and it is the answer to the reader's first question.

4. **Use real links.** An `<a href="#id">` is keyboard-operable, announced as a link, and works without JavaScript if the ids match.

5. **Reveal before focusing.** Open collapsed sections and navigate to the owning wizard step first, or `focus()` no-ops silently.

6. **Re-render on each attempt.** Replace the container's contents and re-focus, and change the heading text so the second announcement is distinguishable from the first.

Before the edge cases, the markup decisions worth defending in review:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The container is a div with tabindex minus one rather than a section with a role, because it needs to be focusable but not a landmark competing with the form. The heading is a real h2 so it appears in the heading outline a screen reader user navigates by. The list is a real ul so the reader is told how many items there are before hearing any of them. Each entry is a real anchor with an href so it is keyboard-operable and announced as a link without any ARIA at all." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Why each element is what it is</title>
  <desc>The container is a div with tabindex minus one rather than a section with a role, because it needs to be focusable but not a landmark competing with the form. The heading is a real h2 so it appears in the heading outline a screen reader user navigates by. The list is a real ul so the reader is told how many items there are before hearing any of them. Each entry is a real anchor with an href so it is keyboard-operable and announced as a link without any ARIA at all.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Element</text>
  <text x="210" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why not something else</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">div with tabindex="-1"</text>
  <text x="210" y="66" font-size="10" fill="#6b5f75" font-family="inherit">focusable, but not a landmark competing with the form</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">a real h2</text>
  <text x="210" y="100" font-size="10" fill="#6b5f75" font-family="inherit">appears in the heading outline readers navigate by</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">a real ul</text>
  <text x="210" y="134" font-size="10" fill="#6b5f75" font-family="inherit">announces the item count before the items</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">a real a with href</text>
  <text x="210" y="168" font-size="10" fill="#6b5f75" font-family="inherit">keyboard-operable and announced as a link, with no ARIA</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Every one of these is the boring choice, and every one removes a line of ARIA that could have been wrong.</text>
</svg>

## Failure Modes and Edge Cases

### 1. Focusing a node that is not in the document yet

`focus()` on a detached element does nothing. Insert, then focus, in the same task — not in a `setTimeout`, which lets a render cycle move focus somewhere else first.

### 2. The second submit announces nothing

Re-focusing an element that already has focus does not re-announce in several screen readers. Changing the heading text between attempts gives them something new to read.

### 3. The link jumps under a sticky header

`href="#id"` scrolls the target flush to the viewport edge. `scroll-margin-top` on the field fixes it in one declaration, without any scroll arithmetic.

### 4. An entry for a field that is not rendered

A server error naming a field the form does not show still belongs in the summary — with no link, and with wording that says what the reader can do instead. Omitting it makes the count wrong and the failure invisible.

### 5. The summary is styled but not semantic

A `<div>` of `<div>`s with click handlers is not a list of links. Screen readers announce "list, 3 items" for a real list, which is part of the scope information the summary exists to give.

And the four ways a summary manages to be announced twice:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A container that is both a live region and a focus target is announced by the region and again by the move. A summary rendered while the field messages are also being written into their own live region produces two utterances of the same sentence. Re-rendering the summary while it has focus can re-announce it in some screen readers. And a visually hidden duplicate of the summary, added for a screen reader, is announced alongside the visible one. Each has the same fix: exactly one thing announces each message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four sources of a duplicate announcement</title>
  <desc>A container that is both a live region and a focus target is announced by the region and again by the move. A summary rendered while the field messages are also being written into their own live region produces two utterances of the same sentence. Re-rendering the summary while it has focus can re-announce it in some screen readers. And a visually hidden duplicate of the summary, added for a screen reader, is announced alongside the visible one. Each has the same fix: exactly one thing announces each message.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cause</text>
  <text x="300" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Fix</text>
  <text x="24" y="66" font-size="10" fill="#a63d6f" font-family="inherit">the container is also a live region</text>
  <text x="300" y="66" font-size="10" fill="#2d6342" font-family="inherit">remove the region; keep the focus move</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#a63d6f" font-family="inherit">field messages also write a live region</text>
  <text x="300" y="100" font-size="10" fill="#2d6342" font-family="inherit">clear the field region when the summary appears</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#a63d6f" font-family="inherit">re-rendering while focused</text>
  <text x="300" y="134" font-size="10" fill="#2d6342" font-family="inherit">update text in place rather than replacing the node</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#a63d6f" font-family="inherit">a hidden duplicate "for screen readers"</text>
  <text x="300" y="168" font-size="10" fill="#2d6342" font-family="inherit">delete it — the visible one is already announced</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">The rule underneath all four: exactly one thing announces each message, and a focus move counts as announcing.</text>
</svg>

## Verification Checklist

- [ ] After a failed submit with two errors, `document.activeElement` is the summary
- [ ] The heading contains a number equal to the number of list items
- [ ] The summary is not in the tab sequence before a failed submit
- [ ] Activating an entry moves focus to an element with `aria-invalid="true"`
- [ ] An entry targeting a collapsed section opens it before focusing
- [ ] A second failed submit re-announces, with a heading that changed
- [ ] Nothing is announced twice — the container is not also a live region
- [ ] The summary is a real `<ul>` of real `<a>` elements

## Common Pitfalls

- **Rendering the summary but never focusing it.** Sighted readers see it appear; keyboard and screen-reader users get no indication it exists, and continue from wherever they were. The focus move is what makes it a summary rather than a decoration.
- **Focusing the heading instead of the container.** Focus on an `h2` announces the heading and stops. Focus on the container announces the heading and then the list, which is the scope information the reader wanted.
- **Building entries from `Object.keys(errors)`.** Field names are not labels. `billingAddress.postCode` in a summary is a string the reader has never seen and cannot map to anything on screen.
- **Leaving the container in the DOM when empty.** An always-present container that is empty most of the time is still a focus target and can still be reached by a stray focus call. Remove it, or render it only when there is something to say.

---

**Related**

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/) — where the summary fits in the error model
- [Writing Error Messages That Tell the Reader What to Do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/) — the copy inside each entry
- [Moving Focus to the First Invalid Field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/) — the single-error branch

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)

## Frequently Asked Questions

<details>
<summary><strong>Why tabindex minus one rather than zero?</strong></summary>

Because minus one makes the container focusable programmatically without inserting it into the tab sequence. With zero, every reader tabbing through the page stops on the summary container on every pass, including before any error exists if the container is always present. Minus one gives you the focus target you need and costs nobody a keystroke.

</details>

<details>
<summary><strong>Should the summary be re-focused on every failed submit?</strong></summary>

Yes, and the heading text should change too. Re-focusing an element that already has focus does not re-announce in several screen readers, so a reader who fixes one problem and introduces another can be left with no feedback at all. Rewriting the heading — even just the count — gives the reader something new to hear.

</details>

<details>
<summary><strong>What about an error that has no field to link to?</strong></summary>

Include it, without a link, and word it so the reader knows what to do — 'Your session expired. Sign in again to continue.' Leaving it out makes the count disagree with the list and hides the actual reason the submit failed, which is the failure mode the summary exists to prevent.

</details>

