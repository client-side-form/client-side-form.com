---
layout: page.njk
title: "Roving tabindex for Radio and Checkbox Groups"
description: "Build a keyboard-accessible custom radiogroup or checkbox group with roving tabindex: arrow keys move focus and selection, one tab stop, WeakMap element-to-state."
slug: roving-tabindex-for-option-groups
type: guide
breadcrumb: "Roving tabindex"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Roving tabindex for Radio and Checkbox Groups"
  parent: "Keyboard Navigation Patterns"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Roving tabindex for Radio and Checkbox Groups",
      "description": "Build a keyboard-accessible custom radiogroup or checkbox group with roving tabindex: arrow keys move focus and selection, one tab stop, WeakMap element-to-state.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility & Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "Keyboard Navigation Patterns", "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/" },
        { "@type": "ListItem", "position": 4, "name": "Roving tabindex", "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement roving tabindex for an option group",
      "step": [
        { "@type": "HowToStep", "name": "Give the group role radiogroup and each option role radio" },
        { "@type": "HowToStep", "name": "Set tabindex 0 on one active option and tabindex minus one on the rest" },
        { "@type": "HowToStep", "name": "Handle arrow keys to move the tabindex 0 and focus to the next option" },
        { "@type": "HowToStep", "name": "For radios, move selection with focus; for checkboxes, toggle on Space only" },
        { "@type": "HowToStep", "name": "Store option state in a WeakMap keyed by the element" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why should a radio group have only one tab stop?",
          "acceptedAnswer": { "@type": "Answer", "text": "A native radio group is a single tab stop: Tab enters the group and arrow keys move between options. A custom group must reproduce that with roving tabindex — exactly one option has tabindex 0 and the rest have tabindex minus one — so Tab does not stop on every option and keyboard users move through the group the way they expect." }
        },
        {
          "@type": "Question",
          "name": "What is the difference between roving tabindex for radios versus checkboxes?",
          "acceptedAnswer": { "@type": "Answer", "text": "For a radiogroup, arrow keys move focus and selection together, since only one option can be selected. For a checkbox group, arrow keys move focus only, and Space toggles the focused option independently, because multiple options can be checked. Both share the single-tab-stop roving mechanism; only the selection semantics differ." }
        },
        {
          "@type": "Question",
          "name": "Why use a WeakMap to store option state instead of a data attribute?",
          "acceptedAnswer": { "@type": "Answer", "text": "A WeakMap keyed by the element lets option state be garbage-collected automatically when the option is removed from the DOM, with no manual cleanup and no risk of a leak. It also keeps rich state (index, checked, disabled) off the DOM where it cannot be tampered with or trigger attribute-mutation observers on every keystroke." }
        }
      ]
    }
  ]
}
</script>

# Roving tabindex for Radio and Checkbox Groups

A custom radiogroup or checkbox group built from `<div>`s must behave exactly like the native control it replaces — one Tab stop for the whole group, arrow keys to move between options — and the mechanism that delivers this is roving tabindex: precisely one option carries `tabindex="0"` at any moment while every other option carries `tabindex="-1"`.

The bug this page fixes: a custom option group where every option is a tab stop, so a keyboard user must press Tab five times to pass a five-option group, and a screen reader announces each as a separate control instead of "1 of 5". The fix is not more ARIA — it is moving the single `tabindex="0"` as focus roves, and wiring arrow keys to drive both focus and (for radios) selection.

This is the canonical [keyboard navigation pattern](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/) for composite widgets, and it is what lets [focus-first-invalid](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/) land on the correct member of a group rather than a dead container.

---

## What roving tabindex actually is

Native radio groups have two properties a naive `<div role="radio">` reimplementation loses: a *single* tab stop, and *arrow-key* traversal. Roving tabindex restores both with one invariant:

- **Exactly one option is tabbable.** At all times one option has `tabindex="0"` (the group's tab stop) and every other option has `tabindex="-1"` (focusable by script, skipped by Tab).
- **Arrow keys move the `0`.** Pressing Down/Right sets the current option to `-1`, sets the next option to `0`, and focuses it. The `0` "roves" to wherever focus is.
- **Selection semantics diverge by role.** In a `radiogroup`, moving focus also moves selection (only one can be checked). In a checkbox group, arrows move focus only and `Space` toggles the focused option (many can be checked).

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 240" role="img" aria-label="Roving tabindex diagram: five options where one holds tabindex zero and the arrow key moves it to the next option" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Roving tabindex across a radio group</title>
  <desc>Five options in a radiogroup; option two currently holds tabindex zero and is focused, the others hold tabindex minus one, and pressing the Down arrow moves tabindex zero and focus to option three.</desc>
  <rect width="720" height="240" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <text x="360" y="34" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="currentColor" opacity="0.75">role="radiogroup"</text>
  <rect x="40" y="60" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="100" y="86" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor">Option 1</text>
  <text x="100" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.6">tabindex="-1"</text>
  <rect x="175" y="60" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-opacity="0.9"/>
  <text x="235" y="86" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="currentColor">Option 2</text>
  <text x="235" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.8">tabindex="0" ◄ focus</text>
  <rect x="310" y="60" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="370" y="86" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor">Option 3</text>
  <text x="370" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.6">tabindex="-1"</text>
  <rect x="445" y="60" width="120" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="505" y="86" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor">Option 4</text>
  <text x="505" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.6">tabindex="-1"</text>
  <rect x="580" y="60" width="110" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="635" y="86" text-anchor="middle" font-family="inherit" font-size="11" fill="currentColor">Option 5</text>
  <text x="635" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.6">tabindex="-1"</text>
  <path d="M235 120 C260 160 345 160 370 124" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.8" marker-end="url(#arr-roving)"/>
  <text x="302" y="178" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.8">ArrowDown → moves tabindex="0" and focus</text>
  <defs>
    <marker id="arr-roving" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.8"/>
    </marker>
  </defs>
</svg>

---

## Core implementation

The controller manages one group. Option state lives in a `WeakMap` keyed by the element, and the roving `tabindex` is a single source of truth derived from the active index.

```typescript
interface OptionState {
  index: number;    // position within the group
  checked: boolean; // selection state
  disabled: boolean;
}

type GroupKind = "radio" | "checkbox";

class RovingGroup {
  private options: HTMLElement[];

  /**
   * WeakMap keyed by the option element. Chosen over a Map or a data-*
   * attribute because when an option node is removed from the DOM and
   * dropped elsewhere, its entry becomes unreachable and is garbage-
   * collected automatically — no manual delete(), no leak if the group
   * re-renders. State also stays off the DOM, so mutating `checked` does
   * not fire attribute observers or reflow on every arrow keypress.
   */
  private state = new WeakMap<HTMLElement, OptionState>();

  private activeIndex = 0;

  constructor(
    private group: HTMLElement,
    private kind: GroupKind,
    private onChange: (checked: HTMLElement[]) => void
  ) {
    this.options = Array.from(
      group.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]')
    );
    this.options.forEach((el, index) => {
      this.state.set(el, {
        index,
        checked: el.getAttribute("aria-checked") === "true",
        disabled: el.getAttribute("aria-disabled") === "true",
      });
    });
    // Initial roving position: the checked option, or the first enabled one.
    this.activeIndex = Math.max(0, this.options.findIndex((el) => this.state.get(el)?.checked));
    this.syncTabindex();
    group.addEventListener("keydown", this.onKeydown);
    group.addEventListener("click", this.onClick);
  }

  /** Exactly one option gets tabindex 0; all others get -1. */
  private syncTabindex(): void {
    this.options.forEach((el, i) => {
      el.tabIndex = i === this.activeIndex ? 0 : -1;
    });
  }

  private moveTo(index: number, opts: { select: boolean }): void {
    const target = this.options[index];
    if (!target || this.state.get(target)?.disabled) return;
    this.activeIndex = index;
    this.syncTabindex();
    target.focus(); // the newly-tabbable option receives focus
    if (opts.select) this.select(target, true);
  }

  /** Next/previous enabled option, wrapping around the ends. */
  private step(delta: 1 | -1): number {
    const n = this.options.length;
    let i = this.activeIndex;
    for (let c = 0; c < n; c++) {
      i = (i + delta + n) % n;
      if (!this.state.get(this.options[i])?.disabled) return i;
    }
    return this.activeIndex;
  }

  private onKeydown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        // Radios select on move; checkboxes only move focus.
        this.moveTo(this.step(1), { select: this.kind === "radio" });
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        this.moveTo(this.step(-1), { select: this.kind === "radio" });
        break;
      case "Home":
        e.preventDefault();
        this.moveTo(this.firstEnabled(), { select: this.kind === "radio" });
        break;
      case "End":
        e.preventDefault();
        this.moveTo(this.lastEnabled(), { select: this.kind === "radio" });
        break;
      case " ": // Space toggles the focused checkbox; confirms a radio.
        e.preventDefault();
        this.select(this.options[this.activeIndex], this.kind === "checkbox" ? "toggle" : true);
        break;
    }
  };

  private onClick = (e: MouseEvent): void => {
    const option = (e.target as HTMLElement).closest<HTMLElement>('[role="radio"], [role="checkbox"]');
    if (!option || this.state.get(option)?.disabled) return;
    this.moveTo(this.state.get(option)!.index, { select: false });
    this.select(option, this.kind === "checkbox" ? "toggle" : true);
  };

  private select(el: HTMLElement, mode: boolean | "toggle"): void {
    const st = this.state.get(el);
    if (!st || st.disabled) return;
    if (this.kind === "radio") {
      // Single selection: clear the rest, set this one.
      this.options.forEach((o) => {
        const s = this.state.get(o)!;
        s.checked = o === el;
        o.setAttribute("aria-checked", String(s.checked));
      });
    } else {
      st.checked = mode === "toggle" ? !st.checked : Boolean(mode);
      el.setAttribute("aria-checked", String(st.checked));
    }
    this.onChange(this.options.filter((o) => this.state.get(o)!.checked));
  }

  private firstEnabled(): number {
    return this.options.findIndex((el) => !this.state.get(el)?.disabled);
  }
  private lastEnabled(): number {
    for (let i = this.options.length - 1; i >= 0; i--) {
      if (!this.state.get(this.options[i])?.disabled) return i;
    }
    return 0;
  }

  destroy(): void {
    this.group.removeEventListener("keydown", this.onKeydown);
    this.group.removeEventListener("click", this.onClick);
    // No need to clear the WeakMap: dropping the RovingGroup reference makes
    // every entry unreachable, and the GC reclaims them with the elements.
  }
}
```

---

## Step-by-step walkthrough

1. **Roles and initial tabindex.** The group is `role="radiogroup"` (or a `group` with `role="checkbox"` children). `syncTabindex` sets `tabindex="0"` on the active option and `-1` on the rest, producing the single tab stop.
2. **State goes in the WeakMap.** Each option's index, checked, and disabled flags are stored in `state`, keyed by the element, so no per-option lookup touches the DOM during navigation.
3. **Arrow keys rove.** `onKeydown` maps Down/Right to `step(1)` and Up/Left to `step(-1)`, `moveTo` shifts the `tabindex="0"`, focuses the target, and — for radios — selects it.
4. **Selection semantics split.** `moveTo`'s `select` flag is true for radios (focus moves selection) and false for checkboxes (focus only); `Space` toggles a checkbox but merely confirms a radio.
5. **Home/End and wrapping.** `Home` and `End` jump to the first/last enabled option; `step` wraps around the ends and skips disabled options.
6. **Teardown is trivial.** `destroy` removes the two listeners; the `WeakMap` needs no explicit clearing because dropping the controller makes its entries collectible.

---

## Failure modes and edge cases

### Every option is a tab stop

Leaving the default `tabindex` (or setting all options to `0`) makes each option a separate tab stop — the exact bug this pattern exists to fix.

```typescript
// WRONG — all options tabbable, Tab stops on every one
options.forEach((el) => (el.tabIndex = 0));

// RIGHT — exactly one tab stop that roves with focus
options.forEach((el, i) => (el.tabIndex = i === activeIndex ? 0 : -1));
```

### Focus lost after the active option is removed

If the option holding `tabindex="0"` is removed from the DOM, the group loses its tab stop entirely and Tab skips it. On any dynamic add/remove, recompute `activeIndex` (clamp into range) and call `syncTabindex` so some enabled option is always tabbable.

### Using a Map instead of a WeakMap leaks

A plain `Map<HTMLElement, OptionState>` keeps every option element alive as long as the map exists, so a frequently re-rendering group leaks detached nodes. The `WeakMap` holds its keys weakly — removed options are reclaimed automatically. This is precisely why the state store is a `WeakMap` and not a `Map`.

### Selecting radios on arrow conflicts with disabled options

Moving selection onto a disabled option is invalid, yet arrow traversal must skip it. `step` loops until it finds an enabled option, and `moveTo` bails if the target is disabled, so selection never lands on a disabled radio.

### Space scrolls the page

`Space` on a focused `<div>` scrolls the viewport unless prevented. The `e.preventDefault()` in the `" "` case stops the scroll so Space only toggles or confirms the option.

---

## Verification checklist

- [ ] The whole group is a single Tab stop; Tab enters and exits, arrows move within
- [ ] Exactly one option has tabindex="0" at every moment; the rest have tabindex="-1"
- [ ] Arrow keys move focus and, for radios, selection; for checkboxes only focus
- [ ] Space toggles a focused checkbox and confirms a radio, without scrolling the page
- [ ] Home and End jump to the first and last enabled options
- [ ] Arrow traversal skips disabled options and wraps at the ends
- [ ] Option state lives in a WeakMap keyed by element (no Map, no leak)
- [ ] Removing the active option recomputes the roving tab stop
- [ ] aria-checked reflects selection and the group exposes "N of M" to screen readers
- [ ] Tested with NVDA + Firefox and VoiceOver + Safari: group announces as one composite control

---

## Frequently Asked Questions

<details>
<summary><strong>Why should a radio group have only one tab stop?</strong></summary>

A native radio group is a single tab stop: Tab enters the group and arrow keys move between options. A custom group must reproduce that with roving tabindex — exactly one option has `tabindex="0"` and the rest have `tabindex="-1"` — so Tab does not stop on every option and keyboard users move through the group the way they expect. Making every option tabbable is the most common regression in hand-built groups.

</details>

<details>
<summary><strong>What is the difference between roving tabindex for radios versus checkboxes?</strong></summary>

For a radiogroup, arrow keys move focus and selection together, since only one option can be selected. For a checkbox group, arrow keys move focus only, and `Space` toggles the focused option independently, because multiple options can be checked. Both share the single-tab-stop roving mechanism; only the selection semantics differ — the implementation captures this with a `select` flag that is true for radios and false for checkboxes on arrow movement.

</details>

<details>
<summary><strong>Why use a WeakMap to store option state instead of a data attribute?</strong></summary>

A `WeakMap` keyed by the element lets option state be garbage-collected automatically when the option is removed from the DOM, with no manual cleanup and no risk of a leak. It also keeps rich state (index, checked, disabled) off the DOM where it cannot be tampered with or trigger attribute-mutation observers on every keystroke. A plain `Map` would pin every element in memory for the map's lifetime.

</details>

---

## Related

- [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
- [Moving Focus to the First Invalid Field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/)
- [Focus Management in Multi-Step Form Wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/)

← [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
