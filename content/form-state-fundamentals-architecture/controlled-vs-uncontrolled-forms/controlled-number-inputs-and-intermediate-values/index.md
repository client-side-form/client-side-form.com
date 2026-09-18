---
layout: page.njk
title: "Controlled Number Inputs and Intermediate Values"
description: "Why a controlled numeric field eats the minus sign, the trailing decimal point and leading zeros, and how to store the raw text separately from the parsed number so typing is never fought by state."
slug: controlled-number-inputs-and-intermediate-values
type: howto
breadcrumb: "Number Inputs"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Controlled Number Inputs and Intermediate Values"
  parent: "Controlled vs Uncontrolled Forms"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Controlled Number Inputs and Intermediate Values",
      "description": "Why a controlled numeric field eats the minus sign, the trailing decimal point and leading zeros, and how to store the raw text separately from the parsed number so typing is never fought by state.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Controlled vs Uncontrolled Forms",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Controlled Number Inputs and Intermediate Values",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Store raw text and parsed numbers separately in a controlled numeric field",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Switch the element to type=\"text\" with inputmode=\"decimal\""
        },
        {
          "@type": "HowToStep",
          "name": "Store raw as the controlled value"
        },
        {
          "@type": "HowToStep",
          "name": "Parse on every change into value and error"
        },
        {
          "@type": "HowToStep",
          "name": "Normalise on blur, never on change"
        },
        {
          "@type": "HowToStep",
          "name": "Make every consumer read value"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not use input type=\"number\"?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because it reports an empty string for any content that is not yet a valid number, so a controlled component cannot distinguish \"empty\" from \"halfway through typing -1.5\". It also has inconsistent validation across browsers and changes value on scroll. type=\"text\" with inputmode=\"decimal\" keeps the mobile keyboard and gives you the raw text."
          }
        },
        {
          "@type": "Question",
          "name": "Where should min and max be enforced?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In the parser that produces error, and again in the schema that validates the payload. Never clamp the raw text while the user types — turning 150 into 100 as they type the zero is as disorienting as losing the minus sign."
          }
        },
        {
          "@type": "Question",
          "name": "Does this apply to uncontrolled inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Much less. An uncontrolled input keeps whatever the user types because nothing writes back into it; you parse only when you read it, usually on submit. The two-representation discipline is the price of controlling the field."
          }
        }
      ]
    }
  ]
}
</script>

# Controlled Number Inputs and Intermediate Values

A controlled numeric field that stores a `number` in state cannot represent what the user is halfway through typing — `-`, `1.`, `0.0`, `1e` — so each keystroke is parsed, rejected or normalised, and written back, and the cursor jumps or the character vanishes.

This is a specific instance of the ownership question in [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/): when state is the source of truth, state must be able to hold every string the user can legitimately pass through on the way to a valid value. A `number` type cannot. The fix is to keep two representations and to be precise about which one each part of the form reads.

---

## Context and prerequisites

Typing "-0.5" into a field goes through the strings `-`, `-0`, `-0.`, `-0.5`. Parse each with `Number()` or `parseFloat()` and you get `NaN`, `-0`, `-0`, `-0.5`. Write those back into a controlled input and the display becomes empty, `0`, `0` and `-0.5` — the user sees their minus sign disappear, then their decimal point, and gives up.

The native `<input type="number">` makes this worse rather than better. When its content is not a valid floating-point number, `input.value` returns the empty string, so a controlled component that reads `e.target.value` receives `""` for `1e` or `-` and cannot tell "empty" from "incomplete". It also varies by browser: Firefox allows any characters to be typed and reports `""`, Chromium blocks letters other than `e`, and mobile keyboards may lack a minus key entirely.

<svg viewBox="0 0 680 194" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table following the keystrokes of the value minus zero point five, showing the raw text, the parsed number, what a naive controlled input displays after writing the number back, and what the two-representation approach displays." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Each keystroke, parsed and written back</title>
  <desc>After typing a minus sign the raw text is a minus sign, the parsed value is NaN, the naive input shows an empty field and the two-representation input shows the minus sign. After minus zero the parsed value is negative zero and the naive input shows zero without the sign. After minus zero point the naive input shows zero and loses the point. Only at minus zero point five do both agree. The two-representation input always shows exactly what was typed.</desc>
  <rect x="0" y="0" width="680" height="194" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Typed so far</text>
  <text x="187.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Parsed</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Naive display</text>
  <text x="513.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Raw-text display</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">-</text>
  <text x="187.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">NaN</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">(empty)</text>
  <text x="513.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">-</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">-0</text>
  <text x="187.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">-0</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">0</text>
  <text x="513.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">-0</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">-0.</text>
  <text x="187.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">-0</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">0</text>
  <text x="513.0" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">-0.</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">-0.5</text>
  <text x="187.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">-0.5</text>
  <text x="350.0" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">-0.5</text>
  <text x="513.0" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">-0.5</text>
  <text x="14.0" y="182.0" font-size="10" fill="#6b5f75" font-family="inherit">Three of four keystrokes are destroyed by round-tripping through a number. The value is only representable at the end.</text>
</svg>

---

## The core pattern: raw text in the field, parsed number beside it

```typescript
export type NumericField = {
  raw: string;                 // exactly what the input displays — never normalised while focused
  value: number | null;        // parsed result, or null when raw is empty or incomplete
  error: string | null;
};

// Accepts every prefix of a valid decimal: "", "-", "1.", ".5", "-0.".
const PARTIAL = /^-?\d*(?:[.]\d*)?$/;

export function parseNumeric(raw: string, opts: { min?: number; max?: number; decimals?: number } = {}): NumericField {
  const trimmed = raw.trim();
  if (trimmed === "") return { raw, value: null, error: null };
  if (!PARTIAL.test(trimmed)) return { raw, value: null, error: "Enter a number, like 12 or 12.5" };
  // An incomplete prefix is not an error while typing; it simply has no value yet.
  if (trimmed === "-" || trimmed === "." || trimmed === "-.") return { raw, value: null, error: null };
  const n = Number(trimmed);
  if (opts.decimals !== undefined) {
    const places = (trimmed.split(".")[1] ?? "").length;
    if (places > opts.decimals) return { raw, value: n, error: `Use at most ${opts.decimals} decimal places` };
  }
  if (opts.min !== undefined && n < opts.min) return { raw, value: n, error: `Must be ${opts.min} or more` };
  if (opts.max !== undefined && n > opts.max) return { raw, value: n, error: `Must be ${opts.max} or less` };
  return { raw, value: n, error: null };
}

// Normalise only when the user leaves the field, and only if it parsed.
export function normaliseOnBlur(field: NumericField): NumericField {
  if (field.value === null || field.error) return field;
  // Object.is catches -0, which String() would print as "0" anyway; decide
  // explicitly rather than let it happen by accident.
  const clean = Object.is(field.value, -0) ? "0" : String(field.value);
  return { ...field, raw: clean };
}
```

```tsx
function QuantityInput({ field, onChange }: { field: NumericField; onChange: (f: NumericField) => void }) {
  return (
    <input
      type="text"                 // not type="number": we need to see incomplete text
      inputMode="decimal"         // still brings up a numeric keyboard on mobile
      value={field.raw}           // the field always displays RAW text
      onChange={(e) => onChange(parseNumeric(e.target.value, { min: 0, decimals: 2 }))}
      onBlur={() => onChange(normaliseOnBlur(field))}
      aria-invalid={field.error ? true : undefined}
    />
  );
}
```

Everything that needs a number — totals, cross-field rules, the submit payload — reads `field.value`. Everything that renders the field reads `field.raw`. Nothing ever writes a number back into `raw` while the field has focus.

---

## Step-by-step walkthrough

1. **Switch the element to `type="text"` with `inputmode="decimal"`.** You keep the numeric keyboard on phones and gain the ability to read incomplete input. Add `pattern` only if you also rely on native constraint validation.
2. **Store `raw` as the controlled value.** It is the only representation that can hold every intermediate string, so it is the only safe thing to feed back into the input.
3. **Parse on every change into `value` and `error`.** Treat recognised prefixes (`-`, `.`) as "no value yet", not as errors, so the user is not scolded mid-keystroke; the timing rules in [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/) decide when an error actually becomes visible.
4. **Normalise on blur, never on change.** Stripping a trailing `.` or leading zeros is fine once the user has left; doing it while they type is exactly the bug you are fixing.
5. **Make every consumer read `value`.** Derived totals and the payload use the parsed number and treat `null` as "missing", which the schema can then reject as required.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow from a keystroke to the raw string, then to the parsed value and error, then to consumers, with normalisation happening only on blur." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One field, two representations, one direction of flow</title>
  <desc>A keystroke updates the raw string, which the input displays unchanged. The raw string is parsed into a number or null and an error or null. Consumers such as totals, cross-field rules and the submit payload read only the parsed value. On blur, if the value parsed cleanly, the raw string is rewritten to its normal form; this is the only moment a number flows back into the text.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="364.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Keystroke</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The browser&#x27;s value after the edit.</text>
  <text x="408.7" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Nothing is rejected here; the text the user typed is kept.</text>
  <path d="M196.3,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="192.3,89.0 196.3,96.0 200.3,89.0" fill="#7b4f8a"/>
  <text x="206.3" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">store</text>
  <rect x="14.0" y="97.0" width="364.7" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">raw (string)</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The controlled value of the input.</text>
  <text x="408.7" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Always displayed as-is while the field has focus.</text>
  <path d="M196.3,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="192.3,174.0 196.3,181.0 200.3,174.0" fill="#7b4f8a"/>
  <text x="206.3" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">parse</text>
  <rect x="14.0" y="182.0" width="364.7" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">value (number | null) and error</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">null for empty or incomplete prefixes.</text>
  <text x="408.7" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Totals, cross-field rules and the payload read only this.</text>
  <path d="M196.3,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="192.3,259.0 196.3,266.0 200.3,259.0" fill="#7b4f8a"/>
  <text x="206.3" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">on blur</text>
  <rect x="14.0" y="267.0" width="364.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Normalise raw</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only if value parsed with no error.</text>
  <text x="408.7" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The single place a number is written back into the text.</text>
</svg>

---

## Failure modes and edge cases

### 1. Locale decimal separators

A German user types `1,5`. The regex above rejects it and `Number("1,5")` is `NaN`. If your audience writes commas, parse with the locale's separator, which [locale-aware number and currency inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/) covers in full — including why `Intl.NumberFormat` can format but not parse.

### 2. Scroll-wheel and arrow-key changes on `type="number"`

If you keep `type="number"`, a mouse wheel over a focused field silently changes its value, and a user scrolling the page edits their quantity. Either switch to text as above or blur the field on `wheel`:

```typescript
input.addEventListener("wheel", () => input.blur(), { passive: true });
```

### 3. Large integers and identifiers

Account numbers, postcodes and card numbers are not numbers: leading zeros matter and values beyond `Number.MAX_SAFE_INTEGER` lose precision. Keep them as strings end to end; only quantities and amounts should ever be parsed.

### 4. Money as floating point

`0.1 + 0.2` is `0.30000000000000004`. Parse currency into integer minor units (`Math.round(n * 100)` after validating decimal places) or send the normalised string to a server that uses a decimal type. Never sum user-entered floats for a displayed total without rounding.

### 5. Programmatic updates while focused

A "use suggested amount" button that writes `raw` while the field is focused is fine — it is a deliberate replacement. A recalculation effect that rewrites `raw` from `value` on every render is the original bug in a new place; guard any such effect with `document.activeElement !== input`.

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards grouping field kinds into true quantities to parse, identifiers to keep as strings, and money to parse into integer minor units." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Field types that look numeric but must stay strings</title>
  <desc>Quantities such as age, count and percentage should be parsed to numbers. Identifiers such as postcodes, account numbers and card numbers must stay strings because leading zeros and length matter and large values lose precision. Money should be validated for decimal places and converted to integer minor units or sent as a decimal string, never summed as floats.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Parse to number</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Quantity, age, percentage, rating.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Arithmetic is meaningful; leading zeros</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">are not.</text>
  <rect x="236.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Keep as string</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Postcode, account number, card</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">number, phone.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Leading zeros and length carry</text>
  <text x="248.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">meaning; big values lose precision.</text>
  <rect x="458.0" y="12.0" width="208.0" height="99.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Integer minor units</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Price, amount, balance.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Validate decimal places, then convert to</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cents or send a decimal string.</text>
</svg>

---

## Verification checklist

- [ ] Typing `-`, `.`, `-0.` and `1.` shows exactly those characters with no cursor jump.
- [ ] Clearing the field produces `value: null`, and a required rule reports it on submit.
- [ ] Leaving the field with `007` normalises it to `7`; leaving with `1.` normalises to `1`.
- [ ] Invalid text such as `12a` shows a message only after blur or submit, not mid-keystroke.
- [ ] Mobile keyboards show digits and a decimal separator.
- [ ] Scrolling the page over a focused field does not change its value.
- [ ] Money totals are computed from integer minor units and display without floating-point artefacts.
- [ ] `aria-invalid` toggles with the error, and the message is associated through `aria-describedby`.

---

## Frequently Asked Questions

<details>
<summary><strong>Why not use input type="number"?</strong></summary>

Because it reports an empty string for any content that is not yet a valid number, so a controlled component cannot distinguish "empty" from "halfway through typing -1.5". It also has inconsistent validation across browsers and changes value on scroll. `type="text"` with `inputmode="decimal"` keeps the mobile keyboard and gives you the raw text.

</details>

<details>
<summary><strong>Where should min and max be enforced?</strong></summary>

In the parser that produces `error`, and again in the schema that validates the payload. Never clamp the raw text while the user types — turning 150 into 100 as they type the zero is as disorienting as losing the minus sign.

</details>

<details>
<summary><strong>Does this apply to uncontrolled inputs?</strong></summary>

Much less. An uncontrolled input keeps whatever the user types because nothing writes back into it; you parse only when you read it, usually on submit. The two-representation discipline is the price of controlling the field.

</details>

---

## Related

- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
- [Locale-Aware Number and Currency Inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/)
- [Coercing Form Strings With Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/)

← [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
