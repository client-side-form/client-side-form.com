---
layout: page.njk
title: "Card Number Formatting and Luhn Validation"
description: "Format payment card numbers by brand as users type, detect the brand from the prefix, validate length and the Luhn checksum, handle expiry and security code fields — and know when to use a payment provider's hosted fields instead."
slug: card-number-formatting-and-luhn-validation
type: howto
breadcrumb: "Card Numbers & Luhn"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Card Number Formatting and Luhn Validation"
  parent: "Input Masking and Formatting"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Card Number Formatting and Luhn Validation",
      "description": "Format payment card numbers by brand as users type, detect the brand from the prefix, validate length and the Luhn checksum, handle expiry and security code fields — and know when to use a payment provider's hosted fields instead.",
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
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Card Number Formatting and Luhn Validation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/card-number-formatting-and-luhn-validation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Format and validate payment card numbers",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Prefer the payment provider's hosted fields for real payments"
        },
        {
          "@type": "HowToStep",
          "name": "Use the right input attributes for any card-like field"
        },
        {
          "@type": "HowToStep",
          "name": "Detect the brand from the first digits"
        },
        {
          "@type": "HowToStep",
          "name": "Group digits by brand, preserving the caret"
        },
        {
          "@type": "HowToStep",
          "name": "Validate length and Luhn on blur"
        },
        {
          "@type": "HowToStep",
          "name": "Treat the provider's decline as the real answer"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is it safe to validate card numbers in JavaScript?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Validation itself is harmless, but any code that reads raw card numbers is in the path of that data. For real payments, use hosted fields so your scripts — and any third-party scripts on the page — never see the number. The techniques here then apply to other numbers that use Luhn, such as some identity and account numbers."
          }
        },
        {
          "@type": "Question",
          "name": "Which numbers can I use for testing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use your payment provider's published test numbers, such as 4111 1111 1111 1111, which are Luhn-valid but not real cards. Never use real card numbers in tests or fixtures."
          }
        },
        {
          "@type": "Question",
          "name": "Should I block the form until the card number is valid?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Validate on blur and on submit, show specific messages, and move focus to the problem, as with any field. Disabling the pay button until everything validates hides the reason from users, as discussed in disabling submit buttons without hiding the reason."
          }
        }
      ]
    }
  ]
}
</script>

# Card Number Formatting and Luhn Validation

Card number fields fail users in small, costly ways: a 15-digit American Express card grouped in fours looks wrong and gets retyped, a single mistyped digit is only discovered when the payment is declined, and a mask that blocks spaces rejects the number a user pasted from their banking app.

A well-built card field groups digits the way the card is printed, detects the brand from the first digits, and catches almost every single-digit typo instantly with the Luhn checksum — all before anything is sent. This page, part of [input masking and formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/), implements those checks, and is clear about the most important decision: in most production payment forms, the card field itself should be a payment provider's hosted field, and these techniques apply to it via the provider's API or to non-payment card-like numbers.

---

## Context and prerequisites

The relevant facts:

- **Brand by prefix (IIN/BIN).** Visa starts with `4`; Mastercard with `51–55` or `2221–2720`; American Express with `34` or `37`; Discover with `6011`, `644–649` or `65`; and so on. The prefix determines length and grouping.
- **Lengths.** Visa 13, 16 or 19; Mastercard 16; Amex 15; others vary between 12 and 19.
- **Grouping.** Most 16-digit cards print `4-4-4-4`; Amex prints `4-6-5`; 19-digit cards often `4-4-4-4-3`.
- **Luhn checksum.** A mod-10 check digit that detects every single-digit error and most adjacent transpositions. It says nothing about whether the card exists.
- **PCI DSS scope.** Handling raw card numbers in your own page brings your front end into compliance scope. Payment providers' hosted fields (iframes) keep the number out of your code entirely.

<svg viewBox="0 0 680 194" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common card brands with their identifying prefixes, valid lengths, print grouping and security code length." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Common card brands, lengths and grouping</title>
  <desc>Visa cards start with 4, have 13, 16 or 19 digits, are grouped 4-4-4-4 and use a 3-digit security code. Mastercard starts with 51 to 55 or 2221 to 2720, has 16 digits, grouped 4-4-4-4, with a 3-digit code. American Express starts with 34 or 37, has 15 digits, grouped 4-6-5, with a 4-digit code on the front. Discover starts with 6011, 644 to 649 or 65, has 16 to 19 digits, grouped 4-4-4-4, with a 3-digit code.</desc>
  <rect x="0" y="0" width="680" height="194" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Brand</text>
  <text x="157.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Prefix</text>
  <text x="343.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Length</text>
  <text x="463.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Grouping</text>
  <text x="596.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">CVC</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Visa</text>
  <text x="157.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4</text>
  <text x="343.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">13, 16, 19</text>
  <text x="463.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4-4-4-4</text>
  <text x="596.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">3</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Mastercard</text>
  <text x="157.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">51–55, 2221–2720</text>
  <text x="343.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">16</text>
  <text x="463.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4-4-4-4</text>
  <text x="596.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">3</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">American Express</text>
  <text x="157.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">34, 37</text>
  <text x="343.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">15</text>
  <text x="463.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4-6-5</text>
  <text x="596.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Discover</text>
  <text x="157.1" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">6011, 644–649, 65</text>
  <text x="343.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">16–19</text>
  <text x="463.1" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4-4-4-4</text>
  <text x="596.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">3</text>
  <text x="14.0" y="182.0" font-size="10" fill="#6b5f75" font-family="inherit">Prefix ranges change over time; keep the table in data you can update, and let the payment provider be the final authority.</text>
</svg>

---

## The core pattern: brand detection, grouping and Luhn

```typescript
interface Brand { id: string; name: string; test: (d: string) => boolean; lengths: number[]; groups: number[]; cvc: number }

const inRange = (d: string, lo: number, hi: number, len: number) => {
  const p = Number(d.slice(0, len));
  return d.length >= len && p >= lo && p <= hi;
};

// Ordered: more specific prefixes first.
export const BRANDS: Brand[] = [
  { id: "amex", name: "American Express", test: (d) => /^3[47]/.test(d), lengths: [15], groups: [4, 6, 5], cvc: 4 },
  { id: "mastercard", name: "Mastercard", test: (d) => /^5[1-5]/.test(d) || inRange(d, 2221, 2720, 4), lengths: [16], groups: [4, 4, 4, 4], cvc: 3 },
  { id: "discover", name: "Discover", test: (d) => /^(6011|64[4-9]|65)/.test(d), lengths: [16, 17, 18, 19], groups: [4, 4, 4, 4, 3], cvc: 3 },
  { id: "visa", name: "Visa", test: (d) => /^4/.test(d), lengths: [13, 16, 19], groups: [4, 4, 4, 4, 3], cvc: 3 },
];

export const detectBrand = (digits: string) => BRANDS.find((b) => b.test(digits));

export function groupDigits(digits: string): string {
  const groups = detectBrand(digits)?.groups ?? [4, 4, 4, 4, 3];
  const out: string[] = [];
  let i = 0;
  for (const g of groups) { if (i >= digits.length) break; out.push(digits.slice(i, i + g)); i += g; }
  if (i < digits.length) out.push(digits.slice(i));
  return out.join(" ");
}

/** Luhn mod-10: double every second digit from the right, subtract 9 if > 9, sum, check % 10. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function checkCardNumber(raw: string): { ok: true; digits: string; brand?: Brand } | { ok: false; message: string } {
  const digits = raw.replace(/[\s-]/g, "");
  if (!digits) return { ok: false, message: "Enter your card number." };
  if (/\D/.test(digits)) return { ok: false, message: "Card numbers contain only digits." };
  const brand = detectBrand(digits);
  const allowed = brand?.lengths ?? [12, 13, 14, 15, 16, 17, 18, 19];
  if (!allowed.includes(digits.length)) {
    return { ok: false, message: brand ? `${brand.name} card numbers have ${allowed.join(" or ")} digits.` : "Check the number of digits in your card number." };
  }
  if (!luhnValid(digits)) return { ok: false, message: "Check your card number — one of the digits may be mistyped." };
  return { ok: true, digits, brand };
}
```

---

## Step-by-step walkthrough

1. **Prefer the payment provider's hosted fields for real payments.** They handle formatting, brand detection and validation, and keep raw card numbers out of your page. Use their events (`change`, `error`) to integrate with your form's error summary and focus management.
2. **Use the right input attributes for any card-like field.** `type="text"`, `inputmode="numeric"`, `autocomplete="cc-number"` (so browsers offer saved cards), and no `maxlength` on the display value.
3. **Detect the brand from the first digits.** Update grouping and the expected security-code length as soon as the prefix is known, and show the brand name as text (not only a logo).
4. **Group digits by brand, preserving the caret.** Live grouping helps users check long numbers; apply the caret mapping from [preserving caret position in masked inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/).
5. **Validate length and Luhn on blur.** A Luhn failure means a typo; say so specifically. Do not show "invalid card" before the user has finished typing.
6. **Treat the provider's decline as the real answer.** A Luhn-valid number can still be declined; map provider errors (expired, insufficient funds, incorrect CVC) to form-level or field-level messages.

### Why Luhn catches typos so well

The Luhn algorithm was designed to catch the mistakes people make when copying numbers by hand. Changing any single digit always changes the checksum, so every single-digit typo is detected. Swapping two adjacent digits is detected in all cases except swapping `0` and `9`. Those two error types — one wrong digit, two digits swapped — account for the large majority of transcription errors, which is why a Luhn check on blur prevents most "your card was declined" round trips caused by typing rather than by the card itself. It is not a security measure and not a check that the card exists; it is a cheap, instant typo detector.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of the Luhn algorithm applied to the test number 4111 1111 1111 1111, showing doubling every second digit from the right, subtracting nine where needed, summing and checking divisibility by ten." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Luhn on a 16-digit number</title>
  <desc>Take the digits of 4111 1111 1111 1111. Starting from the rightmost digit, leave it, double the next, and alternate. The doubled positions are the eight digits in odd positions from the left: 4 becomes 8 and each 1 becomes 2. The undoubled digits are all 1. The sum is 8 plus seven 2s plus eight 1s, which is 8 plus 14 plus 8, equal to 30. Thirty is divisible by ten, so the number passes. Changing any single digit changes the sum and fails the check.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="410.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Digits</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1</text>
  <text x="454.1" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Test number, not a real card.</text>
  <path d="M219.1,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="215.1,89.0 219.1,96.0 223.1,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="410.1" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Double every second from the right</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">8 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1</text>
  <text x="454.1" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Subtract 9 from any result over 9 (none here).</text>
  <path d="M219.1,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="215.1,174.0 219.1,181.0 223.1,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="410.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Sum</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">8 + 7×2 + 8×1 = 30</text>
  <text x="454.1" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Any single-digit change alters this sum.</text>
  <path d="M219.1,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="215.1,259.0 219.1,266.0 223.1,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="410.1" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">30 % 10 = 0</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Passes.</text>
  <text x="454.1" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Typo-free as far as Luhn can tell.</text>
</svg>

---

## Failure modes and edge cases

### 1. Grouping Amex as 4-4-4-4

Amex cards are printed `3782 822463 10005`. Grouping them in fours makes the typed number look different from the card and invites re-checking. Switch grouping as soon as `34` or `37` is detected.

### 2. Rejecting unknown brands

New BIN ranges and regional schemes appear regularly. Treat an unrecognised prefix as "unknown brand" with generic length rules, not as invalid; the provider will decide.

### 3. `maxlength` truncating pastes

`maxlength="19"` on a field with spaces truncates a pasted 19-digit number with separators. Validate digit count, not display length.

### 4. Security code length

Show the expected length from the detected brand (4 for Amex, 3 otherwise) in the hint and validate accordingly; describe where to find it in text, not only with an image.

### 5. Expiry dates

Accept `MM/YY`, `MM / YY` and `MMYY`; validate that the month is 1–12 and that the card is not expired, comparing against the *end* of the expiry month. Use `autocomplete="cc-exp"` (or `cc-exp-month` and `cc-exp-year` for separate fields).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting a card field built in your own page with a payment provider&#x27;s hosted field, across compliance scope and what you still own." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Your code or the provider&#x27;s?</title>
  <desc>A card field built in your own page gives full control over formatting and messages but puts raw card numbers in your code and your compliance scope. A provider&#x27;s hosted field keeps card numbers out of your page and handles formatting and validation, while you still own the surrounding form, the error summary, focus management and messages mapped from the provider&#x27;s events.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Built in your page</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Full control of UX.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Raw card data in your code and compliance scope.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Good for card-like numbers that are not payments.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Provider hosted field</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Card data never touches your page.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">You own: summary, focus, mapped messages.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Default for real payments.</text>
</svg>

---

## Verification checklist

- [ ] Real payments use the provider's hosted fields; your form integrates their events.
- [ ] Card-like fields use `inputmode="numeric"` and the right `autocomplete` tokens.
- [ ] Grouping matches the printed card, including Amex 4-6-5.
- [ ] Brand is shown as text as soon as it is detected.
- [ ] Length and Luhn are validated on blur with specific messages.
- [ ] Pasted numbers with spaces or dashes are accepted and not truncated.
- [ ] Unknown brands are not rejected outright.
- [ ] Expiry validation compares against the end of the expiry month.

---

## Frequently Asked Questions

<details>
<summary><strong>Is it safe to validate card numbers in JavaScript?</strong></summary>

Validation itself is harmless, but any code that reads raw card numbers is in the path of that data. For real payments, use hosted fields so your scripts — and any third-party scripts on the page — never see the number. The techniques here then apply to other numbers that use Luhn, such as some identity and account numbers.

</details>

<details>
<summary><strong>Which numbers can I use for testing?</strong></summary>

Use your payment provider's published test numbers, such as `4111 1111 1111 1111`, which are Luhn-valid but not real cards. Never use real card numbers in tests or fixtures.

</details>

<details>
<summary><strong>Should I block the form until the card number is valid?</strong></summary>

No. Validate on blur and on submit, show specific messages, and move focus to the problem, as with any field. Disabling the pay button until everything validates hides the reason from users, as discussed in [disabling submit buttons without hiding the reason](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/disabling-submit-buttons-accessibly/).

</details>

---

## Related

- [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
- [Locale-Aware Number and Currency Inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/)
- [Autocomplete Tokens for Autofill-Friendly Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/)

← [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
