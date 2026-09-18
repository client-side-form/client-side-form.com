---
layout: page.njk
title: "Rendering 100+ Field Forms Without Jank"
description: "Keep a 100–500 field form at 60fps using uncontrolled inputs with subscription reads, list windowing, and deferred initialization of non-visible fieldsets."
slug: rendering-100-plus-field-forms-without-jank
type: howto
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

Virtualising a form is not the same as virtualising a list, because a form field that leaves the document takes its value, its validation state and its focusability with it. Three strategies handle that differently:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three ways to keep a long form cheap, compared on what happens to off-screen fields: render everything, use content-visibility auto, and true virtualisation. Each row lists what stays in the document, what happens to values on submit, and what breaks." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three ways to shrink a 300-field form, and what each costs</title>
  <desc>Render everything: all fields stay in the document, submit sees every value, find-in-page and native required validation work, but layout and paint cost grows with field count. Content-visibility auto: all fields stay in the document and are skipped only for rendering, so submit, find-in-page and native validation all still work while layout cost drops sharply; the cost is that scrollbar length jumps unless a size hint is supplied. True virtualisation: off-screen fields are removed from the document, so layout cost is flat regardless of size, but submit no longer sees their values, find-in-page misses them and native required validation cannot reach them, so state must live outside the DOM and focus must be restored explicitly.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Strategy</text>
  <text x="178" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Off-screen fields</text>
  <text x="330" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Layout cost</text>
  <text x="452" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What you give up</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">render everything</text>
  <text x="178" y="66" font-size="10" fill="#6b5f75" font-family="inherit">in the document</text>
  <text x="330" y="66" font-size="10" fill="#a63d6f" font-family="inherit">grows linearly</text>
  <text x="452" y="66" font-size="10" fill="#2d6342" font-family="inherit">nothing</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">content-visibility: auto</text>
  <text x="178" y="100" font-size="10" fill="#6b5f75" font-family="inherit">in the document</text>
  <text x="330" y="100" font-size="10" fill="#2d6342" font-family="inherit">near flat</text>
  <text x="452" y="100" font-size="10" fill="#1e1a24" font-family="inherit">stable scrollbar, without a size hint</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">true virtualisation</text>
  <text x="178" y="134" font-size="10" fill="#a63d6f" font-family="inherit">removed</text>
  <text x="330" y="134" font-size="10" fill="#2d6342" font-family="inherit">flat</text>
  <text x="452" y="134" font-size="10" fill="#a63d6f" font-family="inherit">submit, find-in-page, native required</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#6b5f75" font-family="inherit">Try the middle row first: one CSS declaration, no state migration, and none of the third row's consequences.</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">If you do virtualise, form state must already live outside the DOM — otherwise scrolling past a field silently discards what was typed in it.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Add contain-intrinsic-size to every virtualised row so the scrollbar stops resizing as the reader scrolls.</text>
</svg>

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

One consequence deserves spelling out, because it turns a performance win into an accessibility regression if it is missed:

<svg viewBox="0 8 660 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="What happens to focus when a virtualised row is recycled. The reader focuses a field, scrolls it out of view, the row is unmounted and focus falls to the document body, and tabbing then restarts from the top of the page. The fix keeps the focused row mounted regardless of the visible window." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Recycling the focused row throws focus to the body</title>
  <desc>Step one: the reader focuses the field in row forty. Step two: an autocomplete popup or a scroll jump moves that row outside the rendered window. Step three: the virtualiser unmounts the row, and because the focused element no longer exists, the browser moves focus to the document body. Step four: the next Tab press starts again from the top of the page, and a screen reader announces the page rather than the form. The fix is to treat the focused row's index as part of the render window so it stays mounted even when it is outside the visible range.</desc>
  <rect x="0" y="8" width="660" height="214" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#a63d6f" font-family="inherit">The recycled-focus bug, one step at a time</text>
  <rect x="14" y="36" width="150" height="62" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · focus row 40</text>
  <text x="89" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">reader is typing</text>
  <text x="89" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">in a live field</text>
  <path d="M164,67 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="36" width="150" height="62" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="261" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · window moves</text>
  <text x="261" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">popup or scroll jump</text>
  <text x="261" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">pushes row 40 out</text>
  <path d="M336,67 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="36" width="150" height="62" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="433" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">3 · row unmounts</text>
  <text x="433" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focused node is gone</text>
  <text x="433" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus falls to body</text>
  <path d="M508,67 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="36" width="116" height="62" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="588" y="58" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">4 · Tab restarts</text>
  <text x="588" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from the top of</text>
  <text x="588" y="90" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the whole page</text>
  <rect x="14" y="124" width="632" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="146" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">The fix: the focused index is part of the render window</text>
  <text x="28" y="164" font-size="9.5" fill="#6b5f75" font-family="inherit">renderSet = visibleRange ∪ { focusedIndex } — the row stays mounted while it holds focus, whatever the scroll position says.</text>
  <text x="14" y="200" font-size="10" fill="#6b5f75" font-family="inherit">Assert it in a test: focus a field, scroll the container 2000px, and check document.activeElement is still that input.</text>
  <text x="14" y="216" font-size="10" fill="#6b5f75" font-family="inherit">The same union keeps the field the error summary just linked to from being recycled out from under the reader.</text>
</svg>

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

## Coalescing input events

A fast typist produces input events faster than a frame can absorb them, and a form that does one unit of work per event is doing work nobody will ever see. Coalescing to one unit per frame costs nothing in fidelity:

<svg viewBox="0 8 668 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two timelines across three 16-millisecond frames. Handling every input event synchronously does five units of work per frame and misses the deadline. Coalescing to one scheduled update per animation frame does one unit per frame and always lands, while the rendered value is identical because only the last value in a frame is ever painted." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Five events per frame, one paint per frame</title>
  <desc>Top timeline: a fast typist emits about five input events inside a single sixteen millisecond frame, and handling each one synchronously means five state updates, five validations and five renders, of which only the last is ever painted. Bottom timeline: each event writes the latest value to a mutable holder and schedules a single update with requestAnimationFrame, so exactly one update, one validation and one render happen per frame. The reader sees identical output, because a frame can only paint once.</desc>
  <rect x="0" y="8" width="668" height="216" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#a63d6f" font-family="inherit">One unit of work per event — four of five are wasted</text>
  <rect x="14" y="36" width="200" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="56" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 1</text>
  <text x="28" y="74" font-size="9.5" fill="#6b5f75" font-family="inherit">5 updates, 5 renders</text>
  <rect x="228" y="36" width="200" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="242" y="56" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 2</text>
  <text x="242" y="74" font-size="9.5" fill="#6b5f75" font-family="inherit">5 updates, 5 renders</text>
  <rect x="442" y="36" width="200" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="456" y="56" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 3</text>
  <text x="456" y="74" font-size="9.5" fill="#6b5f75" font-family="inherit">5 updates, 5 renders</text>
  <text x="14" y="106" font-size="10" fill="#a63d6f" font-family="inherit">15 renders, 3 paints — 12 renders the reader never saw.</text>
  <text x="14" y="138" font-size="12" font-weight="700" fill="#2d6342" font-family="inherit">One scheduled update per frame — same pixels</text>
  <rect x="14" y="148" width="200" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="168" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 1</text>
  <text x="28" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">1 update, 1 render</text>
  <rect x="228" y="148" width="200" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="242" y="168" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 2</text>
  <text x="242" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">1 update, 1 render</text>
  <rect x="442" y="148" width="200" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="456" y="168" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">frame 3</text>
  <text x="456" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">1 update, 1 render</text>
  <text x="14" y="218" font-size="10" fill="#6b5f75" font-family="inherit">Keep the DOM value untouched — the field stays responsive because the browser paints keystrokes itself; only your derived state waits.</text>
</svg>

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
