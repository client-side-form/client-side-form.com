---
layout: page.njk
title: "Error Styling That Does Not Rely on Colour"
description: "Make invalid fields recognisable without red: text prefixes, icons with text alternatives, border weight and pattern changes, contrast requirements for error text and borders, forced-colors (Windows High Contrast) support, and dark-mode error palettes."
slug: error-styling-that-does-not-rely-on-colour
type: howto
breadcrumb: "Beyond Colour"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Error Styling That Does Not Rely on Colour"
  parent: "Error Summary and Messaging"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Error Styling That Does Not Rely on Colour",
      "description": "Make invalid fields recognisable without red: text prefixes, icons with text alternatives, border weight and pattern changes, contrast requirements for error text and borders, forced-colors (Windows High Contrast) support, and dark-mode error palettes.",
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
          "name": "Error Summary and Messaging",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Error Styling That Does Not Rely on Colour",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/error-styling-that-does-not-rely-on-colour/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Style form errors so they work without colour",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Always pair colour with text"
        },
        {
          "@type": "HowToStep",
          "name": "Change shape as well as colour"
        },
        {
          "@type": "HowToStep",
          "name": "Add an icon, decoratively"
        },
        {
          "@type": "HowToStep",
          "name": "Check contrast on the actual backgrounds"
        },
        {
          "@type": "HowToStep",
          "name": "Support forced colors"
        },
        {
          "@type": "HowToStep",
          "name": "Keep success states subtle"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is a red border acceptable if there is also a message?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. The requirement is that colour is not the only means. With a message present, the border is a helpful additional signal; making it thicker than the default border adds a non-colour cue for scanning."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test forced-colors mode without Windows?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Chromium DevTools can emulate forced-colors: active in the Rendering panel. It is a good first check; test on Windows with a real High Contrast theme before release."
          }
        },
        {
          "@type": "Question",
          "name": "Should valid fields turn green?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually not. Green success styling adds colour-only information and visual noise. If positive feedback helps (for example, a username is available), use text, and keep it calm."
          }
        }
      ]
    }
  ]
}
</script>

# Error Styling That Does Not Rely on Colour

A red border is the most common way forms mark invalid fields, and for roughly one in twelve men with a colour vision deficiency, anyone in bright sunlight, and everyone using Windows High Contrast mode, it is often the only signal — and it is invisible: the border looks the same as a valid field's, and the user cannot tell which of ten fields is wrong.

WCAG's "Use of Color" criterion (1.4.1) requires that colour is not the only visual means of conveying information, and "Non-text Contrast" (1.4.11) requires that visual indicators of state have sufficient contrast. This page, part of [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/), builds error styles that work with colour, without colour, in forced-colors mode and in dark mode.

---

## Context and prerequisites

Signals that do not depend on colour:

- **Text** — the error message itself, ideally starting with a visible or visually hidden "Error:" prefix.
- **Icons** — a warning or cross icon next to the message, with the message text as its accessible counterpart (the icon itself is decorative).
- **Shape and weight** — a thicker border (for example 2px → 4px), a left bar, or a changed outline style.
- **Position** — the message placed directly with the field, not in a distant corner.

Contrast requirements (WCAG 2.2 AA):

- **Error text** must meet 4.5:1 against its background (3:1 if large).
- **The visual indicator of the invalid state** (a border, a bar, an icon) must meet 3:1 against adjacent colours.
- A red that passes on white often fails on a pale pink error background or in dark mode.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of error signals — red border only, red text message, thicker border, icon plus text, and left bar plus message — with whether each works for colour-blind users, in forced-colors mode and in greyscale." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Error signals and what they survive</title>
  <desc>A red border alone fails for colour-blind users, disappears in forced-colors mode and fails in greyscale. A red text message works for colour-blind users because the text is readable, works in forced-colors mode and in greyscale. A thicker border works for colour-blind users and in greyscale and survives forced colors if it uses a system colour. An icon with text works in all three. A left bar with a message works in all three if the bar is drawn with a border rather than a background.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Signal</text>
  <text x="231.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Colour-blind</text>
  <text x="379.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Forced colors</text>
  <text x="527.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Greyscale</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">red border only</text>
  <text x="231.5" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">fails</text>
  <text x="379.6" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">disappears</text>
  <text x="527.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">fails</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">message text</text>
  <text x="231.5" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="379.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="527.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">thicker border</text>
  <text x="231.5" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="379.6" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">with system colour</text>
  <text x="527.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">icon + text</text>
  <text x="231.5" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="379.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="527.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">left bar (border) + message</text>
  <text x="231.5" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="379.6" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
  <text x="527.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">works</text>
</svg>

---

## The core pattern: layered signals in CSS

```css
:root {
  --error-text: #b3261e;        /* 6.5:1 on white, 6.0:1 on --error-bg */
  --error-border: #b3261e;      /* ≥ 3:1 against white and the field background */
  --error-bg: #fdf3f2;          /* text must still pass on this */
}
@media (prefers-color-scheme: dark) {
  :root {
    --error-text: #ffb4ab;      /* re-checked for dark surfaces */
    --error-border: #ffb4ab;
    --error-bg: #3a1a17;
  }
}

/* 1. Shape changes, not only colour: thicker border plus a left bar. */
.field[data-invalid="true"] input,
input[aria-invalid="true"] {
  border: 2px solid var(--error-border);
  box-shadow: inset 4px 0 0 0 var(--error-border);   /* left bar inside the field */
}

/* 2. The message: icon + text, with a visible (or visually hidden) prefix. */
.field-error {
  display: flex; gap: .4rem; align-items: flex-start;
  color: var(--error-text);
  font-weight: 600;
}
.field-error::before {
  content: "";                     /* decorative icon via mask; the text carries meaning */
  flex: none; width: 1.1em; height: 1.1em; margin-top: .1em;
  background: currentColor;
  mask: url("/icons/alert.svg") center / contain no-repeat;
}

/* 3. Forced colors (Windows High Contrast): use system colours so signals remain. */
@media (forced-colors: active) {
  input[aria-invalid="true"] {
    border: 3px dashed Mark;       /* dashed: a shape change survives any palette */
    box-shadow: none;
  }
  .field-error { color: CanvasText; }
  .field-error::before { background: CanvasText; forced-color-adjust: none; }
}
```

```html
<div class="field" data-invalid="true">
  <label for="postcode">Postcode</label>
  <input id="postcode" name="postcode" aria-invalid="true" aria-describedby="postcode-error">
  <p id="postcode-error" class="field-error"><span class="visually-hidden">Error:</span> Enter a real postcode, like SW1A 1AA.</p>
</div>
```

---

## Step-by-step walkthrough

1. **Always pair colour with text.** The message is the primary signal; colour reinforces it. A field with a red border and no message fails 1.4.1.
2. **Change shape as well as colour.** Increase border width, add a left bar, or switch to a dashed outline in forced-colors mode. Test in greyscale: invalid fields must still stand out.
3. **Add an icon, decoratively.** The icon speeds visual scanning; the text carries the meaning, so the icon needs no separate text alternative.
4. **Check contrast on the actual backgrounds.** Error text against the page and against any error background tint; the border against both the page and the field's fill (3:1). Re-check in dark mode.
5. **Support forced colors.** In Windows High Contrast, author colours are replaced; box-shadows are removed. Use system colour keywords (`Mark`, `CanvasText`, `Highlight`) and border styles that survive.
6. **Keep success states subtle.** Green ticks on valid fields add noise and repeat the colour problem; if you show them, use text ("Looks good") and do not make them the only confirmation.

### Why the message text is the real accessibility feature

Colour, borders and icons help sighted users scan a long form for problems. But the thing that lets a user fix the problem is the message, and the message is also what reaches screen-reader users through `aria-describedby`, voice-control users through visible text they can read aloud, and cognitive-accessibility needs through clear, specific wording. A form whose visual error styling is perfect but whose messages say "Invalid input" is still inaccessible in the ways that matter most. Style for scanning; write for fixing — the guidance in [writing error messages that tell the reader what to do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards describing how an invalid field styled with layered signals appears in normal colour, to a colour-blind user, in forced-colors mode and in dark mode." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The same invalid field under four conditions</title>
  <desc>In normal colour, the field shows a red two pixel border, a red left bar and a red message with an icon. For a user with red-green colour blindness, the border and bar may look brown or grey, but the thicker border, the bar, the icon and the message text still mark the error. In forced-colors mode, author colours are replaced, and a dashed border in the system Mark colour plus the message in CanvasText remain. In dark mode, lighter error colours keep text and border contrast above the required ratios.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Normal colour</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Red border + bar.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Red message + icon.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Colour-blind</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Thicker border, bar, icon.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Message text readable.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Forced colors</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Dashed border in Mark.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Message in CanvasText.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Dark mode</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Lighter error palette.</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Contrast re-checked.</text>
</svg>

### Designing the error palette as tokens

Treat error colours as design tokens with contrast guarantees rather than as ad-hoc hex values sprinkled through components. Define a small set — error text, error border, error surface tint — for each theme, and record the contrast ratio each pair must meet next to the token. When the brand palette changes, the tokens change in one place and the ratios can be re-verified automatically in a unit test that computes relative luminance. Components then reference tokens only, so no individual component can reintroduce a red that fails on its background, and dark mode, high-contrast variants and future themes inherit correct error styling by construction.

---

## Failure modes and edge cases

### 1. Error background tints that break contrast

A red message on a pink error panel often drops below 4.5:1. Check text against the tint, not against white.

### 2. `box-shadow` borders in forced colors

Forced-colors mode removes `box-shadow`, so an error indicator drawn only with a shadow disappears. Provide a real `border` or `outline` alternative in the `forced-colors` media query.

### 3. Placeholder-only errors

Replacing the placeholder with "Required!" in red is invisible once the user types and usually fails contrast. Errors belong in their own element below or above the field.

### 4. Icon fonts

Icon fonts can be replaced by the user's font settings or read aloud as letters. Use inline SVG or CSS masks with `currentColor`, marked decorative.

### 5. Group errors

For radio and checkbox groups, apply the shape change to the group container (a left bar on the fieldset) and to each option's input, as in [accessible errors for radio and checkbox groups](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-errors-for-radio-and-checkbox-groups/).

<svg viewBox="0 0 680 154" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart of the contrast ratio of four common error red colours against a white background, compared with the 4.5 to 1 text threshold." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Contrast of common error reds on white</title>
  <desc>Computed contrast ratios against white. A light red, hex f44336, has a ratio of about 3.7 to 1 and fails for normal text. A medium red, hex e53935, has about 4.2 to 1 and fails. A darker red, hex d32f2f, has about 4.98 to 1 and passes. A deep red, hex b3261e, has about 6.5 to 1 and passes comfortably. The AA threshold for normal text is 4.5 to 1.</desc>
  <rect x="0" y="0" width="680" height="154" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="116.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">#f44336</text>
  <rect x="204.0" y="16.0" width="186.1" height="14" rx="3" fill="#a63d6f"/>
  <text x="398.1" y="26.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">3.7:1</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">#e53935</text>
  <rect x="204.0" y="42.0" width="211.2" height="14" rx="3" fill="#a63d6f"/>
  <text x="423.2" y="52.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">4.2:1</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">#d32f2f</text>
  <rect x="204.0" y="68.0" width="250.4" height="14" rx="3" fill="#2d6342"/>
  <text x="462.4" y="78.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">4.98:1</text>
  <text x="20.0" y="103.5" font-size="10" fill="#1e1a24" font-family="inherit">#b3261e</text>
  <rect x="204.0" y="94.0" width="326.9" height="14" rx="3" fill="#2d6342"/>
  <text x="538.9" y="104.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">6.5:1</text>
  <text x="14.0" y="142.0" font-size="10" fill="#6b5f75" font-family="inherit">Ratios computed with the WCAG relative-luminance formula against #ffffff; the AA threshold for normal text is 4.5:1.</text>
</svg>

---

## Verification checklist

- [ ] Every invalid field shows a text message, not only a colour change.
- [ ] Invalid fields are distinguishable in a greyscale screenshot.
- [ ] Error text meets 4.5:1 on its actual background, in light and dark themes.
- [ ] Error borders and bars meet 3:1 against adjacent colours.
- [ ] In forced-colors mode, invalid fields show a visible, non-shadow indicator.
- [ ] Icons are decorative and messages carry the meaning.
- [ ] A hidden or visible "Error:" prefix precedes each message.

---

## Frequently Asked Questions

<details>
<summary><strong>Is a red border acceptable if there is also a message?</strong></summary>

Yes. The requirement is that colour is not the *only* means. With a message present, the border is a helpful additional signal; making it thicker than the default border adds a non-colour cue for scanning.

</details>

<details>
<summary><strong>How do I test forced-colors mode without Windows?</strong></summary>

Chromium DevTools can emulate `forced-colors: active` in the Rendering panel. It is a good first check; test on Windows with a real High Contrast theme before release.

</details>

<details>
<summary><strong>Should valid fields turn green?</strong></summary>

Usually not. Green success styling adds colour-only information and visual noise. If positive feedback helps (for example, a username is available), use text, and keep it calm.

</details>

---

## Related

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
- [Indicating Required and Optional Fields](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/indicating-required-and-optional-fields/)
- [Accessible Password Strength Meters](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-password-strength-meters/)

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
