---
layout: page.njk
title: "Input Masking and Formatting"
description: "Architecture for formatted inputs — phone numbers, card numbers, currency, dates, postcodes: separating raw and display values, formatting without fighting the caret, when to mask while typing versus on blur, validation of the raw value, and accessibility of masked fields."
slug: input-masking-and-formatting
type: topic
breadcrumb: "Masking & Formatting"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Input Masking and Formatting"
  parent: "Validation Logic"
  order: 7
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Input Masking and Formatting",
      "description": "Architecture for formatted inputs — phone numbers, card numbers, currency, dates, postcodes: separating raw and display values, formatting without fighting the caret, when to mask while typing versus on blur, validation of the raw value, and accessibility of masked fields.",
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
          "name": "Validation Logic & Schema Integration",
          "item": "https://client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Input Masking and Formatting",
          "item": "https://client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build formatted inputs that do not fight the user",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Problem statement"
        },
        {
          "@type": "HowToStep",
          "name": "State machine specification"
        },
        {
          "@type": "HowToStep",
          "name": "Core implementation"
        },
        {
          "@type": "HowToStep",
          "name": "Integration guidance"
        },
        {
          "@type": "HowToStep",
          "name": "Deciding whether a field should be masked at all"
        },
        {
          "@type": "HowToStep",
          "name": "Edge cases and failure modes"
        },
        {
          "@type": "HowToStep",
          "name": "Testing and QA hooks"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use an input masking library?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Libraries handle caret preservation and deletion well, and are a good choice for fixed-pattern fields like card numbers. For phone numbers, prefer a dedicated phone library. Whatever you use, verify it with the test cases above — especially paste, autofill and mid-value editing."
          }
        },
        {
          "@type": "Question",
          "name": "Is formatting on blur only good enough?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Often it is the best choice: no caret problems, clean editing for screen-reader and voice users, and a tidy display once the user moves on. Light live grouping helps for long digit strings like card numbers, where reading 16 digits without spaces is error-prone."
          }
        },
        {
          "@type": "Question",
          "name": "What should the placeholder show?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Placeholders disappear as soon as the user types and are often low contrast. Put the expected format in a visible hint (\"For example, 07700 900123\") linked with aria-describedby, and leave the placeholder empty or decorative."
          }
        },
        {
          "@type": "Question",
          "name": "How do masks interact with dirty tracking?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Compare raw values. Reformatting on blur changes the display text but not the raw value, so the field should not become dirty just because it was focused and blurred — the normalisation principle from deep equality for dirty detection on nested values."
          }
        }
      ]
    }
  ]
}
</script>

# Input Masking and Formatting

Input masks — the phone field that inserts brackets and dashes as you type, the card field that groups digits in fours, the amount field that adds thousands separators — promise fewer errors and cleaner data, and routinely deliver the opposite: the caret jumps to the end on every keystroke, pasted values are mangled, deleting a separator does nothing, screen readers announce punctuation the user never typed, and international numbers are rejected because the mask assumed one country's format.

Formatting is a presentation concern layered on top of a value, and most masking bugs come from forgetting that layering — storing the formatted string, validating the display text, or rewriting the input's value without accounting for where the caret was. This topic sets out a model with two representations, rules for when formatting should happen, and the guides that implement the hard parts. It sits within [validation logic and schema integration](https://www.client-side-form.com/validation-logic-schema-integration/) because a formatted field's validity is always a property of its raw value, and it builds on the raw-versus-parsed split described in [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).

---

## Problem statement

A formatted field has two values that users and code care about:

- **The raw value** — what the data means: `"07700900123"`, `"4111111111111111"`, `123456.5`, `"2026-10-01"`.
- **The display value** — how it is shown to humans: `"07700 900123"`, `"4111 1111 1111 1111"`, `"123,456.50"`, `"01/10/2026"`.

The field's job is to accept whatever the user types or pastes, derive the raw value from it, and show a helpful display value — without ever losing a character the user meant, moving the caret somewhere unexpected, or blocking input that is valid but unfamiliar to the mask.

Masks go wrong in predictable ways:

1. **Caret jumps.** Rewriting `input.value` puts the caret at the end. Every keystroke in the middle of a formatted value sends it there.
2. **Destructive deletion.** Backspacing over an inserted separator deletes nothing (the mask re-inserts it), trapping the user.
3. **Paste mangling.** Pasting `+44 7700 900123` into a mask expecting `07700 900123` truncates or scrambles it.
4. **Over-constraint.** A US-shaped phone mask rejects every non-US number; a date mask rejects the user's locale order.
5. **Invisible structure.** Screen readers read "open bracket zero seven seven" and users of voice control cannot dictate into a field that rejects spaces.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of five formatted field types with an example raw value, the display value and when to validate." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Raw and display values for common formatted fields</title>
  <desc>A UK phone number has raw value 07700900123 and display 07700 900123, and is validated on blur by a phone library. A card number has raw digits and display in groups of four, validated by length and the Luhn check. A currency amount has a numeric raw value in minor units and a locale-formatted display, validated for range and decimal places. A date has an ISO raw value and a locale display, validated as a calendar date. A postcode has a normalised uppercase raw value and a spaced display, validated by country format.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="141.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Raw value</text>
  <text x="310.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Display value</text>
  <text x="480.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Validate</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">UK phone</text>
  <text x="141.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">07700900123</text>
  <text x="310.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">07700 900123</text>
  <text x="480.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">phone library, on blur</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Card number</text>
  <text x="141.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4111111111111111</text>
  <text x="310.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4111 1111 1111 1111</text>
  <text x="480.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">length + Luhn</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Amount (GBP)</text>
  <text x="141.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">12345650 (pence)</text>
  <text x="310.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">£123,456.50</text>
  <text x="480.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">range, decimals</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Date</text>
  <text x="141.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">2026-10-01</text>
  <text x="310.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">01/10/2026</text>
  <text x="480.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">real calendar date</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Postcode</text>
  <text x="141.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">SW1A1AA</text>
  <text x="310.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">SW1A 1AA</text>
  <text x="480.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">country format</text>
</svg>

---

## State machine specification

A formatted input moves between two modes, and the transitions are where most decisions live:

| State | Entered by | Displays | Leaves on |
|---|---|---|---|
| `editing` | focus, typing, paste | raw-ish text: user's characters plus *minimal* live grouping | blur → `formatted`; submit |
| `formatted` | blur | full display format | focus → `editing` |
| `invalid` | blur or submit with a raw value that fails validation | the user's text, unformatted, with an error | edit → `editing` |

Two principles follow. **Format fully on blur, format lightly (or not at all) while typing** — the user is mid-thought, and anything that changes characters around the caret risks moving it. And **never format invalid input**: if the raw value cannot be parsed, show exactly what the user typed so they can see and fix it.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a formatted input through editing on focus, minimal live grouping while typing, full formatting on blur when the value is valid, and remaining unformatted with an error when invalid." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A formatted field&#x27;s lifecycle</title>
  <desc>On focus the field enters editing and may show the raw value or a lightly grouped version. While typing, only safe insertions such as digit grouping are applied, with the caret position preserved. On blur, the raw value is derived and validated; if valid, the full display format is applied; if invalid, the user&#x27;s text is left exactly as typed and an error is shown. Focusing again returns to editing.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="416.5" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">editing (focused)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">User&#x27;s text, light grouping at most.</text>
  <text x="460.5" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Caret position preserved on every change.</text>
  <path d="M222.3,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="218.3,89.0 222.3,96.0 226.3,89.0" fill="#7b4f8a"/>
  <text x="232.3" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">blur</text>
  <rect x="14.0" y="97.0" width="416.5" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">derive raw + validate</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Strip formatting, parse, check.</text>
  <text x="460.5" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Validation always sees the raw value.</text>
  <path d="M222.3,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="218.3,174.0 222.3,181.0 226.3,174.0" fill="#7b4f8a"/>
  <text x="232.3" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">valid?</text>
  <rect x="14.0" y="182.0" width="416.5" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">formatted (valid)</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Full display format.</text>
  <text x="460.5" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">e.g. &quot;£123,456.50&quot;.</text>
  <path d="M222.3,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="218.3,259.0 222.3,266.0 226.3,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="416.5" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">invalid</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Text left exactly as typed.</text>
  <text x="460.5" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Error shown; nothing reformatted until fixed.</text>
</svg>

---

## Core implementation

The foundation is a formatter contract with three pure functions, plus a small controller that applies them to an input at the right moments and preserves the caret by counting *meaningful* characters rather than positions.

```typescript
export interface Formatter<Raw> {
  /** Characters that carry meaning (digits for phones/cards); others are formatting. */
  isMeaningful(ch: string): boolean;
  /** Parse whatever the user typed/pasted into a raw value, or null if impossible. */
  parse(text: string): Raw | null;
  /** Full display format for a valid raw value (used on blur). */
  format(raw: Raw): string;
  /** Optional light formatting while typing; must only INSERT separators. */
  live?(text: string): string;
}

/** Keep the caret after the same number of meaningful characters. */
function caretAfterMeaningful(text: string, count: number, isMeaningful: (c: string) => boolean): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (isMeaningful(text[i]) && ++seen === count) return i + 1;
  }
  return text.length;
}

export function attachFormatter<Raw>(
  input: HTMLInputElement,
  f: Formatter<Raw>,
  onRaw: (raw: Raw | null, text: string) => void,
) {
  const onInput = () => {
    const text = input.value;
    const caret = input.selectionStart ?? text.length;
    if (f.live) {
      // How many meaningful characters were before the caret BEFORE formatting?
      const before = [...text.slice(0, caret)].filter(f.isMeaningful).length;
      const next = f.live(text);
      if (next !== text) {
        input.value = next;
        const pos = caretAfterMeaningful(next, before, f.isMeaningful);
        input.setSelectionRange(pos, pos);
      }
    }
    onRaw(f.parse(input.value), input.value);
  };
  const onBlur = () => {
    const raw = f.parse(input.value);
    if (raw !== null) input.value = f.format(raw);  // only format what parsed
    onRaw(raw, input.value);
  };
  input.addEventListener("input", onInput);
  input.addEventListener("blur", onBlur);
  return () => { input.removeEventListener("input", onInput); input.removeEventListener("blur", onBlur); };
}

// Example: card numbers — group digits in fours, live and on blur.
export const cardFormatter: Formatter<string> = {
  isMeaningful: (c) => c >= "0" && c <= "9",
  parse: (t) => { const d = t.replace(/\D/g, ""); return d.length >= 12 && d.length <= 19 ? d : null; },
  format: (d) => d.replace(/(\d{4})(?=\d)/g, "$1 "),
  live: (t) => t.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
};
```

Validation — the schema, the Luhn check, the phone library — always runs on the output of `parse`, never on the display text. The form stores the raw value; the display value lives only in the input.

---

## Integration guidance

**Framework state.** In React, Vue or Svelte, store the raw value and the current text separately, as in the number-input pattern. Controlled inputs must not write a re-formatted string back on every render while the field is focused, or the caret jumps; the caret-preservation logic is detailed in [preserving caret position in masked inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/).

**Schemas.** The schema validates raw values: `z.string().regex(/^\d{12,19}$/)` plus a Luhn refinement for cards, a phone-library check for phones. Parsing from display text happens before the schema, in the same place as other [coercion of form strings](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/).

**Locale.** Currency, numbers and dates format differently by locale — decimal comma, digit grouping, day-month order. Use `Intl` for display and parse with the locale's own separators, covered in [locale-aware number and currency inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/).

**Specific field types.** Phone numbers are best handled by a real phone-number library rather than a hand-written mask, as in [validating international phone numbers](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/); card numbers combine grouping by brand with length and checksum validation, as in [card number formatting and Luhn validation](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/card-number-formatting-and-luhn-validation/).

**Autofill and paste.** Browsers autofill and users paste fully formatted values from elsewhere (`+44 (0) 7700 900-123`). `parse` must accept any reasonable formatting, which is why it strips non-meaningful characters rather than expecting a fixed pattern.

**Accessibility.** Use `inputmode` (`numeric`, `tel`, `decimal`) for the right mobile keyboard, a visible hint showing the expected format, and never rely on placeholder text as the only instruction. Keep `aria-describedby` pointing to the hint and any error.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing how a formatted field&#x27;s concerns are layered — the input showing display text, the formatter parsing and formatting, the form state holding the raw value, and the schema validating the raw value." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where each concern lives</title>
  <desc>The input element shows display text and handles the caret. The formatter converts between text and raw value with parse and format, applying light live grouping. Form state holds the raw value used for submit, dirty checks and cross-field rules. The schema validates the raw value, never the display text.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Input (display)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">What the user sees.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Caret handling.</text>
  <path d="M156.0,47.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,43.5 183.0,47.5 176.0,51.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Formatter</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">parse / format / live.</text>
  <path d="M326.0,47.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,43.5 353.0,47.5 346.0,51.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Form state (raw)</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit, dirty, cross-field.</text>
  <path d="M496.0,47.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,43.5 523.0,47.5 516.0,51.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Schema</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Validates raw only.</text>
</svg>

---

## Deciding whether a field should be masked at all

Before choosing a masking technique, ask whether the field benefits from formatting at all. The strongest case is long strings of digits that people read back to check — card numbers, bank account numbers, long reference codes — where grouping into short chunks measurably reduces transcription errors. Currency amounts benefit from thousands separators on display, because `1000000` and `100000` are easy to confuse. Dates benefit from a clear, unambiguous display once entered, especially across locales that order day and month differently.

The weakest case is fields where the format varies by user, or where people already know how they like to type the value. Phone numbers are the classic example: formats differ by country, by mobile versus landline, and by personal habit, and a mask that enforces one layout is wrong for many users. Names, addresses and email addresses should never be masked. Postcodes sit in between — normalising case and spacing on blur is helpful, but blocking input that does not match one country's pattern is not.

A useful rule: mask for *reading*, not for *restricting*. If the goal is to make a value easier to verify, format it — preferably on blur. If the goal is to prevent invalid input, validate the raw value and explain the problem; do not rely on the mask to make invalid input impossible, because it will also make some valid input impossible. Restrictive masks tend to fail silently for exactly the users least able to work around them — people using voice input, switch access or unfamiliar keyboard layouts — and those failures rarely reach analytics, because the user simply gives up.

Finally, consider the cost of the mask in the whole flow. A formatted field changes what assistive technology reads, what browser autofill must match, what the paste handler must accept and what automated tests must type. Each of those is manageable, but together they are a real maintenance cost, and it is worth paying only where the formatting clearly helps users read and check what they entered.

---

## Edge cases and failure modes

**Deleting a separator.** When the user presses Backspace directly after a space the mask inserted, a naive mask re-inserts the space and the caret goes nowhere. Treat deletion of a formatting character as deletion of the meaningful character before it, or (simpler) do not format live and only format on blur.

**IME composition.** For languages that compose characters (Chinese, Japanese, Korean) and on some mobile keyboards, rewriting `value` during composition breaks input. Skip live formatting while `event.isComposing` is true and format on `compositionend`.

**Right-to-left text.** Formatted numbers inside RTL pages can display in unexpected order. Set `dir="ltr"` on inputs holding phone numbers, card numbers and other left-to-right codes.

**Max length.** A `maxlength` attribute counts display characters, including separators, so a 16-digit card with three spaces needs `maxlength="19"` — or better, no `maxlength` and a length rule on the raw value, so pasted text with extra formatting is not truncated.

**Screen-reader verbosity.** Some screen readers read separators aloud. Formatting only on blur keeps the editing experience clean; the formatted value is read once, on focus.

**Voice input.** Dictating "zero seven seven hundred…" produces words or unexpected digits. A lenient `parse` that accepts spaces and common formatting makes voice input workable; a mask that blocks non-digit characters makes it impossible.

---

## Troubleshooting reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Caret jumps to the end while typing | Log `selectionStart` before and after the value write | Restore the caret by meaningful-character count, or stop formatting live |
| Backspace over a space does nothing | Check whether live formatting re-inserts the separator | Delete the preceding meaningful character, or format only on blur |
| Pasted numbers are truncated | Check `maxlength` and the parse function | Remove display `maxlength`; parse leniently, then validate raw length |
| International numbers rejected | Check the mask's hard-coded pattern | Use a phone library with a country selector or E.164 input |
| Validation fails on correctly formatted input | Check whether the schema sees display text | Validate the output of `parse`, never `input.value` |

---

## Testing and QA hooks

Tests for formatted fields should type character by character, not set values in one go — caret bugs only appear with incremental input. In Playwright, `pressSequentially` into the middle of an existing value (after moving the caret with arrow keys) and assert both the final text and `selectionStart`. Add paste tests with heavily formatted input, and a test that deletes a separator with Backspace.

Expose the raw value for tests with a `data-raw-value` attribute (or read form state directly in component tests) so assertions do not depend on display formatting. For accessibility regression coverage, assert that the hint is referenced by `aria-describedby` and that the input's `inputmode` matches the field type.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of test cases for formatted inputs with the action and the expected result." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The test cases every formatted field needs</title>
  <desc>Typing into the middle of a value should keep the caret after the typed character. Backspacing directly after an inserted separator should delete the previous digit. Pasting a heavily formatted value should produce the correct raw value. Blurring with an invalid value should leave the text unchanged and show an error. Autofilling a formatted value should produce the correct raw value.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Case</text>
  <text x="172.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action</text>
  <text x="409.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Expect</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">mid-value typing</text>
  <text x="172.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">move caret left 3, type a digit</text>
  <text x="409.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">caret stays after that digit</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">separator backspace</text>
  <text x="172.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Backspace right after a space</text>
  <text x="409.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">previous digit deleted</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">formatted paste</text>
  <text x="172.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">paste &quot;+44 (0) 7700-900 123&quot;</text>
  <text x="409.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">correct raw value</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">invalid blur</text>
  <text x="172.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">type &quot;12ab&quot;, blur</text>
  <text x="409.3" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">text unchanged, error shown</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">autofill</text>
  <text x="172.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">browser fills formatted value</text>
  <text x="409.3" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">correct raw value</text>
</svg>

---

## Common pitfalls

- **Storing the display value.** Submissions contain spaces and brackets; comparisons and deduplication fail.
- **Validating the display text.** Every locale and formatting variant becomes a validation failure.
- **Formatting on every keystroke without caret handling.** The single most reported masking bug.
- **Hard-coding one country's format.** Phone and postcode masks that only fit one country exclude everyone else.
- **Blocking characters.** Refusing spaces or dashes breaks paste, autofill and voice input; accept them and strip them in `parse`.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use an input masking library?</strong></summary>

Libraries handle caret preservation and deletion well, and are a good choice for fixed-pattern fields like card numbers. For phone numbers, prefer a dedicated phone library. Whatever you use, verify it with the test cases above — especially paste, autofill and mid-value editing.

</details>

<details>
<summary><strong>Is formatting on blur only good enough?</strong></summary>

Often it is the best choice: no caret problems, clean editing for screen-reader and voice users, and a tidy display once the user moves on. Light live grouping helps for long digit strings like card numbers, where reading 16 digits without spaces is error-prone.

</details>

<details>
<summary><strong>What should the placeholder show?</strong></summary>

Placeholders disappear as soon as the user types and are often low contrast. Put the expected format in a visible hint ("For example, 07700 900123") linked with `aria-describedby`, and leave the placeholder empty or decorative.

</details>

<details>
<summary><strong>How do masks interact with dirty tracking?</strong></summary>

Compare raw values. Reformatting on blur changes the display text but not the raw value, so the field should not become dirty just because it was focused and blurred — the normalisation principle from [deep equality for dirty detection on nested values](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/deep-equality-for-dirty-detection-on-nested-values/).

</details>

---

## Related

- [Preserving Caret Position in Masked Inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/)
- [Locale-Aware Number and Currency Inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/)
- [Validating International Phone Numbers](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/)
- [Card Number Formatting and Luhn Validation](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/card-number-formatting-and-luhn-validation/)

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)
