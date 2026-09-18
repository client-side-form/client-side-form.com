---
layout: page.njk
title: "One-Time Code Inputs: Keyboard, Paste and Autofill"
description: "Build verification-code inputs that accept SMS autofill, paste and typing: why a single input beats six boxes, autocomplete=one-time-code and the WebOTP API, segmented visuals without segmented inputs, error and resend states, and timing announcements."
slug: one-time-code-inputs-keyboard-paste-and-autofill
type: howto
breadcrumb: "One-Time Codes"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "One-Time Code Inputs: Keyboard, Paste and Autofill"
  parent: "Keyboard Navigation Patterns"
  order: 8
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "One-Time Code Inputs: Keyboard, Paste and Autofill",
      "description": "Build verification-code inputs that accept SMS autofill, paste and typing: why a single input beats six boxes, autocomplete=one-time-code and the WebOTP API, segmented visuals without segmented inputs, error and resend states, and timing announcements.",
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
          "name": "Keyboard Navigation Patterns for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "One-Time Code Inputs: Keyboard, Paste and Autofill",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/one-time-code-inputs-keyboard-paste-and-autofill/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build an accessible one-time verification code input",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Use one with autocomplete=\"one-time-code\" and inputmode=\"numeric\""
        },
        {
          "@type": "HowToStep",
          "name": "Label it with where the code went"
        },
        {
          "@type": "HowToStep",
          "name": "Normalise input, do not restrict it"
        },
        {
          "@type": "HowToStep",
          "name": "Style segmentation with CSS"
        },
        {
          "@type": "HowToStep",
          "name": "Enhance with WebOTP on supporting browsers"
        },
        {
          "@type": "HowToStep",
          "name": "Handle errors, expiry and resend in text"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I keep six boxes if the design requires them?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can keep the look with the CSS approach above while using one input. If separate inputs are unavoidable, each needs a label (\"Digit 1 of 6\"), paste must distribute across them, autofill into the first box must be split, and Backspace must move focus backward — substantially more code, still less robust."
          }
        },
        {
          "@type": "Question",
          "name": "Should the input use aria-live for each digit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Screen readers echo typed characters already. Announce only outcomes — verified, incorrect, expired, new code sent."
          }
        },
        {
          "@type": "Question",
          "name": "Is SMS the right channel for codes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SMS codes are widely used but vulnerable to SIM-swap and interception. Authenticator apps and passkeys are stronger; offer them where possible, and keep SMS as a fallback with the accessible input described here."
          }
        }
      ]
    }
  ]
}
</script>

# One-Time Code Inputs: Keyboard, Paste and Autofill

The six-box verification code input looks tidy and fails in every non-typing path: iOS and Android SMS autofill put the whole code in the first box, pasting "482 913" from an email scatters or truncates it, screen readers announce six unlabelled fields, and Backspace in an empty box moves focus somewhere unexpected.

A single input with the right attributes accepts SMS autofill, paste, password-manager fills and typing without special handling — and can still *look* like separate boxes. This page, part of [keyboard navigation patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/), builds that input, adds the WebOTP API where available, and handles errors, expiry and resending accessibly.

---

## Context and prerequisites

The platform features:

- **`autocomplete="one-time-code"`** — Safari on iOS and macOS offers codes from Messages (and Mail) above the keyboard; Chrome on Android offers codes from SMS. The whole code fills one field.
- **WebOTP API** — `navigator.credentials.get({ otp: { transport: ["sms"] } })` in Chromium on Android reads a code from an SMS whose last line is formatted `@your.domain #123456`, with user consent.
- **`inputmode="numeric"`** — digit keyboard on mobile without `type="number"` quirks; `pattern="\d{6}"` documents the format.
- **Rate limits and expiry** — codes expire; resends are limited. Both need visible, accessible states.

The six-input pattern fights these features: autofill targets one field, paste targets the focused field, and each box is a separate form control with its own label and focus stop.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing a single one-time-code input with six separate single-character inputs across SMS autofill, paste, password managers, screen-reader experience and Backspace behaviour." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One input versus six boxes</title>
  <desc>With a single input, SMS autofill fills the whole code, pasting works natively, password managers can fill it, a screen reader announces one labelled field, and Backspace behaves normally. With six separate inputs, SMS autofill puts the whole code in the first box or fails, paste needs custom distribution code, password managers often fail, screen readers announce six fields that each need labels, and Backspace needs custom focus-moving code.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Behaviour</text>
  <text x="201.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">One input</text>
  <text x="409.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Six boxes</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">SMS autofill</text>
  <text x="201.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">whole code</text>
  <text x="409.3" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">first box only, or fails</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">paste &quot;482 913&quot;</text>
  <text x="201.8" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">native</text>
  <text x="409.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">custom distribution code</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">password managers</text>
  <text x="201.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">fill</text>
  <text x="409.3" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">often fail</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">screen reader</text>
  <text x="201.8" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">one labelled field</text>
  <text x="409.3" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">six fields to label</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Backspace</text>
  <text x="201.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">native</text>
  <text x="409.3" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">custom focus handling</text>
</svg>

---

## The core pattern: one input, segmented look, WebOTP enhancement

```html
<form id="verify" novalidate>
  <label for="otp">Enter the 6-digit code we sent to 07700 900123</label>
  <p id="otp-hint" class="hint">The code expires in 10 minutes.</p>
  <input id="otp" name="otp"
         inputmode="numeric" autocomplete="one-time-code"
         pattern="\d{6}" maxlength="12"
         aria-describedby="otp-hint otp-error" class="otp">
  <p id="otp-error" class="error" hidden></p>
  <button type="submit">Verify</button>
  <button type="button" id="resend">Send a new code</button>
  <p id="resend-status" role="status"></p>
</form>
```

```css
/* Visual segmentation without separate inputs: monospace + letter-spacing,
   with a background of six cells. */
.otp {
  font: 600 1.5rem/1 ui-monospace, monospace;
  letter-spacing: 0.9em;
  padding-left: 0.45em;
  width: calc(6 * 1.5em + 1em);
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(1.5em - 2px), #cbb8d9 calc(1.5em - 2px) 1.5em)
    bottom / 100% 2px no-repeat;
}
```

```typescript
const input = document.querySelector<HTMLInputElement>("#otp")!;

// Normalise whatever arrives (typed, pasted "482 913", "482-913", autofilled).
input.addEventListener("input", () => {
  const digits = input.value.replace(/\D/g, "").slice(0, 6);
  if (digits !== input.value) input.value = digits;
  if (digits.length === 6) input.form?.requestSubmit();   // optional: submit when complete
});

// WebOTP where supported (Chromium on Android). Abort if the user leaves.
if ("OTPCredential" in window) {
  const ac = new AbortController();
  input.form?.addEventListener("submit", () => ac.abort(), { once: true });
  navigator.credentials
    .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
    .then((cred) => {
      const code = (cred as unknown as { code?: string })?.code;
      if (code) { input.value = code; input.form?.requestSubmit(); }
    })
    .catch(() => { /* user declined or aborted: typing still works */ });
}
```

---

## Step-by-step walkthrough

1. **Use one `<input>` with `autocomplete="one-time-code"` and `inputmode="numeric"`.** SMS autofill, paste and password managers all work without extra code.
2. **Label it with where the code went.** "Enter the 6-digit code we sent to 07700 900123" tells users what to expect and which device to check.
3. **Normalise input, do not restrict it.** Strip spaces and dashes from pasted codes; allow a generous `maxlength` so formatted pastes are not truncated before normalising.
4. **Style segmentation with CSS.** Monospace text and cell backgrounds give the six-box look while the element remains one field for assistive technology.
5. **Enhance with WebOTP on supporting browsers.** It reads the code from a correctly formatted SMS with the user's consent; abort it when the form is submitted or the user navigates away.
6. **Handle errors, expiry and resend in text.** "That code is not correct. Check the latest message, or send a new code." Link the error with `aria-describedby`; announce resend results through a status region.

### Why auto-submit on the sixth digit needs care

Submitting automatically when six digits are present is convenient, especially with autofill — but it removes the user's chance to check what they entered, and for screen-reader users the page can change before they hear the last digit echoed. A good compromise: auto-submit only when the value arrived in one step (autofill, paste, WebOTP), and wait for an explicit Verify press when the user types digit by digit. If you auto-submit always, make sure a failed verification returns focus to the input with the error, and never clears the field silently.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a one-time code reaching a single input field through SMS autofill, paste and typing, with normalisation and submission." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three ways the code arrives, one field</title>
  <desc>With SMS autofill, the keyboard suggestion inserts 482913 into the field in one input event, which is normalised and submitted. With paste, the user pastes 482 913 from an email; normalisation strips the space and the form submits. With typing, digits arrive one at a time; normalisation keeps them, and the user presses Verify when all six are entered. All three paths use the same field and the same validation.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">SMS / clipboard / keys</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Input</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">autofill: &quot;482913&quot; (one event)</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#2d6342" font-family="inherit">6 digits → requestSubmit()</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">paste: &quot;482 913&quot; → &quot;482913&quot;</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">6 digits → requestSubmit()</text>
  <path d="M340.0,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#6b5f75" font-family="inherit">typing: 4, 8, 2, 9, 1, 3</text>
  <path d="M122.7,181.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,177.0 339.0,181.0 332.0,185.0" fill="#7b4f8a"/>
  <text x="348.0" y="205.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">user presses Verify</text>
  <path d="M340.0,209.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,205.0 556.3,209.0 549.3,213.0" fill="#7b4f8a"/>
</svg>

### Keeping the rest of the page out of the way

A verification step is short, but users switch away from it — to their messages, their email, their authenticator app — and come back. Design for that round trip: keep the code field focused when the page regains visibility only if it was focused before, do not reset the form on `visibilitychange`, and avoid timers that silently expire the page while the user is reading their messages. If the code expires while they are away, say so when they return, next to the field, rather than letting them type a code that can no longer work. Small details like these decide whether the step takes ten seconds or ends in a support ticket.

---

## Failure modes and edge cases

### 1. `type="number"`

Number inputs drop leading zeros ("012345" becomes 12345), show spinners and ignore `maxlength`. Codes are strings; use `type="text"` with `inputmode="numeric"`.

### 2. Clearing the field on error

Wiping the input after a wrong code forces retyping and hides what was entered. Keep the value, mark it invalid, and let the user correct it — or explicitly select it so typing replaces it.

### 3. Expiry without warning

A code that expires silently produces "incorrect code" errors for a correct code. Show the expiry time in the hint, say "This code has expired" specifically, and offer a new code in the same message.

### 4. Resend flooding

Unlimited resends invite abuse and confuse users with several valid-looking codes. Rate-limit, show when the next resend is available ("You can request a new code in 30 seconds") in text that updates without constant announcements — the throttling from [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/).

### 5. The SMS format for WebOTP

WebOTP only works if the message's last line is `@your.domain #code` for the exact origin. Coordinate with whoever sends the SMS; without the line, `autocomplete="one-time-code"` still helps on iOS and in Chrome's keyboard suggestions.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards describing the states of a one-time code step — waiting for the code, incorrect code, expired code, and resend available or rate-limited — with the message and focus behaviour for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The states of a verification step</title>
  <desc>While waiting, the label says where the code was sent and the hint gives the expiry time. After an incorrect code, the value is kept, the field is marked invalid, the error says the code is not correct and to check the latest message, and focus stays in the field. After expiry, the error says the code has expired and offers to send a new one. For resend, a status message confirms a new code was sent, or says when the next resend will be available.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Waiting</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label: where it was sent.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Hint: expires in 10 min.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Incorrect</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Value kept; aria-invalid.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Check the latest message.&quot;</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Expired</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;This code has expired.&quot;</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Send a new one.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Resend</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;We&#x27;ve sent a new code.&quot;</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Or: available in 30 s.</text>
</svg>

---

## Verification checklist

- [ ] The code is entered in a single input with `autocomplete="one-time-code"` and `inputmode="numeric"`.
- [ ] SMS autofill on iOS and Android fills the whole code.
- [ ] Pasting a code with spaces or dashes works.
- [ ] Leading zeros are preserved.
- [ ] The label says where the code was sent; the hint gives the expiry.
- [ ] Wrong and expired codes produce specific messages, with the value kept.
- [ ] Resend status is shown in text and announced once.
- [ ] Auto-submit happens only for one-step fills, or failures return focus to the field.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I keep six boxes if the design requires them?</strong></summary>

You can keep the look with the CSS approach above while using one input. If separate inputs are unavoidable, each needs a label ("Digit 1 of 6"), paste must distribute across them, autofill into the first box must be split, and Backspace must move focus backward — substantially more code, still less robust.

</details>

<details>
<summary><strong>Should the input use aria-live for each digit?</strong></summary>

No. Screen readers echo typed characters already. Announce only outcomes — verified, incorrect, expired, new code sent.

</details>

<details>
<summary><strong>Is SMS the right channel for codes?</strong></summary>

SMS codes are widely used but vulnerable to SIM-swap and interception. Authenticator apps and passkeys are stronger; offer them where possible, and keep SMS as a fallback with the accessible input described here.

</details>

---

## Related

- [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
- [Autocomplete Tokens for Autofill-Friendly Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/)
- [Validating International Phone Numbers](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/)

← [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
