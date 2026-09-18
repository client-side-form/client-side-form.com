---
layout: page.njk
title: "Using the Constraint Validation API With Custom Form State"
description: "Keep native constraint validation — required, pattern, min, type — as a free first line of checks without letting browser bubbles and :invalid styling fight your own error UI. novalidate, setCustomValidity, ValidityState and :user-invalid, wired together."
slug: using-the-constraint-validation-api-with-custom-state
type: howto
breadcrumb: "Constraint Validation API"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Using the Constraint Validation API With Custom Form State"
  parent: "Form Validation Lifecycle"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Using the Constraint Validation API With Custom Form State",
      "description": "Keep native constraint validation — required, pattern, min, type — as a free first line of checks without letting browser bubbles and :invalid styling fight your own error UI. novalidate, setCustomValidity, ValidityState and :user-invalid, wired together.",
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
          "name": "Form Validation Lifecycle",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Using the Constraint Validation API With Custom Form State",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Combine the Constraint Validation API with a custom error UI",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare constraints in HTML"
        },
        {
          "@type": "HowToStep",
          "name": "Add novalidate to the form"
        },
        {
          "@type": "HowToStep",
          "name": "Map ValidityState flags to your own messages"
        },
        {
          "@type": "HowToStep",
          "name": "Route custom rules through setCustomValidity"
        },
        {
          "@type": "HowToStep",
          "name": "Skip controls where willValidate is false"
        },
        {
          "@type": "HowToStep",
          "name": "Style with :user-invalid, not :invalid"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why keep native validation if I have a schema?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because it runs for free, is evaluated continuously, exposes required to assistive technology, and gives you badInput, which a schema cannot see — for a number input with unparsable text, the value your schema receives is an empty string. The schema then handles the rules HTML cannot express."
          }
        },
        {
          "@type": "Question",
          "name": "Is reportValidity() ever the right choice?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For small internal tools where native bubbles are acceptable, yes: it is zero code. For product forms, the bubbles cannot be styled, disappear after a few seconds, are inconsistent across browsers and are not reliably announced, so render your own messages."
          }
        },
        {
          "@type": "Question",
          "name": "Does setCustomValidity work on custom elements?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not directly. A form-associated custom element uses this.internals.setValidity(flags, message, anchor) instead, which feeds the same validity model the form sees. The rest of this page's approach applies unchanged."
          }
        }
      ]
    }
  ]
}
</script>

# Using the Constraint Validation API With Custom Form State

Most custom form systems either ignore the browser's built-in validation entirely — reimplementing `required`, `maxlength` and `type="email"` in JavaScript — or leave it on and end up with native bubbles appearing on top of their own error messages.

There is a middle path that the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) benefits from: let the browser evaluate the constraints you declared in HTML, read its verdict through `ValidityState`, suppress its UI with `novalidate`, and render everything through your own error components. Your custom rules join the same channel through `setCustomValidity`, so the form has one notion of validity.

---

## Context and prerequisites

The Constraint Validation API gives every form control:

- **`el.validity`** — a `ValidityState` with booleans: `valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`, `customError`, and the summary `valid`.
- **`el.validationMessage`** — the browser's localised message for the first failing constraint.
- **`el.checkValidity()`** — returns the boolean and fires an `invalid` event if false.
- **`el.reportValidity()`** — the same, but also shows the native bubble.
- **`el.setCustomValidity(msg)`** — marks the control invalid with your message (`customError`); an empty string clears it.

Adding `novalidate` to the form stops the browser from blocking submission and showing bubbles, but **the validity state is still computed**. That is the key: you keep the evaluation and discard only the presentation.

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting the parts of native validation that novalidate disables with the parts that keep working." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What novalidate turns off, and what it keeps</title>
  <desc>With novalidate on the form, the browser no longer blocks submission and no longer shows its native bubble. It still computes the validity state for every control, still evaluates required, pattern, type, min, max and length constraints, still supports setCustomValidity, and still applies the invalid and user-invalid pseudo-classes. Your code reads that state and renders its own messages.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Turned off by novalidate</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Blocking submit on invalid controls.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The native error bubble.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Auto-focusing the first invalid control.</text>
  <rect x="347.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Still working</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validity flags on every control.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required, pattern, type, min/max, length.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setCustomValidity and customError.</text>
  <text x="359.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">:invalid and :user-invalid styling hooks.</text>
</svg>

---

## The core pattern: native checks, custom rules, one renderer

```typescript
type Messages = Partial<Record<keyof ValidityState, string>>;

// Your own copy for each native failure, so wording matches the rest of the UI
// instead of varying by browser and OS language.
const DEFAULT_MESSAGES: Messages = {
  valueMissing: "This field is required.",
  typeMismatch: "Enter a value in the expected format.",
  patternMismatch: "Check the format of this value.",
  tooShort: "This is too short.",
  tooLong: "This is too long.",
  rangeUnderflow: "This value is too low.",
  rangeOverflow: "This value is too high.",
  stepMismatch: "Use a whole number of steps.",
  badInput: "Enter a number.",
};

const ORDER: (keyof ValidityState)[] = [
  "badInput", "valueMissing", "typeMismatch", "patternMismatch",
  "tooShort", "tooLong", "rangeUnderflow", "rangeOverflow", "stepMismatch", "customError",
];

export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function messageFor(el: FormControl, overrides: Messages = {}): string | null {
  if (el.validity.valid) return null;
  for (const key of ORDER) {
    if (!el.validity[key]) continue;
    // customError carries its own text, set by setCustomValidity below.
    if (key === "customError") return el.validationMessage;
    return overrides[key] ?? el.dataset[`msg${key[0].toUpperCase()}${key.slice(1)}`] ?? DEFAULT_MESSAGES[key] ?? el.validationMessage;
  }
  return el.validationMessage;
}

// Custom rules feed the SAME validity model via setCustomValidity.
export function applyCustomRule(el: FormControl, rule: (value: string) => string | null) {
  // Clear first: a stale custom error would make every native flag irrelevant
  // (customError keeps validity.valid false until explicitly cleared).
  el.setCustomValidity("");
  if (!el.validity.valid) return;          // native failure takes precedence
  const msg = rule(el.value);
  if (msg) el.setCustomValidity(msg);
}

export function validateForm(form: HTMLFormElement, rules: Record<string, (v: string) => string | null>) {
  const errors: Record<string, string> = {};
  for (const el of Array.from(form.elements) as FormControl[]) {
    if (!el.name || !("validity" in el) || !el.willValidate) continue; // willValidate is false for disabled/readonly
    if (rules[el.name]) applyCustomRule(el, rules[el.name]);
    const msg = messageFor(el);
    if (msg) errors[el.name] = msg;
  }
  return errors;
}
```

```html
<form novalidate>
  <label for="age">Age</label>
  <input id="age" name="age" type="number" min="18" required
         data-msg-range-underflow="You must be 18 or over to apply.">
</form>
```

---

## Step-by-step walkthrough

1. **Declare constraints in HTML.** `required`, `type`, `pattern`, `min`, `max`, `minlength`, `maxlength` and `step` are free, fast and understood by assistive technology — `required` also sets the accessible "required" state.
2. **Add `novalidate` to the form.** Evaluation continues; bubbles and submit-blocking stop.
3. **Map `ValidityState` flags to your own messages.** Keep a default table and allow per-field overrides via `data-msg-*` attributes, so wording stays consistent across browsers and matches the guidance in [writing error messages that tell the reader what to do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/).
4. **Route custom rules through `setCustomValidity`.** Always clear first, and let native failures win so the user fixes the basic format before seeing a business rule.
5. **Skip controls where `willValidate` is false.** That flag already encodes the disabled, readonly and `type="hidden"` rules from [skipping validation for disabled and hidden fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/).
6. **Style with `:user-invalid`, not `:invalid`.** `:invalid` matches a required empty field on page load; `:user-invalid` matches only after the user has interacted, which lines up with your own timing rules.

<svg viewBox="0 0 680 425" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow from HTML constraints through the browser&#x27;s validity state and custom rules to a message lookup and the custom error renderer." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>From constraint to rendered message</title>
  <desc>HTML attributes declare constraints. The browser evaluates them continuously into ValidityState, even with novalidate. Custom rules run next and call setCustomValidity only if native checks pass. A message lookup maps the first failing flag to house wording or a per-field override. The custom renderer displays the message, sets aria-invalid and links it with aria-describedby.</desc>
  <rect x="0" y="0" width="680" height="425" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="349.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">HTML constraints</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required, type, pattern, min/max, length.</text>
  <text x="393.4" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Declarative and free; also exposed to assistive technology.</text>
  <path d="M188.7,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.7,89.0 188.7,96.0 192.7,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="349.4" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">ValidityState</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Computed by the browser, novalidate or not.</text>
  <text x="393.4" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">el.validity.valueMissing, typeMismatch, …</text>
  <path d="M188.7,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.7,174.0 188.7,181.0 192.7,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="349.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Custom rules</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setCustomValidity after clearing.</text>
  <text x="393.4" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only if native checks pass.</text>
  <path d="M188.7,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.7,259.0 188.7,266.0 192.7,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="349.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Message lookup</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">House wording per flag, data-msg-* overrides.</text>
  <text x="393.4" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same voice in every browser and locale.</text>
  <path d="M188.7,324.0 V344.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.7,344.0 188.7,351.0 192.7,344.0" fill="#7b4f8a"/>
  <rect x="14.0" y="352.0" width="349.4" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="375.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Your renderer</text>
  <text x="26.0" y="394.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid, aria-describedby, summary.</text>
  <text x="393.4" y="374.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The browser&#x27;s bubble never appears.</text>
</svg>

---

## Failure modes and edge cases

### 1. Forgetting to clear a custom error

`setCustomValidity("x")` makes the control invalid until you call `setCustomValidity("")`. If you set it on blur and never clear it, the field stays invalid after the user fixes it. The helper above clears at the start of every run.

### 2. `badInput` on number fields

For `type="number"`, typing "1e" gives `value === ""` with `validity.badInput === true`. Check `badInput` before `valueMissing`, or you will tell the user a field they typed in is empty. The ordering in `ORDER` handles this; the broader problem is covered in [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).

### 3. `pattern` is anchored and uses the `v` flag

The `pattern` attribute is matched against the whole value (implicitly `^(?:…)$`) and, in current browsers, compiled with the `v` flag, which makes some characters such as unescaped `-` inside a class, `(` or `|` in classes a syntax error. An invalid pattern is silently ignored. Test patterns in the browser, not only in a regex tester.

### 4. Custom elements and shadow DOM

Controls inside a shadow root are not in `form.elements` unless the custom element is form-associated and reports validity through `ElementInternals.setValidity`. See [validating inputs across shadow DOM boundaries](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/).

### 5. `:user-invalid` support

`:user-invalid` is supported in current Chromium, Firefox and Safari. If you must support older browsers, add a class from your own touched state rather than falling back to `:invalid`, which lights up untouched required fields on load.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of ValidityState flags that commonly surprise developers, with the input that triggers them and the recommended message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Native flags worth handling explicitly</title>
  <desc>badInput is triggered by unparsable text in a number or date input and should say enter a number rather than required. valueMissing is triggered by an empty required control. typeMismatch is triggered by a malformed email or URL. patternMismatch is triggered by a value not matching the anchored pattern. stepMismatch is triggered by a number between allowed steps, such as 1.5 with step 1. customError is set by setCustomValidity and carries your own message.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Flag</text>
  <text x="179.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Triggered by</text>
  <text x="427.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Say</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">badInput</text>
  <text x="179.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;1e&quot; in type=number</text>
  <text x="427.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Enter a number&quot;, not &quot;required&quot;</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">valueMissing</text>
  <text x="179.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">empty required control</text>
  <text x="427.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">what to enter, not &quot;required&quot;</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">typeMismatch</text>
  <text x="179.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">malformed email or URL</text>
  <text x="427.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">the expected shape, with an example</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">patternMismatch</text>
  <text x="179.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">value not matching the anchored pattern</text>
  <text x="427.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">the rule in words</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">stepMismatch</text>
  <text x="179.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">1.5 with step=&quot;1&quot;</text>
  <text x="427.6" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Use a whole number&quot;</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">customError</text>
  <text x="179.2" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setCustomValidity(msg)</text>
  <text x="427.6" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">your message, as set</text>
</svg>

---

## Verification checklist

- [ ] No native validation bubble appears in any browser.
- [ ] Submitting with invalid fields is blocked by your code and focus moves to your summary or first error.
- [ ] Every native constraint failure shows your wording, not the browser's.
- [ ] Custom rule errors clear on the next run once the value is fixed.
- [ ] Typing unparsable text in a number field reports "Enter a number", not "required".
- [ ] Disabled and readonly controls are skipped via `willValidate`.
- [ ] Untouched required fields are not styled invalid on page load.
- [ ] Required fields are announced as required by screen readers.

---

## Frequently Asked Questions

<details>
<summary><strong>Why keep native validation if I have a schema?</strong></summary>

Because it runs for free, is evaluated continuously, exposes `required` to assistive technology, and gives you `badInput`, which a schema cannot see — for a number input with unparsable text, the value your schema receives is an empty string. The schema then handles the rules HTML cannot express.

</details>

<details>
<summary><strong>Is reportValidity() ever the right choice?</strong></summary>

For small internal tools where native bubbles are acceptable, yes: it is zero code. For product forms, the bubbles cannot be styled, disappear after a few seconds, are inconsistent across browsers and are not reliably announced, so render your own messages.

</details>

<details>
<summary><strong>Does setCustomValidity work on custom elements?</strong></summary>

Not directly. A form-associated custom element uses `this.internals.setValidity(flags, message, anchor)` instead, which feeds the same `validity` model the form sees. The rest of this page's approach applies unchanged.

</details>

---

## Related

- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
- [Merging Errors From Client, Schema and Server Validators](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/merging-errors-from-multiple-validation-sources/)
- [Form-Associated Custom Elements With ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/)

← [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
