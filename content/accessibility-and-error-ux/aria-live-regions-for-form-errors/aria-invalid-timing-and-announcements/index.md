---
layout: page.njk
title: "aria-invalid Timing and Screen Reader Announcements"
description: "When to flip aria-invalid true — only after a field is touched or the form submits, never on pristine — and how to debounce so screen readers do not announce mid-typing."
slug: aria-invalid-timing-and-announcements
type: howto
breadcrumb: "aria-invalid Timing"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "aria-invalid Timing and Announcements"
  parent: "ARIA Live Regions for Form Errors"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "aria-invalid Timing and Screen Reader Announcements",
      "description": "When to flip aria-invalid true — only after a field is touched or the form submits, never on pristine — and how to debounce so screen readers do not announce mid-typing.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility & Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "ARIA Live Regions for Form Errors", "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/" },
        { "@type": "ListItem", "position": 4, "name": "aria-invalid Timing", "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Time aria-invalid updates for screen readers",
      "step": [
        { "@type": "HowToStep", "name": "Keep aria-invalid off any field that is still pristine" },
        { "@type": "HowToStep", "name": "Compute validity on input but defer flipping aria-invalid until blur or submit" },
        { "@type": "HowToStep", "name": "Debounce the aria-invalid write so it does not toggle mid-keystroke" },
        { "@type": "HowToStep", "name": "On submit, set aria-invalid on every invalid field at once" },
        { "@type": "HowToStep", "name": "Write the human-readable message to the live region only after aria-invalid settles" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "When should aria-invalid first be set to true?",
          "acceptedAnswer": { "@type": "Answer", "text": "Never while the field is pristine. Set aria-invalid=\"true\" only after the field has been touched (blurred at least once) or after a submit attempt. Setting it on load makes a screen reader announce fields as invalid before the user has typed anything, which reads as broken." }
        },
        {
          "@type": "Question",
          "name": "How do I stop the screen reader announcing errors on every keystroke?",
          "acceptedAnswer": { "@type": "Answer", "text": "Debounce the aria-invalid write and the live-region message by 300 to 500 milliseconds of input inactivity, or defer them to the blur event entirely. Compute validity synchronously if you like, but only commit the aria-invalid attribute and the message once the user pauses, so the announcement fires once per intent rather than per character." }
        },
        {
          "@type": "Question",
          "name": "Should aria-invalid be removed or set to false when a field becomes valid?",
          "acceptedAnswer": { "@type": "Answer", "text": "Set aria-invalid=\"false\" rather than removing the attribute. An explicit false is a stable, queryable state that keeps your toggle logic symmetric, and it lets a live region announce that a previously flagged field is now corrected. Removing the attribute is also valid but complicates diffing and testing." }
        }
      ]
    }
  ]
}
</script>

# aria-invalid Timing and Screen Reader Announcements

`aria-invalid` is not a validity flag you mirror from your validation engine — it is an *announcement trigger*, and setting it too early or too often turns a screen reader into a stream of "invalid, invalid, invalid" that drives users out of the form.

The failure this page fixes: your form computes validity correctly, but a screen reader announces every field as invalid on page load, or re-announces the same error on every keystroke while the user is still typing. Both come from wiring `aria-invalid` to raw validity instead of to *interaction state*. The attribute must follow the touched/dirty lifecycle, not the millisecond-by-millisecond result of the validator.

This is the counterpart to the [ARIA live regions for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/) work — the live region carries the message text, `aria-invalid` marks the field as the thing that message is about — and it depends directly on [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) to know when a field has actually been interacted with.

---

## The timing rule

There are exactly three moments `aria-invalid` may legitimately change, and one long stretch where it must not:

- **Never while pristine.** A field the user has not touched must not carry `aria-invalid="true"`, even if it is empty-and-required and therefore technically invalid. Pristine required fields are *incomplete*, not *erroneous*.
- **On blur (touched).** The first time a field loses focus, it becomes eligible. If it is invalid at that point, flip `aria-invalid="true"` and announce.
- **On submit.** Every remaining invalid field flips at once. This is the only moment a still-pristine field is allowed to become invalid, because submitting is the user asserting they are done.
- **On correction.** Once a field is `aria-invalid="true"`, it may drop to `"false"` as soon as it becomes valid — this transition *should* be announced so the user knows they fixed it.

The subtle part is the debounce. Even a touched field should not re-announce on every keypress. Compute validity as often as you like, but only *commit* `aria-invalid` and the live-region message after the user pauses.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" role="img" aria-label="State machine showing aria-invalid transitions from pristine through touched to invalid and corrected" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>aria-invalid lifecycle relative to interaction state</title>
  <desc>Transitions from PRISTINE with no aria-invalid, to TOUCHED on blur, to INVALID after a debounce when the value fails, and back to VALID when corrected, with submit forcing all fields to evaluate.</desc>
  <rect x="0" y="0" width="720" height="300" fill="#f9f5fb"/>
  <rect width="720" height="300" rx="12" fill="none" stroke="#cbb8d9" stroke-width="1"/>
  <rect x="40" y="120" width="150" height="56" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="115" y="143" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">PRISTINE</text>
  <text x="115" y="161" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">no aria-invalid</text>
  <rect x="285" y="120" width="150" height="56" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="360" y="143" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">TOUCHED</text>
  <text x="360" y="161" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">eligible to flag</text>
  <rect x="530" y="40" width="150" height="56" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="605" y="63" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">INVALID</text>
  <text x="605" y="81" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">aria-invalid=true</text>
  <rect x="530" y="200" width="150" height="56" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="605" y="223" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">VALID</text>
  <text x="605" y="241" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">aria-invalid=false</text>
  <path d="M190 148 L285 148" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-ariainvalid)"/>
  <text x="237" y="140" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">blur</text>
  <path d="M435 138 C490 115 500 95 530 82" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-ariainvalid)"/>
  <text x="470" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">debounce + fail</text>
  <path d="M435 158 C490 185 500 205 530 218" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-ariainvalid)"/>
  <text x="470" y="200" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">debounce + pass</text>
  <path d="M560 200 C540 160 555 120 575 96" fill="none" stroke="#6b5f75" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arr-ariainvalid)"/>
  <text x="512" y="150" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">re-fail</text>
  <path d="M115 120 C130 60 300 45 500 55 L528 60" fill="none" stroke="#6b5f75" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-ariainvalid)"/>
  <text x="300" y="40" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">submit forces evaluation of pristine fields</text>
  <defs>
    <marker id="arr-ariainvalid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
</svg>

---

## Core implementation

The controller below separates three concerns that engineers usually collapse into one: *computing* validity (cheap, synchronous, runs on every input), *deciding eligibility* (touched or submitted), and *committing* the announcement (debounced). Only the third writes `aria-invalid` or the live region.

```typescript
interface FieldA11yState {
  touched: boolean;   // has the field been blurred at least once?
  submitted: boolean; // has the form been submitted at least once?
  valid: boolean;     // latest synchronous validity result
  message: string;    // human-readable error, empty when valid
}

class AriaInvalidController {
  private timers = new Map<string, number>();

  constructor(
    private inputs: Map<string, HTMLElement>,
    private liveRegion: HTMLElement, // aria-live="assertive" error summary
    private debounceMs = 400
  ) {}

  /**
   * Called on every `input` event. Cheap: it only records validity and
   * schedules a debounced commit. It never touches aria-invalid directly,
   * so typing "aaa" does not flip the attribute three times.
   */
  onInput(name: string, state: FieldA11yState): void {
    const existing = this.timers.get(name);
    if (existing) clearTimeout(existing);

    const timer = window.setTimeout(() => {
      this.commit(name, state);
      this.timers.delete(name);
    }, this.debounceMs);
    this.timers.set(name, timer);
  }

  /**
   * Called on `blur`. Blur is a deliberate "I'm done with this field"
   * signal, so we commit immediately and cancel any pending debounce.
   */
  onBlur(name: string, state: FieldA11yState): void {
    const existing = this.timers.get(name);
    if (existing) clearTimeout(existing);
    this.timers.delete(name);
    this.commit(name, { ...state, touched: true });
  }

  /**
   * Called once on submit. Flushes every field synchronously — including
   * still-pristine ones, which submit is allowed to evaluate — and lets
   * the caller move focus to the first invalid field afterwards.
   */
  onSubmit(states: Map<string, FieldA11yState>): void {
    for (const [name, state] of states) {
      const existing = this.timers.get(name);
      if (existing) clearTimeout(existing);
      this.timers.delete(name);
      this.commit(name, { ...state, submitted: true });
    }
  }

  private commit(name: string, state: FieldA11yState): void {
    const el = this.inputs.get(name);
    if (!el) return;

    // Eligibility gate: pristine, un-submitted fields are never flagged.
    const eligible = state.touched || state.submitted;
    if (!eligible) {
      el.removeAttribute("aria-invalid"); // stay neutral while pristine
      return;
    }

    const wasInvalid = el.getAttribute("aria-invalid") === "true";
    el.setAttribute("aria-invalid", state.valid ? "false" : "true");

    // Announce only on a meaningful transition, not on every commit,
    // so a field that stays invalid does not re-nag on each blur.
    if (!state.valid && !wasInvalid) {
      this.announce(state.message);
    } else if (state.valid && wasInvalid) {
      this.announce(`${name} is now valid.`);
    }
  }

  private announce(message: string): void {
    // Clear then set on the next frame so identical consecutive messages
    // still register as a DOM change the live region will announce.
    this.liveRegion.textContent = "";
    requestAnimationFrame(() => {
      this.liveRegion.textContent = message;
    });
  }
}
```

---

## Step-by-step walkthrough

1. **Input events compute, they do not commit.** Every keystroke calls `onInput`, which resets a per-field debounce timer. `aria-invalid` is untouched until the user pauses for `debounceMs`.
2. **Blur commits immediately.** Leaving a field is an intentional boundary, so `onBlur` cancels the debounce and commits now, marking the field `touched`. This is when a pristine field first becomes eligible.
3. **The eligibility gate blocks pristine fields.** Inside `commit`, a field that is neither touched nor submitted has its `aria-invalid` *removed*, guaranteeing no announcement before interaction.
4. **Submit flushes everything.** `onSubmit` walks every field, cancels pending debounces, and commits with `submitted: true`, so even untouched required fields flip to `aria-invalid="true"` in one pass — after which the caller [moves focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).
5. **Announcements fire only on transitions.** `commit` compares the previous attribute value to the new one, so a field that stays invalid across two blurs announces once, and a corrected field announces its recovery.

---

Laid out end to end, the pipeline has a silent half and a speaking half, and every timing bug is a write that happened in the wrong half:

<svg viewBox="0 8 666 148" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pipeline from keystroke to announcement in five stages. The first two stages, the input event and the debounce window, are a silent zone in which no ARIA attribute may be written. The last three stages — validate, set aria-invalid, and swap the live region text — are the announcing zone." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The silent half and the speaking half of the announcement pipeline</title>
  <desc>Five stages left to right: input event with the value changing; a debounce window of about four hundred milliseconds during which nothing is written; validation, which computes the error; setting aria-invalid, which happens only on blur or submit; and swapping the live region text, which is what the screen reader actually speaks. A bracket under the first two stages marks them as the silent zone where no ARIA write may happen, and a bracket under the last three marks them as the announcing zone.</desc>
  <rect x="0" y="8" width="666" height="148" fill="#f9f5fb"/>
  <text x="14" y="22" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">One keystroke, one announcement — and only at the end</text>
  <rect x="14" y="32" width="118" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="73" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">input event</text>
  <text x="73" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">value changes</text>
  <rect x="144" y="32" width="118" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="203" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">debounce 400ms</text>
  <text x="203" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">timer pending</text>
  <rect x="274" y="32" width="118" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="333" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">validate</text>
  <text x="333" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">error computed</text>
  <rect x="404" y="32" width="118" height="56" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="463" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">aria-invalid</text>
  <text x="463" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">blur or submit only</text>
  <rect x="534" y="32" width="118" height="56" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="593" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">live region</text>
  <text x="593" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">text swapped</text>
  <path d="M136,60 H142" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M266,60 H272" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M396,60 H402" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M526,60 H532" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M14,98 V106 H262 V98" fill="none" stroke="#a63d6f" stroke-width="1.4"/>
  <text x="138" y="122" text-anchor="middle" font-size="10" fill="#a63d6f" font-family="inherit">silent zone — write no ARIA here</text>
  <path d="M274,98 V106 H652 V98" fill="none" stroke="#2d6342" stroke-width="1.4"/>
  <text x="463" y="122" text-anchor="middle" font-size="10" fill="#2d6342" font-family="inherit">announcing zone — one write, one utterance</text>
  <text x="14" y="146" font-size="10" fill="#6b5f75" font-family="inherit">Every "it announced too early" bug is an ARIA write that leaked left of the divide.</text>
</svg>

## Failure modes and edge cases

### aria-invalid on load

Rendering server-computed validity straight into the attribute flags every empty required field on first paint.

```typescript
// WRONG — flags pristine required fields on mount
el.setAttribute("aria-invalid", String(!field.valid));

// RIGHT — gate on interaction; pristine stays neutral
if (state.touched || state.submitted) {
  el.setAttribute("aria-invalid", state.valid ? "false" : "true");
}
```

### The message re-announces because textContent did not change

Live regions only announce on a DOM mutation. Writing the identical error string twice is a no-op, so a second failed blur says nothing. The clear-then-set-on-next-frame trick in `announce` forces a mutation. Do not skip the `requestAnimationFrame`; setting `""` and the message in the same tick collapses to one mutation on some engines.

### Debounce timer leaks on unmount

The `timers` map holds `setTimeout` handles. If the component unmounts mid-debounce, the callback fires against a detached element. Clear all timers in teardown:

```typescript
destroy(): void {
  for (const id of this.timers.values()) clearTimeout(id);
  this.timers.clear();
}
```

### assertive live region interrupts mid-typing

If the error region is `aria-live="assertive"` and you commit on input rather than on blur, every debounced update interrupts the screen reader's echo of the character the user just typed. Prefer `polite` for validation messages, reserve `assertive` for the submit-time error summary, and always debounce.

### Screen reader double-speaks on submit

If both `aria-invalid` flipping and the live-region message land in the same tick, JAWS may read the field's new invalid state *and* the summary. Announce the summary from `onSubmit`, but let per-field `aria-invalid` changes be silent during a submit flush by suppressing `announce` when `submitted` is true and delegating the single summary announcement to the form controller.

---

Turning that into a rule you can apply at the call site, the decision has only three inputs:

<svg viewBox="0 8 620 236" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision tree for setting aria-invalid. If the field has never been blurred and the form has not been submitted, leave the attribute unset. If it has been blurred or submitted and the value is valid, set aria-invalid to false. If it has been blurred or submitted and the value is invalid, set aria-invalid to true and update the described-by message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When aria-invalid may be written</title>
  <desc>A decision tree. First question: has this field been blurred, or has the form been submitted? If no, leave aria-invalid unset entirely — the user is still typing. If yes, second question: does the value pass validation? If it passes, set aria-invalid to false. If it fails, set aria-invalid to true and swap the message the field is described by.</desc>
  <rect x="0" y="8" width="620" height="236" fill="#f9f5fb"/>
  <rect x="14" y="16" width="230" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="129" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">Blurred, or form submitted?</text>
  <text x="129" y="55" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">the only gate that matters</text>
  <path d="M129,68 V96 H14" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="70" y="90" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14" y="104" width="230" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="129" y="126" text-anchor="middle" font-size="11" font-weight="700" fill="#a63d6f" font-family="inherit">leave the attribute off</text>
  <text x="129" y="143" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">no aria-invalid, no message</text>
  <path d="M244,42 H300" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="272" y="34" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="inherit">yes</text>
  <rect x="300" y="16" width="200" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="400" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">Does the value pass?</text>
  <text x="400" y="55" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">run the validator now</text>
  <path d="M400,68 V96 H360" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M400,68 V96 H480" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="284" y="104" width="152" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="360" y="126" text-anchor="middle" font-size="11" font-weight="700" fill="#2d6342" font-family="inherit">aria-invalid="false"</text>
  <text x="360" y="143" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">clear the message</text>
  <rect x="452" y="104" width="152" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="528" y="126" text-anchor="middle" font-size="11" font-weight="700" fill="#a63d6f" font-family="inherit">aria-invalid="true"</text>
  <text x="528" y="143" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">swap described-by text</text>
  <text x="14" y="186" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why the left branch is not aria-invalid="false"</text>
  <text x="14" y="204" font-size="10" fill="#6b5f75" font-family="inherit">An explicit "false" is a claim that the field was checked and passed. On an untouched field that is a lie,</text>
  <text x="14" y="220" font-size="10" fill="#6b5f75" font-family="inherit">and some screen readers voice the state change, so the reader hears "valid" for a field they never filled in.</text>
  <text x="14" y="236" font-size="10" fill="#6b5f75" font-family="inherit">Absent means "not yet judged" — the only honest state before first blur.</text>
</svg>

## Verification checklist

- [ ] No field carries aria-invalid="true" on initial render, including empty required fields
- [ ] aria-invalid first appears only after blur or submit, never during pristine typing
- [ ] Typing several characters does not toggle aria-invalid per keystroke (debounced)
- [ ] Blurring a field commits validity immediately, cancelling any pending debounce
- [ ] Submit flips aria-invalid on all invalid fields, including untouched ones, in one pass
- [ ] A corrected field transitions to aria-invalid="false" and announces recovery once
- [ ] Repeated identical error messages still announce (clear-then-set forces a mutation)
- [ ] Debounce timers are cleared on component teardown
- [ ] Tested with NVDA + Firefox and VoiceOver + Safari: no mid-typing "invalid" interruptions

---

## Frequently Asked Questions

<details>
<summary><strong>When should aria-invalid first be set to true?</strong></summary>

Never while the field is pristine. Set `aria-invalid="true"` only after the field has been touched (blurred at least once) or after a submit attempt. Setting it on load makes a screen reader announce fields as invalid before the user has typed anything, which reads as broken. The eligibility gate in `commit` enforces exactly this by removing the attribute from any field that is neither touched nor submitted.

</details>

<details>
<summary><strong>How do I stop the screen reader announcing errors on every keystroke?</strong></summary>

Debounce the `aria-invalid` write and the live-region message by 300 to 500 milliseconds of input inactivity, or defer them to the blur event entirely. Compute validity synchronously if you like, but only commit the `aria-invalid` attribute and the message once the user pauses, so the announcement fires once per intent rather than per character. The controller here schedules a per-field timer on input and flushes it on blur.

</details>

<details>
<summary><strong>Should aria-invalid be removed or set to false when a field becomes valid?</strong></summary>

Set `aria-invalid="false"` rather than removing the attribute. An explicit false is a stable, queryable state that keeps your toggle logic symmetric, and it lets a live region announce that a previously flagged field is now corrected. Removing the attribute is also valid per spec but complicates diffing and testing. The one time you *do* remove it is while the field is still pristine, to keep it fully neutral.

</details>

---

## Related

- [Wiring aria-describedby for Multiple Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/)
- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
- [Moving Focus to the First Invalid Field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/)

← [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
