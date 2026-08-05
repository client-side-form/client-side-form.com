---
layout: page.njk
title: "Choosing Between Blur and Change Validation"
description: "Make the validation trigger a per-field, two-phase policy: quiet until the first blur, live once the reader is repairing, with a short table of the fields that genuinely need something else."
slug: choosing-between-blur-and-change-validation
type: howto
breadcrumb: "Choosing Between Blur and Change Validation"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Choosing Between Blur and Change Validation"
  parent: "Form Validation Lifecycle"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Choosing Between Blur and Change Validation",
      "description": "Make the validation trigger a per-field, two-phase policy: quiet until the first blur, live once the reader is repairing, with a short table of the fields that genuinely need something else.",
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
          "name": "Choosing Between Blur and Change Validation",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/choosing-between-blur-and-change-validation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Choose a validation trigger per field",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Default every field to blur, then change"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "List only the fields that need something else"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Track a hasShownError flag per field"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Let a submit attempt override every policy"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Keep the rules identical across both phases"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Debounce the change-phase evaluation"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should validation mode be a global form setting?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only as a default. A confirmation field genuinely wants live feedback, a remote uniqueness check must not fire per keystroke, and a cross-field rule cannot be judged until its inputs exist — three different behaviours in one form. Make blur-then-change the default and keep a short table of exceptions, so the unusual policies are visible rather than buried in component props."
          }
        },
        {
          "@type": "Question",
          "name": "Why not validate on change from the start?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because an email address is invalid for most of the time it is being typed, and telling the reader so five characters in is noise they have to ignore. The cost is not just annoyance: a field that cries wolf while composing trains readers to skip past its message when it finally matters. Waiting for blur costs nothing — the reader finds out before they submit either way."
          }
        },
        {
          "@type": "Question",
          "name": "What about fields the reader never touches?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They stay unjudged until the submit attempt, which is correct: showing an error on a field nobody has interacted with is a form telling the reader off for not having got there yet. The submit override is what guarantees they are judged eventually, which is why it is not optional even when every field has an explicit policy."
          }
        }
      ]
    }
  ]
}
</script>

# Choosing Between Blur and Change Validation

The exact problem: a field validates on every keystroke, so an email address is marked invalid five characters into being typed — or it validates only on submit, so a reader fills in twelve fields before learning the second one was wrong.

## Context and Prerequisites

The trade-off between modes is laid out in [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/). This page is about implementing the mode as a per-field state rather than a global setting, because a real form wants different behaviour for different fields and a single `mode: 'onBlur'` cannot express that.

## Core Pattern: The Trigger Is Per Field, Per Phase

```typescript
type Phase = 'composing' | 'repairing';
type Trigger = 'change' | 'blur' | 'submit';

interface FieldPolicy {
  /** When this field may FIRST show an error. */
  readonly firstShowOn: Trigger;
  /** Once it has shown one, when it re-evaluates. */
  readonly thenOn: Trigger;
}

const DEFAULT: FieldPolicy = { firstShowOn: 'blur', thenOn: 'change' };

// Only fields with a reason to differ get an entry; everything else takes the
// default, which keeps the exceptions visible.
const POLICY: Record<string, FieldPolicy> = {
  // A confirmation field is compared against something the reader already
  // typed, so live feedback while typing is genuinely useful.
  passwordConfirm: { firstShowOn: 'change', thenOn: 'change' },
  // A remote uniqueness check is expensive; never fire it per keystroke.
  username:        { firstShowOn: 'blur',   thenOn: 'blur'   },
  // Cross-field rules cannot be judged until everything is present.
  endDate:         { firstShowOn: 'submit', thenOn: 'change' },
};

export function shouldShow(
  field: string,
  trigger: Trigger,
  state: { hasShownError: boolean; formSubmitted: boolean },
): boolean {
  const p = POLICY[field] ?? DEFAULT;
  if (state.formSubmitted) return true;            // after a submit, everything speaks
  return state.hasShownError ? trigger === p.thenOn || p.thenOn === 'change'
                             : trigger === p.firstShowOn;
}
```

The two-phase shape — `firstShowOn` then `thenOn` — is what makes the common case feel right without a special case. Before the reader has been told anything, the field stays quiet until blur. Once it has spoken, it re-evaluates live, so the message disappears the moment the value becomes valid rather than waiting for another blur.

<svg viewBox="0 8 690 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One field across two phases: while composing it validates on blur only and shows nothing during typing, and after it has shown an error it re-validates on every keystroke so the message clears as the reader fixes it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Quiet while composing, live while repairing</title>
  <desc>Phase one, composing: the reader is typing for the first time and the field shows nothing, however wrong the partial value looks. On blur it validates once and, if it fails, shows a message. Phase two, repairing: the reader is now correcting a known problem, so every keystroke re-validates and the message clears the instant the value becomes valid. The transition happens once per field, and a submit attempt moves every field into the repairing phase at once.</desc>
  <rect x="0" y="8" width="690" height="216" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">phase 1 — composing</text>
  <rect x="14" y="38" width="316" height="122" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#1e1a24" font-family="inherit">typing → nothing shown</text>
  <text x="28" y="86" font-size="10" fill="#1e1a24" font-family="inherit">blur → validate once</text>
  <text x="28" y="110" font-size="10" fill="#6b5f75" font-family="inherit">the reader has not finished a thought yet</text>
  <text x="28" y="136" font-size="9.5" fill="#6b5f75" font-family="inherit">interrupting here reads as nagging</text>
  <path d="M330,98 H360" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="345" y="90" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">first error</text>
  <text x="360" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">phase 2 — repairing</text>
  <rect x="360" y="38" width="316" height="122" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="374" y="62" font-size="10" fill="#1e1a24" font-family="inherit">typing → re-validate every keystroke</text>
  <text x="374" y="86" font-size="10" fill="#1e1a24" font-family="inherit">the message clears the moment it passes</text>
  <text x="374" y="110" font-size="10" fill="#6b5f75" font-family="inherit">the reader is fixing a known problem</text>
  <text x="374" y="136" font-size="9.5" fill="#2d6342" font-family="inherit">immediate confirmation is what repair needs</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">The transition happens once per field, and a submit attempt moves every field into phase 2 at once.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Both phases use the same rules — only the trigger changes, so a field can never pass in one phase and fail in the other.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A plain text field takes the default: quiet until the first blur, live afterwards. A password confirmation shows on change from the start, because it is compared against something the reader has already typed and live feedback genuinely helps. A username with a remote uniqueness check stays on blur in both phases, because live would mean a request per keystroke. An end date that must be after a start date waits for submit, because it cannot be judged until both fields exist." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four fields, four policies, one default</title>
  <desc>A plain text field takes the default: quiet until the first blur, live afterwards. A password confirmation shows on change from the start, because it is compared against something the reader has already typed and live feedback genuinely helps. A username with a remote uniqueness check stays on blur in both phases, because live would mean a request per keystroke. An end date that must be after a start date waits for submit, because it cannot be judged until both fields exist.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="190" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">First shown on</text>
  <text x="320" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Then on</text>
  <text x="430" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">any text field</text>
  <text x="190" y="66" font-size="10" fill="#6b5f75" font-family="inherit">blur</text>
  <text x="320" y="66" font-size="10" fill="#6b5f75" font-family="inherit">change</text>
  <text x="430" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the default</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">password confirm</text>
  <text x="190" y="100" font-size="10" fill="#7b4f8a" font-family="inherit">change</text>
  <text x="320" y="100" font-size="10" fill="#7b4f8a" font-family="inherit">change</text>
  <text x="430" y="100" font-size="10" fill="#6b5f75" font-family="inherit">compared to known input</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">username, remote check</text>
  <text x="190" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">blur</text>
  <text x="320" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">blur</text>
  <text x="430" y="134" font-size="10" fill="#6b5f75" font-family="inherit">live would be per keystroke</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">end date</text>
  <text x="190" y="168" font-size="10" fill="#7b4f8a" font-family="inherit">submit</text>
  <text x="320" y="168" font-size="10" fill="#6b5f75" font-family="inherit">change</text>
  <text x="430" y="168" font-size="10" fill="#6b5f75" font-family="inherit">needs both fields present</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Three exceptions in a form of forty fields. If the table grows much past that, the default is the wrong default.</text>
</svg>

## Step-by-Step Walkthrough

1. **Default to blur-then-change.** It is right for the large majority of text fields, and making it the default keeps the policy table short enough to review.

2. **List only the exceptions.** A confirmation field, a remote check, a cross-field rule. If the table grows past a handful of entries, the default is wrong.

3. **Track `hasShownError` per field.** This is the phase flag, and it is what makes "quiet, then live" possible without a special case per field.

4. **Let a submit override everything.** After a submit attempt the reader has asked for judgement on the whole form, so every field speaks.

5. **Keep the rules identical across phases.** Only the trigger changes. A field that passes on blur and fails on change is a form that appears to change its mind.

6. **Debounce the change-phase evaluation.** Re-validating on every keystroke is fine for a regex and not fine for a schema parse over a large object; the debounce belongs in the trigger, not in the rule.

## Failure Modes and Edge Cases

### 1. Autofill fires neither trigger reliably

A password manager filling several fields at once may produce `input` events but no `blur`. A field whose policy is `firstShowOn: 'blur'` then never validates. Treat a fill of a previously empty field as a blur-equivalent, or re-validate everything on submit — which the submit override already does.

### 2. A field the reader never focuses

Tabbing past an empty required field produces a blur, so it validates. Never focusing it at all produces nothing, and the field is unjudged until submit. That is correct, and it is why the submit override is not optional.

### 3. Live validation on an expensive rule

`thenOn: 'change'` with a remote check is a request per keystroke. Keep expensive rules on `blur` in both phases, and let the cheap structural rules go live.

### 4. Radio and checkbox groups

A group blurs when focus leaves the *group*, not each option. Attach the blur listener to the fieldset with capture, or the policy fires on every arrow key.

### 5. Select elements

A `<select>` produces `change` on choose and `blur` on leave, usually together. Both policies collapse to the same behaviour, which is fine — do not special-case it.

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Validating too early produces a field marked invalid five characters into an address that is being typed, a message the reader has to ignore, and — over a whole form — a habit of ignoring messages that matters when one finally does. Validating too late produces a reader who fills twelve fields before learning the second one was wrong, and a repair pass that starts by scrolling back up. The default, quiet then live, avoids both by changing behaviour at the moment the reader stops composing and starts repairing." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two failures the policy is chosen between</title>
  <desc>Validating too early produces a field marked invalid five characters into an address that is being typed, a message the reader has to ignore, and — over a whole form — a habit of ignoring messages that matters when one finally does. Validating too late produces a reader who fills twelve fields before learning the second one was wrong, and a repair pass that starts by scrolling back up. The default, quiet then live, avoids both by changing behaviour at the moment the reader stops composing and starts repairing.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">too early</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">invalid five characters into an address</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">a message that must be ignored</text>
  <text x="28" y="106" font-size="10" fill="#a63d6f" font-family="inherit">and then all of them are ignored</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">the cost compounds across the form</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">too late</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">twelve fields filled before the news</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">a repair pass that starts by scrolling</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">several problems arriving at once</text>
  <text x="366" y="128" font-size="10" fill="#6b5f75" font-family="inherit">and the submit already refused</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">Quiet then live avoids both, because it switches exactly when the reader stops composing and starts repairing.</text>
</svg>

## Verification Checklist

- [ ] Typing into an untouched field shows nothing
- [ ] Leaving an invalid field shows the message once
- [ ] Fixing that field clears the message without another blur
- [ ] A submit attempt makes every unjudged field speak
- [ ] A password confirmation validates while typing
- [ ] A remote check never fires per keystroke
- [ ] Autofilling several fields at once still results in them being judged
- [ ] The same value is judged identically in both phases

## Common Pitfalls

- **One mode for the whole form.** A confirmation field, a remote check and a cross-field rule want three different behaviours, and a single setting forces two of them to be wrong.
- **Different rules per phase.** Only the trigger should change between composing and repairing. A field that passes on blur and fails on change is a form that appears to change its mind.
- **Blur listeners on individual options.** A radio group blurs when focus leaves the group, not each option. Listen on the fieldset, or the policy fires on every arrow press.
- **Live validation on an expensive rule.** Making everything live after the first error turns a remote uniqueness check into a request per keystroke. Keep expensive rules on blur in both phases.
- **Assuming a fill produces a blur.** A password manager filling several fields at once may emit input events and no blur at all, so a blur-only policy never judges them. The submit override is what catches this.

---

**Related**

- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — the state machine these triggers drive
- [Revalidating After the First Submit](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/revalidating-after-the-first-submit/) — the override, implemented
- [Debouncing Validation Triggers in React](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/) — keeping the change phase cheap

← [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/)

## Frequently Asked Questions

<details>
<summary><strong>Should validation mode be a global form setting?</strong></summary>

Only as a default. A confirmation field genuinely wants live feedback, a remote uniqueness check must not fire per keystroke, and a cross-field rule cannot be judged until its inputs exist — three different behaviours in one form. Make blur-then-change the default and keep a short table of exceptions, so the unusual policies are visible rather than buried in component props.

</details>

<details>
<summary><strong>Why not validate on change from the start?</strong></summary>

Because an email address is invalid for most of the time it is being typed, and telling the reader so five characters in is noise they have to ignore. The cost is not just annoyance: a field that cries wolf while composing trains readers to skip past its message when it finally matters. Waiting for blur costs nothing — the reader finds out before they submit either way.

</details>

<details>
<summary><strong>What about fields the reader never touches?</strong></summary>

They stay unjudged until the submit attempt, which is correct: showing an error on a field nobody has interacted with is a form telling the reader off for not having got there yet. The submit override is what guarantees they are judged eventually, which is why it is not optional even when every field has an explicit policy.

</details>

