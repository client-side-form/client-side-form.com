---
layout: page.njk
title: "Error Summary and Messaging"
description: "Give a failed submit a scope and a route: a focusable summary listing every problem in document order, and message copy that tells the reader what to type rather than what your validator concluded."
slug: error-summary-and-messaging
type: topic
breadcrumb: "Accessibility & Error UX > Error Summary and Messaging"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Error Summary and Messaging"
  parent: "Accessibility and Error UX"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Error Summary and Messaging",
      "description": "Give a failed submit a scope and a route: a focusable summary listing every problem in document order, and message copy that tells the reader what to type rather than what your validator concluded.",
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
          "name": "Error Summary and Messaging",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the summary be a live region, or a focus target?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A focus target. Moving focus to the summary announces its heading and content in every screen reader, puts the reader where the repair links are, and gives them a stable place to return to. Making it a live region as well produces two announcements of the same content, which is the single most common summary bug. Reserve live regions for changes the reader is not being moved to."
          }
        },
        {
          "@type": "Question",
          "name": "What order should the entries be in?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Document order, which is also tab order and screen-reader order. A reader working through the list then moves through the form in the same direction they would anyway. Ordering by severity puts the list out of step with the form, so fixing the first entry leaves the reader hunting backwards for the second, and it implies a priority that rarely means anything to them."
          }
        },
        {
          "@type": "Question",
          "name": "Should the summary appear for a single error?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Move focus straight to that field instead. A summary of one item asks the reader to read a heading, a count and a link in order to reach somewhere focus could have taken them immediately. Keep the threshold at two, and keep the branch in one place so the whole form behaves consistently."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the summary sit on the page?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Immediately above the form and inside the same landmark, so that a reader who scrolls up from a field finds it, and a reader who has just been focused into it can move directly into the first field afterwards. Putting it at the top of the page, above the header, means the tab sequence from the summary passes back through the site navigation before reaching the form."
          }
        }
      ]
    }
  ]
}
</script>

# Error Summary and Messaging

When a submit fails with several problems at once, the reader needs two things the individual field messages cannot give them: how many problems there are, and a route to each one. That is what an error summary is for — and the reason it is a topic rather than a component is that most of the difficulty is in the wording and the timing rather than in the markup.

## Problem Statement

The sub-problem is *scope before repair*. A reader who presses submit and sees three fields turn red has to hunt for them, and a reader using a screen reader has to traverse the whole form to find out what happened. A summary answers "how bad is this" in one utterance, then hands over a list of links that each land on a specific field.

The second half of the problem is that a summary makes bad copy louder. A form with one badly worded message has one confusing field; a summary of five badly worded messages is a wall of text that tells the reader nothing they can act on. The two halves are inseparable, which is why they belong on one page.

## State Machine Specification

The summary has three states, and the transitions between them are where the accessibility bugs live.

| State | When | Focus | Announcement |
|---|---|---|---|
| absent | before the first submit attempt | untouched | none |
| present | a submit attempt found 2 or more errors | moves to the summary | the count, then the first entry |
| updated | a later attempt found a different set | moves to the summary again | the new count |

A single error skips the summary entirely and focuses that field: a list of one is a step the reader did not need. That rule comes from [focus management after validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/), and the summary is the "two or more" branch of it.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Anatomy of an error summary: a container with tabindex minus one and a heading, a count sentence, and a list of links whose text is the field label followed by what to do, each pointing at the id of the field it fixes." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The five parts of a summary, and what each one is for</title>
  <desc>The container carries tabindex minus one so focus can be moved to it programmatically, and a role that makes it a landmark the reader can return to. The heading names the problem in the reader's terms. The count sentence answers how many problems there are before any of them are described. The list holds one entry per failing field, ordered in document order so it matches tab order. Each entry is a link whose href is the field's id, whose text is the field label followed by what to do, and which moves focus to that field when activated.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="14" y="24" width="420" height="192" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="2"/>
  <text x="30" y="50" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">There is a problem with 3 answers</text>
  <text x="30" y="74" font-size="10.5" fill="#6b5f75" font-family="inherit">Check these and try again.</text>
  <text x="30" y="104" font-size="10.5" fill="#7b4f8a" font-family="inherit">Email address — enter an address we can reach you at</text>
  <text x="30" y="128" font-size="10.5" fill="#7b4f8a" font-family="inherit">Post code — enter a post code, for example M1 4AB</text>
  <text x="30" y="152" font-size="10.5" fill="#7b4f8a" font-family="inherit">Card number — enter the 16 digits on the front</text>
  <text x="30" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">tabindex="-1" · focus lands here · announced once</text>
  <text x="454" y="50" font-size="9.5" fill="#6b5f75" font-family="inherit">heading — names the problem</text>
  <text x="454" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">count — scope, before detail</text>
  <text x="454" y="104" font-size="9.5" fill="#6b5f75" font-family="inherit">links, in document order</text>
  <text x="454" y="128" font-size="9.5" fill="#6b5f75" font-family="inherit">label + what to do</text>
  <text x="454" y="152" font-size="9.5" fill="#6b5f75" font-family="inherit">href points at the field id</text>
  <text x="454" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">container is a landmark</text>
  <path d="M440,46 H450" stroke="#7b4f8a" stroke-width="1.2"/>
  <path d="M440,72 H450" stroke="#7b4f8a" stroke-width="1.2"/>
  <path d="M440,100 H450" stroke="#7b4f8a" stroke-width="1.2"/>
  <path d="M440,124 H450" stroke="#7b4f8a" stroke-width="1.2"/>
  <path d="M440,148 H450" stroke="#7b4f8a" stroke-width="1.2"/>
  <path d="M440,182 H450" stroke="#7b4f8a" stroke-width="1.2"/>
</svg>

## Core Implementation

```typescript
interface SummaryEntry {
  readonly fieldId: string;     // the id on the input, so href="#id" works
  readonly label: string;       // the visible label, not the field name
  readonly action: string;      // what to DO, not what went wrong
  readonly domOrder: number;    // position in the document, for sorting
}

/**
 * Build the summary from the error map. Order is document order, because that
 * is also tab order and screen-reader order — sorting by severity or by field
 * name puts the list out of step with the form it describes.
 */
export function buildSummary(
  errors: Readonly<Record<string, FieldError>>,
  fields: Readonly<Record<string, { id: string; label: string; domOrder: number }>>,
): SummaryEntry[] {
  return Object.entries(errors)
    .flatMap(([name, err]) => {
      const meta = fields[name];
      // An error with no rendered field still needs to appear, so it becomes a
      // form-level entry rather than being silently omitted from the count.
      if (!meta) return [{ fieldId: '', label: 'This form', action: err.message, domOrder: -1 }];
      return [{ fieldId: meta.id, label: meta.label, action: err.message, domOrder: meta.domOrder }];
    })
    .sort((a, b) => a.domOrder - b.domOrder);
}
```

The rendered markup is deliberately plain. A summary is one of the few places where native elements do all the work, and reaching for ARIA where a heading and a list would do is how summaries end up announcing twice:

```html
<!-- tabindex="-1" makes it programmatically focusable without adding a tab stop.
     No role="alert": focus is being moved here, and the move is what announces it.
     An alert region PLUS a focus move produces two announcements. -->
<div class="error-summary" tabindex="-1" id="error-summary">
  <h2>There is a problem with 3 answers</h2>
  <p>Check these and try again.</p>
  <ul>
    <li><a href="#email">Email address — enter an address we can reach you at</a></li>
    <li><a href="#postcode">Post code — enter a post code, for example M1 4AB</a></li>
    <li><a href="#card">Card number — enter the 16 digits on the front</a></li>
  </ul>
</div>
```

## Integration Guidance

The summary consumes the same `FieldErrorMap` as everything else, so it works unchanged for local errors, for the server errors described in [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/), and for the mixture of both that a real failed submit produces. Its only additional requirement is field metadata — id, visible label, document position — which the field registration already has.

Ordering deserves a decision rather than a default. Document order matches tab order and screen-reader order, so an entry list in document order lets a reader work top to bottom exactly as they would through the form. Severity ordering sounds appealing and is not: it puts the list out of step with the thing it describes, and a reader who fixes the first entry then has to hunt for the second.

The link targets need one piece of CSS to work properly. A jump to `#email` scrolls the field flush to the viewport edge, where a sticky header covers it — the same problem, and the same one-line fix, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).

## Edge Cases and Failure Modes

**Announcing twice.** A summary that is both a live region and a focus target is announced by the region and again by the focus move. Pick one: moving focus is the better choice, because it also puts the reader where the links are.

**The count and the list disagree.** An error with no rendered field is easy to omit from the list while still counting it, or vice versa. Build both from the same array.

**A second submit with a different set.** Focus must move to the summary again, or a reader who fixed one problem and reintroduced another hears nothing. Re-focusing the same element does not re-announce in every screen reader, so update the heading text as well.

**Entries that describe the rule.** "Email is invalid" tells the reader what your validator concluded. "Enter an address we can reach you at" tells them what to type. The second is longer and better.

**A summary for one error.** It is a list of one, and it costs the reader a click to reach a field that focus could have gone to directly.

The summary and the field messages describe the same errors, and dividing the work between them stops either from repeating the other:

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The summary answers how many problems there are and where each one is; it is read once, on arrival, and its entries are links. Each field message answers what is wrong with this field and what to type instead; it is read whenever the field is reached, and it needs no link because the reader is already there. The overlap is the message text itself, which should be identical in both so a reader who read it in the summary recognises it at the field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two places, two jobs</title>
  <desc>The summary answers how many problems there are and where each one is; it is read once, on arrival, and its entries are links. Each field message answers what is wrong with this field and what to type instead; it is read whenever the field is reached, and it needs no link because the reader is already there. The overlap is the message text itself, which should be identical in both so a reader who read it in the summary recognises it at the field.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">the summary answers</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">how many problems are there?</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">where is each one?</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">read once, on arrival</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">entries are links</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">the field message answers</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">what is wrong here?</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">what should I type instead?</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">read whenever the field is reached</text>
  <text x="366" y="128" font-size="10" fill="#6b5f75" font-family="inherit">no link — the reader is already there</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">The message text is shared, so a reader who read it in the summary recognises it when they arrive at the field.</text>
</svg>

<svg viewBox="0 8 690 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Absent, before any submit attempt: the summary is not in the document at all, so it is not a tab stop and not something a screen reader traverses. Present, after an attempt found two or more errors: focus moves to it, the heading carries the count, and every entry links to a field. Updated, after a later attempt found a different set: focus moves to it again and the heading text changes, which is what makes the second announcement distinguishable from the first." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three summary states and what each one does</title>
  <desc>Absent, before any submit attempt: the summary is not in the document at all, so it is not a tab stop and not something a screen reader traverses. Present, after an attempt found two or more errors: focus moves to it, the heading carries the count, and every entry links to a field. Updated, after a later attempt found a different set: focus moves to it again and the heading text changes, which is what makes the second announcement distinguishable from the first.</desc>
  <rect x="0" y="8" width="690" height="206" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="132" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">State</text>
  <text x="160" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">In the document?</text>
  <text x="330" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus</text>
  <text x="470" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Heading</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">absent</text>
  <text x="160" y="66" font-size="10" fill="#6b5f75" font-family="inherit">no</text>
  <text x="330" y="66" font-size="10" fill="#6b5f75" font-family="inherit">untouched</text>
  <text x="470" y="66" font-size="10" fill="#6b5f75" font-family="inherit">—</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">present</text>
  <text x="160" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="330" y="100" font-size="10" fill="#2d6342" font-family="inherit">moves to it</text>
  <text x="470" y="100" font-size="10" fill="#2d6342" font-family="inherit">the count</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">updated</text>
  <text x="160" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="330" y="134" font-size="10" fill="#2d6342" font-family="inherit">moves again</text>
  <text x="470" y="134" font-size="10" fill="#2d6342" font-family="inherit">rewritten</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">"Rewritten" matters: re-focusing an element that already has focus does not re-announce in several screen readers.</text>
</svg>

## Troubleshooting Reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Errors announced twice | Check whether the container is both a live region and a focus target | Remove the live region; keep the focus move |
| Nothing announced on the second submit | Check whether the heading text changed between attempts | Rewrite the heading with the new count |
| A link scrolls the field under the header | Check `scroll-margin-top` on the field | Set it to the header height on the field itself |
| The count is higher than the list length | Compare the sources of the two numbers | Derive both from the same array |
| Focus lands on the summary and reads nothing | Check `tabindex="-1"` and that the heading is inside the container | Focus the container, not the heading |

### Message quality as a reviewable artefact

The half of this topic that no gate can check is the wording, and the practical answer is to make the messages a reviewable artefact rather than strings scattered through components. A single module that maps rule identifiers to sentences can be read end to end in a minute, diffed like code, and handed to whoever owns the product's voice without them having to read a schema.

```typescript
// One module, readable end to end. A rule with no entry here is a rule whose
// message nobody has written — which is a review comment, not a runtime error.
export const MESSAGES = {
  'email.format':    'Email address — enter an address we can reach you at',
  'email.taken':     'Email address — that one is already registered. Sign in instead?',
  'postcode.format': 'Post code — enter a post code, for example M1 4AB',
  'card.length':     'Card number — enter the 16 digits on the front of the card',
  'phone.required':  'Phone number — so we can text you the delivery code',
} as const;
```

Four properties make that table reviewable rather than merely centralised. Every entry starts with the field label, so it reads correctly both beside the field and inside a summary where the field is not visible. Every entry states an action rather than a rule, so a reader who has only that sentence knows what to type. Entries for anything with a format carry an example, which removes a whole class of guessing. And no entry blames — there is no *invalid*, no *you must*, and no *error:* anywhere in the file, which is a property you can grep for.

The last of those is worth automating even though the overall quality cannot be. A test that fails when a message contains *invalid*, *illegal* or *must* catches the regression where a new rule is added with a message copied from the validator's own vocabulary. It does not make the copy good; it makes the copy that is definitely bad impossible to ship without someone deciding to.

### Counting problems the way a reader would

The number in the summary heading is a claim, and getting it wrong undermines everything else the summary says. Three cases make it easy to overcount. A field carrying several issues is one problem, not three — render the first and keep the rest for logging. A cross-field rule reported on both participants is one problem, not two, which is the strongest practical argument for attaching group rules to the group. And a server error that duplicates a local one for the same field is one problem: precedence decides which message is shown, and the count follows the rendered set rather than the map.

The rule that covers all three is that the count is the length of the list, and the list is built once. Deriving the number separately — from the error map, from a validity flag, from anywhere other than the array the entries were rendered from — is how a summary comes to announce four problems above a list of three.

## Testing and QA Hooks

Assert on structure rather than on copy. `data-error-summary`, one `<li>` per entry, and an `href` on each entry that matches an existing `id` are all stable across rewording. The one copy assertion worth keeping is that no entry text equals a field name — that catches the regression where a developer wires the summary to `Object.keys(errors)`.

For screen-reader behaviour, the assertions that matter are: after a failed submit with two or more errors, `document.activeElement` is the summary container; the container's heading contains a number equal to the list length; and activating an entry moves focus to an element whose `aria-invalid` is `"true"`.

## Common Pitfalls

- **`role="alert"` on the summary.** Combined with a focus move it announces twice, and on its own it announces before the reader has been moved anywhere useful.
- **Sorting by severity.** It desynchronises the list from the form.
- **Linking to the label instead of the input.** Focus lands on text, and the reader has to tab once more to reach the field.
- **Rendering the summary above the fold but focusing nothing.** Sighted readers see it, keyboard and screen-reader users do not.
- **Writing entries from the validator's point of view.** "Failed pattern check" is accurate, and useless.

---

**Related**

- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) — the markup and focus handling in full
- [Writing Error Messages That Tell the Reader What to Do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/) — the copy the summary amplifies
- [Focus Management After Validation](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/) — the branch that decides whether a summary appears at all
- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/) — why the summary is not one

← [Accessibility & Error UX for Forms](https://www.client-side-form.com/accessibility-and-error-ux/)

## Frequently Asked Questions

<details>
<summary><strong>Should the summary be a live region, or a focus target?</strong></summary>

A focus target. Moving focus to the summary announces its heading and content in every screen reader, puts the reader where the repair links are, and gives them a stable place to return to. Making it a live region as well produces two announcements of the same content, which is the single most common summary bug. Reserve live regions for changes the reader is not being moved to.

</details>

<details>
<summary><strong>What order should the entries be in?</strong></summary>

Document order, which is also tab order and screen-reader order. A reader working through the list then moves through the form in the same direction they would anyway. Ordering by severity puts the list out of step with the form, so fixing the first entry leaves the reader hunting backwards for the second, and it implies a priority that rarely means anything to them.

</details>

<details>
<summary><strong>Should the summary appear for a single error?</strong></summary>

No. Move focus straight to that field instead. A summary of one item asks the reader to read a heading, a count and a link in order to reach somewhere focus could have taken them immediately. Keep the threshold at two, and keep the branch in one place so the whole form behaves consistently.

</details>

<details>
<summary><strong>Where should the summary sit on the page?</strong></summary>

Immediately above the form and inside the same landmark, so that a reader who scrolls up from a field finds it, and a reader who has just been focused into it can move directly into the first field afterwards. Putting it at the top of the page, above the header, means the tab sequence from the summary passes back through the site navigation before reaching the form.

</details>

