---
layout: page.njk
title: "Revalidating After the First Submit"
description: "A submit attempt changes the contract for every field at once. Where the counter lives, what resets it, and the four cases — conditional fields, wizard steps, expensive rules, announcements — it has to survive."
slug: revalidating-after-the-first-submit
type: howto
breadcrumb: "Revalidating After the First Submit"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Revalidating After the First Submit"
  parent: "Form Validation Lifecycle"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Revalidating After the First Submit",
      "description": "A submit attempt changes the contract for every field at once. Where the counter lives, what resets it, and the four cases — conditional fields, wizard steps, expensive rules, announcements — it has to survive.",
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
          "name": "Form Validation Lifecycle",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Revalidating After the First Submit",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/revalidating-after-the-first-submit/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Make every field live after the first submit attempt",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Keep a submit-attempt counter on the form"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Increment on the attempt, not on the failure"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Combine it with the per-field shown flag"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Re-validate every field on the attempt"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Reset on success and on form reset"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Use the count to make the summary re-announce"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why a counter rather than a boolean?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because the count is useful in three places a boolean is not: the error summary heading changes between attempts, which is what makes a second failure re-announce; analytics can tell a form failed once from one that failed five times; and 'never submitted' is distinguishable from 'submitted, succeeded, and reset'. It costs the same to store."
          }
        },
        {
          "@type": "Question",
          "name": "Should the flag reset after a successful submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, along with the per-field flags. After a success the form is effectively a new one — often literally, if it is being reused to create a second record — and a reader editing it again should get the same quiet-then-live behaviour they got the first time. Leaving it set means their next keystroke is judged on a form that has told them nothing."
          }
        },
        {
          "@type": "Question",
          "name": "Does this apply to a wizard's Next button?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same shape, but scoped per step. Advancing from step one is a submit attempt for step one, so step one's fields become live while step three's stay quiet — otherwise the reader reaches step three and finds it already covered in errors about fields they have not seen. Keep an attempt count per step and use the current step's count in the predicate."
          }
        }
      ]
    }
  ]
}
</script>

# Revalidating After the First Submit

The exact problem: a reader presses submit, three fields turn red, they fix the first one — and the message stays until they leave the field, because the form is still validating on blur.

## Context and Prerequisites

This implements the submit override described in [choosing between blur and change validation](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/). The rule is one sentence: after a submit attempt, every field re-validates on every change. Getting it right is mostly about where the flag lives and what resets it.

## Core Pattern

```typescript
interface FormValidationState {
  /** Incremented on every submit ATTEMPT, successful or not. */
  readonly submitCount: number;
  /** Per-field: has this field ever shown an error? */
  readonly shown: Readonly<Record<string, boolean>>;
}

/**
 * One predicate, used by every field. Keeping it on the FORM rather than in
 * each field component is what makes a single submit flip all of them together.
 */
export function isLive(field: string, s: FormValidationState): boolean {
  return s.submitCount > 0 || s.shown[field] === true;
}

export function reducer(state: FormValidationState, ev: Event): FormValidationState {
  switch (ev.type) {
    case 'SUBMIT_ATTEMPT':
      // Attempt, not success: a rejected submit is exactly when live feedback starts.
      return { ...state, submitCount: state.submitCount + 1 };
    case 'FIELD_ERROR_SHOWN':
      return { ...state, shown: { ...state.shown, [ev.field]: true } };
    case 'SUBMIT_SUCCEEDED':
      // The form is now a fresh one. Reset, or the next edit is live from the
      // first keystroke on a form the reader has not been told anything about.
      return { submitCount: 0, shown: {} };
    case 'FORM_RESET':
      return { submitCount: 0, shown: {} };
    default:
      return state;
  }
}
```

The counter rather than a boolean is deliberate. It makes "this is the second failed attempt" expressible, which the error summary uses to decide whether to re-announce, and it distinguishes "never submitted" from "submitted and succeeded and reset" without a second flag.

<svg viewBox="0 8 690 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A form across four moments: before any submit only touched fields speak, the submit attempt makes every field live, repairs clear messages as they are typed, and a successful submit resets the state so the next edit starts quiet again." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One flag, flipped once, reset once</title>
  <desc>Before any submit, only fields the reader has already left and which failed will show messages; everything else stays quiet. The submit attempt increments the counter, which makes every field live at once — messages appear on fields the reader never focused, which is correct because they asked for judgement. While repairing, each keystroke re-validates, so messages disappear as the values become valid. A successful submit resets the counter and the per-field flags, so the next edit on what is now a fresh form starts quiet again.</desc>
  <rect x="0" y="8" width="690" height="210" fill="#f9f5fb"/>
  <rect x="14" y="40" width="150" height="72" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">before submit</text>
  <text x="89" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">submitCount = 0</text>
  <text x="89" y="100" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">only touched fields speak</text>
  <path d="M164,76 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="40" width="150" height="72" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">submit attempt</text>
  <text x="261" y="84" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">submitCount = 1</text>
  <text x="261" y="100" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">every field is live</text>
  <path d="M336,76 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="40" width="150" height="72" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="433" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">repairing</text>
  <text x="433" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">messages clear as</text>
  <text x="433" y="100" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">each value passes</text>
  <path d="M508,76 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="40" width="146" height="72" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="603" y="64" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">success → reset</text>
  <text x="603" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">counter and flags</text>
  <text x="603" y="100" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">back to zero</text>
  <text x="14" y="150" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">The bug the reset prevents</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">Without it, a reader who submits successfully and then edits the same form again is judged from their first keystroke —</text>
  <text x="14" y="184" font-size="10" fill="#6b5f75" font-family="inherit">on a form that has told them nothing yet. It reads as the form having become impatient.</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Reset on a genuine reset too: the reader asked for a blank form, and a blank form has no history.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A field showing an error for the first time sets that field's shown flag and leaves the counter alone. A submit attempt increments the counter and leaves the flags alone, because the counter alone is enough to make every field live. A successful submit resets both, returning the form to its initial quiet behaviour. A form reset does the same. Nothing else writes either value, which is what keeps the predicate trustworthy." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each event does to the two pieces of state</title>
  <desc>A field showing an error for the first time sets that field's shown flag and leaves the counter alone. A submit attempt increments the counter and leaves the flags alone, because the counter alone is enough to make every field live. A successful submit resets both, returning the form to its initial quiet behaviour. A form reset does the same. Nothing else writes either value, which is what keeps the predicate trustworthy.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Event</text>
  <text x="260" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">submitCount</text>
  <text x="430" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">shown flags</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">a field first shows an error</text>
  <text x="260" y="66" font-size="10" fill="#6b5f75" font-family="inherit">unchanged</text>
  <text x="430" y="66" font-size="10" fill="#7b4f8a" font-family="inherit">that field set</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">a submit attempt</text>
  <text x="260" y="100" font-size="10" fill="#7b4f8a" font-family="inherit">incremented</text>
  <text x="430" y="100" font-size="10" fill="#6b5f75" font-family="inherit">unchanged</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">a successful submit</text>
  <text x="260" y="134" font-size="10" fill="#2d6342" font-family="inherit">reset to 0</text>
  <text x="430" y="134" font-size="10" fill="#2d6342" font-family="inherit">cleared</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">form reset</text>
  <text x="260" y="168" font-size="10" fill="#2d6342" font-family="inherit">reset to 0</text>
  <text x="430" y="168" font-size="10" fill="#2d6342" font-family="inherit">cleared</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Four events, two values, nothing else writes either — which is why the live predicate can be a one-line pure function.</text>
</svg>

## Step-by-Step Walkthrough

1. **Keep the counter on the form.** Per-field flags cannot express "one submit flipped everything".

2. **Increment on the attempt, not on failure.** The attempt is the moment the reader asked for judgement; whether it failed decides what is shown, not whether the form is live.

3. **Combine with the per-field flag.** A field is live if it has spoken before *or* the form has been submitted.

4. **Re-validate everything on the attempt.** Not just the fields the reader touched — the untouched required field is exactly the one they need told about.

5. **Reset on success and on reset.** Both produce a form with no history, and both should be quiet again.

6. **Use the count for the summary heading.** A changing heading is what makes a second failed submit re-announce.

## Failure Modes and Edge Cases

### 1. Resetting on submit rather than on success

A failed submit that resets the counter puts the form back to quiet, so the reader fixes a field and gets no confirmation. Reset on the *result*, not on the action.

### 2. Live validation on an expensive rule after submit

The override makes everything live, including a remote uniqueness check. Exempt expensive rules explicitly: live for the structural rules, blur for the remote ones.

### 3. A field added after the submit

A conditional field revealed by an answer given after the submit attempt inherits `submitCount > 0` and is live immediately — before the reader has typed in it. Judge new fields as untouched until they have been left once, even when the form is live.

### 4. Wizard steps

`submitCount` is form-wide, but a wizard's `NEXT` is a per-step submit. Keep a per-step attempt count so advancing from step one does not make step three live.

### 5. Announcing on every repair

Every field going live means every keystroke can produce an announcement. Announce field-level results politely and debounced; the assertive channel is for the submit result only.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="They fill the form and see nothing, because nothing has been judged. They submit and every problem appears at once, which is what they asked for. They repair, and each message disappears as its value becomes valid, which is the confirmation the repair needs. They submit again and it succeeds, at which point the form goes quiet again ready for whatever they do next." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four moments a reader experiences</title>
  <desc>They fill the form and see nothing, because nothing has been judged. They submit and every problem appears at once, which is what they asked for. They repair, and each message disappears as its value becomes valid, which is the confirmation the repair needs. They submit again and it succeeds, at which point the form goes quiet again ready for whatever they do next.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">The four moments a reader experiences</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">fill</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is judged,</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is said</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">submit</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">every problem appears —</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">they asked for it</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">repair</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">messages clear as each</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">value becomes valid</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">succeed</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the form goes quiet,</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">ready for the next edit</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">The fourth box is the reset. Without it the next edit is judged from the first keystroke, on a form that said nothing.</text>
</svg>

## Verification Checklist

- [ ] Before any submit, an untouched invalid field shows nothing
- [ ] A failed submit shows every failure, including untouched fields
- [ ] Fixing a field clears its message without a blur
- [ ] A second failed submit re-announces, with an updated count
- [ ] A successful submit returns the form to quiet
- [ ] `form.reset()` returns the form to quiet
- [ ] A conditional field revealed after submit is not live until touched
- [ ] Remote checks did not become per-keystroke

## Common Pitfalls

- **A boolean instead of a counter.** The count is what lets the summary heading change between attempts, which is what makes a second failure re-announce. It costs the same to store.
- **Resetting on submit rather than on success.** A failed submit that resets the flag puts the form back to quiet, so the reader fixes a field and gets no confirmation that it worked.
- **Making a newly revealed field live immediately.** A conditional field shown after the submit attempt inherits the live state and is judged before the reader has typed in it. Treat new fields as untouched until they have been left once.
- **Using a form-wide counter in a wizard.** Advancing from step one should not make step three live. Keep an attempt count per step and read the current step in the predicate.
- **Announcing every repair.** Every field going live means every keystroke can produce an utterance. Announce field-level results politely and debounced; keep the assertive channel for the submit result.

---

**Related**

- [Choosing Between Blur and Change Validation](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/) — the policy this overrides
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — the machine both live in
- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) — where the attempt count is read

← [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)

## Frequently Asked Questions

<details>
<summary><strong>Why a counter rather than a boolean?</strong></summary>

Because the count is useful in three places a boolean is not: the error summary heading changes between attempts, which is what makes a second failure re-announce; analytics can tell a form failed once from one that failed five times; and 'never submitted' is distinguishable from 'submitted, succeeded, and reset'. It costs the same to store.

</details>

<details>
<summary><strong>Should the flag reset after a successful submit?</strong></summary>

Yes, along with the per-field flags. After a success the form is effectively a new one — often literally, if it is being reused to create a second record — and a reader editing it again should get the same quiet-then-live behaviour they got the first time. Leaving it set means their next keystroke is judged on a form that has told them nothing.

</details>

<details>
<summary><strong>Does this apply to a wizard's Next button?</strong></summary>

The same shape, but scoped per step. Advancing from step one is a submit attempt for step one, so step one's fields become live while step three's stay quiet — otherwise the reader reaches step three and finds it already covered in errors about fields they have not seen. Keep an attempt count per step and use the current step's count in the predicate.

</details>

