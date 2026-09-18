---
layout: page.njk
title: "Validating Minimum and Maximum Row Counts"
description: "Enforce 'at least one' and 'no more than ten' on a repeatable group without errors on page load, silent truncation, or an Add button that vanishes: array-level rules, where their messages render, and how paste and import interact with the limits."
slug: validating-minimum-and-maximum-row-counts
type: howto
breadcrumb: "Min & Max Rows"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validating Minimum and Maximum Row Counts"
  parent: "Dynamic Field Arrays and Repeatable Groups"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating Minimum and Maximum Row Counts",
      "description": "Enforce 'at least one' and 'no more than ten' on a repeatable group without errors on page load, silent truncation, or an Add button that vanishes: array-level rules, where their messages render, and how paste and import interact with the limits.",
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
          "name": "Dynamic Field Arrays and Repeatable Groups",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Validating Minimum and Maximum Row Counts",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Enforce minimum and maximum row counts in a repeatable group",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Model counts as array-level rules"
        },
        {
          "@type": "HowToStep",
          "name": "Exclude blank rows from the minimum"
        },
        {
          "@type": "HowToStep",
          "name": "Gate the minimum message"
        },
        {
          "@type": "HowToStep",
          "name": "Show the maximum message immediately when exceeded"
        },
        {
          "@type": "HowToStep",
          "name": "Replace the Add button at the limit"
        },
        {
          "@type": "HowToStep",
          "name": "Link the summary to the right fix"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I pre-render the minimum number of empty rows?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pre-render one empty row when the minimum is one; it signals what to do. For higher minimums, render one row and let users add the rest, with a hint such as \"You need at least two references\". Several blank rows at once look like several required fields and invite partial entries."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the count be displayed?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A quiet \"2 of 3 contacts\" next to the Add button helps when a maximum exists, especially for screen-reader users who cannot glance at the list. Update it politely with the row changes rather than announcing it on every add."
          }
        },
        {
          "@type": "Question",
          "name": "Is an array-level error enough for accessibility?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only if it is programmatically associated with the group (via the fieldset's aria-describedby) and listed in the error summary. A message floating above the list without that association is invisible to someone navigating by form controls."
          }
        }
      ]
    }
  ]
}
</script>

# Validating Minimum and Maximum Row Counts

Row-count rules look trivial — `items.length >= 1` — but their UX is where repeatable groups most often go wrong: "Add at least one item" shouts at a user who has not started, a delete button that is disabled on the last row gives no reason, and a pasted list of 40 addresses is silently cut to 10.

Count rules are array-level rules in the model from [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/): they belong to the collection, not to any row. This page covers when to evaluate them, where their messages go, how controls should behave at the limits, and how bulk entry interacts with them.

---

## Context and prerequisites

Two kinds of limit behave differently:

- **Minimum** (at least one contact, at least two references). Violated at the start by definition, so it must not be shown until the user has had a chance: on submit, or after they remove rows below the minimum.
- **Maximum** (no more than ten line items, at most three attachments). Usually prevented at the source — the Add action stops at the limit — but still validated, because rows can arrive by paste, import, draft restore or a server-side change to the limit.

Separately, decide whether the minimum should be met by *pre-rendering* empty rows. Showing one empty row for "at least one" is friendly; showing two empty reference rows invites half-filled submissions. Pre-rendered empty rows must be ignored by the count if they are blank, or users will be told they have met the minimum with nothing entered.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the minimum and maximum row count rules with when each is evaluated, when its message is shown, and how the controls behave at the limit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When each count rule is evaluated and shown</title>
  <desc>The minimum rule is evaluated continuously but shown only after a submit attempt or after the user removes rows below the minimum; at the minimum, remove buttons stay enabled and removing below it shows the message. The maximum rule is evaluated continuously and shown immediately if the count exceeds it; at the maximum the Add button is hidden or replaced by a text explaining the limit.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rule</text>
  <text x="145.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Shown when</text>
  <text x="403.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">At the limit</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">minimum</text>
  <text x="145.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">after submit, or after removing below it</text>
  <text x="403.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">remove stays enabled; message explains the rule</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">maximum</text>
  <text x="145.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">immediately when exceeded (paste, import)</text>
  <text x="403.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Add replaced by &quot;You can add up to 10&quot;</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">blank rows</text>
  <text x="145.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">not counted toward the minimum</text>
  <text x="403.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">ignored at submit, or flagged if partly filled</text>
</svg>

---

## The core pattern: count rules with display gating

```typescript
export interface CountRules { min?: number; max?: number; noun: [string, string] } // ["contact", "contacts"]

export interface CountState {
  submitted: boolean;
  shrankBelowMin: boolean;   // set when a removal took the count below min
}

const isBlank = (row: Record<string, unknown>) =>
  Object.entries(row).every(([k, v]) => k.startsWith("_") || v === "" || v == null);

export function countMessage(rows: Record<string, unknown>[], r: CountRules, s: CountState): string | null {
  const filled = rows.filter((row) => !isBlank(row)).length;
  const [one, many] = r.noun;
  if (r.max !== undefined && rows.length > r.max) {
    // Always shown: the user (or a paste) put the form over the limit.
    const extra = rows.length - r.max;
    return `You can add up to ${r.max} ${many}. Remove ${extra} to continue.`;
  }
  if (r.min !== undefined && filled < r.min && (s.submitted || s.shrankBelowMin)) {
    return r.min === 1 ? `Add at least one ${one}.` : `Add at least ${r.min} ${many}.`;
  }
  return null;
}

export function canAdd(rows: unknown[], r: CountRules) {
  return r.max === undefined || rows.length < r.max;
}
```

```html
<fieldset aria-describedby="contacts-count-error">
  <legend>Emergency contacts</legend>
  <p id="contacts-count-error" class="group-error" hidden></p>
  <!-- rows … -->
  <button type="button" data-action="add-contact">Add another contact</button>
  <p class="limit-note" hidden>You can add up to 3 contacts.</p>
</fieldset>
```

The message element lives at the top of the group, below the `legend`, and is referenced by the `fieldset` so a screen reader reads it on entering the group. At the maximum, swap the Add button for the limit note rather than disabling the button.

---

## Step-by-step walkthrough

1. **Model counts as array-level rules.** They never attach to a row; they attach to the group, which is where [modelling form-level vs field-level errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/) puts group-scope errors.
2. **Exclude blank rows from the minimum.** A pre-rendered empty row is not an answer. At submit, drop wholly blank rows from the payload, and flag partly filled ones with their own row errors.
3. **Gate the minimum message.** Show it after a submit attempt, or immediately after a removal takes the group below the minimum — that removal is a deliberate act, and the user should learn its consequence at once.
4. **Show the maximum message immediately when exceeded.** If the count is over the limit, something unusual happened (paste, import, a restored draft from before the limit changed), and the user must act.
5. **Replace the Add button at the limit.** A visible "You can add up to 3 contacts" is better than a disabled button nobody can explain; see [disabling submit buttons without hiding the reason](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/disabling-submit-buttons-accessibly/).
6. **Link the summary to the right fix.** For a minimum error, the summary link should go to the Add button (the action that fixes it); for a maximum error, to the group's first row.

<svg viewBox="0 0 680 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for whether to show a row-count message — whether the count exceeds the maximum, whether a submit has been attempted with too few filled rows, and whether a removal just took the count below the minimum." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Should the count message show right now?</title>
  <desc>If the number of rows exceeds the maximum, show the maximum message immediately, because rows arrived by paste, import or a restored draft. If a submit was attempted and the number of filled rows is below the minimum, show the minimum message. If the user just removed a row and the filled count is now below the minimum, show the minimum message. Otherwise show nothing, even if the minimum is not yet met.</desc>
  <rect x="0" y="0" width="680" height="308" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">rows &gt; max?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Show max message now</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Submitted and filled &lt; min?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Show min message</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">A removal took filled below min?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Show min message</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Show nothing</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">An unstarted group is not an error.</text>
</svg>

---

## Failure modes and edge cases

### 1. Disabling Remove on the last row

Preventing removal below the minimum stops users from clearing a mistaken row and starting again. Let them remove it; the minimum message then appears, and the Add button is right there. If the minimum is one and you pre-render a row, removing the last row can simply reset it to blank.

### 2. Silent truncation on paste

A "paste a list" feature that keeps the first ten of forty items loses thirty without telling anyone. Keep all forty, show the maximum message, and let the user choose which to remove — or offer to split them into another submission.

### 3. Limits that change

If the server lowers the limit from 10 to 5, drafts saved under the old limit restore with too many rows. The always-on maximum message covers it; migrations in [versioning and migrating saved draft schemas](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/versioning-and-migrating-saved-draft-schemas/) should not truncate.

### 4. Schema-level rules

Zod's `.min(1)` and `.max(10)` on the array produce an issue with the array's path (`["contacts"]`) and codes `too_small` / `too_big`. Map those to the group's count message rather than dropping them because they have no row index.

```typescript
const Contacts = z.array(Contact).min(1, "Add at least one contact.").max(3, "You can add up to 3 contacts.");
```

### 5. Counting with conditional rows

If some rows are irrelevant (a "second guardian" row that only applies to minors), count only relevant rows toward the limits, using the relevance rule from [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards showing the repeatable group&#x27;s controls and messages when it has no filled rows, a count within the limits, and a count at the maximum." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The group&#x27;s controls at each count</title>
  <desc>With no filled rows before submit, one blank row is shown, the Add button is available and no message appears. Within the limits, every row has a Remove button and the Add button is available. At the maximum, the Add button is replaced with a note saying you can add up to three contacts, and Remove buttons stay available.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">0 filled, not submitted</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One blank row.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Add available.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No message.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Within 1–3</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Remove on every row.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Add available.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">At 3 (max)</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Add replaced by &quot;You can add up to 3</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">contacts.&quot;</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Remove still available.</text>
</svg>

---

## Verification checklist

- [ ] A fresh form shows no count error before any interaction.
- [ ] Submitting with no filled rows shows "Add at least one …" and the summary links to the Add button.
- [ ] Removing the only filled row shows the minimum message immediately.
- [ ] Blank pre-rendered rows are not counted and are dropped from the payload.
- [ ] At the maximum, Add is replaced by a visible explanation, not disabled silently.
- [ ] Pasting more rows than allowed keeps them all and shows the maximum message.
- [ ] Schema `too_small` / `too_big` issues on the array render as the group message.
- [ ] The count message is referenced by the group's `fieldset` and read on entry.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I pre-render the minimum number of empty rows?</strong></summary>

Pre-render one empty row when the minimum is one; it signals what to do. For higher minimums, render one row and let users add the rest, with a hint such as "You need at least two references". Several blank rows at once look like several required fields and invite partial entries.

</details>

<details>
<summary><strong>Where should the count be displayed?</strong></summary>

A quiet "2 of 3 contacts" next to the Add button helps when a maximum exists, especially for screen-reader users who cannot glance at the list. Update it politely with the row changes rather than announcing it on every add.

</details>

<details>
<summary><strong>Is an array-level error enough for accessibility?</strong></summary>

Only if it is programmatically associated with the group (via the `fieldset`'s `aria-describedby`) and listed in the error summary. A message floating above the list without that association is invisible to someone navigating by form controls.

</details>

---

## Related

- [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
- [Undoing Row Deletion in Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/)
- [Requiring At Least One of Several Fields](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/requiring-at-least-one-of-several-fields/)

← [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
