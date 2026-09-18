---
layout: page.njk
title: "Skipping Validation for Disabled and Hidden Fields"
description: "Native forms skip disabled controls, but schemas, controlled state and custom validators do not. How to make every layer agree on which fields take part in validation and submission — disabled, readonly, hidden, inert and fieldset-disabled."
slug: skipping-validation-for-disabled-and-hidden-fields
type: howto
breadcrumb: "Disabled & Hidden Fields"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Skipping Validation for Disabled and Hidden Fields"
  parent: "Form Validation Lifecycle"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Skipping Validation for Disabled and Hidden Fields",
      "description": "Native forms skip disabled controls, but schemas, controlled state and custom validators do not. How to make every layer agree on which fields take part in validation and submission — disabled, readonly, hidden, inert and fieldset-disabled.",
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
          "name": "Skipping Validation for Disabled and Hidden Fields",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Exclude disabled and hidden fields from validation consistently",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Adopt the native table as your contract"
        },
        {
          "@type": "HowToStep",
          "name": "Use :disabled matching, not the disabled property"
        },
        {
          "@type": "HowToStep",
          "name": "Build validation input from participating fields"
        },
        {
          "@type": "HowToStep",
          "name": "Never rely on hidden to exclude"
        },
        {
          "@type": "HowToStep",
          "name": "Keep readonly values in the payload"
        },
        {
          "@type": "HowToStep",
          "name": "Make the schema tolerate absence"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does the browser skip readonly fields in validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because the user cannot change them, an error on a readonly field is unactionable. The HTML specification bars readonly controls from constraint validation for that reason, while still submitting their values. If a readonly value can be wrong, validate it on the server."
          }
        },
        {
          "@type": "Question",
          "name": "Should I use aria-disabled instead of disabled?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "aria-disabled=\"true\" keeps the control focusable and in the submission but tells assistive technology it is unavailable. It is useful for buttons where you want users to discover why an action is unavailable. For inputs, it does not exclude the value, so you must also handle participation in code."
          }
        },
        {
          "@type": "Question",
          "name": "Does fieldset disabled affect buttons inside it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Every form-associated element inside a disabled fieldset is disabled, including buttons, except those inside the fieldset's first legend. That makes a disabled fieldset a convenient way to lock a whole section, and a surprising way to lose a section's submit button."
          }
        }
      ]
    }
  ]
}
</script>

# Skipping Validation for Disabled and Hidden Fields

The browser already knows not to validate or submit a disabled control, but your schema, your state store and your custom validators do not — so a disabled "company name" field still fails `required` in Zod, or a `readonly` field that *should* be submitted is dropped because someone treated it like a disabled one.

The [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) assumes a known set of fields takes part in a validation pass. That set is not "every field in state". It is defined by several overlapping HTML attributes whose effects differ in precise ways, and every layer of the form has to apply the same definition.

---

## Context and prerequisites

The native rules, which are the baseline everything else should match:

- **`disabled`** — not focusable, not submitted, **barred from constraint validation**. Applies to the control and to every control inside a `disabled` `fieldset` (except those inside its first `legend`).
- **`readonly`** — focusable, **submitted**, and also barred from constraint validation. Users cannot change it, so native validation assumes there is nothing to report — but the value *is* sent.
- **`hidden` / `display: none`** — still submitted and still validated. A hidden required field that is empty blocks native submit with an error the browser cannot show ("An invalid form control is not focusable" in the console).
- **`inert`** — not focusable or interactive, but still submitted and validated like any hidden field. Inert is about interaction, not participation.
- **`type="hidden"`** — submitted, never validated.

So "hidden" is the dangerous case natively, and "disabled" is the dangerous case in custom code.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of disabled, disabled fieldset, readonly, hidden, inert and input type hidden with whether each is focusable, submitted and validated natively." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>How each attribute affects participation</title>
  <desc>A disabled control and every control in a disabled fieldset are not focusable, not submitted and not validated. A readonly control is focusable and submitted but not validated. A hidden or display none control is not focusable but is submitted and validated, which can block submit invisibly. An inert control is the same as hidden for participation. An input of type hidden is submitted and never validated.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Attribute</text>
  <text x="241.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focusable</text>
  <text x="371.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submitted</text>
  <text x="502.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Validated natively</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">disabled</text>
  <text x="241.3" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="371.7" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="502.1" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">inside fieldset[disabled]</text>
  <text x="241.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="371.7" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="502.1" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">readonly</text>
  <text x="241.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="371.7" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="502.1" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">hidden / display:none</text>
  <text x="241.3" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="371.7" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="502.1" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">yes: invisible blocker</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">inert subtree</text>
  <text x="241.3" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="371.7" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="502.1" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">yes: invisible blocker</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">type=hidden</text>
  <text x="241.3" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="371.7" y="209.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="502.1" y="209.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">never</text>
</svg>

---

## The core pattern: one participation function for every layer

```typescript
export type Participation = { submit: boolean; validate: boolean };

// Mirrors the browser's own rules, so custom validation and native
// validation agree. Call it with the live element when one exists.
export function participation(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): Participation {
  // matches(':disabled') covers BOTH the control's own attribute and an
  // ancestor <fieldset disabled>, including the legend exception.
  if (el.matches(":disabled")) return { submit: false, validate: false };
  if (el instanceof HTMLInputElement && el.type === "hidden") return { submit: true, validate: false };
  if ("readOnly" in el && el.readOnly) return { submit: true, validate: false };
  // Hidden-by-layout and inert fields: the browser WOULD validate them, which
  // is the invisible-blocker bug. Our policy: a field the user cannot see or
  // reach must not block them. Decide relevance from values instead.
  return { submit: true, validate: true };
}

// For schema validation, build the object to validate from participating
// fields only — then the schema never sees a disabled control's stale value.
export function participatingValues(form: HTMLFormElement): Record<string, FormDataEntryValue> {
  // FormData already excludes disabled controls and includes readonly ones:
  // it is the browser's own definition of "submitted".
  return Object.fromEntries(new FormData(form));
}

export function participatingForValidation(form: HTMLFormElement): string[] {
  return (Array.from(form.elements) as HTMLInputElement[])
    .filter((el) => el.name && participation(el).validate)
    .map((el) => el.name);
}
```

For controlled forms without live elements, keep a `disabled` flag per field in state and apply the same table: disabled fields are omitted from the validated object and the payload; readonly fields are included in the payload and skipped by user-facing validators.

---

## Step-by-step walkthrough

1. **Adopt the native table as your contract.** Disabled means "not part of the form"; readonly means "part of the form, not editable"; hidden means nothing by itself.
2. **Use `:disabled` matching, not the `disabled` property.** The property is false for a control whose ancestor `fieldset` is disabled; `el.matches(":disabled")` is true, which is what the browser uses.
3. **Build validation input from participating fields.** `new FormData(form)` gives the browser's submit set; validate that object with your schema so disabled values are simply absent.
4. **Never rely on hidden to exclude.** A hidden field must be excluded by relevance — the rule in [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/) — or by disabling it at the same time as hiding it.
5. **Keep readonly values in the payload.** Converting "locked" fields to `disabled` for styling drops them from the submission; style `[readonly]` instead.
6. **Make the schema tolerate absence.** Fields that can be disabled must be optional in the schema, or modelled with a discriminated union keyed on whatever disables them.

<svg viewBox="0 0 680 227" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram in which a toggle disables the company name field, the browser excludes it from FormData, but the controlled state still holds an empty company name that the schema rejects, blocking submit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A disabled field that the schema still validates</title>
  <desc>The user switches account type to personal, and the company name field becomes disabled. On submit, the browser&#x27;s FormData excludes the disabled control. The form library, however, validates its own state object, which still contains an empty company name, and the schema&#x27;s required rule fails. The user sees an error on a field they cannot edit. Validating the FormData-derived object instead lets submit proceed.</desc>
  <rect x="0" y="0" width="680" height="227" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">DOM / FormData</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">State + schema</text>
  <path d="M122.7,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">account type: personal; companyName</text>
  <text x="130.7" y="77.0" font-size="9.5" fill="#6b5f75" font-family="inherit">disabled</text>
  <path d="M122.7,81.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,77.0 339.0,81.0 332.0,85.0" fill="#7b4f8a"/>
  <text x="130.7" y="105.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit</text>
  <path d="M122.7,109.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,105.0 339.0,109.0 332.0,113.0" fill="#7b4f8a"/>
  <text x="348.0" y="133.0" font-size="9.5" fill="#2d6342" font-family="inherit">FormData: no companyName</text>
  <path d="M340.0,137.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,133.0 556.3,137.0 549.3,141.0" fill="#7b4f8a"/>
  <text x="130.7" y="161.0" font-size="9.5" fill="#a63d6f" font-family="inherit">state still has companyName &quot;&quot;: required fails</text>
  <path d="M557.3,165.0 H130.7" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,161.0 123.7,165.0 130.7,169.0" fill="#7b4f8a"/>
  <text x="130.7" y="189.0" font-size="9.5" fill="#2d6342" font-family="inherit">fix: validate the FormData object</text>
  <path d="M557.3,193.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="130.7,189.0 123.7,193.0 130.7,197.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. "An invalid form control is not focusable"

That console message means native validation found an invalid control it cannot show — almost always a `required` field inside a collapsed or `display: none` container. Either remove `required` while it is hidden, disable it while hidden, or add `novalidate` and handle validation yourself.

### 2. Disabled submit buttons and disabled forms

Disabling every control during submission — a common "prevent double submit" trick — also removes them from any `FormData` built after disabling. Build the payload first, then disable. Better still, keep controls enabled and guard the submit, as in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

### 3. Custom elements

A form-associated custom element participates according to its own `ElementInternals` validity and `formDisabledCallback`. It is disabled by an ancestor fieldset only if it implements that callback — see [form-associated custom elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/).

### 4. Accessibility of disabled fields

Disabled fields are skipped by Tab and announced as "dimmed" or "unavailable" when reached by virtual cursor. If a user needs to *read* a value that cannot be edited (an account number, a locked price), use `readonly`, which stays focusable and readable.

### 5. Server-side assumptions

If the server expects a field that the client disables, submission fails with a 422 the user cannot fix. The participation contract must be shared: the server should treat an absent disabled field as intentionally absent, not as missing.

<svg viewBox="0 0 680 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for whether a field is validated — whether it matches the disabled pseudo-class, whether it is readonly or type hidden, and whether it is relevant given current values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Should this field be validated?</title>
  <desc>If the field matches :disabled, directly or through a disabled fieldset, it is neither validated nor submitted. If it is readonly or an input of type hidden, it is submitted but not shown user-facing errors. If it is not relevant given the current values, it is skipped by validation and omitted from the payload. Otherwise it is validated and submitted normally.</desc>
  <rect x="0" y="0" width="680" height="308" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Matches :disabled?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Skip and omit</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">readonly or type=hidden?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Submit, do not validate</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Irrelevant given current values?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Skip and omit</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Validate and submit</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The normal case.</text>
</svg>

---

## Verification checklist

- [ ] A control inside a disabled `fieldset` is excluded from both schema validation and the payload.
- [ ] A readonly field is included in the payload and never shows a user-facing error.
- [ ] No hidden required field can block submit; the console shows no "not focusable" error.
- [ ] Disabling a field does not leave an error message visible on it.
- [ ] The payload is built before any submit-time disabling.
- [ ] Locked-but-readable values use `readonly`, stay focusable and are read by screen readers.
- [ ] The schema accepts the absence of every field that can be disabled.

---

## Frequently Asked Questions

<details>
<summary><strong>Why does the browser skip readonly fields in validation?</strong></summary>

Because the user cannot change them, an error on a readonly field is unactionable. The HTML specification bars readonly controls from constraint validation for that reason, while still submitting their values. If a readonly value can be wrong, validate it on the server.

</details>

<details>
<summary><strong>Should I use aria-disabled instead of disabled?</strong></summary>

`aria-disabled="true"` keeps the control focusable and in the submission but tells assistive technology it is unavailable. It is useful for buttons where you want users to discover why an action is unavailable. For inputs, it does not exclude the value, so you must also handle participation in code.

</details>

<details>
<summary><strong>Does fieldset disabled affect buttons inside it?</strong></summary>

Yes. Every form-associated element inside a disabled fieldset is disabled, including buttons, except those inside the fieldset's first legend. That makes a disabled fieldset a convenient way to lock a whole section, and a surprising way to lose a section's submit button.

</details>

---

## Related

- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
- [Using the Constraint Validation API With Custom Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/)
- [Reading Values With FormData on Submit](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/reading-values-with-formdata-on-submit/)

← [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
