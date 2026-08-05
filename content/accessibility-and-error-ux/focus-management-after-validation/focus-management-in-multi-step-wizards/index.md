---
layout: page.njk
title: "Focus Management in Multi-Step Form Wizards"
description: "Move focus to the step heading on navigation, trap focus within a step, restore focus on Back, and announce step X of N — the full a11y contract for wizard flows."
slug: focus-management-in-multi-step-wizards
type: howto
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

This extends [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) across step boundaries, and it leans on the same [keyboard navigation patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/) that govern focus order within a single view.

---

## The four-clause contract

Each transition in a wizard is a mini page navigation, and SPAs get no free focus reset the way full page loads do. You must reproduce that reset deliberately:

- **Heading focus, not input focus.** On entering a step, focus its `<h2>` (made focusable with `tabindex="-1"`). The screen reader reads the step title; the user learns where they are before the fields.
- **Position announcement.** A live region announces "Step 3 of 5: Payment details" so the user knows progress without seeing a stepper.
- **Restorable focus.** Forward navigation records the trigger element; Back restores focus to the corresponding trigger on the previous step, not the top of the page.
- **Conditional trap.** If the wizard is a modal dialog, focus is trapped within the step and the rest of the page is `inert`. If it is inline, focus flows normally and is *not* trapped.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="34 84 652 140" role="img" aria-label="Wizard focus flow moving forward to a step heading and backward restoring focus to the recorded trigger" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Wizard focus transitions across steps</title>
  <desc>Forward navigation focuses the next step's heading and pushes the trigger element onto a focus stack; Back navigation pops the stack and restores focus to the recorded trigger element.</desc>
  <rect x="34" y="84" width="652" height="140" fill="#f9f5fb"/>
  <rect x="50" y="100" width="150" height="70" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="125" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">STEP 1</text>
  <text x="125" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">heading focus</text>
  <text x="125" y="160" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">on enter</text>
  <rect x="285" y="100" width="150" height="70" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="360" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">STEP 2</text>
  <text x="360" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">announce</text>
  <text x="360" y="160" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">2 of N</text>
  <rect x="520" y="100" width="150" height="70" rx="10" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="595" y="128" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">STEP 3</text>
  <text x="595" y="146" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">trap if modal</text>
  <path d="M200 120 L285 120" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-wizard)"/>
  <text x="242" y="112" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">Next</text>
  <path d="M435 120 L520 120" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-wizard)"/>
  <text x="477" y="112" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">Next</text>
  <path d="M285 152 C240 195 205 195 200 158" fill="none" stroke="#6b5f75" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arr-wizard)"/>
  <text x="242" y="205" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">Back → restore trigger</text>
  <path d="M520 152 C475 195 440 195 435 158" fill="none" stroke="#6b5f75" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#arr-wizard)"/>
  <text x="477" y="205" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">Back → pop stack</text>
  <defs>
    <marker id="arr-wizard" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
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

Every transition in a wizard has exactly one correct focus target, and writing them down as a table is usually enough to find the one your implementation is missing:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of wizard transitions and their focus targets. Moving forward focuses the new step heading. Moving back focuses the previous step heading, not the control that was clicked. A blocked forward move focuses the first invalid field. A successful final submit focuses the confirmation heading. A failed final submit focuses the error summary." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One focus target per wizard transition</title>
  <desc>Five transitions with their focus target and what the reader hears. Next, allowed: focus the new step heading, which announces step two of four and its title. Back: focus the previous step heading, not the back button, so the reader is oriented rather than parked on a control. Next, blocked by validation: focus the first invalid field so the fix is one keystroke away. Final submit that succeeds: focus the confirmation heading. Final submit that fails: focus the error summary listing every problem.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Transition</text>
  <text x="212" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus lands on</text>
  <text x="420" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What the reader hears</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">Next — validation passed</text>
  <text x="212" y="66" font-size="10" fill="#6b5f75" font-family="inherit">new step heading</text>
  <text x="420" y="66" font-size="10" fill="#2d6342" font-family="inherit">"Step 2 of 4, Address"</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">Back</text>
  <text x="212" y="100" font-size="10" fill="#6b5f75" font-family="inherit">previous step heading</text>
  <text x="420" y="100" font-size="10" fill="#2d6342" font-family="inherit">"Step 1 of 4, Your details"</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">Next — blocked</text>
  <text x="212" y="134" font-size="10" fill="#6b5f75" font-family="inherit">first invalid field</text>
  <text x="420" y="134" font-size="10" fill="#2d6342" font-family="inherit">field name, then why it failed</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">Submit — accepted</text>
  <text x="212" y="168" font-size="10" fill="#6b5f75" font-family="inherit">confirmation heading</text>
  <text x="420" y="168" font-size="10" fill="#2d6342" font-family="inherit">"Application submitted"</text>
  <line x1="10" y1="182" x2="690" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">Submit — rejected</text>
  <text x="212" y="202" font-size="10" fill="#6b5f75" font-family="inherit">error summary block</text>
  <text x="420" y="202" font-size="10" fill="#2d6342" font-family="inherit">"3 problems, starting with…"</text>
</svg>

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

Installing a new trap without removing the old one stacks keydown listeners, and after several steps Tab behaves erratically. `trapFocus` removes the previous listener before adding a new one, and `destroy` removes the last one on teardown — the same discipline any [keyboard navigation pattern](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/) requires.

---

Read as a lifecycle rather than a table, the same rules become four clauses that fire in a fixed order on every step change:

<svg viewBox="0 8 668 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The four clauses of a step change in order: tear down the outgoing step's listeners and timers, render the incoming step, move focus to its heading, then announce the new position. Each clause names the failure it prevents." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four clauses of a step change, in order</title>
  <desc>Four stages left to right. Teardown: remove the outgoing step's key listeners, abort its pending requests and clear its timers, which prevents listener leaks across steps. Render: mount the incoming step and let the browser paint, which prevents focusing an element that does not exist yet. Focus: move focus to the step heading, which has tabindex minus one, preventing focus falling back to the body. Announce: update the live region with the new step position, preventing a silent transition.</desc>
  <rect x="0" y="8" width="668" height="190" fill="#f9f5fb"/>
  <text x="14" y="24" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Every step change runs these four, always in this order</text>
  <rect x="14" y="34" width="150" height="82" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="89" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">1 · tear down</text>
  <text x="89" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">listeners, timers,</text>
  <text x="89" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">pending requests</text>
  <text x="89" y="106" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">stops leaks</text>
  <path d="M164,75 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="34" width="150" height="82" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">2 · render</text>
  <text x="261" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">mount the step and</text>
  <text x="261" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">let it paint</text>
  <text x="261" y="106" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">target must exist</text>
  <path d="M336,75 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="34" width="150" height="82" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="433" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">3 · focus</text>
  <text x="433" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">step heading with</text>
  <text x="433" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">tabindex="-1"</text>
  <text x="433" y="106" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">never falls to body</text>
  <path d="M508,75 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="34" width="124" height="82" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="592" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">4 · announce</text>
  <text x="592" y="74" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">live region gets</text>
  <text x="592" y="88" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the new position</text>
  <text x="592" y="106" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">no silent jumps</text>
  <text x="14" y="146" font-size="10" fill="#6b5f75" font-family="inherit">Swap 2 and 3 and focus() runs against a node that is not in the document yet — it silently no-ops and focus falls to &lt;body&gt;.</text>
  <text x="14" y="162" font-size="10" fill="#6b5f75" font-family="inherit">Swap 3 and 4 and the focus move can cut off the announcement mid-sentence in several screen readers.</text>
  <text x="14" y="178" font-size="10" fill="#6b5f75" font-family="inherit">Skip 1 and the outgoing step keeps handling Escape and arrow keys from behind the step you are now on.</text>
</svg>

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

- [Moving Focus to the First Invalid Field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/)
- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
- [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)

← [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
