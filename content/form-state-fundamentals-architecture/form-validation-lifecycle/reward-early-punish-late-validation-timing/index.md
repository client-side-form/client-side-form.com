---
layout: page.njk
title: "Reward Early, Punish Late: Adaptive Validation Timing"
description: "Show errors only after the user leaves a field, but clear them the moment the value becomes valid. How to implement adaptive per-field validation timing as a small state machine, with the edge cases for autofill, paste and submit."
slug: reward-early-punish-late-validation-timing
type: howto
breadcrumb: "Reward Early, Punish Late"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Reward Early, Punish Late: Adaptive Validation Timing"
  parent: "Form Validation Lifecycle"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Reward Early, Punish Late: Adaptive Validation Timing",
      "description": "Show errors only after the user leaves a field, but clear them the moment the value becomes valid. How to implement adaptive per-field validation timing as a small state machine, with the edge cases for autofill, paste and submit.",
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
          "name": "Reward Early, Punish Late: Adaptive Validation Timing",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement reward-early, punish-late validation timing",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Track a phase per field, not just an error string"
        },
        {
          "@type": "HowToStep",
          "name": "On change, branch on whether an error is showing"
        },
        {
          "@type": "HowToStep",
          "name": "On blur, show whatever validation says"
        },
        {
          "@type": "HowToStep",
          "name": "Decide the empty-and-untouched case deliberately"
        },
        {
          "@type": "HowToStep",
          "name": "On submit, move every field into the showing state"
        },
        {
          "@type": "HowToStep",
          "name": "Announce appearances, not every update"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where does the name \"reward early, punish late\" come from?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is a long-standing name in the form-UX community for this asymmetric timing: reward the user (clear errors) as early as possible, punish them (show errors) as late as is still useful. Most mature form libraries implement some version of it, often as a \"revalidate on change after first error\" mode."
          }
        },
        {
          "@type": "Question",
          "name": "How does this map to React Hook Form's modes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "React Hook Form's mode: \"onTouched\" shows errors after blur and then validates on every change, which is close to this pattern. reValidateMode: \"onChange\" controls the post-submit behaviour. The per-field machine here is the same idea, made explicit and library-independent."
          }
        },
        {
          "@type": "Question",
          "name": "Should success ticks follow the same timing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Success indicators are safe to show early, because they never scold. But avoid showing a green tick for a merely well-formed value when an async check has not yet confirmed it; show pending until it does."
          }
        }
      ]
    }
  ]
}
</script>

# Reward Early, Punish Late: Adaptive Validation Timing

"Reward early, punish late" means a field never shows a *new* error while the user is still typing it, but an existing error disappears on the very keystroke that fixes it — so users are not scolded mid-word and not left staring at a stale message after they have corrected it.

The trade-offs between blur and change triggers are laid out in [choosing between blur and change validation](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/). Neither trigger alone is right: change-only validation shows "Enter a valid email" after the first character, and blur-only validation leaves a fixed field marked wrong until the user tabs away. The adaptive pattern uses both, asymmetrically, and the asymmetry depends on whether the field is currently showing an error.

---

## Context and prerequisites

The rule has two halves:

- **Punish late.** An error may *appear* only on blur (or on submit). While the field has focus and is not already showing an error, keystrokes run validation silently — you may use the result for a success tick or a disabled state, but you do not display a new message.
- **Reward early.** Once a field is showing an error, validation runs on every change, and the moment the value becomes valid the error is removed — without waiting for blur. If the value is still invalid but for a *different* reason, update the message in place.

The pattern needs only the field's own state: whether it is showing an error, and whether it has been blurred since the last edit. That makes it a four-state machine per field, and it composes with every other part of the [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/).

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="State table for adaptive validation with four states — pristine, editing silently, showing error, and valid — and the effect of change, blur and submit events in each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each event does in each state</title>
  <desc>In the pristine state, a change moves to editing silently, blur validates and shows an error if invalid, and submit validates and shows. While editing silently, changes validate without displaying, blur shows an error if invalid or moves to valid, and submit does the same. While showing an error, each change revalidates immediately and clears the error as soon as the value is valid, or updates the message if it is invalid for another reason. In the valid state, a change that makes the value invalid moves back to editing silently, so no new error appears until blur.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">State</text>
  <text x="157.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">on change</text>
  <text x="356.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">on blur</text>
  <text x="529.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">on submit</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">pristine</text>
  <text x="157.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">→ editing (silent)</text>
  <text x="356.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">validate; show if invalid</text>
  <text x="529.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">validate; show</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">editing (silent)</text>
  <text x="157.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validate, do not show</text>
  <text x="356.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">show if invalid, else valid</text>
  <text x="529.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">show if invalid</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">showing error</text>
  <text x="157.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">revalidate; clear the moment valid</text>
  <text x="356.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">stay</text>
  <text x="529.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">stay</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">valid</text>
  <text x="157.1" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">if now invalid → editing (silent)</text>
  <text x="356.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">show if invalid</text>
  <text x="529.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">show if invalid</text>
</svg>

---

## The core pattern: a per-field timing machine

```typescript
export type Phase = "pristine" | "editing" | "error" | "valid";

export interface FieldTiming { phase: Phase; shown: string | null }

export type Validate = (value: string) => string | null;

export function onChange(t: FieldTiming, value: string, validate: Validate): FieldTiming {
  const msg = validate(value);
  switch (t.phase) {
    case "error":
      // Reward early: the instant the value is valid, drop the message.
      // If still invalid, keep showing — but the CURRENT reason, not the old one.
      return msg ? { phase: "error", shown: msg } : { phase: "valid", shown: null };
    case "pristine":
    case "valid":
    case "editing":
      // Punish late: never introduce a new message while the user types.
      return { phase: msg ? "editing" : "valid", shown: null };
  }
}

export function onBlur(t: FieldTiming, value: string, validate: Validate): FieldTiming {
  const msg = validate(value);
  if (t.phase === "pristine" && value === "") {
    // Tabbing through an untouched empty field: whether to show "required"
    // now is a product decision. Most forms defer required errors to submit
    // for fields the user never typed in.
    return t;
  }
  return msg ? { phase: "error", shown: msg } : { phase: "valid", shown: null };
}

export function onSubmit(t: FieldTiming, value: string, validate: Validate): FieldTiming {
  const msg = validate(value);
  // After a submit attempt every field is in "reward early" mode: any error
  // is shown now, and clears on the keystroke that fixes it.
  return msg ? { phase: "error", shown: msg } : { phase: "valid", shown: null };
}
```

A thin adapter calls these from `input`, `focusout` and `submit` handlers and renders `shown`. The functions are pure, which makes the timing rules trivially unit-testable — the whole behaviour is a table of inputs and expected phases.

---

## Step-by-step walkthrough

1. **Track a phase per field, not just an error string.** The phase records *why* a message is or is not shown, which is what lets the same invalid value be silent in one state and displayed in another.
2. **On change, branch on whether an error is showing.** If it is, revalidate and clear or update immediately. If it is not, validate silently and never add a message.
3. **On blur, show whatever validation says.** This is the "late" in punish late: the user has finished with the field.
4. **Decide the empty-and-untouched case deliberately.** Showing "required" when someone tabs through a field is defensible; so is deferring it to submit. Pick one and apply it everywhere, alongside the flags from [touched vs dirty vs visited](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/).
5. **On submit, move every field into the showing state.** From then on each field behaves in "reward early" mode, which matches the post-submit rules in [revalidating after the first submit](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/revalidating-after-the-first-submit/).
6. **Announce appearances, not every update.** A new error on blur is worth a polite announcement through `aria-describedby`; clearing it should update `aria-invalid` without speaking.

<svg viewBox="0 0 680 182" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of a user typing an email address, pausing, blurring, then correcting it, showing when an error is visible under change-only, blur-only and adaptive validation." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Typing an email under three timing policies</title>
  <desc>Under change-only validation, an error is visible from the first keystroke until the address becomes valid, including while the user is still typing correctly. Under blur-only validation, no error shows while typing, the error appears on blur, and it stays visible while the user corrects the value until they blur again. Under adaptive validation, no error shows while typing, it appears on blur, and it disappears on the exact keystroke that makes the address valid.</desc>
  <rect x="0" y="0" width="680" height="182" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Change-only</text>
  <rect x="134.0" y="14.0" width="365.4" height="14" rx="3" fill="#a63d6f"/>
  <text x="134.0" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">error from the first keystroke until valid</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Blur-only</text>
  <rect x="342.8" y="56.0" width="261.0" height="14" rx="3" fill="#a63d6f"/>
  <text x="342.8" y="82.0" font-size="9" fill="#a63d6f" font-family="inherit">shown on blur, stale after fix</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Adaptive</text>
  <rect x="342.8" y="98.0" width="156.6" height="14" rx="3" fill="#2d6342"/>
  <text x="342.8" y="124.0" font-size="9" fill="#2d6342" font-family="inherit">shown on blur, gone on fix</text>
  <text x="134.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0s</text>
  <text x="238.4" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2s</text>
  <text x="342.8" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">4s</text>
  <text x="447.2" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">6s</text>
  <text x="551.6" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">8s</text>
  <text x="656.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">10s</text>
  <text x="14.0" y="170.0" font-size="10" fill="#6b5f75" font-family="inherit">Events: typing 0–3 s, blur at 4 s, user refocuses and fixes at 5–7 s (valid at 7 s), blur again at 9 s.</text>
</svg>

---

## Failure modes and edge cases

### 1. Paste and autofill

A paste is a single change event carrying a complete value. Under punish-late it validates silently and the user gets no feedback until blur. That is acceptable for most fields; for a pasted one-time code or IBAN you may prefer to treat paste like blur. Autofill has no blur at all — it is reconciled at submit, per [handling browser autofill in controlled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/).

### 2. Async validators

Only the synchronous part of validation should follow this machine per keystroke. Async checks (availability, address lookup) should run on blur or after a debounce once the synchronous checks pass, and their results enter the same phases when they resolve.

### 3. Cross-field rules

When a group rule's error is showing and the user edits the *other* member, reward early must re-run the group rule too, or the message stays until blur. Wire group rules to every member's change handler while they are in the error phase.

### 4. Focus that never leaves

On the last field of a form, the next action is often pressing Enter, which submits without a blur. That is fine: submit moves every field into the showing state. But a single-field inline editor that saves on Enter needs its own "commit" event treated as blur.

### 5. Messages that change while typing

In the error phase, the message can change from "Enter a valid email" to "Email domain is not allowed" as the user types. That is correct but can be noisy for screen-reader users if each change is announced; announce only when the error first appears and when it clears, and let the updated text be read on next focus.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting when errors may appear and when they may disappear under adaptive validation timing." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The asymmetry in one picture</title>
  <desc>Errors may appear only on blur or on submit, never mid-keystroke, because the user has not finished and a premature message is noise. Errors may disappear on any keystroke, immediately, because leaving a fixed field marked wrong erodes trust and tempts users to keep changing a correct value.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Appear late</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only on blur or submit.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never mid-keystroke: the user has not finished.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A premature error is noise.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Disappear early</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">On the keystroke that fixes it.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No waiting for blur.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A stale error makes users change a correct value.</text>
</svg>

---

## Verification checklist

- [ ] Typing a partial email shows no error until the field loses focus.
- [ ] Blurring with an invalid value shows the error.
- [ ] Refocusing and fixing the value removes the error on the fixing keystroke.
- [ ] A still-invalid value shows the updated reason while the error is showing.
- [ ] After a submit attempt, every invalid field shows its error and clears as soon as it is fixed.
- [ ] Group rules clear when the other member of the group fixes them.
- [ ] Error appearance is announced; error disappearance updates `aria-invalid` silently.
- [ ] Unit tests cover every state-event pair in the transition table.

---

## Frequently Asked Questions

<details>
<summary><strong>Where does the name "reward early, punish late" come from?</strong></summary>

It is a long-standing name in the form-UX community for this asymmetric timing: reward the user (clear errors) as early as possible, punish them (show errors) as late as is still useful. Most mature form libraries implement some version of it, often as a "revalidate on change after first error" mode.

</details>

<details>
<summary><strong>How does this map to React Hook Form's modes?</strong></summary>

React Hook Form's `mode: "onTouched"` shows errors after blur and then validates on every change, which is close to this pattern. `reValidateMode: "onChange"` controls the post-submit behaviour. The per-field machine here is the same idea, made explicit and library-independent.

</details>

<details>
<summary><strong>Should success ticks follow the same timing?</strong></summary>

Success indicators are safe to show early, because they never scold. But avoid showing a green tick for a merely well-formed value when an async check has not yet confirmed it; show pending until it does.

</details>

---

## Related

- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
- [Choosing Between Blur and Change Validation](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/)
- [ARIA-Invalid Timing and Announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/)

← [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)
