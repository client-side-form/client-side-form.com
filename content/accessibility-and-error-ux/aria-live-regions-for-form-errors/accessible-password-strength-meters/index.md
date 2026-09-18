---
layout: page.njk
title: "Accessible Password Strength Meters"
description: "Build password requirement checklists and strength meters that help rather than hinder: requirements visible before typing, state conveyed in text not colour, announcements only when status changes, show-password toggles, and no rules that fight password managers."
slug: accessible-password-strength-meters
type: howto
breadcrumb: "Password Strength Meters"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Accessible Password Strength Meters"
  parent: "ARIA Live Regions for Form Errors"
  order: 7
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Accessible Password Strength Meters",
      "description": "Build password requirement checklists and strength meters that help rather than hinder: requirements visible before typing, state conveyed in text not colour, announcements only when status changes, show-password toggles, and no rules that fight password managers.",
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
          "name": "ARIA Live Regions for Form Errors",
          "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Accessible Password Strength Meters",
          "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-password-strength-meters/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build an accessible password requirements checklist and strength meter",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Show requirements before the user types"
        },
        {
          "@type": "HowToStep",
          "name": "Write each rule's state as text"
        },
        {
          "@type": "HowToStep",
          "name": "Update the list silently while typing"
        },
        {
          "@type": "HowToStep",
          "name": "Announce only threshold crossings"
        },
        {
          "@type": "HowToStep",
          "name": "Present strength as advice in text"
        },
        {
          "@type": "HowToStep",
          "name": "Provide a show-password toggle"
        },
        {
          "@type": "HowToStep",
          "name": "Use autocomplete=\"new-password\""
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the strength meter use role=\"progressbar\" or meter?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A element fits a strength gauge semantically, but its value is announced inconsistently. The most reliable approach is visible text (\"Strength: fair\") referenced by the input's description, with the bar as decoration."
          }
        },
        {
          "@type": "Question",
          "name": "Is zxcvbn too large to load on every page?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is large because it contains dictionaries. Load it lazily when the password field receives focus, or run the estimate on the server. The checklist and length rule work without it in the meantime."
          }
        },
        {
          "@type": "Question",
          "name": "How do I phrase the breached-password error?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Say what to do without alarming: \"This password has appeared in a data breach elsewhere, so it's easy to guess. Choose a different one.\" Avoid implying the user's own account was breached."
          }
        }
      ]
    }
  ]
}
</script>

# Accessible Password Strength Meters

A typical password field shows a coloured bar that turns from red to green and a list of rules whose ticks change colour as you type — which tells a colour-blind user nothing, tells a screen-reader user nothing unless it announces on every keystroke, and when it does announce on every keystroke makes the field nearly unusable.

Password guidance is valuable, and it can be accessible: show the requirements before the user starts, track each one in text as well as colour, announce only when the overall status changes, and let users see what they typed. This page, part of [ARIA live regions for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/), builds that component and draws the line between helpful requirements and rules that make passwords worse.

---

## Context and prerequisites

Two kinds of feedback, often conflated:

- **Requirements** — hard rules the password must meet to be accepted ("at least 12 characters", "not a password found in known breaches"). These are validation: pass or fail.
- **Strength** — an estimate of how guessable the password is, typically from an estimator such as zxcvbn. This is advice, not validation.

Current guidance (for example NIST SP 800-63B) favours length minimums, checking against breached-password lists, and allowing all printable characters and pasting — while discouraging composition rules like "must include a symbol" and periodic forced changes. Fewer, better rules also make the accessible UI simpler: there is less to track and announce.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common password rules with whether each is recommended and why." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Requirement rules worth having</title>
  <desc>A minimum length such as twelve characters is recommended because length is the strongest factor. Checking against breached password lists is recommended because it blocks passwords attackers already try. Allowing all characters including spaces and emoji is recommended so passphrases and managers work. Allowing paste is recommended because password managers depend on it. Composition rules requiring symbols or digits are not recommended because they lead to predictable patterns. Maximum lengths below sixty-four characters are not recommended because they break generated passwords.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rule</text>
  <text x="246.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Use?</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">minimum length (e.g. 12)</text>
  <text x="246.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">length matters most</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">not in breached-password lists</text>
  <text x="246.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">blocks passwords attackers try first</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">allow all characters, spaces</text>
  <text x="246.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">passphrases, managers</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">allow paste</text>
  <text x="246.3" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="350.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">password managers need it</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">must include symbol / digit</text>
  <text x="246.3" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="350.0" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">predictable patterns (Passw0rd!)</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">max length under 64</text>
  <text x="246.3" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="350.0" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">breaks generated passwords</text>
</svg>

---

## The core pattern: a text-first checklist with status-change announcements

```html
<label for="new-password">Create a password</label>
<p id="pw-reqs-intro">Your password must:</p>
<ul id="pw-reqs" aria-labelledby="pw-reqs-intro">
  <li data-rule="length"><span class="state">Not met: </span>be at least 12 characters</li>
  <li data-rule="breach"><span class="state">Not checked: </span>not be a commonly used password</li>
</ul>
<div class="pw-row">
  <input id="new-password" name="new-password" type="password" autocomplete="new-password"
         aria-describedby="pw-reqs-intro pw-reqs pw-strength">
  <button type="button" id="pw-toggle" aria-pressed="false" aria-controls="new-password">Show password</button>
</div>
<p id="pw-strength">Strength: <span class="strength-text">not rated yet</span></p>
```

```typescript
type RuleState = "met" | "not-met" | "unchecked";

export function wirePasswordField(
  input: HTMLInputElement,
  list: HTMLElement,
  strengthText: HTMLElement,
  say: (msg: string) => void,                 // the page's announcer, not a local live region
  estimate: (pw: string) => 0 | 1 | 2 | 3 | 4,
) {
  let lastAllMet = false;
  let lastScoreBand = "";

  const setRule = (rule: string, state: RuleState) => {
    const li = list.querySelector<HTMLElement>(`[data-rule="${rule}"]`)!;
    li.dataset.state = state;                  // CSS adds colour and an icon
    li.querySelector(".state")!.textContent =
      state === "met" ? "Met: " : state === "not-met" ? "Not met: " : "Not checked: ";
  };

  input.addEventListener("input", () => {
    const pw = input.value;
    setRule("length", [...pw].length >= 12 ? "met" : "not-met");   // count graphemes-ish, not UTF-16 units
    // The breach check runs on blur (network); mark it unchecked while typing.
    setRule("breach", "unchecked");

    const score = pw ? estimate(pw) : null;
    const band = score === null ? "not rated yet" : ["very weak", "weak", "fair", "strong", "very strong"][score];
    strengthText.textContent = band;

    // Announce ONLY when the overall status crosses a threshold, never per keystroke.
    const allMet = [...pw].length >= 12;
    if (allMet !== lastAllMet) { say(allMet ? "Length requirement met." : "Password must be at least 12 characters."); lastAllMet = allMet; }
    if (band !== lastScoreBand && (band === "strong" || band === "very strong")) say(`Password strength: ${band}.`);
    lastScoreBand = band;
  });
}

// Show/hide toggle: a real button whose pressed state is exposed.
export function wireToggle(button: HTMLButtonElement, input: HTMLInputElement) {
  button.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.textContent = show ? "Hide password" : "Show password";
    input.focus();                              // keep the user's place
  });
}
```

---

## Step-by-step walkthrough

1. **Show requirements before the user types.** A list under the label, referenced by the input's `aria-describedby`, so screen-reader users hear the rules when they reach the field — not only after failing.
2. **Write each rule's state as text.** "Met:", "Not met:", "Not checked:" prefixes (visually styled or hidden) carry the state; colour and icons reinforce it, per [error styling that does not rely on colour](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/error-styling-that-does-not-rely-on-colour/).
3. **Update the list silently while typing.** Users who want the current state read it by navigating the list or re-focusing the field.
4. **Announce only threshold crossings.** "Length requirement met" once, when it flips — via the page announcer from [throttling live region announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/throttling-live-region-announcements/), which also waits for typing pauses.
5. **Present strength as advice in text.** "Strength: fair" next to any bar; do not block submission on strength unless it is a stated requirement.
6. **Provide a show-password toggle.** A `button` with `aria-pressed`, returning focus to the input. It helps everyone check what they typed and removes the need for a "confirm password" field.
7. **Use `autocomplete="new-password"`.** Password managers then offer to generate a password, which will meet any sensible requirements.

### Why a "confirm password" field is often unnecessary

The confirmation field exists to catch typos in a hidden password. A show-password toggle achieves the same with less effort: users can look at what they typed, once. Password managers fill both fields identically anyway, so the confirmation adds nothing for them, while for people using switch access, voice control or screen magnification it doubles the work of the hardest field on the form. Keep confirmation only where a typo would be expensive to recover from and there is no reset route — and if you keep it, validate the match as described in [password confirmation validation pattern](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/).

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of what a screen-reader user hears while creating a password with the accessible checklist, from focusing the field to meeting the length requirement." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a screen-reader user hears</title>
  <desc>On focusing the field, the user hears the label, then the description including your password must, be at least twelve characters, not met, and not be a commonly used password, not checked, and strength not rated yet. While typing, nothing is announced apart from keystroke echo. After the twelfth character and a short pause, the announcer says length requirement met, once. On blur, the breach check runs and its result updates the list; if the password is found, an error is shown and announced.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="362.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus the field</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Label + requirements + strength.</text>
  <text x="406.4" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Rules heard before typing starts.</text>
  <path d="M195.2,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.2,89.0 195.2,96.0 199.2,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="362.4" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Typing</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">List updates silently.</text>
  <text x="406.4" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only keystroke echo is heard.</text>
  <path d="M195.2,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.2,174.0 195.2,181.0 199.2,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="362.4" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">12th character + pause</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Length requirement met.&quot;</text>
  <text x="406.4" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Announced once, on the threshold.</text>
  <path d="M195.2,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="191.2,259.0 195.2,266.0 199.2,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="362.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Blur</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Breach check runs.</text>
  <text x="406.4" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Result updates the list; a failure becomes the field error.</text>
</svg>

---

## Failure modes and edge cases

### 1. Announcing on every keystroke

A live region that reads the whole checklist per character makes the field unusable with a screen reader. Update silently; announce threshold crossings only.

### 2. Blocking paste

Disabling paste (`onpaste="return false"`) breaks password managers and forces users to type long passwords by hand, pushing them toward weaker ones. Never block paste.

### 3. Counting characters incorrectly

`"🔑".length` is 2 in JavaScript. Counting with `[...pw].length` (code points) is closer to what users see; for full accuracy with combined emoji, use `Intl.Segmenter` by grapheme. Make the server count the same way.

### 4. Breach checks leaking the password

Never send the password itself to a third-party service. Range-query APIs based on k-anonymity (sending only a hash prefix) let you check breach lists without revealing the password; better still, perform the check on your server during submit.

### 5. Strength meters that contradict the rules

A password that meets every requirement but shows "Weak" in red confuses users. Align them: if strength is advisory, word it as advice ("Could be stronger: add more words"), and never style advisory feedback like an error.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards distinguishing a requirement checklist, strength advice and a validation error in a password field, with how each is presented." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Requirement, advice, error</title>
  <desc>The requirement checklist is visible before typing, updated silently, and uses text states such as met and not met. Strength advice is shown as text such as strength fair, with an optional bar, and never blocks submission unless it is a stated requirement. A validation error appears on blur or submit when a requirement is not met, is linked with aria-describedby and sets aria-invalid.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Requirements</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Visible before typing.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Text states: Met / Not met.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Strength advice</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Strength: fair&quot; in text.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never styled as an error.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Validation error</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">On blur or submit.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">aria-invalid + describedby.</text>
</svg>

---

## Verification checklist

- [ ] Requirements are visible and read before the user types.
- [ ] Each requirement's state is conveyed in text, not only colour or icons.
- [ ] Nothing is announced per keystroke; threshold crossings are announced once.
- [ ] The show-password toggle is a button with `aria-pressed` and keeps focus in the field.
- [ ] Paste is allowed; `autocomplete="new-password"` is set.
- [ ] Composition rules are avoided in favour of length and breach checks.
- [ ] Character counting matches what users see and what the server enforces.
- [ ] Strength advice never contradicts requirement status.

---

## Frequently Asked Questions

<details>
<summary><strong>Should the strength meter use role="progressbar" or meter?</strong></summary>

A `<meter>` element fits a strength gauge semantically, but its value is announced inconsistently. The most reliable approach is visible text ("Strength: fair") referenced by the input's description, with the bar as decoration.

</details>

<details>
<summary><strong>Is zxcvbn too large to load on every page?</strong></summary>

It is large because it contains dictionaries. Load it lazily when the password field receives focus, or run the estimate on the server. The checklist and length rule work without it in the meantime.

</details>

<details>
<summary><strong>How do I phrase the breached-password error?</strong></summary>

Say what to do without alarming: "This password has appeared in a data breach elsewhere, so it's easy to guess. Choose a different one." Avoid implying the user's own account was breached.

</details>

---

## Related

- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
- [Password Confirmation Validation Pattern](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/)
- [Autocomplete Tokens for Autofill-Friendly Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/)

← [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
