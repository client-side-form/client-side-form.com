---
layout: page.njk
title: "Inline Errors and an Error Summary: Using Both"
description: "When a form uses both inline field errors and a summary, they must say the same thing, appear at the right moments and not double-announce. Timing rules, one source of truth for messages, summary updates as errors are fixed, and when a summary is unnecessary."
slug: inline-errors-and-summary-together
type: howto
breadcrumb: "Inline + Summary"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Inline Errors and an Error Summary: Using Both"
  parent: "Error Summary and Messaging"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Inline Errors and an Error Summary: Using Both",
      "description": "When a form uses both inline field errors and a summary, they must say the same thing, appear at the right moments and not double-announce. Timing rules, one source of truth for messages, summary updates as errors are fixed, and when a summary is unnecessary.",
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
          "name": "Inline Errors and an Error Summary: Using Both",
          "item": "https://client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/inline-errors-and-summary-together/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Coordinate inline errors with an error summary",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Hold errors in one ordered list"
        },
        {
          "@type": "HowToStep",
          "name": "Render inline errors from that list"
        },
        {
          "@type": "HowToStep",
          "name": "Render the summary from the same list, only after submit"
        },
        {
          "@type": "HowToStep",
          "name": "Focus the summary on each invalid submit"
        },
        {
          "@type": "HowToStep",
          "name": "Remove items silently as fields are fixed"
        },
        {
          "@type": "HowToStep",
          "name": "Remove the summary when the form becomes valid or submits successfully"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the summary update live after submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, silently: remove fixed items and update the count so the summary stays truthful if the user scrolls back. Do not announce those updates; the user knows they fixed the field."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the summary go on a multi-step form?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "At the top of the current step for that step's errors. On a final review step, a summary can list errors from earlier steps with links that take the user back to them, as in building a review step before final submit."
          }
        },
        {
          "@type": "Question",
          "name": "Is role=\"alert\" appropriate for the summary?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Moving focus to the summary already causes it to be read. Adding role=\"alert\" can make some screen readers read it twice. Use a focusable container with a heading, and reserve alert for messages that appear without a focus move."
          }
        }
      ]
    }
  ]
}
</script>

# Inline Errors and an Error Summary: Using Both

Forms that add an error summary on top of inline errors often end up with two systems that disagree: the summary says "Enter a valid email" while the field says "Email is invalid", the summary still lists an error the user fixed a minute ago, and a screen reader hears every message twice after submit.

Inline errors and a summary do different jobs. Inline errors explain *what is wrong with this field*, where the user is looking and typing. The summary answers *what is wrong with the form, and where* — once, after a failed submit, as a list of links. Used together, with one source of truth and clear timing, they complement each other. This page, part of [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/), coordinates them.

---

## Context and prerequisites

The two components' responsibilities:

- **Inline error** — next to the field, linked with `aria-describedby`, `aria-invalid` on the field. Appears on blur (for touched fields) and on submit; clears as soon as the field is fixed, per [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/).
- **Error summary** — at the top of the form (or page), appears only after a submit attempt, receives focus, contains a heading ("There are 3 problems") and a list of links to each invalid field or group. Built as in [building an accessible error summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/).

Coordination rules:

1. **Same words.** Summary link text equals the inline message.
2. **Same source.** Both render from one error state; neither computes its own.
3. **Summary only after submit.** It never appears on blur.
4. **Summary shrinks as errors are fixed** — without stealing focus or re-announcing.
5. **One announcement per event.** On submit, focus the summary (which reads it); do not also announce each inline error.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of form events — field blur with an error, fixing a field, invalid submit, fixing a field after submit, and successful submit — with the inline error behaviour and the summary behaviour for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each component does at each moment</title>
  <desc>On blur with an error the inline error appears and the summary does not exist. When a field is fixed before any submit, the inline error clears. On an invalid submit, inline errors appear for all invalid fields, and the summary appears, lists every error and receives focus. When a field is fixed after submit, its inline error clears and its summary item is removed without moving focus or announcing. On a successful submit, the summary is removed.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Event</text>
  <text x="208.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Inline error</text>
  <text x="420.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Summary</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">blur, invalid (before submit)</text>
  <text x="208.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">appears</text>
  <text x="420.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">— (not shown)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">field fixed (before submit)</text>
  <text x="208.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">clears</text>
  <text x="420.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">submit, invalid</text>
  <text x="208.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">shown for all invalid</text>
  <text x="420.9" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">appears, focused, lists all</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">field fixed (after submit)</text>
  <text x="208.3" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">clears</text>
  <text x="420.9" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">item removed, no focus move</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">submit, valid</text>
  <text x="208.3" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="420.9" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">removed</text>
</svg>

---

## The core pattern: one error state, two views

```typescript
export interface FieldError { field: string; message: string; targetId: string }

export interface ErrorView {
  errors: FieldError[];          // single source of truth, in form order
  submitAttempted: boolean;
  shownInline: Set<string>;      // fields whose inline error is visible
}

// Inline: visible if touched-and-invalid or after submit.
export const inlineMessage = (v: ErrorView, field: string) =>
  v.shownInline.has(field) || v.submitAttempted ? v.errors.find((e) => e.field === field)?.message ?? null : null;

// Summary: exists only after a submit attempt, and only while errors remain.
export const summaryItems = (v: ErrorView) => (v.submitAttempted ? v.errors : []);

export function renderSummary(container: HTMLElement, v: ErrorView, focusOnRender: boolean) {
  const items = summaryItems(v);
  if (items.length === 0) { container.hidden = true; container.innerHTML = ""; return; }
  container.hidden = false;
  container.innerHTML = `
    <h2 id="error-summary-title">There ${items.length === 1 ? "is a problem" : `are ${items.length} problems`}</h2>
    <ul>${items.map((e) => `<li><a href="#${e.targetId}">${escapeHtml(e.message)}</a></li>`).join("")}</ul>`;
  // Focus ONLY on a submit attempt. Updates while fixing fields must not move focus.
  if (focusOnRender) container.focus();
}

export function onSubmit(v: ErrorView, summaryEl: HTMLElement): ErrorView {
  const next = { ...v, submitAttempted: true };
  renderSummary(summaryEl, next, next.errors.length > 0);
  return next;
}

export function onFieldFixed(v: ErrorView, field: string, summaryEl: HTMLElement): ErrorView {
  const next = { ...v, errors: v.errors.filter((e) => e.field !== field) };
  renderSummary(summaryEl, next, false);          // shrink silently
  return next;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
```

```html
<div id="error-summary" class="error-summary" tabindex="-1" role="group"
     aria-labelledby="error-summary-title" hidden></div>
```

---

## Step-by-step walkthrough

1. **Hold errors in one ordered list.** Field order, so the summary lists problems top to bottom as they appear on the page.
2. **Render inline errors from that list.** Visibility follows the field's own timing; the message text comes from the list.
3. **Render the summary from the same list, only after submit.** Before the first submit attempt, the summary does not exist — even if fields are invalid.
4. **Focus the summary on each invalid submit.** Its heading is read, and the list is navigable; do not additionally announce each error.
5. **Remove items silently as fields are fixed.** The count in the heading updates; focus stays in the field the user is editing.
6. **Remove the summary when the form becomes valid or submits successfully.** A summary saying "There are 0 problems" is noise.

### When a summary is not needed

For a form with two or three fields visible at once — a login form, a newsletter signup — a summary adds little: the user can see every error at a glance, and moving focus to the first invalid field is enough. Summaries earn their place when forms are long enough to scroll, when errors can be off-screen, when fields sit in collapsed sections or other steps, or when server-side errors may relate to fields the user is not looking at. A reasonable rule is: if the first invalid field might not be visible when the user presses submit, use a summary.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of an invalid submit that focuses the summary listing two problems, the user following a link to fix the email, and the summary shrinking to one problem without moving focus or announcing." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Submit, then fix one field</title>
  <desc>The user presses submit with two invalid fields. The form marks submit attempted, shows both inline errors, renders the summary with two links and focuses it; the screen reader reads there are 2 problems. The user follows the email link, fixes the email, and the inline error clears. The summary removes the email item and its heading becomes there is a problem, but focus stays in the email field and nothing is announced.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form state</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Summary</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Email field</text>
  <path d="M95.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit (2 invalid)</text>
  <path d="M95.5,69.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,65.0 257.5,69.0 250.5,73.0" fill="#7b4f8a"/>
  <text x="266.5" y="93.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">render 2 items + focus</text>
  <path d="M258.5,97.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,93.0 420.5,97.0 413.5,101.0" fill="#7b4f8a"/>
  <text x="103.5" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">follow link; type valid email</text>
  <path d="M95.5,125.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,121.0 583.5,125.0 576.5,129.0" fill="#7b4f8a"/>
  <text x="266.5" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">email valid: remove error</text>
  <path d="M584.5,153.0 H266.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="266.5,149.0 259.5,153.0 266.5,157.0" fill="#7b4f8a"/>
  <text x="266.5" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">render 1 item, no focus move</text>
  <path d="M258.5,181.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,177.0 420.5,181.0 413.5,185.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Different wording in each place

Hand-writing summary text ("Email is required") separately from inline text ("Enter your email address") confuses users who compare them. Render both from one message.

### 2. Summary appearing on blur

Showing the summary before any submit attempt turns it into a live, shifting list above the form — layout jumps and noise. Keep it strictly post-submit.

### 3. Summary links that do not land in the field

Links to a wrapper `div` or a collapsed section scroll without focusing. Target the input's id (or the first option in a group), and reveal hidden sections first, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).

### 4. Double reading on submit

Focusing the summary reads it; a live region announcing "2 errors" as well reads it again. Use focus, not a live region, for the submit event.

### 5. Server errors without a field

Form-level server errors appear in the summary without a link, and optionally in a banner — they have no inline home, per [modelling form-level vs field-level errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the shared error state, the inline view and the summary view, and how each depends on the shared state." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two views, one truth</title>
  <desc>The shared error state is an ordered list of errors with field, message and target id, plus whether a submit has been attempted. The inline view shows each field&#x27;s message next to it according to the field&#x27;s timing. The summary view lists every error as a link after a submit attempt, focuses on submit and shrinks silently as errors are fixed.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Error state</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Ordered errors: field, message, target.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submitAttempted.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Inline view</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Per field, by its timing.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">describedby + aria-invalid.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Summary view</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">After submit only.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Links; focus on submit; shrinks silently.</text>
</svg>

---

## Verification checklist

- [ ] Summary link text matches the inline message exactly.
- [ ] The summary never appears before the first submit attempt.
- [ ] Each invalid submit focuses the summary.
- [ ] Fixing a field removes its summary item without moving focus.
- [ ] The summary disappears when no errors remain.
- [ ] Summary links move focus into the field, revealing hidden sections first.
- [ ] Submit produces one announcement, not a summary read plus live-region messages.
- [ ] Form-level errors appear in the summary without links.

---

## Frequently Asked Questions

<details>
<summary><strong>Should the summary update live after submit?</strong></summary>

Yes, silently: remove fixed items and update the count so the summary stays truthful if the user scrolls back. Do not announce those updates; the user knows they fixed the field.

</details>

<details>
<summary><strong>Where should the summary go on a multi-step form?</strong></summary>

At the top of the current step for that step's errors. On a final review step, a summary can list errors from earlier steps with links that take the user back to them, as in [building a review step before final submit](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/building-a-review-step-before-final-submit/).

</details>

<details>
<summary><strong>Is role="alert" appropriate for the summary?</strong></summary>

Moving focus to the summary already causes it to be read. Adding `role="alert"` can make some screen readers read it twice. Use a focusable container with a heading, and reserve `alert` for messages that appear without a focus move.

</details>

---

## Related

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
- [Writing Error Messages That Tell the Reader What to Do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/)
- [Throttling Live Region Announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/)

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)
