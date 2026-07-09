---
layout: page.njk
title: "Rendering 100+ Field Forms Without Jank"
description: "Keep a 100–500 field form at 60fps using uncontrolled inputs with subscription reads, list windowing, and deferred initialization of non-visible fieldsets."
slug: rendering-100-plus-field-forms-without-jank
type: guide
breadcrumb: "Rendering 100+ Field Forms"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Rendering 100+ Field Forms Without Jank"
  parent: "Performance and Scale for Large Forms"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Rendering 100+ Field Forms Without Jank",
      "description": "Keep a 100–500 field form at 60fps using uncontrolled inputs with subscription reads, list windowing, and deferred initialization of non-visible fieldsets.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Performance and Scale for Large Forms", "item": "https://client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/" },
        { "@type": "ListItem", "position": 4, "name": "Rendering 100+ Field Forms Without Jank", "item": "https://client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/rendering-100-plus-field-forms-without-jank/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Render a 100+ field form at 60fps",
      "step": [
        { "@type": "HowToStep", "name": "Make inputs uncontrolled", "text": "Let the DOM own the value; write to the store on change without binding value back to the input." },
        { "@type": "HowToStep", "name": "Read through subscriptions", "text": "Have each field subscribe to its own slice so only the changed field reconciles." },
        { "@type": "HowToStep", "name": "Window the field list", "text": "Render only rows inside the viewport plus an overscan buffer, spacing them with a sized container." },
        { "@type": "HowToStep", "name": "Defer non-visible fieldset init", "text": "Lazily register and validate collapsed or off-screen sections only when they enter the viewport." },
        { "@type": "HowToStep", "name": "Submit from the store", "text": "Collect values from the store snapshot, not from DOM inputs, since off-screen rows are unmounted." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do uncontrolled inputs lose their value when windowed out of view?",
          "acceptedAnswer": { "@type": "Answer", "text": "Only if the value lives solely in the DOM. Write each change to a store keyed by field id, so when a row unmounts on scroll its value persists in the store and is restored via defaultValue when the row remounts. The DOM node is disposable; the store is the source of truth." }
        },
        {
          "@type": "Question",
          "name": "How do I submit a virtualized form when most inputs are unmounted?",
          "acceptedAnswer": { "@type": "Answer", "text": "Do not build FormData from the form element — it only contains mounted inputs. Serialize the store snapshot instead. Every field's value is in the store regardless of whether its row is currently rendered, so the submitted payload is complete." }
        },
        {
          "@type": "Question",
          "name": "What overscan value should I use for a windowed form?",
          "acceptedAnswer": { "@type": "Answer", "text": "Render two to five rows beyond each edge of the viewport. Too little overscan shows blank space during fast scroll; too much erodes the mount savings that make windowing worthwhile. Tune it against measured scroll performance on your slowest target device rather than a fixed guess." }
        }
      ]
    }
  ]
}
</script>

# Rendering 100+ Field Forms Without Jank

Keep a form of 100 to 500 fields at 60fps by making inputs uncontrolled, reading their values through per-field subscriptions, windowing the rendered rows, and deferring initialization of fieldsets the user has not yet scrolled to.

## Context

This is the concrete rendering technique behind [performance and scale for large forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/), which explains the render budget and the subscription store this page builds on. The parent covers *why* a controlled form re-renders every field on one keystroke; here we build the windowed, uncontrolled renderer that keeps mount cost and reconciliation inside a frame budget. The value-ownership decision underneath it all is covered in [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — for very large forms, uncontrolled inputs win because they take per-keystroke reconciliation off the table entirely.

## Core Pattern

The renderer has three cooperating parts: an uncontrolled input that writes to a store but never binds `value` back, a windowing hook that decides which rows are mounted, and a store snapshot that submission reads from. Values live in the store, keyed by a stable field id, so a row can unmount and remount without losing data.

```typescript
// A windowed, uncontrolled form renderer. Inputs write to the store on change
// but never read `value` back, so a keystroke does not trigger React reconciliation.
interface FieldStore {
  get(id: string): string;
  set(id: string, value: string): void;
  snapshot(): Record<string, string>;
}

interface FieldDef { id: string; label: string; }

// The windowing hook returns the slice of fields to mount for the current
// scroll position, plus the spacer heights that keep the scrollbar honest.
function useWindow(total: number, rowHeight: number, viewportH: number, scrollTop: number) {
  const overscan = 4; // rows rendered beyond each edge to hide scroll blanking
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportH / rowHeight) + overscan * 2;
  const last = Math.min(total, first + visibleCount);
  return {
    first,
    last,
    padTop: first * rowHeight,               // spacer above the mounted rows
    padBottom: (total - last) * rowHeight,   // spacer below, preserves scroll range
  };
}

// One uncontrolled field. defaultValue seeds the input from the store on mount;
// after that the DOM owns the value and onChange mirrors it back to the store.
function Field({ def, store }: { def: FieldDef; store: FieldStore }) {
  return (
    <label style={{ display: 'block' }} data-field-id={def.id}>
      <span>{def.label}</span>
      <input
        name={def.id}
        // defaultValue (not value) => uncontrolled. React does not re-render
        // this input on keystroke; the store write below is fire-and-forget.
        defaultValue={store.get(def.id)}
        onChange={(e) => store.set(def.id, e.currentTarget.value)}
      />
    </label>
  );
}

function WindowedForm({ fields, store, rowHeight = 56, viewportH = 640 }: {
  fields: FieldDef[]; store: FieldStore; rowHeight?: number; viewportH?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const { first, last, padTop, padBottom } = useWindow(
    fields.length, rowHeight, viewportH, scrollTop,
  );

  return (
    <div
      style={{ height: viewportH, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Spacers reserve the full scroll height so the scrollbar matches the
          logical field count even though only a window of rows is mounted. */}
      <div style={{ height: padTop }} />
      {fields.slice(first, last).map((def) => (
        <Field key={def.id} def={def} store={store} />
      ))}
      <div style={{ height: padBottom }} />
    </div>
  );
}
```

## Step-by-Step Walkthrough

1. **Seed the store, then render the window.** Initialize the field store with server data (or empty strings) before first paint. The windowing hook computes `first`/`last` from `scrollTop` and only that slice mounts — 12 rows for a 640px viewport, not 500.

2. **Write on change, never bind value back.** Each `Field` uses `defaultValue`, making it uncontrolled. `onChange` mirrors the keystroke into the store, but because `value` is not bound, React never re-renders the input. The store write is O(1) and does not fan out to siblings.

3. **Preserve scroll range with spacers.** The `padTop` and `padBottom` divs reserve the height of the unmounted rows so the scrollbar reflects all 500 fields. Without them the container would collapse to the height of the mounted window and scrolling would break.

4. **Restore values on remount.** When a row scrolls back into view it remounts and `defaultValue={store.get(def.id)}` re-seeds it from the store. The user's earlier input is intact because the store, not the DOM node, held it.

5. **Submit from the snapshot.** On submit, serialize `store.snapshot()` rather than building `FormData` from the form element. The snapshot contains every field; the DOM contains only the mounted window. This mirrors how [error state mapping](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) reads from the store to place errors on fields that may not be mounted.

## Failure Modes and Edge Cases

**Off-screen values lost on submit.** Building `new FormData(formEl)` yields only mounted inputs, silently dropping every windowed-out field.

```typescript
// WRONG: only the mounted window is in the DOM.
// const data = new FormData(formEl);
// RIGHT: the store holds all fields regardless of what is mounted.
const data = store.snapshot();
```

**Scroll blanking on fast flings.** With zero overscan, fast scrolling outruns the render and shows blank rows. Raise `overscan` to 4–5, and consider rendering rows on `scroll` with a `requestAnimationFrame` throttle so state updates coalesce to one per frame.

**Variable row heights break the math.** The `rowHeight` constant assumes uniform rows; a field with a validation message is taller, so `padTop` drifts and rows jump. Measure rendered row heights and store a running offset table, or enforce a fixed row height with the message in a reserved, always-present slot.

**Autofocus and jump-to-error miss unmounted fields.** Focusing the first invalid field fails if that field is not in the current window. Scroll the virtualizer to the field's index first, wait one frame for it to mount, then focus — the same ordering [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) requires.

**Deferred fieldset init races validation.** If you lazily register a collapsed section only when it scrolls into view, a submit that happens before the user reaches that section must still initialize and validate it. Force-initialize all deferred sections in the submit handler before reading the snapshot.

## Verification Checklist

- [ ] Typing in a visible field does not increment the render count of any sibling field
- [ ] Scrolling a field out of view and back preserves its entered value
- [ ] Submission payload contains every field, including those never scrolled into view
- [ ] Scrollbar thumb size and position reflect the full field count, not the mounted window
- [ ] Fast-scroll (fling) shows no sustained blank rows at the chosen overscan
- [ ] Jump-to-first-error scrolls the window, mounts the field, then moves focus to it
- [ ] Screen reader reports the logical field count and position, not the windowed subset
- [ ] Initial mount completes within the frame budget on the slowest target device (Long Tasks API shows no >50ms task)
- [ ] Deferred/collapsed fieldsets are force-initialized before a snapshot submit

## Frequently Asked Questions

<details>
<summary><strong>Do uncontrolled inputs lose their value when windowed out of view?</strong></summary>

Only if the value lives solely in the DOM. Write each change to a store keyed by field id, so when a row unmounts on scroll its value persists in the store and is restored via `defaultValue` when the row remounts. The DOM node is disposable; the store is the source of truth. This is what makes uncontrolled inputs safe to virtualize.

</details>

<details>
<summary><strong>How do I submit a virtualized form when most inputs are unmounted?</strong></summary>

Do not build `FormData` from the form element — it only contains mounted inputs, so windowed-out fields are silently dropped. Serialize the store snapshot instead. Every field's value is in the store regardless of whether its row is currently rendered, so the submitted payload is complete. Force-initialize any lazily-registered sections before taking the snapshot.

</details>

<details>
<summary><strong>What overscan value should I use for a windowed form?</strong></summary>

Render two to five rows beyond each edge of the viewport. Too little overscan shows blank space during fast scroll; too much erodes the mount savings that make windowing worthwhile. Tune it against measured scroll performance on your slowest target device rather than a fixed guess, and pair it with a `requestAnimationFrame`-throttled scroll handler so updates coalesce to one per frame.

</details>

---

## Related

- [Memoization Boundaries for Form Fields](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/memoization-boundaries-for-form-fields/) — keeping re-renders scoped once rows are mounted
- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — the value-ownership tradeoff behind uncontrolled inputs

← [Performance and Scale for Large Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/)
