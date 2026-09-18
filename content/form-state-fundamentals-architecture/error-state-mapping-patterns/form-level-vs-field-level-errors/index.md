---
layout: page.njk
title: "Modelling Form-Level vs Field-Level Errors"
description: "Some errors belong to one input, some to a group of inputs, and some to the whole submission. A typed error model with field, group and form scopes — and where each scope renders, how it is announced, and when it clears."
slug: form-level-vs-field-level-errors
type: howto
breadcrumb: "Form vs Field Errors"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Modelling Form-Level vs Field-Level Errors"
  parent: "Error State Mapping Patterns"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Modelling Form-Level vs Field-Level Errors",
      "description": "Some errors belong to one input, some to a group of inputs, and some to the whole submission. A typed error model with field, group and form scopes — and where each scope renders, how it is announced, and when it clears.",
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
          "name": "Modelling Form-Level vs Field-Level Errors",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Model errors at field, group and form scope",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give every error a scope"
        },
        {
          "@type": "HowToStep",
          "name": "Render each scope in its own slot"
        },
        {
          "@type": "HowToStep",
          "name": "Set aria-invalid from field errors only"
        },
        {
          "@type": "HowToStep",
          "name": "Clear by scope"
        },
        {
          "@type": "HowToStep",
          "name": "Feed all three into the summary"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should a group error set aria-invalid on every member?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually not. aria-invalid tells a screen-reader user that this control's value is wrong. For a date range, the start date may be perfectly valid; marking it invalid sends the user to change the wrong thing. Describe the fieldset with the group message and mark only the member the user most likely needs to change, if any."
          }
        },
        {
          "@type": "Question",
          "name": "Where do errors from a schema's cross-field refinement go?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Zod's superRefine lets you choose the path for an issue. Give group issues a synthetic path such as dates that matches a group id, and map it to group scope in your adapter; do not put it on one of the real field paths unless it truly belongs to that field."
          }
        },
        {
          "@type": "Question",
          "name": "Can a form have both a form-level error and field errors at once?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and it is common: a submit can fail validation on two fields and also hit a rate limit. Show the banner and the field errors together; the summary lists the form error first because it may make fixing the fields pointless until the user retries later."
          }
        }
      ]
    }
  ]
}
</script>

# Modelling Form-Level vs Field-Level Errors

An error model that only knows about fields has nowhere to put "the start date must be before the end date", "choose at least one contact method" or "the payment service is unavailable" — so those messages end up attached to an arbitrary input, or rendered as a toast that disappears before a screen-reader user hears it.

[Error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) describes how errors flow from validators into components. This page settles the prior question: what an error *belongs to*. Get the scope right and the rendering, the announcement and the clearing rule all follow from it.

---

## Context and prerequisites

Three scopes cover every error a form produces:

- **Field** — about one control's value: "Enter a valid email." Rendered next to the control, linked with `aria-describedby`, and it sets `aria-invalid` on that control.
- **Group** — about the relationship between several controls: "End date must be after start date", "Choose at least one." Rendered on the `fieldset` that contains them, referenced from the `fieldset` (and optionally the most relevant control), and it clears when any member changes.
- **Form** — about the submission as a whole, not attributable to a control: rate limits, service outages, "this record was changed by someone else". Rendered at the top of the form, announced once, and it clears on the next submit attempt.

The common failure is collapsing group errors into one of their fields. The message then clears when the user edits the *other* field — the one that fixed it — does not clear, or the reader is sent to a field that is not wrong.

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing field, group and form error scopes with an example message, where it renders and what clears it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three scopes and where each one lives</title>
  <desc>A field error such as enter a valid email renders next to its input, sets aria-invalid on it and clears when that field becomes valid. A group error such as end date must be after start date renders on the enclosing fieldset and clears when any member of the group changes and the rule passes. A form error such as the payment service is unavailable renders in a banner above the form and clears on the next submit attempt.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Field</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Enter a valid email.&quot;</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Renders beside the input; aria-invalid on</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">it.</text>
  <text x="26.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Clears when that field is valid.</text>
  <rect x="236.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Group</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;End date must be after start date.&quot;</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Renders on the fieldset.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Clears when any member changes and</text>
  <text x="248.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">the rule passes.</text>
  <rect x="458.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Form</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Payment service unavailable.&quot;</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Banner above the form, announced</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">once.</text>
  <text x="470.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Clears on the next submit attempt.</text>
</svg>

---

## The core pattern: a discriminated error type and scope-aware selectors

```typescript
export type FormError =
  | { scope: "field"; path: string; code: string; message: string }
  | { scope: "group"; group: string; members: string[]; code: string; message: string }
  | { scope: "form"; code: string; message: string; retryable: boolean };

export interface ErrorState { errors: FormError[] }

// Selectors: components never filter the array themselves.
export const fieldErrors = (s: ErrorState, path: string) =>
  s.errors.filter((e): e is Extract<FormError, { scope: "field" }> => e.scope === "field" && e.path === path);

export const groupErrors = (s: ErrorState, group: string) =>
  s.errors.filter((e): e is Extract<FormError, { scope: "group" }> => e.scope === "group" && e.group === group);

export const formErrors = (s: ErrorState) =>
  s.errors.filter((e): e is Extract<FormError, { scope: "form" }> => e.scope === "form");

// A field is invalid for aria-invalid purposes only on its OWN errors.
// Group errors mark the fieldset, not every member, so a screen reader does
// not announce "invalid" on a start date that is perfectly valid on its own.
export const isFieldInvalid = (s: ErrorState, path: string) => fieldErrors(s, path).length > 0;

// Clearing rules differ by scope. Call on every value change.
export function onFieldChanged(s: ErrorState, path: string, revalidateGroup: (g: string) => FormError[]): ErrorState {
  const kept = s.errors.filter((e) => {
    if (e.scope === "field") return e.path !== path;          // re-run by the field validator
    if (e.scope === "group") return !e.members.includes(path); // re-run below
    return true;                                               // form errors wait for submit
  });
  const touchedGroups = new Set(
    s.errors.filter((e) => e.scope === "group" && e.members.includes(path)).map((e) => (e as any).group as string),
  );
  const regrouped = [...touchedGroups].flatMap(revalidateGroup);
  return { errors: [...kept, ...regrouped] };
}

export const onSubmitAttempt = (s: ErrorState): ErrorState =>
  ({ errors: s.errors.filter((e) => e.scope !== "form") });
```

```html
<fieldset aria-describedby="dates-error">
  <legend>Travel dates</legend>
  <label for="start">Start</label> <input id="start" name="start" type="date">
  <label for="end">End</label>
  <input id="end" name="end" type="date" aria-describedby="dates-error">
  <p id="dates-error" class="group-error">End date must be after start date.</p>
</fieldset>
```

---

## Step-by-step walkthrough

1. **Give every error a scope.** The discriminated union makes it impossible to create a group error without naming its members, or a form error with a field path.
2. **Render each scope in its own slot.** Field errors beside the control, group errors inside the `fieldset` below the `legend`, form errors in a banner at the top. Components ask selectors for their scope and never search the array.
3. **Set `aria-invalid` from field errors only.** For group errors, describe the `fieldset` and the member most likely to need changing (usually the later one) with the group message.
4. **Clear by scope.** A field error is replaced when its field is revalidated; a group error is re-evaluated when *any* member changes; a form error stays until the next submit attempt.
5. **Feed all three into the summary.** The error summary links field errors to their inputs, group errors to the first member, and lists form errors without a link, as in [building an accessible error summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/).

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the three error scopes with what triggers re-evaluation, what sets aria-invalid, where the error is announced and where the summary link points." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Clearing and announcement rules by scope</title>
  <desc>Field errors are re-evaluated when the same field changes, set aria-invalid on that field, are announced through the field&#x27;s description, and the summary links to the field. Group errors are re-evaluated when any member changes, do not set aria-invalid on valid members, are announced through the fieldset description, and the summary links to the first member. Form errors are re-evaluated on the next submit attempt, set no aria-invalid, are announced once through an alert region, and appear in the summary without a link.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Scope</text>
  <text x="130.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Re-evaluated when</text>
  <text x="327.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">aria-invalid on</text>
  <text x="509.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Summary link</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="130.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">that field changes</text>
  <text x="327.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">the field</text>
  <text x="509.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">the field</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Group</text>
  <text x="130.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">any member changes</text>
  <text x="327.3" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">none by default</text>
  <text x="509.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">first member</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Form</text>
  <text x="130.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">next submit attempt</text>
  <text x="327.3" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">nothing</text>
  <text x="509.2" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">none; text only</text>
</svg>

---

## Failure modes and edge cases

### 1. Group error pinned to one field

Attaching "end must be after start" to `end` means that when the user fixes the problem by moving `start` earlier, `end` is never revalidated and the error stays. The group scope re-runs the rule when either changes; see [validating a date range: start before end](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/validating-a-date-range-start-before-end/).

### 2. Server errors without a path

A 422 response may include messages with no field pointer, or with a pointer to a field the client does not render. Map them to form scope rather than dropping them; the rules are in [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).

### 3. Form errors shown as transient toasts

A toast that auto-dismisses after five seconds is gone before many users — and most screen-reader users — have read it. Form-scope errors are persistent until the next attempt, and live in the page, not in a floating layer.

### 4. Duplicate announcements

If a group error is referenced by both the `fieldset` and a member input, a screen reader may read it twice when focus enters the member. Reference it from the `fieldset` plus exactly one member, and not from all of them.

### 5. Form error that is really a field error

"Email already registered" from the server is about the email field, even though it arrived on submit. Scope by meaning, not by source: if the message names a field the user can fix, it is a field error.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow to pick the scope of an error by asking whether it names one control the user can fix, whether it depends on several controls together, and otherwise assigning form scope." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Choosing the scope for a new error</title>
  <desc>If the message is about one control the user can fix, make it a field error, even if it came from the server. If the message is about a relationship between several controls, make it a group error with those members. Otherwise, including outages, rate limits and concurrency conflicts, make it a form error with a retryable flag.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Is it about one control the user can fix?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Field scope</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Does it depend on several controls together?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Group scope</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Form scope</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Outage, rate limit, conflict. Mark retryable.</text>
</svg>

---

## Verification checklist

- [ ] Each error in state has exactly one scope, enforced by the type.
- [ ] Fixing a cross-field rule by editing either field clears the group error.
- [ ] Valid members of a group are not marked `aria-invalid` by a group error.
- [ ] Form errors persist on screen until the next submit and are announced once.
- [ ] Server messages without a known field appear as form errors, not nowhere.
- [ ] The error summary links field errors to inputs and group errors to the first member.
- [ ] No message is read twice when focus enters a member of an invalid group.

---

## Frequently Asked Questions

<details>
<summary><strong>Should a group error set aria-invalid on every member?</strong></summary>

Usually not. `aria-invalid` tells a screen-reader user that *this* control's value is wrong. For a date range, the start date may be perfectly valid; marking it invalid sends the user to change the wrong thing. Describe the fieldset with the group message and mark only the member the user most likely needs to change, if any.

</details>

<details>
<summary><strong>Where do errors from a schema's cross-field refinement go?</strong></summary>

Zod's `superRefine` lets you choose the `path` for an issue. Give group issues a synthetic path such as `dates` that matches a group id, and map it to group scope in your adapter; do not put it on one of the real field paths unless it truly belongs to that field.

</details>

<details>
<summary><strong>Can a form have both a form-level error and field errors at once?</strong></summary>

Yes, and it is common: a submit can fail validation on two fields and also hit a rate limit. Show the banner and the field errors together; the summary lists the form error first because it may make fixing the fields pointless until the user retries later.

</details>

---

## Related

- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
- [Merging Errors From Client, Schema and Server Validators](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/merging-errors-from-multiple-validation-sources/)
- [Inline Errors and an Error Summary: Using Both](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/inline-errors-and-summary-together/)

← [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
