---
layout: page.njk
title: "Accessible Pending State for Async Validation"
description: "Show that an async check is running without spinners that screen readers never hear or announcements on every keystroke: aria-busy, a delayed visual indicator, a single polite status message per result, and submit behaviour while checks are pending."
slug: accessible-pending-state-for-async-validation
type: howto
breadcrumb: "Accessible Pending State"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Accessible Pending State for Async Validation"
  parent: "Asynchronous Validation Strategies"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Accessible Pending State for Async Validation",
      "description": "Show that an async check is running without spinners that screen readers never hear or announcements on every keystroke: aria-busy, a delayed visual indicator, a single polite status message per result, and submit behaviour while checks are pending.",
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
          "name": "Asynchronous Validation Strategies",
          "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Accessible Pending State for Async Validation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/accessible-pending-state-for-async-validation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Present async validation progress accessibly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give the field a status element linked by aria-describedby"
        },
        {
          "@type": "HowToStep",
          "name": "Delay the visible \"Checking…\" indicator"
        },
        {
          "@type": "HowToStep",
          "name": "Do not announce \"checking\""
        },
        {
          "@type": "HowToStep",
          "name": "Announce each result once, politely"
        },
        {
          "@type": "HowToStep",
          "name": "Set aria-invalid only for real errors"
        },
        {
          "@type": "HowToStep",
          "name": "Decide what submit does while a check is pending"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is aria-busy enough on its own?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Support and behaviour vary across screen readers, and it communicates nothing to sighted users. Treat it as a hint that helps some assistive technology avoid reading half-updated content, alongside visible text and a single announcement."
          }
        },
        {
          "@type": "Question",
          "name": "Should success be announced?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For availability checks, yes — \"ada_l is available\" is useful feedback that the user is waiting for. For checks the user did not ask about (a silent address normalisation), announce only problems."
          }
        },
        {
          "@type": "Question",
          "name": "What about role=\"alert\" for invalid results?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Reserve alert (assertive) for errors that need immediate attention, such as a failed submit. An availability result arrives while the user is still working in the field; polite is right, as discussed in choosing between alert and status regions."
          }
        }
      ]
    }
  ]
}
</script>

# Accessible Pending State for Async Validation

The typical async-check UI is a spinner icon inside the input: sighted users see it flicker on every pause in typing, screen-reader users hear nothing at all, and nobody can tell whether the check finished or silently failed.

A good pending state answers three questions for everyone: is something being checked, did it finish, and what was the answer — without interrupting typing or flooding assistive technology with announcements. This page builds that presentation layer for the validators in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), using a delayed indicator, a single polite status message per outcome, and `aria-busy` where it helps.

---

## Context and prerequisites

The pieces available:

- **A visual indicator** — text ("Checking…") or an icon with text, next to the field. Icons alone are not enough for users who do not recognise them.
- **`aria-describedby`** — links the field to its status text, so the current status is read when the field is focused.
- **A live region** (`role="status"`, which is polite) — announces changes without moving focus. Announcements should be rare: one when a result arrives, not one when checking starts.
- **`aria-busy="true"`** — tells assistive technology a region is being updated and to wait before reading changes. Useful on the status element while it is about to change; support varies, so do not rely on it alone.

Timing matters as much as markup. Most checks return in under half a second; showing a spinner immediately produces a flicker on every check. Delay the visual indicator (around 300–400 ms), and never announce "checking" at all — announce only results.

<svg viewBox="0 0 680 164" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of an async username check from the pause in typing, through the delayed visual indicator, to the result, showing what is displayed and what is announced." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the user sees and hears during one check</title>
  <desc>The user pauses typing at zero. The debounced check starts at 300 milliseconds. The visual Checking indicator appears only after another 400 milliseconds, at 700, because a quick answer would have made it flicker. The answer arrives at 1100 milliseconds; the indicator is replaced with the result text and one polite announcement is made. Nothing is announced when checking starts.</desc>
  <rect x="0" y="0" width="680" height="164" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Request</text>
  <rect x="240.0" y="14.0" width="256.0" height="14" rx="3" fill="#7b4f8a"/>
  <text x="240.0" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">check in flight</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Visual</text>
  <rect x="368.0" y="56.0" width="128.0" height="14" rx="3" fill="#b07a55"/>
  <text x="368.0" y="82.0" font-size="9" fill="#6b5f75" font-family="inherit">Checking…</text>
  <rect x="496.0" y="56.0" width="160.0" height="14" rx="3" fill="#2d6342"/>
  <text x="496.0" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">result text</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Announced</text>
  <rect x="496.0" y="98.0" width="96.0" height="14" rx="3" fill="#2d6342"/>
  <text x="496.0" y="124.0" font-size="9" fill="#2d6342" font-family="inherit">result, once</text>
  <text x="144.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="272.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">400ms</text>
  <text x="400.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">800ms</text>
  <text x="528.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1200ms</text>
  <text x="656.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1600ms</text>
</svg>

---

## The core pattern: a status controller with delayed display

```typescript
type Result = { kind: "valid"; text: string } | { kind: "invalid"; text: string } | { kind: "unknown"; text: string };

export class AsyncFieldStatus {
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private lastAnnounced = "";

  constructor(
    private input: HTMLInputElement,
    private status: HTMLElement,        // visible text, linked via aria-describedby
    private live: HTMLElement,          // role="status", visually hidden or shared page-level
    private delayMs = 400,
  ) {
    const ids = new Set((input.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean));
    ids.add(status.id);
    input.setAttribute("aria-describedby", [...ids].join(" "));
  }

  pending() {
    clearTimeout(this.showTimer);
    this.status.setAttribute("aria-busy", "true");
    // Delay the VISUAL indicator so fast answers do not flicker.
    this.showTimer = setTimeout(() => {
      this.status.textContent = "Checking…";
      this.status.dataset.state = "pending";
    }, this.delayMs);
  }

  settle(r: Result) {
    clearTimeout(this.showTimer);
    this.status.removeAttribute("aria-busy");
    this.status.textContent = r.text;
    this.status.dataset.state = r.kind;
    // Only a real error marks the field invalid; "unknown" does not.
    if (r.kind === "invalid") this.input.setAttribute("aria-invalid", "true");
    else this.input.removeAttribute("aria-invalid");
    // Announce each distinct result once. Identical repeats (e.g. from a cache
    // hit after editing back) are not re-announced.
    if (r.text !== this.lastAnnounced) {
      this.live.textContent = "";
      requestAnimationFrame(() => { this.live.textContent = r.text; });
      this.lastAnnounced = r.text;
    }
  }

  cancel() {                             // value changed before the result arrived
    clearTimeout(this.showTimer);
    this.status.removeAttribute("aria-busy");
    this.status.textContent = "";
    this.status.dataset.state = "";
  }
}
```

```html
<label for="username">Username</label>
<input id="username" name="username" autocomplete="username">
<p id="username-status" class="field-status"></p>
<div id="form-live" role="status" class="visually-hidden"></div>
```

---

## Step-by-step walkthrough

1. **Give the field a status element linked by `aria-describedby`.** Whatever the status says is read when the user focuses the field, so the latest result is always discoverable.
2. **Delay the visible "Checking…" indicator.** 300–400 ms after the check starts. Most checks finish sooner, so most users never see a flicker; slow checks still show progress.
3. **Do not announce "checking".** An announcement on every pause interrupts screen-reader users mid-thought. Announce only results.
4. **Announce each result once, politely.** Clear and re-set the live region's text so the change is detected; skip repeats so a cache hit does not re-announce the same message — see [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/).
5. **Set `aria-invalid` only for real errors.** "Couldn't check right now" is not an error; the unknown state from [handling timeouts and 429s in async validators](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/handling-timeouts-and-429s-in-async-validators/) leaves the field valid.
6. **Decide what submit does while a check is pending.** Either wait for the check (showing "Checking your username…" on the button) or submit and let the server decide. Never silently block.

### Why the result, not the process, is what to announce

Announcing process ("Checking username… Username available") doubles the speech for every check and makes typing in a field with async validation noticeably slower for screen-reader users, who hear an interruption at every pause. Sighted users get the process from a glance at a small indicator they can ignore; the audio equivalent cannot be ignored. The result is the information that matters, and the status text linked with `aria-describedby` lets anyone who wants the current state ask for it by moving focus back to the field. This is the same principle as announcing errors on blur rather than on every keystroke.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the moments in an async validation — check starts, check exceeds the delay, result arrives, value changes before the result, and submit while pending — with the visual, ARIA and announcement behaviour for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to do at each moment of an async check</title>
  <desc>When the check starts, nothing is shown yet and aria-busy is set on the status element, with no announcement. When the check exceeds the delay, Checking is shown, still with no announcement. When the result arrives, the result text replaces the indicator, aria-busy is removed, aria-invalid is set only for invalid results, and the result is announced once. When the value changes before the result, the status is cleared silently. On submit while pending, the button shows a waiting label and the form waits or lets the server decide.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Moment</text>
  <text x="197.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Visual</text>
  <text x="356.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">ARIA</text>
  <text x="542.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Announce</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">check starts</text>
  <text x="197.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing yet</text>
  <text x="356.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-busy on status</text>
  <text x="542.9" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">after ~400 ms</text>
  <text x="197.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Checking…&quot;</text>
  <text x="356.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-busy</text>
  <text x="542.9" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">result arrives</text>
  <text x="197.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">result text</text>
  <text x="356.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid only if invalid</text>
  <text x="542.9" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">once</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">value changes first</text>
  <text x="197.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cleared</text>
  <text x="356.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-busy removed</text>
  <text x="542.9" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">submit while pending</text>
  <text x="197.0" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">button: waiting label</text>
  <text x="356.7" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-disabled on button</text>
  <text x="542.9" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">status message</text>
</svg>

---

## Failure modes and edge cases

### 1. Spinners inside the input

An icon absolutely positioned inside the input overlaps typed text on narrow fields and has no text alternative. Put status text next to or below the field instead.

### 2. Live regions added dynamically

A live region inserted into the DOM at the same moment as its text is often not announced, because assistive technology has not registered it yet. Render the region empty on page load and change its text later.

### 3. Every field with its own live region

Several simultaneous live regions compete, and some screen readers drop overlapping announcements. One shared page-level `role="status"` region, fed by every field's status controller, is more predictable.

### 4. Colour-only status

A green or red border to show the result fails for colour-blind users and in high-contrast modes. Use text, and an icon with text if you like; the rules are in [error styling that does not rely on colour](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/error-styling-that-does-not-rely-on-colour/).

### 5. Reduced motion

A spinning icon should respect `prefers-reduced-motion`: replace rotation with a static icon or a subtle opacity change. Text-only "Checking…" needs no adjustment.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the elements of an accessible pending state — the field, its status text and a shared live region — and what each is responsible for." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where each piece of the pending UI lives</title>
  <desc>The input carries aria-describedby pointing to its status text and aria-invalid only for real errors. The status text next to the field shows Checking after a delay and then the result, and is what screen readers read on focus. A single shared live region with role status announces each distinct result once for the whole form.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The input</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-describedby → status.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid only for real errors.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Status text</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Checking…&quot; after a delay.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Then the result.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Read on focus.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Shared live region</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">role=&quot;status&quot;.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each distinct result once.</text>
</svg>

---

## Verification checklist

- [ ] Fast checks never show a flickering indicator.
- [ ] Slow checks show "Checking…" as text next to the field.
- [ ] Screen readers announce each result once and never announce "checking".
- [ ] The current status is read when the field is focused.
- [ ] Unknown results do not mark the field invalid.
- [ ] Changing the value clears a pending status silently.
- [ ] Submit while pending either waits visibly or defers to the server.
- [ ] Status does not rely on colour or motion alone.

---

## Frequently Asked Questions

<details>
<summary><strong>Is aria-busy enough on its own?</strong></summary>

No. Support and behaviour vary across screen readers, and it communicates nothing to sighted users. Treat it as a hint that helps some assistive technology avoid reading half-updated content, alongside visible text and a single announcement.

</details>

<details>
<summary><strong>Should success be announced?</strong></summary>

For availability checks, yes — "ada_l is available" is useful feedback that the user is waiting for. For checks the user did not ask about (a silent address normalisation), announce only problems.

</details>

<details>
<summary><strong>What about role="alert" for invalid results?</strong></summary>

Reserve `alert` (assertive) for errors that need immediate attention, such as a failed submit. An availability result arrives while the user is still working in the field; polite is right, as discussed in [choosing between alert and status regions](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/choosing-between-alert-and-status-regions/).

</details>

---

## Related

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
- [ARIA-Invalid Timing and Announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/)
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/)

← [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
