---
layout: page.njk
title: "Focus Management in Multi-Step Form Wizards"
description: "Move focus to the step heading on navigation, trap focus within a step, restore focus on Back, and announce step X of N — the full a11y contract for wizard flows."
slug: focus-management-in-multi-step-wizards
type: long_tail
breadcrumb: "Multi-Step Wizard Focus"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Focus Management in Multi-Step Wizards"
  parent: "Focus Management After Validation"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Focus Management in Multi-Step Form Wizards",
      "description": "Move focus to the step heading on navigation, trap focus within a step, restore focus on Back, and announce step X of N — the full a11y contract for wizard flows.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility & Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "Focus Management After Validation", "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/" },
        { "@type": "ListItem", "position": 4, "name": "Multi-Step Wizard Focus", "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Manage focus across multi-step form wizard steps",
      "step": [
        { "@type": "HowToStep", "name": "Give each step a programmatically focusable heading with tabindex minus one" },
        { "@type": "HowToStep", "name": "On step change, move focus to the new step heading after it renders" },
        { "@type": "HowToStep", "name": "Announce step X of N in a live region tied to the heading" },
        { "@type": "HowToStep", "name": "Record the trigger element so Back can restore focus to it" },
        { "@type": "HowToStep", "name": "Optionally trap focus within the step for modal-style wizards" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where should focus go when a wizard advances to the next step?",
          "acceptedAnswer": { "@type": "Answer", "text": "Move focus to the new step's heading, not to its first input. Focusing the heading (with tabindex minus one) lets the screen reader read the step title and position before the user starts filling fields, and it gives keyboard users a predictable top-of-content anchor. Focusing the first input skips the step context entirely." }
        },
        {
          "@type": "Question",
          "name": "How do I restore focus when the user clicks Back?",
          "acceptedAnswer": { "@type": "Answer", "text": "When navigating forward, record the element that triggered the transition, typically the Next button or the field that submitted the step. On Back, focus the recorded trigger from the step you are returning to, or fall back to that step's heading if the trigger no longer exists. Keep a per-step stack of last-focused elements." }
        },
        {
          "@type": "Question",
          "name": "Should a multi-step form wizard trap focus like a modal?",
          "acceptedAnswer": { "@type": "Answer", "text": "Only if the wizard is presented as a modal dialog that overlays the page. An inline wizard that is part of the page flow should not trap focus, because the user must reach the browser chrome, skip links, and surrounding content. Trap focus only when the step is inside a role dialog with the rest of the page inert." }
        }
      ]
    }
  ]
}
</script>

# Focus Management in Multi-Step Form Wizards

A multi-step wizard has an accessibility contract with four clauses — move focus to the step heading on every transition, announce "step X of N", restore focus correctly on Back, and (only for modal wizards) trap focus inside the active step — and violating any one of them strands keyboard and screen-reader users mid-flow.

The bug this page fixes: the user clicks Next, the new step renders, but focus is orphaned on the now-removed Next button or reset to the top of the document. A screen-reader user hears nothing about which step they are on; a keyboard user is tabbing from `<body>`. Clicking Back is worse — focus jumps to the top instead of returning to where the user left off.

This extends [focus management after validation](/accessibility-and-error-ux/focus-management-after-validation/) across step boundaries, and it leans on the same [keyboard navigation patterns](/accessibility-and-error-ux/keyboard-navigation-patterns/) that govern focus order within a single view.

---

## The four-clause contract

Each transition in a wizard is a mini page navigation, and SPAs get no free focus reset the way full page loads do. You must reproduce that reset deliberately:

- **Heading focus, not input focus.** On entering a step, focus its `<h2>` (made focusable with `tabindex="-1"`). The screen reader reads the step title; the user learns where they are before the fields.
- **Position announcement.** A live region announces "Step 3 of 5: Payment details" so the user knows progress without seeing a stepper.
- **Restorable focus.** Forward navigation records the trigger element; Back restores focus to the corresponding trigger on the previous step, not the top of the page.
- **Conditional trap.** If the wizard is a modal dialog, focus is trapped within the step and the rest of the page is `inert`. If it is inline, focus flows normally and is *not* trapped.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" role="img" aria-label="Wizard focus flow moving forward to a step heading and backward restoring focus to the recorded trigger" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Wizard focus transitions across steps</title>
  <desc>Forward navigation focuses the next step's heading and pushes the trigger element onto a focus stack; Back navigation pops the stack and restores focus to the recorded trigger element.</desc>
  <rect width="720" height="280" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <rect x="50" y="100" width="150" height="70" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="125" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">STEP 1</text>
  <text x="125" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">heading focus</text>
  <text x="125" y="160" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">on enter</text>
  <rect x="285" y="100" width="150" height="70" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="360" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">STEP 2</text>
  <text x="360" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">announce</text>
  <text x="360" y="160" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">2 of N</text>
  <rect x="520" y="100" width="150" height="70" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="595" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">STEP 3</text>
  <text x="595" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">trap if modal</text>
  <path d="M200 120 L285 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-wizard)"/>
  <text x="242" y="112" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Next</text>
  <path d="M435 120 L520 120" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-wizard)"/>
  <text x="477" y="112" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Next</text>
  <path d="M285 152 C240 195 205 195 200 158" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr-wizard)"/>
  <text x="242" y="205" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Back → restore trigger</text>
  <path d="M520 152 C475 195 440 195 435 158" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr-wizard)"/>
  <text x="477" y="205" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Back → pop stack</text>
  <defs>
    <marker id="arr-wizard" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
</svg>

---

## Core implementation

The controller owns a focus stack for Back restoration, a live region for the position announcement, and the transition method that ties them together. Focus moves after the new step commits to the DOM.

```typescript
interface WizardStep {
  id: string;
  index: number; // 0-based
  heading: HTMLElement; // an <h2 tabindex="-1"> inside the step
  container: HTMLElement;
}

class WizardFocusController {
  // Per-transition record of the element to restore focus to on Back.
  private focusStack: (HTMLElement | null)[] = [];

  constructor(
    private steps: WizardStep[],
    private liveRegion: HTMLElement, // aria-live="polite"
    private opts: { modal?: boolean } = {}
  ) {}

  /**
   * Advance to `toIndex`. `trigger` is the element the user activated
   * (the Next button), recorded so Back can return focus to it.
   * Await render before focusing: the new heading must exist and be
   * laid out, or focus() is a silent no-op.
   */
  async goForward(toIndex: number, trigger: HTMLElement | null): Promise<void> {
    this.focusStack.push(trigger);
    await this.renderStep(toIndex);
    this.enterStep(toIndex);
  }

  /** Step back and restore focus to the recorded trigger. */
  async goBack(toIndex: number): Promise<void> {
    const restore = this.focusStack.pop() ?? null;
    await this.renderStep(toIndex);
    const step = this.steps[toIndex];
    // Restore to the trigger if it is still connected; else the heading.
    if (restore && restore.isConnected) {
      restore.focus({ preventScroll: true });
      restore.scrollIntoView({ block: "center" });
    } else {
      this.focusHeading(step);
    }
    this.announce(step);
    if (this.opts.modal) this.trapFocus(step.container);
  }

  private enterStep(index: number): void {
    const step = this.steps[index];
    this.focusHeading(step);
    this.announce(step);
    if (this.opts.modal) this.trapFocus(step.container);
  }

  private focusHeading(step: WizardStep): void {
    // Heading carries tabindex="-1" so it is focusable without being a
    // tab stop. preventScroll then a centred scroll gives one clean jump.
    step.heading.focus({ preventScroll: true });
    step.heading.scrollIntoView({ block: "start" });
  }

  private announce(step: WizardStep): void {
    const label = step.heading.textContent?.trim() ?? "";
    this.liveRegion.textContent = "";
    requestAnimationFrame(() => {
      this.liveRegion.textContent =
        `Step ${step.index + 1} of ${this.steps.length}: ${label}`;
    });
  }

  /**
   * Modal-only focus trap. Cycles Tab within the step's focusable set.
   * Returns nothing; the trap listener is removed when the next step
   * installs its own or when destroy() runs.
   */
  private trapListener?: (e: KeyboardEvent) => void;
  private trapFocus(container: HTMLElement): void {
    if (this.trapListener) document.removeEventListener("keydown", this.trapListener);
    const focusables = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null); // visible only

    this.trapListener = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this.trapListener);
  }

  private renderStep(index: number): Promise<void> {
    // Your framework commits the step DOM here (setState / signal / store).
    // Resolve on the next frame so layout is ready before focus.
    this.commit(index);
    return new Promise((r) => requestAnimationFrame(() => r()));
  }

  private commit(_index: number): void {
    /* framework-specific render */
  }

  destroy(): void {
    if (this.trapListener) document.removeEventListener("keydown", this.trapListener);
    this.focusStack.length = 0;
  }
}
```

---

## Step-by-step walkthrough

1. **Headings are focusable, not tab stops.** Each step `<h2>` gets `tabindex="-1"`, so scripts can focus it but it never becomes a Tab stop that traps sequential navigation.
2. **Forward records the trigger.** `goForward` pushes the activating element (the Next button) onto `focusStack` before rendering, so its identity survives the transition.
3. **Focus moves after render.** `renderStep` commits the new step and resolves on `requestAnimationFrame`, guaranteeing the heading exists and is laid out before `focus()` runs.
4. **Position is announced.** `announce` writes "Step 3 of 5: Payment details" to a polite live region using the clear-then-set trick so repeated navigation still speaks.
5. **Back restores the trigger.** `goBack` pops the stack and focuses the recorded trigger if it is still connected, falling back to the step heading otherwise.
6. **Trap only when modal.** `trapFocus` installs a Tab-cycling keydown listener *only* when `opts.modal` is set; inline wizards leave focus free to reach the rest of the page.

---

## Failure modes and edge cases

### Focusing before the step renders

Calling `focus()` synchronously after triggering a state change focuses an element that does not exist yet. Always await a frame.

```typescript
// WRONG — heading not in the DOM yet
setStep(next);
steps[next].heading.focus();

// RIGHT — commit, then focus on the next frame
setStep(next);
await new Promise((r) => requestAnimationFrame(() => r(null)));
steps[next].heading.focus({ preventScroll: true });
```

### Trapping focus in an inline wizard

A focus trap on a non-modal wizard prevents the user from reaching skip links, the browser chrome, and content after the form. Only trap when the step is a `role="dialog"` with the background made `inert`. Gate the trap on `opts.modal` as shown, never install it unconditionally.

### Back restores a detached trigger

If the previous step re-renders and the recorded Next button is a new node, the stored reference is detached and `focus()` is a no-op. The `restore.isConnected` guard falls back to the heading, keeping focus somewhere sensible.

### Announcement swallowed by the focus move

Some screen readers drop a live-region update that lands in the same tick as a focus change, because the focus announcement wins. The `requestAnimationFrame` delay in `announce` separates the two events so both are read.

### Trap listener leaks across steps

Installing a new trap without removing the old one stacks keydown listeners, and after several steps Tab behaves erratically. `trapFocus` removes the previous listener before adding a new one, and `destroy` removes the last one on teardown — the same discipline any [keyboard navigation pattern](/accessibility-and-error-ux/keyboard-navigation-patterns/) requires.

---

## Verification checklist

- [ ] Advancing a step moves focus to the step heading, not the first input
- [ ] Step headings have tabindex="-1" and are not sequential tab stops
- [ ] A live region announces "Step X of N" plus the step title on every transition
- [ ] Focus moves only after the new step has rendered (awaited a frame)
- [ ] Back restores focus to the recorded trigger, falling back to the heading if detached
- [ ] Focus is trapped only when the wizard is a modal dialog; inline wizards do not trap
- [ ] The focus-trap keydown listener is removed before installing the next and on teardown
- [ ] The focus stack is cleared on destroy so references do not leak
- [ ] Tested with NVDA + Firefox and VoiceOver + Safari: step title and position announce on each move

---

## Frequently Asked Questions

<details>
<summary><strong>Where should focus go when a wizard advances to the next step?</strong></summary>

Move focus to the new step's heading, not to its first input. Focusing the heading (with `tabindex="-1"`) lets the screen reader read the step title and position before the user starts filling fields, and it gives keyboard users a predictable top-of-content anchor. Focusing the first input skips the step context entirely, so the user never hears which step they landed on.

</details>

<details>
<summary><strong>How do I restore focus when the user clicks Back?</strong></summary>

When navigating forward, record the element that triggered the transition, typically the Next button or the field that submitted the step. On Back, focus the recorded trigger from the step you are returning to, or fall back to that step's heading if the trigger no longer exists. Keep a per-step stack of last-focused elements — the controller pushes on `goForward` and pops on `goBack`, guarding with `isConnected`.

</details>

<details>
<summary><strong>Should a multi-step form wizard trap focus like a modal?</strong></summary>

Only if the wizard is presented as a modal dialog that overlays the page. An inline wizard that is part of the page flow should not trap focus, because the user must reach the browser chrome, skip links, and surrounding content. Trap focus only when the step is inside a `role="dialog"` with the rest of the page `inert` — the implementation gates the trap on an explicit `modal` option for exactly this reason.

</details>

---

## Related

- [Moving Focus to the First Invalid Field](/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/)
- [Focus Management After Validation](/accessibility-and-error-ux/focus-management-after-validation/)
- [Keyboard Navigation Patterns](/accessibility-and-error-ux/keyboard-navigation-patterns/)

← [Focus Management After Validation](/accessibility-and-error-ux/focus-management-after-validation/)
