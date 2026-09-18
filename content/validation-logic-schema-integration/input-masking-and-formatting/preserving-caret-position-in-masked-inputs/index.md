---
layout: page.njk
title: "Preserving Caret Position in Masked Inputs"
description: "Stop the caret jumping to the end when a masked input reformats: map the caret through the reformat by counting meaningful characters, handle Backspace over separators, IME composition, selection ranges and framework re-renders."
slug: preserving-caret-position-in-masked-inputs
type: howto
breadcrumb: "Caret Preservation"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Preserving Caret Position in Masked Inputs"
  parent: "Input Masking and Formatting"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Preserving Caret Position in Masked Inputs",
      "description": "Stop the caret jumping to the end when a masked input reformats: map the caret through the reformat by counting meaningful characters, handle Backspace over separators, IME composition, selection ranges and framework re-renders.",
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
          "name": "Preserving Caret Position in Masked Inputs",
          "item": "https://client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep the caret in place when an input reformats its value",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Define what \"meaningful\" means for the field"
        },
        {
          "@type": "HowToStep",
          "name": "Count meaningful characters before the caret, in the edited text"
        },
        {
          "@type": "HowToStep",
          "name": "Format from the meaningful characters only"
        },
        {
          "@type": "HowToStep",
          "name": "Skip the write if nothing changed"
        },
        {
          "@type": "HowToStep",
          "name": "Restore the selection by count"
        },
        {
          "@type": "HowToStep",
          "name": "Handle Backspace over separators in beforeinput"
        },
        {
          "@type": "HowToStep",
          "name": "Leave composition alone"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just format on blur and avoid all of this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For many fields, you should. Live formatting is worth its complexity mainly for long digit strings where grouping helps the user check what they are typing, such as card numbers and bank account numbers."
          }
        },
        {
          "@type": "Question",
          "name": "Does setSelectionRange work in all browsers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, on text-like inputs (text, tel, search, url, password). It throws or is unsupported on email and number inputs, which is another reason to use type=\"text\" with inputmode for masked fields."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test caret behaviour?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In Playwright, click into the field, use press(\"ArrowLeft\") to position the caret, pressSequentially to type, then read selectionStart with evaluate. Unit tests with jsdom can simulate input events but do not reproduce every browser's selection behaviour; keep at least a few real-browser tests."
          }
        }
      ]
    }
  ]
}
</script>

# Preserving Caret Position in Masked Inputs

Assigning `input.value` moves the caret to the end of the field, so any input that reformats as the user types — grouping card digits, inserting phone spaces, adding thousands separators — throws the caret to the end every time the user edits the middle of the value, and the next keystroke lands in the wrong place.

The fix is to record where the caret was *in terms of meaning* before reformatting, and put it back at the same meaningful position afterwards. This page, part of [input masking and formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/), implements that mapping, then handles the cases that break simpler versions: deleting separators, selections, IME composition and frameworks that re-render the value.

---

## Context and prerequisites

Positions in a formatted string are unstable: inserting a digit near the start of `4111 1111 1111` shifts every later space. What *is* stable is how many meaningful characters (digits, for a card number) come before the caret. If the caret was after the 5th digit before formatting, it should be after the 5th digit after formatting — wherever that is in the new string.

So the algorithm is:

1. On `input`, read the raw text and `selectionStart`.
2. Count meaningful characters before the caret.
3. Compute the new formatted text.
4. If it differs, assign it, then find the index just after the same count of meaningful characters, and set the selection there.

Two additional details make it robust: separators the user deletes must be treated as a request to delete the adjacent meaningful character, and nothing should be rewritten while an IME composition is in progress.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table following one keystroke inserted into the middle of a formatted card number, showing text and caret position before, after the browser&#x27;s edit, after reformatting without caret handling, and after reformatting with caret mapping." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Typing a digit into the middle of a card number</title>
  <desc>Before the keystroke the text is 4111 1111 1111 with the caret after the sixth digit, at index seven. The user types 9, and the browser&#x27;s edit gives 4111 19111 1111 with the caret at index eight, after seven digits. Reformatting to 4111 1911 1111 1 without caret handling puts the caret at the end, index seventeen. Mapping by meaningful characters places it after the seventh digit, at index eight, where the user expects it.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Moment</text>
  <text x="231.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Text</text>
  <text x="498.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Caret</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">before keystroke</text>
  <text x="231.5" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4111 11|11 1111</text>
  <text x="498.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">after 6 digits</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">browser inserts 9</text>
  <text x="231.5" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4111 119|11 1111</text>
  <text x="498.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">after 7 digits</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">reformat, no mapping</text>
  <text x="231.5" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">4111 1191 1111 1|</text>
  <text x="498.2" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">end of field</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">reformat, mapped</text>
  <text x="231.5" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">4111 119|1 1111 1</text>
  <text x="498.2" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">after 7 digits</text>
</svg>

---

## The core pattern: map the caret by meaningful-character count

```typescript
export interface MaskSpec {
  isMeaningful: (ch: string) => boolean;          // e.g. digit test
  format: (meaningful: string) => string;         // formats the meaningful chars only
  maxMeaningful?: number;
}

const meaningfulOf = (s: string, spec: MaskSpec) => [...s].filter(spec.isMeaningful).join("");

function indexAfterCount(text: string, count: number, spec: MaskSpec): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) if (spec.isMeaningful(text[i]) && ++seen === count) return i + 1;
  return text.length;
}

export function attachCaretSafeMask(input: HTMLInputElement, spec: MaskSpec) {
  let composing = false;
  let lastValue = input.value;

  const apply = () => {
    const text = input.value;
    const selStart = input.selectionStart ?? text.length;
    const selEnd = input.selectionEnd ?? selStart;

    // Meaningful chars before each end of the selection, in the edited text.
    const beforeStart = meaningfulOf(text.slice(0, selStart), spec).length;
    const beforeEnd = meaningfulOf(text.slice(0, selEnd), spec).length;

    let digits = meaningfulOf(text, spec);
    if (spec.maxMeaningful) digits = digits.slice(0, spec.maxMeaningful);
    const next = spec.format(digits);
    lastValue = next;
    if (next === text) return;                     // nothing to do: leave the caret alone

    input.value = next;
    // Restore both ends so a selection survives, then clamp.
    input.setSelectionRange(indexAfterCount(next, beforeStart, spec), indexAfterCount(next, beforeEnd, spec));
  };

  const onBeforeInput = (e: InputEvent) => {
    // Backspace directly after a separator: delete the meaningful char before it
    // instead, otherwise the mask re-inserts the separator and nothing happens.
    if (e.inputType !== "deleteContentBackward") return;
    const pos = input.selectionStart ?? 0;
    if (pos !== input.selectionEnd || pos === 0) return;
    const prev = input.value[pos - 1];
    if (!spec.isMeaningful(prev)) {
      e.preventDefault();
      const count = meaningfulOf(input.value.slice(0, pos), spec).length;  // digits before caret
      const digits = meaningfulOf(input.value, spec);
      const nextDigits = digits.slice(0, count - 1) + digits.slice(count);
      const next = spec.format(nextDigits);
      input.value = next;
      const at = indexAfterCount(next, count - 1, spec);
      input.setSelectionRange(at, at);
      input.dispatchEvent(new Event("input", { bubbles: true }));   // keep listeners informed
    }
  };

  const onInput = (e: Event) => { if (!composing && !(e as InputEvent).isComposing) apply(); };
  const onCompStart = () => { composing = true; };
  const onCompEnd = () => { composing = false; apply(); };

  input.addEventListener("beforeinput", onBeforeInput);
  input.addEventListener("input", onInput);
  input.addEventListener("compositionstart", onCompStart);
  input.addEventListener("compositionend", onCompEnd);
  return () => {
    input.removeEventListener("beforeinput", onBeforeInput);
    input.removeEventListener("input", onInput);
    input.removeEventListener("compositionstart", onCompStart);
    input.removeEventListener("compositionend", onCompEnd);
  };
}

// Card: groups of four digits, up to 19.
export const cardMask: MaskSpec = {
  isMeaningful: (c) => c >= "0" && c <= "9",
  format: (d) => d.replace(/(\d{4})(?=\d)/g, "$1 "),
  maxMeaningful: 19,
};
```

---

## Step-by-step walkthrough

1. **Define what "meaningful" means for the field.** Digits for cards and phones; digits and the decimal separator for amounts; letters and digits for postcodes.
2. **Count meaningful characters before the caret, in the edited text.** Read `selectionStart` inside the `input` handler — after the browser applied the edit, before you reformat.
3. **Format from the meaningful characters only.** Throw away all existing separators and rebuild them; this handles paste and autofill with arbitrary formatting.
4. **Skip the write if nothing changed.** Writing the same value still moves the caret in some browsers; compare first.
5. **Restore the selection by count.** Map both `selectionStart` and `selectionEnd`, so a selected range stays selected after reformatting.
6. **Handle Backspace over separators in `beforeinput`.** Delete the preceding meaningful character instead, so users are never trapped behind a space the mask keeps re-inserting.
7. **Leave composition alone.** Skip formatting while an IME composition is active and format once on `compositionend`.

### Why controlled framework inputs need extra care

In React, a controlled `<input value={formatted}>` receives the formatted value on every render. If the component formats in render and the DOM value differs from what React last set, React writes it — and the caret goes to the end, undoing your careful mapping. Two approaches work. Keep the input *uncontrolled* for the display text and run the mask directly on the element (as above), storing only the raw value in state. Or keep it controlled, compute the next caret position in the change handler, store it in a ref, and apply it in a layout effect after React commits. The first approach is simpler and immune to re-render timing; the second fits libraries that insist on controlled inputs. The same distinction applies to `v-model` in Vue and `bind:value` in Svelte, discussed in [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/).

<svg viewBox="0 0 680 187" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user pressing Backspace immediately after an automatically inserted space in a card number, comparing a naive mask that re-inserts the space with the beforeinput handler that deletes the previous digit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Backspace directly after an inserted space</title>
  <desc>The caret is directly after the space in 4111 space 1111. The user presses Backspace. With a naive mask, the browser deletes the space, the mask reformats the same digits and re-inserts the space, and nothing appears to happen. With the beforeinput handler, the default deletion is prevented, the digit before the space is removed instead, the value is reformatted to 4111 111 and the caret is placed after the third digit of the first group&#x27;s successor.</desc>
  <rect x="0" y="0" width="680" height="187" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">beforeinput handler</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Mask</text>
  <path d="M122.7,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Backspace at &quot;4111 |1111&quot;</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">naive: space deleted, mask re-inserts it</text>
  <path d="M340.0,97.0 H549.3" stroke="#a63d6f" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">preventDefault; delete digit before space</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;411|1 111&quot; — caret after 3 digits</text>
  <path d="M557.3,153.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Mobile keyboards and autocorrect

Some Android keyboards send `insertCompositionText` events even for Latin text, and some fire `input` without `beforeinput`. Test on real devices; the composition guard and the `input`-based formatting still produce correct results, while the Backspace enhancement may simply not trigger — which degrades gracefully.

### 2. Formatting that removes characters

If `format` drops characters (truncation at `maxMeaningful`), the caret count can exceed the available characters. `indexAfterCount` clamps to the end, which is correct.

### 3. `type="number"` inputs

`selectionStart` is `null` on `type="number"`, so caret mapping is impossible. Use `type="text"` with `inputmode="numeric"`, as in [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).

### 4. Undo history

Programmatic value changes break the browser's native undo stack in some browsers. If undo matters, prefer formatting on blur only, or use `document.execCommand("insertText")` — deprecated but still widely supported — which participates in undo history.

### 5. Screen readers announcing changes

Rewriting the value can cause some screen readers to re-read the field. Minimal live formatting (only inserting separators) reduces this; full formatting on blur avoids it during editing.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards comparing formatting only on blur, light live grouping with caret mapping, and full live masking, by complexity and risk." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Choose the least invasive formatting</title>
  <desc>Formatting only on blur has no caret handling, no deletion problems and no IME concerns, and suits most fields. Light live grouping with caret mapping inserts separators while typing, needs the mapping and Backspace handling, and suits long digit strings such as card numbers. Full live masking with fixed literal characters and placeholders is the most complex and risky, and should be reserved for fixed formats where users benefit from seeing the structure.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Format on blur</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No caret handling needed.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Default for most fields.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Live grouping + mapping</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Separators while typing.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Card numbers, long codes.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Full live mask</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Literal characters, placeholders.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only for fixed formats.</text>
</svg>

---

## Verification checklist

- [ ] Typing in the middle of a value keeps the caret after the typed character.
- [ ] Deleting in the middle keeps the caret at the deletion point.
- [ ] Backspace directly after a separator deletes the preceding digit.
- [ ] Selecting a range and typing replaces the range and places the caret after the insertion.
- [ ] Pasting formatted text produces the correct formatting and caret at the end of the paste.
- [ ] IME composition is not interrupted.
- [ ] Controlled framework inputs do not reset the caret after re-render.
- [ ] Tests type character by character, including mid-value edits.

---

## Frequently Asked Questions

<details>
<summary><strong>Why not just format on blur and avoid all of this?</strong></summary>

For many fields, you should. Live formatting is worth its complexity mainly for long digit strings where grouping helps the user check what they are typing, such as card numbers and bank account numbers.

</details>

<details>
<summary><strong>Does setSelectionRange work in all browsers?</strong></summary>

Yes, on text-like inputs (`text`, `tel`, `search`, `url`, `password`). It throws or is unsupported on `email` and `number` inputs, which is another reason to use `type="text"` with `inputmode` for masked fields.

</details>

<details>
<summary><strong>How do I test caret behaviour?</strong></summary>

In Playwright, click into the field, use `press("ArrowLeft")` to position the caret, `pressSequentially` to type, then read `selectionStart` with `evaluate`. Unit tests with jsdom can simulate input events but do not reproduce every browser's selection behaviour; keep at least a few real-browser tests.

</details>

---

## Related

- [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
- [Card Number Formatting and Luhn Validation](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/card-number-formatting-and-luhn-validation/)
- [Handling Browser Autofill in Controlled Inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/)

← [Input Masking and Formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/)
