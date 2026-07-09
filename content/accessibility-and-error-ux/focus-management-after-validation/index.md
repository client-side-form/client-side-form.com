---
layout: page.njk
title: "Focus Management After Validation"
description: "Programmatic focus after a failed submit — move focus to the first invalid field or the error summary, avoid focus theft, and restore focus after async validation."
slug: focus-management-after-validation
type: cluster
breadcrumb: "Focus Management"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Focus Management After Validation"
  parent: "Accessibility and Error UX"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Focus Management After Validation",
      "description": "Programmatic focus after a failed submit — move focus to the first invalid field or the error summary, avoid focus theft, and restore focus after async validation.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility and Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "Focus Management After Validation", "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Manage Focus After Form Validation Fails",
      "step": [
        { "@type": "HowToStep", "name": "Only move focus on an explicit submit, never on keystroke or blur" },
        { "@type": "HowToStep", "name": "Await any in-flight async validation before deciding where focus lands" },
        { "@type": "HowToStep", "name": "Choose a target: the error summary for long forms, the first invalid field for short ones" },
        { "@type": "HowToStep", "name": "Focus the target with preventScroll, then scrollIntoView with a controlled block position" },
        { "@type": "HowToStep", "name": "Abort the focus cycle if a newer submit or reset supersedes it" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I move focus to the first invalid field or to an error summary?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use an error summary at the top of the form when there is more than one error or the form is long enough that the first invalid field is off-screen. Move focus directly to the first invalid field when there is a single error in a short form. The summary gives the user the full count and lets them jump to each field; direct focus is faster when there is only one thing to fix." }
        },
        {
          "@type": "Question",
          "name": "Why should focus only move on explicit submit?",
          "acceptedAnswer": { "@type": "Answer", "text": "Moving focus on keystroke or blur is focus theft: it yanks the caret out from under a user who is still typing or tabbing, and it fires assistive-technology announcements for errors the user has not finished causing. Programmatic focus is only unambiguous after an explicit submit, when the user has signalled they are done and expect the form to respond." }
        },
        {
          "@type": "Question",
          "name": "How do I stop async validation from stealing focus after the user has moved on?",
          "acceptedAnswer": { "@type": "Answer", "text": "Tie each submit-and-validate cycle to an AbortController. When the promise resolves, check signal.aborted before touching focus. If the user submitted again, reset the form, or navigated away, the newer action aborts the stale controller and the late result is discarded instead of hijacking the caret." }
        },
        {
          "@type": "Question",
          "name": "Why does my error summary need tabindex=-1?",
          "acceptedAnswer": { "@type": "Answer", "text": "A div, section, or heading is not focusable by default, so element.focus() silently does nothing. Adding tabindex=\"-1\" makes it programmatically focusable without inserting it into the tab order, so focus lands on the summary and screen readers announce it, but keyboard users never tab into an inert container." }
        }
      ]
    }
  ]
}
</script>

# Focus Management After Validation

When a submit fails validation, the sighted mouse user sees a red field and the keyboard or screen-reader user sees nothing — unless you move focus. Programmatic focus after validation is the single accessibility control that turns an inaccessible form into an operable one, and it is also the control engineers get wrong most often: focus moves on the wrong event, lands on an unfocusable container, fights a smooth-scroll animation, or gets hijacked by an async result that resolves three seconds after the user has already moved on.

This page specifies exactly when focus should move, where it should land, and how to keep a slow [asynchronous validation](/validation-logic-schema-integration/asynchronous-validation-strategies/) round from stealing focus after the user has navigated elsewhere. It sits under the [accessibility and error UX](/accessibility-and-error-ux/) pillar and pairs with [ARIA live regions for form errors](/accessibility-and-error-ux/aria-live-regions-for-form-errors/), which handles the announcement side of the same failure event.

---

## Problem Statement

Focus after validation has to satisfy four constraints at once, and naive implementations satisfy at most two:

- **Timing.** Focus must move only after an *explicit* submit, and only after all validation — including async rounds — has resolved. Moving focus on `input` or `blur` is focus theft; moving it before an async check resolves means focusing a field that turns out to be valid.
- **Target selection.** The correct destination depends on the shape of the failure. One error in a three-field form wants direct focus on that field. Six errors in a forty-field form want an error summary the user can read and navigate.
- **Scroll coordination.** `element.focus()` triggers the browser's default "scroll into view" behaviour, which fights any CSS `scroll-behavior: smooth` and any manual `scrollIntoView()` you call afterward. You need exactly one scroll, positioned deliberately.
- **Concurrency.** A user can submit, then submit again, then reset — all while the first async validation is still in flight. Every one of those actions must be able to cancel the focus decision the previous one queued.

The pattern below models the whole submit-to-focus flow as one cancellable cycle governed by an `AbortController`, so a stale result can never land on a form the user has already changed.

---

## State Machine Specification

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Sequence diagram of submit to validate to focus first invalid field" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Submit → Validate → Focus Sequence</title>
  <desc>A submit event runs synchronous then asynchronous validation; on failure the focus manager selects an error summary or the first invalid field, focuses it without scrolling, then scrolls it into view. A newer submit or reset aborts the cycle.</desc>
  <rect width="760" height="360" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- IDLE -->
  <rect x="40" y="150" width="120" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="100" y="172" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">IDLE</text>
  <text x="100" y="190" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">awaiting submit</text>
  <!-- VALIDATING -->
  <rect x="245" y="150" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="310" y="172" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">VALIDATING</text>
  <text x="310" y="190" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">sync + async</text>
  <!-- FOCUSING -->
  <rect x="455" y="60" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="520" y="82" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">FOCUSING</text>
  <text x="520" y="100" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">on failure</text>
  <!-- SUBMITTED -->
  <rect x="455" y="240" width="130" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="520" y="262" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">SUBMITTED</text>
  <text x="520" y="280" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.65">on success</text>
  <!-- ABORTED -->
  <rect x="640" y="150" width="90" height="54" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.5" stroke-dasharray="5 3"/>
  <text x="685" y="176" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor" opacity="0.8">ABORTED</text>
  <text x="685" y="192" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.6">stale</text>
  <!-- IDLE -> VALIDATING -->
  <path d="M160 177 L245 177" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-focus)"/>
  <text x="202" y="168" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">submit</text>
  <!-- VALIDATING -> FOCUSING -->
  <path d="M360 150 C400 115 425 95 455 90" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-focus)"/>
  <text x="392" y="112" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">INVALID</text>
  <!-- VALIDATING -> SUBMITTED -->
  <path d="M360 204 C400 239 425 259 455 264" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-focus)"/>
  <text x="392" y="252" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">VALID</text>
  <!-- VALIDATING -> ABORTED -->
  <path d="M375 172 C480 150 560 160 640 172" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#arr-focus)"/>
  <text x="510" y="145" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.7">re-submit / reset → abort()</text>
  <!-- FOCUSING -> IDLE (return) -->
  <path d="M455 100 C300 120 180 130 140 148" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.55" stroke-dasharray="4 3" marker-end="url(#arr-focus)"/>
  <text x="280" y="118" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.7">focus first invalid, then scrollIntoView</text>
  <defs>
    <marker id="arr-focus" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
</svg>

| Trigger | From state | To state | Side-effect |
|---------|-----------|----------|-------------|
| `submit` (explicit) | IDLE | VALIDATING | fresh `AbortController`; run sync then async rules |
| all rules pass | VALIDATING | SUBMITTED | send payload; leave focus on submit button |
| one or more rules fail | VALIDATING | FOCUSING | pick target (summary vs first invalid) |
| target focused + scrolled | FOCUSING | IDLE | `focus({ preventScroll })` then one `scrollIntoView` |
| newer `submit` or `reset()` | VALIDATING / FOCUSING | ABORTED → IDLE | `controller.abort()`; discard stale result |

---

## Core Implementation

The `FocusManager` below owns the whole cycle. It never moves focus on `input` or `blur` — only `runValidationCycle()`, which a submit handler calls, can move focus. Each cycle is tied to an `AbortController` so a superseding submit or a reset invalidates the previous cycle's decision before it can touch the DOM.

```typescript
export interface FieldError {
  /** The `name`/`id` of the invalid control, used to resolve its DOM node. */
  field: string;
  message: string;
}

export interface FocusManagerOptions {
  /** The form element whose fields and summary we manage. */
  form: HTMLFormElement;
  /** The error-summary container; must carry tabindex="-1" to be focusable. */
  summary?: HTMLElement | null;
  /** Above this many errors we prefer the summary over the first field. */
  summaryThreshold?: number;
  /** Async validator resolving to the ordered list of current errors. */
  validate: (signal: AbortSignal) => Promise<FieldError[]>;
}

export class FocusManager {
  private readonly opts: Required<Pick<FocusManagerOptions, "summaryThreshold">> &
    FocusManagerOptions;

  // The controller for the CURRENTLY running cycle. A new submit or a reset
  // aborts it so a slow async validation can never focus a stale target.
  private activeController: AbortController | null = null;

  constructor(options: FocusManagerOptions) {
    this.opts = { summaryThreshold: 2, ...options };
  }

  /**
   * Call ONLY from an explicit submit handler — never from input/blur.
   * Returns true when the form is valid and may be submitted.
   */
  async runValidationCycle(): Promise<boolean> {
    // Abort any prior in-flight cycle: if the user double-submits, the first
    // cycle's late-resolving promise must not move focus after this one runs.
    this.activeController?.abort();

    const controller = new AbortController();
    this.activeController = controller;
    const { signal } = controller;

    let errors: FieldError[];
    try {
      errors = await this.opts.validate(signal);
    } catch (err) {
      // A DOMException named "AbortError" means a newer cycle superseded us;
      // swallow it so the stale cycle exits without touching focus.
      if (err instanceof DOMException && err.name === "AbortError") return false;
      throw err;
    }

    // If a newer submit/reset aborted us while validate() resolved, stop here.
    // Without this guard the stale result would steal focus from the new caret.
    if (signal.aborted) return false;

    if (errors.length === 0) {
      this.activeController = null;
      return true; // caller proceeds to submit
    }

    this.moveFocusToError(errors);
    this.activeController = null;
    return false;
  }

  /** Cancel the running cycle — call from your reset handler. */
  cancel(): void {
    // Aborting on reset guarantees a late async result cannot re-focus a field
    // on a form the user just cleared.
    this.activeController?.abort();
    this.activeController = null;
  }

  private moveFocusToError(errors: FieldError[]): void {
    const useSummary =
      this.opts.summary != null && errors.length >= this.opts.summaryThreshold;

    const target = useSummary
      ? this.opts.summary!
      : this.resolveField(errors[0].field);

    if (!target) return;

    // preventScroll stops the browser's default focus-scroll from racing the
    // explicit scrollIntoView below; we want exactly one, controlled scroll.
    target.focus({ preventScroll: true });

    // Honour reduced-motion; "start" keeps the summary heading fully visible,
    // "center" is friendlier for a single field deep in a long form.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: useSummary ? "start" : "center",
    });
  }

  private resolveField(name: string): HTMLElement | null {
    const el = this.opts.form.elements.namedItem(name);
    return el instanceof HTMLElement ? el : null;
  }
}
```

Key design decisions:

- **One entry point moves focus.** `moveFocusToError()` is private; only `runValidationCycle()` — invoked from a submit handler — can reach it. There is no code path where a keystroke moves focus.
- **`focus({ preventScroll: true })` before `scrollIntoView`.** Calling `focus()` normally scrolls the element into view with the browser's own heuristic, then your `scrollIntoView` scrolls again — two competing animations. Suppressing the first gives you a single, positioned scroll.
- **The `signal.aborted` re-check after `await`.** Even if `validate()` ignores the signal, the guard after it resolves ensures a superseded cycle exits before touching the DOM.

---

## Error Summary vs First Invalid Field

The threshold logic above encodes the accessibility guidance: a summary wins when there are multiple errors or a long form, and direct field focus wins for a single error in a short form. The summary itself is a focusable landmark:

```html
<div
  id="error-summary"
  tabindex="-1"
  role="alert"
  aria-labelledby="error-summary-heading"
  hidden
>
  <h2 id="error-summary-heading">There are 3 problems with your submission</h2>
  <ul>
    <li><a href="#email">Enter a valid email address</a></li>
    <li><a href="#password">Password must be at least 12 characters</a></li>
    <li><a href="#terms">You must accept the terms</a></li>
  </ul>
</div>
```

The `tabindex="-1"` is load-bearing: a `<div>` is not focusable by default, so `element.focus()` would silently no-op and the screen reader would announce nothing. `tabindex="-1"` makes the container programmatically focusable *without* inserting it into the natural tab order, so keyboard users never tab into an inert wrapper. Each list item links to the field's `id`, so activating it moves focus to the actual control — the summary is a navigation aid, not a dead end. Rendering `role="alert"` on a container that was previously `hidden` announces the summary the moment it appears, complementing the [ARIA live regions](/accessibility-and-error-ux/aria-live-regions-for-form-errors/) that announce inline messages.

---

## Integration Guidance

Focus management is the terminal step of the submit path; it depends on validation having already produced an ordered error list. The [accessibility and error UX](/accessibility-and-error-ux/) pillar frames how announcement, focus, and keyboard operability fit together, and the [keyboard navigation patterns](/accessibility-and-error-ux/keyboard-navigation-patterns/) page covers the tab-order rules that determine what "first invalid field" even means in DOM order.

The `validate(signal)` callback is where you plug in your validation pipeline. For synchronous rules the signal is irrelevant; for [asynchronous validation strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/) — server-side uniqueness checks, remote business rules — the same `AbortSignal` should be forwarded into `fetch`, so aborting the focus cycle also cancels the network request that fed it.

Two ordering rules keep the integration honest:

1. **Never move focus before async resolves.** If you focus the first *synchronously* invalid field and an async check then invalidates an earlier field, focus is now on the wrong control. Await the full error list, then focus once.
2. **Return the error list in DOM order.** "First invalid field" means first in tab order, not first in your schema's key order. Sort errors by the field's document position before handing them to the manager.

---

## Edge Cases and Failure Modes

### Async validation resolves after the user moved on

The classic race: the user submits, the async uniqueness check takes two seconds, and in the meantime the user has clicked into another field or navigated to a different step. When the promise resolves it focuses the first invalid field, yanking the caret away.

**Resolution:** This is exactly what the `AbortController` guards. Any newer submit or a `cancel()` from a step change aborts the active controller; the `signal.aborted` re-check after `await` makes the stale cycle exit before `moveFocusToError()` runs.

### `scrollIntoView` fights `scroll-behavior: smooth`

If your CSS sets `html { scroll-behavior: smooth }` and you call `focus()` without `preventScroll`, the browser starts one smooth scroll, then your explicit `scrollIntoView` starts a second — the page visibly jerks or overshoots.

**Resolution:** Always pass `focus({ preventScroll: true })` and drive the single scroll yourself, as in the implementation. Respect `prefers-reduced-motion` by falling back to `behavior: "auto"`.

### Focusing a hidden or collapsed field

In a wizard or an accordion, the first invalid field may live in a collapsed section. `element.focus()` on a `display: none` control does nothing, and focus stays where it was — the user sees no response at all.

**Resolution:** Expand the containing section before focusing. Resolve the field, walk up to its `<details>`/panel ancestor, open it, then focus on the next frame. Multi-step forms need bespoke handling covered in [focus management in multi-step wizards](/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/).

### Focus lands but the screen reader announces nothing

Moving focus to a summary that was already visible (not toggled from `hidden`) with `role="alert"` may not re-announce, because the live region only fires on content change, not on focus.

**Resolution:** Separate the two mechanisms. Focus moves the caret; the `role="alert"`/`aria-live` region announces on content insertion. Toggle the summary from `hidden` to visible so its content counts as an insertion, or manage the announcement through a dedicated polite live region.

### Native constraint-validation steals focus first

If you also call `form.reportValidity()`, the browser focuses the first field failing *native* constraints before your manager runs, producing a double focus jump.

**Resolution:** Pick one authority. If you own validation, set `novalidate` on the `<form>` and never call `reportValidity()`; let the `FocusManager` be the sole owner of post-submit focus.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|----------------|----------------|
| Focus jumps to a field while the user is still typing | Log the event type that triggered focus | Ensure focus only fires from the submit handler, never from `input`/`blur` |
| Page double-scrolls or overshoots to the invalid field | Check whether `focus()` is called without `preventScroll` | Use `focus({ preventScroll: true })` then a single `scrollIntoView` |
| Focus never lands on the error summary | Inspect the summary node for `tabindex` | Add `tabindex="-1"` so the container is programmatically focusable |
| Late async result focuses a field after a reset | Check that reset calls `manager.cancel()` | Abort the active controller on reset and re-check `signal.aborted` after await |
| Screen reader silent when focus moves to summary | Verify the summary toggles from `hidden` on error | Render `role="alert"` content as an insertion, or use a dedicated live region |

---

## Testing and QA Hooks

Expose the manager's decision as data attributes so Playwright and Cypress can assert on focus destination without depending on visual scroll position.

```typescript
// Call after runValidationCycle resolves so tests can read the outcome.
function syncFocusAttributes(
  form: HTMLFormElement,
  outcome: { focusedField: string | null; usedSummary: boolean }
): void {
  form.dataset.focusTarget = outcome.usedSummary
    ? "summary"
    : outcome.focusedField ?? "none";
}
```

```typescript
// Playwright: submit an invalid form and assert focus landed correctly.
await page.click('[data-testid="submit"]');

// The active element should be the first invalid control (or the summary).
await expect(page.locator(":focus")).toHaveAttribute("name", "email");

// Assert the manager's own record of where it sent focus.
await expect(page.locator("form")).toHaveAttribute("data-focus-target", "email");
```

```typescript
// Regression test for the async race: submit twice quickly, assert the
// second cycle owns focus and the first did not move it after abort.
await Promise.all([
  page.click('[data-testid="submit"]'),
  page.click('[data-testid="submit"]'),
]);
await expect(page.locator(":focus")).toHaveAttribute("name", "email");
```

For ARIA regression coverage, assert with axe-core that the focused element has an accessible name and that `aria-invalid="true"` is present only on fields that actually failed — a focused-but-unlabelled control is a WCAG failure even when focus lands correctly.

---

## Common Pitfalls

**Moving focus on `blur` or `input`.** The most common accessibility regression. Any focus move outside an explicit submit is focus theft; it interrupts typing and fires premature error announcements. Gate every `focus()` behind the submit path.

**Forgetting `tabindex="-1"` on the summary.** `element.focus()` on a plain `<div>` or `<h2>` silently fails, so focus stays put and the user gets no feedback. The container must be programmatically focusable.

**Calling `focus()` without `preventScroll`.** The browser's default focus-scroll races your `scrollIntoView`, producing a visible double-scroll or overshoot, especially with `scroll-behavior: smooth`.

**Focusing before async validation resolves.** Focusing the first synchronously-invalid field is wrong if an async check invalidates an earlier field. Await the complete error list, then focus exactly once.

**Not aborting on re-submit or reset.** Without an `AbortController` tying focus to the current cycle, a slow async result focuses a stale target after the user has already moved on, cleared the form, or advanced a step.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I move focus to the first invalid field or to an error summary?</strong></summary>

Use an error summary at the top of the form when there is more than one error, or when the form is long enough that the first invalid field would be off-screen. Move focus directly to the first invalid field when there is a single error in a short form. The summary gives the user the full error count and lets them jump to each field in turn; direct focus is faster when there is only one thing to fix. The `summaryThreshold` option in the `FocusManager` encodes exactly this switch.

</details>

<details>
<summary><strong>Why should focus only move on explicit submit?</strong></summary>

Moving focus on keystroke or blur is focus theft: it yanks the caret out from under a user who is still typing or tabbing away, and it fires assistive-technology announcements for errors the user has not finished causing. Programmatic focus is only unambiguous after an explicit submit, when the user has signalled they are done and expect the form to respond. Reserve every `focus()` call for the submit path.

</details>

<details>
<summary><strong>How do I stop async validation from stealing focus after the user has moved on?</strong></summary>

Tie each submit-and-validate cycle to an `AbortController`. When the validation promise resolves, check `signal.aborted` before touching focus. If the user submitted again, reset the form, or navigated to another step, the newer action aborts the stale controller and the late result is discarded instead of hijacking the caret. Forwarding the same signal into `fetch` also cancels the underlying network request.

</details>

<details>
<summary><strong>Why does my error summary need tabindex=-1?</strong></summary>

A `<div>`, `<section>`, or heading is not focusable by default, so `element.focus()` silently does nothing and the screen reader announces nothing. Adding `tabindex="-1"` makes the container programmatically focusable without inserting it into the tab order, so focus lands on the summary and assistive technology announces it, but keyboard users never tab into an inert wrapper on their way through the form.

</details>

---

## Related

- [Moving Focus to the First Invalid Field](/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/)
- [Focus Management in Multi-Step Wizards](/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/)
- [ARIA Live Regions for Form Errors](/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
- [Asynchronous Validation Strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/)

← [Accessibility & Error UX](/accessibility-and-error-ux/)
