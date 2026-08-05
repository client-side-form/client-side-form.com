---
layout: page.njk
title: "Form-Associated Custom Elements with ElementInternals"
description: "Build a custom element that submits, validates, resets, disables and restores like a native input — in the order the pieces must be added, with the silent failure each callback prevents."
slug: form-associated-custom-elements-with-elementinternals
type: howto
breadcrumb: "Form-Associated Custom Elements with ElementInternals"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Form-Associated Custom Elements with ElementInternals"
  parent: "Web Components and Form Association"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Form-Associated Custom Elements with ElementInternals",
      "description": "Build a custom element that submits, validates, resets, disables and restores like a native input — in the order the pieces must be added, with the silent failure each callback prevents.",
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
          "name": "Framework Adapters & Custom Hooks",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Web Components and Form Association",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Form-Associated Custom Elements with ElementInternals",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Make a custom element participate in its form",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Declare static formAssociated = true"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Attach internals once in the constructor"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Attach the shadow root with delegatesFocus"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Publish the value in connectedCallback"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Normalise the value on the way into setFormValue"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Implement reset, disable and restore callbacks"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Reflect validity through internals.ariaInvalid"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where should attachInternals be called?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In the constructor, exactly once. It throws on a second call and it throws entirely if the class does not declare static formAssociated. What must not happen in the constructor is setFormValue or setValidity: the element has no owning form yet, so those calls are discarded. Attach in the constructor, publish in connectedCallback."
          }
        },
        {
          "@type": "Question",
          "name": "How do I submit more than one value from one element?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pass a FormData to setFormValue instead of a string, appending one entry per value with distinct names. The pairs then appear in the form's FormData exactly as if they had been separate inputs. Note that formStateRestoreCallback will hand you a FormData back rather than a string, so the restore path has to handle both shapes."
          }
        },
        {
          "@type": "Question",
          "name": "Does this work inside a framework that manages the DOM?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, with one caveat: some frameworks set properties and others set attributes, so implement both the property accessor and observedAttributes. Beyond that the element behaves as a native input, which means framework form libraries that read FormData or listen for input events need no special support — which is most of the point of using form association rather than a bespoke binding."
          }
        }
      ]
    }
  ]
}
</script>

# Form-Associated Custom Elements with ElementInternals

The exact problem: a design-system text field built as a custom element submits nothing. `new FormData(form)` returns every native input and skips it entirely, so the server receives a payload missing a required value that the reader can plainly see on screen.

## Context and Prerequisites

The contract is described in [web components and form association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/); this page walks the implementation and the order the pieces must be added in. You need a browser with `ElementInternals`, and a control whose value is genuinely a single form value — a date-range picker contributing two pairs is a variation covered at the end.

## Core Pattern

```typescript
export class XCurrency extends HTMLElement {
  // Without this, attachInternals() throws and none of the callbacks fire.
  static formAssociated = true;
  static observedAttributes = ['value', 'required', 'disabled'];

  #internals = this.attachInternals();
  #input: HTMLInputElement;
  #touched = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = `<span part="prefix">£</span><input part="input" inputmode="decimal">`;
    this.#input = root.querySelector('input')!;
    this.#input.addEventListener('input', () => this.#commit(this.#input.value));
    this.#input.addEventListener('blur', () => { this.#touched = true; this.#refresh(); });
  }

  connectedCallback(): void {
    // Publish the initial value here, not in the constructor: the element has
    // no owning form until it is connected, so an early call is discarded.
    this.#commit(this.getAttribute('value') ?? '');
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null): void {
    if (name === 'value') this.#commit(next ?? '');
    if (name === 'disabled') this.#input.disabled = next !== null;
    if (name === 'required') this.#refresh();
  }

  #commit(raw: string): void {
    this.#input.value = raw;
    // The value the FORM sees. Normalise here so the server never receives the
    // display formatting — "1,250.00" becomes "1250.00".
    this.#internals.setFormValue(raw.replace(/,/g, '') || null);
    this.#refresh();
  }

  #refresh(): void {
    const raw = this.#input.value.replace(/,/g, '');
    const required = this.hasAttribute('required');
    if (required && raw === '') {
      this.#internals.setValidity({ valueMissing: true }, 'Enter an amount', this.#input);
    } else if (raw !== '' && !/^\d+(\.\d{1,2})?$/.test(raw)) {
      this.#internals.setValidity({ patternMismatch: true },
        'Enter an amount, for example 1250.00', this.#input);
    } else {
      this.#internals.setValidity({});
    }
    // Reflect for CSS and for tests, without taking aria-invalid from consumers.
    const invalid = this.#touched && !this.#internals.validity.valid;
    this.toggleAttribute('data-invalid', invalid);
    this.#internals.ariaInvalid = invalid ? 'true' : null;
  }

  formResetCallback(): void {
    this.#touched = false;
    this.#commit(this.getAttribute('value') ?? '');
  }

  formDisabledCallback(disabled: boolean): void {
    this.#input.disabled = disabled;
    // Native disabled controls are exempt from constraint validation; match that,
    // or a hidden control blocks a submit the reader cannot unblock.
    if (disabled) this.#internals.setValidity({});
    else this.#refresh();
  }

  formStateRestoreCallback(state: string | FormData): void {
    this.#commit(typeof state === 'string' ? state : String(state.get(this.name) ?? ''));
  }

  get name() { return this.getAttribute('name') ?? ''; }
  get value() { return this.#input.value; }
  set value(v: string) { this.#commit(v); }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
}
customElements.define('x-currency', XCurrency);
```

## Step-by-Step Walkthrough

1. **Set the flag before anything else.** `static formAssociated = true` is what makes `attachInternals()` legal and the four callbacks fire.

2. **Attach internals once, in the constructor.** A second call throws. Store the handle; it is the only route to value, validity and ARIA.

3. **Delegate focus.** `delegatesFocus: true` is what makes a `<label for>` click, an error-summary link and a first-invalid `focus()` land on the inner control rather than on the host.

4. **Publish the value on connect, not in the constructor.** There is no owning form yet in the constructor, so an early `setFormValue` is discarded silently.

5. **Normalise on the way out.** `setFormValue` is the boundary between display formatting and the payload. Strip separators, coerce, and send `null` for empty so the field is absent rather than blank.

6. **Implement all four callbacks.** Reset, disable and restore each have a distinct, silent failure if omitted.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The order of operations for a form-associated element: the flag enables internals, internals are attached in the constructor, focus is delegated by the shadow root, the value is published on connect, and each of the four form callbacks covers one otherwise-silent failure." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Build order, and the failure each step prevents</title>
  <desc>Setting the static formAssociated flag is what makes attachInternals legal; without it the constructor throws with a message that does not explain why. Attaching internals in the constructor gives the single handle used for value, validity and ARIA, and calling it twice throws. Attaching the shadow root with delegatesFocus is what makes label clicks and programmatic focus reach the inner control. Publishing the value in connectedCallback rather than the constructor matters because there is no owning form until the element is connected. And the four form callbacks each cover one silent failure: reset leaving the control populated, an ancestor fieldset having no effect, back-navigation losing the value, and a disabled control blocking a submit.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="14" y="30" width="150" height="66" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="89" y="54" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · the flag</text>
  <text x="89" y="72" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">formAssociated</text>
  <text x="89" y="88" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">= true</text>
  <path d="M164,63 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="30" width="150" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="261" y="54" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · internals</text>
  <text x="261" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">once, in the</text>
  <text x="261" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">constructor</text>
  <path d="M336,63 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="30" width="150" height="66" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="433" y="54" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · delegate focus</text>
  <text x="433" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">labels and links</text>
  <text x="433" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reach the input</text>
  <path d="M508,63 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="30" width="146" height="66" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="603" y="54" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">4 · publish</text>
  <text x="603" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">on connect —</text>
  <text x="603" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a form exists now</text>
  <rect x="14" y="122" width="662" height="72" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="144" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">5 · the four callbacks, and the silent failure each one prevents</text>
  <text x="28" y="164" font-size="9.5" fill="#6b5f75" font-family="inherit">formResetCallback — reset leaves the control populated · formDisabledCallback — an ancestor fieldset does nothing</text>
  <text x="28" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">formStateRestoreCallback — back-navigation loses the value · clearing validity when disabled — a hidden control blocks submit</text>
  <text x="14" y="218" font-size="10" fill="#6b5f75" font-family="inherit">Every one of those failures is invisible in a component test and obvious the first time a real form is reset.</text>
</svg>

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Passing a string contributes one name and value pair using the host element name attribute. Passing null contributes nothing at all, which is how an empty control is made absent from the payload rather than present and blank. Passing a File contributes it as a file entry, exactly as a file input would. Passing a FormData contributes every entry it holds, which is how one element supplies several pairs. Passing an empty string is different from passing null: it submits a blank value." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What setFormValue accepts, and what each produces</title>
  <desc>Passing a string contributes one name and value pair using the host element name attribute. Passing null contributes nothing at all, which is how an empty control is made absent from the payload rather than present and blank. Passing a File contributes it as a file entry, exactly as a file input would. Passing a FormData contributes every entry it holds, which is how one element supplies several pairs. Passing an empty string is different from passing null: it submits a blank value.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Argument</text>
  <text x="240" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Contributes</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">a string</text>
  <text x="240" y="66" font-size="10" fill="#6b5f75" font-family="inherit">one pair, under the host&amp;#39;s name attribute</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">null</text>
  <text x="240" y="100" font-size="10" fill="#2d6342" font-family="inherit">nothing — the field is absent, not blank</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">an empty string</text>
  <text x="240" y="134" font-size="10" fill="#b07a55" font-family="inherit">one pair with a blank value</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">a File</text>
  <text x="240" y="168" font-size="10" fill="#6b5f75" font-family="inherit">a file entry, as a file input would</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">a FormData</text>
  <text x="240" y="202" font-size="10" fill="#6b5f75" font-family="inherit">every entry it holds — several pairs</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">The null versus empty-string distinction is worth being deliberate about: one omits the key, the other sends it blank.</text>
</svg>

## Failure Modes and Edge Cases

### 1. Contributing more than one value

A date-range control needs two name/value pairs. Pass a `FormData` to `setFormValue` rather than a string:

```typescript
const fd = new FormData();
fd.append(`${this.name}From`, from);
fd.append(`${this.name}To`, to);
this.#internals.setFormValue(fd);   // a string here would submit only one value
```

Remember that `formStateRestoreCallback` then receives a `FormData` too.

### 2. `setFormValue` before connection

Called in the constructor, it is discarded with no warning and the first submit is empty. `connectedCallback` is the earliest safe point.

### 3. The host takes `aria-invalid`

Writing `this.setAttribute('aria-invalid', …)` puts the attribute on the host, where a consumer cannot override it. `internals.ariaInvalid` writes the same information into the accessibility tree at a lower precedence, which is what a reusable control wants.

### 4. Validity set while disabled

A disabled native control is exempt from constraint validation. An element that keeps reporting `valueMissing` while disabled blocks `form.checkValidity()` on a field nobody can fill.

### 5. Framework interop

Some frameworks set attributes, others set properties. Implementing the property setter *and* observing the attribute covers both; implementing only one produces a control that works in exactly one framework.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Connected fires when the element enters the document, which is when the value is first published. State restore fires only on a back-navigation or an autofill path, before the reader interacts. Disabled fires whenever the element or an ancestor fieldset changes its disabled state, including at mount. Reset fires whenever the owning form is reset, at any point. Only the first is guaranteed; the others depend on what the reader does." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The order the four callbacks fire in, in real use</title>
  <desc>Connected fires when the element enters the document, which is when the value is first published. State restore fires only on a back-navigation or an autofill path, before the reader interacts. Disabled fires whenever the element or an ancestor fieldset changes its disabled state, including at mount. Reset fires whenever the owning form is reset, at any point. Only the first is guaranteed; the others depend on what the reader does.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">The order the four callbacks fire in, in real use</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">connected</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the element joins the</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">document — publish now</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">restore</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">back-navigation or</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">autofill, before use</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">disabled</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the element or an</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">ancestor fieldset</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">reset</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the owning form is</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reset, at any point</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Only the first is guaranteed to fire. The rest are conditional, which is why omitting them fails silently rather than loudly.</text>
</svg>

## Verification Checklist

- [ ] `new FormData(form).get(name)` returns the value
- [ ] `form.checkValidity()` is false when the element is invalid
- [ ] Clicking the associated `<label>` focuses the inner input
- [ ] `form.reset()` returns the element to its initial value
- [ ] A wrapping `<fieldset disabled>` disables it and clears its validity
- [ ] Back-navigation restores the value
- [ ] `aria-invalid` set by a consumer still wins
- [ ] Setting the `value` property and the `value` attribute both work

## Common Pitfalls

- **Publishing the value in the constructor.** There is no owning form yet, so the call is discarded and the first submit is empty. `connectedCallback` is the earliest safe point.
- **A hidden mirror input.** It fixes `FormData` and nothing else, and it adds a second entry to `form.elements` so every field iteration sees the control twice.
- **Omitting `delegatesFocus`.** A label click and a summary link both call `focus()` on the host, which does nothing, so both appear broken for no visible reason.
- **Keeping validity while disabled.** Native disabled controls are exempt from constraint validation. A control that keeps reporting `valueMissing` blocks a submit nobody can unblock.
- **Setting `aria-invalid` on the host.** It takes the attribute away from consumers, who can then no longer override it. `internals.ariaInvalid` writes the same state at a lower precedence.

---

**Related**

- [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/) — the contract this implements
- [Validating Inputs Across Shadow DOM Boundaries](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/) — labels, describedby and queries across the boundary
- [Best Practices for Uncontrolled Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) — reading the values at submit

← [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)

## Frequently Asked Questions

<details>
<summary><strong>Where should attachInternals be called?</strong></summary>

In the constructor, exactly once. It throws on a second call and it throws entirely if the class does not declare static formAssociated. What must not happen in the constructor is setFormValue or setValidity: the element has no owning form yet, so those calls are discarded. Attach in the constructor, publish in connectedCallback.

</details>

<details>
<summary><strong>How do I submit more than one value from one element?</strong></summary>

Pass a FormData to setFormValue instead of a string, appending one entry per value with distinct names. The pairs then appear in the form's FormData exactly as if they had been separate inputs. Note that formStateRestoreCallback will hand you a FormData back rather than a string, so the restore path has to handle both shapes.

</details>

<details>
<summary><strong>Does this work inside a framework that manages the DOM?</strong></summary>

Yes, with one caveat: some frameworks set properties and others set attributes, so implement both the property accessor and observedAttributes. Beyond that the element behaves as a native input, which means framework form libraries that read FormData or listen for input events need no special support — which is most of the point of using form association rather than a bespoke binding.

</details>

