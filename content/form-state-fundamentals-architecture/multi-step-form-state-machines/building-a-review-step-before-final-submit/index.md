---
layout: page.njk
title: "Building a Review Step Before Final Submit"
description: "A review step that summarises every answer, links each one back to the step where it can be changed, returns to review after the edit, and revalidates the whole path before the final submit."
slug: building-a-review-step-before-final-submit
type: howto
breadcrumb: "Review Step"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Building a Review Step Before Final Submit"
  parent: "Multi-Step Form State Machines"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building a Review Step Before Final Submit",
      "description": "A review step that summarises every answer, links each one back to the step where it can be changed, returns to review after the edit, and revalidates the whole path before the final submit.",
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
          "name": "Multi-Step Form State Machines",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Building a Review Step Before Final Submit",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/building-a-review-step-before-final-submit/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a review step for a multi-step form",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Render answers with a description list"
        },
        {
          "@type": "HowToStep",
          "name": "Give each Change link a unique accessible name"
        },
        {
          "@type": "HowToStep",
          "name": "Enter the step in edit mode"
        },
        {
          "@type": "HowToStep",
          "name": "Return to review after saving — unless the path grew"
        },
        {
          "@type": "HowToStep",
          "name": "Revalidate the whole path on entering review"
        },
        {
          "@type": "HowToStep",
          "name": "Revalidate again on submit"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the review step allow inline editing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a few simple fields, inline editing on review can be quicker. For anything with dependencies or validation beyond a single field, sending the user to the owning step keeps the validation and relevance logic in one place. Mixed approaches tend to duplicate rules."
          }
        },
        {
          "@type": "Question",
          "name": "Is a review step always worth adding?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It pays for itself when answers are consequential or hard to undo — applications, payments, legal declarations — and when the wizard is long enough that users cannot remember what they entered. For a two-step signup, a review step is friction."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the final submit button's error go?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Server rejections of specific answers go on the matching review rows, with an error summary above them. Failures unrelated to any answer — outages, rate limits — go in a form-level banner at the top of review, and the submit button stays available for retry."
          }
        }
      ]
    }
  ]
}
</script>

# Building a Review Step Before Final Submit

A review step is where users catch their own mistakes, but most implementations undermine it: the "Change" link sends the user back into the wizard and makes them click Next through every later step to return, and answers made stale by the change are submitted anyway.

In a [multi-step form state machine](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/) the review step is a state like any other, with two special jobs. It must *render* the committed answers in a form people can scan, and it must be a *hub*: every answer links to its step, and finishing that step returns straight to review — after revalidating anything the edit affected.

---

## Context and prerequisites

A good review step does four things:

- **Summarises answers as the user would read them.** "Business account", not `accountType: "business"`; the country name, not the ISO code; "Not provided" rather than a blank.
- **Offers one "Change" link per answer or group,** labelled so a screen-reader user hears which answer it changes ("Change company name", not five links called "Change").
- **Returns to review after an edit.** The user who changes their postcode should not have to click Next through three unaffected steps.
- **Revalidates before submit.** Changing an earlier answer can make later answers invalid or irrelevant. Submit must check the whole path again, not only the step last edited.

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of the review step in the centre with change links out to three earlier steps and return arrows back, contrasted with a linear path that forces the user through every later step." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The review step as a hub</title>
  <desc>In the linear pattern, changing the first step&#x27;s answer takes the user forward through step two and step three before reaching review again. In the hub pattern, each Change link opens the relevant step in edit mode, and saving it returns directly to review, after revalidating any answers that depended on it.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Linear return</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Change → step 1 → Next → step 2 → Next → step 3 → Next →</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">review.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Three extra screens for one edit.</text>
  <text x="26.0" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Later steps may silently keep stale answers.</text>
  <rect x="347.0" y="12.0" width="319.0" height="99.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Hub return</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Change → step 1 (edit mode) → Save → review.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One screen for one edit.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Dependent answers revalidated before returning.</text>
</svg>

---

## The core pattern: an edit mode and a whole-path revalidation

```typescript
type StepId = "account" | "company" | "address" | "tax";

interface WizardState {
  step: StepId | "review";
  returnTo: "review" | null;               // set when entering a step from a Change link
  answers: Record<StepId, Record<string, unknown> | undefined>;
}

type StepSchema = { safeParse(v: unknown): { success: boolean; error?: { issues: { path: (string | number)[] }[] } } };

export function changeFromReview(s: WizardState, step: StepId): WizardState {
  return { ...s, step, returnTo: "review" };
}

// Called when the user saves a step. In edit mode, go straight back to
// review; otherwise follow the normal path.
export function completeStep(
  s: WizardState, data: Record<string, unknown>, nextOnPath: (s: WizardState) => StepId | "review",
): WizardState {
  const updated = { ...s, answers: { ...s.answers, [s.step as StepId]: data } };
  if (s.returnTo === "review") {
    // An edit can put a NEW step on the path (e.g. switching to business adds
    // "company"). If that step has no answers yet, it must be visited first.
    const missing = firstIncompleteStep(updated);
    return missing ? { ...updated, step: missing } : { ...updated, step: "review", returnTo: null };
  }
  return { ...updated, step: nextOnPath(updated) };
}

// Whole-path validation run on entering review AND again on submit.
export function validatePath(
  s: WizardState, path: StepId[], schemas: Record<StepId, StepSchema>,
): { step: StepId; paths: string[] }[] {
  return path.flatMap((step) => {
    const r = schemas[step].safeParse(s.answers[step] ?? {});
    return r.success ? [] : [{ step, paths: r.error!.issues.map((i) => i.path.join(".")) }];
  });
}

declare function firstIncompleteStep(s: WizardState): StepId | null;
```

```html
<dl class="review">
  <div class="review-row">
    <dt>Company name</dt>
    <dd>Analytical Engines Ltd</dd>
    <dd><a href="?step=company&amp;return=review">Change<span class="visually-hidden"> company name</span></a></dd>
  </div>
</dl>
```

---

## Step-by-step walkthrough

1. **Render answers with a description list.** `<dl>` with `<dt>` and `<dd>` pairs is read as term and value by screen readers and is easy to scan visually. Format values for humans, and show "Not provided" for optional blanks.
2. **Give each Change link a unique accessible name.** Visually "Change", audibly "Change company name", using visually hidden text.
3. **Enter the step in edit mode.** Record `returnTo: "review"`, and label the step's primary button "Save and return to review" so the user knows where it goes.
4. **Return to review after saving — unless the path grew.** If the edit added a step that has never been answered, go there first; its button also returns to review.
5. **Revalidate the whole path on entering review.** If an edit made a later answer invalid (a postcode no longer valid for the new country), show the review with that row flagged and its Change link as the obvious next action.
6. **Revalidate again on submit.** Review may have been open for an hour; rules or server-side data may have changed. The final submit validates everything, and routes server errors back to rows on the review, not to hidden steps. The server side is covered in [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of the user changing country on the address step from the review, the wizard revalidating the path, finding the tax step&#x27;s VAT number now invalid, and returning to review with that row flagged." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>An edit that invalidates a later answer</title>
  <desc>From review, the user activates Change country and the wizard opens the address step in edit mode. The user changes the country from Germany to France and saves. The wizard revalidates the whole path and finds the stored German VAT number invalid for France. It returns to review with the VAT row flagged and an error summary pointing at its Change link, instead of submitting an inconsistent record.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Wizard</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Path validator</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Change country (from review)</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">address step, edit mode</text>
  <path d="M340.0,97.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,93.0 123.7,97.0 130.7,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">save: country DE → FR</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validate whole path</text>
  <path d="M340.0,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">tax.vatNumber invalid for FR</text>
  <path d="M557.3,181.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,177.0 341.0,181.0 348.0,185.0" fill="#7b4f8a"/>
  <text x="130.7" y="205.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">review, VAT row flagged</text>
  <path d="M340.0,209.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,205.0 123.7,209.0 130.7,213.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Review built from live form state instead of committed answers

If review reads the in-progress state of a step the user abandoned mid-edit, it shows values they never saved. Review renders committed answers only; an abandoned edit is discarded when the user returns without saving.

### 2. Irrelevant answers shown on review

After switching to a personal account, the company section should disappear from review — its answers are kept for convenience, but not shown or submitted. Use the same relevance rule as the payload, from [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/).

### 3. Focus on returning to review

Returning to review should put focus on the row that was changed (or the success message confirming it), not the top of the page — otherwise a screen-reader user must find their place again in a long list.

### 4. Sensitive values

Mask values such as full account numbers on review ("ending 4821") and never echo passwords. Review pages are often screenshotted or left on shared screens.

### 5. Long reviews

For wizards with dozens of answers, group review rows under the step headings with a Change link per group rather than per row, and use the error summary pattern from [building an accessible error summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) when revalidation finds problems.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing raw stored answer values alongside how they should be displayed on the review step." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Formatting stored answers for review</title>
  <desc>The raw value business is shown as Business account. The ISO code FR is shown as France. An empty optional field is shown as Not provided. A date stored as an ISO string is shown in the user&#x27;s locale format. A full account number is masked to its last four digits. A boolean newsletter flag is shown as a sentence.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stored</text>
  <text x="280.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Shown on review</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">accountType: &quot;business&quot;</text>
  <text x="280.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Business account</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">country: &quot;FR&quot;</text>
  <text x="280.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">France</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">middleName: &quot;&quot;</text>
  <text x="280.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Not provided</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">startDate: &quot;2026-10-01&quot;</text>
  <text x="280.8" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1 October 2026 (user&#x27;s locale)</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">iban: &quot;FR76…4821&quot;</text>
  <text x="280.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">Ending 4821</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">newsletter: false</text>
  <text x="280.8" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">You will not receive the newsletter</text>
</svg>

---

## Verification checklist

- [ ] Every answer on review has a Change link with a unique accessible name.
- [ ] Saving an edited step returns straight to review.
- [ ] An edit that adds a new step routes through that step before returning.
- [ ] An edit that invalidates a later answer shows the review with that row flagged.
- [ ] Answers for steps no longer on the path are hidden and excluded from submit.
- [ ] Focus lands on the changed row after returning.
- [ ] Final submit revalidates the entire path.
- [ ] Sensitive values are masked on review.

---

## Frequently Asked Questions

<details>
<summary><strong>Should the review step allow inline editing?</strong></summary>

For a few simple fields, inline editing on review can be quicker. For anything with dependencies or validation beyond a single field, sending the user to the owning step keeps the validation and relevance logic in one place. Mixed approaches tend to duplicate rules.

</details>

<details>
<summary><strong>Is a review step always worth adding?</strong></summary>

It pays for itself when answers are consequential or hard to undo — applications, payments, legal declarations — and when the wizard is long enough that users cannot remember what they entered. For a two-step signup, a review step is friction.

</details>

<details>
<summary><strong>Where should the final submit button's error go?</strong></summary>

Server rejections of specific answers go on the matching review rows, with an error summary above them. Failures unrelated to any answer — outages, rate limits — go in a form-level banner at the top of review, and the submit button stays available for retry.

</details>

---

## Related

- [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
- [Validating Only the Current Step](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/)
- [Focus Management in Multi-Step Wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/)

← [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
