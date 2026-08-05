---
layout: page.njk
title: "Clearing Server Errors When a Field Changes"
description: "Keep a server rejection on screen until the answer genuinely changes — comparing normalised values, reviving the error on undo, and re-announcing it politely rather than clearing on every keystroke."
slug: clearing-server-errors-when-a-field-changes
type: howto
breadcrumb: "Clearing Server Errors When a Field Changes"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Clearing Server Errors When a Field Changes"
  parent: "Server Error Reconciliation"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Clearing Server Errors When a Field Changes",
      "description": "Keep a server rejection on screen until the answer genuinely changes — comparing normalised values, reviving the error on undo, and re-announcing it politely rather than clearing on every keystroke.",
      "datePublished": "2026-08-05",
      "dateModified": "2026-08-05",
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
          "item": "https://www.client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Validation Logic & Schema Integration",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Server Error Reconciliation",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Clearing Server Errors When a Field Changes",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Clear a server error only when the answer actually changes",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Tag every error with its origin"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Record the rejected value when the response is reconciled"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Route every field change through one clearing function"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Normalise both values before comparing them"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Revive a dismissed error if the rejected value returns"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Re-announce a surviving error politely"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Drop retained errors once a submit succeeds"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not just clear every error on change and re-submit to find out?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because the reader pays for it. Clearing on change makes 'already registered' vanish before it has been read, and the only way to get it back is another submit — which for a checkout means another round trip and, if the submit has side effects, another attempt at something that will fail. Keeping the error until the answer actually changes costs one comparison and turns a guessing game into a conversation."
          }
        },
        {
          "@type": "Question",
          "name": "What about a server error caused by two fields?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Record which fields the rule read, and clear when any of them changes. Attaching the rejected value of a single field means editing the other one leaves a stale error pointing at input the reader has already fixed. The rule read a tuple, so the lifetime should be keyed on the tuple — the shape is the same, just with an array of rejected values instead of one."
          }
        },
        {
          "@type": "Question",
          "name": "Should a surviving server error be re-announced when the reader edits?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Politely, yes. A reader who changes a field and hears nothing reasonably concludes the problem is resolved. A polite live-region update — the same message, re-announced — tells them it still applies without interrupting. Do not use an assertive region for this: it fires on every edit and interrupts mid-word, which is worse than saying nothing."
          }
        }
      ]
    }
  ]
}
</script>

# Clearing Server Errors When a Field Changes

The exact problem: the server rejects an email address as already registered, the reader presses the arrow key to move the caret, and the error disappears — because the form clears errors on `change` without asking where the error came from.

## Context and Prerequisites

This implements the lifetime rule from [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/): a local error is cleared by the next keystroke, and a server error is cleared only when the value actually differs from the one that was rejected. Doing that requires an error shape carrying an origin and the rejected value, which is why a bare `Record<string, string>` cannot express any of this.

## Core Pattern

```typescript
interface FieldError {
  readonly message: string;
  readonly code: string;
  readonly origin: 'local' | 'server';
  /** Present only for server errors: the exact value the server judged. */
  readonly rejectedValue?: unknown;
}

/**
 * Decide whether an error survives a change to its field.
 * Local errors never survive — they will be recomputed immediately.
 * Server errors survive until the value genuinely differs from the rejected one.
 */
export function survivesChange(error: FieldError, nextValue: unknown): boolean {
  if (error.origin === 'local') return false;
  // Normalise both sides: a trailing space or a case change in an email is not
  // a new answer, and clearing on it hides a problem that still applies.
  return Object.is(normalise(error.rejectedValue), normalise(nextValue));
}

export function onFieldChange(
  errors: Readonly<Record<string, FieldError>>,
  field: string,
  nextValue: unknown,
): Record<string, FieldError> {
  const current = errors[field];
  if (!current) return errors as Record<string, FieldError>;
  if (survivesChange(current, nextValue)) return errors as Record<string, FieldError>;
  const { [field]: _dropped, ...rest } = errors;
  return rest;
}
```

`normalise` is the same function the dirty tracking uses — trim, empty-to-null, type coercion — for exactly the reason described in [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/). Comparing raw strings means `"Ada@Example.com "` reads as a different answer from `"ada@example.com"`, and the error clears on a change the server would judge identically.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four edits to a field carrying a server error: moving the caret, retyping the same characters, changing the case, and typing a genuinely different address. Only the last clears the error." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which edits actually change the answer</title>
  <desc>The field holds an address the server rejected as already registered. Moving the caret with an arrow key produces no change at all and must not clear the error. Deleting and retyping the same characters produces a value identical after normalisation, so the error still applies. Changing the case of the domain also normalises to the same address, and the server would reject it identically, so the error survives. Typing a genuinely different address is the only edit that makes the server's judgement obsolete, and it is the only one that clears the error.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="136" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The reader does this</text>
  <text x="260" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Normalised value</text>
  <text x="470" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The error…</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">presses an arrow key</text>
  <text x="260" y="66" font-size="10" fill="#6b5f75" font-family="inherit">unchanged</text>
  <text x="470" y="66" font-size="10" fill="#2d6342" font-family="inherit">stays — nothing was answered</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">retypes the same text</text>
  <text x="260" y="100" font-size="10" fill="#6b5f75" font-family="inherit">identical</text>
  <text x="470" y="100" font-size="10" fill="#2d6342" font-family="inherit">stays — same answer</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">changes the case</text>
  <text x="260" y="134" font-size="10" fill="#6b5f75" font-family="inherit">identical after normalising</text>
  <text x="470" y="134" font-size="10" fill="#2d6342" font-family="inherit">stays — same address</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">Only a genuinely different value clears it: the server judged an answer, and the answer has to change for the judgement to lapse.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Clearing on the first keystroke turns "already registered" into a message that vanishes before it can be read.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Clearing on nothing at all is the other failure: the reader fixes the address and the old error is still sitting there.</text>
</svg>

## Step-by-Step Walkthrough

1. **Give every error an origin.** Local errors come from the schema; server errors come from a rejected submit. Without the tag, the two behave identically and one of them is wrong.

2. **Record the rejected value at reconciliation time.** Take it from the payload that was sent, not from the field's current contents, because the reader may already have typed something else.

3. **Route every change through one function.** `onFieldChange` is the only place errors are dropped, so the rule is applied consistently rather than re-derived in each component.

4. **Normalise both sides.** Reuse the dirty-tracking normaliser so "differs" means the same thing everywhere in the form.

5. **Re-announce a surviving error politely.** A reader who edits a field and hears nothing may reasonably assume the problem is fixed. A polite live-region update saying the error still applies costs one line and prevents a wasted submit.

6. **Clear on a successful re-submit, not before.** The only authority on whether a server error still applies is the server.

## Failure Modes and Edge Cases

### 1. The value returns to the rejected one

A reader types something else, then undoes it. The error was cleared on the first change and must come back on the undo — otherwise the field looks clean while holding a value the server has already refused:

```typescript
// Keep dismissed server errors keyed by their rejected value so the SAME
// answer reappearing brings its error with it.
const dismissed = new Map<string, FieldError>();   // normalised value -> error

function afterChange(field: string, next: unknown, errors: Errors): Errors {
  const key = String(normalise(next));
  const revived = dismissed.get(`${field}:${key}`);
  return revived ? { ...errors, [field]: revived } : onFieldChange(errors, field, next);
}
```

### 2. A cross-field server rule

"These dates overlap an existing booking" is attached to one field but caused by two. Changing either should clear it. Record the fields the rule read, and clear when any of them changes — attaching the rejected value of only one field means editing the other leaves a stale error.

### 3. The reader edits during the request

A 422 arriving for a value the reader has already replaced must not render at all. The same comparison covers it: if the current value already differs from `rejectedValue`, the error is stale on arrival and is discarded rather than shown.

### 4. Clearing on blur instead of on change

Waiting for blur means the error is still on screen while the reader types the fix, which reads as the form not noticing. Clear on change; re-run local validation on blur as usual.

### 5. The server error and a local error collide

A field can fail a local rule and carry a server error at once. Precedence keeps the server one visible, but if the local rule now fails, showing "already registered" for an address that is no longer a valid address is confusing. Show the local error while it applies, and restore the server one when the value becomes locally valid again — the map keeps both.

<svg viewBox="0 8 668 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of one field: a server rejection arrives, the reader edits and the error is dismissed but retained, the reader undoes the edit and the error is revived, then a genuinely new value clears it for good." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Dismissed is not the same as discarded</title>
  <desc>The server rejects the address and the error is shown. The reader types a different address, so the error is dismissed from view but kept in a map keyed by the value that was rejected. The reader then undoes the edit, restoring the original address, and the error is revived — because nothing has changed the server's judgement. Finally the reader types a genuinely new address, the error is dismissed again, and a successful submit discards the retained entry for good.</desc>
  <rect x="0" y="8" width="668" height="210" fill="#f9f5fb"/>
  <rect x="14" y="34" width="152" height="72" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="90" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">rejected</text>
  <text x="90" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">"already registered"</text>
  <text x="90" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">shown on the field</text>
  <path d="M166,70 H188" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="188" y="34" width="152" height="72" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="264" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">reader edits</text>
  <text x="264" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">dismissed from view,</text>
  <text x="264" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">kept in the map</text>
  <path d="M340,70 H362" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="362" y="34" width="152" height="72" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="438" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">reader undoes it</text>
  <text x="438" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">same value returns,</text>
  <text x="438" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">so the error revives</text>
  <path d="M514,70 H536" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="536" y="34" width="118" height="72" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="595" y="56" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">new value</text>
  <text x="595" y="76" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">dismissed; cleared</text>
  <text x="595" y="92" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">for good on success</text>
  <text x="14" y="146" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why revival matters more than it sounds</text>
  <text x="14" y="164" font-size="10" fill="#6b5f75" font-family="inherit">Undo is a reflex. Without revival, a reader who tries an alternative and changes their mind is left with a clean-looking</text>
  <text x="14" y="180" font-size="10" fill="#6b5f75" font-family="inherit">field holding a value the server has already refused, and discovers it only on the next submit.</text>
  <text x="14" y="204" font-size="10" fill="#6b5f75" font-family="inherit">Key the retained entry by field and normalised value, and drop the whole map once a submit succeeds.</text>
</svg>

The retained-error map needs a lifetime of its own, and it is shorter than the form:

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The map is written when a server error is dismissed by an edit, keyed by the field and the normalised value that was rejected. It is read on every subsequent change to that field, so returning to the rejected value revives the error rather than leaving a clean-looking field holding a refused answer. It is dropped entirely when a submit succeeds, because every judgement it holds was about a payload that has now been superseded. Keeping it beyond that point means a reader who edits the same record again is shown a rejection that no longer applies." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When the retained map is written, read and dropped</title>
  <desc>The map is written when a server error is dismissed by an edit, keyed by the field and the normalised value that was rejected. It is read on every subsequent change to that field, so returning to the rejected value revives the error rather than leaving a clean-looking field holding a refused answer. It is dropped entirely when a submit succeeds, because every judgement it holds was about a payload that has now been superseded. Keeping it beyond that point means a reader who edits the same record again is shown a rejection that no longer applies.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">When the retained map is written, read and dropped</text>
  <rect x="14" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="117" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">written</text>
  <text x="117" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">on dismissal, keyed by</text>
  <text x="117" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">field and rejected value</text>
  <path d="M220,80 H242" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="242" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#6b5f75" stroke-width="1.5"/>
  <text x="345" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6b5f75" font-family="inherit">read</text>
  <text x="345" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">on every later change</text>
  <text x="345" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">to that field</text>
  <path d="M448,80 H470" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="470" y="42" width="206" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="573" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">dropped</text>
  <text x="573" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">on a successful submit —</text>
  <text x="573" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">every judgement is stale</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">Not on failure: a failed submit means those judgements are still exactly as current as they were.</text>
</svg>

## Verification Checklist

- [ ] Pressing an arrow key does not clear a server error
- [ ] Retyping the same value, or changing only its case, does not clear it
- [ ] A genuinely different value clears it
- [ ] Undoing back to the rejected value brings the error back
- [ ] A 422 for a value the reader already replaced never renders
- [ ] A cross-field server rule clears when either of its inputs changes
- [ ] A surviving error is re-announced politely, not assertively
- [ ] All retained errors are dropped once a submit succeeds

---

**Related**

- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/) — where the rejected value is captured
- [Mapping 422 Responses to Field Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/) — attaching the error in the first place
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the normaliser both comparisons share

← [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)

## Frequently Asked Questions

<details>
<summary><strong>Why not just clear every error on change and re-submit to find out?</strong></summary>

Because the reader pays for it. Clearing on change makes 'already registered' vanish before it has been read, and the only way to get it back is another submit — which for a checkout means another round trip and, if the submit has side effects, another attempt at something that will fail. Keeping the error until the answer actually changes costs one comparison and turns a guessing game into a conversation.

</details>

<details>
<summary><strong>What about a server error caused by two fields?</strong></summary>

Record which fields the rule read, and clear when any of them changes. Attaching the rejected value of a single field means editing the other one leaves a stale error pointing at input the reader has already fixed. The rule read a tuple, so the lifetime should be keyed on the tuple — the shape is the same, just with an array of rejected values instead of one.

</details>

<details>
<summary><strong>Should a surviving server error be re-announced when the reader edits?</strong></summary>

Politely, yes. A reader who changes a field and hears nothing reasonably concludes the problem is resolved. A polite live-region update — the same message, re-announced — tells them it still applies without interrupting. Do not use an assertive region for this: it fires on every edit and interrupts mid-word, which is worse than saying nothing.

</details>

