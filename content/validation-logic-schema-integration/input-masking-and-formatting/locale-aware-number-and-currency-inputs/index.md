---
layout: page.njk
title: "Locale-Aware Number and Currency Inputs"
description: "Accept '1.234,56' from German users and '1,234.56' from American ones: parse numbers with the locale's own separators derived from Intl.NumberFormat, format on blur, handle currency minor units and precision, and avoid floating-point totals."
slug: locale-aware-number-and-currency-inputs
type: howto
breadcrumb: "Locale Numbers & Currency"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Locale-Aware Number and Currency Inputs"
  parent: "Input Masking and Formatting"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Locale-Aware Number and Currency Inputs",
      "description": "Accept '1.234,56' from German users and '1,234.56' from American ones: parse numbers with the locale's own separators derived from Intl.NumberFormat, format on blur, handle currency minor units and precision, and avoid floating-point totals.",
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
          "name": "Locale-Aware Number and Currency Inputs",
          "item": "https://client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Parse and format numbers and currency by locale",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Know the user's locale"
        },
        {
          "@type": "HowToStep",
          "name": "Derive separators from formatToParts"
        },
        {
          "@type": "HowToStep",
          "name": "Parse leniently, then check strictly"
        },
        {
          "@type": "HowToStep",
          "name": "Store money as integer minor units"
        },
        {
          "@type": "HowToStep",
          "name": "Take precision from the currency"
        },
        {
          "@type": "HowToStep",
          "name": "Format on blur with Intl"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is there really no Intl parser?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Correct — ECMAScript's Intl formats but does not parse numbers. Libraries exist that build parsers from locale data; the formatToParts approach here covers the common cases with no dependency."
          }
        },
        {
          "@type": "Question",
          "name": "Should I use type=\"number\" for amounts?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Browsers parse type=\"number\" inconsistently across locales, reject grouping separators, and change values on scroll. Use type=\"text\" with inputmode=\"decimal\"."
          }
        },
        {
          "@type": "Question",
          "name": "How do I show the currency symbol?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Put the currency code or symbol outside the input as a visible prefix or suffix, and include it in the label (\"Amount (EUR)\"). Keeping it outside the editable text avoids caret and parsing complications."
          }
        }
      ]
    }
  ]
}
</script>

# Locale-Aware Number and Currency Inputs

A German user types `1.234,56` into an amount field and the form either rejects it or — worse — stores `1.234` because `parseFloat` stopped at the comma; a French user types `1 234,56` with a narrow no-break space and gets "Enter a number". `Intl.NumberFormat` can *format* in every locale, but there is no built-in `Intl` number *parser*.

This page, part of [input masking and formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/), builds a parser from the locale's own formatting conventions, formats on blur with `Intl`, and handles currency precisely — in integer minor units, with the right number of decimal places per currency.

---

## Context and prerequisites

What varies by locale:

- **Decimal separator** — `.` (en-US, en-GB), `,` (de-DE, fr-FR, es-ES), `٫` (some Arabic locales).
- **Grouping separator** — `,` (en-US), `.` (de-DE), narrow no-break space `U+202F` (fr-FR), apostrophe `’` (de-CH), or none.
- **Grouping pattern** — thousands in most locales; lakh/crore grouping in en-IN (`12,34,567`).
- **Digits** — Latin digits in most locales, but Arabic-Indic (`٠١٢`) and others in some.
- **Currency** — symbol position, spacing, and the number of minor units: USD and EUR have 2, JPY has 0, KWD and BHD have 3.

`Intl.NumberFormat.prototype.formatToParts` reveals the decimal and group characters for any locale, which is enough to build a reliable parser. For currency, `resolvedOptions().maximumFractionDigits` on a currency formatter gives the minor-unit count.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the amount one million two hundred thirty four thousand five hundred sixty seven point eight nine formatted in five locales, with each locale&#x27;s decimal and grouping separators." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The same amount in five locales</title>
  <desc>In en-US the amount is written with commas for grouping and a dot for decimals. In de-DE dots group and a comma marks decimals. In fr-FR a narrow no-break space groups and a comma marks decimals. In de-CH an apostrophe groups and a dot marks decimals. In en-IN grouping follows the lakh pattern, with commas after the first three digits and then every two.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Locale</text>
  <text x="137.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Display</text>
  <text x="364.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Decimal</text>
  <text x="477.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Grouping</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">en-US</text>
  <text x="137.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">1,234,567.89</text>
  <text x="364.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.</text>
  <text x="477.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">, every 3</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">de-DE</text>
  <text x="137.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1.234.567,89</text>
  <text x="364.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">,</text>
  <text x="477.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">. every 3</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">fr-FR</text>
  <text x="137.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">1 234 567,89</text>
  <text x="364.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">,</text>
  <text x="477.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">narrow no-break space</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">de-CH</text>
  <text x="137.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1’234’567.89</text>
  <text x="364.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">.</text>
  <text x="477.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">’ every 3</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">en-IN</text>
  <text x="137.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">12,34,567.89</text>
  <text x="364.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.</text>
  <text x="477.6" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">, lakh pattern</text>
</svg>

---

## The core pattern: a parser derived from Intl, and minor-unit currency

```typescript
export interface LocaleNumber {
  parse(text: string): number | null;
  format(n: number): string;
}

export function localeNumber(locale: string, options: Intl.NumberFormatOptions = {}): LocaleNumber {
  const fmt = new Intl.NumberFormat(locale, options);
  const parts = fmt.formatToParts(1234567.891);
  const group = parts.find((p) => p.type === "group")?.value ?? "";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";

  // Map the locale's digits (e.g. Arabic-Indic) to 0–9.
  const digits = [...new Intl.NumberFormat(locale, { useGrouping: false }).format(9876543210)].reverse();
  const digitMap = new Map(digits.map((d, i) => [d, String(i)]));

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Accept the locale's group char AND ordinary/no-break spaces users actually type.
  const groupRe = new RegExp(`[${esc(group)}\\s\\u00A0\\u202F]`, "g");

  return {
    parse(text) {
      let t = text.trim();
      if (t === "") return null;
      t = [...t].map((c) => digitMap.get(c) ?? c).join("");
      t = t.replace(/[^\d\-+.,'’\s  ٫]/g, "");   // drop currency symbols and letters
      t = t.replace(groupRe, "");
      if (decimal !== ".") t = t.split(decimal).join(".");
      // Anything left that is not a plain number means the input was ambiguous or wrong.
      if (!/^[-+]?\d*(?:\.\d*)?$/.test(t) || t === "" || t === "." || t === "-") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    },
    format: (n) => fmt.format(n),
  };
}

// Currency: store INTEGER minor units; derive precision from the currency itself.
export function currencyField(locale: string, currency: string) {
  const fmt = new Intl.NumberFormat(locale, { style: "currency", currency });
  const minor = fmt.resolvedOptions().maximumFractionDigits ?? 2;   // JPY 0, USD 2, KWD 3
  const num = localeNumber(locale, { minimumFractionDigits: minor, maximumFractionDigits: minor });
  return {
    minorUnits: minor,
    /** Text → integer minor units, or an error message. */
    parse(text: string): { ok: true; minor: number } | { ok: false; message: string } {
      const n = num.parse(text);
      if (n === null) return { ok: false, message: `Enter an amount, like ${fmt.format(1234.5)}.` };
      const places = (String(text).split(/[.,٫]/).pop() ?? "").replace(/\D/g, "");
      // Reject extra precision rather than silently rounding the user's money.
      const scaled = n * 10 ** minor;
      if (Math.abs(scaled - Math.round(scaled)) > 1e-6) {
        return { ok: false, message: minor === 0 ? "Enter a whole amount." : `Use at most ${minor} decimal places.` };
      }
      return { ok: true, minor: Math.round(scaled) };
    },
    format: (minorAmount: number) => fmt.format(minorAmount / 10 ** minor),
  };
}
```

---

## Step-by-step walkthrough

1. **Know the user's locale.** Use the app's configured locale, not only `navigator.language`; a German user of an English-language site may still type German numbers. Some forms let the user's account locale decide.
2. **Derive separators from `formatToParts`.** Formatting a sample number in the locale tells you exactly which characters mean "group" and "decimal".
3. **Parse leniently, then check strictly.** Strip grouping characters and spaces, convert the locale decimal to `.`, map native digits, and reject anything that is not a clean number afterwards.
4. **Store money as integer minor units.** `1234.56` euros becomes `123456` cents. Sums and comparisons are then exact, avoiding the floating-point drift discussed in [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).
5. **Take precision from the currency.** `maximumFractionDigits` on a currency formatter gives 0 for JPY and 3 for KWD; validate the user's decimal places against it.
6. **Format on blur with `Intl`.** While focused, leave the user's text alone; on blur, if it parsed, replace it with the locale's formatted display.

### Why ambiguity must be an error, not a guess

`1,234` means one thousand two hundred thirty-four in en-US and one point two three four in de-DE. If the parser tries to guess — "a comma followed by exactly three digits is probably grouping" — it will be wrong for someone, and the error is invisible: the form accepts the input and stores a value a thousand times off. Parsing strictly by the known locale, and rejecting input that does not fit it with a message showing an example in the expected format, turns a silent data error into a visible, fixable one. Showing the formatted result on blur ("€1.234,00") gives users a final chance to spot a misreading before they submit.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of parsing the German amount text 1.234,56 into integer minor units using separators derived from Intl." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Parsing &quot;1.234,56&quot; for de-DE</title>
  <desc>formatToParts for de-DE reports dot as the group separator and comma as the decimal separator. The input text 1.234,56 has native digits already. Removing group characters gives 1234,56. Replacing the locale decimal with a dot gives 1234.56, which passes the strict number check. Multiplying by ten to the power of two for EUR gives 123456 minor units, an exact integer. On blur, the value is formatted back as 1.234,56 euro.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="396.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Separators from Intl</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">group &quot;.&quot;, decimal &quot;,&quot;</text>
  <text x="440.2" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">formatToParts(1234567.891) for de-DE.</text>
  <path d="M212.1,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="208.1,89.0 212.1,96.0 216.1,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="396.2" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Strip grouping</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;1.234,56&quot; → &quot;1234,56&quot;</text>
  <text x="440.2" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Also strips spaces and no-break spaces.</text>
  <path d="M212.1,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="208.1,174.0 212.1,181.0 216.1,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="396.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Normalise decimal</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;1234,56&quot; → &quot;1234.56&quot;</text>
  <text x="440.2" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Strict check: a clean number remains.</text>
  <path d="M212.1,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="208.1,259.0 212.1,266.0 216.1,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="396.2" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Minor units</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1234.56 × 10² → 123456</text>
  <text x="440.2" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Exact integer; formatted on blur as &quot;1.234,56 €&quot;.</text>
</svg>

---

## Failure modes and edge cases

### 1. Using `parseFloat`

`parseFloat("1.234,56")` is `1.234`, silently. Never parse user-entered numbers with `parseFloat` or `Number` directly; always normalise by locale first.

### 2. Space characters

French formatting uses a narrow no-break space (`U+202F`), and users type ordinary spaces or no-break spaces (`U+00A0`) — or paste them from spreadsheets. Accept all three as grouping.

### 3. Negative numbers

Some locales format negatives with a different minus sign (`−`, U+2212) or parentheses in accounting formats. Decide whether negatives are allowed; if so, map `−` to `-`, and reject parentheses unless you support accounting input.

### 4. Very large values

`Number` loses precision above 2⁵³. For large monetary amounts (in minor units, anything above about 90 trillion), parse into `BigInt` or a decimal library, and send strings to the server.

### 5. Server contract

Send the integer minor units plus the currency code, or a decimal *string* in a fixed format (`"1234.56"`) — never a locale-formatted string. Validate the same rules server-side, per [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/).

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of currencies with their number of minor units, an example display and the stored integer value." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Minor units by currency</title>
  <desc>US dollars have two minor units; 12.34 dollars is stored as 1234. Euros have two; 12.34 euros is stored as 1234. Japanese yen have zero; 1234 yen is stored as 1234. Kuwaiti dinar have three; 12.345 dinar is stored as 12345. The number of minor units comes from Intl&#x27;s resolved options for a currency formatter.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Currency</text>
  <text x="179.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Minor units</text>
  <text x="319.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Display (en-US)</text>
  <text x="520.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stored</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">USD</text>
  <text x="179.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">2</text>
  <text x="319.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">$12.34</text>
  <text x="520.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">1234</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">EUR</text>
  <text x="179.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">2</text>
  <text x="319.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">€12.34</text>
  <text x="520.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1234</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">JPY</text>
  <text x="179.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">0</text>
  <text x="319.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">¥1,234</text>
  <text x="520.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">1234</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">KWD</text>
  <text x="179.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">3</text>
  <text x="319.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">KWD 12.345</text>
  <text x="520.8" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">12345</text>
</svg>

---

## Verification checklist

- [ ] `1.234,56` parses to 1234.56 for de-DE and is rejected or flagged for en-US.
- [ ] French narrow no-break spaces and ordinary spaces are accepted as grouping.
- [ ] Native digits in locales that use them are parsed correctly.
- [ ] Money is stored as integer minor units with the currency code.
- [ ] Decimal places are validated against the currency's minor units.
- [ ] Values are formatted with `Intl` on blur and left untouched while focused.
- [ ] Totals are computed from minor units without floating-point artefacts.
- [ ] The server receives minor units or a fixed-format decimal string.

---

## Frequently Asked Questions

<details>
<summary><strong>Is there really no Intl parser?</strong></summary>

Correct — ECMAScript's `Intl` formats but does not parse numbers. Libraries exist that build parsers from locale data; the `formatToParts` approach here covers the common cases with no dependency.

</details>

<details>
<summary><strong>Should I use type="number" for amounts?</strong></summary>

No. Browsers parse `type="number"` inconsistently across locales, reject grouping separators, and change values on scroll. Use `type="text"` with `inputmode="decimal"`.

</details>

<details>
<summary><strong>How do I show the currency symbol?</strong></summary>

Put the currency code or symbol outside the input as a visible prefix or suffix, and include it in the label ("Amount (EUR)"). Keeping it outside the editable text avoids caret and parsing complications.

</details>

---

## Related

- [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
- [Coercing Form Strings With Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/)
- [Localising Form Error Messages](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/localising-form-error-messages/)

← [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
