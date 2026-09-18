---
layout: page.njk
title: "Building Lit Form Controls With ElementInternals"
description: "A Lit-based text control that participates in native forms: static formAssociated, syncing reactive properties to setFormValue and setValidity, labels and ARIA through internals, events frameworks can bind to, and SSR considerations."
slug: building-lit-form-controls-with-elementinternals
type: howto
breadcrumb: "Lit Form Controls"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Building Lit Form Controls With ElementInternals"
  parent: "Web Components and Form Association"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building Lit Form Controls With ElementInternals",
      "description": "A Lit-based text control that participates in native forms: static formAssociated, syncing reactive properties to setFormValue and setValidity, labels and ARIA through internals, events frameworks can bind to, and SSR considerations.",
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
          "name": "Building Lit Form Controls With ElementInternals",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/building-lit-form-controls-with-elementinternals/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a form-associated Lit component",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare formAssociated and attach internals once"
        },
        {
          "@type": "HowToStep",
          "name": "Use delegatesFocus"
        },
        {
          "@type": "HowToStep",
          "name": "Sync in updated"
        },
        {
          "@type": "HowToStep",
          "name": "Delegate constraint checks to the inner input"
        },
        {
          "@type": "HowToStep",
          "name": "Accept external errors"
        },
        {
          "@type": "HowToStep",
          "name": "Expose the native validation API"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should validation messages come from the browser or from my design system?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use the inner input's native checks for the flags, but supply your own message text, so wording is consistent across browsers and locales. The native validationMessage is a reasonable fallback during development."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use this element inside React Hook Form or VeeValidate?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, as a controlled component through the framework's controller API (Controller in React Hook Form, useField in VeeValidate), binding value and listening for input. Because the element is form-associated, native FormData submission also works without the library."
          }
        },
        {
          "@type": "Question",
          "name": "Is ElementInternals supported in all browsers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is supported in current Chromium, Firefox and Safari. For older browsers, a polyfill exists, or you can render a hidden native input in the light DOM as a fallback for submission only."
          }
        }
      ]
    }
  ]
}
</script>

# Building Lit Form Controls With ElementInternals

Design systems built with Lit often ship inputs that look right and fail in forms: `new FormData(form)` omits them, `form.reportValidity()` ignores them, a `<label for>` does not focus them, and a React or Vue wrapper has to manually read `.value` on submit because the element is invisible to the form.

`ElementInternals` fixes all of that, and Lit's reactive properties make the wiring straightforward — as long as every property change that affects the value or validity flows into `setFormValue` and `setValidity` in one place. This page builds a form-associated text field in Lit, as a concrete application of [form-associated custom elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/) within [web components and form association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/).

---

## Context and prerequisites

A form-associated Lit element needs:

- **`static formAssociated = true`** on the class, and `this.attachInternals()` in the constructor (once per element).
- **A single sync point.** Lit's `updated(changed)` (or `willUpdate`) is where property changes are known; syncing there keeps form value and validity consistent with rendered state.
- **An internal native input** inside the shadow root, for the actual text editing, IME, autofill of the inner control and mobile keyboards.
- **Events on the host.** Frameworks bind `input` and `change` on the custom element; events from the inner input are composed and retargeted, but re-dispatching explicit `input`/`change` from the host makes the contract clear.
- **Accessible labelling.** A `<label for="my-field">` pointing at the host works for form-associated elements; with `delegatesFocus` the inner input receives focus when the label is clicked.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing what ElementInternals provides to a Lit form control — form value, validity, labels and states, and lifecycle callbacks." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What ElementInternals gives a Lit control</title>
  <desc>setFormValue makes the control&#x27;s value appear in FormData and form submission. setValidity makes it take part in checkValidity, reportValidity and the invalid pseudo-class, with a message and an anchor. The labels property and label association let a label element name and focus the control, and internals ARIA properties set its role and states. Lifecycle callbacks let it respond to reset, disable and restore like a native input.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">setFormValue</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">In FormData and</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submission.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">setValidity</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">checkValidity, :invalid,</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">messages.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Labels and ARIA</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&lt;label for&gt; works.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">internals.ariaRequired etc.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Lifecycle</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Reset, disable, restore</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">callbacks.</text>
</svg>

---

## The core pattern: a Lit text field with one sync point

```typescript
import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";

@customElement("ds-text-field")
export class DsTextField extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static styles = css`:host { display: block; } input { font: inherit; width: 100%; }`;

  #internals = this.attachInternals();

  @property() name = "";
  @property() value = "";
  @property({ attribute: "value", reflect: false }) defaultValue = "";   // native-style default
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Number }) minlength?: number;
  @property() autocomplete = "";
  @property({ attribute: "error-message" }) errorMessage = "";   // server/app-provided error

  @query("input") private input!: HTMLInputElement;

  // ONE sync point: whenever value or constraints change, update the form.
  protected updated(changed: PropertyValues<this>) {
    if (changed.has("value")) this.#internals.setFormValue(this.value, this.value);
    if (["value", "required", "minlength", "errorMessage"].some((k) => changed.has(k as keyof this))) {
      this.#syncValidity();
    }
    this.#internals.ariaRequired = String(this.required);
  }

  #syncValidity() {
    // Let the inner native input evaluate its own constraints, then mirror them.
    const v = this.input?.validity;
    if (this.errorMessage) {
      this.#internals.setValidity({ customError: true }, this.errorMessage, this.input);
    } else if (v && !v.valid) {
      this.#internals.setValidity(
        { valueMissing: v.valueMissing, tooShort: v.tooShort, typeMismatch: v.typeMismatch },
        this.input.validationMessage, this.input);
    } else {
      this.#internals.setValidity({});
    }
  }

  #onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    // Re-dispatch from the host so frameworks see a plain, non-composed event on the element they bound.
    this.dispatchEvent(new Event("input", { bubbles: true }));
  }

  formResetCallback() { this.value = this.defaultValue; }
  formDisabledCallback(disabled: boolean) { this.toggleAttribute("disabled", disabled); this.requestUpdate(); }
  formStateRestoreCallback(state: string | null) { if (typeof state === "string") this.value = state; }

  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }

  render() {
    return html`<input
      .value=${this.value}
      ?required=${this.required}
      minlength=${this.minlength ?? ""}
      autocomplete=${this.autocomplete || "off"}
      ?disabled=${this.hasAttribute("disabled")}
      @input=${this.#onInput}
      @change=${() => this.dispatchEvent(new Event("change", { bubbles: true }))} />`;
  }
}
```

```html
<form>
  <label for="email">Email</label>
  <ds-text-field id="email" name="email" required autocomplete="email"></ds-text-field>
  <button>Save</button>
</form>
```

---

## Step-by-step walkthrough

1. **Declare `formAssociated` and attach internals once.** Store the internals in a private field; calling `attachInternals` twice throws.
2. **Use `delegatesFocus`.** Clicking the label or calling `host.focus()` focuses the inner input, which is what users and error summaries expect.
3. **Sync in `updated`.** Every change that affects value or validity passes through one method, so `FormData`, `:invalid` and the rendered input never disagree.
4. **Delegate constraint checks to the inner input.** Let the native input compute `valueMissing`, `tooShort` and `typeMismatch`, then mirror the flags with `setValidity` — no reimplementation of native rules.
5. **Accept external errors.** An `error-message` attribute lets a framework or server set a custom error, which becomes `customError` — the route by which [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/) reaches a custom element.
6. **Expose the native validation API.** `validity`, `validationMessage`, `checkValidity` and `reportValidity` on the host make the element usable by code written for native inputs.

### Why the inner input still matters

It might seem cleaner to make the host itself editable — `contenteditable`, or custom key handling — and skip the inner `<input>`. That discards a great deal the browser does for free: IME composition for Chinese, Japanese and Korean input, mobile keyboard types from `inputmode`, spellcheck, undo history, text selection and password-manager integration. Keeping a real input inside the shadow root and treating the custom element as a wrapper that *reports* to the form is less code and far more robust. `ElementInternals` exists precisely so the wrapper can stand in for the input in the form's eyes.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a keystroke in the inner input of a Lit form control, through the host&#x27;s value property, Lit&#x27;s update cycle, setFormValue and setValidity, to a re-dispatched input event on the host." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A keystroke through the Lit control</title>
  <desc>The user types in the inner native input. Its input handler sets the host&#x27;s value property and re-dispatches an input event from the host for frameworks. Lit schedules an update and re-renders. In updated, the changed value is passed to setFormValue with state, and validity is re-synced from the inner input&#x27;s validity with setValidity. The form now sees the new value and validity immediately.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="362.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Inner &lt;input&gt; input event</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Native editing, IME, autofill.</text>
  <text x="406.8" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The browser does the hard parts.</text>
  <path d="M195.4,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.4,89.0 195.4,96.0 199.4,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="362.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">host.value = e.target.value</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Re-dispatch input on the host.</text>
  <text x="406.8" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Frameworks listening on the element update their state.</text>
  <path d="M195.4,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.4,174.0 195.4,181.0 199.4,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="362.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Lit updated()</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setFormValue(value, state)</text>
  <text x="406.8" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">FormData and restoration stay current.</text>
  <path d="M195.4,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.4,259.0 195.4,266.0 199.4,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="362.8" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">setValidity from inner validity</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Flags + message + anchor.</text>
  <text x="406.8" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">:invalid, checkValidity and summaries are correct.</text>
</svg>

---

## Failure modes and edge cases

### 1. Validity checked before first render

`this.input` is undefined until the first render. Guard with optional chaining, or run the first validity sync in `firstUpdated`, otherwise a required field is briefly "valid" and a submit in that window passes.

### 2. Framework wrappers and property vs attribute

React 19 sets custom element properties when they exist on the element; earlier React versions set attributes only. Vue sets properties when defined. Keep `value` a property (not only an attribute) and reflect only what must be in the DOM, such as `required` for styling.

### 3. Autofill of the inner input

Browsers autofill the inner input when it has an `autocomplete` token and is visible to the autofill heuristics. The input event from autofill reaches `#onInput`, so the host value updates — verify with a saved address in each browser, because autofill inside shadow DOM has had inconsistencies across versions.

### 4. Server-side rendering

Lit SSR renders the shadow DOM declaratively, but `ElementInternals` does not exist on the server. Guard `attachInternals` for SSR environments, and rely on the element hydrating before submit — or render a hidden native input fallback for no-JS submission.

### 5. Label association across shadow boundaries

`<label for="email">` targets the host, which works because the host is form-associated and labelable. A label *inside* the shadow root cannot label an input in the light DOM, and ARIA ids do not cross shadow boundaries — see [labels and delegatesFocus for shadow DOM inputs](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/labels-and-delegatesfocus-for-shadow-dom-inputs/).

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of symptoms of an incomplete form-associated Lit control and the missing piece that causes each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Symptoms of a missing piece</title>
  <desc>If the field is missing from FormData, setFormValue is not called. If reportValidity ignores the field, setValidity is not called. If clicking the label does not focus the input, delegatesFocus is missing. If reset does not clear the value, formResetCallback is missing. If a React wrapper never sees changes, the host does not dispatch input or change events.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Symptom</text>
  <text x="369.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Missing piece</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">field missing from FormData</text>
  <text x="369.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">setFormValue in updated()</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">reportValidity ignores the field</text>
  <text x="369.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setValidity with an anchor</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">label click does not focus</text>
  <text x="369.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">delegatesFocus: true</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">reset leaves the value</text>
  <text x="369.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">formResetCallback</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">framework state never updates</text>
  <text x="369.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">host input/change events</text>
</svg>

---

## Verification checklist

- [ ] `new FormData(form)` includes the element's value under its `name`.
- [ ] `form.reportValidity()` flags an empty required element and focuses its inner input.
- [ ] `<label for>` names the element and focuses the inner input on click.
- [ ] A reset button restores the default value.
- [ ] A disabled fieldset disables the inner input and excludes the value.
- [ ] Frameworks binding `input` on the element receive updates.
- [ ] External error messages set `customError` and clear when removed.
- [ ] Browser autofill of the inner input updates the host value.

---

## Frequently Asked Questions

<details>
<summary><strong>Should validation messages come from the browser or from my design system?</strong></summary>

Use the inner input's native checks for the flags, but supply your own message text, so wording is consistent across browsers and locales. The native `validationMessage` is a reasonable fallback during development.

</details>

<details>
<summary><strong>Can I use this element inside React Hook Form or VeeValidate?</strong></summary>

Yes, as a controlled component through the framework's controller API (`Controller` in React Hook Form, `useField` in VeeValidate), binding `value` and listening for `input`. Because the element is form-associated, native `FormData` submission also works without the library.

</details>

<details>
<summary><strong>Is ElementInternals supported in all browsers?</strong></summary>

It is supported in current Chromium, Firefox and Safari. For older browsers, a polyfill exists, or you can render a hidden native input in the light DOM as a fallback for submission only.

</details>

---

## Related

- [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
- [Form Reset and Restore Callbacks in Custom Elements](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-reset-and-restore-callbacks-in-custom-elements/)
- [Using the Constraint Validation API With Custom Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/)

← [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
