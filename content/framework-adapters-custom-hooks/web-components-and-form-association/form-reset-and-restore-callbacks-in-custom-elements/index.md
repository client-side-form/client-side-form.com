---
layout: page.njk
title: "Form Reset and Restore Callbacks in Custom Elements"
description: "Make a form-associated custom element behave like a native input on reset, disable, back/forward restore and autofill: implementing formResetCallback, formDisabledCallback, formStateRestoreCallback and formAssociatedCallback correctly."
slug: form-reset-and-restore-callbacks-in-custom-elements
type: howto
breadcrumb: "Reset & Restore Callbacks"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Form Reset and Restore Callbacks in Custom Elements"
  parent: "Web Components and Form Association"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Form Reset and Restore Callbacks in Custom Elements",
      "description": "Make a form-associated custom element behave like a native input on reset, disable, back/forward restore and autofill: implementing formResetCallback, formDisabledCallback, formStateRestoreCallback and formAssociatedCallback correctly.",
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
          "name": "Framework Adapters & Custom Hooks for Form State",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Web Components and Form Association",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Form Reset and Restore Callbacks in Custom Elements",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-reset-and-restore-callbacks-in-custom-elements/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement form lifecycle callbacks in a form-associated custom element",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Separate default value from current value"
        },
        {
          "@type": "HowToStep",
          "name": "Save state on every change"
        },
        {
          "@type": "HowToStep",
          "name": "Reset to the default in formResetCallback"
        },
        {
          "@type": "HowToStep",
          "name": "Disable internal controls in formDisabledCallback"
        },
        {
          "@type": "HowToStep",
          "name": "Apply saved state in formStateRestoreCallback"
        },
        {
          "@type": "HowToStep",
          "name": "Re-validate on association"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need all four callbacks?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Implement formResetCallback and formDisabledCallback for any real control; they cover everyday behaviour. formStateRestoreCallback is needed if users navigate back to forms (most apps). formAssociatedCallback is optional unless the element depends on its form."
          }
        },
        {
          "@type": "Question",
          "name": "What should the state argument contain?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Whatever you need to rebuild the control's UI, which may be more than the submitted value — for a multi-select combobox, the selected ids plus the typed filter text. It can be a string, File or FormData."
          }
        },
        {
          "@type": "Question",
          "name": "Does Safari support these callbacks?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Form-associated custom elements, including ElementInternals and the lifecycle callbacks, are supported in current Chromium, Firefox and Safari. Feature-detect \"attachInternals\" in HTMLElement.prototype if you support older browsers, and fall back to a hidden native input."
          }
        }
      ]
    }
  ]
}
</script>

# Form Reset and Restore Callbacks in Custom Elements

A form-associated custom element that only calls `setFormValue` submits correctly but misbehaves everywhere else: pressing a reset button leaves it unchanged, a disabled fieldset does not disable it, and going back to the page after submitting shows native inputs with their values restored while the custom one is empty.

The fix is the four lifecycle callbacks that the platform calls on form-associated elements. [Form-associated custom elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/) covers value and validity; this page covers the lifecycle, so the element is indistinguishable from a native control in every situation a form can be in. It is part of [web components and form association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/).

---

## Context and prerequisites

The callbacks, and when the browser calls them:

- **`formAssociatedCallback(form)`** — when the element is associated with a form or disassociated (`form` is `null`), including when it moves in the DOM or its `form` attribute changes.
- **`formDisabledCallback(disabled)`** — when the element's disabled state changes, including via an ancestor `<fieldset disabled>`.
- **`formResetCallback()`** — when its form is reset (reset button, `form.reset()`).
- **`formStateRestoreCallback(state, mode)`** — when the browser restores state: `mode` is `"restore"` for back/forward and session restore, `"autocomplete"` for autofill of a custom control.

The element must declare `static formAssociated = true` and attach `ElementInternals`. Restoration works only if the element saved state with the second argument of `setFormValue(value, state)`.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the four form-associated custom element lifecycle callbacks, what triggers each, and what behaviour a native input has that the callback must reproduce." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four callbacks and what a native input does</title>
  <desc>formAssociatedCallback is triggered when the element joins or leaves a form and should update any form-dependent state. formDisabledCallback is triggered by the element&#x27;s or an ancestor fieldset&#x27;s disabled state and should disable internal controls and remove them from the tab order. formResetCallback is triggered by a form reset and should restore the default value, clear dirty state and update the form value and validity. formStateRestoreCallback is triggered by back and forward restore or autofill and should apply the saved state.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Callback</text>
  <text x="208.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Triggered by</text>
  <text x="420.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Must reproduce</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">formAssociatedCallback</text>
  <text x="208.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">join or leave a form</text>
  <text x="420.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">form-dependent setup</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">formDisabledCallback</text>
  <text x="208.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">disabled attr or fieldset[disabled]</text>
  <text x="420.9" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">inert, unfocusable, not submitted</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">formResetCallback</text>
  <text x="208.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">reset button, form.reset()</text>
  <text x="420.9" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">default value; value and validity updated</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">formStateRestoreCallback</text>
  <text x="208.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">back/forward, autofill</text>
  <text x="420.9" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">apply saved state</text>
</svg>

---

## The core pattern: a rating control with the full lifecycle

```typescript
class StarRating extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ["value", "required"];

  #internals = this.attachInternals();
  #value = "";
  #buttons: HTMLButtonElement[] = [];

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open", delegatesFocus: true });
    root.innerHTML = `<div role="radiogroup" part="group">${[1, 2, 3, 4, 5]
      .map((n) => `<button type="button" role="radio" aria-checked="false" data-v="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`)
      .join("")}</div>`;
    this.#buttons = [...root.querySelectorAll("button")];
    root.addEventListener("click", (e) => {
      const v = (e.target as HTMLElement).closest("button")?.dataset.v;
      if (v) this.#set(v, true);
    });
  }

  // The DEFAULT value lives in the attribute, like a native input's value attribute.
  get defaultValue() { return this.getAttribute("value") ?? ""; }
  get value() { return this.#value; }
  set value(v: string) { this.#set(v, false); }

  connectedCallback() { if (!this.#value) this.#set(this.defaultValue, false); }

  #set(v: string, fromUser: boolean) {
    this.#value = v;
    // Second argument = state for restoration. Here value and state are the same;
    // richer controls store more (e.g. an open panel, a partially typed search).
    this.#internals.setFormValue(v || null, v);
    this.#buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === v)));
    this.#validate();
    if (fromUser) this.dispatchEvent(new Event("input", { bubbles: true }));
  }

  #validate() {
    if (this.hasAttribute("required") && !this.#value) {
      this.#internals.setValidity({ valueMissing: true }, "Choose a rating.", this.#buttons[0]);
    } else {
      this.#internals.setValidity({});
    }
  }

  formAssociatedCallback(form: HTMLFormElement | null) {
    // e.g. read form-level config; here, just re-validate in the new context.
    this.#validate();
  }

  formDisabledCallback(disabled: boolean) {
    // Mirror native behaviour: not focusable, not operable, visually disabled.
    this.#buttons.forEach((b) => (b.disabled = disabled));
    this.toggleAttribute("aria-disabled", disabled);
  }

  formResetCallback() {
    // Reset restores the DEFAULT (attribute), not "empty".
    this.#set(this.defaultValue, false);
  }

  formStateRestoreCallback(state: string | File | FormData | null, _mode: "restore" | "autocomplete") {
    if (typeof state === "string") this.#set(state, false);
  }

  attributeChangedCallback(name: string) {
    if (name === "required") this.#validate();
  }
}
customElements.define("star-rating", StarRating);
```

---

## Step-by-step walkthrough

1. **Separate default value from current value.** Keep the default in an attribute (`value="3"`) and the current value in a private field, exactly like a native input's `value` attribute and property.
2. **Save state on every change.** `setFormValue(value, state)` — the state argument is what the browser hands back for restoration. Without it, back/forward shows an empty control.
3. **Reset to the default in `formResetCallback`.** Then update the form value and validity; a reset that changes the visuals but not `setFormValue` submits stale data.
4. **Disable internal controls in `formDisabledCallback`.** The browser already excludes a disabled form-associated element from submission; you must stop its internals being focusable and operable, as described in [skipping validation for disabled and hidden fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/).
5. **Apply saved state in `formStateRestoreCallback`.** Handle both `restore` and `autocomplete` modes; validate after applying.
6. **Re-validate on association.** Moving the element into a different form may change what "valid" means if validation depends on the form.

### Why reset means "default", not "empty"

A common mistake is clearing the control in `formResetCallback`. Native inputs do not clear on reset; they return to their default value — the `value` attribute for text inputs, the `checked` attribute for checkboxes, the `selected` option for selects. Edit forms rely on this: a "Discard changes" button of `type="reset"` should put the loaded values back. If your element clears instead, it behaves differently from every native control beside it, and users lose the original value they wanted to return to. Keep the default in an attribute that server rendering or the framework sets, and reset to it.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user choosing a rating, submitting the form, pressing Back, and the browser calling formStateRestoreCallback with the saved state so the rating is restored like native inputs." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Back/forward restore of a custom element</title>
  <desc>The user chooses four stars, and the element calls setFormValue with value four and state four. The user submits and the browser navigates away. The user presses Back. The browser restores native inputs from its form state cache and calls the custom element&#x27;s formStateRestoreCallback with the saved state four and mode restore. The element applies four stars and revalidates, so it matches the restored native fields.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">star-rating</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Browser</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">clicks 4 stars</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setFormValue(&quot;4&quot;, &quot;4&quot;)</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit, then Back</text>
  <path d="M122.7,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">formStateRestoreCallback(&quot;4&quot;, &quot;restore&quot;)</text>
  <path d="M557.3,153.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">4 stars shown, valid</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Restore only works with bfcache disabled

Pages served from the back/forward cache are restored whole — JavaScript state included — and no callback fires, because nothing needs restoring. `formStateRestoreCallback` matters for pages that are *not* in bfcache (for example, pages with `unload` handlers or `Cache-Control: no-store`) and for session restore. Test both.

### 2. Upgrade timing

If the element is defined after the browser attempted restoration, the callback runs on upgrade with the saved state. Initialise internals in the constructor so the callback has everything it needs even before `connectedCallback`.

### 3. Framework wrappers overriding reset

React and Vue do not know about native reset for custom elements. If the framework also holds the value, a native reset changes the element but not framework state. Either avoid `type="reset"` in framework-managed forms or listen for the form's `reset` event and reset framework state too.

### 4. Validity anchors

The third argument to `setValidity` — the anchor — is where browsers point their validation bubble and where focus goes on `reportValidity()`. Anchor to a focusable internal control, or to nothing; anchoring to a non-focusable node breaks keyboard navigation to the error.

### 5. Autocomplete mode

`mode: "autocomplete"` is for browser autofill of custom controls, which is rare but specified. Treat it like a user change: apply the value, validate, and dispatch `input` so frameworks listening on the host update their state, as in [handling browser autofill in controlled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing native input behaviours on reset, disable, restore and validation that a form-associated custom element must reproduce through its callbacks and ElementInternals." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The native behaviours a custom control must match</title>
  <desc>On reset, native inputs return to their default and so must the custom element. When a surrounding fieldset is disabled, native inputs become unfocusable and are not submitted, and the custom element must disable its internal controls. On back and forward restore, native inputs show their previous values, and the custom element must apply its saved state. For validation, native inputs expose validity and messages, and the custom element must call setValidity with an anchor.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Reset</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Back to the default</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">attribute.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Disable</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Internals unfocusable and</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">inert.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Restore</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Apply saved state from</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setFormValue.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Validity</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setValidity with a focusable</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">anchor.</text>
</svg>

---

## Verification checklist

- [ ] A reset button returns the element to its `value` attribute, and `FormData` reflects it.
- [ ] Wrapping the element in `<fieldset disabled>` makes it unfocusable and excludes it from `FormData`.
- [ ] After submitting and pressing Back (with bfcache off), the element shows its previous value.
- [ ] Moving the element into another form re-validates it.
- [ ] Required validation reports `valueMissing` with a focusable anchor.
- [ ] Framework state and element state agree after a native reset.

---

## Frequently Asked Questions

<details>
<summary><strong>Do I need all four callbacks?</strong></summary>

Implement `formResetCallback` and `formDisabledCallback` for any real control; they cover everyday behaviour. `formStateRestoreCallback` is needed if users navigate back to forms (most apps). `formAssociatedCallback` is optional unless the element depends on its form.

</details>

<details>
<summary><strong>What should the state argument contain?</strong></summary>

Whatever you need to rebuild the control's UI, which may be more than the submitted value — for a multi-select combobox, the selected ids plus the typed filter text. It can be a string, `File` or `FormData`.

</details>

<details>
<summary><strong>Does Safari support these callbacks?</strong></summary>

Form-associated custom elements, including `ElementInternals` and the lifecycle callbacks, are supported in current Chromium, Firefox and Safari. Feature-detect `"attachInternals" in HTMLElement.prototype` if you support older browsers, and fall back to a hidden native input.

</details>

---

## Related

- [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
- [Building Lit Form Controls With ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/building-lit-form-controls-with-elementinternals/)
- [Validating Inputs Across Shadow DOM Boundaries](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/)

← [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
