---
layout: page.njk
title: "Validating International Phone Numbers"
description: "Replace country-specific phone masks with a phone-number library: parse any format with a default country, validate by number type, store E.164, format for display, handle country selectors, extensions and autofill — and keep the bundle reasonable."
slug: validating-international-phone-numbers
type: howto
breadcrumb: "International Phones"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validating International Phone Numbers"
  parent: "Input Masking and Formatting"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating International Phone Numbers",
      "description": "Replace country-specific phone masks with a phone-number library: parse any format with a default country, validate by number type, store E.164, format for display, handle country selectors, extensions and autofill — and keep the bundle reasonable.",
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
          "name": "Validating International Phone Numbers",
          "item": "https://client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate and store international phone numbers correctly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Use type=\"tel\" and autocomplete=\"tel\""
        },
        {
          "@type": "HowToStep",
          "name": "Choose a default country deliberately"
        },
        {
          "@type": "HowToStep",
          "name": "Parse leniently"
        },
        {
          "@type": "HowToStep",
          "name": "Validate on blur"
        },
        {
          "@type": "HowToStep",
          "name": "Store E.164"
        },
        {
          "@type": "HowToStep",
          "name": "Display in the user's context"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I validate phone numbers with a regex?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only very loosely — for example \"a + or digit followed by 7 to 15 digits and common separators\". That catches typing mistakes but not invalid ranges, and it cannot normalise to E.164. Use a regex as a quick pre-check at most."
          }
        },
        {
          "@type": "Question",
          "name": "Should the field be required?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only if you genuinely need it. Phone numbers are sensitive personal data; ask for them when there is a clear purpose and say what it is in the hint. If contact can be by phone or email, see requiring at least one of several fields."
          }
        },
        {
          "@type": "Question",
          "name": "Does the server need the same library?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, or its equivalent in the server language (libphonenumber exists for Java, C++, Python and others). The server should re-parse and store E.164 itself rather than trusting the client's normalised value."
          }
        }
      ]
    }
  ]
}
</script>

# Validating International Phone Numbers

A phone field masked as `(___) ___-____` rejects every number outside North America, and a regex like `^\d{10,11}$` rejects the same UK number written as `+44 7700 900123`, `07700 900123` or `07700-900-123` — while happily accepting `0000000000`.

Phone numbering is a genuinely complex, per-country, frequently updated dataset, which is why this field should use a library built on it — typically `libphonenumber-js`, a JavaScript port of Google's libphonenumber metadata. This page, part of [input masking and formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/), parses whatever users type, validates against real numbering plans, stores numbers in E.164, and presents them nicely — without a fixed mask.

---

## Context and prerequisites

Concepts the library handles:

- **Default country.** `07700 900123` is only meaningful with a country. Parse with the user's likely country (from locale, address or a selector); numbers typed with `+` and a country code override it.
- **E.164** — the canonical international format: `+447700900123`. Store and compare this; it is unambiguous.
- **Validity levels.** *Possible* (right length for the country) versus *valid* (matches the numbering plan's patterns). Validity data changes as countries add ranges, so keep the library updated.
- **Number type.** Mobile, fixed line, toll-free, premium — useful when the field must receive SMS.
- **Formatting.** National (`07700 900123`), international (`+44 7700 900123`) and an as-you-type formatter.

Metadata size is the main trade-off: full metadata is large; `libphonenumber-js` offers `min` metadata (validity by length only), `max` (full patterns, larger) and custom builds for the countries you serve.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of several ways a user might type the same UK mobile number and the E.164 result produced by parsing with a default country of GB." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One number, many ways to type it</title>
  <desc>The inputs 07700 900123, 07700-900-123, +44 7700 900123, 0044 7700 900123 and +44 (0) 7700 900123 all parse, with default country GB, to the same E.164 value plus 447700900123. The input 0000 000000 parses but is not valid because no numbering range matches.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Typed</text>
  <text x="246.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Default country</text>
  <text x="379.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">E.164</text>
  <text x="572.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Valid</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">07700 900123</text>
  <text x="246.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">GB</text>
  <text x="379.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
  <text x="572.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">07700-900-123</text>
  <text x="246.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">GB</text>
  <text x="379.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
  <text x="572.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">+44 7700 900123</text>
  <text x="246.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">(ignored)</text>
  <text x="379.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
  <text x="572.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">+44 (0) 7700 900123</text>
  <text x="246.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">(ignored)</text>
  <text x="379.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
  <text x="572.3" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">0000 000000</text>
  <text x="246.3" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">GB</text>
  <text x="379.6" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="572.3" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
</svg>

---

## The core pattern: parse with a default country, validate, store E.164

```typescript
import { parsePhoneNumberFromString, AsYouType, type CountryCode } from "libphonenumber-js/max";

export type PhoneResult =
  | { ok: true; e164: string; national: string; international: string; country?: CountryCode; type?: string }
  | { ok: false; message: string };

export function checkPhone(raw: string, defaultCountry: CountryCode, opts: { requireMobile?: boolean } = {}): PhoneResult {
  const text = raw.trim();
  if (!text) return { ok: false, message: "Enter a phone number." };

  // Extensions: accept "ext. 123", "x123", "#123" — the library recognises common forms.
  const phone = parsePhoneNumberFromString(text, defaultCountry);
  if (!phone) {
    return { ok: false, message: "Enter a phone number, like 07700 900123 or +44 7700 900123." };
  }
  if (!phone.isPossible()) {
    return { ok: false, message: "This phone number is too short or too long." };
  }
  if (!phone.isValid()) {
    return { ok: false, message: "Enter a valid phone number. Check the area code and number." };
  }
  const type = phone.getType();   // "MOBILE", "FIXED_LINE", "FIXED_LINE_OR_MOBILE", ...
  if (opts.requireMobile && type && !["MOBILE", "FIXED_LINE_OR_MOBILE"].includes(type)) {
    return { ok: false, message: "Enter a mobile number so we can send you a text." };
  }
  return {
    ok: true,
    e164: phone.number,                           // "+447700900123" — store this
    national: phone.formatNational(),             // "07700 900123"
    international: phone.formatInternational(),   // "+44 7700 900123"
    country: phone.country,
    type,
  };
}

// Optional light formatting while typing, preserving user intent.
export function formatAsYouType(text: string, defaultCountry: CountryCode) {
  return new AsYouType(defaultCountry).input(text);
}
```

```html
<label for="phone">Mobile number</label>
<p id="phone-hint">We'll text a code to this number. Include the country code if it's not a UK number.</p>
<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"
       aria-describedby="phone-hint" dir="ltr">
```

---

## Step-by-step walkthrough

1. **Use `type="tel"` and `autocomplete="tel"`.** Mobile users get the phone keypad; autofill offers saved numbers — see [autocomplete tokens for autofill-friendly forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/).
2. **Choose a default country deliberately.** From the user's address country, account locale, or a country selector; not just `navigator.language`, which reflects language, not location.
3. **Parse leniently.** Accept spaces, dashes, brackets, dots and `+`; let the library strip them. Never block characters in the input.
4. **Validate on blur.** Check possible, then valid, then (if needed) type. Show specific messages; the library tells you which check failed.
5. **Store E.164.** It is the only representation that compares correctly across formats and countries.
6. **Display in the user's context.** National format for numbers in the user's country, international for others. Format on blur, or as you type with `AsYouType` if you apply caret mapping, per [preserving caret position in masked inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/).

### Why the only real validation is a message that arrives

A number can be valid by every numbering-plan rule and still not belong to the user — mistyped by one digit into someone else's valid number, or disconnected last month. Library validation catches malformed and impossible numbers quickly, which is its job. When the number matters (two-factor authentication, delivery updates), confirm it by sending a one-time code, and design the confirmation step so users can easily correct the number if the code does not arrive. The code-entry field has its own accessibility and autofill considerations, covered in [one-time code inputs: keyboard, paste and autofill](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/one-time-code-inputs-keyboard-paste-and-autofill/).

<svg viewBox="0 0 680 383" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for a phone number from empty, through unparsable, impossible length and invalid number, to the wrong type for SMS, each with its message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which message for a phone number</title>
  <desc>If the field is empty, say enter a phone number. If it cannot be parsed at all, show an example in national and international format. If it parses but has an impossible length, say it is too short or too long. If it has a possible length but no valid numbering range, ask the user to check the area code and number. If a mobile is required and the type is fixed line, ask for a mobile so a text can be sent. Otherwise the number is accepted and stored in E.164.</desc>
  <rect x="0" y="0" width="680" height="383" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Parses at all?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;Enter a phone number, like 07700 900123…&quot;</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Possible length?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;This phone number is too short or too long.&quot;</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Valid for the numbering plan?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;Check the area code and number.&quot;</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="237.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="260.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Mobile required but fixed line?</text>
  <rect x="340.0" y="237.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="352.0" y="260.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">&quot;Enter a mobile number so we can text you.&quot;</text>
  <path d="M284.0,257.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,253.5 339.0,257.5 332.0,261.5" fill="#7b4f8a"/>
  <text x="312.0" y="251.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,278.0 V304.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,304.0 149.0,311.0 153.0,304.0" fill="#7b4f8a"/>
  <text x="159.0" y="296.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="312.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="335.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Accept; store E.164</text>
  <text x="26.0" y="353.0" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
</svg>

---

## Failure modes and edge cases

### 1. The trunk prefix in international format

`+44 (0) 7700 900123` includes the UK trunk prefix `0` in brackets — common in business signatures and incorrect when dialling internationally. The library handles it; a hand-written parser usually produces an invalid number.

### 2. Metadata size

`libphonenumber-js/max` includes full validation patterns and is considerably larger than `/min`. If you serve a known set of countries, generate custom metadata; if bundle size is critical, use `/min` on the client for length checks and full validation on the server.

### 3. Country selectors

A country dropdown next to the field is helpful for international audiences, but users often paste numbers with `+` that disagree with the selected country. Let the `+` prefix win and update the selector, rather than rejecting the number.

### 4. Extensions

Business numbers may include extensions. Store the extension separately (`phone.ext`) or in the RFC 3966 URI form, and do not strip it silently.

### 5. Right-to-left pages

Phone numbers are left-to-right strings. In RTL layouts, set `dir="ltr"` on the input so digits and `+` do not render in confusing order.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the representations of a phone number — E.164 for storage, national format for domestic display and international format for foreign numbers." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to store, what to show</title>
  <desc>Store the E.164 form, such as plus 447700900123, because it compares correctly and can be dialled from anywhere. Show numbers in the user&#x27;s own country in national format, such as 07700 900123. Show numbers from other countries in international format, such as plus 44 7700 900123, so the country code is visible.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Store: E.164</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">+447700900123</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Unambiguous; compares correctly.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Show (same country)</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">07700 900123</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">National format.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Show (other country)</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">+44 7700 900123</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">International format.</text>
</svg>

---

## Verification checklist

- [ ] Numbers typed with spaces, dashes, brackets or dots are accepted.
- [ ] Numbers with `+` and a country code parse regardless of the default country.
- [ ] Impossible lengths and invalid ranges get distinct messages.
- [ ] Numbers are stored in E.164.
- [ ] Display uses national format for the user's country and international otherwise.
- [ ] The input uses `type="tel"`, `autocomplete="tel"` and `dir="ltr"`.
- [ ] Where the number matters, it is confirmed with a one-time code.
- [ ] Library metadata is kept up to date.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I validate phone numbers with a regex?</strong></summary>

Only very loosely — for example "a `+` or digit followed by 7 to 15 digits and common separators". That catches typing mistakes but not invalid ranges, and it cannot normalise to E.164. Use a regex as a quick pre-check at most.

</details>

<details>
<summary><strong>Should the field be required?</strong></summary>

Only if you genuinely need it. Phone numbers are sensitive personal data; ask for them when there is a clear purpose and say what it is in the hint. If contact can be by phone or email, see [requiring at least one of several fields](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/requiring-at-least-one-of-several-fields/).

</details>

<details>
<summary><strong>Does the server need the same library?</strong></summary>

Yes, or its equivalent in the server language (libphonenumber exists for Java, C++, Python and others). The server should re-parse and store E.164 itself rather than trusting the client's normalised value.

</details>

---

## Related

- [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
- [Email Validation Without Regex Overreach](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/email-validation-without-regex-overreach/)
- [Card Number Formatting and Luhn Validation](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/card-number-formatting-and-luhn-validation/)

← [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
