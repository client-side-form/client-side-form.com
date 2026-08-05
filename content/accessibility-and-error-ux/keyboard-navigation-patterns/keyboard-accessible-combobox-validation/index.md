---
layout: page.njk
title: "Keyboard-Accessible Combobox Validation"
description: "A combobox is three elements and only one is the control — where the validation attributes go, and how Enter, Escape and Tab must behave so choosing an option never submits the form."
slug: keyboard-accessible-combobox-validation
type: howto
breadcrumb: "Keyboard-Accessible Combobox Validation"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Keyboard-Accessible Combobox Validation"
  parent: "Keyboard Navigation Patterns"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Keyboard-Accessible Combobox Validation",
      "description": "A combobox is three elements and only one is the control — where the validation attributes go, and how Enter, Escape and Tab must behave so choosing an option never submits the form.",
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
          "name": "Keyboard Navigation Patterns",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Keyboard-Accessible Combobox Validation",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-accessible-combobox-validation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate a custom combobox accessibly",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Put validation attributes on the role=combobox element"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Commit on Enter when open and never submit"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Let Enter submit when the popup is closed"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Close on Escape without clearing the message"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Never trap Tab"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Reset the active descendant whenever the list changes"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Decide what an unmatched query submits as"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where exactly does aria-invalid go on a combobox?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On the element carrying role=\"combobox\", which in the current pattern is the text input. That is what takes focus and what a screen reader describes, so it is the only place where the state is announced. The wrapper div is a layout element with no role, and attributes on it are read by nothing — which is why the bug presents as a message that is plainly visible and completely silent."
          }
        },
        {
          "@type": "Question",
          "name": "Should Enter submit the form when the popup is open?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. The reader is choosing an option, and Enter is how they choose it, so preventDefault and commit. When the popup is closed, let Enter through to the form as it would from any other input. Getting this backwards produces the worst version of the bug: the form submits without the reader's choice, because the value they were about to commit was never committed."
          }
        },
        {
          "@type": "Question",
          "name": "What should happen to a typed query that matches nothing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Decide explicitly and document it. Treating it as empty is usually right for a combobox backed by a fixed list — the required rule then fires and the reader is told to choose from the list. Auto-committing a single remaining match is reasonable where the list is long and the reader has clearly narrowed it. What is never right is submitting the query string as if it were a chosen identifier, which produces a server error about a value the reader never selected."
          }
        }
      ]
    }
  ]
}
</script>

# Keyboard-Accessible Combobox Validation

The exact problem: a custom combobox is fully keyboard-operable and completely unusable when it fails validation — the error is attached to a wrapper the screen reader never reads, and pressing Escape to dismiss the popup also dismisses the message.

## Context and Prerequisites

The keyboard contract itself is in [keyboard navigation patterns for forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/). This page covers the part that is specific to validation: where the error attaches on a composite widget, and how the popup's own key handling has to coexist with the form's.

## The Anatomy That Decides Everything

A combobox is three elements pretending to be one, and only one of them is the form control:

```html
<!-- The wrapper is a layout element. It is NOT the control, and attaching
     validation state to it means nothing is announced. -->
<div class="combobox">
  <label id="country-label" for="country">Country</label>
  <!-- THIS is the control: it carries role, value, state and description. -->
  <input id="country" role="combobox" type="text"
         aria-expanded="false" aria-controls="country-list"
         aria-activedescendant=""
         aria-invalid="true" aria-describedby="country-error" aria-autocomplete="list">
  <ul id="country-list" role="listbox" aria-labelledby="country-label" hidden>
    <li id="country-opt-1" role="option" aria-selected="false">United Kingdom</li>
  </ul>
  <p id="country-error">Choose a country from the list</p>
</div>
```

`aria-invalid` and `aria-describedby` go on the element with `role="combobox"` — the input — because that is what receives focus and what a screen reader announces. On the wrapper they are announced by nothing.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three parts of a combobox and what each owns: the wrapper owns layout only, the input owns role, value, expanded state, active descendant and all validation attributes, and the listbox owns the options." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Only one of the three elements is the form control</title>
  <desc>The wrapper div owns layout and nothing else — no role, no state, and crucially no validation attributes, because nothing announces it. The input carries role combobox, the current value, the expanded state, the active descendant pointer, and both aria-invalid and aria-describedby; it is the element that receives focus and the element a screen reader describes. The listbox owns the options and its own labelling, and it is referenced by the input rather than describing it. Attaching validation to the wrapper is the commonest mistake and produces a message that is visible and never announced.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="14" y="26" width="212" height="182" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the wrapper</text>
  <text x="28" y="70" font-size="9.5" fill="#6b5f75" font-family="inherit">layout only</text>
  <text x="28" y="92" font-size="9.5" fill="#a63d6f" font-family="inherit">no role</text>
  <text x="28" y="114" font-size="9.5" fill="#a63d6f" font-family="inherit">no aria-invalid</text>
  <text x="28" y="136" font-size="9.5" fill="#a63d6f" font-family="inherit">no aria-describedby</text>
  <text x="28" y="166" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing announces it,</text>
  <text x="28" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">so nothing on it is heard</text>
  <rect x="238" y="26" width="212" height="182" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="252" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the input — the control</text>
  <text x="252" y="70" font-size="9.5" fill="#1e1a24" font-family="inherit">role="combobox"</text>
  <text x="252" y="92" font-size="9.5" fill="#1e1a24" font-family="inherit">aria-expanded</text>
  <text x="252" y="114" font-size="9.5" fill="#1e1a24" font-family="inherit">aria-activedescendant</text>
  <text x="252" y="136" font-size="9.5" fill="#2d6342" font-family="inherit">aria-invalid</text>
  <text x="252" y="158" font-size="9.5" fill="#2d6342" font-family="inherit">aria-describedby</text>
  <text x="252" y="188" font-size="9.5" fill="#6b5f75" font-family="inherit">focus lands here; so does the query</text>
  <rect x="462" y="26" width="214" height="182" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="476" y="48" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the listbox</text>
  <text x="476" y="70" font-size="9.5" fill="#6b5f75" font-family="inherit">role="listbox"</text>
  <text x="476" y="92" font-size="9.5" fill="#6b5f75" font-family="inherit">options with ids</text>
  <text x="476" y="114" font-size="9.5" fill="#6b5f75" font-family="inherit">labelled by the same label</text>
  <text x="476" y="136" font-size="9.5" fill="#6b5f75" font-family="inherit">never focused itself</text>
  <text x="476" y="166" font-size="9.5" fill="#6b5f75" font-family="inherit">referenced BY the input,</text>
  <text x="476" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">it does not describe it</text>
</svg>

## Key Handling That Coexists with the Form

```typescript
input.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      // Owned by the widget: move the active option and preventDefault so the
      // page does not scroll underneath the popup.
      e.preventDefault();
      moveActive(e.key === 'ArrowDown' ? 1 : -1);
      break;
    case 'Enter':
      if (isOpen()) {
        // Commit the highlighted option. preventDefault so this Enter does NOT
        // also submit the form — the reader was choosing, not submitting.
        e.preventDefault();
        commitActive();
      }
      // When closed, Enter falls through and submits, which is correct.
      break;
    case 'Escape':
      if (isOpen()) {
        // Close and restore the typed value. Do NOT clear the validation
        // message: Escape dismisses the popup, not the form's judgement.
        e.preventDefault();
        close({ restoreTypedValue: true });
      }
      break;
    case 'Tab':
      // Never trap Tab in a combobox. Close, commit nothing, and let focus go.
      if (isOpen()) close({ restoreTypedValue: true });
      break;
  }
});
```

The `Enter` branch is the one that causes real damage when it is wrong. An open combobox that lets `Enter` reach the form submits it while the reader was choosing an option — and because the value had not been committed, it submits without their choice.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Arrow keys are always handled by the widget and always prevent default, so the page does not scroll behind an open popup. Enter is handled only when the popup is open, where it commits; when closed it is let through and submits the form. Escape is handled only when open, where it closes and restores the typed value; when closed it is let through, so a surrounding dialog can close. Tab is never handled: the popup closes and focus leaves." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When each key is handled, and when it is let through</title>
  <desc>Arrow keys are always handled by the widget and always prevent default, so the page does not scroll behind an open popup. Enter is handled only when the popup is open, where it commits; when closed it is let through and submits the form. Escape is handled only when open, where it closes and restores the typed value; when closed it is let through, so a surrounding dialog can close. Tab is never handled: the popup closes and focus leaves.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Key</text>
  <text x="160" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Popup open</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Popup closed</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">Arrow up/down</text>
  <text x="160" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">move the active option</text>
  <text x="400" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">open the popup</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">Enter</text>
  <text x="160" y="100" font-size="10" fill="#2d6342" font-family="inherit">commit — never submit</text>
  <text x="400" y="100" font-size="10" fill="#2d6342" font-family="inherit">let through — submits</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">Escape</text>
  <text x="160" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">close, restore typed value</text>
  <text x="400" y="134" font-size="10" fill="#6b5f75" font-family="inherit">let through — a dialog may close</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">Tab</text>
  <text x="160" y="168" font-size="10" fill="#2d6342" font-family="inherit">close, then let through</text>
  <text x="400" y="168" font-size="10" fill="#2d6342" font-family="inherit">let through</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Two of these eight cells are the ones that break forms: Enter submitting while open, and Tab being trapped.</text>
</svg>

## Failure Modes and Edge Cases

### 1. Validation fires while the popup is open

The reader is mid-selection and a message appears under the popup, moving the page. Validate on close or on blur, not on each keystroke of the query.

### 2. The message is hidden behind the popup

A message rendered directly below an input that also renders a popup below it will be covered. Reserve the space, or render the popup above when there is a message.

### 3. `aria-activedescendant` points at a removed option

Filtering the list removes options. Reset the active descendant whenever the list changes, or the reader hears nothing on the next arrow press.

### 4. The typed value is not the committed value

A reader who types "Unit" and tabs away without choosing has a query, not a selection. Decide explicitly: either treat it as empty and let the required rule fire, or auto-commit the single match — and never submit a query string as if it were a chosen id.

### 5. Escape clearing the error

Escape closes the popup. It has nothing to say about the form's validation state, and clearing the message on it removes the only explanation of why the field is red.

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The query is what the reader has typed into the input; it is a filter, it changes on every keystroke, and it is not a value. The selection is the option they committed; it has an identifier, it changes only on commit, and it is what the form submits. Treating the query as the selection means submitting whatever was typed, which produces a server error about a value the reader never chose. Treating the selection as the query means the input cannot be typed in at all." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two things that must never be confused</title>
  <desc>The query is what the reader has typed into the input; it is a filter, it changes on every keystroke, and it is not a value. The selection is the option they committed; it has an identifier, it changes only on commit, and it is what the form submits. Treating the query as the selection means submitting whatever was typed, which produces a server error about a value the reader never chose. Treating the selection as the query means the input cannot be typed in at all.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#6b5f75" font-family="inherit">the query</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">what has been typed</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">a filter, not a value</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">changes on every keystroke</text>
  <text x="28" y="128" font-size="10" fill="#a63d6f" font-family="inherit">never submitted</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">the selection</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">the committed option</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">has an identifier</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">changes only on commit</text>
  <text x="366" y="128" font-size="10" fill="#2d6342" font-family="inherit">this is what submits</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">A combobox holds both at once, and the required rule is about the selection — never about whether the input looks filled.</text>
</svg>

## Verification Checklist

- [ ] `aria-invalid` and `aria-describedby` are on the `role="combobox"` element
- [ ] `Enter` with the popup open does not submit the form
- [ ] `Enter` with the popup closed does submit
- [ ] `Escape` closes the popup and leaves the error message alone
- [ ] `Tab` is never trapped
- [ ] Arrow keys do not scroll the page
- [ ] `aria-activedescendant` is cleared when the list changes
- [ ] A typed query that matches nothing is not submitted as a value
- [ ] The message is not covered by the popup

## Common Pitfalls

- **Putting the validation attributes on the wrapper.** The wrapper has no role and is never announced, so the message is visible and completely silent. They belong on the element carrying `role="combobox"`.
- **Letting `Enter` submit while the popup is open.** The reader was choosing an option, and the form submits without their choice — because the value they were about to commit was never committed.
- **Clearing the error on `Escape`.** Escape closes the popup. It has nothing to say about whether the field passed validation, and clearing the message removes the only explanation of why the field is marked.
- **Leaving `aria-activedescendant` pointing at a filtered-out option.** The reader presses an arrow key and hears nothing, because the id no longer resolves. Reset it whenever the option list changes.
- **Submitting the query string as the value.** A reader who typed "Unit" and tabbed away has a filter, not a selection. Submitting it produces a server error about a value they never chose.

---

**Related**

- [Keyboard Navigation Patterns for Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/) — the full key contract
- [Wiring aria-describedby for Multiple Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/) — attaching the message
- [Roving tabindex for Radio and Checkbox Groups](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/) — the other composite widget

← [Keyboard Navigation Patterns for Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)

## Frequently Asked Questions

<details>
<summary><strong>Where exactly does aria-invalid go on a combobox?</strong></summary>

On the element carrying role="combobox", which in the current pattern is the text input. That is what takes focus and what a screen reader describes, so it is the only place where the state is announced. The wrapper div is a layout element with no role, and attributes on it are read by nothing — which is why the bug presents as a message that is plainly visible and completely silent.

</details>

<details>
<summary><strong>Should Enter submit the form when the popup is open?</strong></summary>

No. The reader is choosing an option, and Enter is how they choose it, so preventDefault and commit. When the popup is closed, let Enter through to the form as it would from any other input. Getting this backwards produces the worst version of the bug: the form submits without the reader's choice, because the value they were about to commit was never committed.

</details>

<details>
<summary><strong>What should happen to a typed query that matches nothing?</strong></summary>

Decide explicitly and document it. Treating it as empty is usually right for a combobox backed by a fixed list — the required rule then fires and the reader is told to choose from the list. Auto-committing a single remaining match is reasonable where the list is long and the reader has clearly narrowed it. What is never right is submitting the query string as if it were a chosen identifier, which produces a server error about a value the reader never selected.

</details>

