---
layout: page.njk
title: "Indicating Required and Optional Fields"
description: "Mark required and optional fields so every user knows what they must answer before they make a mistake: asterisk conventions and their explanation, marking optional fields instead, required and aria-required semantics, groups, and how required messages should read."
slug: indicating-required-and-optional-fields
type: howto
breadcrumb: "Required vs Optional"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Indicating Required and Optional Fields"
  parent: "Error Summary and Messaging"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Indicating Required and Optional Fields",
      "description": "Mark required and optional fields so every user knows what they must answer before they make a mistake: asterisk conventions and their explanation, marking optional fields instead, required and aria-required semantics, groups, and how required messages should read.",
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
          "name": "Error Summary and Messaging",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Indicating Required and Optional Fields",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/indicating-required-and-optional-fields/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Indicate required and optional form fields accessibly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Reduce optional fields first"
        },
        {
          "@type": "HowToStep",
          "name": "Mark the exception"
        },
        {
          "@type": "HowToStep",
          "name": "Set required (or aria-required) on required inputs"
        },
        {
          "@type": "HowToStep",
          "name": "Hide decorative asterisks from assistive technology"
        },
        {
          "@type": "HowToStep",
          "name": "State group requirements in text"
        },
        {
          "@type": "HowToStep",
          "name": "Write required messages as instructions"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is the asterisk convention understood well enough?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Many experienced web users recognise it, but not all users do, and its meaning is not obvious from the glyph. If you use it, explain it at the top of the form. Marking the (usually few) optional fields is clearer for most audiences."
          }
        },
        {
          "@type": "Question",
          "name": "Should I use aria-required or required?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use required on native inputs; it provides both the accessible state and native validation (which novalidate can suppress). Use aria-required on custom widgets that are not native form controls, or when you want the state without any native behaviour."
          }
        },
        {
          "@type": "Question",
          "name": "How do I indicate required for a custom element?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A form-associated custom element can set internals.ariaRequired = \"true\" and report valueMissing through setValidity, so it behaves like a native required input, as in building Lit form controls with ElementInternals."
          }
        }
      ]
    }
  ]
}
</script>

# Indicating Required and Optional Fields

A red asterisk with no explanation, placed after the label in a colour that fails contrast and read aloud by screen readers as "star", is the most common way forms say "required" — and many users do not know what it means until submitting shows them a wall of errors.

Users should learn what they must answer *before* they make a mistake. That needs a convention stated on the page, an indicator that is visible and understandable without colour, and markup that exposes the required state to assistive technology without doubling up. This page, part of [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/), compares the conventions and implements the one that works best for most forms.

---

## Context and prerequisites

Two conventions, and a principle for choosing:

- **Mark required fields** (usually with an asterisk). Works when most fields are optional. Needs an explanation at the top of the form ("Fields marked * are required") and an accessible version of the marker.
- **Mark optional fields** ("(optional)" after the label). Works when most fields are required — which is true of most well-designed forms, because optional questions should be rare. Needs no legend: the word explains itself.

Semantics:

- **`required`** on a native input sets the accessible required state (announced as "required"), and enables native `valueMissing` validation unless the form has `novalidate`.
- **`aria-required="true"`** sets the state without native validation — for custom controls or when you validate entirely in code.
- Do not also put the word "required" in the label's visible text *and* set `required`, or screen readers say "required" twice.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing marking required fields with an asterisk and marking optional fields with the word optional, across when each fits, explanation needed and screen-reader behaviour." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two conventions compared</title>
  <desc>Marking required fields with an asterisk fits forms where most fields are optional, needs a legend explaining the asterisk, and the asterisk should be hidden from screen readers because the required attribute already announces the state. Marking optional fields with the word optional fits forms where most fields are required, needs no legend, and is read naturally as part of the label, while required fields carry the required attribute.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Aspect</text>
  <text x="190.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Mark required (*)</text>
  <text x="433.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Mark optional</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">fits when</text>
  <text x="190.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">most fields optional</text>
  <text x="433.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">most fields required (usual)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">explanation</text>
  <text x="190.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">legend needed</text>
  <text x="433.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">self-explanatory</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">screen reader</text>
  <text x="190.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">hide *, rely on required</text>
  <text x="433.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;(optional)&quot; read with label</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">visual noise</text>
  <text x="190.8" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">many asterisks</text>
  <text x="433.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">few markers</text>
</svg>

---

## The core pattern: mark optional fields, expose required state once

```html
<form novalidate>
  <!-- Most fields are required: say nothing extra visually; set the state. -->
  <label for="full-name">Full name</label>
  <input id="full-name" name="full-name" autocomplete="name" required>

  <label for="email">Email address</label>
  <input id="email" name="email" type="email" autocomplete="email" required>

  <!-- The rare optional field says so in its label. -->
  <label for="company">Company name (optional)</label>
  <input id="company" name="company" autocomplete="organization">

  <!-- Groups: state the requirement in the legend; required on one radio. -->
  <fieldset>
    <legend>How should we contact you?</legend>
    <input type="radio" id="c-email" name="contact" value="email" required>
    <label for="c-email">Email</label>
    <input type="radio" id="c-phone" name="contact" value="phone">
    <label for="c-phone">Phone</label>
  </fieldset>
</form>
```

```html
<!-- If you must use asterisks: explain them, and hide the glyph from AT. -->
<p class="form-legend">Fields marked with <span aria-hidden="true">*</span><span class="visually-hidden">an asterisk</span> are required.</p>
<label for="phone">Phone number <span class="req" aria-hidden="true">*</span></label>
<input id="phone" name="phone" type="tel" required>
```

```css
.req { color: #8a1c14; font-weight: 700; }   /* ≥ 4.5:1; never the only signal */
```

---

## Step-by-step walkthrough

1. **Reduce optional fields first.** Every optional question is one users must decide whether to answer. Remove the ones you do not need; the rest become the exception.
2. **Mark the exception.** If most fields are required, add "(optional)" to optional labels. If most are optional, mark required ones with an asterisk and explain it at the top.
3. **Set `required` (or `aria-required`) on required inputs.** Screen readers announce "required" from the attribute; with `novalidate`, you keep your own error messages, per [using the Constraint Validation API with custom form state](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/).
4. **Hide decorative asterisks from assistive technology.** `aria-hidden="true"` on the asterisk avoids "star" being read alongside the "required" state.
5. **State group requirements in text.** Legends such as "How should we contact you?" plus `required` on one radio; for "at least one" groups, say so in the hint, as in [requiring at least one of several fields](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/requiring-at-least-one-of-several-fields/).
6. **Write required messages as instructions.** "Enter your full name", not "Full name is required" — tell users what to do.

### Why required markers matter for everyone, not only assistive technology

Required indicators are usually discussed as an accessibility feature, but their main benefit is planning. People filling in a long form decide how much effort to spend on each question and whether they have the information to hand — an account number, a reference, a document. Knowing up front which questions they can skip lets them gather what they need and move quickly through the rest. That is especially important for people with cognitive disabilities, anxiety about forms, or limited time, and it reduces the number of failed submits for everyone, which in turn reduces how often the error machinery — summaries, focus moves, announcements — has to run at all.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for choosing how to indicate required and optional fields based on the proportion of optional fields." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which convention for this form?</title>
  <desc>If the form has no optional fields at all, add a single sentence such as all fields are required, or nothing, and set required on each input. If most fields are required and a few are optional, mark the optional ones with the word optional in their labels. Otherwise, when most fields are optional, mark the required ones with an explained asterisk hidden from assistive technology, relying on the required attribute for screen readers.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">No optional fields?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Set required; optional sentence at top</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Most fields required?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Mark optional fields</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Asterisk, explained</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Legend at top; * hidden from AT.</text>
</svg>

### Required state and error messages work together

The required indicator and the required-field error are two halves of one conversation. The indicator sets expectations before the user acts; the error explains, after a submit or blur, what is still missing. They should use consistent language: if the label says "(optional)" for the company field, no error should ever demand a company name; if a field is marked required, its empty-field message should name it and say what to enter. Consistency matters most in the error summary, where messages appear away from their labels — "Enter your full name" reads correctly there, while "This field is required" does not identify which field is meant. Keeping indicator, label and message aligned is easiest when all three are generated from the same field definition.

---

## Failure modes and edge cases

### 1. Asterisk colour as the only signal

A red asterisk that fails contrast, or whose meaning is conveyed only by colour, fails for low-vision and colour-blind users. The asterisk must meet contrast and be explained in text.

### 2. "Required" said twice

`<label>Email (required)</label><input required>` makes screen readers say "Email required, edit text, required". Choose one: the visible word *or* the attribute's announcement — the attribute is usually enough.

### 3. Conditionally required fields

A field that becomes required when another answer changes should update its label marker and `required` state together, and never show a required error before the user has had a chance to answer, per [conditional required fields without cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/).

### 4. Native validation bubbles

`required` without `novalidate` shows browser bubbles on submit, in the browser's language and style. Add `novalidate` if you render your own errors.

### 5. Required but pre-filled

A required field with a default value is effectively satisfied. That can be right (a country defaulted from locale) or a trap (a pre-ticked consent box). Never pre-fill consent, and let users change defaults easily.

<svg viewBox="0 0 680 187" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a screen-reader user tabbing through a required field and an optional field, and what the screen reader announces for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>How a required field sounds</title>
  <desc>The user tabs to the full name input, which has the required attribute and no visible marker; the screen reader says full name, edit text, required. The user tabs to the company input, whose label includes the word optional; the screen reader says company name optional, edit text. The asterisk variant, when used, is hidden from assistive technology, so the word star is never read.</desc>
  <rect x="0" y="0" width="680" height="187" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Screen reader</text>
  <path d="M122.7,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Tab to Full name (required attr)</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;Full name, edit text, required&quot;</text>
  <path d="M557.3,97.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,93.0 123.7,97.0 130.7,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Tab to Company (label says optional)</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;Company name (optional), edit text&quot;</text>
  <path d="M557.3,153.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] The form's convention (optional markers or explained asterisks) is used consistently.
- [ ] Required inputs have `required` or `aria-required="true"`.
- [ ] Screen readers announce "required" once per required field.
- [ ] Asterisks, if used, are explained in text and hidden from assistive technology.
- [ ] Markers meet contrast and do not rely on colour.
- [ ] Group requirements are stated in the legend or hint.
- [ ] Required-field messages tell users what to enter.
- [ ] Consent checkboxes are never pre-ticked.

---

## Frequently Asked Questions

<details>
<summary><strong>Is the asterisk convention understood well enough?</strong></summary>

Many experienced web users recognise it, but not all users do, and its meaning is not obvious from the glyph. If you use it, explain it at the top of the form. Marking the (usually few) optional fields is clearer for most audiences.

</details>

<details>
<summary><strong>Should I use aria-required or required?</strong></summary>

Use `required` on native inputs; it provides both the accessible state and native validation (which `novalidate` can suppress). Use `aria-required` on custom widgets that are not native form controls, or when you want the state without any native behaviour.

</details>

<details>
<summary><strong>How do I indicate required for a custom element?</strong></summary>

A form-associated custom element can set `internals.ariaRequired = "true"` and report `valueMissing` through `setValidity`, so it behaves like a native required input, as in [building Lit form controls with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/building-lit-form-controls-with-elementinternals/).

</details>

---

## Related

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
- [Error Styling That Does Not Rely on Colour](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/error-styling-that-does-not-rely-on-colour/)
- [Touched vs Dirty vs Visited: Choosing Field Interaction Flags](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/)

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
