---
layout: page.njk
title: "What Happens to Errors When a Field Is Hidden"
description: "A conditional field that is hidden while invalid can block submit with an error nobody can see or fix. Rules for pausing, clearing and restoring errors when fields unmount, collapse or are switched off by another answer."
slug: errors-for-conditionally-hidden-fields
type: howto
breadcrumb: "Errors on Hidden Fields"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "What Happens to Errors When a Field Is Hidden"
  parent: "Error State Mapping Patterns"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "What Happens to Errors When a Field Is Hidden",
      "description": "A conditional field that is hidden while invalid can block submit with an error nobody can see or fix. Rules for pausing, clearing and restoring errors when fields unmount, collapse or are switched off by another answer.",
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
          "name": "Error State Mapping Patterns",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "What Happens to Errors When a Field Is Hidden",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Handle validation errors for conditionally hidden fields",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare relevance next to the field, as a function of values"
        },
        {
          "@type": "HowToStep",
          "name": "Validate only relevant fields"
        },
        {
          "@type": "HowToStep",
          "name": "Build the payload from relevant fields"
        },
        {
          "@type": "HowToStep",
          "name": "Keep collapsed-but-relevant errors"
        },
        {
          "@type": "HowToStep",
          "name": "Make the summary able to reveal"
        },
        {
          "@type": "HowToStep",
          "name": "Store errors in form state, not in components"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should hidden fields be disabled instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Disabling a native control removes it from FormData and from constraint validation, which gives the right result for irrelevant fields rendered but hidden. It does not help with controlled state or schemas, which still see the value. Use relevance as the rule and disabling as one way to implement it in the DOM."
          }
        },
        {
          "@type": "Question",
          "name": "What about fields hidden by feature flags or permissions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Treat them as irrelevant for this user: not validated, not submitted. If the server requires them regardless, that is a contract bug between client and server, and it should surface as a form-level error rather than a hidden field error."
          }
        },
        {
          "@type": "Question",
          "name": "Is it confusing when an old value reappears after unhiding?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Rarely; it is usually what people expect when they flip an option back. It becomes confusing only after a long gap or a submit. Clear retained hidden values after a successful submit or when the form is reset."
          }
        }
      ]
    }
  ]
}
</script>

# What Happens to Errors When a Field Is Hidden

The most frustrating form bug to report is "the submit button does nothing": a field became invalid, another answer then hid it, and its error still blocks submission from a place the user can no longer see or reach.

Conditional fields are the norm in real forms — "Other (please specify)", a company section that appears for business accounts, a shipping address hidden by "same as billing". [Error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) routes errors to visible components; this page decides what happens to an error when its component goes away, which depends on *why* it went away.

---

## Context and prerequisites

A field disappears for one of three reasons, and each needs a different rule:

- **Logically irrelevant** — another answer made the question not apply ("same as billing" is ticked, so the shipping address is not asked). The field's value should not be validated or submitted, so its errors must be *removed*, not merely hidden.
- **Visually collapsed** — the field still applies but is out of view: a closed accordion section, a later wizard step, a virtualised row scrolled off screen. Its errors are real and must still block submit — and the summary must be able to reveal it.
- **Temporarily unmounted by the framework** — a keyed remount, a tab switch that unmounts inactive panels. The field still applies; state must survive the unmount.

The bug in the introduction is case one handled as case two: the field is irrelevant, but its error is kept.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of three reasons a field can be hidden, whether its value is submitted, whether its errors block submit, and what the error summary does." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Why the field is hidden decides what happens to its error</title>
  <desc>When a field is logically irrelevant because another answer ruled it out, its value is not submitted and its errors are removed so they cannot block submit. When a field is visually collapsed in an accordion or later step, its value is submitted, its errors block submit, and the summary reveals the section before focusing it. When a field is temporarily unmounted by the framework, its value and errors are kept in form state and restored when it remounts.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Hidden because</text>
  <text x="212.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Value submitted</text>
  <text x="342.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Errors block submit</text>
  <text x="487.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Summary does</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">another answer made it irrelevant</text>
  <text x="212.4" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="342.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no; errors removed</text>
  <text x="487.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">not listed</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">collapsed: accordion, later step</text>
  <text x="212.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="342.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="487.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">reveals, then focuses</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">unmounted by the framework</text>
  <text x="212.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="342.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="487.6" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">remounts, then focuses</text>
</svg>

---

## The core pattern: declare relevance, derive everything from it

```typescript
type Values = Record<string, unknown>;

// Each conditional field declares WHEN it applies, as a pure function of values.
// This is the single source of truth for "is this field part of the form right now".
export const relevance: Record<string, (v: Values) => boolean> = {
  shippingAddress: (v) => v.sameAsBilling !== true,
  otherReason: (v) => v.reason === "other",
  companyName: (v) => v.accountType === "business",
  vatNumber: (v) => v.accountType === "business" && v.country !== "US",
};

export const isRelevant = (field: string, v: Values) => relevance[field]?.(v) ?? true;

// Validation only runs for relevant fields; irrelevant fields have NO errors,
// by construction, so a stale one cannot block submit.
export function validateAll(
  v: Values,
  validators: Record<string, (value: unknown, all: Values) => string | null>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, check] of Object.entries(validators)) {
    if (!isRelevant(field, v)) continue;
    const msg = check(v[field], v);
    if (msg) errors[field] = msg;
  }
  return errors;
}

// The payload omits irrelevant fields, so stale hidden values are never sent.
export function toPayload(v: Values): Values {
  return Object.fromEntries(Object.entries(v).filter(([k]) => isRelevant(k, v)));
}
```

Note what this code does *not* do: it does not erase the hidden field's value. If the user unticks "same as billing" again, the address they typed earlier comes back. Relevance controls validation and submission; the value itself is kept until the form is reset or submitted.

---

## Step-by-step walkthrough

1. **Declare relevance next to the field, as a function of values.** Do not infer it from whether a component is mounted — mounting is a rendering detail and differs between accordion, wizard and virtual list.
2. **Validate only relevant fields.** Irrelevant fields produce no errors, so the "invisible blocker" cannot exist. This also keeps [skipping validation for disabled and hidden fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/) consistent with the payload.
3. **Build the payload from relevant fields.** Hidden values stay in state for convenience but never reach the server.
4. **Keep collapsed-but-relevant errors.** A closed accordion section with an invalid field still blocks submit, and its error appears in the summary.
5. **Make the summary able to reveal.** Each summary link knows how to open the section or step containing its field before moving focus, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).
6. **Store errors in form state, not in components.** Then an unmounted field's error survives, and remounting shows it again.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow in which the user selects Other, leaves the explanation empty so it becomes invalid, then changes the answer so the explanation is hidden, and submit is blocked by the hidden error unless relevance is applied." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The sequence that produces an invisible blocker</title>
  <desc>The user chooses Other as the reason, and an explanation field appears. They skip it and it becomes invalid with a required error. They then change the reason to Price, which hides the explanation field. Without relevance, its required error remains in state and silently blocks submit. With relevance, the field is no longer part of the form, so validation produces no error for it and submit proceeds.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="372.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Reason = Other</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Explanation field appears.</text>
  <text x="416.2" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">otherReason is relevant.</text>
  <path d="M200.1,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="196.1,89.0 200.1,96.0 204.1,89.0" fill="#7b4f8a"/>
  <text x="210.1" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">skip field</text>
  <rect x="14.0" y="97.0" width="372.2" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Explanation required, empty</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Error: Tell us the reason.</text>
  <text x="416.2" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Correct: the user must answer while it applies.</text>
  <path d="M200.1,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="196.1,174.0 200.1,181.0 204.1,174.0" fill="#7b4f8a"/>
  <text x="210.1" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">change answer</text>
  <rect x="14.0" y="182.0" width="372.2" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Reason = Price</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Explanation field hidden.</text>
  <text x="416.2" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Without relevance: error kept, submit silently blocked.</text>
  <path d="M200.1,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="196.1,259.0 200.1,266.0 204.1,259.0" fill="#7b4f8a"/>
  <text x="210.1" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">submit</text>
  <rect x="14.0" y="267.0" width="372.2" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Submit</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Relevance says the field does not apply.</text>
  <text x="416.2" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No error produced; value excluded from payload.</text>
</svg>

---

## Failure modes and edge cases

### 1. Using `display: none` checks as relevance

Reading `offsetParent === null` to decide whether a field "counts" treats a collapsed accordion as irrelevant — its errors vanish and invalid data is submitted. Relevance must come from values, not layout.

### 2. Clearing values on hide

Wiping the shipping address when "same as billing" is ticked destroys work if the user unticks it a second later. Keep the value; exclude it from validation and payload. If you must clear (privacy-sensitive fields), clear on submit, not on hide.

### 3. Relevance chains

`vatNumber` depends on `accountType` and `country`. If `country` is itself conditional, relevance must be transitive: a field is irrelevant if any field it depends on is irrelevant. Compute relevance in dependency order, as in [building a field dependency graph](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/building-a-field-dependency-graph/).

### 4. Schema validation ignores relevance

A single Zod object with `vatNumber: z.string().min(1)` fails for personal accounts. Model conditions in the schema with a discriminated union — see [discriminated unions for conditional schemas](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/) — or validate the payload produced by `toPayload`.

### 5. Server errors for hidden fields

A 422 naming a field that is now irrelevant cannot be fixed by the user. Map it to a form-level error that explains what to change, rather than attaching it to an invisible input.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards showing that the same relevance function drives rendering, validation, the payload and the error summary." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One relevance function, four consumers</title>
  <desc>The relevance function takes the current values and returns whether a field applies. Rendering uses it to show or hide the field. Validation uses it to skip irrelevant fields so they produce no errors. The payload builder uses it to omit irrelevant values. The error summary uses it so it never links to a field that does not apply.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Render</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Show only relevant fields.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Validate</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Skip irrelevant fields.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No invisible blockers.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Payload</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Omit irrelevant values.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Summary</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never links to a field that</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">does not apply.</text>
</svg>

---

## Verification checklist

- [ ] Making a field invalid and then hiding it via another answer does not block submit.
- [ ] Unhiding the field restores the previously typed value.
- [ ] Hidden fields' values are absent from the submitted payload.
- [ ] An invalid field inside a collapsed section still blocks submit and appears in the summary.
- [ ] Activating that summary link opens the section and focuses the field.
- [ ] Switching tabs or wizard steps keeps field errors in state.
- [ ] Relevance is computed from values, never from layout or mount state.
- [ ] Server errors for fields that are now irrelevant appear as form-level messages.

---

## Frequently Asked Questions

<details>
<summary><strong>Should hidden fields be disabled instead?</strong></summary>

Disabling a native control removes it from `FormData` and from constraint validation, which gives the right result for irrelevant fields rendered but hidden. It does not help with controlled state or schemas, which still see the value. Use relevance as the rule and disabling as one way to implement it in the DOM.

</details>

<details>
<summary><strong>What about fields hidden by feature flags or permissions?</strong></summary>

Treat them as irrelevant for this user: not validated, not submitted. If the server requires them regardless, that is a contract bug between client and server, and it should surface as a form-level error rather than a hidden field error.

</details>

<details>
<summary><strong>Is it confusing when an old value reappears after unhiding?</strong></summary>

Rarely; it is usually what people expect when they flip an option back. It becomes confusing only after a long gap or a submit. Clear retained hidden values after a successful submit or when the form is reset.

</details>

---

## Related

- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
- [Conditional Required Fields Without Cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/)
- [Skipping Validation for Disabled and Hidden Fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/)

← [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
