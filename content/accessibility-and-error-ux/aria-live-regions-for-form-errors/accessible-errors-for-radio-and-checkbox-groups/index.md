---
layout: page.njk
title: "Accessible Errors for Radio and Checkbox Groups"
description: "Attach validation errors to radio and checkbox groups so every user hears them: fieldset and legend, error and hint wiring on the group, aria-invalid placement, required state, focus on error, and custom-styled controls that keep native semantics."
slug: accessible-errors-for-radio-and-checkbox-groups
type: howto
breadcrumb: "Group Errors"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Accessible Errors for Radio and Checkbox Groups"
  parent: "ARIA Live Regions for Form Errors"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Accessible Errors for Radio and Checkbox Groups",
      "description": "Attach validation errors to radio and checkbox groups so every user hears them: fieldset and legend, error and hint wiring on the group, aria-invalid placement, required state, focus on error, and custom-styled controls that keep native semantics.",
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
          "name": "ARIA Live Regions for Form Errors",
          "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Accessible Errors for Radio and Checkbox Groups",
          "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-errors-for-radio-and-checkbox-groups/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Attach errors to radio and checkbox groups accessibly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Wrap the options in a fieldset with a legend that asks the question"
        },
        {
          "@type": "HowToStep",
          "name": "Put the error inside the fieldset and reference it first in aria-describedby"
        },
        {
          "@type": "HowToStep",
          "name": "Add a visually hidden \"Error:\" prefix"
        },
        {
          "@type": "HowToStep",
          "name": "Set aria-invalid on the options while the group is in error"
        },
        {
          "@type": "HowToStep",
          "name": "Link the summary to the first option"
        },
        {
          "@type": "HowToStep",
          "name": "Validate \"at least one\" in code for checkbox groups"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use role=\"radiogroup\" instead of fieldset?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For native radio inputs, fieldset and legend are the better choice: they work without ARIA and name the group reliably. role=\"radiogroup\" is for custom radio implementations, where you also take on keyboard handling — see roving tabindex for option groups."
          }
        },
        {
          "@type": "Question",
          "name": "Is required on one radio enough?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Natively, yes: a radio group is required if any radio in it has required. Screen readers typically announce \"required\" for each option. Add the requirement to the legend or hint text too, for users who do not hear it."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the error go visually?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Between the legend (and hint) and the options, so it is seen before the choices and next to the question it concerns. Pair colour with an icon and the \"Error:\" text for users who cannot rely on colour."
          }
        }
      ]
    }
  ]
}
</script>

# Accessible Errors for Radio and Checkbox Groups

"Choose a delivery option" displayed in red above a set of radio buttons is invisible to a screen-reader user who tabs into the group: focus lands on the first (or checked) radio, the label is read, and nothing connects the error to what they are hearing — so they press submit again and get the same unexplained failure.

Groups need their own error wiring, because the error belongs to the question, not to any single option. This page, part of [ARIA live regions for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/), builds the markup for radio groups and checkbox groups — including "choose at least one" — so the question, the hint and the error are read together when users enter the group.

---

## Context and prerequisites

The semantics that do the work:

- **`<fieldset>` and `<legend>`** group related controls and give the group a name. Screen readers read the legend when focus first enters the group.
- **`aria-describedby` on the `fieldset`** adds a description to the group. Support for reading group descriptions on entry is good in current NVDA, JAWS and VoiceOver, but not universal — so the error should also be reachable another way.
- **Radio groups** are one Tab stop; arrow keys move between options. Focus enters on the checked option, or the first one if none is checked.
- **`aria-invalid`** is defined for form controls; on a `fieldset` it is not reliably announced. Put it on the controls, and only where it is true.
- **`required`** on one radio makes the group required natively; for checkbox groups, "at least one" has no native equivalent.

The robust pattern combines group-level description with a link in the error summary that lands on the first option, so users reach the error through at least one route that every screen reader supports.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table listing the parts of a radio or checkbox group error — question, hint, error message, invalid state and required state — with the element each belongs on and why." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where each part of a group error goes</title>
  <desc>The question belongs in the legend, which names the group. The hint belongs in a paragraph referenced by the fieldset&#x27;s aria-describedby. The error message belongs in a paragraph inside the fieldset, also referenced by aria-describedby, placed before the hint. The invalid state belongs on each option input, set only while the group is in error. The required state for radio groups comes from required on the inputs; for checkbox groups it is stated in the legend or hint text.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Part</text>
  <text x="157.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Element</text>
  <text x="394.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">question</text>
  <text x="157.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&lt;legend&gt;</text>
  <text x="394.5" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">read on entering the group</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">hint</text>
  <text x="157.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&lt;p&gt; in describedby</text>
  <text x="394.5" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">context before answering</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">error</text>
  <text x="157.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&lt;p&gt; in describedby, before hint</text>
  <text x="394.5" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">read with the group</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">invalid state</text>
  <text x="157.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid on each input</text>
  <text x="394.5" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">fieldset support is unreliable</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">required</text>
  <text x="157.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">required (radio) / text (checkbox)</text>
  <text x="394.5" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">announced as required</text>
</svg>

---

## The core pattern: fieldset wiring, updated on error

```html
<fieldset id="delivery" aria-describedby="delivery-error delivery-hint">
  <legend>How would you like your order delivered?</legend>
  <p id="delivery-hint" class="hint">Next day delivery costs £4.99.</p>
  <p id="delivery-error" class="error" hidden>
    <span class="visually-hidden">Error: </span>Choose a delivery option.
  </p>
  <div class="option">
    <input type="radio" id="delivery-standard" name="delivery" value="standard" required>
    <label for="delivery-standard">Standard (3–5 working days)</label>
  </div>
  <div class="option">
    <input type="radio" id="delivery-next" name="delivery" value="next-day">
    <label for="delivery-next">Next day</label>
  </div>
</fieldset>
```

```typescript
export function setGroupError(fieldset: HTMLFieldSetElement, message: string | null) {
  const errorEl = fieldset.querySelector<HTMLElement>(".error")!;
  const inputs = [...fieldset.querySelectorAll<HTMLInputElement>("input[type=radio], input[type=checkbox]")];
  if (message) {
    errorEl.lastChild!.textContent = message;        // keep the hidden "Error:" prefix
    errorEl.hidden = false;
    // aria-invalid on the controls: the fieldset itself is not reliably announced.
    inputs.forEach((i) => i.setAttribute("aria-invalid", "true"));
  } else {
    errorEl.hidden = true;
    inputs.forEach((i) => i.removeAttribute("aria-invalid"));
  }
}

// "At least one" for checkboxes: no native constraint, so validate in code.
export function validateCheckboxGroup(fieldset: HTMLFieldSetElement, message: string) {
  const checked = fieldset.querySelectorAll("input[type=checkbox]:checked").length;
  setGroupError(fieldset, checked === 0 ? message : null);
  return checked > 0;
}

// Clear the group error as soon as any option is chosen (reward early).
export function wireGroup(fieldset: HTMLFieldSetElement, validate: () => boolean) {
  fieldset.addEventListener("change", () => {
    if (!fieldset.querySelector(".error")!.hasAttribute("hidden")) validate();
  });
}
```

The error summary links to the first option's id (`#delivery-standard`), so following the link puts focus inside the group, where the legend and description are read.

---

## Step-by-step walkthrough

1. **Wrap the options in a `fieldset` with a `legend` that asks the question.** The legend is the group's accessible name; make it the full question, not a one-word heading.
2. **Put the error inside the fieldset and reference it first in `aria-describedby`.** Keep it hidden until needed; unhide and fill it on error. Reference hint and error IDs on the fieldset, error first.
3. **Add a visually hidden "Error:" prefix.** Colour alone does not tell users this paragraph is an error, per [error styling that does not rely on colour](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/error-styling-that-does-not-rely-on-colour/); the prefix does so in speech.
4. **Set `aria-invalid` on the options while the group is in error.** Remove it the moment an option is chosen.
5. **Link the summary to the first option.** Focus lands in the group and the group's name and description are read.
6. **Validate "at least one" in code for checkbox groups.** Use the group rule from [requiring at least one of several fields](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/requiring-at-least-one-of-several-fields/), and state the requirement in the legend or hint.

### Why the error belongs to the group, not to one option

Attaching the error to the first radio — the quickest fix — makes it the first option's description. A user who arrows to the second option no longer hears it, and one who navigates with the rotor straight to "Next day" never hears it at all. Worse, `aria-invalid` on only the first radio suggests that option specifically is wrong, which is nonsense for a question with no answer yet. The question is what failed, so the error is read with the question: on the fieldset, alongside the legend, whichever option the user lands on.

<svg viewBox="0 0 680 267" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a screen-reader user activating an error summary link for the delivery question, focus moving to the first radio, and the screen reader reading the group name, error and option." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Following the summary link into a group</title>
  <desc>The user activates the summary link choose a delivery option. Focus moves to the first radio in the group. Because focus has entered the fieldset, the screen reader reads the legend, how would you like your order delivered, then the group description beginning with error, choose a delivery option, then the focused option&#x27;s label, standard, radio button, not checked, invalid. The user presses the down arrow, selects next day, and the error is removed.</desc>
  <rect x="0" y="0" width="680" height="267" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Error summary</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Radio group</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Screen reader</text>
  <path d="M95.5,41.0 V251.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V251.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V251.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V251.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">activate &quot;Choose a delivery</text>
  <text x="103.5" y="77.0" font-size="9.5" fill="#6b5f75" font-family="inherit">option&quot;</text>
  <path d="M95.5,81.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,77.0 257.5,81.0 250.5,85.0" fill="#7b4f8a"/>
  <text x="266.5" y="105.0" font-size="9.5" fill="#6b5f75" font-family="inherit">focus → first radio</text>
  <path d="M258.5,109.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,105.0 420.5,109.0 413.5,113.0" fill="#7b4f8a"/>
  <text x="429.5" y="133.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">legend + &quot;Error: Choose a</text>
  <text x="429.5" y="145.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">delivery option&quot;</text>
  <path d="M421.5,149.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,145.0 583.5,149.0 576.5,153.0" fill="#7b4f8a"/>
  <text x="103.5" y="173.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Standard… radio, not checked, invalid&quot;</text>
  <path d="M584.5,177.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,173.0 96.5,177.0 103.5,181.0" fill="#7b4f8a"/>
  <text x="103.5" y="201.0" font-size="9.5" fill="#2d6342" font-family="inherit">Down arrow → Next day</text>
  <path d="M95.5,205.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,201.0 420.5,205.0 413.5,209.0" fill="#7b4f8a"/>
  <text x="103.5" y="229.0" font-size="9.5" fill="#2d6342" font-family="inherit">error removed</text>
  <path d="M421.5,233.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,229.0 96.5,233.0 103.5,237.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Custom-styled controls losing semantics

Hiding native inputs with `display: none` and styling `<div>`s removes them from the keyboard and accessibility tree. Visually hide the native input (keep it focusable) and style the label, or use `appearance: none` on the input itself.

### 2. Legends styled away

Some designs remove the legend and put the question in a heading above the fieldset. Screen readers then announce the group without a name. Keep the legend; style it as a heading if needed, or put the heading inside the legend.

### 3. Dynamic groups

When options load asynchronously, the group may be empty when validation runs. Do not show "Choose an option" for a group that has no options yet; show a loading state instead.

### 4. Very long option lists

Twenty checkboxes with a group error: users may not re-enter the group from the top. The summary link and the description on entry both help; also consider placing the error immediately after the legend so it is visually near the question.

### 5. Group descriptions not read

A few screen reader and browser combinations do not read `fieldset` descriptions on entry. The summary route and the per-option `aria-invalid` still convey the problem; confirm with the [screen-reader testing matrix for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/screen-reader-testing-matrix-for-form-errors/).

<svg viewBox="0 0 680 85" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the three ways a screen-reader user can learn about a group error — the group description on entry, the error summary link and aria-invalid on the options." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three routes to the same error</title>
  <desc>The group description route reads the error with the legend when focus enters the fieldset. The summary route lists the error after submit and moves focus into the group when its link is activated. The invalid state route marks each option as invalid, so even a user who reaches an option by other means hears that something is wrong. Together they cover screen readers that do not support one route.</desc>
  <rect x="0" y="0" width="680" height="85" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Group description</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Read with the legend on entry.</text>
  <rect x="236.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Summary link</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">After submit; focus into the group.</text>
  <rect x="458.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">aria-invalid on options</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Heard on any option reached.</text>
</svg>

---

## Verification checklist

- [ ] Each group is a `fieldset` whose `legend` states the question.
- [ ] The group's error is inside the fieldset and referenced first by its `aria-describedby`.
- [ ] The error has a visually hidden "Error:" prefix.
- [ ] `aria-invalid` is set on the options only while the group is in error.
- [ ] Choosing any option clears the group error immediately.
- [ ] The error summary links to the first option and focus lands in the group.
- [ ] Custom-styled options remain native, focusable inputs.
- [ ] Checkbox "at least one" rules are validated in code and stated in text.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use role="radiogroup" instead of fieldset?</strong></summary>

For native radio inputs, `fieldset` and `legend` are the better choice: they work without ARIA and name the group reliably. `role="radiogroup"` is for custom radio implementations, where you also take on keyboard handling — see [roving tabindex for option groups](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/).

</details>

<details>
<summary><strong>Is required on one radio enough?</strong></summary>

Natively, yes: a radio group is required if any radio in it has `required`. Screen readers typically announce "required" for each option. Add the requirement to the legend or hint text too, for users who do not hear it.

</details>

<details>
<summary><strong>Where should the error go visually?</strong></summary>

Between the legend (and hint) and the options, so it is seen before the choices and next to the question it concerns. Pair colour with an icon and the "Error:" text for users who cannot rely on colour.

</details>

---

## Related

- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
- [Modelling Form-Level vs Field-Level Errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/)
- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/)

← [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
