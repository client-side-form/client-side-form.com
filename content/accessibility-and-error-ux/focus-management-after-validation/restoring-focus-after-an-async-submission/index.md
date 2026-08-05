---
layout: page.njk
title: "Restoring Focus After an Async Submission"
description: "Disable the submit button instead of replacing it, so focus survives the request — then move it deliberately to the confirmation or the error summary when the response arrives."
slug: restoring-focus-after-an-async-submission
type: howto
breadcrumb: "Restoring Focus After an Async Submission"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Restoring Focus After an Async Submission"
  parent: "Focus Management After Validation"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Restoring Focus After an Async Submission",
      "description": "Disable the submit button instead of replacing it, so focus survives the request — then move it deliberately to the confirmation or the error summary when the response arrives.",
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
          "name": "Accessibility & Error UX for Forms",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Focus Management After Validation",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Restoring Focus After an Async Submission",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/restoring-focus-after-an-async-submission/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep focus somewhere sensible across an async submit",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Disable the submit button rather than replacing it"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Announce the wait politely"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Record the focused element as insurance"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Move focus deliberately when the response arrives"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Re-enable the button in a finally block"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Leave focus alone for background saves"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Focus the destination when success navigates"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does replacing the button with a spinner break focus?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because focus lives on an element, and removing that element from the document leaves the browser with nowhere to put it — so it falls back to the body. From there nothing is announced when the response arrives, and the next Tab starts from the top of the page. Disabling the button instead keeps the element, keeps focus, and gives you a known place to move focus from when the response comes back."
          }
        },
        {
          "@type": "Question",
          "name": "Should focus move if the reader has already moved on?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a failure, yes — they need to repair something, and leaving them where they are means the failure may never be noticed. Announce it as well, so the move is explained rather than surprising. For a success, no: taking the cursor away from whatever they started doing is disruptive and gains nothing, so announce it politely and leave focus alone."
          }
        },
        {
          "@type": "Question",
          "name": "What about a form that navigates on success?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The destination has to take focus, because a client-side navigation does not move it. Without that, the reader arrives on a confirmation page with focus still on the button of a form that no longer exists, and a screen reader announces nothing about where they are. Focus the destination's main heading as part of the navigation, exactly as a multi-step wizard focuses each new step."
          }
        }
      ]
    }
  ]
}
</script>

# Restoring Focus After an Async Submission

The exact problem: a reader presses submit, the button is replaced by a spinner, the request takes two seconds, and focus is on the document body — so when the response arrives, nothing is announced and the next Tab starts from the top of the page.

## Context and Prerequisites

Where focus goes after a *validation* failure is covered in [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/). This page is about the gap the async submit opens: the period between pressing submit and the response, during which the element that had focus can disappear.

## The Rule: Never Let the Focused Element Vanish

```typescript
async function onSubmit(e: SubmitEvent, form: HTMLFormElement): Promise<void> {
  e.preventDefault();
  const submitter = (e.submitter as HTMLButtonElement | null) ?? form.querySelector('[type=submit]');

  // Disable, do NOT remove or replace. A disabled button keeps its place in the
  // DOM and keeps focus; replacing it with a spinner drops focus to <body>.
  if (submitter) {
    submitter.disabled = true;
    submitter.setAttribute('aria-busy', 'true');
  }
  announce('Submitting…', 'polite');

  try {
    const res = await send(new FormData(form, submitter ?? undefined));
    if (res.ok) {
      // Success moves focus deliberately, to the confirmation heading, which is
      // where the reader's next task begins.
      focusConfirmation();
      return;
    }
    const errors = await mapServerErrors(res);
    renderErrors(errors);
    // Failure: two or more errors go to the summary; one goes to its field.
    Object.keys(errors).length > 1 ? focusSummary() : focusField(Object.keys(errors)[0]);
  } finally {
    if (submitter) {
      submitter.disabled = false;
      submitter.removeAttribute('aria-busy');
    }
  }
}
```

The single most effective rule is in the first branch: **disable, do not replace.** A disabled button remains in the document and, in current browsers, retains focus — so when the response arrives the reader is still somewhere sensible, and a focus move to the summary or the confirmation is a move from a known place rather than from nowhere.

<svg viewBox="0 8 690 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two submit timelines: replacing the button with a spinner drops focus to the body and leaves the reader nowhere, while disabling it in place keeps focus and lets the response move focus deliberately." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Replacing the button loses the reader; disabling it does not</title>
  <desc>Top timeline: the reader presses submit, the button is unmounted and replaced by a spinner element, focus falls to the document body because the focused element no longer exists, the response arrives and is announced into a live region the reader may not be listening to, and the next Tab press restarts from the top of the page. Bottom timeline: the reader presses submit, the same button is disabled in place and marked busy, focus stays on it throughout, the response arrives and focus is moved deliberately to the confirmation heading or the error summary, and the reader continues from there.</desc>
  <rect x="0" y="8" width="690" height="216" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">replaced by a spinner</text>
  <rect x="14" y="38" width="156" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="92" y="60" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">submit pressed</text>
  <text x="92" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus on the button</text>
  <path d="M170,66 H192" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="192" y="38" width="156" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="270" y="60" text-anchor="middle" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">button unmounted</text>
  <text x="270" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus falls to body</text>
  <path d="M348,66 H370" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="370" y="38" width="156" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="448" y="60" text-anchor="middle" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">response arrives</text>
  <text x="448" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">announced into nowhere</text>
  <path d="M526,66 H548" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="548" y="38" width="128" height="56" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="612" y="60" text-anchor="middle" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">Tab restarts</text>
  <text x="612" y="78" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from the page top</text>
  <text x="14" y="126" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">disabled in place</text>
  <rect x="14" y="136" width="156" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="92" y="158" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">submit pressed</text>
  <text x="92" y="176" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus on the button</text>
  <path d="M170,164 H192" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="192" y="136" width="156" height="56" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="270" y="158" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">disabled + aria-busy</text>
  <text x="270" y="176" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">still in the document</text>
  <path d="M348,164 H370" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="370" y="136" width="156" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="448" y="158" text-anchor="middle" font-size="10" font-weight="700" fill="#2d6342" font-family="inherit">response arrives</text>
  <text x="448" y="176" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">focus moved on purpose</text>
  <path d="M526,164 H548" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="548" y="136" width="128" height="56" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="612" y="158" text-anchor="middle" font-size="10" font-weight="700" fill="#2d6342" font-family="inherit">reader continues</text>
  <text x="612" y="176" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from a known place</text>
  <text x="14" y="216" font-size="10" fill="#6b5f75" font-family="inherit">If the button genuinely must be replaced, record document.activeElement first and restore it before moving focus deliberately.</text>
</svg>

## Step-by-Step Walkthrough

1. **Disable, do not replace.** The busy state is an attribute, not a different element.

2. **Announce the wait politely.** "Submitting…" in the status region, so a reader who cannot see the spinner knows one exists.

3. **Record the focused element anyway.** Cheap insurance if a re-render replaces it despite your intentions.

4. **Move focus deliberately on the response.** Confirmation heading on success; summary or field on failure.

5. **Re-enable in a `finally`.** A thrown error that leaves the button disabled is a form the reader cannot retry.

6. **Do not move focus for a background save.** An autosave completing is not a reason to take the reader's cursor.

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A success that stays on the page focuses the confirmation heading, because that is where the reader's next task begins. A success that navigates focuses the destination heading, since a client-side navigation moves nothing by itself. A failure with several field errors focuses the summary, which gives scope before detail. A failure with one field error focuses that field, because a summary of one is a detour. A failure with no field to blame focuses the form-level message, which is the only thing that can explain it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where focus goes for each response, and why</title>
  <desc>A success that stays on the page focuses the confirmation heading, because that is where the reader's next task begins. A success that navigates focuses the destination heading, since a client-side navigation moves nothing by itself. A failure with several field errors focuses the summary, which gives scope before detail. A failure with one field error focuses that field, because a summary of one is a detour. A failure with no field to blame focuses the form-level message, which is the only thing that can explain it.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Response</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus goes to</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Because</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">success, staying</text>
  <text x="200" y="66" font-size="10" fill="#2d6342" font-family="inherit">the confirmation heading</text>
  <text x="400" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the next task starts there</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">success, navigating</text>
  <text x="200" y="100" font-size="10" fill="#2d6342" font-family="inherit">the destination heading</text>
  <text x="400" y="100" font-size="10" fill="#6b5f75" font-family="inherit">navigation moves nothing itself</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">failure, 2+ fields</text>
  <text x="200" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">the error summary</text>
  <text x="400" y="134" font-size="10" fill="#6b5f75" font-family="inherit">scope before detail</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">failure, 1 field</text>
  <text x="200" y="168" font-size="10" fill="#7b4f8a" font-family="inherit">that field</text>
  <text x="400" y="168" font-size="10" fill="#6b5f75" font-family="inherit">a summary of one is a detour</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">failure, no field</text>
  <text x="200" y="202" font-size="10" fill="#7b4f8a" font-family="inherit">the form-level message</text>
  <text x="400" y="202" font-size="10" fill="#6b5f75" font-family="inherit">nothing else can explain it</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">Every row moves focus somewhere. None of them leaves it on the submit button, and none leaves it on the body.</text>
</svg>

## Failure Modes and Edge Cases

### 1. A framework re-render replaces the button anyway

Keying the button on the submitting state remounts it. Keep the key stable and change only the attributes.

### 2. Focus moved before the target exists

Rendering the summary and focusing it in the same frame works only if the render is synchronous. Await the render, then focus — and check the element is in the document.

### 3. The reader moved during the request

Someone who tabbed away and started typing elsewhere should not be yanked back for a *success*. For a failure, moving focus is still right — they need to fix something — but announce it rather than moving silently.

### 4. Navigating away on success

If success means a route change, the destination must take focus. A client-side navigation does not move focus by itself, so the reader lands on a new page with focus still on the old one.

### 5. Double submission via keyboard repeat

Holding `Enter` on a focused submit button repeats the keydown. The disabled attribute covers it, which is another reason to disable rather than replace.

The busy state has an accessible shape as well as a visual one, and the two are easy to get out of step:

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visually the reader needs the control to look unavailable and something to indicate work is happening, and the layout must not shift when it appears. For assistive technology the control needs aria-busy on the form or the region, the disabled state on the button itself, and a polite announcement that submission has started. The mistake is providing only the visual half, which leaves a reader who cannot see the spinner with a button that silently stopped responding." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the busy state must say, and to whom</title>
  <desc>Visually the reader needs the control to look unavailable and something to indicate work is happening, and the layout must not shift when it appears. For assistive technology the control needs aria-busy on the form or the region, the disabled state on the button itself, and a polite announcement that submission has started. The mistake is providing only the visual half, which leaves a reader who cannot see the spinner with a button that silently stopped responding.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">visually</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">the control looks unavailable</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">something indicates work is happening</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">the layout does not shift</text>
  <text x="28" y="128" font-size="10" fill="#a63d6f" font-family="inherit">and it is not the only signal</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">for assistive technology</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">aria-busy on the form or region</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">disabled on the button itself</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">a polite "Submitting…" announcement</text>
  <text x="366" y="128" font-size="10" fill="#2d6342" font-family="inherit">so the pause is explained, not just felt</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">A spinner alone tells a screen reader user nothing: the button simply stopped responding and no one said why.</text>
</svg>

## Verification Checklist

- [ ] The submit button is disabled, not replaced, while in flight
- [ ] `document.activeElement` is never `<body>` during the request
- [ ] A polite announcement marks the start of the wait
- [ ] Success moves focus to the confirmation heading
- [ ] Failure moves focus to the summary, or to the single field
- [ ] The button is re-enabled even when the request throws
- [ ] A background autosave does not move focus
- [ ] A success that navigates moves focus at the destination

## Common Pitfalls

- **Keying the submit button on the submitting state.** A framework that sees a different key remounts the element, which is the same failure as replacing it by hand. Keep the key stable and change only the attributes.
- **Focusing the summary in the same tick it is created.** The element has to be in the document before `focus()` can reach it. Insert, then focus, and check the node is connected before calling.
- **Leaving the button disabled after a thrown error.** A `catch` that does not re-enable produces a form the reader cannot retry, which is worse than the original failure. Re-enable in a `finally`.
- **Announcing the result only visually.** A spinner that stops and a message that appears are both invisible to a screen reader unless something announces them. The focus move covers the summary; the polite region covers the wait.
- **Moving focus for a background save.** An autosave completing is not a reason to take the cursor away from whatever the reader is doing. Announce it politely and leave focus alone.

---

**Related**

- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) — where focus goes once the response is known
- [Moving Focus to the First Invalid Field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/) — the single-error branch
- [Retrying Failed Submissions with Backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/) — keeping the button usable across retries

← [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/)

## Frequently Asked Questions

<details>
<summary><strong>Why does replacing the button with a spinner break focus?</strong></summary>

Because focus lives on an element, and removing that element from the document leaves the browser with nowhere to put it — so it falls back to the body. From there nothing is announced when the response arrives, and the next Tab starts from the top of the page. Disabling the button instead keeps the element, keeps focus, and gives you a known place to move focus from when the response comes back.

</details>

<details>
<summary><strong>Should focus move if the reader has already moved on?</strong></summary>

For a failure, yes — they need to repair something, and leaving them where they are means the failure may never be noticed. Announce it as well, so the move is explained rather than surprising. For a success, no: taking the cursor away from whatever they started doing is disruptive and gains nothing, so announce it politely and leave focus alone.

</details>

<details>
<summary><strong>What about a form that navigates on success?</strong></summary>

The destination has to take focus, because a client-side navigation does not move it. Without that, the reader arrives on a confirmation page with focus still on the button of a form that no longer exists, and a screen reader announces nothing about where they are. Focus the destination's main heading as part of the navigation, exactly as a multi-step wizard focuses each new step.

</details>

