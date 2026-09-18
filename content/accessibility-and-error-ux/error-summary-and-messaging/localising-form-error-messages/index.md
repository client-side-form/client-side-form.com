---
layout: page.njk
title: "Localising Form Error Messages"
description: "Translate validation messages properly: stable message keys instead of English strings, ICU plurals and gender, field labels inside messages, locale-aware number and date formats in errors, right-to-left layout, and keeping client and server messages in one language."
slug: localising-form-error-messages
type: howto
breadcrumb: "Localising Errors"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Localising Form Error Messages"
  parent: "Error Summary and Messaging"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Localising Form Error Messages",
      "description": "Translate validation messages properly: stable message keys instead of English strings, ICU plurals and gender, field labels inside messages, locale-aware number and date formats in errors, right-to-left layout, and keeping client and server messages in one language.",
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
          "name": "Localising Form Error Messages",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/localising-form-error-messages/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Localise form validation messages",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Make validators return keys and parameters"
        },
        {
          "@type": "HowToStep",
          "name": "Store messages in ICU MessageFormat"
        },
        {
          "@type": "HowToStep",
          "name": "Prefer full sentences per field for common errors"
        },
        {
          "@type": "HowToStep",
          "name": "Format values with the locale"
        },
        {
          "@type": "HowToStep",
          "name": "Route schema and native messages through the same keys"
        },
        {
          "@type": "HowToStep",
          "name": "Make the server return keys too"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Intl.PluralRules enough without a library?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For simple count messages, yes: new Intl.PluralRules(locale).select(n) returns the category, and you pick the matching string. ICU MessageFormat libraries add nesting, selects and inline number/date formatting, which error messages need often enough to be worth it."
          }
        },
        {
          "@type": "Question",
          "name": "Should messages include the field label?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In the summary, yes — messages appear away from their fields. Inline, the label is right above, so \"Enter your email address\" works in both places. Using the same full sentence in both keeps them consistent."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle gendered languages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Where a message's grammar depends on the field's noun, give each field its own message key for common errors. For templated messages, pass a grammatical gender parameter and use ICU select — translators decide the forms."
          }
        }
      ]
    }
  ]
}
</script>

# Localising Form Error Messages

Forms are often translated except for their errors: the labels are in German, but "This field is required" appears in English because it came from a validation library's default, the server's 422 response, or a message string concatenated in code — and the plural in "You have 1 problems" is wrong in English, let alone in Polish.

Error messages are content like any other, but they are generated from rules and data at runtime, which makes them harder to translate than static labels. This page, part of [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/), sets up a message pipeline — stable keys, parameters, ICU message format, locale-aware formatting — so every error reaches the user in their language, grammatically correct, whether it was produced by the client or the server.

---

## Context and prerequisites

What makes error messages hard to localise:

- **They are assembled from parts.** "Password must be at least 12 characters" combines a field label, a rule and a number. Concatenating translated parts breaks in languages with different word order.
- **They contain plurals.** "1 problem" / "3 problems" in English; Polish, Russian and Arabic have more plural categories; Japanese has none.
- **They include formatted values.** Dates, numbers and currency in messages ("must be after 01/10/2026", "at least 1,000") must follow the locale.
- **They come from several sources.** Schema libraries, native validation (`validationMessage`, in the *browser's* language), and the server.
- **Grammar depends on the field.** In French, "Saisissez votre adresse e-mail" versus "Saisissez votre nom" — the article and possessive agree with the noun.

The solution is to treat each error as **a key plus parameters**, translated in one place using ICU MessageFormat (via `Intl.PluralRules` directly, or a library such as FormatJS or i18next with ICU support).

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of message construction approaches with an English example, what happens in another language, and the verdict." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Why string concatenation fails</title>
  <desc>Concatenating a label with a phrase such as label plus is required works in English but produces wrong word order and grammar in German and Japanese. A template with a plain number placeholder breaks plurals, giving you have 1 problems. An ICU message with plural and select clauses per locale produces correct grammar and plurals everywhere. A full sentence per field and rule, stored in the catalogue, is always correct but more work to maintain.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Approach</text>
  <text x="222.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">English</text>
  <text x="449.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Other languages</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">label + &quot; is required&quot;</text>
  <text x="222.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Email is required</text>
  <text x="449.2" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">word order and grammar break</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;{n} problems&quot;</text>
  <text x="222.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">1 problems</text>
  <text x="449.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">plural categories wrong</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">ICU plural/select</text>
  <text x="222.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">1 problem / 3 problems</text>
  <text x="449.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">correct per locale</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">sentence per field+rule</text>
  <text x="222.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">exact wording</text>
  <text x="449.2" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">exact; more to maintain</text>
</svg>

---

## The core pattern: keys, parameters, ICU messages

```typescript
// Every error in the app is a key + params. No user-facing strings in validators.
export interface ErrorDescriptor { key: string; params?: Record<string, unknown> }

// Catalogue excerpt (ICU MessageFormat). One file per locale, edited by translators.
export const messages = {
  en: {
    "field.required.email": "Enter your email address.",
    "field.required.name": "Enter your full name.",
    "field.minLength": "{label} must be at least {min, number} characters.",
    "field.dateAfter": "Enter a date after {min, date, long}.",
    "summary.heading": "{count, plural, one {There is a problem} other {There are # problems}}",
  },
  pl: {
    "field.required.email": "Wpisz swój adres e-mail.",
    "field.required.name": "Wpisz swoje imię i nazwisko.",
    "field.minLength": "{label} musi mieć co najmniej {min, number} {min, plural, one {znak} few {znaki} many {znaków} other {znaku}}.",
    "field.dateAfter": "Podaj datę późniejszą niż {min, date, long}.",
    "summary.heading": "{count, plural, one {Wystąpił # problem} few {Wystąpiły # problemy} many {Wystąpiło # problemów} other {Wystąpiło # problemu}}",
  },
} as const;
```

```typescript
import { IntlMessageFormat } from "intl-messageformat";

type Locale = keyof typeof messages;

export function translate(locale: Locale, d: ErrorDescriptor, labels: Record<string, string>): string {
  const catalogue = messages[locale] as Record<string, string>;
  // Prefer a field-specific key ("field.required.email") when it exists.
  const specific = d.params?.field ? `${d.key}.${d.params.field}` : undefined;
  const source = (specific && catalogue[specific]) ?? catalogue[d.key] ?? catalogue["field.invalid"] ?? d.key;
  const label = d.params?.field ? labels[String(d.params.field)] : undefined;
  return new IntlMessageFormat(source, locale).format({ ...d.params, label }) as string;
}

// Validators return descriptors, not sentences:
export const minLength = (field: string, min: number) => (v: string): ErrorDescriptor | null =>
  v.trim().length < min ? { key: "field.minLength", params: { field, min } } : null;
```

---

## Step-by-step walkthrough

1. **Make validators return keys and parameters.** `{ key: "field.minLength", params: { field: "password", min: 12 } }`. Rendering decides the language; validation does not.
2. **Store messages in ICU MessageFormat.** Plurals (`{count, plural, …}`), selects (`{gender, select, …}`) and formatted arguments (`{min, number}`, `{date, date, long}`) are handled per locale by the formatter.
3. **Prefer full sentences per field for common errors.** "Enter your email address" as its own key reads naturally in every language; use templates with `{label}` for the long tail.
4. **Format values with the locale.** Numbers and dates inside messages go through ICU arguments, so "1,000" becomes "1 000" in French and dates follow local order — the same concern as [locale-aware number and currency inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/).
5. **Route schema and native messages through the same keys.** Map schema issue codes to keys with an error map, as in [custom Zod error maps and localised messages](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/custom-zod-error-maps-and-localised-messages/), and replace native `validationMessage` (which is in the browser's language) with your own.
6. **Make the server return keys too.** Return `code` and `params` in error responses and translate on the client, or have the server translate with the request's locale. Never mix languages on one screen.

### Why keys beat English strings as identifiers

Using the English sentence as the translation key ("Enter your email address.") seems convenient until the English wording changes: every translation keyed on the old sentence becomes orphaned, or worse, silently falls back to English. Stable, meaningful keys (`field.required.email`) decouple the identifier from the wording, so copy editors can improve English messages without breaking other languages, and translators can see what a message is for from its key. Keys also make the connection between validators and messages explicit and searchable — you can find every place that can produce `field.minLength`.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow from a validator returning a key and parameters, through choosing a field-specific or generic message, formatting with ICU for the user&#x27;s locale, to rendering inline and in the summary." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>From a failed rule to a localised sentence</title>
  <desc>The minimum length validator returns the key field.minLength with parameters field password and min twelve. The translator looks for a field-specific key first and falls back to the generic key. It formats the ICU message for the user&#x27;s locale, inserting the translated label and formatting the number, and applying plural rules. The resulting sentence is rendered both inline next to the field and in the error summary.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="412.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Validator result</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">{ key: field.minLength, params: { field, min: 12 } }</text>
  <text x="456.2" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No language in validation code.</text>
  <path d="M220.1,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.1,89.0 220.1,96.0 224.1,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="412.2" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Choose the message</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">field-specific key, else generic.</text>
  <text x="456.2" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Common errors get natural full sentences.</text>
  <path d="M220.1,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.1,174.0 220.1,181.0 224.1,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="412.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">ICU format for the locale</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">label, number, plural rules.</text>
  <text x="456.2" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Hasło musi mieć co najmniej 12 znaków.&quot;</text>
  <path d="M220.1,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="216.1,259.0 220.1,266.0 224.1,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="412.2" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Render in both places</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Inline and in the summary.</text>
  <text x="456.2" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same text, one source.</text>
</svg>

---

## Failure modes and edge cases

### 1. Browser-native messages in the wrong language

`input.validationMessage` is in the browser's UI language, not your page's. A French page in an English browser shows English bubbles. Use `novalidate` and your own messages, per [using the Constraint Validation API with custom form state](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/).

### 2. Right-to-left languages

In Arabic and Hebrew, error icons and alignment must mirror, and mixed-direction content (an email address inside an RTL sentence) needs isolation. Wrap user-supplied values in `<bdi>` or use Unicode isolates, and set `dir` on the form.

### 3. Hidden "Error:" prefixes

Visually hidden prefixes for screen readers ("Error: ") must be translated too. Put them in the catalogue with the other messages.

### 4. Message length

German and Finnish messages can be much longer than English ones. Error containers must wrap text and not truncate; test with the longest locale and at 200% zoom.

### 5. Server messages in the wrong locale

A server that returns English `detail` strings in Problem Details responses breaks localisation. Either send `Accept-Language` and have the server translate, or rely on `code` and translate on the client, as in [problem details (RFC 9457) for form errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/problem-details-rfc-9457-for-form-errors/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing the sources of form error text — your validators, schema libraries, native browser validation and the server — with how each should be localised." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Sources of error text and how to localise each</title>
  <desc>Your own validators return keys and parameters that are translated in the catalogue. Schema libraries are routed through an error map that converts issue codes to the same keys. Native browser validation messages are replaced by your own via novalidate and custom rendering, because they follow the browser language. The server returns codes and parameters, or messages translated using the request&#x27;s Accept-Language.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Your validators</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Return keys + params.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Schema library</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Error map → same keys.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Native validation</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Browser language.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Replace with yours.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Server</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Codes + params, or</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Accept-Language.</text>
</svg>

---

## Verification checklist

- [ ] No validator returns a hard-coded user-facing sentence.
- [ ] Every error key exists in every supported locale's catalogue.
- [ ] Plurals render correctly for 0, 1, 2, 5 and 22 in each locale.
- [ ] Numbers and dates inside messages follow the locale.
- [ ] Native browser validation messages never appear.
- [ ] Server errors arrive in the user's language or as codes translated on the client.
- [ ] Right-to-left layouts mirror error icons and isolate embedded values.
- [ ] Long translations wrap without truncation at 200% zoom.

---

## Frequently Asked Questions

<details>
<summary><strong>Is Intl.PluralRules enough without a library?</strong></summary>

For simple count messages, yes: `new Intl.PluralRules(locale).select(n)` returns the category, and you pick the matching string. ICU MessageFormat libraries add nesting, selects and inline number/date formatting, which error messages need often enough to be worth it.

</details>

<details>
<summary><strong>Should messages include the field label?</strong></summary>

In the summary, yes — messages appear away from their fields. Inline, the label is right above, so "Enter your email address" works in both places. Using the same full sentence in both keeps them consistent.

</details>

<details>
<summary><strong>How do I handle gendered languages?</strong></summary>

Where a message's grammar depends on the field's noun, give each field its own message key for common errors. For templated messages, pass a grammatical gender parameter and use ICU `select` — translators decide the forms.

</details>

---

## Related

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
- [Writing Error Messages That Tell the Reader What to Do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/)
- [Custom Zod Error Maps and Localised Messages](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/custom-zod-error-maps-and-localised-messages/)

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
