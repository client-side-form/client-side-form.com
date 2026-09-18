---
layout: page.njk
title: "Property-Based Testing for Validators"
description: "Find the inputs your hand-written tests miss: property-based tests with fast-check for validators, parsers and formatters — round-trip properties, idempotence, invariants like 'valid output always re-validates', shrinking to minimal failing inputs, and seeding from real bugs."
slug: property-based-testing-for-validators
type: howto
breadcrumb: "Property-Based Tests"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Property-Based Testing for Validators"
  parent: "Testing Form Validation"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Property-Based Testing for Validators",
      "description": "Find the inputs your hand-written tests miss: property-based tests with fast-check for validators, parsers and formatters — round-trip properties, idempotence, invariants like 'valid output always re-validates', shrinking to minimal failing inputs, and seeding from real bugs.",
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
          "name": "Testing Form Validation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/testing-form-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Property-Based Testing for Validators",
          "item": "https://client-side-form.com/validation-logic-schema-integration/testing-form-validation/property-based-testing-for-validators/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Write property-based tests for form validators and parsers",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Pick pure functions with clear invariants"
        },
        {
          "@type": "HowToStep",
          "name": "State properties, not examples"
        },
        {
          "@type": "HowToStep",
          "name": "Choose generators that match reality"
        },
        {
          "@type": "HowToStep",
          "name": "Keep domains honest"
        },
        {
          "@type": "HowToStep",
          "name": "Let shrinking do the diagnosis"
        },
        {
          "@type": "HowToStep",
          "name": "Pin the seed in CI when debugging"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How many runs are enough?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "fast-check defaults to 100 runs per property. For pure, fast functions, 500–1,000 in CI is cheap and finds more. Increase runs temporarily when investigating a suspected bug."
          }
        },
        {
          "@type": "Question",
          "name": "Can I generate valid form objects for schema tests?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Build arbitraries with fc.record({ email: …, age: … }), or generate from schemas using community bridges between Zod and fast-check. Generate both valid and invalid objects and assert the schema's verdict matches a simpler reference rule."
          }
        },
        {
          "@type": "Question",
          "name": "Does this replace fuzzing the API?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It complements it. Property tests exercise your client functions; server-side fuzzing exercises the endpoint. An agreement property between client and server validators, run with the same generator, connects the two."
          }
        }
      ]
    }
  ]
}
</script>

# Property-Based Testing for Validators

Hand-written validator tests check the inputs someone thought of — `""`, `"abc"`, `"ada@example.com"` — and miss the ones users actually produce: a trailing no-break space, a number with two decimal separators, an emoji in a name, a date on 29 February, a card number whose formatting round-trip drops a digit.

Property-based testing flips the approach: instead of listing inputs, you state properties that must hold for *all* inputs, and a library such as fast-check generates hundreds of cases, including awkward ones, and shrinks any failure to a minimal example. Validators, parsers and formatters — pure functions with clear invariants — are ideal subjects. This page is part of [testing form validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/).

---

## Context and prerequisites

Properties that suit form code:

- **Round trip.** `parse(format(x)) === x` for every valid raw value — the formatter and parser agree.
- **Idempotence.** `normalise(normalise(s)) === normalise(s)` — trimming or formatting twice changes nothing more.
- **Validity is preserved.** If `validate(x)` passes, then `validate(normalise(x))` passes — normalisation never makes a valid value invalid.
- **Never throws.** `validate(anyString)` returns an error or `null`, never an exception — validators handle garbage.
- **Agreement.** Two implementations (client and server, old and new schema) return the same verdict — the migration check from [migrating from Yup to Zod](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/migrating-from-yup-to-zod/), automated.
- **Monotonicity.** Adding characters to a too-long value never makes it valid.

When a property fails, fast-check **shrinks** the input to a minimal counterexample (for example, from a 40-character random string to `" "`), which usually points straight at the bug.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of form functions — number parser, card formatter, email validator, name normaliser and two schema versions — with a property to test for each and the kind of bug it finds." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Properties worth checking for common form functions</title>
  <desc>For a locale number parser and formatter, the round trip property that parsing a formatted number returns the same number finds separator and precision bugs. For a card number formatter, the property that stripping spaces from the formatted value returns the original digits finds grouping bugs that drop or duplicate digits. For an email validator, the property that it never throws on any string finds crashes on unusual input. For a name normaliser, idempotence finds trimming and whitespace bugs. For two schema versions, the property that both return the same verdict finds migration regressions.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Function</text>
  <text x="197.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Property</text>
  <text x="458.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Finds</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">locale number parser</text>
  <text x="197.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">parse(format(n)) === n</text>
  <text x="458.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">separator, precision bugs</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">card formatter</text>
  <text x="197.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">digits(format(d)) === d</text>
  <text x="458.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">dropped or duplicated digits</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">email validator</text>
  <text x="197.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">never throws on any string</text>
  <text x="458.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">crashes on odd input</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">name normaliser</text>
  <text x="197.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">normalise is idempotent</text>
  <text x="458.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">whitespace handling</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">schema v1 vs v2</text>
  <text x="197.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">same verdict for all inputs</text>
  <text x="458.7" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">migration regressions</text>
</svg>

---

## The core pattern: properties with fast-check

```typescript
import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { localeNumber } from "../src/locale-number";          // parse/format by locale
import { groupDigits } from "../src/card";                     // "4111111111111111" → "4111 1111 1111 1111"
import { checkEmail } from "../src/email";
import { normaliseName } from "../src/names";

describe("form functions: properties", () => {
  it("number formatting round-trips in every supported locale", () => {
    const locales = ["en-US", "en-GB", "de-DE", "fr-FR", "de-CH", "en-IN"];
    fc.assert(
      fc.property(
        fc.constantFrom(...locales),
        // Money-like values: up to 10^9 with 2 decimals, as integers of cents.
        fc.integer({ min: -100_000_000_000, max: 100_000_000_000 }),
        (locale, cents) => {
          const n = cents / 100;
          const ln = localeNumber(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          expect(ln.parse(ln.format(n))).toBeCloseTo(n, 2);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("card grouping never loses or adds digits", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^\d{12,19}$/),
      (digits) => { expect(groupDigits(digits).replace(/ /g, "")).toBe(digits); },
    ));
  });

  it("email check never throws, whatever the input", () => {
    fc.assert(fc.property(
      fc.string({ unit: "grapheme", maxLength: 200 }),   // includes emoji and combining marks
      (s) => { expect(() => checkEmail(s)).not.toThrow(); },
    ));
  });

  it("name normalisation is idempotent", () => {
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), (s) => {
      const once = normaliseName(s);
      expect(normaliseName(once)).toBe(once);
    }));
  });

  // Regression seeds: inputs that once failed are always re-run.
  it("known tricky inputs", () => {
    for (const s of [" ada@example.com", "a@b.c.", "1.234,56", "ÉLODIE"]) {
      expect(() => checkEmail(s)).not.toThrow();
    }
  });
});
```

---

## Step-by-step walkthrough

1. **Pick pure functions with clear invariants.** Parsers, formatters, normalisers, validators and schema adapters. Components and effects are poor subjects; test them with example-based tests.
2. **State properties, not examples.** Round trip, idempotence, never-throws, agreement between implementations. Each property replaces dozens of hand-picked cases.
3. **Choose generators that match reality.** `fc.string({ unit: "grapheme" })` includes emoji and combining characters; `fc.stringMatching(regex)` produces structured strings; `fc.constantFrom(...)` enumerates locales or countries.
4. **Keep domains honest.** Generate only values the function is meant to accept for round-trip properties (valid raw values), and anything at all for never-throws properties.
5. **Let shrinking do the diagnosis.** A failing case is reduced to something like `" "` or `"0,"`; add it to a regression list so it is always re-checked.
6. **Pin the seed in CI when debugging.** fast-check prints the seed and path of a failure; re-running with them reproduces it exactly.

### Why generated inputs find different bugs

Hand-written tests are biased toward the cases the author already had in mind while writing the code — which are the cases the code already handles. Generated inputs have no such bias. They routinely produce strings that humans rarely think to type but real users and systems do produce: no-break spaces from copy-paste, full-width digits from Asian input methods, combining accents, very long values, values at exact boundaries. For form code, which sits exactly at the boundary between unpredictable human input and strict data, that difference is the whole point. A few properties per parser or validator often find more real bugs in an afternoon than a year of example tests.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of fast-check generating inputs for a round-trip property on a French number parser, finding a failure on a large random number, shrinking it to a minimal value, and the developer fixing the parser to accept narrow no-break spaces." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A failure, found and shrunk</title>
  <desc>fast-check generates hundreds of cent values and locales. On the fr-FR locale with a value above one thousand, the round trip fails because the formatter inserts a narrow no-break space as the grouping separator and the parser only strips ordinary spaces. fast-check shrinks the case to fr-FR with 1000.00, the smallest value that includes a grouping separator. The developer adds U+202F to the parser&#x27;s grouping characters, and the property passes.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">fast-check</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">parse(format(n))</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Developer</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">fr-FR, 73 918 204,55 … fails</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">shrink … fr-FR, 1000.00 fails</text>
  <path d="M122.7,97.0 H332.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,93.0 339.0,97.0 332.0,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">format uses U+202F; parse ignores it</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">accept U+202F as grouping</text>
  <path d="M557.3,153.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">500 runs pass</text>
  <path d="M122.7,181.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,177.0 339.0,181.0 332.0,185.0" fill="#7b4f8a"/>
</svg>

### Where to start in an existing codebase

Adding property tests to a mature form codebase works best in a particular order. Start with **never-throws** properties on every exported validator and parser: they need no thought about expected outputs, they run quickly, and crashes on odd input are the most damaging bugs because they often take the whole form down. Next add **round-trip** properties for each formatter and parser pair — number, currency, date, phone, card — since those pairs are where locale and edge-case bugs concentrate. Then add **agreement** properties wherever two implementations must match: the client and server copies of a rule, or an old and a new schema during a migration. Only then consider more specific invariants. Each step tends to surface a few real bugs; fixing them, and adding the shrunk inputs to the example suite, leaves the codebase measurably more robust within a sprint.

---

## Failure modes and edge cases

### 1. Properties that restate the implementation

`expect(validate(x)).toBe(x.includes("@"))` just duplicates the code. Good properties relate functions to each other (round trip, agreement) or state universal truths (never throws, idempotent).

### 2. Generators that are too narrow

`fc.string()` without a `unit` option generates characters from a limited range; use `unit: "grapheme"` or `"binary"` to include the characters that cause real bugs.

### 3. Floating-point round trips

`parse(format(n)) === n` fails for values the format rounds (more decimals than the format shows). Generate values at the format's precision — integers of minor units, as above — or compare with a tolerance.

### 4. Slow properties

Properties that render components or call networks are slow and flaky. Keep them on pure functions; hundreds of runs of a pure parser take milliseconds.

### 5. Locale data differences

`Intl` output can differ between Node versions and browsers (for example, which space character a locale uses). Run property tests in the same runtime as production code paths, and treat locale-data differences found this way as real bugs to handle, as the French example shows.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting example-based tests and property-based tests for form validators and their roles." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Example tests and property tests together</title>
  <desc>Example-based tests document intended behaviour with readable cases, pin specific messages and cover known regressions. Property-based tests explore the input space, find unanticipated inputs, and check invariants such as round trips and never throwing. Use both: examples for behaviour you want to show, properties for guarantees you want to hold for all inputs.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Example tests</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Readable, documented cases.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Exact messages.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Known regressions.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Property tests</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Explore the input space.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Round trips, never-throws, agreement.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Shrink to minimal failures.</text>
</svg>

---

## Verification checklist

- [ ] Every parser and formatter has a round-trip property.
- [ ] Every validator has a never-throws property over arbitrary strings.
- [ ] Normalisers have an idempotence property.
- [ ] Client and server validators (or old and new schemas) have an agreement property.
- [ ] Generators include graphemes such as emoji, no-break spaces and combining marks.
- [ ] Shrunk failures are added to a regression list.
- [ ] Property tests run on pure functions and finish in seconds.

---

## Frequently Asked Questions

<details>
<summary><strong>How many runs are enough?</strong></summary>

fast-check defaults to 100 runs per property. For pure, fast functions, 500–1,000 in CI is cheap and finds more. Increase runs temporarily when investigating a suspected bug.

</details>

<details>
<summary><strong>Can I generate valid form objects for schema tests?</strong></summary>

Yes. Build arbitraries with `fc.record({ email: …, age: … })`, or generate from schemas using community bridges between Zod and fast-check. Generate both valid and invalid objects and assert the schema's verdict matches a simpler reference rule.

</details>

<details>
<summary><strong>Does this replace fuzzing the API?</strong></summary>

It complements it. Property tests exercise your client functions; server-side fuzzing exercises the endpoint. An agreement property between client and server validators, run with the same generator, connects the two.

</details>

---

## Related

- [Testing Form Validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/)
- [Composing Pure Validator Functions](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/composing-pure-validator-functions/)
- [Locale-Aware Number and Currency Inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/)

← [Testing Form Validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/)
