---
layout: page.njk
title: "Reading Values with FormData on Submit"
description: "Read the whole form in one call instead of mirroring every keystroke into state — including what FormData deliberately omits, and how to get the payload your API actually expects."
slug: reading-values-with-formdata-on-submit
type: howto
breadcrumb: "Reading Values with FormData on Submit"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Reading Values with FormData on Submit"
  parent: "Controlled vs Uncontrolled Forms"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Reading Values with FormData on Submit",
      "description": "Read the whole form in one call instead of mirroring every keystroke into state — including what FormData deliberately omits, and how to get the payload your API actually expects.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Controlled vs Uncontrolled Forms",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Reading Values with FormData on Submit",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/reading-values-with-formdata-on-submit/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a submit payload with FormData",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Give every control that must submit a name"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Read the form once, at submit"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Use getAll for names that can repeat"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Coerce values through the validating schema"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Use readonly rather than disabled for locked fields"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Expand nested names into the object shape the API expects"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does FormData work with React or Vue controlled inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — it reads the DOM, and a controlled input still has a DOM value. That makes it a useful escape hatch even in a fully controlled form: you can read the whole form in one call at submit rather than assembling a payload from state. The caveat is that if state and the DOM have diverged, FormData reports the DOM, which is what the reader actually sees and usually the more honest answer."
          }
        },
        {
          "@type": "Question",
          "name": "How do I get a boolean false out of an unchecked checkbox?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Either put a hidden input with the same name and a value of false immediately before the checkbox — the checked box's entry then also appears and you take the last — or normalise after reading, filling in false for every checkbox name you know about. The second is clearer, because the hidden-input trick relies on document order and quietly breaks if the markup is reordered."
          }
        },
        {
          "@type": "Question",
          "name": "What about file inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They appear as File objects in the FormData, and passing the FormData straight to fetch as a body sends them as multipart with no extra work. If you are building a JSON payload instead, pull the files out and upload them separately — trying to serialise a File into JSON silently produces an empty object."
          }
        }
      ]
    }
  ]
}
</script>

# Reading Values with FormData on Submit

The exact problem: a form mirrors every input into state so it can build a payload at submit — sixty subscriptions, sixty re-renders per keystroke — when the browser has been holding those values the whole time and will hand them over in one call.

## Context and Prerequisites

This is the read side of the uncontrolled pattern from [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/). It assumes the fields are uncontrolled, or at least that the DOM is the source of truth at submit time; [best practices for uncontrolled form state](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) covers the write side.

## Core Pattern

```typescript
/**
 * Read the whole form at submit. FormData walks form.elements, so it picks up
 * every named, enabled control — including form-associated custom elements,
 * which is why this keeps working when a design-system field replaces an input.
 */
export function readForm<T extends Record<string, unknown>>(form: HTMLFormElement): T {
  const fd = new FormData(form);
  const out: Record<string, unknown> = {};

  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key);
    // A repeated name — a checkbox group, a multi-select, a repeated fieldset —
    // yields several entries. Collapsing them to the first silently loses data.
    out[key] = values.length > 1 ? values : values[0];
  }
  return out as T;
}
```

Two behaviours are worth knowing before relying on it. `FormData` omits disabled controls entirely, and it omits unchecked checkboxes — both by specification, and both usually what you want. It also returns everything as a string or a `File`, so coercion is the caller's job:

```typescript
// The DOM has no types. Coerce at the boundary, once, using the same schema
// the form validates with, so the payload and the validation agree.
const parsed = schema.safeParse(readForm(form));
if (!parsed.success) return renderErrors(parsed.error);
await submit(parsed.data);          // parsed.data, not the raw strings
```

<svg viewBox="0 8 690 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="What FormData includes and excludes: named enabled controls and checked boxes are included, while disabled controls, unnamed controls, unchecked boxes and controls outside the form are excluded, with a note that form-associated custom elements are included." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What ends up in the payload, and what does not</title>
  <desc>Included: any control with a name attribute that is enabled, every checked checkbox and radio, every selected option of a multiple select, files from file inputs, and form-associated custom elements that have called setFormValue. Excluded: disabled controls, controls with no name, unchecked checkboxes and radios, buttons other than the one that submitted, and any control outside the form element unless it carries a matching form attribute. Each exclusion is by specification rather than by accident, and each one is occasionally the cause of a missing field.</desc>
  <rect x="0" y="8" width="690" height="216" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">included</text>
  <rect x="14" y="38" width="326" height="146" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#1e1a24" font-family="inherit">any named, enabled control</text>
  <text x="28" y="86" font-size="10" fill="#1e1a24" font-family="inherit">checked checkboxes and radios</text>
  <text x="28" y="110" font-size="10" fill="#1e1a24" font-family="inherit">every selected option of a multi-select</text>
  <text x="28" y="134" font-size="10" fill="#1e1a24" font-family="inherit">files from file inputs</text>
  <text x="28" y="158" font-size="10" fill="#2d6342" font-family="inherit">form-associated custom elements</text>
  <text x="14" y="200" font-size="9.5" fill="#6b5f75" font-family="inherit">The last row is why this pattern survives a design-system migration.</text>
  <text x="364" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">excluded, by specification</text>
  <rect x="364" y="38" width="312" height="146" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="378" y="62" font-size="10" fill="#1e1a24" font-family="inherit">disabled controls</text>
  <text x="378" y="86" font-size="10" fill="#1e1a24" font-family="inherit">controls with no name attribute</text>
  <text x="378" y="110" font-size="10" fill="#1e1a24" font-family="inherit">unchecked checkboxes and radios</text>
  <text x="378" y="134" font-size="10" fill="#1e1a24" font-family="inherit">buttons that did not submit</text>
  <text x="378" y="158" font-size="10" fill="#1e1a24" font-family="inherit">controls outside the form element</text>
  <text x="364" y="200" font-size="9.5" fill="#6b5f75" font-family="inherit">Each of these is occasionally the cause of a "missing field" report.</text>
</svg>

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Before submit, nothing is read: the browser holds every value and no mirror exists. On submit, one FormData construction walks the form elements collection and produces every name and value pair in a single pass. The result is then coerced through the schema, which is the only place types are applied. Finally the parsed object is sent — never the raw strings, which would discard every coercion the schema performed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One read, at one moment</title>
  <desc>Before submit, nothing is read: the browser holds every value and no mirror exists. On submit, one FormData construction walks the form elements collection and produces every name and value pair in a single pass. The result is then coerced through the schema, which is the only place types are applied. Finally the parsed object is sent — never the raw strings, which would discard every coercion the schema performed.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">One read, at one moment</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">while typing</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is read</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the browser holds it</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">on submit</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">one FormData pass</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">over form.elements</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">coerce</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">through the schema —</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the only typing step</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">send</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">parsed.data,</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">never the raw strings</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">The last box is the one that catches people: sending the raw values throws away every coercion the schema just did.</text>
</svg>

## Step-by-Step Walkthrough

1. **Name every control.** An unnamed input is invisible to `FormData`, which is the single most common cause of a field that "does not submit".

2. **Read once, at submit.** Not on change, not on blur — the whole point is that nothing is mirrored between keystrokes.

3. **Handle repeated names deliberately.** `getAll` for anything that can repeat; `get` silently returns only the first.

4. **Coerce through the schema.** The DOM produces strings; the API wants types. Doing it in the schema means the payload and the validation cannot disagree.

5. **Use `readonly`, not `disabled`, for fields you want submitted.** A disabled field is excluded from the payload; a readonly one is included.

6. **Use the `form` attribute for controls outside the element.** A submit button or field rendered in a portal or a sticky footer needs `form="the-id"` to participate.

## Failure Modes and Edge Cases

### 1. Unchecked checkboxes vanish

An unchecked box contributes nothing, so `"marketing" in payload` is false rather than `false`. Where the API needs an explicit false, either add a hidden input with the same name before the checkbox — the checked box's value then wins — or normalise after reading.

### 2. A disabled field the API requires

Disabling a field to prevent editing also removes it from the payload. `readonly` keeps it editable-looking-but-not and still submits it; for a genuinely locked value, add a hidden input.

### 3. Numbers, dates and booleans as strings

`"7"`, `"2026-08-05"` and `"on"` are what the DOM gives you. Coercing in the schema keeps one definition; coercing ad hoc at the call site is where `"0"` becomes truthy.

### 4. Nested payloads

`FormData` is flat. A name like `address.city` or `rows[1].postcode` needs expanding into an object after reading — the same canonical path format used by [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/), so errors and values agree.

### 5. The submitter button

`new FormData(form)` omits the button that submitted, which matters when a form has "Save" and "Save and add another". Pass it explicitly: `new FormData(form, event.submitter)`.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The name attribute is what puts a control in the payload at all; without it the control is invisible to FormData regardless of everything else. The disabled attribute removes a control from the payload entirely, which is why readonly is the right choice for a value that must be locked but still sent. The form attribute lets a control outside the form element participate, which is how a sticky footer submit button or a portalled field is included. And the value attribute on a checkbox decides what a checked box contributes, defaulting to the string on." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four attributes that decide whether a control submits</title>
  <desc>The name attribute is what puts a control in the payload at all; without it the control is invisible to FormData regardless of everything else. The disabled attribute removes a control from the payload entirely, which is why readonly is the right choice for a value that must be locked but still sent. The form attribute lets a control outside the form element participate, which is how a sticky footer submit button or a portalled field is included. And the value attribute on a checkbox decides what a checked box contributes, defaulting to the string on.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Attribute</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Effect on the payload</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">name</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">required — without it the control is invisible to FormData</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">disabled</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">removes the control entirely; use readonly to lock and still send</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">form="id"</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">includes a control rendered outside the form element</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">value, on a checkbox</text>
  <text x="200" y="168" font-size="10" fill="#6b5f75" font-family="inherit">what a checked box contributes; defaults to "on"</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Three of these four produce a "field did not submit" report, and all three are invisible in the rendered page.</text>
</svg>

## Verification Checklist

- [ ] Every control that must submit has a `name`
- [ ] Repeated names are read with `getAll`
- [ ] Unchecked checkboxes produce the value the API expects
- [ ] Fields locked for editing still appear in the payload
- [ ] Values are coerced through the same schema that validates them
- [ ] Nested names expand to the object shape the API expects
- [ ] The submitter button's value reaches the handler where it matters
- [ ] A form-associated custom element appears in the payload

## Common Pitfalls

- **Forgetting the `name` attribute.** A control without one is invisible to `FormData` no matter what else is correct, and the symptom — one field missing from the payload — looks like a server problem.
- **Using `get` where the name can repeat.** A checkbox group, a multi-select or a repeated fieldset yields several entries, and `get` silently returns the first. Use `getAll` for anything that can appear more than once.
- **Disabling a field you still need.** `disabled` removes the control from the payload entirely. Use `readonly` for a value that must be locked and still submitted.
- **Coercing at the call site instead of in the schema.** Two places that turn `"0"` into a number will eventually disagree, and one of them will treat it as truthy. Coerce once, where the rules already live.
- **Ignoring the submitter.** `new FormData(form)` omits the button that submitted, so "Save" and "Save and add another" become indistinguishable. Pass `event.submitter` as the second argument.

---

**Related**

- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — the ownership decision behind this
- [Best Practices for Uncontrolled Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) — the write side
- [Form-Associated Custom Elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/) — why custom fields appear here

← [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)

## Frequently Asked Questions

<details>
<summary><strong>Does FormData work with React or Vue controlled inputs?</strong></summary>

Yes — it reads the DOM, and a controlled input still has a DOM value. That makes it a useful escape hatch even in a fully controlled form: you can read the whole form in one call at submit rather than assembling a payload from state. The caveat is that if state and the DOM have diverged, FormData reports the DOM, which is what the reader actually sees and usually the more honest answer.

</details>

<details>
<summary><strong>How do I get a boolean false out of an unchecked checkbox?</strong></summary>

Either put a hidden input with the same name and a value of false immediately before the checkbox — the checked box's entry then also appears and you take the last — or normalise after reading, filling in false for every checkbox name you know about. The second is clearer, because the hidden-input trick relies on document order and quietly breaks if the markup is reordered.

</details>

<details>
<summary><strong>What about file inputs?</strong></summary>

They appear as File objects in the FormData, and passing the FormData straight to fetch as a body sends them as multipart with no extra work. If you are building a JSON payload instead, pull the files out and upload them separately — trying to serialise a File into JSON silently produces an empty object.

</details>

