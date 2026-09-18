---
layout: page.njk
title: "Validating a Date Range: Start Before End"
description: "Validate start and end dates as one rule: which field the error belongs to, revalidating when either changes, inclusive versus exclusive ends, minimum and maximum durations, min/max attributes that guide the picker, and the time zone traps."
slug: validating-a-date-range-start-before-end
type: howto
breadcrumb: "Start Before End"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validating a Date Range: Start Before End"
  parent: "Cross-Field Dependency Logic"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating a Date Range: Start Before End",
      "description": "Validate start and end dates as one rule: which field the error belongs to, revalidating when either changes, inclusive versus exclusive ends, minimum and maximum durations, min/max attributes that guide the picker, and the time zone traps.",
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
          "name": "Cross-Field Dependency Logic",
          "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Validating a Date Range: Start Before End",
          "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/validating-a-date-range-start-before-end/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate a start and end date pair correctly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Write the rule once, over both values"
        },
        {
          "@type": "HowToStep",
          "name": "Run it when either field changes"
        },
        {
          "@type": "HowToStep",
          "name": "Compute days in UTC from calendar strings"
        },
        {
          "@type": "HowToStep",
          "name": "Guide the picker with min and max"
        },
        {
          "@type": "HowToStep",
          "name": "Put the message on the group, reference it from the end field"
        },
        {
          "@type": "HowToStep",
          "name": "Respect touch timing for missing values"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I auto-adjust the end date when the start changes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Adjusting silently is surprising; users check the end date and find it changed. A reasonable middle ground: if the end date is empty, pre-select start plus the typical duration; if it is set and now invalid, show the message and let the user choose."
          }
        },
        {
          "@type": "Question",
          "name": "Should a date range use one picker or two inputs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Range pickers with a two-month calendar are convenient for pointer users but are often hard to operate by keyboard and screen reader. Two labelled date inputs with a clear group label are the more accessible default; a range picker can enhance them."
          }
        },
        {
          "@type": "Question",
          "name": "Where should \"start date must be in the future\" go?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "That is a field-level rule on the start date, independent of the end. Show it under the start field; the range message is only for the relationship between the two."
          }
        }
      ]
    }
  ]
}
</script>

# Validating a Date Range: Start Before End

The date-range rule is simple to state and easy to get wrong in the UI: the error appears on the end date, the user fixes it by moving the *start* date earlier, and the message stays on the end date because only the start field was revalidated.

A range is a relationship between two fields, so it is a group-level rule in the sense of [modelling form-level vs field-level errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/), and it must be re-evaluated when either member changes. This page, within [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/), implements the rule with duration limits, guides the native pickers with `min` and `max`, and places the message where users will look for it.

---

## Context and prerequisites

Decisions to make before writing code:

- **Inclusive or exclusive end?** A hotel stay's check-out may equal check-in plus one night and cannot equal check-in; a leave request can start and end on the same day. Decide whether `end === start` is valid.
- **Minimum and maximum duration?** "At least 1 night", "no more than 30 days", "within the next 12 months".
- **Calendar dates or instants?** Most ranges in forms are calendar dates (`YYYY-MM-DD`), which compare as strings with no time zone involved — see [validating dates across time zones](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/validating-dates-across-time-zones/). Ranges with times (a meeting from 14:00 to 15:30) are instants in a named zone.
- **Where does the error go?** Usually on the end date — it is what people adjust — but described on the group so it is heard whichever field has focus.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of example start and end date pairs evaluated against a rule of end after start, at least one night and at most thirty nights, with the resulting message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Range rules and example outcomes</title>
  <desc>A start of 1 October and an end of 5 October is valid. An end of 1 October equal to the start fails the minimum of one night with check-out must be after check-in. An end of 28 September before the start fails with check-out must be after check-in. An end of 3 November, 33 nights later, fails the maximum with stays can be up to 30 nights. A missing end date fails with enter a check-out date, reported only after touch or submit.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Start</text>
  <text x="172.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">End</text>
  <text x="320.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Result</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">2026-10-01</text>
  <text x="172.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">2026-10-05</text>
  <text x="320.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">valid (4 nights)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">2026-10-01</text>
  <text x="172.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">2026-10-01</text>
  <text x="320.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Check-out must be after check-in.</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">2026-10-01</text>
  <text x="172.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">2026-09-28</text>
  <text x="320.4" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Check-out must be after check-in.</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">2026-10-01</text>
  <text x="172.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">2026-11-03</text>
  <text x="320.4" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Stays can be up to 30 nights.</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">2026-10-01</text>
  <text x="172.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">(empty)</text>
  <text x="320.4" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">Enter a check-out date. (after touch/submit)</text>
</svg>

---

## The core pattern: one range rule, two triggers, guided pickers

```typescript
type Day = string; // "YYYY-MM-DD"

export interface RangeRule {
  allowSameDay: boolean;
  minDays?: number;
  maxDays?: number;
  labels: { start: string; end: string };        // "check-in", "check-out"
}

// Whole days between two calendar dates, computed in UTC so no zone can shift it.
const daysBetween = (a: Day, b: Day) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function validateRange(start: Day | "", end: Day | "", r: RangeRule):
  { field: "start" | "end"; message: string } | null {
  if (!start) return { field: "start", message: `Enter a ${r.labels.start} date.` };
  if (!end) return { field: "end", message: `Enter a ${r.labels.end} date.` };
  const days = daysBetween(start, end);
  if (days < 0 || (days === 0 && !r.allowSameDay)) {
    return { field: "end", message: `${cap(r.labels.end)} must be after ${r.labels.start}.` };
  }
  if (r.minDays !== undefined && days < r.minDays) {
    return { field: "end", message: `${cap(r.labels.end)} must be at least ${r.minDays} day(s) after ${r.labels.start}.` };
  }
  if (r.maxDays !== undefined && days > r.maxDays) {
    return { field: "end", message: `Stays can be up to ${r.maxDays} nights. Choose an earlier ${r.labels.end} date.` };
  }
  return null;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// Wiring: run the SAME rule when either input changes, and guide the pickers.
export function wireRange(startEl: HTMLInputElement, endEl: HTMLInputElement, r: RangeRule,
  show: (e: ReturnType<typeof validateRange>) => void) {
  const run = () => {
    // Guide the native picker: end cannot be before start (+1 if same day not allowed).
    if (startEl.value) {
      const minEnd = addDays(startEl.value, r.allowSameDay ? 0 : Math.max(1, r.minDays ?? 1));
      endEl.min = minEnd;
      if (r.maxDays !== undefined) endEl.max = addDays(startEl.value, r.maxDays);
    }
    show(validateRange(startEl.value as Day, endEl.value as Day, r));
  };
  startEl.addEventListener("change", run);
  endEl.addEventListener("change", run);
  return () => { startEl.removeEventListener("change", run); endEl.removeEventListener("change", run); };
}

function addDays(d: Day, n: number): Day {
  const t = new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000);
  return t.toISOString().slice(0, 10);
}
```

```html
<fieldset aria-describedby="stay-error">
  <legend>Your stay</legend>
  <label for="checkin">Check-in</label>
  <input id="checkin" name="checkin" type="date">
  <label for="checkout">Check-out</label>
  <input id="checkout" name="checkout" type="date" aria-describedby="stay-error">
  <p id="stay-error" class="group-error"></p>
</fieldset>
```

---

## Step-by-step walkthrough

1. **Write the rule once, over both values.** `validateRange(start, end, rule)` decides validity and which field the message belongs to. Neither field's own validator knows about the other.
2. **Run it when either field changes.** Wire `change` on both inputs (or declare both as dependencies in your form library) so fixing the range from either side clears the error — the general mechanism in [revalidating dependent fields when a source changes](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/revalidating-dependent-fields-when-a-source-changes/).
3. **Compute days in UTC from calendar strings.** Parsing `YYYY-MM-DDT00:00:00Z` on both sides makes daylight-saving changes irrelevant to the count.
4. **Guide the picker with `min` and `max`.** Setting the end input's `min` from the start stops most invalid choices before they happen, and native pickers grey out unavailable days.
5. **Put the message on the group, reference it from the end field.** The fieldset describes the error for anyone entering the group, and the end field — the usual thing to change — also references it.
6. **Respect touch timing for missing values.** "Enter a check-out date" belongs after the field is touched or on submit, not the moment the start date is chosen.

### Why the error usually belongs to the end date

When a range is invalid, either date could be the "wrong" one, but users almost always treat the start as the anchor: they choose when something begins and then how long it lasts. Placing the message under the end date matches that mental model, and it is where the fix is usually made. The exception is when the start is invalid on its own — in the past, or beyond a booking window — in which case the error is a field error on the start, separate from the range rule. Keeping those two kinds of error distinct avoids a single message trying to describe two different problems.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user who sets an end date before the start date, sees the range error, then fixes it by moving the start date earlier, and the error clears because the rule runs on either change." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Fixing the range from the start date</title>
  <desc>The user sets check-in to 10 October and check-out to 8 October. The range rule runs and reports check-out must be after check-in, shown on the group and linked from the check-out field. The user then changes check-in to 5 October instead of touching check-out. Because the rule runs on changes to either field, it re-evaluates, finds 3 nights, and clears the message.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Check-in</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Check-out</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Range rule</text>
  <path d="M95.5,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">set check-out 2026-10-08 (check-in 10th)</text>
  <path d="M95.5,69.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,65.0 420.5,69.0 413.5,73.0" fill="#7b4f8a"/>
  <text x="429.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">change → run</text>
  <path d="M421.5,97.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,93.0 583.5,97.0 576.5,101.0" fill="#7b4f8a"/>
  <text x="103.5" y="121.0" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;Check-out must be after check-in.&quot;</text>
  <path d="M584.5,125.0 H103.5" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,121.0 96.5,125.0 103.5,129.0" fill="#7b4f8a"/>
  <text x="103.5" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">set check-in 2026-10-05</text>
  <path d="M95.5,153.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,149.0 257.5,153.0 250.5,157.0" fill="#7b4f8a"/>
  <text x="266.5" y="177.0" font-size="9.5" fill="#6b5f75" font-family="inherit">change → run (same rule)</text>
  <path d="M258.5,181.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,177.0 583.5,181.0 576.5,185.0" fill="#7b4f8a"/>
  <text x="103.5" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">valid: 3 nights, error cleared</text>
  <path d="M584.5,209.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,205.0 96.5,209.0 103.5,213.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Validating only the edited field

If the range rule lives in the end field's validator, changing the start never re-runs it. Attach the rule to the group, or register the start as a dependency of the end.

### 2. `min` not updated when start clears

If the user clears the start date, remove `min`/`max` from the end input; stale constraints make a valid end date appear invalid in the picker.

### 3. Constraints versus messages

`min` on the end input triggers native `rangeUnderflow`. If your form uses `novalidate` with custom messages, map `rangeUnderflow` to the same range message so users do not see two different sentences for one problem, as in [using the Constraint Validation API with custom form state](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/).

### 4. Schemas

In Zod, the rule is a `superRefine` on the object that owns both fields, adding the issue at `path: ["end"]`. Keep the rule function shared so the schema and the live UI give identical messages.

### 5. Ranges with times

"14:00 to 13:30" on the same day is invalid; "23:00 to 01:00" might mean overnight. Decide whether an end time earlier than the start implies the next day, and show the resolved end date to the user if it does.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards showing the date range rule expressed as picker constraints, as a live group message and as a schema refinement, all derived from one rule." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three places the rule shows up</title>
  <desc>The picker constraints set min and max on the end date input from the start date, preventing most invalid choices. The live group message shows the rule&#x27;s message on the fieldset, linked from the end input, and re-evaluates when either date changes. The schema refinement applies the same rule function at submit, on client and server, adding the issue to the end path.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Picker constraints</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">end.min / end.max from start.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Prevents most mistakes.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Live group message</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">On the fieldset.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Runs on either change.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Schema refinement</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same rule at submit.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Issue at path [&quot;end&quot;].</text>
</svg>

---

## Verification checklist

- [ ] Choosing an end date before the start shows one message on the group.
- [ ] Moving the start date earlier clears the message without touching the end date.
- [ ] Same-day ranges are accepted or rejected according to the documented rule.
- [ ] Minimum and maximum durations produce specific messages.
- [ ] The end picker's `min` and `max` follow the start date and clear when it clears.
- [ ] Day counts are unaffected by daylight-saving changes.
- [ ] The schema refinement and live UI produce identical messages.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I auto-adjust the end date when the start changes?</strong></summary>

Adjusting silently is surprising; users check the end date and find it changed. A reasonable middle ground: if the end date is empty, pre-select start plus the typical duration; if it is set and now invalid, show the message and let the user choose.

</details>

<details>
<summary><strong>Should a date range use one picker or two inputs?</strong></summary>

Range pickers with a two-month calendar are convenient for pointer users but are often hard to operate by keyboard and screen reader. Two labelled date inputs with a clear group label are the more accessible default; a range picker can enhance them.

</details>

<details>
<summary><strong>Where should "start date must be in the future" go?</strong></summary>

That is a field-level rule on the start date, independent of the end. Show it under the start field; the range message is only for the relationship between the two.

</details>

---

## Related

- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
- [How to Validate Dependent Fields With Zod](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/)
- [Keyboard-Accessible Date Inputs](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-accessible-date-inputs/)

← [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
