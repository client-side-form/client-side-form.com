---
layout: page.njk
title: "Web Components and Form Association"
description: "Make a custom element a real form control with ElementInternals — contributing to FormData, participating in constraint validation, and responding to reset, disable and back-navigation restore."
slug: web-components-and-form-association
type: topic
breadcrumb: "Framework Adapters & Custom Hooks > Web Components and Form Association"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Web Components and Form Association"
  parent: "Framework Adapters"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Web Components and Form Association",
      "description": "Make a custom element a real form control with ElementInternals — contributing to FormData, participating in constraint validation, and responding to reset, disable and back-navigation restore.",
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
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I still need a hidden input inside the element?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No, and it causes problems. setFormValue is what puts the value into FormData, and a hidden mirror input additionally appears in form.elements, which means anything iterating fields sees the control twice — including first-invalid queries and per-field render loops. The mirror also has to be kept in sync manually, which is one more place for the value to diverge."
          }
        },
        {
          "@type": "Question",
          "name": "How does a form-associated element report a message?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Through setValidity, whose second argument is the message and whose third is the anchor element the browser focuses when reportValidity is called. Pass the inner focusable node as the anchor, not the host, or the native bubble is positioned against a wrapper. If your form renders its own messages rather than using native bubbles, you still want setValidity so that form.checkValidity and the invalid event behave, and you read validationMessage yourself."
          }
        },
        {
          "@type": "Question",
          "name": "What about browsers without ElementInternals?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Feature-detect and degrade: if attachInternals is unavailable, fall back to rendering a real hidden input and wiring value and validity to it manually. The fallback is worse — it doubles the entry in form.elements and cannot participate in reset or disable — but it keeps the form submitting. Guard the whole formAssociated branch rather than sprinkling checks through the class."
          }
        },
        {
          "@type": "Question",
          "name": "Should the element own its validation rules?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only structural ones — required, maxlength, a shape it is inherently responsible for, exactly what a native input reports. Business rules belong in the form's validation pipeline, because they change per form and per context. An element that imports your schema library is no longer a reusable control; it is one application's component wearing a custom tag."
          }
        }
      ]
    }
  ]
}
</script>

# Web Components and Form Association

A design-system input built as a custom element sits outside every assumption a form makes. It is not in `form.elements`, `FormData` does not see it, `form.reset()` does not reach it, native constraint validation ignores it, and a label pointing at it associates with nothing. Making it behave like an input is not styling work — it is implementing a contract the platform has already written down.

## Problem Statement

The sub-problem is *participation*. A `<input>` participates in its form: it contributes a name/value pair on submit, it reports validity, it responds to reset, it is reachable by label association and by the constraint validation API. A custom element gets none of that by default, and the workarounds teams reach for — a hidden mirror input, a value prop passed up through a framework, a `FormData` patch at submit time — each solve one facet and leave the others broken.

`ElementInternals` and the `formAssociated` flag are the platform's answer, and they cover every facet at once. The remaining difficulty is that a shadow root also breaks label association, `aria-describedby` and focus delegation, so a form-associated element needs both halves.

## State Machine Specification

A form-associated element has to keep three things in agreement: its own value, what it reports to the form, and what it reports to assistive technology.

| Element event | `setFormValue` | `setValidity` | ARIA |
|---|---|---|---|
| value changed by the reader | new value | re-evaluate | `aria-invalid` follows validity, after first blur |
| value set programmatically | new value | re-evaluate | unchanged until blur or submit |
| `formResetCallback` | default value | cleared | `aria-invalid` removed |
| `formDisabledCallback(true)` | unchanged | cleared while disabled | `aria-disabled` reflected |
| `formStateRestoreCallback` | restored value | re-evaluate | unchanged |

The three reset-adjacent callbacks are the ones most implementations omit, and each has a visible symptom: a reset button that leaves the control populated, a fieldset disable that leaves it interactive, and a back-navigation restore that loses it.

## Core Implementation

```typescript
export class TextFieldElement extends HTMLElement {
  /** The single flag that makes the element eligible to participate. */
  static formAssociated = true;

  #internals: ElementInternals;
  #input: HTMLInputElement;
  #value = '';
  #touched = false;

  constructor() {
    super();
    // attachInternals() may only be called once, and only on a formAssociated
    // element. It is the handle for value, validity and the ARIA properties.
    this.#internals = this.attachInternals();
    // delegatesFocus makes focus() on the host land on the first focusable
    // child, which is what label clicks and error-summary links depend on.
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = `<input part="input" />`;
    this.#input = root.querySelector('input')!;

    this.#input.addEventListener('input', () => {
      this.#value = this.#input.value;
      // Tell the form what to submit. Without this, FormData sees nothing.
      this.#internals.setFormValue(this.#value);
      this.#validate();
    });
    this.#input.addEventListener('blur', () => { this.#touched = true; this.#reflectAria(); });
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }

  get value() { return this.#value; }
  set value(v: string) {
    this.#value = v;
    this.#input.value = v;
    this.#internals.setFormValue(v);
    this.#validate();
  }

  #validate(): void {
    const missing = this.hasAttribute('required') && this.#value.trim() === '';
    if (missing) {
      // The third argument is the anchor: the element the browser focuses and
      // positions its bubble against when reportValidity() is called.
      this.#internals.setValidity({ valueMissing: true },
        this.getAttribute('data-required-message') ?? 'Enter a value', this.#input);
    } else {
      this.#internals.setValidity({});      // an empty object means "valid"
    }
    this.#reflectAria();
  }

  #reflectAria(): void {
    // ariaInvalid on internals writes into the accessibility tree WITHOUT
    // putting an attribute on the host — so a consumer's own aria-invalid
    // still wins, which is the documented precedence and the one you want.
    this.#internals.ariaInvalid =
      this.#touched && !this.#internals.validity.valid ? 'true' : null;
  }

  /** Fired when the owning form is reset. Without it, reset does nothing here. */
  formResetCallback(): void {
    this.#touched = false;
    this.value = this.getAttribute('value') ?? '';
    this.#internals.setValidity({});
  }

  /** Fired when the element, or an ancestor fieldset, is disabled. */
  formDisabledCallback(disabled: boolean): void {
    this.#input.disabled = disabled;
    if (disabled) this.#internals.setValidity({});   // a disabled control is not invalid
  }

  /** Fired on back-navigation restore and on some autofill paths. */
  formStateRestoreCallback(state: string): void {
    this.value = state;
  }
}
customElements.define('x-text-field', TextFieldElement);
```

<svg viewBox="0 8 690 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="What a form-associated custom element gains: appearing in FormData, participating in constraint validation, responding to reset and disable, restoring on back-navigation, and exposing ARIA state through internals." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Five capabilities the formAssociated flag unlocks</title>
  <desc>With setFormValue called, the element contributes a name and value pair to FormData exactly like a native input, so nothing at the submit boundary needs to know it is custom. With setValidity, it participates in constraint validation, so form.checkValidity and the invalid event include it. The formResetCallback makes form.reset reach it. The formDisabledCallback makes an ancestor fieldset's disabled state reach it. The formStateRestoreCallback makes back-navigation restore its value. And ariaInvalid on internals writes into the accessibility tree without occupying the host's attribute, so a consumer can still override it.</desc>
  <rect x="0" y="8" width="690" height="226" fill="#f9f5fb"/>
  <rect x="14" y="86" width="164" height="66" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="96" y="110" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">ElementInternals</text>
  <text x="96" y="128" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">static formAssociated</text>
  <text x="96" y="144" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">= true</text>
  <path d="M178,119 H206 V38 H234" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,119 H206 V80 H234" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,119 H234" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,119 H206 V158 H234" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M178,119 H206 V200 H234" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="234" y="20" width="200" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="246" y="42" font-size="10" fill="#1e1a24" font-family="inherit">setFormValue → FormData</text>
  <text x="448" y="42" font-size="9.5" fill="#6b5f75" font-family="inherit">submits like a native input</text>
  <rect x="234" y="62" width="200" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="246" y="84" font-size="10" fill="#1e1a24" font-family="inherit">setValidity → constraints</text>
  <text x="448" y="84" font-size="9.5" fill="#6b5f75" font-family="inherit">checkValidity sees it</text>
  <rect x="234" y="104" width="200" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="246" y="126" font-size="10" fill="#1e1a24" font-family="inherit">formResetCallback</text>
  <text x="448" y="126" font-size="9.5" fill="#6b5f75" font-family="inherit">form.reset() reaches it</text>
  <rect x="234" y="146" width="200" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="246" y="168" font-size="10" fill="#1e1a24" font-family="inherit">formDisabledCallback</text>
  <text x="448" y="168" font-size="9.5" fill="#6b5f75" font-family="inherit">an ancestor fieldset works</text>
  <rect x="234" y="188" width="200" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="246" y="210" font-size="10" fill="#1e1a24" font-family="inherit">formStateRestoreCallback</text>
  <text x="448" y="210" font-size="9.5" fill="#6b5f75" font-family="inherit">back-navigation restores</text>
</svg>

## Integration Guidance

A form-associated element is a native input as far as the rest of the form is concerned, which means everything else on this site applies unchanged. `FormData` reads it, so the pattern in [best practices for uncontrolled form state](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) works. It appears in `form.elements`, so the first-invalid query from [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/) finds it — provided `delegatesFocus` is set, or `focus()` lands on the host and goes nowhere.

Schema validation still belongs outside the element. The element should report *structural* validity — required, too long, wrong shape — through `setValidity`, and leave business rules to the form's own pipeline, exactly as native inputs do. An element that imports your schema library is a component that cannot be reused by the next form.

Framework adapters treat it as an input with a `value` property and an `input` event, so the contracts in [framework adapters and custom hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/) apply without modification. The one wrinkle is that some frameworks set properties rather than attributes; supporting both means implementing the property setter as above and observing the attribute.

## Edge Cases and Failure Modes

**A label that points nowhere.** `<label for="x">` associates with a form-associated custom element, and clicking it focuses the host — which does nothing unless `delegatesFocus: true` was set on the shadow root. This is the single most common report.

**Multiple values from one element.** A date-range control contributing two pairs needs `setFormValue` with a `FormData` object rather than a string. Passing a string silently submits one value.

**Validity reported before the element is connected.** `attachInternals()` in the constructor is fine; calling `setValidity` there is not, because the element has no form yet. Do it in `connectedCallback` or on the first value change.

**A disabled element reporting invalid.** Native disabled controls are exempt from constraint validation. Clearing validity in `formDisabledCallback` matches that; not doing so blocks submits on a control the reader cannot reach.

**Restoring the wrong shape.** `formStateRestoreCallback` receives whatever was passed to `setFormValue`, which for a multi-value control is a `FormData`, not a string. Handle both.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Without formResetCallback, a reset button visibly clears the native inputs and leaves the custom ones populated — reported as “reset is broken&quot;. Without formDisabledCallback, wrapping a section in a disabled fieldset greys out the native inputs and leaves the custom ones interactive, and a submit is then blocked by a control that looks unavailable. Without formStateRestoreCallback, going back to the form loses only the custom fields. Without setFormValue, the payload is simply missing them." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The reports each missing callback produces</title>
  <desc>Without formResetCallback, a reset button visibly clears the native inputs and leaves the custom ones populated — reported as “reset is broken&quot;. Without formDisabledCallback, wrapping a section in a disabled fieldset greys out the native inputs and leaves the custom ones interactive, and a submit is then blocked by a control that looks unavailable. Without formStateRestoreCallback, going back to the form loses only the custom fields. Without setFormValue, the payload is simply missing them.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Missing</text>
  <text x="250" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The bug report says</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">setFormValue</text>
  <text x="250" y="66" font-size="10" fill="#a63d6f" font-family="inherit">“the field does not submit”</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">formResetCallback</text>
  <text x="250" y="100" font-size="10" fill="#a63d6f" font-family="inherit">“reset is broken — it only clears some fields”</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">formDisabledCallback</text>
  <text x="250" y="134" font-size="10" fill="#a63d6f" font-family="inherit">“the disabled section is still editable”</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">formStateRestoreCallback</text>
  <text x="250" y="168" font-size="10" fill="#a63d6f" font-family="inherit">“going back loses some of my answers”</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">None of these mentions custom elements, which is why they are usually filed against the form rather than the component.</text>
</svg>

## Troubleshooting Reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| The value is missing from `FormData` | Check that `name` is set on the host and `setFormValue` ran | Set the value on every change, including programmatic ones |
| Clicking the label does nothing | Check `delegatesFocus` on the shadow root | Attach with `{ delegatesFocus: true }` |
| `form.reset()` leaves it populated | Check for `formResetCallback` | Implement it; restore the initial attribute value |
| Submit is blocked by a hidden control | Check whether validity is cleared when disabled | Clear it in `formDisabledCallback` |
| The error message never shows | Check the anchor argument to `setValidity` | Pass the inner focusable element as the anchor |

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Place the element in a form and assert that FormData carries its value. Make it invalid and assert that form.checkValidity is false. Call form.reset and assert the value returns to its initial state. Wrap it in a disabled fieldset and assert the inner control is disabled and the form is not blocked. Four one-line assertions, each covering a callback that is otherwise silently absent." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four assertions that cover the whole contract</title>
  <desc>Place the element in a form and assert that FormData carries its value. Make it invalid and assert that form.checkValidity is false. Call form.reset and assert the value returns to its initial state. Wrap it in a disabled fieldset and assert the inner control is disabled and the form is not blocked. Four one-line assertions, each covering a callback that is otherwise silently absent.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Four assertions that cover the whole contract</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">submits</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">FormData carries</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">its value</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">validates</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">form.checkValidity()</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">sees it</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">resets</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">form.reset() returns</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">it to initial</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">disables</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">a disabled fieldset</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reaches it</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Component tests that only render the element pass in all four cases while the form is broken in all four.</text>
</svg>

### Interoperating with frameworks

A form-associated element earns most of its value at the boundary with whatever framework the surrounding application uses, because that is where a bespoke component contract would otherwise have to be reimplemented once per framework. Three details decide whether that boundary is smooth.

**Attributes and properties are both used.** Some frameworks set attributes for anything that looks like a string and properties for anything that does not; others set properties whenever one exists. Supporting only one produces a control that works in exactly one framework, and the failure is silent — the value simply never arrives. Implement the property accessor, list the attribute in `observedAttributes`, and have both route through the same internal setter so there is one place where a value becomes the element's state:

```typescript
static observedAttributes = ['value'];
attributeChangedCallback(name: string, _old: string | null, next: string | null) {
  // Route through the same setter the property uses, so an attribute write and
  // a property write cannot produce different internal state.
  if (name === 'value') this.value = next ?? '';
}
```

**Events must be composed.** An event dispatched from inside a shadow root does not escape it unless `composed` is true, so a framework listening on a parent for `input` or `change` sees nothing. Dispatch every form-facing event with `{ bubbles: true, composed: true }`, and dispatch the standard names rather than custom ones where a standard name fits — a framework's built-in binding is looking for `input`, not for `x-value-changed`.

**Server rendering has no custom elements.** A framework that renders on the server produces the element's tag and its light-DOM children, and nothing else, because `customElements.define` has not run. That is usually acceptable — the element upgrades on hydration — but it means the server-rendered HTML must still contain something meaningful, and it means anything the element renders into its shadow root is absent from the first paint. Where that matters, render a light-DOM fallback the element replaces on upgrade, and reserve its space so the upgrade does not shift the layout.

## Testing and QA Hooks

The valuable assertions are about participation, not rendering. Construct a form, place the element in it, and assert `new FormData(form).get('name')` returns the value; assert `form.checkValidity()` is false when the element is invalid; assert `form.reset()` empties it; assert a wrapping `<fieldset disabled>` disables it. Each of those is one line and covers a callback that is otherwise silently missing.

Expose a `part` on the inner control so tests and consumers can target it without piercing the shadow root, and mirror validity to a `data-invalid` attribute on the host so a browser test can assert state without reaching into internals.

### What the element should not own

A form control that participates properly is easy to over-scope, because once it can report validity it is tempting to let it decide what valid means. Three responsibilities belong outside it, and keeping them out is what makes the element reusable by the next form rather than by this one.

Business rules belong to the application. The element can say a value is missing, too long, or not a number, because those are properties of the control itself and a native input reports exactly the same things. Whether an amount exceeds a credit limit, whether a date falls inside a booking window, whether a code is still valid — none of that is knowable from the control, and an element that imports the application's schema has stopped being a control.

Message wording belongs to the form. The element supplies a default so it is usable on its own, and accepts an override so a form can say something better. Hard-coding the sentence means every consumer inherits one team's voice, and the first consumer who needs different wording forks the component.

Layout of the message belongs to the design system, not to the element's internals. Where the message is rendered — beside the control, under it, inside a shared summary — differs per form, which is why the element exposes state and leaves the rendering to whoever composed it. An element that renders its own message in its own position is fine as a whole-field component and wrong as a leaf control, and the distinction is worth deciding before the first consumer.

## Common Pitfalls

- **Forgetting `static formAssociated = true`.** `attachInternals()` then throws, and the error message does not say why.
- **A hidden mirror input instead of internals.** It fixes `FormData` and nothing else, and it doubles the value in `form.elements`.
- **Validating business rules inside the element.** It couples a reusable control to one application's schema.
- **Setting `aria-invalid` on the host instead of `internals.ariaInvalid`.** It takes the attribute away from consumers, who then cannot override it.
- **Skipping `formDisabledCallback`.** An ancestor `<fieldset disabled>` then has no effect, which is invisible until a reader hits a blocked submit.

---

**Related**

- [Form-Associated Custom Elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/) — the implementation walked through end to end
- [Validating Inputs Across Shadow DOM Boundaries](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/) — labels, describedby and queries across the boundary
- [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/) — the adapter contract this satisfies

← [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/)

## Frequently Asked Questions

<details>
<summary><strong>Do I still need a hidden input inside the element?</strong></summary>

No, and it causes problems. setFormValue is what puts the value into FormData, and a hidden mirror input additionally appears in form.elements, which means anything iterating fields sees the control twice — including first-invalid queries and per-field render loops. The mirror also has to be kept in sync manually, which is one more place for the value to diverge.

</details>

<details>
<summary><strong>How does a form-associated element report a message?</strong></summary>

Through setValidity, whose second argument is the message and whose third is the anchor element the browser focuses when reportValidity is called. Pass the inner focusable node as the anchor, not the host, or the native bubble is positioned against a wrapper. If your form renders its own messages rather than using native bubbles, you still want setValidity so that form.checkValidity and the invalid event behave, and you read validationMessage yourself.

</details>

<details>
<summary><strong>What about browsers without ElementInternals?</strong></summary>

Feature-detect and degrade: if attachInternals is unavailable, fall back to rendering a real hidden input and wiring value and validity to it manually. The fallback is worse — it doubles the entry in form.elements and cannot participate in reset or disable — but it keeps the form submitting. Guard the whole formAssociated branch rather than sprinkling checks through the class.

</details>

<details>
<summary><strong>Should the element own its validation rules?</strong></summary>

Only structural ones — required, maxlength, a shape it is inherently responsible for, exactly what a native input reports. Business rules belong in the form's validation pipeline, because they change per form and per context. An element that imports your schema library is no longer a reusable control; it is one application's component wearing a custom tag.

</details>

