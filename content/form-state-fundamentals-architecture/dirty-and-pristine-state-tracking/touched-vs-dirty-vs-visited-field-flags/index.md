---
layout: page.njk
title: "Touched vs Dirty vs Visited: Choosing Field Interaction Flags"
description: "Touched, dirty, visited and submitted answer different questions. Which flag should gate error display, which should drive the unsaved-changes guard, and how to set each one correctly for keyboard, mouse, autofill and programmatic changes."
slug: touched-vs-dirty-vs-visited-field-flags
type: howto
breadcrumb: "Touched vs Dirty"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Touched vs Dirty vs Visited: Choosing Field Interaction Flags"
  parent: "Dirty and Pristine State Tracking"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Touched vs Dirty vs Visited: Choosing Field Interaction Flags",
      "description": "Touched, dirty, visited and submitted answer different questions. Which flag should gate error display, which should drive the unsaved-changes guard, and how to set each one correctly for keyboard, mouse, autofill and programmatic changes.",
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
          "name": "Dirty and Pristine State Tracking",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Touched vs Dirty vs Visited: Choosing Field Interaction Flags",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Pick and set field interaction flags correctly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Listen for focusin and focusout on the form"
        },
        {
          "@type": "HowToStep",
          "name": "Set visited on the first focus and touched on the first real exit"
        },
        {
          "@type": "HowToStep",
          "name": "Set submitted in the capture phase of submit"
        },
        {
          "@type": "HowToStep",
          "name": "Gate error display on touched || submitted"
        },
        {
          "@type": "HowToStep",
          "name": "Keep dirty for the unsaved-changes guard and the save button"
        },
        {
          "@type": "HowToStep",
          "name": "Clear all flags on reset and after a successful save"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is touched the same as React Hook Form's touchedFields?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes in meaning: React Hook Form marks a field touched on blur by default. Its dirtyFields is the comparison-based flag. Formik's touched is also blur-based. The names are consistent across libraries because the underlying questions are."
          }
        },
        {
          "@type": "Question",
          "name": "Why keep visited at all?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is the only flag that captures \"focused but never left\", which is useful for analytics about where users abandon a form, and for showing contextual hints on first focus without waiting for blur. If you need neither, drop it."
          }
        },
        {
          "@type": "Question",
          "name": "Should programmatic value changes set touched?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Touched records that the user has been asked about a field. A value filled by code — a default, a computed field, a restored draft — should affect dirty, never touched, so its errors wait for the user's attention or a submit."
          }
        }
      ]
    }
  ]
}
</script>

# Touched vs Dirty vs Visited: Choosing Field Interaction Flags

Most "the error appeared too early" and "the error never appeared" bugs come from gating error display on the wrong interaction flag — usually `dirty`, which a keyboard user tabbing through a required field never sets.

[Dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) is about one of these flags. In practice a form keeps four, and each answers a distinct question. Treating them as interchangeable produces the classic symptoms: required errors that never show for fields the user skipped, errors that flash on focus, and an unsaved-changes prompt after the user merely clicked around.

---

## Context and prerequisites

The four flags, defined by the question each answers:

- **visited** — "has focus ever entered this field?" Set on `focus`.
- **touched** — "has focus ever *left* this field?" Set on `blur`. This is the one that means "the user has had their chance".
- **dirty** — "does the value differ from the baseline?" Derived by comparison, not set by an event, and it can become false again.
- **submitted** — a form-level flag: "has the user tried to submit at least once?"

Error display should key off **touched or submitted**. The unsaved-changes guard should key off **dirty**. Analytics about field abandonment can use **visited without touched**. Using `dirty` for error display is the common mistake, because a user who tabs past a required field leaves it touched but not dirty, and never sees why submit fails until they press it.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of four interaction flags — visited, touched, dirty and submitted — with the event that sets them, whether they can revert, and what they should drive." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four flags and the question each answers</title>
  <desc>Visited is set on focus, never reverts, and is useful for analytics and for deciding whether to show a hint. Touched is set on blur, never reverts until reset, and gates per-field error display. Dirty is derived by comparing value and baseline, reverts when the value returns to the baseline, and drives the unsaved-changes guard and the save button. Submitted is set on the first submit attempt and gates showing every error at once.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Flag</text>
  <text x="139.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Set by</text>
  <text x="299.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Reverts?</text>
  <text x="444.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Should drive</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">visited</text>
  <text x="139.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">focus</text>
  <text x="299.3" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="444.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">hints, abandonment analytics</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">touched</text>
  <text x="139.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">blur</text>
  <text x="299.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no (until reset)</text>
  <text x="444.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">per-field error display</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">dirty</text>
  <text x="139.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">value ≠ baseline</text>
  <text x="299.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes, when value returns</text>
  <text x="444.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">unsaved guard, save button</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">submitted</text>
  <text x="139.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">first submit attempt</text>
  <text x="299.3" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no (until reset)</text>
  <text x="444.2" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">reveal all errors at once</text>
</svg>

---

## The core pattern: flags set by the right events, and one display rule

```typescript
export interface FieldFlags { visited: boolean; touched: boolean; }
export interface FormFlags { submitted: boolean; fields: Record<string, FieldFlags>; }

export function createFlagTracker(form: HTMLFormElement, onChange: (f: FormFlags) => void) {
  const flags: FormFlags = { submitted: false, fields: {} };
  const field = (name: string) => (flags.fields[name] ??= { visited: false, touched: false });

  // focusin/focusout bubble, unlike focus/blur, so one listener covers every
  // field — including ones rendered later, and ones inside custom elements
  // that retarget focus events to the host.
  const onFocusIn = (e: FocusEvent) => {
    const el = e.target as HTMLInputElement;
    if (!el.name) return;
    if (!field(el.name).visited) { field(el.name).visited = true; onChange(flags); }
  };
  const onFocusOut = (e: FocusEvent) => {
    const el = e.target as HTMLInputElement;
    if (!el.name) return;
    // Focus moving between two radios in the same group is not "leaving".
    const next = e.relatedTarget as HTMLInputElement | null;
    if (next?.name === el.name) return;
    if (!field(el.name).touched) { field(el.name).touched = true; onChange(flags); }
  };
  const onSubmit = () => { flags.submitted = true; onChange(flags); };

  form.addEventListener("focusin", onFocusIn);
  form.addEventListener("focusout", onFocusOut);
  form.addEventListener("submit", onSubmit, true); // capture: set before validation reads it

  return {
    flags,
    reset() { flags.submitted = false; flags.fields = {}; onChange(flags); },
    destroy() {
      form.removeEventListener("focusin", onFocusIn);
      form.removeEventListener("focusout", onFocusOut);
      form.removeEventListener("submit", onSubmit, true);
    },
  };
}

// The single rule the whole UI uses. Dirty is deliberately absent.
export function shouldShowError(name: string, flags: FormFlags, hasError: boolean): boolean {
  return hasError && (flags.submitted || flags.fields[name]?.touched === true);
}
```

Dirty is not tracked here because it is not an interaction; compute it from values, as in [deep equality for dirty detection](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/deep-equality-for-dirty-detection-on-nested-values/).

---

## Step-by-step walkthrough

1. **Listen for `focusin` and `focusout` on the form.** They bubble, so one pair of listeners covers every field and survives conditional rendering.
2. **Set `visited` on the first focus and `touched` on the first real exit.** Ignore focus moving between members of the same radio or checkbox group, otherwise arrowing through a group marks it touched before the user has chosen.
3. **Set `submitted` in the capture phase of submit.** Validation and error rendering then see the flag during the same submit.
4. **Gate error display on `touched || submitted`.** One function, used everywhere, so no component invents its own rule.
5. **Keep `dirty` for the unsaved-changes guard and the save button.** It is the only flag that goes back to false when the user undoes their edit, which is exactly what those two features need.
6. **Clear all flags on reset and after a successful save.** A saved form should look fresh: no lingering touched errors on fields the next edit has not reached.

<svg viewBox="0 0 680 255" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical sequence of a keyboard user focusing a required email field, tabbing away without typing, and then pressing submit, with the flags set at each step and whether an error is shown." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A keyboard user tabbing past a required field</title>
  <desc>When focus enters the empty required email field, visited becomes true and no error is shown. When the user tabs away without typing, touched becomes true while dirty stays false; with the touched rule the required error now appears, whereas a dirty rule would show nothing. When the user presses submit, submitted becomes true and every invalid field shows its error regardless of flags.</desc>
  <rect x="0" y="0" width="680" height="255" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="292.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Tab into email (empty, required)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">visited = true</text>
  <text x="336.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No error yet. The user has not had a chance to answer.</text>
  <path d="M160.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="156.0,89.0 160.0,96.0 164.0,89.0" fill="#7b4f8a"/>
  <text x="170.0" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">Tab</text>
  <rect x="14.0" y="97.0" width="292.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Tab out without typing</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">touched = true, dirty = false</text>
  <text x="336.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">touched rule: required error shows now. dirty rule: nothing shows, and</text>
  <text x="336.0" y="133.0" font-size="9.5" fill="#6b5f75" font-family="inherit">the user moves on unaware.</text>
  <path d="M160.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="156.0,174.0 160.0,181.0 164.0,174.0" fill="#7b4f8a"/>
  <text x="170.0" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">Enter</text>
  <rect x="14.0" y="182.0" width="292.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Press submit</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submitted = true</text>
  <text x="336.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Every invalid field shows its message, touched or not.</text>
</svg>

---

## Failure modes and edge cases

### 1. Errors that flash on focus

Setting `touched` on `focus` instead of `blur` shows a required error the instant the user enters an empty field. Use `focusout`, and pair it with the timing rules from [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/) so an error, once shown, clears as soon as the value becomes valid.

### 2. Autofill makes fields dirty but not touched

Autofill changes values without focus. That is correct: the fields are dirty (worth saving) but not touched (the user has not been asked about them). If autofilled data is invalid, errors appear on submit, not before — which is the right time. See [handling browser autofill in controlled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/).

### 3. Custom widgets that never blur

A date picker that opens a popup moves focus into the popup and back; a naive listener marks the field touched when focus enters the popup. Treat focus moving to an element inside the widget's container as "not leaving" by checking `container.contains(e.relatedTarget)`.

### 4. Clicking the submit button counts as blur

Pressing submit blurs the last field, setting it touched a moment before `submitted`. That is harmless because both flags lead to the same display, but it matters if you animate errors: batch the two state changes so the field's message does not animate twice.

### 5. Window blur

Switching browser tabs fires `focusout` with `relatedTarget === null`. If you do not want tab-switching to mark the field touched, ignore `focusout` when `document.hasFocus()` is false at the next frame.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards assigning features to the flag they should read — error display, unsaved-changes guard, save button enablement and abandonment analytics." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which flag each feature should read</title>
  <desc>Error display reads touched or submitted. The unsaved-changes guard reads dirty, because it must go quiet if the user undoes their edit. Save button enablement reads dirty and valid. Abandonment analytics reads visited without touched, meaning the user entered a field and left the page before leaving it.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Error display</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">touched || submitted</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Unsaved guard</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">dirty</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Quiet again after an undo.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Save button</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">dirty &amp;&amp; valid</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Analytics</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">visited &amp;&amp; !touched</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Entered, never left.</text>
</svg>

---

## Verification checklist

- [ ] Tabbing through an empty required field and out shows its error on exit.
- [ ] Entering a field shows no error, even if it is empty and required.
- [ ] Arrowing between radios in a group does not mark the group touched until focus leaves the group.
- [ ] Opening and using a date picker popup does not mark the field touched until focus leaves the widget.
- [ ] Undoing an edit back to the original value clears the unsaved-changes guard.
- [ ] Autofilled fields are dirty, not touched, and show errors only after submit.
- [ ] Reset and successful save clear visited, touched and submitted.
- [ ] Error display uses one shared function; no component checks `dirty` to decide.

---

## Frequently Asked Questions

<details>
<summary><strong>Is touched the same as React Hook Form's touchedFields?</strong></summary>

Yes in meaning: React Hook Form marks a field touched on blur by default. Its `dirtyFields` is the comparison-based flag. Formik's `touched` is also blur-based. The names are consistent across libraries because the underlying questions are.

</details>

<details>
<summary><strong>Why keep visited at all?</strong></summary>

It is the only flag that captures "focused but never left", which is useful for analytics about where users abandon a form, and for showing contextual hints on first focus without waiting for blur. If you need neither, drop it.

</details>

<details>
<summary><strong>Should programmatic value changes set touched?</strong></summary>

No. Touched records that the user has been asked about a field. A value filled by code — a default, a computed field, a restored draft — should affect dirty, never touched, so its errors wait for the user's attention or a submit.

</details>

---

## Related

- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
- [Choosing Between Blur and Change Validation](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/)
- [Reward Early, Punish Late: Adaptive Validation Timing](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/)

← [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
