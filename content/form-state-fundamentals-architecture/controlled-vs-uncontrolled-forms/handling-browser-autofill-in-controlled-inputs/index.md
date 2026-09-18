---
layout: page.njk
title: "Handling Browser Autofill in Controlled Inputs"
description: "Why browser and password-manager autofill leaves controlled form state empty or stale, how to detect autofilled values reliably across Chrome, Safari and Firefox, and how to reconcile them before validation and submit."
slug: handling-browser-autofill-in-controlled-inputs
type: howto
breadcrumb: "Browser Autofill"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Handling Browser Autofill in Controlled Inputs"
  parent: "Controlled vs Uncontrolled Forms"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Handling Browser Autofill in Controlled Inputs",
      "description": "Why browser and password-manager autofill leaves controlled form state empty or stale, how to detect autofilled values reliably across Chrome, Safari and Firefox, and how to reconcile them before validation and submit.",
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
          "name": "Controlled vs Uncontrolled Forms",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Handling Browser Autofill in Controlled Inputs",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Reconcile browser autofill with controlled form state",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give every field a real name and the right autocomplete token"
        },
        {
          "@type": "HowToStep",
          "name": "Add the :autofill animation hook in CSS"
        },
        {
          "@type": "HowToStep",
          "name": "Listen for change on the form, not per field"
        },
        {
          "@type": "HowToStep",
          "name": "Reconcile in the capture phase of submit"
        },
        {
          "@type": "HowToStep",
          "name": "Validate what you just reconciled"
        },
        {
          "@type": "HowToStep",
          "name": "Clear stale \"required\" errors after reconciliation"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does el.value return an empty string for a field I can see is filled?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Chrome withholds prefilled credential values from script until the user interacts with the page, to stop a hostile page harvesting saved passwords without consent. The value becomes readable after the first click or key press, and no event fires when that happens, so reconcile at submit time."
          }
        },
        {
          "@type": "Question",
          "name": "Is the :autofill animation trick still needed in current browsers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is less critical than it was, because most text fills now dispatch input. It still earns its place for multi-field fills and for UI that must react before submit — raising labels, clearing a \"required\" hint — and it costs one CSS rule and one listener."
          }
        },
        {
          "@type": "Question",
          "name": "Should I turn autofill off with autocomplete=\"off\" to avoid all this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Browsers ignore autocomplete=\"off\" for credential fields, and disabling autofill on address or payment fields makes forms slower and harder to use, especially for people with motor or cognitive disabilities. Handle autofill; do not fight it."
          }
        }
      ]
    }
  ]
}
</script>

# Handling Browser Autofill in Controlled Inputs

Browser autofill writes values straight into the DOM, and when it does so without firing the events your controlled inputs listen to, the screen shows a filled form while your state still holds empty strings — so validation blocks a submit the user can see is complete.

The mechanics of who owns a field's value are laid out in [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/). Autofill is the case that breaks the controlled model's core promise: that state is the single source of truth and the DOM merely reflects it. Here the DOM changes first, and the question is how to pull that change back into state before anything reads it.

---

## Context and prerequisites

Modern Chromium, Firefox and Safari do fire an `input` event when they autofill a text field in most cases, which is why autofill "mostly works" in React and Vue. The failures cluster around three situations:

- **Chrome's pre-fill on page load.** Chrome can paint saved credentials into fields before the user interacts with the page, but it withholds the actual value from script (`el.value` reads as `""`) until the user clicks or presses a key anywhere. This is a privacy measure, not a bug, and no event fires when the value becomes readable.
- **Safari and iOS keychain fills of several fields at once.** The focused field gets its event; the sibling fields filled in the same gesture sometimes do not, particularly inside shadow DOM or when the fields were rendered after the page loaded.
- **Password managers implemented as extensions.** They set `value` through the property setter, which bypasses React's value tracker, and may or may not dispatch a synthetic `input` event afterwards.

So a robust form does not rely on any single signal. It listens for events, detects the autofill paint state through CSS, and — as a last line of defence — reads the DOM at submit time.

<svg viewBox="0 0 680 182" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline comparing when the user sees an autofilled value and when script can read it, for Chrome page-load prefill, Safari multi-field fill and an extension password manager." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>When an autofilled value becomes visible to script</title>
  <desc>For Chrome page-load prefill the value is painted at about 100 milliseconds but script reads an empty string until the first user interaction around 1400 milliseconds, with no event at that moment. For a Safari multi-field fill the focused field fires input immediately while sibling fields may fire nothing. For an extension manager the value is set through the property setter at about 600 milliseconds and a synthetic event may follow later or never.</desc>
  <rect x="0" y="0" width="680" height="182" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Chrome prefill on load</text>
  <rect x="188.6" y="14.0" width="319.8" height="14" rx="3" fill="#a63d6f"/>
  <text x="188.6" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">painted, but el.value reads empty</text>
  <rect x="508.4" y="14.0" width="147.6" height="14" rx="3" fill="#2d6342"/>
  <text x="508.4" y="40.0" font-size="9" fill="#2d6342" font-family="inherit">readable after any click</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Safari multi-field fill</text>
  <rect x="237.8" y="56.0" width="147.6" height="14" rx="3" fill="#2d6342"/>
  <text x="237.8" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">focused field: input fires</text>
  <rect x="385.4" y="56.0" width="270.6" height="14" rx="3" fill="#a63d6f"/>
  <text x="385.4" y="82.0" font-size="9" fill="#a63d6f" font-family="inherit">siblings: event may be missing</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Extension manager</text>
  <rect x="311.6" y="98.0" width="147.6" height="14" rx="3" fill="#a63d6f"/>
  <text x="311.6" y="124.0" font-size="9" fill="#a63d6f" font-family="inherit">setter bypasses tracker</text>
  <rect x="459.2" y="98.0" width="196.8" height="14" rx="3" fill="#b07a55"/>
  <text x="459.2" y="124.0" font-size="9" fill="#6b5f75" font-family="inherit">synthetic event: maybe</text>
  <text x="164.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="287.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">500ms</text>
  <text x="410.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1000ms</text>
  <text x="533.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1500ms</text>
  <text x="656.0" y="148.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2000ms</text>
  <text x="14.0" y="170.0" font-size="10" fill="#6b5f75" font-family="inherit">Only the submit-time DOM read covers all three rows; events and CSS detection shrink the window in which state is wrong.</text>
</svg>

---

## The core pattern: three layers of reconciliation

```typescript
type Values = Record<string, string>;

/**
 * Keeps a controlled form's state in step with values the browser or a
 * password manager wrote into the DOM behind its back.
 */
export function attachAutofillSync(
  form: HTMLFormElement,
  getState: () => Values,
  setField: (name: string, value: string) => void,
): () => void {
  // Layer 1: CSS-driven detection. Chromium and WebKit apply :autofill
  // (and the legacy :-webkit-autofill). We pair it with a keyframe animation
  // in CSS so that "became autofilled" produces an animationstart event.
  const onAnimationStart = (e: AnimationEvent) => {
    if (e.animationName !== "csf-autofill-start") return;
    const el = e.target as HTMLInputElement;
    if (el.name && el.value !== getState()[el.name]) setField(el.name, el.value);
  };

  // Layer 2: a catch-all 'change' listener on the form. Some fills skip
  // 'input' but still fire 'change' on blur; delegation covers fields that
  // mount later (e.g. a second wizard step).
  const onChange = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.name && el.value !== getState()[el.name]) setField(el.name, el.value);
  };

  // Layer 3: reconcile everything just before validation on submit. This is
  // the only layer that catches Chrome's "readable after first interaction"
  // case, because the submit click IS the first interaction.
  // Capture phase so it runs before the framework's own submit handler.
  const onSubmitCapture = () => {
    const state = getState();
    for (const el of Array.from(form.elements) as HTMLInputElement[]) {
      if (!el.name || el.type === "file") continue;
      if (el.value !== state[el.name]) setField(el.name, el.value);
    }
  };

  form.addEventListener("animationstart", onAnimationStart, true);
  form.addEventListener("change", onChange);
  form.addEventListener("submit", onSubmitCapture, true);
  return () => {
    form.removeEventListener("animationstart", onAnimationStart, true);
    form.removeEventListener("change", onChange);
    form.removeEventListener("submit", onSubmitCapture, true);
  };
}
```

```css
/* The animation does nothing visible; it exists so the browser tells us
   (via animationstart) the moment a field enters the autofilled state. */
@keyframes csf-autofill-start { from { outline-color: inherit; } to { outline-color: inherit; } }
input:autofill,
input:-webkit-autofill { animation: csf-autofill-start 1ms; }
```

In React the submit-time layer needs one extra step: `setField` enqueues a state update, so your submit handler must validate the values it just read from the DOM rather than the state snapshot captured by its closure. Build the payload from `new FormData(form)` merged over state, and validate that.

---

## Step-by-step walkthrough

1. **Give every field a real `name` and the right `autocomplete` token.** Autofill keys off `autocomplete="email"`, `"current-password"`, `"postal-code"` and friends; the reconciliation code keys off `name`. Both must be present, and the tokens are catalogued in [autocomplete tokens for autofill-friendly forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/).
2. **Add the `:autofill` animation hook in CSS.** It converts a paint-state change into an event you can listen for, which is the only way to learn about fills that dispatch nothing.
3. **Listen for `change` on the form, not per field.** Delegation catches fields rendered after the listener was attached and those inside a later wizard step.
4. **Reconcile in the capture phase of `submit`.** Walk `form.elements`, compare each value with state, and write the differences before validation runs.
5. **Validate what you just reconciled.** In frameworks with asynchronous state updates, build the payload from the DOM-merged values rather than a stale closure.
6. **Clear stale "required" errors after reconciliation.** If an error was shown for an empty field that autofill has since filled, re-run that field's validator so the message disappears, following the rules in [revalidating after the first submit](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/revalidating-after-the-first-submit/).

<svg viewBox="0 0 680 322" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for an autofilled field — whether an input event fired, whether the autofill animation fired, whether a change event fired — ending with the submit-time DOM read as the guaranteed fallback." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which layer catches which autofill case</title>
  <desc>If the browser fired an input event, the normal controlled handler already updated state. If not, but the field entered the autofill state, the animationstart listener updates it. If neither happened but the field fired change on blur, the delegated change listener updates it. Otherwise the capture-phase submit reconciliation reads the DOM and updates state before validation, which is the only path that works for Chrome&#x27;s value-withheld prefill.</desc>
  <rect x="0" y="0" width="680" height="322" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Did the fill dispatch an input event?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Normal handler</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Did the field match :autofill?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">animationstart listener</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Did change fire on blur?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Delegated change listener</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="69.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Submit-time reconciliation</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Capture-phase read of form.elements before</text>
  <text x="26.0" y="292.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validation. Always runs.</text>
</svg>

---

## Failure modes and edge cases

### 1. Reading `el.value` on load and getting an empty string

You cannot defeat Chrome's withholding, and you should not try (polling `el.value` or calling `focus()` on page load does not unlock it). Design so that nothing important happens before the first interaction: do not run validation on mount, and do not disable the submit button based on empty state, because the button would stay disabled over a visibly filled form.

### 2. Floating labels that overlap the autofilled value

A label positioned by a `value ? "raised" : "resting"` class stays resting while state is empty, so it sits on top of the filled text. Drive the raised state from CSS instead:

```css
.field input:is(:focus, :not(:placeholder-shown), :autofill) + label { transform: translateY(-1.2rem) scale(0.85); }
```

### 3. React's value tracker swallows a setter-based fill

When an extension sets `input.value = "x"` and then dispatches `new Event("input", { bubbles: true })`, React compares against its tracked value and may decide nothing changed. The submit-time layer covers this; do not reach for private React internals to "fix" it.

### 4. Autofill writes into fields you hid

Address autofill happily fills a hidden "company" or "address line 2" field. When you reconcile at submit, respect the rules in [skipping validation for disabled and hidden fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/) so a hidden field's autofilled value is neither validated nor sent unless you intend it.

### 5. One-time codes and autofill on iOS

SMS code autofill (`autocomplete="one-time-code"`) inserts the whole code into one field. If you split the code across several inputs, the fill lands in the first box only. Use a single input, or distribute the pasted value as described in [one-time code inputs](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/one-time-code-inputs-keyboard-paste-and-autofill/).

<svg viewBox="0 0 680 127" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two side-by-side cards contrasting a form rendered with autofilled values and the controlled state behind it that still holds empty strings, plus a third card showing the reconciled result." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the user sees versus what state holds</title>
  <desc>On screen the email and password fields are visibly filled by the browser. In the controlled state object both values are still empty strings, so a required-field check fails and the submit is blocked. After submit-time reconciliation the state matches the screen, the stale required errors are cleared and validation passes.</desc>
  <rect x="0" y="0" width="680" height="127" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="198.7" height="99.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">On screen</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">email: ada@example.com</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">password: ••••••••</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Looks complete to the user.</text>
  <path d="M212.7,61.5 H232.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="232.7,57.5 239.7,61.5 232.7,65.5" fill="#7b4f8a"/>
  <rect x="240.7" y="12.0" width="198.7" height="99.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="252.7" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">In state</text>
  <text x="252.7" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">email: &quot;&quot;</text>
  <text x="252.7" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">password: &quot;&quot;</text>
  <text x="252.7" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Required checks fail; submit blocked</text>
  <text x="252.7" y="96.0" font-size="9.5" fill="#6b5f75" font-family="inherit">with no visible cause.</text>
  <path d="M439.3,61.5 H459.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="459.3,57.5 466.3,61.5 459.3,65.5" fill="#7b4f8a"/>
  <rect x="467.3" y="12.0" width="198.7" height="99.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="479.3" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">After reconcile</text>
  <text x="479.3" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">State copied from the DOM in the</text>
  <text x="479.3" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit capture phase.</text>
  <text x="479.3" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Stale errors re-validated and cleared.</text>
</svg>

---

## Verification checklist

- [ ] With saved credentials in Chrome, reload the page, click submit once, and the form submits without a required-field error.
- [ ] In Safari, fill a full address with one keychain selection and every field's state updates.
- [ ] With a password-manager extension installed, a filled password reaches the payload.
- [ ] Floating labels are raised over autofilled values before any interaction.
- [ ] No validation errors appear on page load, even when fields are prefilled.
- [ ] The submit button is never disabled purely because state is empty.
- [ ] A required-field error shown before autofill disappears once the fill is reconciled.
- [ ] Hidden or disabled fields filled by the browser are not submitted unintentionally.

---

## Frequently Asked Questions

<details>
<summary><strong>Why does el.value return an empty string for a field I can see is filled?</strong></summary>

Chrome withholds prefilled credential values from script until the user interacts with the page, to stop a hostile page harvesting saved passwords without consent. The value becomes readable after the first click or key press, and no event fires when that happens, so reconcile at submit time.

</details>

<details>
<summary><strong>Is the :autofill animation trick still needed in current browsers?</strong></summary>

It is less critical than it was, because most text fills now dispatch `input`. It still earns its place for multi-field fills and for UI that must react before submit — raising labels, clearing a "required" hint — and it costs one CSS rule and one listener.

</details>

<details>
<summary><strong>Should I turn autofill off with autocomplete="off" to avoid all this?</strong></summary>

No. Browsers ignore `autocomplete="off"` for credential fields, and disabling autofill on address or payment fields makes forms slower and harder to use, especially for people with motor or cognitive disabilities. Handle autofill; do not fight it.

</details>

---

## Related

- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
- [Reading Values With FormData on Submit](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/reading-values-with-formdata-on-submit/)
- [Autocomplete Tokens for Autofill-Friendly Forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/)

← [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
