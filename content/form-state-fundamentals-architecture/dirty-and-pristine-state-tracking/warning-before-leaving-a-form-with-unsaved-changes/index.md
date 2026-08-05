---
layout: page.njk
title: "Warning Before Leaving a Form with Unsaved Changes"
description: "Two departures, two mechanisms: the browser-owned beforeunload prompt for leaving the document, and your own router guard — which can name the unsaved work and offer to save it."
slug: warning-before-leaving-a-form-with-unsaved-changes
type: howto
breadcrumb: "Warning Before Leaving a Form with Unsaved Changes"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Warning Before Leaving a Form with Unsaved Changes"
  parent: "Dirty and Pristine State Tracking"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Warning Before Leaving a Form with Unsaved Changes",
      "description": "Two departures, two mechanisms: the browser-owned beforeunload prompt for leaving the document, and your own router guard — which can name the unsaved work and offer to save it.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Dirty and Pristine State Tracking",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Warning Before Leaving a Form with Unsaved Changes",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/warning-before-leaving-a-form-with-unsaved-changes/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Warn a reader before they lose unsaved form changes",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Derive the dirty predicate from normalised values"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Register beforeunload only while the form is dirty"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Guard client-side navigation separately"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Offer save and continue, not only discard"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Make the dialog focus-managed and announced"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Clear the flag when the save is confirmed"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I customise the beforeunload message?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Every current browser shows its own wording and ignores any string you return, because customisable text was widely used to scare readers into staying. Treat beforeunload as a boolean — warn, or do not — and put all of your actual copy and options into the router guard, which you do control."
          }
        },
        {
          "@type": "Question",
          "name": "Why register the listener only while the form is dirty?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Partly hygiene, and partly performance: a registered beforeunload handler can disqualify the page from the browser's back-forward cache, which makes navigating away and back noticeably slower for every reader, including the ones with nothing unsaved. Adding it when the form becomes dirty and removing it when it becomes clean costs two lines."
          }
        },
        {
          "@type": "Question",
          "name": "Is an unsaved-changes warning still needed if the form autosaves?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually not for the document-leaving case — that is exactly what the draft protects. It can still be worth a router guard where leaving has a consequence the draft does not cover, such as abandoning a step-locked application. Where you have both, make the warning say the work is saved rather than that it will be lost: readers who have been told their draft is safe should not then be told they are about to lose it."
          }
        }
      ]
    }
  ]
}
</script>

# Warning Before Leaving a Form with Unsaved Changes

The exact problem: a reader spends ten minutes on a form, clicks a link in the navigation, and the page changes. Nothing warned them, and there is nothing to go back to.

## Context and Prerequisites

The signal this depends on is described in [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/): a reliable answer to "does this form hold changes the reader would be upset to lose". Without normalised dirty tracking the warning fires on a trailing space, and a warning that fires when nothing changed is one readers learn to dismiss.

## Core Pattern: Two Different Departures

A reader can leave in two ways, and they need completely different handling.

```typescript
/**
 * 1. Leaving the DOCUMENT — closing the tab, reloading, following an external
 *    link. The browser owns this dialog; you cannot word it or style it, and
 *    you must not try. Returning a value is the entire API.
 */
function onBeforeUnload(e: BeforeUnloadEvent): void {
  if (!isDirty()) return;              // no prompt when there is nothing to lose
  e.preventDefault();
  // Required by older browsers; the string is ignored by all current ones.
  e.returnValue = '';
}

/**
 * 2. Leaving the ROUTE — a client-side navigation within the same document.
 *    Here you own the dialog, so it can name what is unsaved and offer to save.
 */
function onBeforeRouteChange(to: string, proceed: () => void, cancel: () => void): void {
  if (!isDirty()) return proceed();
  showUnsavedDialog({
    onDiscard: proceed,
    onCancel: cancel,
    onSave: async () => { await save(); proceed(); },
  });
}
```

Conflating them produces the two classic bugs: registering `beforeunload` and expecting your own wording, or handling only the router and losing everything on a reload.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two departure paths compared: leaving the document uses the browser's own dialog with wording you cannot control and only fires after a user gesture, while leaving the route uses your dialog which can name the unsaved work and offer to save." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two ways to leave, two completely different mechanisms</title>
  <desc>Leaving the document — a tab close, a reload, an external link — is handled by the beforeunload event. The browser supplies the dialog, its wording cannot be changed, and it only appears at all if the reader has interacted with the page, which is a deliberate anti-abuse rule. Leaving the route — a client-side navigation — is handled by the router's own guard, where you supply the dialog, so it can name what is unsaved, offer to save and continue, and be made accessible. Both are needed: handling only the router loses work on a reload, and handling only beforeunload gives no useful options.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">leaving the document — beforeunload</text>
  <rect x="14" y="38" width="326" height="140" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#1e1a24" font-family="inherit">tab close, reload, external link</text>
  <text x="28" y="86" font-size="10" fill="#a63d6f" font-family="inherit">the browser owns the wording</text>
  <text x="28" y="110" font-size="10" fill="#a63d6f" font-family="inherit">needs a prior user gesture to fire</text>
  <text x="28" y="134" font-size="10" fill="#6b5f75" font-family="inherit">two options: leave, or stay</text>
  <text x="28" y="158" font-size="9.5" fill="#6b5f75" font-family="inherit">register only while dirty</text>
  <text x="364" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">leaving the route — your guard</text>
  <rect x="364" y="38" width="312" height="140" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="378" y="62" font-size="10" fill="#1e1a24" font-family="inherit">any client-side navigation</text>
  <text x="378" y="86" font-size="10" fill="#2d6342" font-family="inherit">you own the wording</text>
  <text x="378" y="110" font-size="10" fill="#2d6342" font-family="inherit">three options: save, discard, stay</text>
  <text x="378" y="134" font-size="10" fill="#6b5f75" font-family="inherit">can name what is unsaved</text>
  <text x="378" y="158" font-size="9.5" fill="#6b5f75" font-family="inherit">must be focus-managed and announced</text>
  <text x="14" y="210" font-size="10" fill="#6b5f75" font-family="inherit">You need both. Only the router guard loses work on a reload; only beforeunload gives the reader no way to save.</text>
</svg>

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Closing the tab, reloading and following an external link are all document departures, visible to beforeunload and invisible to a router guard. A client-side navigation is the reverse: the router sees it and beforeunload does not fire at all. Pressing the browser back button after a client-side navigation is seen by the router only, and only if it is listening for popstate. A crash or a phone reclaiming the tab is seen by neither, which is the case only an autosaved draft covers." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which departures each mechanism can see</title>
  <desc>Closing the tab, reloading and following an external link are all document departures, visible to beforeunload and invisible to a router guard. A client-side navigation is the reverse: the router sees it and beforeunload does not fire at all. Pressing the browser back button after a client-side navigation is seen by the router only, and only if it is listening for popstate. A crash or a phone reclaiming the tab is seen by neither, which is the case only an autosaved draft covers.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The reader does this</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">beforeunload</text>
  <text x="370" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">router guard</text>
  <text x="520" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">draft</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">closes the tab</text>
  <text x="220" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="370" y="66" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="520" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">reloads</text>
  <text x="220" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="370" y="100" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="520" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">navigates in-app</text>
  <text x="220" y="134" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="370" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="520" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">presses back</text>
  <text x="220" y="168" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="370" y="168" font-size="10" fill="#b07a55" font-family="inherit">with popstate</text>
  <text x="520" y="168" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">the tab is reclaimed</text>
  <text x="220" y="202" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="370" y="202" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="520" y="202" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">Read the last column downwards: a draft is the only mechanism that covers every row, which is why it beats a warning.</text>
</svg>

## Step-by-Step Walkthrough

1. **Derive `isDirty` from normalised values.** A trailing space is not a change worth interrupting for.

2. **Register the listener only while dirty.** An always-registered `beforeunload` can suppress the browser's own back-forward cache, which slows every navigation away from the page.

3. **Guard the router separately.** Same predicate, different mechanism, better dialog.

4. **Offer save, not just discard.** "Save and continue" turns a warning into a service. It is the option readers actually want.

5. **Make the dialog accessible.** It takes focus, has a heading, traps Tab, restores focus on cancel — everything in [keyboard navigation patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/).

6. **Clear the flag on a confirmed save.** Not when the request is sent — when it succeeds.

## Failure Modes and Edge Cases

### 1. The browser does not show the dialog

`beforeunload` is ignored unless the reader has interacted with the page — a deliberate anti-abuse rule. There is no workaround, and this is the strongest argument for an autosaved draft: it protects the case the dialog cannot.

### 2. The warning fires when nothing changed

Almost always a comparison that has not been normalised, or a form that marks itself dirty when programmatic data arrives. Both are covered by tracking dirty against a baseline rather than against the initial render.

### 3. Submitting triggers the warning

A traditional form submission is a navigation. Clear the flag in the submit handler before the navigation begins, or the reader is asked whether they want to discard the thing they just submitted.

### 4. Custom wording in `beforeunload`

Every current browser ignores the returned string. Code that returns a carefully worded sentence is code that reads as intentional and does nothing.

### 5. The route guard blocks a redirect it should not

An expired session redirecting to sign-in should not be interrupted by an unsaved-changes prompt. Give programmatic navigations a way to bypass the guard.

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The browser dialog offers two options with wording you do not control, and cannot mention what is unsaved. Your own dialog can name the work — three unsaved answers — offer to save and continue rather than only to discard, explain what happens either way, and be made properly accessible with focus management and an announcement. That difference is the whole reason for handling the two departures separately rather than treating beforeunload as sufficient." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the router dialog can say that the browser cannot</title>
  <desc>The browser dialog offers two options with wording you do not control, and cannot mention what is unsaved. Your own dialog can name the work — three unsaved answers — offer to save and continue rather than only to discard, explain what happens either way, and be made properly accessible with focus management and an announcement. That difference is the whole reason for handling the two departures separately rather than treating beforeunload as sufficient.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#b07a55" font-family="inherit">the browser dialog</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">two options: leave, or stay</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">wording you cannot change</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">cannot name what is unsaved</text>
  <text x="28" y="128" font-size="10" fill="#a63d6f" font-family="inherit">cannot offer to save</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">your router dialog</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">three options: save, discard, stay</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">names the unsaved work</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">explains what each option does</text>
  <text x="366" y="128" font-size="10" fill="#2d6342" font-family="inherit">focus-managed and announced</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">This is why the two are handled separately: one is a blunt safety net, the other is the actual conversation.</text>
</svg>

## Verification Checklist

- [ ] `isDirty` is false after loading, and after a save
- [ ] Trailing whitespace does not make the form dirty
- [ ] The listener is registered only while dirty
- [ ] A router navigation shows your dialog, with a save option
- [ ] The dialog takes focus, traps Tab, and restores focus on cancel
- [ ] Submitting does not trigger the warning
- [ ] A forced redirect can bypass the guard
- [ ] An autosaved draft covers the case the dialog cannot

## Common Pitfalls

- **Registering `beforeunload` unconditionally.** It can disqualify the page from the back-forward cache, slowing every navigation away and back for every reader — including the ones with nothing unsaved. Add it when the form becomes dirty, remove it when it becomes clean.
- **Returning a custom string.** Every current browser ignores it and shows its own wording. Code that returns a carefully worded sentence reads as intentional and does nothing.
- **Warning on a submit.** A traditional submission is a navigation, so an unguarded handler asks the reader whether they want to discard the thing they just sent. Clear the flag before the navigation starts.
- **Comparing raw values.** A trailing space the reader cannot see should not produce a warning. Compare normalised values, using the same normaliser the dirty tracking already has.
- **Blocking a forced redirect.** An expired session sending the reader to sign in should not be interrupted by an unsaved-changes prompt they cannot act on. Give programmatic navigation a way past the guard.

---

**Related**

- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the predicate this depends on
- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) — protecting the case the dialog cannot
- [Keyboard Navigation Patterns for Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/) — making the dialog operable

← [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)

## Frequently Asked Questions

<details>
<summary><strong>Can I customise the beforeunload message?</strong></summary>

No. Every current browser shows its own wording and ignores any string you return, because customisable text was widely used to scare readers into staying. Treat beforeunload as a boolean — warn, or do not — and put all of your actual copy and options into the router guard, which you do control.

</details>

<details>
<summary><strong>Why register the listener only while the form is dirty?</strong></summary>

Partly hygiene, and partly performance: a registered beforeunload handler can disqualify the page from the browser's back-forward cache, which makes navigating away and back noticeably slower for every reader, including the ones with nothing unsaved. Adding it when the form becomes dirty and removing it when it becomes clean costs two lines.

</details>

<details>
<summary><strong>Is an unsaved-changes warning still needed if the form autosaves?</strong></summary>

Usually not for the document-leaving case — that is exactly what the draft protects. It can still be worth a router guard where leaving has a consequence the draft does not cover, such as abandoning a step-locked application. Where you have both, make the warning say the work is saved rather than that it will be lost: readers who have been told their draft is safe should not then be told they are about to lose it.

</details>

