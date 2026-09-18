---
layout: page.njk
title: "Virtualizing Long Fieldsets Without Losing State"
description: "Render a set rather than a range: the visible band plus the focused row, every errored row and the summary link target — so virtualisation does not break focus, announcements or the payload."
slug: virtualizing-long-fieldsets-without-losing-state
type: howto
breadcrumb: "Virtualizing Long Fieldsets Without Losing State"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Virtualizing Long Fieldsets Without Losing State"
  parent: "Performance and Scale for Large Forms"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Virtualizing Long Fieldsets Without Losing State",
      "description": "Render a set rather than a range: the visible band plus the focused row, every errored row and the summary link target — so virtualisation does not break focus, announcements or the payload.",
      "datePublished": "2026-08-05",
      "dateModified": "2026-08-05",
      "author": {
        "@type": "Organization",
        "name": "client-side-form.com"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Performance and Scale for Large Forms",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Virtualizing Long Fieldsets Without Losing State",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/virtualizing-long-fieldsets-without-losing-state/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Virtualise a long fieldset without losing form state",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Move form values out of the row components first"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Render a set of indices, not a contiguous range"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Pin the focused row, errored rows and the summary target"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Position rows absolutely with a full-height spacer"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Give every row a stable key"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Expose the true row count to assistive technology"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Build the submit payload from the store, not the DOM"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I use FormData with a virtualised form?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not for the virtualised rows — FormData reads the DOM, and unmounted rows are not in it. Build the row payload from the external store, and use FormData only for the surrounding fields that are always rendered. This is a straightforward consequence of virtualising, but it catches teams who added virtualisation to an uncontrolled form and found submissions silently shrinking."
          }
        },
        {
          "@type": "Question",
          "name": "How do I keep native required validation working?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You cannot, for off-screen rows, because the browser only validates elements in the document. Once a form is virtualised, all row-level validation has to run over the store rather than over the DOM. That is usually already true for anything with a schema; it is a real loss only for forms that were relying entirely on native constraint attributes."
          }
        },
        {
          "@type": "Question",
          "name": "Is content-visibility a real alternative?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For most large forms, yes, and it should be tried first. content-visibility: auto keeps every field in the document — so submit, find-in-page and native validation all keep working — while skipping the rendering work for off-screen content. It is one CSS declaration plus a contain-intrinsic-size hint, against a state migration and four accessibility problems for true virtualisation."
          }
        }
      ]
    }
  ]
}
</script>

# Virtualizing Long Fieldsets Without Losing State

The exact problem: a 400-row form is virtualised for speed, the reader scrolls past a row they filled in, and the value is gone — because the row was unmounted and the value lived in the row.

## Context and Prerequisites

The decision to virtualise at all should follow the measurement in [performance and scale for large forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/), and the cheaper option — `content-visibility` — should be ruled out first, since it keeps every field in the document. This page assumes virtualisation is genuinely needed: hundreds of rows, and layout dominating the profile.

The prerequisite is absolute: **form state must already live outside the components**. A virtualised form whose values live in row state is a form that discards data by design.

## Core Pattern

```typescript
interface VirtualFormOptions {
  readonly total: number;
  readonly rowHeight: number;
  readonly overscan: number;
}

/**
 * The render window is a UNION, not a range. Three indices must stay mounted
 * regardless of scroll position, and each corresponds to a real bug when it is
 * allowed to unmount.
 */
export function renderWindow(
  scrollTop: number, viewportH: number, o: VirtualFormOptions,
  pinned: { focused: number | null; errored: readonly number[]; linkedFromSummary: number | null },
): Set<number> {
  const first = Math.max(0, Math.floor(scrollTop / o.rowHeight) - o.overscan);
  const last = Math.min(o.total - 1,
    Math.ceil((scrollTop + viewportH) / o.rowHeight) + o.overscan);

  const set = new Set<number>();
  for (let i = first; i <= last; i++) set.add(i);

  // 1. The focused row: unmounting it drops focus to <body>, and the next Tab
  //    restarts from the top of the page.
  if (pinned.focused !== null) set.add(pinned.focused);
  // 2. Rows carrying errors: an error on an unmounted row cannot be announced,
  //    and its summary link resolves to nothing.
  for (const i of pinned.errored) set.add(i);
  // 3. The row a summary link just targeted, until focus lands in it.
  if (pinned.linkedFromSummary !== null) set.add(pinned.linkedFromSummary);
  return set;
}
```

Rendering a set rather than a range means the pinned rows are absolutely positioned at their true offsets and simply exist outside the visible band. They cost three DOM subtrees, which is the price of not breaking focus and announcements.

<svg viewBox="0 8 690 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A scroll viewport showing the visible band of rows plus three pinned rows kept mounted outside it: the focused row, a row carrying an error, and the row a summary link just targeted." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The render set is the visible band plus three pinned rows</title>
  <desc>The visible band covers the rows currently in the viewport plus an overscan margin above and below. Three additional rows are kept mounted wherever they are in the list. The focused row, because unmounting the element that holds focus drops focus to the document body and restarts tab order from the top of the page. Any row carrying a validation error, because an error on an unmounted row cannot be announced and its summary link resolves to nothing. And the row a summary link has just targeted, until focus has actually landed inside it.</desc>
  <rect x="0" y="8" width="690" height="218" fill="#f9f5fb"/>
  <rect x="14" y="26" width="200" height="180" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="114" y="46" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the list, 400 rows</text>
  <rect x="28" y="58" width="172" height="18" rx="4" fill="#f9f5fb" stroke="#7b4f8a" stroke-width="1.2"/>
  <text x="114" y="71" text-anchor="middle" font-size="9" fill="#7b4f8a" font-family="inherit">row 12 — focused</text>
  <rect x="28" y="84" width="172" height="46" rx="4" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="114" y="104" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">rows 140–158</text>
  <text x="114" y="120" text-anchor="middle" font-size="9" fill="#1e1a24" font-family="inherit">the visible band</text>
  <rect x="28" y="138" width="172" height="18" rx="4" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1.2"/>
  <text x="114" y="151" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">row 201 — has an error</text>
  <rect x="28" y="164" width="172" height="18" rx="4" fill="#f9f5fb" stroke="#2d6342" stroke-width="1.2"/>
  <text x="114" y="177" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">row 388 — summary target</text>
  <text x="114" y="198" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">everything else is unmounted</text>
  <text x="240" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why each pinned row is pinned</text>
  <text x="240" y="76" font-size="10" fill="#7b4f8a" font-family="inherit">focused — unmounting drops focus to &lt;body&gt;</text>
  <text x="240" y="94" font-size="9.5" fill="#6b5f75" font-family="inherit">and the next Tab restarts from the page top</text>
  <text x="240" y="122" font-size="10" fill="#a63d6f" font-family="inherit">errored — an unmounted error cannot be announced</text>
  <text x="240" y="140" font-size="9.5" fill="#6b5f75" font-family="inherit">and its summary link resolves to nothing</text>
  <text x="240" y="168" font-size="10" fill="#2d6342" font-family="inherit">summary target — kept until focus lands in it</text>
  <text x="240" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">otherwise the jump arrives before the row exists</text>
  <text x="240" y="214" font-size="9.5" fill="#6b5f75" font-family="inherit">Cost: three extra subtrees. Benefit: focus and announcements keep working.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The browser's own find-in-page no longer reaches off-screen rows, so the form has to provide a filter and say that it exists. FormData no longer sees them, so the payload comes from the store. Native constraint validation cannot reach them, so all validation runs over the store. Tab order no longer includes them, which is correct — they are not in the document — but it means the error summary becomes the only route to a failing row that is out of view." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What virtualising takes away, and what replaces it</title>
  <desc>The browser's own find-in-page no longer reaches off-screen rows, so the form has to provide a filter and say that it exists. FormData no longer sees them, so the payload comes from the store. Native constraint validation cannot reach them, so all validation runs over the store. Tab order no longer includes them, which is correct — they are not in the document — but it means the error summary becomes the only route to a failing row that is out of view.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What is lost</text>
  <text x="280" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What replaces it</text>
  <text x="24" y="66" font-size="10" fill="#a63d6f" font-family="inherit">find-in-page</text>
  <text x="280" y="66" font-size="10" fill="#2d6342" font-family="inherit">an in-form filter, and a note that it exists</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#a63d6f" font-family="inherit">FormData sees the rows</text>
  <text x="280" y="100" font-size="10" fill="#2d6342" font-family="inherit">the payload is built from the store</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#a63d6f" font-family="inherit">native required validation</text>
  <text x="280" y="134" font-size="10" fill="#2d6342" font-family="inherit">all validation runs over the store</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">rows in tab order</text>
  <text x="280" y="168" font-size="10" fill="#2d6342" font-family="inherit">the error summary becomes the route to them</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Each row is a real capability, not a technicality — which is why content-visibility, which keeps all four, is worth trying first.</text>
</svg>

## Step-by-Step Walkthrough

1. **Move values out of the rows first.** If this is not already true, stop — virtualising is not the next step.

2. **Render a set, not a range.** The pinned indices are what keep the form usable.

3. **Position rows absolutely at index × height.** A scroll container with a spacer of the full height keeps the scrollbar honest.

4. **Give every row a stable key.** Recycling a DOM node between rows without a key change moves one row's ARIA state onto another.

5. **Announce the size.** `aria-rowcount` and `aria-rowindex` on the rows tell a screen reader that there are 400 rows and this is number 141, which the DOM alone no longer says.

6. **Do not virtualise the error summary.** It lists only failing rows, and it is the reader's map back into the list.

## Failure Modes and Edge Cases

### 1. Submit sees only the rendered rows

`FormData` reads the DOM, so a virtualised form cannot use it for the rows. Build the payload from the external store and use `FormData` only for the non-virtualised parts.

### 2. Native required validation stops working

Off-screen fields are not in the document, so the browser cannot validate them. All row validation has to be your own, run over the store.

### 3. Find-in-page misses rows

The reader's own search no longer finds unmounted content. Provide an in-form filter, and say that it exists — otherwise readers conclude the data is missing.

### 4. Variable row heights

A row whose height depends on whether it shows an error changes the scroll mapping the moment validation runs. Measure and cache heights, or reserve the message space in every row.

### 5. Scroll anchoring fights the window

Browsers try to preserve the reader's scroll position when content above changes. With absolutely positioned rows this can produce a fight; `overflow-anchor: none` on the container settles it.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Focus a field in row twelve and type something into it. Scroll the container two thousand pixels so the row is far outside the window. Check that document.activeElement is still that input and that the value is still in the store. Scroll back and check the value is rendered again. Four steps, and they exercise the pinned-row union, the external state and the re-render path in one pass." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The scroll test that catches everything</title>
  <desc>Focus a field in row twelve and type something into it. Scroll the container two thousand pixels so the row is far outside the window. Check that document.activeElement is still that input and that the value is still in the store. Scroll back and check the value is rendered again. Four steps, and they exercise the pinned-row union, the external state and the re-render path in one pass.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">The scroll test that catches everything</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">focus and type</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">row 12, a real value</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">in a real field</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">scroll 2000px</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the row leaves the</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">render window</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">assert</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">activeElement is still it,</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">value still in the store</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">scroll back</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the value renders again,</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">unchanged</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">If any of the four fails, the render set is a range rather than a union — which is the bug this whole page exists for.</text>
</svg>

## Verification Checklist

- [ ] Values survive scrolling a filled row out of view and back
- [ ] Focus in a row survives a 2000px scroll
- [ ] A row with an error stays mounted wherever it is
- [ ] A summary link scrolls to and focuses a row that was unmounted
- [ ] The submit payload includes rows that were never rendered
- [ ] `aria-rowcount` reports the true total
- [ ] Row heights do not shift when a message appears
- [ ] An in-form filter replaces find-in-page, and is discoverable

## Common Pitfalls

- **Virtualising before moving state out.** A virtualised form whose values live in the row components discards data by design, and the loss is silent — the reader only finds out at submit.
- **Rendering a range instead of a set.** The focused row, the errored rows and the summary link target all have to stay mounted wherever they are, and a contiguous range cannot express that.
- **Recycling nodes without changing the key.** A reused DOM node carries the previous row’s ARIA state and its `aria-invalid`, so the error appears to move to a different row.
- **Variable row heights.** A row that grows when its message appears changes the scroll mapping at exactly the moment the reader is trying to reach it. Reserve the message space in every row, or measure and cache.
- **Reaching for virtualisation first.** `content-visibility: auto` keeps every field in the document — so submit, find-in-page and native validation all keep working — for one CSS declaration plus a size hint.

---

**Related**

- [Performance and Scale for Large Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/) — deciding whether to virtualise at all
- [Rendering 100-Plus Field Forms Without Jank](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/rendering-100-plus-field-forms-without-jank/) — the cheaper options first
- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) — the map back into a virtualised list

← [Performance and Scale for Large Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/)

## Frequently Asked Questions

<details>
<summary><strong>Can I use FormData with a virtualised form?</strong></summary>

Not for the virtualised rows — FormData reads the DOM, and unmounted rows are not in it. Build the row payload from the external store, and use FormData only for the surrounding fields that are always rendered. This is a straightforward consequence of virtualising, but it catches teams who added virtualisation to an uncontrolled form and found submissions silently shrinking.

</details>

<details>
<summary><strong>How do I keep native required validation working?</strong></summary>

You cannot, for off-screen rows, because the browser only validates elements in the document. Once a form is virtualised, all row-level validation has to run over the store rather than over the DOM. That is usually already true for anything with a schema; it is a real loss only for forms that were relying entirely on native constraint attributes.

</details>

<details>
<summary><strong>Is content-visibility a real alternative?</strong></summary>

For most large forms, yes, and it should be tried first. content-visibility: auto keeps every field in the document — so submit, find-in-page and native validation all keep working — while skipping the rendering work for off-screen content. It is one CSS declaration plus a contain-intrinsic-size hint, against a state migration and four accessibility problems for true virtualisation.

</details>

