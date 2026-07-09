---
layout: page.njk
title: "Controlled vs Uncontrolled: When to Switch Mid-Lifecycle"
description: "Fix React's changing-an-uncontrolled-input-to-controlled warning — defaultValue vs value, the key-remount escape hatch, and preserving field value and focus during a safe mode switch."
slug: "when-to-switch-controlled-uncontrolled-mid-lifecycle"
type: "long_tail"
breadcrumb: "Switching Mid-Lifecycle"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Controlled vs Uncontrolled: When to Switch Mid-Lifecycle"
  parent: "Controlled vs Uncontrolled Forms"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Controlled vs Uncontrolled: When to Switch Mid-Lifecycle",
      "description": "Fix React's changing-an-uncontrolled-input-to-controlled warning — defaultValue vs value, the key-remount escape hatch, and preserving field value and focus during a safe mode switch.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Controlled vs Uncontrolled Forms", "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/" },
        { "@type": "ListItem", "position": 4, "name": "Controlled vs Uncontrolled: When to Switch Mid-Lifecycle", "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/when-to-switch-controlled-uncontrolled-mid-lifecycle/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Switch a React Input Between Controlled and Uncontrolled Safely",
      "description": "Migrate an input between controlled and uncontrolled modes mid-lifecycle without triggering React's warning or losing value and focus.",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Never pass value={undefined}", "text": "Coerce a nullish value to an empty string so the input stays controlled for its whole life." },
        { "@type": "HowToStep", "position": 2, "name": "Pick one mode per mount", "text": "Use defaultValue for uncontrolled and value+onChange for controlled — never both on one element." },
        { "@type": "HowToStep", "position": 3, "name": "Remount with a key to change modes", "text": "Change the element key so React unmounts the old input and mounts a fresh one in the new mode." },
        { "@type": "HowToStep", "position": 4, "name": "Seed the new mode from the old value", "text": "Read the live DOM or ref value before the switch and pass it as the new initial value." },
        { "@type": "HowToStep", "position": 5, "name": "Restore focus and caret after remount", "text": "In a layout effect after the key change, refocus the input and set the selection range." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What actually triggers the 'changing an uncontrolled input to be controlled' warning?",
          "acceptedAnswer": { "@type": "Answer", "text": "React records whether an input was controlled on its first render by whether value was non-undefined. If a later render passes a defined value where the first passed undefined (or vice versa), React sees the ownership of the input's value change and warns. The usual cause is value={state.email} where state.email starts undefined and becomes a string after an async load — coerce it with value={state.email ?? '' } to keep it controlled from mount." }
        },
        {
          "@type": "Question",
          "name": "How do I preserve the user's typed value when switching modes?",
          "acceptedAnswer": { "@type": "Answer", "text": "Read the input's current value from the DOM or a ref immediately before the switch, then feed it as defaultValue (for the new uncontrolled input) or as the initial controlled state. Because switching modes requires remounting the element with a new key, the new instance starts blank unless you explicitly seed it from the value you captured." }
        },
        {
          "@type": "Question",
          "name": "Why does the input lose focus when I change its key?",
          "acceptedAnswer": { "@type": "Answer", "text": "Changing an element's key tells React the old element is a different element, so it unmounts the old DOM node and mounts a new one. Focus lives on the DOM node, so it is lost with the old node. Restore it in a useLayoutEffect keyed on the switch by calling focus() and setSelectionRange() with the caret position you captured before the remount." }
        }
      ]
    }
  ]
}
</script>

# Controlled vs Uncontrolled: When to Switch Mid-Lifecycle

The precise problem: an input mounts uncontrolled with a `defaultValue`, then later receives a `value` prop once async data or a feature flag resolves, and React logs "A component is changing an uncontrolled input to be controlled" — after which the field's behavior is undefined.

This page is the mid-lifecycle companion to [controlled vs uncontrolled forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/): it covers exactly when a switch is legitimate, the `defaultValue` versus `value` rule that prevents the accidental switch, and the `key`-remount technique that performs a deliberate switch without losing the user's typed value or their caret position.

## Context and Prerequisites

You should already know the split from [controlled vs uncontrolled forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — controlled means React owns the value via `value` + `onChange`, uncontrolled means the DOM owns it and you read it through a ref. This page assumes that baseline and focuses on the transition between the two. The value you carry across the switch is a pristine baseline in disguise, so the snapshot discipline from [dirty and pristine state tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) applies directly: capture the live value first, then re-seed.

## The Rule That Prevents the Accidental Switch

React decides an input's mode on its **first** render: if `value` is anything other than `undefined`, the input is controlled for its entire life, and every subsequent render must keep passing a defined `value`. The warning fires when a later render flips that. Ninety percent of the time the cause is a `value` prop bound to state that starts `undefined`.

```typescript
// The single line that prevents the accidental switch:
// coerce nullish to empty string so `value` is defined from the very first render.
<input
  name="email"
  value={form.email ?? ""}          // never undefined -> controlled for its whole life
  onChange={(e) => setField("email", e.target.value)}
/>
```

```typescript
// The mistake this fixes: `form.email` is undefined until the fetch resolves,
// so the input mounts UNCONTROLLED and becomes CONTROLLED on the next render.
<input name="email" value={form.email} onChange={onChange} />   // warns after load
```

A deliberate switch — say a field that is a free-text input under one plan and a locked, server-controlled value under another — cannot be done by toggling props on the same element. It requires remounting.

## The Deliberate Switch: Remount with a Key

Because React locks the mode at mount, the only clean way to change it is to give React a *new* element to mount. Changing the `key` does exactly that: React unmounts the old input and mounts a fresh one, which gets a fresh first render and therefore a fresh mode decision.

```typescript
import { useRef, useState, useLayoutEffect } from "react";

type Mode = "uncontrolled" | "controlled";

export function SwitchableField({ name }: { name: string }) {
  const [mode, setMode] = useState<Mode>("uncontrolled");

  // Ref to the live DOM node, used to read the value/caret before a remount.
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The value we carry ACROSS the switch. Seeded from the DOM at switch time so
  // the freshly mounted input is not blank. This is the pristine snapshot.
  const [carry, setCarry] = useState("");
  const [controlledValue, setControlledValue] = useState("");

  // Caret position captured pre-remount so we can restore it post-remount.
  const caret = useRef<number | null>(null);

  function switchMode(next: Mode) {
    const el = inputRef.current;
    if (el) {
      setCarry(el.value);                       // capture live value before unmount
      setControlledValue(el.value);             // seed controlled state too
      caret.current = el.selectionStart ?? el.value.length;   // capture caret
    }
    setMode(next);                              // changing `mode` changes the key below
  }

  // Runs synchronously after the remount, before the browser paints, so the
  // user never sees an unfocused flash. useLayoutEffect (not useEffect) matters:
  // effect ordering here is the difference between a seamless switch and a blink.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && caret.current !== null) {
      el.focus();                               // focus lives on the DOM node, lost on remount
      const pos = Math.min(caret.current, el.value.length);
      el.setSelectionRange(pos, pos);           // restore the caret exactly
      caret.current = null;
    }
  }, [mode]);                                   // re-run only when the mode (and key) changes

  return mode === "uncontrolled" ? (
    <input
      // A distinct key per mode forces the remount that resets the mode decision.
      key={`${name}-uncontrolled`}
      ref={inputRef}
      name={name}
      defaultValue={carry}                      // uncontrolled seed — DOM owns it hereafter
      onBlur={() => switchMode("controlled")}
    />
  ) : (
    <input
      key={`${name}-controlled`}
      ref={inputRef}
      name={name}
      value={controlledValue}                   // controlled — React owns it now
      onChange={(e) => setControlledValue(e.target.value)}
    />
  );
}
```

## Step-by-Step Walkthrough

1. **Capture the live value first.** Before flipping `mode`, read `inputRef.current.value` and `selectionStart` straight from the DOM. This is the only moment the current value exists in the old mode; after the remount the old node is gone.

2. **Seed both possible destinations.** Write the captured value into `carry` (used as `defaultValue` for the uncontrolled branch) and into `controlledValue` (used as `value` for the controlled branch). Whichever branch renders next starts populated, not blank.

3. **Change the key to force the remount.** The `key` is derived from `mode`, so setting `mode` changes the key, and React unmounts the old input and mounts a new one in the target mode. The new input gets a clean first render and a correct mode decision.

4. **Restore focus and caret in a layout effect.** `useLayoutEffect` keyed on `mode` runs after the DOM is updated but before paint. It calls `focus()` and `setSelectionRange()` with the captured caret, so the field never visibly loses focus.

5. **Let each mode own its value afterward.** In uncontrolled mode the DOM holds the value and you read it via the ref at submit time; in controlled mode React holds it in `controlledValue`. Do not mix `defaultValue` and `value` on the same element in either branch.

## Failure Modes and Edge Cases

### 1. Passing both defaultValue and value

React treats an element with both as controlled and warns that `defaultValue` is ignored. Each branch must use exactly one.

```typescript
// Wrong — pick one per element.
<input defaultValue={carry} value={controlledValue} onChange={onChange} />
```

### 2. Coercing to empty string hides a real reset

`value={x ?? ""}` keeps the input controlled, but if you actually intend to clear the field you must set state to `""` explicitly — relying on `undefined` to blank it will now render the last value instead. Clear through state, never through `undefined`.

### 3. Focus restored to a stale node

If you capture `inputRef.current` into a variable before the remount and use that reference inside the layout effect, you are pointing at the unmounted node. Always re-read `inputRef.current` inside the effect, after React has attached it to the new node.

```typescript
// Wrong: `stale` is the old, unmounted node.
const stale = inputRef.current;
useLayoutEffect(() => { stale?.focus(); }, [mode]);
```

### 4. Number and date inputs round-trip through strings

`el.value` is always a string. Switching a `type="number"` field carries `"42"`, not `42`; re-seed with the string and let the input reparse, or normalize before comparing against a numeric baseline — the same coercion trap covered in [dirty and pristine state tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/).

### 5. The switch marks the field dirty

Remounting and re-seeding can trip a dirty-tracker if the carried value flows through the user-mutation path. Route the seeded value through the programmatic hydrate path, not `onChange`, so the switch itself does not flip the field to dirty.

## Verification Checklist

- [ ] No "changing an uncontrolled input to be controlled" (or the reverse) warning appears in the console across the field's whole lifecycle
- [ ] Every controlled value is coerced so it is never undefined (value={x ?? ""})
- [ ] No element receives both defaultValue and value
- [ ] The user's typed text survives the switch (type, trigger the switch, confirm the value is retained)
- [ ] Focus remains on the field immediately after the switch, with no visible blink
- [ ] The caret returns to its captured position, not to the start or end
- [ ] The switch does not mark a previously-pristine field dirty
- [ ] useLayoutEffect (not useEffect) restores focus, so restoration happens before paint

## Frequently Asked Questions

<details>
<summary><strong>What actually triggers the "changing an uncontrolled input to be controlled" warning?</strong></summary>

React records whether an input was controlled on its first render by whether `value` was non-`undefined`. If a later render passes a defined `value` where the first passed `undefined` (or vice versa), React sees the ownership of the input's value change and warns; the field's behavior after that is undefined. The usual cause is `value={state.email}` where `state.email` starts `undefined` and becomes a string after an async load. Coerce it with `value={state.email ?? ""}` to keep the input controlled from mount.

</details>

<details>
<summary><strong>How do I preserve the user's typed value when switching modes?</strong></summary>

Read the input's current value from the DOM or a ref immediately before the switch, then feed it as `defaultValue` for the new uncontrolled input or as the initial controlled state. Switching modes requires remounting the element with a new `key`, so the new instance starts blank unless you explicitly seed it from the value you captured. Capture the value in the same handler that changes the key — that is the last moment it exists in the old mode.

</details>

<details>
<summary><strong>Why does the input lose focus when I change its key?</strong></summary>

Changing an element's `key` tells React the old element is a different element, so it unmounts the old DOM node and mounts a new one. Focus lives on the DOM node, so it is lost with the old node. Restore it in a `useLayoutEffect` keyed on the switch by re-reading the ref, calling `focus()`, and calling `setSelectionRange()` with the caret position you captured before the remount. Use `useLayoutEffect` rather than `useEffect` so restoration happens before the browser paints and the user never sees an unfocused flash.

</details>

---

**Related**

- [Controlled vs Uncontrolled Forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — the mode split this switch operates on
- [Dirty and Pristine State Tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — snapshot discipline for the value you carry across the switch
- [Best Practices for Uncontrolled Form State](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) — reading values via refs once the field is uncontrolled

← [Controlled vs Uncontrolled Forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
