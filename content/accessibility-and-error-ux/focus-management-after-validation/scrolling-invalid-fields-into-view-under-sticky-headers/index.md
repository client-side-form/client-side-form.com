---
layout: page.njk
title: "Scrolling Invalid Fields Into View Under Sticky Headers"
description: "When focus moves to an invalid field, a sticky header or footer can hide it and its label. Fix it with scroll-margin and scroll-padding, bring the label and error into view with the field, respect reduced motion, and handle the mobile keyboard."
slug: scrolling-invalid-fields-into-view-under-sticky-headers
type: howto
breadcrumb: "Sticky Header Scrolling"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Scrolling Invalid Fields Into View Under Sticky Headers"
  parent: "Focus Management After Validation"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Scrolling Invalid Fields Into View Under Sticky Headers",
      "description": "When focus moves to an invalid field, a sticky header or footer can hide it and its label. Fix it with scroll-margin and scroll-padding, bring the label and error into view with the field, respect reduced motion, and handle the mobile keyboard.",
      "datePublished": "2026-09-18",
      "dateModified": "2026-09-18",
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
          "item": "https://client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Accessibility & Error UX for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Focus Management After Validation",
          "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Scrolling Invalid Fields Into View Under Sticky Headers",
          "item": "https://client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/scrolling-invalid-fields-into-view-under-sticky-headers/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Scroll focused invalid fields fully into view under sticky UI",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Set scroll-padding-top on html to the sticky header's height plus a gap"
        },
        {
          "@type": "HowToStep",
          "name": "Measure the header instead of hard-coding it"
        },
        {
          "@type": "HowToStep",
          "name": "Scroll the field wrapper, not the input"
        },
        {
          "@type": "HowToStep",
          "name": "Then focus with preventScroll: true"
        },
        {
          "@type": "HowToStep",
          "name": "Use the helper for summary links and first-invalid focus"
        },
        {
          "@type": "HowToStep",
          "name": "Respect reduced motion"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does scroll-padding work with element.focus()?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — browsers use the scroll container's scroll padding when scrolling a focused element into view. It also applies to fragment navigation and scrollIntoView. Test in all target browsers, since older versions handled focus scrolling differently."
          }
        },
        {
          "@type": "Question",
          "name": "Why not just scroll to the top of the form on submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The error summary may be at the top, and scrolling there is right when you focus the summary. When you focus a specific field, the field's context must be visible; the top of the form is not where the problem is."
          }
        },
        {
          "@type": "Question",
          "name": "Is Focus Not Obscured only about sticky headers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No — any author-created content that can cover the focused element counts: cookie banners, chat widgets, toasts. Scroll padding handles fixed edges; for floating widgets, make them dismissible or move them away from focused content."
          }
        }
      ]
    }
  ]
}
</script>

# Scrolling Invalid Fields Into View Under Sticky Headers

Moving focus to the first invalid field is correct, and on many sites it lands the field *behind* the sticky header: the input is technically in the viewport, so the browser does not scroll further, but its label and error message are covered — sighted keyboard users see a focus ring with no context, and WCAG 2.2's "Focus Not Obscured" criterion fails.

The fix is mostly declarative CSS — `scroll-padding-top` on the scroll container and `scroll-margin` on fields — plus a little script to scroll the *whole field* (label, input, error) into view rather than just the input. This page, part of [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/), applies both and covers the mobile keyboard, which obscures from the bottom.

---

## Context and prerequisites

What the browser does when you call `input.focus()`: if the element is not fully in view, it scrolls the minimum amount to show *the element* — not its label above it, not its error below it, and with no knowledge of fixed or sticky overlays. With a 64px sticky header, an input scrolled to the top edge sits under the header.

Two CSS properties change the scroll target:

- **`scroll-padding-top`** on the scroll container (usually `html`) shrinks the "visible area" used for scroll calculations — so every scroll-into-view, anchor jump and focus scroll leaves room for the header.
- **`scroll-margin-top`** on an element adds extra space above it when it is scrolled into view — useful to include the label above an input.

WCAG 2.2 Success Criterion 2.4.11 (Focus Not Obscured, Minimum, AA) requires that a focused element is not *entirely* hidden by author-created content; 2.4.12 (Enhanced, AAA) requires that no part is hidden. Showing the label and error as well goes beyond both and is what users actually need.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards contrasting the default focus scroll, which shows only the input and may place it under a sticky header, with scroll padding, which clears the header, and field-level scrolling, which shows label, input and error together." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the browser scrolls, and what users need to see</title>
  <desc>With default focus scrolling, the browser scrolls just enough to show the input, which can end up under a 64 pixel sticky header with its label hidden. With scroll-padding-top set to the header height, the input stops below the header but the label above it may still be cut off. With the whole field wrapper scrolled into view and scroll-margin for breathing room, the label, input and error message are all visible below the header.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Default focus scroll</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Input only.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Can sit under the header.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label hidden.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">+ scroll-padding-top</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Input clears the header.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label may still be cut.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">+ field wrapper scroll</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label, input, error all visible.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Then focus without scrolling.</text>
</svg>

---

## The core pattern: CSS scroll padding plus a field-aware focus helper

```css
:root {
  --header-h: 64px;        /* keep in sync with the sticky header's real height */
  --footer-h: 0px;         /* a sticky action bar at the bottom, if any */
}
html {
  /* Every scroll-into-view, anchor link and focus scroll respects the header. */
  scroll-padding-top: calc(var(--header-h) + 16px);
  scroll-padding-bottom: calc(var(--footer-h) + 16px);
}
.field {
  /* Breathing room so the label is not flush against the header. */
  scroll-margin-top: 8px;
}
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

```typescript
/**
 * Bring the whole field (label + input + error) into view, then focus the
 * input without a second scroll. Works for error-summary links and for
 * "focus first invalid field" after submit.
 */
export function focusField(input: HTMLElement) {
  const field = input.closest<HTMLElement>(".field, fieldset") ?? input;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 'start' aligns the wrapper's top (the label) with the padded viewport top.
  field.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });

  // preventScroll: we already scrolled the WRAPPER; letting focus scroll again
  // would re-align to the input and undo the label's visibility.
  input.focus({ preventScroll: true });
}

// Error summary links: intercept to use the field-aware scroll.
export function wireSummaryLinks(summary: HTMLElement) {
  summary.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest("a[href^='#']");
    if (!a) return;
    const target = document.getElementById(a.getAttribute("href")!.slice(1));
    if (!target) return;
    e.preventDefault();
    focusField(target);
    history.replaceState(null, "", a.getAttribute("href")!);   // keep the fragment for reloads
  });
}

// Keep --header-h accurate when the header's height changes (wrapping nav, banners).
export function syncHeaderHeight(header: HTMLElement) {
  const ro = new ResizeObserver(([entry]) =>
    document.documentElement.style.setProperty("--header-h", `${Math.ceil(entry.borderBoxSize[0].blockSize)}px`));
  ro.observe(header);
  return () => ro.disconnect();
}
```

---

## Step-by-step walkthrough

1. **Set `scroll-padding-top` on `html` to the sticky header's height plus a gap.** This single rule fixes focus scrolling, anchor links and `scrollIntoView` site-wide.
2. **Measure the header instead of hard-coding it.** A `ResizeObserver` keeps the CSS variable correct when the header wraps on small screens or a banner is dismissed.
3. **Scroll the field wrapper, not the input.** `scrollIntoView({ block: "start" })` on the wrapper puts the label at the top of the visible area.
4. **Then focus with `preventScroll: true`.** Otherwise the focus call scrolls again to the input and can hide the label.
5. **Use the helper for summary links and first-invalid focus.** Both paths — see [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/) and [building an accessible error summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) — should land identically.
6. **Respect reduced motion.** Smooth scrolling only when the user has not asked for reduced motion.

### Why this is also a focus-visibility issue for everyday typing

The same problem appears without any errors: a keyboard user tabbing down a long form moves focus into fields near the bottom of the viewport, and a sticky footer — a "Save" bar, a cookie banner — covers them. `scroll-padding-bottom` handles the tabbing case the same way `scroll-padding-top` handles the header, because browsers use scroll padding when scrolling focused elements into view. Fixing the error path with CSS therefore fixes ordinary keyboard navigation too, which is exactly what WCAG's Focus Not Obscured criteria are about.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of an error summary link click handled by the field-aware focus helper, from preventing the default jump to scrolling the wrapper and focusing the input without a second scroll." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A summary link click, step by step</title>
  <desc>The user activates the summary link for the postcode error. The handler prevents the default fragment jump. It finds the postcode field wrapper and scrolls it into view aligned to the start, and scroll padding keeps it below the 64 pixel sticky header. It then focuses the postcode input with preventScroll so the view does not move again. The label, input and error message are all visible, and the fragment is written to the URL with replaceState.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="413.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Click &quot;Enter a real postcode&quot;</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">preventDefault() on the link.</text>
  <text x="457.7" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The default jump would align to the input.</text>
  <path d="M220.8,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.8,89.0 220.8,96.0 224.8,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="413.7" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Scroll the .field wrapper</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">block: start; smooth unless reduced motion.</text>
  <text x="457.7" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">scroll-padding-top keeps it below the header.</text>
  <path d="M220.8,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.8,174.0 220.8,181.0 224.8,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="413.7" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">focus({ preventScroll: true })</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No second scroll.</text>
  <text x="457.7" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label, input and error visible together.</text>
  <path d="M220.8,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.8,259.0 220.8,266.0 224.8,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="413.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">replaceState(#postcode)</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Fragment kept for reloads.</text>
  <text x="457.7" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No extra history entry.</text>
</svg>

---

## Failure modes and edge cases

### 1. Scroll containers other than the page

If the form scrolls inside a panel (`overflow: auto`), put `scroll-padding` on that container, not on `html`, and make sure its own sticky elements are accounted for.

### 2. `position: fixed` headers

Fixed headers overlay content just like sticky ones and need the same padding. The difference is only that fixed headers also need body padding to avoid covering content at the top of the page.

### 3. The mobile on-screen keyboard

When a focused input opens the keyboard, the visual viewport shrinks from the bottom. Browsers usually scroll the input above the keyboard, but sticky footers can still overlap. Use the `visualViewport` API (`resize` event) to hide or move sticky footers while the keyboard is open, or avoid sticky footers in long forms.

### 4. Smooth scroll and focus timing

With smooth scrolling, the field arrives in view over a few hundred milliseconds. Focusing immediately with `preventScroll` is fine — focus does not wait for the animation — but screen magnifier users may prefer instant scrolling; honour `prefers-reduced-motion`.

### 5. Collapsed sections

If the invalid field sits inside a closed `<details>` or accordion, open it before scrolling, or `scrollIntoView` targets a hidden element and nothing visible happens.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of overlapping UI elements that can hide focused fields and the CSS or script fix for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which property fixes which overlap</title>
  <desc>A sticky or fixed header at the top is fixed with scroll-padding-top on the scroll container. A sticky footer or action bar is fixed with scroll-padding-bottom. A label hidden above an input that was scrolled to the top is fixed by scrolling the field wrapper and focusing with preventScroll. The mobile on-screen keyboard is handled with the visualViewport API to hide sticky footers. A form scrolling inside a panel needs scroll-padding on that panel rather than on html.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Overlap</text>
  <text x="281.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Fix</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">sticky/fixed header</text>
  <text x="281.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">scroll-padding-top on the scroll container</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">sticky footer / action bar</text>
  <text x="281.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">scroll-padding-bottom</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">label above input cut off</text>
  <text x="281.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">scroll wrapper, then focus({ preventScroll })</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">mobile keyboard</text>
  <text x="281.4" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">visualViewport: hide sticky footers</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">form in a scrolling panel</text>
  <text x="281.4" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">scroll-padding on the panel</text>
</svg>

---

## Verification checklist

- [ ] Focusing the first invalid field shows its label, input and error below the sticky header.
- [ ] Error summary links land the same way.
- [ ] Tabbing through a long form never hides the focused field under sticky UI.
- [ ] The header height variable updates when the header resizes.
- [ ] Smooth scrolling is disabled under `prefers-reduced-motion: reduce`.
- [ ] Forms inside scrolling panels use padding on the panel.
- [ ] Mobile keyboard does not cover focused fields or their errors.
- [ ] Fields in collapsed sections are revealed before scrolling.

---

## Frequently Asked Questions

<details>
<summary><strong>Does scroll-padding work with element.focus()?</strong></summary>

Yes — browsers use the scroll container's scroll padding when scrolling a focused element into view. It also applies to fragment navigation and `scrollIntoView`. Test in all target browsers, since older versions handled focus scrolling differently.

</details>

<details>
<summary><strong>Why not just scroll to the top of the form on submit?</strong></summary>

The error summary may be at the top, and scrolling there is right when you focus the summary. When you focus a specific field, the field's context must be visible; the top of the form is not where the problem is.

</details>

<details>
<summary><strong>Is Focus Not Obscured only about sticky headers?</strong></summary>

No — any author-created content that can cover the focused element counts: cookie banners, chat widgets, toasts. Scroll padding handles fixed edges; for floating widgets, make them dismissible or move them away from focused content.

</details>

---

## Related

- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
- [Focusing Dynamically Added Fields](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focusing-dynamically-added-fields/)
- [Inline Errors and an Error Summary: Using Both](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/inline-errors-and-summary-together/)

← [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)
