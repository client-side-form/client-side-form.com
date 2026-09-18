---
layout: page.njk
title: "Writing Error Messages That Tell the Reader What to Do"
description: "Turn rule names into actions: name the field, state the next keystroke, give an example for anything with a format, and never let colour or blame carry the meaning."
slug: writing-error-messages-that-tell-the-reader-what-to-do
type: howto
breadcrumb: "Writing Error Messages That Tell the Reader What to Do"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Writing Error Messages That Tell the Reader What to Do"
  parent: "Error Summary and Messaging"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Writing Error Messages That Tell the Reader What to Do",
      "description": "Turn rule names into actions: name the field, state the next keystroke, give an example for anything with a format, and never let colour or blame carry the meaning.",
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
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Writing Error Messages That Tell the Reader What to Do",
          "item": "https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Write a form error message a reader can act on",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Keep the message beside the rule that produces it"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Start with the field label so it stands alone"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "State the action in the imperative"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Give an example for any format-constrained field"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Explain non-obvious requirements"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Map server codes to copy you own"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the message go above or below the field?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Below the label and above the input, or immediately below the input — either works, as long as it is inside the element the field is described by and it does not move the input when it appears. What matters more than position is that the message is in the accessibility tree via aria-describedby, because that is what determines whether it is read at all; visual position only affects sighted readers, who will find it either way if it is close."
          }
        },
        {
          "@type": "Question",
          "name": "Is it worth writing per-field required messages?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Eight fields sharing 'This field is required' produce a summary that lists the same sentence eight times, which tells the reader nothing about which field to go to or why it matters. Per-field wording — 'Phone number, so we can text you the delivery code' — turns the summary into a map and answers the question a required field always raises."
          }
        },
        {
          "@type": "Question",
          "name": "What about messages that come from the server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Treat the server's wording as a fallback and map its stable code to copy you control. Server messages are written for whoever reads the logs, may be untranslated, and often leak internal vocabulary. Falling back to them when a code is unrecognised is still right — an imperfect message beats a silent failure — but the mapped copy should be what readers normally see."
          }
        }
      ]
    }
  ]
}
</script>

# Writing Error Messages That Tell the Reader What to Do

The exact problem: a form is technically accessible — every message is associated, announced and visible — and readers still abandon it, because every message describes the rule that failed rather than the action that would succeed.

## Context and Prerequisites

This is the copy half of [error summary and messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/). The wiring is assumed: messages reach the field through `aria-describedby`, and the summary reads the same strings. Nothing here changes any of that. What changes is what the strings say.

Message quality is the one part of the error pipeline no automated check can catch. Contrast, association and announcement are all testable; "does this sentence tell the reader what to type" is not.

## The Four Properties of a Message That Works

```typescript
/**
 * A message is a sentence the reader can act on. Each property below removes
 * one reason they cannot: not knowing which field, not knowing what is wrong,
 * not knowing what would be right, or not being able to see it as an error.
 */
interface Message {
  /** 1. Names the field, so it stands alone in a summary. */
  readonly subject: string;      // "Post code"
  /** 2. States what to do, in the imperative. */
  readonly action: string;       // "Enter a post code, for example M1 4AB"
  /** 3. Never blames. No "invalid", no "you must", no "error:". */
  readonly tone: 'neutral';
  /** 4. Carries meaning without colour — the text alone is enough. */
  readonly code: string;         // for analytics, not for the reader
}
```

**Name the subject.** In a summary the message appears without its field, so "Enter a value" is unusable. `Post code — enter a post code, for example M1 4AB` reads correctly in both places.

**Say what to do.** "Invalid format" describes the validator's conclusion. "Enter a post code, for example M1 4AB" describes the reader's next keystroke. The example is doing more work than the rule name ever could.

**Do not blame.** "You entered an invalid email" makes a mistake into an accusation. "Enter an address we can reach you at" is the same information with no accusation in it — and it also explains *why* the field exists.

**Do not rely on colour.** Red text with no words that indicate a problem fails for anyone who cannot distinguish it, including anyone reading in bright sunlight. The sentence itself must be recognisable as a problem.

<svg viewBox="0 8 690 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Five rewritten messages: a rule-name message, a blame message, a jargon message, a colour-dependent message and a vague message, each paired with a rewrite that names the field and states the action." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Five common messages, and what each one becomes</title>
  <desc>Invalid format becomes: post code, enter a post code, for example M1 4AB. You must enter a valid email becomes: email address, enter an address we can reach you at. Field does not match pattern becomes: card number, enter the sixteen digits on the front of the card. A message conveyed only by a red border becomes a sentence that says what is missing. And required becomes a sentence naming the field and what to put in it.</desc>
  <rect x="0" y="8" width="690" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Written as</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The problem</text>
  <text x="370" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rewritten</text>
  <text x="24" y="66" font-size="10" fill="#a63d6f" font-family="inherit">"Invalid format"</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">names the rule</text>
  <text x="370" y="66" font-size="10" fill="#2d6342" font-family="inherit">Post code — enter one, e.g. M1 4AB</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#a63d6f" font-family="inherit">"You must enter a valid email"</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">blames the reader</text>
  <text x="370" y="100" font-size="10" fill="#2d6342" font-family="inherit">Email — one we can reach you at</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#a63d6f" font-family="inherit">"Does not match pattern"</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">jargon</text>
  <text x="370" y="134" font-size="10" fill="#2d6342" font-family="inherit">Card — the 16 digits on the front</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#a63d6f" font-family="inherit">a red border, no text</text>
  <text x="200" y="168" font-size="10" fill="#6b5f75" font-family="inherit">colour only</text>
  <text x="370" y="168" font-size="10" fill="#2d6342" font-family="inherit">a sentence saying what is missing</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#a63d6f" font-family="inherit">"Required"</text>
  <text x="200" y="202" font-size="10" fill="#6b5f75" font-family="inherit">no subject, no action</text>
  <text x="370" y="202" font-size="10" fill="#2d6342" font-family="inherit">Phone — so we can text the code</text>
</svg>

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A hint is shown before the reader types and describes the requirement: use twelve characters or more. It reduces the number of errors that ever happen. A message is shown after an attempt and describes the repair: your password is too short, add four more characters. It assumes the reader already tried. Writing a hint as a message produces an error that states a rule; writing a message as a hint produces a form that scolds before the reader has done anything." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where a message lives decides how it reads</title>
  <desc>A hint is shown before the reader types and describes the requirement: use twelve characters or more. It reduces the number of errors that ever happen. A message is shown after an attempt and describes the repair: your password is too short, add four more characters. It assumes the reader already tried. Writing a hint as a message produces an error that states a rule; writing a message as a hint produces a form that scolds before the reader has done anything.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">a hint — shown before typing</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">describes the requirement</text>
  <text x="28" y="84" font-size="10" fill="#1e1a24" font-family="inherit">"Use 12 characters or more"</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">reduces how many errors happen</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">associated with describedby, always</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">a message — shown after an attempt</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">describes the repair</text>
  <text x="366" y="84" font-size="10" fill="#1e1a24" font-family="inherit">"Too short — add 4 more characters"</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">assumes the reader already tried</text>
  <text x="366" y="128" font-size="10" fill="#6b5f75" font-family="inherit">joins the described-by tokens, first</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">A message that states a rule is a hint in the wrong place; a hint that scolds is a message in the wrong place.</text>
</svg>

## Step-by-Step Walkthrough

1. **Write the message where the rule is.** A rule and its message belong in the same place, so changing one prompts changing the other. A message table keyed by error code, far from the schema, drifts.

2. **Start with the field label.** Then a dash, then the action. This reads correctly beside the field and inside the summary without a second string.

3. **Give an example for anything with a format.** Post codes, card numbers, reference numbers, dates. An example removes an entire class of guessing.

4. **Explain the requirement where it is not obvious.** "Phone number — so we can text you the delivery code" answers the question a required phone field always raises.

5. **Keep it to one sentence.** A message that needs two sentences is usually a field that needs a hint. Hints appear before the reader types; messages appear after.

6. **Map server codes to your own copy.** A rejection written for an operator does not become reader-facing just because it arrives in a `detail` field.

## Failure Modes and Edge Cases

### 1. The message is longer than the answer

"Please ensure that the value entered conforms to the required format" is nineteen words to say "use DD/MM/YYYY". Long messages are skimmed, and skimmed messages are unread.

### 2. The same message on every field

A generic "This field is required" repeated eight times makes a summary that says nothing eight times. Per-field wording costs a line each and makes the summary a map rather than a wall.

### 3. Blaming for a system failure

"Something went wrong with your submission" for a gateway timeout implies the reader did something. "We could not reach the service — try again" puts it where it belongs, and is also more accurate.

### 4. Copy that assumes sighted, sequential reading

"See above" and "the field below" are meaningless when the message is read out on its own, from a summary, or on a narrow screen where the layout has reflowed. Reference fields by their labels.

### 5. Translated messages with concatenated fragments

Building a message from `label + " " + rule` produces sentences that are ungrammatical in most languages other than English. Keep whole sentences as translatable units, with the label interpolated.

A short review pass catches most of it, and it can be done without opening the form:

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Search for the words invalid, illegal and error, which almost always indicate a message written from the validator's point of view. Search for the word must, which usually introduces a rule rather than an action. Search for messages under about four words, which are rarely specific enough to act on. Search for duplicate strings, which mean several fields share one message and the summary will repeat it. And search for messages with no example on any field whose format is constrained." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Five things to grep the message table for</title>
  <desc>Search for the words invalid, illegal and error, which almost always indicate a message written from the validator's point of view. Search for the word must, which usually introduces a rule rather than an action. Search for messages under about four words, which are rarely specific enough to act on. Search for duplicate strings, which mean several fields share one message and the summary will repeat it. And search for messages with no example on any field whose format is constrained.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Search for</text>
  <text x="260" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What it usually means</text>
  <text x="24" y="66" font-size="10" fill="#a63d6f" font-family="inherit">"invalid", "illegal", "error:"</text>
  <text x="260" y="66" font-size="10" fill="#6b5f75" font-family="inherit">written from the validator&amp;#39;s point of view</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#a63d6f" font-family="inherit">"must", "you must"</text>
  <text x="260" y="100" font-size="10" fill="#6b5f75" font-family="inherit">a rule where an action belongs</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">under ~4 words</text>
  <text x="260" y="134" font-size="10" fill="#6b5f75" font-family="inherit">too vague to act on</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">duplicate strings</text>
  <text x="260" y="168" font-size="10" fill="#6b5f75" font-family="inherit">the summary will say the same thing twice</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">no example, on a formatted field</text>
  <text x="260" y="202" font-size="10" fill="#6b5f75" font-family="inherit">the reader is left guessing the format</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">None of this is automatable as a pass or fail, but all of it is findable in a minute with a search.</text>
</svg>

## Verification Checklist

- [ ] Every message names its field, so it stands alone in the summary
- [ ] Every message states an action, not a rule name
- [ ] No message contains "invalid", "illegal", "you must" or "error:"
- [ ] Every format-constrained field has an example in its message
- [ ] No message relies on colour, an icon or position to be understood
- [ ] Messages are one sentence; anything longer is a hint, shown before typing
- [ ] Server-supplied wording is mapped through codes to copy you own
- [ ] Messages are whole translatable sentences, not concatenated fragments

---

**Related**

- [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/) — where these sentences are read twice
- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/) — the structure that amplifies them
- [Wiring aria-describedby for Multiple Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/) — how the message reaches the reader

← [Error Summary and Messaging](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/)

## Frequently Asked Questions

<details>
<summary><strong>Should the message go above or below the field?</strong></summary>

Below the label and above the input, or immediately below the input — either works, as long as it is inside the element the field is described by and it does not move the input when it appears. What matters more than position is that the message is in the accessibility tree via aria-describedby, because that is what determines whether it is read at all; visual position only affects sighted readers, who will find it either way if it is close.

</details>

<details>
<summary><strong>Is it worth writing per-field required messages?</strong></summary>

Yes. Eight fields sharing 'This field is required' produce a summary that lists the same sentence eight times, which tells the reader nothing about which field to go to or why it matters. Per-field wording — 'Phone number, so we can text you the delivery code' — turns the summary into a map and answers the question a required field always raises.

</details>

<details>
<summary><strong>What about messages that come from the server?</strong></summary>

Treat the server's wording as a fallback and map its stable code to copy you control. Server messages are written for whoever reads the logs, may be untranslated, and often leak internal vocabulary. Falling back to them when a code is unrecognised is still right — an imperfect message beats a silent failure — but the mapped copy should be what readers normally see.

</details>

