---
layout: page.njk
title: "Moving Focus to the First Invalid Field"
description: "On submit, find the first invalid field in DOM order, focus it with preventScroll, then scroll it into view manually — handling collapsed sections and hidden inputs."
slug: moving-focus-to-first-invalid-field
type: howto
breadcrumb: "Focus First Invalid Field"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Moving Focus to the First Invalid Field"
  parent: "Focus Management After Validation"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Moving Focus to the First Invalid Field",
      "description": "On submit, find the first invalid field in DOM order, focus it with preventScroll, then scroll it into view manually — handling collapsed sections and hidden inputs.",
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
        { "@type": "ListItem", "position": 4, "name": "Focus First Invalid Field", "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Move focus to the first invalid field on submit",
      "step": [
        { "@type": "HowToStep", "name": "Collect invalid field names from the validation result" },
        { "@type": "HowToStep", "name": "Order candidates by DOM position, not by object key order" },
        { "@type": "HowToStep", "name": "Reveal any collapsed section containing the first invalid field" },
        { "@type": "HowToStep", "name": "Focus the field with preventScroll to avoid a double scroll jump" },
        { "@type": "HowToStep", "name": "Scroll the field into view manually with a header offset" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does the page jump twice when I focus the first invalid field?",
          "acceptedAnswer": { "@type": "Answer", "text": "Calling focus() scrolls the element into view with the browser's default alignment, then your own scrollIntoView scrolls it again to a different position. Pass { preventScroll: true } to focus() so the browser does not scroll, then run a single scrollIntoView with the offset you actually want." }
        },
        {
          "@type": "Question",
          "name": "How do I focus a field inside a collapsed accordion section?",
          "acceptedAnswer": { "@type": "Answer", "text": "You cannot focus an element that is display:none or inside a closed details element. Expand the containing section first, wait one animation frame for layout, then focus. Track a map from field name to the section that must be opened, and open it before calling focus." }
        },
        {
          "@type": "Question",
          "name": "Should I sort invalid fields by DOM order or by validation order?",
          "acceptedAnswer": { "@type": "Answer", "text": "Always DOM order. A validation library returns errors in object-key or schema order, which rarely matches visual top-to-bottom layout. Focusing the first error in DOM order matches user expectation and reading direction. Sort candidates by compareDocumentPosition before choosing one." }
        }
      ]
    }
  ]
}
</script>

# Moving Focus to the First Invalid Field

When a submit fails validation, keyboard and screen-reader users need focus moved to the first field that is wrong — in *visual* DOM order, not the order your validator happened to return — and moved without the double-scroll jitter that `focus()` causes when it fights your own `scrollIntoView`.

The bug this page fixes: submit fails, an error summary appears, but focus stays on the (now disabled or re-enabled) submit button at the bottom of the page. A sighted mouse user can scroll up to hunt for the red field; a keyboard user is stranded. Worse, when you *do* focus the field, the viewport lurches twice because the browser's implicit focus-scroll and your explicit scroll disagree about alignment.

This is the foundational technique for [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/); it composes with the [aria-invalid timing](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/) work that flags those fields in the first place.

---

## Precise ordering and the scroll problem

Two independent facts make this harder than "focus the first error":

- **Validation results are not in DOM order.** A schema validator returns an object like `{ email: "...", firstName: "..." }` keyed by declaration order, and a flat error array keyed by field registration order. Neither guarantees that `email` sits above `firstName` on screen. You must resolve each invalid name to its element and sort by `compareDocumentPosition`.
- **`focus()` scrolls implicitly.** The default behavior of `element.focus()` is to bring the element into view using the browser's own alignment. If you then call `scrollIntoView` to apply a sticky-header offset, the page moves twice. `focus({ preventScroll: true })` suppresses the implicit scroll so you own the single, correct scroll.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 44 672 172" role="img" aria-label="Flow from validation errors through DOM ordering, section reveal, focus with preventScroll, to a single manual scroll" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>First-invalid-field focus pipeline</title>
  <desc>Validation error names are sorted into DOM order, the containing section is revealed, focus is applied with preventScroll true, and then a single scrollIntoView with a header offset positions the field.</desc>
  <rect x="14" y="44" width="672" height="172" fill="#f9f5fb"/>
  <rect x="30" y="105" width="120" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="90" y="126" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">errors</text>
  <text x="90" y="143" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">{email, name}</text>
  <rect x="185" y="105" width="120" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="245" y="126" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">sort by</text>
  <text x="245" y="143" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">DOM position</text>
  <rect x="340" y="105" width="120" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="400" y="126" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">reveal</text>
  <text x="400" y="143" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">section</text>
  <rect x="495" y="60" width="175" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="582" y="81" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">focus(preventScroll)</text>
  <text x="582" y="98" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">no implicit scroll</text>
  <rect x="495" y="150" width="175" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="582" y="171" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">scrollIntoView</text>
  <text x="582" y="188" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">one jump, offset</text>
  <path d="M150 130 L185 130" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-firstinvalid)"/>
  <path d="M305 130 L340 130" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-firstinvalid)"/>
  <path d="M460 122 C480 110 485 100 495 92" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-firstinvalid)"/>
  <path d="M582 110 L582 150" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-firstinvalid)"/>
  <defs>
    <marker id="arr-firstinvalid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
</svg>

---

## Core implementation

One focused function: given the set of invalid field names and the form element, resolve them to DOM nodes, sort by document position, reveal any collapsed ancestor, focus without scrolling, then scroll once.

```typescript
interface FocusOptions {
  /** Pixels of sticky header to offset the final scroll by. */
  headerOffset?: number;
  /** Map from field name to a callback that reveals its section. */
  revealers?: Map<string, () => void>;
}

/**
 * Focus the first invalid field in visual (DOM) order.
 * Returns the focused element, or null if none could be resolved.
 */
async function focusFirstInvalid(
  form: HTMLFormElement,
  invalidNames: Iterable<string>,
  { headerOffset = 0, revealers }: FocusOptions = {}
): Promise<HTMLElement | null> {
  // Resolve each name to a focusable element; drop names with no field.
  const candidates: HTMLElement[] = [];
  for (const name of invalidNames) {
    const el = form.elements.namedItem(name);
    // namedItem can return a RadioNodeList for grouped inputs; take item 0.
    const node =
      el instanceof RadioNodeList ? (el[0] as HTMLElement) : (el as HTMLElement | null);
    if (node instanceof HTMLElement) candidates.push(node);
  }
  if (candidates.length === 0) return null;

  // Sort by DOM order. compareDocumentPosition returns a bitmask;
  // FOLLOWING means `b` comes after `a`, so `a` should sort first.
  candidates.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );

  const first = candidates[0];

  // Reveal a collapsed section BEFORE focusing — you cannot focus a node
  // that is display:none or inside a closed <details>.
  const reveal = revealers?.get(fieldName(first));
  if (reveal) {
    reveal();
    // Wait one frame so the newly-shown element has layout box + is focusable.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }

  // preventScroll stops the browser's implicit focus-scroll so it does not
  // fight the manual scrollIntoView below (the double-jump bug).
  first.focus({ preventScroll: true });

  // A single deliberate scroll with a header offset. scrollMarginTop lets
  // scrollIntoView respect the sticky header without manual math.
  first.style.scrollMarginTop = `${headerOffset}px`;
  first.scrollIntoView({ block: "start", behavior: "smooth" });

  return first;
}

/** Recover a field's name whether it is a plain input or grouped control. */
function fieldName(el: HTMLElement): string {
  return (el as HTMLInputElement).name || el.getAttribute("name") || "";
}
```

Wiring it to a submit handler, together with the flagging pass from the [aria-invalid controller](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/):

```typescript
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const result = validate(readValues(form)); // your validator
  if (result.valid) return submit();

  const invalidNames = Object.keys(result.errors);
  await focusFirstInvalid(form, invalidNames, {
    headerOffset: 72, // height of the sticky app header
    revealers: sectionRevealers, // Map<name, () => openAccordion(section)>
  });
});
```

---

## Step-by-step walkthrough

1. **Resolve names to nodes.** `form.elements.namedItem(name)` maps a field name to its element, handling `RadioNodeList` for radio and checkbox groups by taking the first member.
2. **Sort by document position.** `compareDocumentPosition` with the `DOCUMENT_POSITION_FOLLOWING` bit produces a comparator that orders candidates top-to-bottom as they appear on screen, independent of validator output order.
3. **Reveal before focus.** If the first candidate lives in a collapsed section, its `revealer` callback opens it, and a single `requestAnimationFrame` await lets layout settle so the element is actually focusable.
4. **Focus without scrolling.** `focus({ preventScroll: true })` moves the accessibility focus and caret without the browser scrolling — this is the line that kills the double jump.
5. **Scroll once, with offset.** Setting `scrollMarginTop` to the sticky-header height and calling `scrollIntoView({ block: "start" })` produces exactly one smooth scroll that clears the header.

---

"First" is doing a lot of work in that sentence, and it only means what you think when DOM order and reading order agree. A two-column grid laid out with `grid-auto-flow: column` breaks that assumption:

<svg viewBox="0 8 664 254" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A two-column grid whose CSS fills columns before rows, so the fields the reader sees in the order given name, country, family name, post code are in the DOM in the order given name, family name, country, post code. Two fields are invalid, and a DOM query returns family name while the eye reaches country first." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When the first invalid field is not the first one you see</title>
  <desc>On the left, the rendered two-by-two grid: top left is field one, given name, valid; top right is field three, country, invalid; bottom left is field two, family name, invalid; bottom right is field four, post code, valid. On the right, the same four fields in document order: one given name, two family name invalid, three country invalid, four post code. A query for the first element with aria-invalid true returns family name, the field the eye reaches second.</desc>
  <rect x="0" y="8" width="664" height="254" fill="#f9f5fb"/>
  <text x="14" y="24" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">What the sighted reader scans</text>
  <rect x="14" y="34" width="146" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26" y="54" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">1 · Given name</text>
  <text x="26" y="71" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <rect x="168" y="34" width="146" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="180" y="54" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">3 · Country</text>
  <text x="180" y="71" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid — eye lands here</text>
  <rect x="14" y="94" width="146" height="52" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26" y="114" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">2 · Family name</text>
  <text x="26" y="131" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid</text>
  <rect x="168" y="94" width="146" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="180" y="114" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">4 · Post code</text>
  <text x="180" y="131" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">grid-auto-flow: column fills top-to-bottom, then across.</text>
  <text x="360" y="24" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">What the DOM actually contains</text>
  <rect x="360" y="34" width="290" height="28" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="372" y="52" font-size="10" fill="#1e1a24" font-family="inherit">1 · Given name</text>
  <rect x="360" y="66" width="290" height="28" rx="6" fill="#e2d6ec" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="372" y="84" font-size="10" fill="#a63d6f" font-family="inherit">2 · Family name — the query returns this one</text>
  <rect x="360" y="98" width="290" height="28" rx="6" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="372" y="116" font-size="10" fill="#a63d6f" font-family="inherit">3 · Country</text>
  <rect x="360" y="130" width="290" height="28" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="372" y="148" font-size="10" fill="#1e1a24" font-family="inherit">4 · Post code</text>
  <text x="360" y="168" font-size="10" fill="#6b5f75" font-family="inherit">querySelector walks this list, not the rendered one.</text>
  <text x="14" y="200" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Which order is the right one?</text>
  <text x="14" y="218" font-size="10" fill="#6b5f75" font-family="inherit">DOM order — because it is also tab order and screen-reader order, so focus lands where the keyboard would go next.</text>
  <text x="14" y="234" font-size="10" fill="#6b5f75" font-family="inherit">If that reads as "wrong" to a sighted reader, the layout is the bug: reorder the markup, do not sort by bounding box.</text>
  <text x="14" y="250" font-size="10" fill="#6b5f75" font-family="inherit">Sorting by getBoundingClientRect also breaks under RTL, wrapped grids and off-screen steps.</text>
</svg>

## Failure modes and edge cases

### The double-scroll jump

Omitting `preventScroll` is the single most common cause of the viewport lurching twice. The browser scrolls on `focus()`, then your `scrollIntoView` scrolls again.

```typescript
// WRONG — browser scrolls, then you scroll again
first.focus();
first.scrollIntoView();

// RIGHT — suppress the implicit scroll, own the single one
first.focus({ preventScroll: true });
first.scrollIntoView({ block: "start" });
```

### Focusing a hidden field silently fails

`display:none` and closed `<details>` elements are not focusable — `focus()` is a no-op and focus stays where it was. Always run the `revealer` and await a frame before focusing. If a field is hidden by design (a conditional branch that is not applicable), exclude it from `invalidNames` upstream rather than trying to focus it.

### RadioNodeList resolves to a list, not an element

For radio and checkbox groups, `namedItem` returns a `RadioNodeList`. Calling `.focus()` on the list throws. Take `list[0]`, or better, the currently checked member if there is one. Grouped inputs also benefit from [roving tabindex](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/roving-tabindex-for-option-groups/) so the right member receives focus.

### Smooth scroll never settles under reduced-motion

`behavior: "smooth"` is ignored — correctly — when the user has `prefers-reduced-motion: reduce`. Do not depend on a smooth-scroll completion callback; there is no reliable one across browsers anyway. If you must act after the scroll, key off `scrollend` where supported and fall back to a timeout.

### The field scrolls under a sticky header

Without `scrollMarginTop`, `scrollIntoView({ block: "start" })` aligns the field to the very top of the viewport, tucked behind a fixed header. Set `scrollMarginTop` to the header height so the field lands just below it.

---

One last piece of geometry: focus does not care about your sticky header, so the field can be focused and still be underneath it.

<svg viewBox="0 8 662 244" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two scroll timelines. Calling focus with default options makes the browser jump the field into view instantly and a following smooth scrollIntoView then animates from that new position, so the reader sees two movements. Calling focus with preventScroll first and scrolling once afterwards produces a single settled movement." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The double-scroll jump, and the single scroll that replaces it</title>
  <desc>Top timeline: focus is called with default options, the browser instantly scrolls the field into view at the very top of the viewport, then the explicit smooth scrollIntoView animates away from that position, and the reader perceives two separate jumps. Bottom timeline: focus is called with preventScroll set to true so no scrolling happens, then a single smooth scrollIntoView runs, and scroll-margin-top on the field keeps it clear of the sticky header when it settles.</desc>
  <rect x="0" y="8" width="662" height="244" fill="#f9f5fb"/>
  <text x="14" y="24" font-size="12" font-weight="700" fill="#a63d6f" font-family="inherit">field.focus() then scrollIntoView — two movements</text>
  <rect x="14" y="34" width="150" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">focus()</text>
  <text x="89" y="73" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">default options</text>
  <path d="M164,62 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="34" width="150" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="261" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">jump 1 — instant</text>
  <text x="261" y="73" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">browser scrolls for you</text>
  <path d="M336,62 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="34" width="150" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="433" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">jump 2 — animated</text>
  <text x="433" y="73" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">your smooth scroll</text>
  <path d="M508,62 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="34" width="118" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="589" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">lurch</text>
  <text x="589" y="73" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nausea, lost place</text>
  <text x="14" y="124" font-size="12" font-weight="700" fill="#2d6342" font-family="inherit">focus({ preventScroll: true }) then one scroll — one movement</text>
  <rect x="14" y="134" width="150" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="156" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">focus()</text>
  <text x="89" y="173" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">preventScroll: true</text>
  <path d="M164,162 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="134" width="150" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="261" y="156" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">nothing moves</text>
  <text x="261" y="173" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus is set silently</text>
  <path d="M336,162 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="134" width="150" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="433" y="156" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">one smooth scroll</text>
  <text x="433" y="173" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">or instant if reduced</text>
  <path d="M508,162 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="134" width="118" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="589" y="156" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">settles</text>
  <text x="589" y="173" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">clear of the header</text>
  <text x="14" y="216" font-size="10" fill="#6b5f75" font-family="inherit">"Clear of the header" is not automatic: the browser scrolls the field flush to the viewport edge, where a sticky header covers it.</text>
  <text x="14" y="232" font-size="10" fill="#6b5f75" font-family="inherit">Put scroll-margin-top: var(--header-height) on the field itself and the settle position accounts for the header with no scroll maths.</text>
  <text x="14" y="248" font-size="10" fill="#6b5f75" font-family="inherit">Honour prefers-reduced-motion by dropping behavior: "smooth" — never by dropping the scroll.</text>
</svg>

## Verification checklist

- [ ] Focus lands on the first invalid field in DOM order, not validator-return order
- [ ] The viewport scrolls exactly once (no double jump) thanks to preventScroll: true
- [ ] A field inside a collapsed accordion or disclosure element is revealed before focus
- [ ] Radio and checkbox groups focus a real element, not the RadioNodeList
- [ ] The focused field clears a sticky header via scrollMarginTop
- [ ] Reduced-motion users get an instant, not animated, scroll
- [ ] The focused field is also marked aria-invalid="true" and described by its error
- [ ] Keyboard-only submit (Enter) triggers the same focus move as clicking submit
- [ ] Tested with NVDA + Firefox and VoiceOver + Safari: focus and error message announce together

---

## Frequently Asked Questions

<details>
<summary><strong>Why does the page jump twice when I focus the first invalid field?</strong></summary>

Calling `focus()` scrolls the element into view with the browser's default alignment, then your own `scrollIntoView` scrolls it again to a different position. Pass `{ preventScroll: true }` to `focus()` so the browser does not scroll, then run a single `scrollIntoView` with the offset you actually want. Setting `scrollMarginTop` to your header height makes that one scroll clear a sticky header cleanly.

</details>

<details>
<summary><strong>How do I focus a field inside a collapsed accordion section?</strong></summary>

You cannot focus an element that is `display:none` or inside a closed `<details>` element. Expand the containing section first, wait one animation frame for layout, then focus. Track a map from field name to the section that must be opened, and open it before calling `focus`. The implementation runs the section's `revealer` and awaits `requestAnimationFrame` before the focus call for exactly this reason.

</details>

<details>
<summary><strong>Should I sort invalid fields by DOM order or by validation order?</strong></summary>

Always DOM order. A validation library returns errors in object-key or schema order, which rarely matches visual top-to-bottom layout. Focusing the first error in DOM order matches user expectation and reading direction. Sort candidates by `compareDocumentPosition` before choosing one — the `DOCUMENT_POSITION_FOLLOWING` bit gives you a clean top-to-bottom comparator.

</details>

---

## Related

- [Focus Management in Multi-Step Form Wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/)
- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
- [aria-invalid Timing and Screen Reader Announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/)

← [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
