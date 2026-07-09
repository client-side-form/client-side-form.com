---
layout: page.njk
title: "Keyboard Navigation Patterns for Forms"
description: "Keyboard operability for forms — logical tab order, roving tabindex for grouped controls, Enter and Escape semantics, focus trapping, and custom combobox keyboard models."
slug: keyboard-navigation-patterns
type: topic
breadcrumb: "Keyboard Navigation"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Keyboard Navigation Patterns"
  parent: "Accessibility and Error UX"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Keyboard Navigation Patterns for Forms",
      "description": "Keyboard operability for forms — logical tab order, roving tabindex for grouped controls, Enter and Escape semantics, focus trapping, and custom combobox keyboard models.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility and Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "Keyboard Navigation Patterns for Forms", "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Keyboard Navigation Patterns for Forms",
      "step": [
        { "@type": "HowToStep", "name": "Order the DOM so natural tab order matches the visual reading order; avoid positive tabindex" },
        { "@type": "HowToStep", "name": "Apply roving tabindex to radio, checkbox, toolbar, and option groups so the group is one tab stop" },
        { "@type": "HowToStep", "name": "Handle arrow keys to move the active element within the group and wrap at the ends" },
        { "@type": "HowToStep", "name": "Define Enter-to-submit and Escape-to-dismiss semantics per control type" },
        { "@type": "HowToStep", "name": "Trap focus inside modal dialogs and expose the WAI-ARIA combobox keyboard model for custom widgets" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is roving tabindex and when should I use it?",
          "acceptedAnswer": { "@type": "Answer", "text": "Roving tabindex makes a group of related controls — radio buttons, a toolbar, a listbox of options — a single tab stop. Exactly one element in the group has tabindex=\"0\" and is reachable by Tab; every other element has tabindex=\"-1\". Arrow keys move the tabindex=\"0\" value from element to element. Use it whenever Tab-ing through every item in a group would be tedious and the items form a single conceptual control." }
        },
        {
          "@type": "Question",
          "name": "Should tab order follow the DOM or can I use tabindex to reorder it?",
          "acceptedAnswer": { "@type": "Answer", "text": "Tab order should follow DOM order, and DOM order should match the visual reading order. Positive tabindex values (1 and above) override the natural order and create a separate, fragile tab sequence that almost always drifts out of sync with the layout. Reorder the DOM instead, and reserve tabindex=\"0\" (join natural order) and tabindex=\"-1\" (focusable only programmatically) for their intended roles." }
        },
        {
          "@type": "Question",
          "name": "Why does my WeakMap of element handlers matter for keyboard controllers?",
          "acceptedAnswer": { "@type": "Answer", "text": "A WeakMap keyed by DOM element lets the controller associate per-element state — its index, its cleanup function — without preventing that element from being garbage collected when it is removed from the DOM. A plain Map or object would hold a strong reference to every element the controller has ever seen, leaking detached nodes across re-renders. The WeakMap entry disappears automatically once nothing else references the element." }
        },
        {
          "@type": "Question",
          "name": "How should Enter and Escape behave inside a form?",
          "acceptedAnswer": { "@type": "Answer", "text": "Enter in a single-line text field submits the form (native behaviour); inside a textarea it inserts a newline; on a custom button or option it activates that control. Escape should dismiss the nearest transient layer — close an open combobox listbox, cancel an inline edit, or close a modal — without submitting. Never let Escape wipe the whole form, and never swallow Enter globally, or you break native submit." }
        }
      ]
    }
  ]
}
</script>

# Keyboard Navigation Patterns for Forms

A form that works perfectly with a mouse can be completely unusable from a keyboard: the tab order zig-zags because the DOM does not match the layout, a radio group forces the user to Tab through every option, a custom combobox swallows the arrow keys, and a modal lets Tab escape to the page behind it. Keyboard operability is not an add-on — WCAG 2.1.1 makes it a baseline, and for screen-reader users the keyboard *is* the interface.

This page specifies the keyboard model for the controls forms are actually built from: native inputs, grouped radio/checkbox sets, custom comboboxes and date pickers, and the modals and wizards that wrap them. It sits under the [accessibility and error UX](https://www.client-side-form.com/accessibility-and-error-ux/) area and pairs with [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/), which handles where focus goes when a submit fails.

---

## Problem Statement

Keyboard navigation breaks along four seams, and each has a distinct fix:

- **Tab order drift.** Natural tab order is DOM order. When the visual layout is reordered with CSS (flex `order`, grid placement, absolute positioning) but the DOM is not, Tab jumps around the screen unpredictably. Positive `tabindex` values are the usual "fix" that makes it worse.
- **Group verbosity.** A native `<input type="radio">` group is already a single tab stop with arrow-key navigation. Custom-built groups — segmented buttons, tag pickers, toolbars — usually forget this and force one Tab stop per item.
- **Missing widget models.** Custom comboboxes, listboxes, and date pickers have a *specified* keyboard contract in the WAI-ARIA Authoring Practices. Skipping it leaves arrow keys, `Home`/`End`, and type-ahead dead.
- **Focus escaping containers.** Modals and wizard steps must trap Tab so it cycles within the layer; otherwise focus falls behind the overlay and the user is lost.

The controllers below address the two hardest seams — roving tabindex for groups and the combobox model — with production TypeScript, and the surrounding sections cover tab order, Enter/Escape semantics, and focus trapping.

---

## Focus Order and Roving Tabindex

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 340" role="img" aria-label="Keyboard focus order across a form with a roving tabindex radio group" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Tab Order and Roving Tabindex Within a Group</title>
  <desc>Tab moves between the name field, a radio group treated as one tab stop, and the submit button. Inside the group, arrow keys move the single tabindex zero between options while the others stay tabindex minus one.</desc>
  <rect width="760" height="340" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- Tab stops row -->
  <text x="30" y="45" font-family="inherit" font-size="11" fill="currentColor" opacity="0.6">Tab order →</text>
  <!-- Field 1: Name -->
  <rect x="40" y="70" width="150" height="50" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="115" y="92" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">Name</text>
  <text x="115" y="108" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">tabindex 0</text>
  <!-- Group container = ONE tab stop -->
  <rect x="255" y="55" width="290" height="130" rx="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="6 4"/>
  <text x="400" y="48" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.7">radiogroup — one tab stop</text>
  <!-- option A (active, tabindex 0) -->
  <rect x="275" y="75" width="110" height="42" rx="9" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.85"/>
  <text x="330" y="93" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="currentColor">Option A</text>
  <text x="330" y="108" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.7">tabindex 0</text>
  <!-- option B -->
  <rect x="415" y="75" width="110" height="42" rx="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.45"/>
  <text x="470" y="93" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.8">Option B</text>
  <text x="470" y="108" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.55">tabindex -1</text>
  <!-- option C -->
  <rect x="345" y="128" width="110" height="42" rx="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.45"/>
  <text x="400" y="146" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.8">Option C</text>
  <text x="400" y="161" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.55">tabindex -1</text>
  <!-- Field 3: Submit -->
  <rect x="610" y="70" width="120" height="50" rx="10" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="670" y="92" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">Submit</text>
  <text x="670" y="108" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.65">tabindex 0</text>
  <!-- Tab arrows -->
  <path d="M190 95 L255 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-kbd)"/>
  <text x="222" y="88" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Tab</text>
  <path d="M545 100 L610 95" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-kbd)"/>
  <text x="577" y="88" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">Tab</text>
  <!-- Arrow-key movement inside the group -->
  <path d="M385 96 L415 96" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="4 3" marker-end="url(#arr-kbd)"/>
  <path d="M455 113 C440 122 420 124 400 128" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="4 3" marker-end="url(#arr-kbd)"/>
  <!-- Legend -->
  <text x="400" y="215" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.75">Arrow keys move the single tabindex="0" between options and wrap at the ends</text>
  <text x="400" y="240" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor" opacity="0.75">Tab enters the group once, lands on the active option, and Tab again leaves it</text>
  <line x1="60" y1="270" x2="700" y2="270" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
  <text x="400" y="298" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="currentColor" opacity="0.8">DOM order = visual order = tab order — never a positive tabindex</text>
  <defs>
    <marker id="arr-kbd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
</svg>

The roving tabindex rule is exact: at any moment **one** element in the group carries `tabindex="0"` and is the group's single tab stop; every other element carries `tabindex="-1"`. Tab enters the group onto the active element and leaves on the next Tab. Arrow keys move the `tabindex="0"` designation — and the focus — from element to element, wrapping at the ends.

| Key | Context | Behaviour |
|-----|---------|-----------|
| `Tab` | anywhere | move to the next tab stop (the group counts as one) |
| `Shift+Tab` | anywhere | move to the previous tab stop |
| `ArrowRight` / `ArrowDown` | inside group | activate the next item; wrap to first at the end |
| `ArrowLeft` / `ArrowUp` | inside group | activate the previous item; wrap to last at the start |
| `Home` / `End` | inside group | activate the first / last item |
| `Enter` | text field | submit the form (native) |
| `Escape` | open popup / edit | dismiss the nearest transient layer, no submit |

---

## Core Implementation

The `RovingTabindexController` turns any container of like controls into a single tab stop with arrow-key movement. It stores per-element bookkeeping in a `WeakMap` so removed nodes are collected without a manual cleanup pass.

```typescript
export interface RovingOptions {
  /** Orientation decides which arrow keys move the active element. */
  orientation?: "horizontal" | "vertical" | "both";
  /** Wrap from last to first (and back) at the ends of the group. */
  wrap?: boolean;
}

interface ItemState {
  index: number;
}

export class RovingTabindexController {
  private readonly container: HTMLElement;
  private readonly opts: Required<RovingOptions>;

  // Keyed by the DOM element so per-item state is collected automatically when
  // a re-render removes the node. A plain Map would pin every detached element
  // the controller has ever seen, leaking memory across list re-renders.
  private readonly itemState = new WeakMap<HTMLElement, ItemState>();

  private items: HTMLElement[] = [];
  private activeIndex = 0;

  constructor(container: HTMLElement, options: RovingOptions = {}) {
    this.container = container;
    this.opts = { orientation: "both", wrap: true, ...options };
    this.refresh();
    this.container.addEventListener("keydown", this.onKeydown);
    // Focusing any item promotes it to the single tab stop, so a mouse click
    // and keyboard navigation stay in sync.
    this.container.addEventListener("focusin", this.onFocusin);
  }

  /** Re-read the item set after the group's contents change. */
  refresh(): void {
    this.items = Array.from(
      this.container.querySelectorAll<HTMLElement>('[role="radio"], [role="option"], [data-roving-item]')
    );
    this.items.forEach((el, index) => {
      this.itemState.set(el, { index });
      // Exactly one item is reachable by Tab; the rest are focusable only
      // programmatically via the arrow-key handler below.
      el.tabIndex = index === this.activeIndex ? 0 : -1;
    });
  }

  destroy(): void {
    this.container.removeEventListener("keydown", this.onKeydown);
    this.container.removeEventListener("focusin", this.onFocusin);
    // No need to clear itemState: the WeakMap releases entries as soon as the
    // elements themselves become unreachable.
  }

  private onFocusin = (e: FocusEvent): void => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const state = this.itemState.get(target);
    if (state) this.setActive(state.index, { moveFocus: false });
  };

  private onKeydown = (e: KeyboardEvent): void => {
    const { orientation, wrap } = this.opts;
    const forward =
      (orientation !== "vertical" && e.key === "ArrowRight") ||
      (orientation !== "horizontal" && e.key === "ArrowDown");
    const backward =
      (orientation !== "vertical" && e.key === "ArrowLeft") ||
      (orientation !== "horizontal" && e.key === "ArrowUp");

    let next = this.activeIndex;
    if (forward) next = this.activeIndex + 1;
    else if (backward) next = this.activeIndex - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = this.items.length - 1;
    else return; // let every other key (Tab, Enter, Escape, type-ahead) pass

    e.preventDefault(); // stop the arrow key from scrolling the page
    const last = this.items.length - 1;
    if (next < 0) next = wrap ? last : 0;
    if (next > last) next = wrap ? 0 : last;
    this.setActive(next, { moveFocus: true });
  };

  private setActive(index: number, opts: { moveFocus: boolean }): void {
    const prev = this.items[this.activeIndex];
    const nextEl = this.items[index];
    if (prev) prev.tabIndex = -1;
    if (nextEl) {
      nextEl.tabIndex = 0; // the new single tab stop
      if (opts.moveFocus) nextEl.focus();
    }
    this.activeIndex = index;
  }
}
```

Key design decisions:

- **`WeakMap` for per-item state.** Grouped controls are frequently re-rendered — tags added, options filtered. Keying state by the element node means a removed item's entry is reclaimed by GC automatically; a `Map` or object keyed by id would retain detached nodes indefinitely.
- **One `tabindex="0"` invariant.** `setActive()` always demotes the previous item to `-1` before promoting the next, so the group can never present two tab stops or zero.
- **`focusin` keeps mouse and keyboard in sync.** Clicking an item promotes it to the active tab stop, so a subsequent Tab leaves from where the user actually is.
- **Unhandled keys pass through.** The handler `return`s for Tab, Enter, Escape, and printable characters, so native submit and type-ahead still work.

---

## Enter, Escape, and Focus Trapping

Native semantics are the contract; custom widgets must reproduce them. **Enter** in a single-line text input submits the form — do not `preventDefault()` it globally or you break the one keystroke most users rely on. Inside a `<textarea>` Enter inserts a newline. On a custom button or option it activates the control. **Escape** dismisses the nearest transient layer: it closes an open combobox listbox, cancels an inline edit, or closes a modal — and it must never submit or wipe the form.

Modal dialogs and wizard steps require focus trapping so Tab cycles within the layer instead of falling to the page behind:

```typescript
export function trapFocus(container: HTMLElement): () => void {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(selector)
    ).filter((el) => el.offsetParent !== null); // skip visually hidden nodes
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    // Wrap the two ends so focus stays inside the dialog.
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener("keydown", onKeydown);
  return () => container.removeEventListener("keydown", onKeydown);
}
```

Restore focus to the trigger element when the trap tears down, or the user is dropped at the top of the document. In multi-step forms the trap boundary and the focus-restoration target both move per step, which the [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) page covers alongside wizard focus.

---

## The Custom Combobox Keyboard Model

A custom combobox (an editable text input with an attached listbox popup) has a specified contract in the WAI-ARIA Authoring Practices Guide. Reproduce it exactly — screen-reader users have learned these keystrokes across every conforming widget:

- **`ArrowDown`** — open the listbox if closed; move to the next option if open.
- **`ArrowUp`** — open at the last option, or move to the previous option.
- **`Enter`** — commit the highlighted option and close the listbox.
- **`Escape`** — close the listbox without committing; a second Escape clears the input.
- **`Home` / `End`** — move to the first / last option.
- **Printable characters** — type into the input and filter the options; use `aria-activedescendant` to point at the highlighted option rather than moving DOM focus, so the input keeps the caret.

The listbox is a roving structure, but the combobox model uses `aria-activedescendant` (virtual focus) instead of physically moving `focus()`, because the text caret must stay in the input. The controller updates `aria-activedescendant` on the input to the id of the highlighted `[role="option"]`, and toggles `aria-selected` on that option — DOM focus never leaves the text field. Date pickers follow the analogous grid model (arrow keys across days, `PageUp`/`PageDown` across months). A worked implementation lives in [roving tabindex for option groups](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/).

---

## Integration Guidance

Keyboard operability underpins every other accessibility concern in the [accessibility and error UX](https://www.client-side-form.com/accessibility-and-error-ux/) area: focus after validation only works if tab order is coherent, and live-region announcements only reach users who can navigate to the fields being announced. The roving-tabindex controller and focus-trap here are the primitives that [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) builds its "first invalid field" logic on top of — "first" means first in tab order, which these patterns define.

Two integration rules keep the keyboard layer robust:

1. **DOM order is the source of truth.** Whatever CSS does to the visual layout, order the DOM to match the reading order so Tab, focus-after-validation, and screen-reader linearisation all agree.
2. **Groups are one tab stop.** Any set of like controls — radios, segmented buttons, a tag list, a toolbar — gets a roving controller, not one tab stop per item. This is what makes a forty-control form navigable in a handful of Tab presses.

---

## Edge Cases and Failure Modes

### Positive tabindex fragments the order

Someone adds `tabindex="1"` to "fix" one field's position. Now every positive-tabindex element forms its own sequence that runs *before* all the `tabindex="0"` elements, and the order silently drifts every time the layout changes.

**Resolution:** Never use a positive `tabindex`. Reorder the DOM to match the visual order; reserve `0` for "join the natural order" and `-1` for "focusable only programmatically."

### Arrow keys scroll the page instead of moving within the group

If the roving handler does not `preventDefault()` on the arrow keys it acts on, the browser both moves the active item and scrolls the viewport.

**Resolution:** Call `e.preventDefault()` only for the keys the controller actually handles (as above), and let every other key pass so native scrolling and type-ahead elsewhere keep working.

### Focus trap with zero focusable children

An empty modal, or one whose only controls are disabled, has no focusable elements. A naive trap throws or leaves focus stranded behind the overlay.

**Resolution:** Guard for an empty focusable set (the implementation `return`s early) and give the dialog container itself `tabindex="-1"` so focus has somewhere to rest.

### `aria-activedescendant` points at a removed option

When the user types and the option list re-renders, the id in `aria-activedescendant` may reference an option that no longer exists, so the screen reader announces nothing on the next arrow press.

**Resolution:** After every filter, re-validate `aria-activedescendant` against the current option ids; reset it to the first option (or clear it) when the previous target is gone.

### Custom widget swallows Tab

A combobox or grid that calls `preventDefault()` on Tab to "keep focus inside" traps keyboard users, who can no longer leave the control.

**Resolution:** Never intercept Tab for movement *within* a widget — use arrow keys for internal movement and let Tab move to the next form control. Reserve Tab-trapping strictly for modal dialogs, where escaping is the bug.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|----------------|----------------|
| Tab jumps around the screen unpredictably | Compare DOM order to visual order; search for positive `tabindex` | Reorder the DOM; remove all positive `tabindex` values |
| Every radio/option is a separate tab stop | Count how many items have `tabindex="0"` | Apply a roving controller so exactly one item is `tabindex="0"` |
| Arrow keys scroll the page inside a group | Check for a missing `preventDefault` on handled keys | Call `e.preventDefault()` for the keys the controller acts on |
| Focus escapes a modal to the page behind | Verify the trap wraps at both first and last focusable | Wrap `Shift+Tab` at the first element and `Tab` at the last |
| Screen reader silent when arrowing a combobox | Inspect `aria-activedescendant` against live option ids | Re-point it after each filter; toggle `aria-selected` on the active option |

---

## Testing and QA Hooks

Expose the active item and group role via data attributes so keyboard behaviour is assertable without pixel checks.

```typescript
// Mirror the controller's active index onto the container for test selectors.
function syncRovingAttributes(container: HTMLElement, activeIndex: number): void {
  container.dataset.rovingActive = String(activeIndex);
}
```

```typescript
// Playwright: the group is a single tab stop and arrows move within it.
await page.locator('[name="firstName"]').focus();
await page.keyboard.press("Tab"); // enters the radiogroup once
await expect(page.locator('[role="radiogroup"]')).toHaveAttribute("data-roving-active", "0");

await page.keyboard.press("ArrowDown"); // move within the group, not to the next field
await expect(page.locator('[role="radiogroup"]')).toHaveAttribute("data-roving-active", "1");

await page.keyboard.press("Tab"); // leaves the group to the next control
await expect(page.locator(":focus")).toHaveAttribute("name", "email");
```

```typescript
// Assert Escape closes a combobox popup without submitting the form.
await page.locator('[role="combobox"]').press("ArrowDown");
await expect(page.locator('[role="listbox"]')).toBeVisible();
await page.locator('[role="combobox"]').press("Escape");
await expect(page.locator('[role="listbox"]')).toBeHidden();
```

For ARIA regression coverage, run axe-core against the open combobox and modal states, not just the initial render, and assert that `aria-activedescendant` always resolves to an element that exists in the DOM.

---

## Common Pitfalls

**Using a positive `tabindex` to reorder focus.** It creates a separate, fragile tab sequence that drifts out of sync with the layout on every change. Reorder the DOM instead and keep `tabindex` to `0` and `-1`.

**Making every item in a group its own tab stop.** A ten-option group becomes ten Tab presses. Apply roving tabindex so the group is one stop with arrow-key movement inside.

**Trapping Tab inside a non-modal widget.** Comboboxes and toolbars must let Tab leave; only true modal dialogs trap Tab. Intercepting Tab elsewhere strands keyboard users.

**Swallowing Enter globally.** A blanket `keydown` handler that `preventDefault()`s Enter breaks native single-line submit. Scope Enter handling to the control that needs custom behaviour.

**Moving DOM focus in a combobox instead of using `aria-activedescendant`.** Physically focusing an option pulls the caret out of the text input, so the user can no longer type to filter. Use virtual focus and keep DOM focus on the input.

---

## Frequently Asked Questions

<details>
<summary><strong>What is roving tabindex and when should I use it?</strong></summary>

Roving tabindex makes a group of related controls — radio buttons, a toolbar, a listbox of options — a single tab stop. Exactly one element in the group has `tabindex="0"` and is reachable by Tab; every other element has `tabindex="-1"`. Arrow keys move the `tabindex="0"` designation from element to element. Use it whenever Tab-ing through every item in a group would be tedious and the items form a single conceptual control, which is nearly every custom group you build.

</details>

<details>
<summary><strong>Should tab order follow the DOM or can I use tabindex to reorder it?</strong></summary>

Tab order should follow DOM order, and DOM order should match the visual reading order. Positive `tabindex` values (1 and above) override the natural order and create a separate, fragile tab sequence that almost always drifts out of sync with the layout as it changes. Reorder the DOM instead, and reserve `tabindex="0"` (join the natural order) and `tabindex="-1"` (focusable only programmatically) for their intended roles.

</details>

<details>
<summary><strong>Why does my WeakMap of element handlers matter for keyboard controllers?</strong></summary>

A `WeakMap` keyed by DOM element lets the controller associate per-element state — its index, its cleanup function — without preventing that element from being garbage collected when it is removed from the DOM. A plain `Map` or object would hold a strong reference to every element the controller has ever seen, leaking detached nodes across re-renders. The `WeakMap` entry disappears automatically once nothing else references the element, which is exactly what you want for a group whose items are added and removed dynamically.

</details>

<details>
<summary><strong>How should Enter and Escape behave inside a form?</strong></summary>

Enter in a single-line text field submits the form (native behaviour); inside a `<textarea>` it inserts a newline; on a custom button or option it activates that control. Escape should dismiss the nearest transient layer — close an open combobox listbox, cancel an inline edit, or close a modal — without submitting. Never let Escape wipe the whole form, and never swallow Enter with a global handler, or you break native single-line submit.

</details>

---

## Related

- [Roving Tabindex for Option Groups](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/)
- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)

← [Accessibility & Error UX](https://www.client-side-form.com/accessibility-and-error-ux/)
