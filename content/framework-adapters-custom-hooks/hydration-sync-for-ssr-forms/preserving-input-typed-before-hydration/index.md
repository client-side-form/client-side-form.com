---
layout: page.njk
title: "Preserving Input Typed Before Hydration"
description: "Users type into server-rendered forms before JavaScript takes over, and hydration can wipe it. How to read pre-hydration DOM values into state, choose uncontrolled inputs for early fields, capture early submits, and test the gap on slow devices."
slug: preserving-input-typed-before-hydration
type: howto
breadcrumb: "Pre-Hydration Input"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Preserving Input Typed Before Hydration"
  parent: "Hydration Sync for SSR Forms"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Preserving Input Typed Before Hydration",
      "description": "Users type into server-rendered forms before JavaScript takes over, and hydration can wipe it. How to read pre-hydration DOM values into state, choose uncontrolled inputs for early fields, capture early submits, and test the gap on slow devices.",
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
          "name": "Framework Adapters & Custom Hooks for Form State",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Hydration Sync for SSR Forms",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Preserving Input Typed Before Hydration",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/preserving-input-typed-before-hydration/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep what users type before a form hydrates",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Decide which fields can be touched early"
        },
        {
          "@type": "HowToStep",
          "name": "Prefer uncontrolled inputs for those fields"
        },
        {
          "@type": "HowToStep",
          "name": "For controlled fields, adopt at hydration"
        },
        {
          "@type": "HowToStep",
          "name": "Handle checkboxes, radios and selects too"
        },
        {
          "@type": "HowToStep",
          "name": "Make early submits safe"
        },
        {
          "@type": "HowToStep",
          "name": "Preserve focus and selection"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does React 19 preserve typed values during hydration?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "React has improved how it handles some pre-hydration events, such as replaying certain discrete events after hydration, but a controlled input still ends up with whatever its state says. If state starts empty, the DOM value is replaced. Adopting the DOM value, or using an uncontrolled input, is still the reliable approach."
          }
        },
        {
          "@type": "Question",
          "name": "Is it better to disable inputs until hydration?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Disabled-until-ready forms punish the users on slow devices whom server rendering was meant to help, and a script failure leaves the form unusable. Keep inputs usable and preserve what they receive."
          }
        },
        {
          "@type": "Question",
          "name": "Does this apply to islands or partial hydration?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and the window can be longer, because islands often hydrate on visibility or idle. A form island hydrated \"on visible\" can be typed into while it is visible but not yet hydrated. Hydrate form islands eagerly, or rely on uncontrolled inputs within them."
          }
        }
      ]
    }
  ]
}
</script>

# Preserving Input Typed Before Hydration

On a slow phone, a server-rendered form is visible and editable for one to several seconds before its JavaScript hydrates — and when hydration attaches controlled inputs whose state starts empty, it overwrites whatever the user already typed, so the first few words of their message simply vanish.

[Hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/) covers mismatches between server and client render. This page covers the other hydration gap: the DOM changed because a *person* changed it, before the framework was listening. The fix is to treat the pre-hydration DOM as an input source — read it once at hydration, adopt it into state, and design early fields so there is nothing to overwrite.

---

## Context and prerequisites

What each framework does to a text input at hydration:

- **React** hydrates `<input value={state}>` by attaching to the existing element. For controlled inputs, React sets the DOM value from state on the next commit if they differ — and state started from the server's initial value, usually empty. The user's early text is replaced.
- **Vue** hydration with `v-model` binds the input; the reactive value (empty) is applied on mount, replacing the DOM value in many configurations.
- **Svelte** hydration with `bind:value` likewise initialises from the component's state.
- **Uncontrolled inputs** (`defaultValue`, no binding) are left alone: the DOM keeps what the user typed, and your code reads it later.

Browsers can also restore form values on back/forward navigation or session restore, which hits the same path: the DOM holds values the framework did not put there.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of a server-rendered form on a slow phone showing first paint, the user typing, JavaScript downloading and executing, and hydration overwriting the typed text with empty state." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The window in which typing can be lost</title>
  <desc>The HTML paints at about 800 milliseconds and the form is usable. The user focuses the message field and types from 1.2 to 3.4 seconds. The JavaScript bundle downloads and executes until about 3.6 seconds, when hydration runs. With controlled inputs initialised from empty state, the typed text is replaced at hydration. With the adoption step, the typed text is read into state first and kept.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Page</text>
  <rect x="234.3" y="14.0" width="281.1" height="14" rx="3" fill="#b07a55"/>
  <text x="234.3" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">painted, usable, not hydrated</text>
  <rect x="515.4" y="14.0" width="140.6" height="14" rx="3" fill="#2d6342"/>
  <text x="515.4" y="40.0" font-size="9" fill="#2d6342" font-family="inherit">hydrated</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">User</text>
  <rect x="274.5" y="56.0" width="220.9" height="14" rx="3" fill="#7b4f8a"/>
  <text x="274.5" y="82.0" font-size="9" fill="#6b5f75" font-family="inherit">types the first sentence</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Controlled, no adoption</text>
  <rect x="515.4" y="98.0" width="140.6" height="14" rx="3" fill="#a63d6f"/>
  <text x="515.4" y="124.0" font-size="9" fill="#a63d6f" font-family="inherit">text replaced by empty state</text>
  <text x="14.0" y="150.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">With adoption</text>
  <rect x="515.4" y="140.0" width="140.6" height="14" rx="3" fill="#2d6342"/>
  <text x="515.4" y="166.0" font-size="9" fill="#2d6342" font-family="inherit">text read into state, kept</text>
  <text x="154.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="254.4" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1000ms</text>
  <text x="354.8" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2000ms</text>
  <text x="455.2" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">3000ms</text>
  <text x="555.6" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">4000ms</text>
  <text x="656.0" y="190.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">5000ms</text>
</svg>

---

## The core pattern: adopt DOM values at hydration

```tsx
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Controlled field that adopts any value the user typed before hydration.
 * useLayoutEffect runs after hydration attaches but before the browser paints
 * the next frame, so the user never sees their text disappear and reappear.
 */
export function useAdoptedValue(serverInitial: string) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [value, setValue] = useState(serverInitial);

  useLayoutEffect(() => {
    const el = ref.current;
    // If the DOM differs from what the server rendered, a person (or the
    // browser's form restoration) changed it before we were listening.
    if (el && el.value !== serverInitial) setValue(el.value);
    // Run once, at hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, value, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value) };
}

export function MessageField() {
  const f = useAdoptedValue("");
  return (
    <>
      <label htmlFor="message">Message</label>
      <textarea id="message" name="message" ref={f.ref as React.RefObject<HTMLTextAreaElement>} value={f.value} onChange={f.onChange} />
    </>
  );
}
```

```html
<!-- Framework-agnostic: capture early submits before hydration -->
<script>
  // Inline in the <head>: runs before the bundle. If the user submits early,
  // let the native POST proceed only if the form has a real action; otherwise
  // hold the event until the app is ready.
  document.addEventListener("submit", (e) => {
    if (window.__appReady) return;
    const form = e.target;
    if (!form.hasAttribute("data-hold-until-ready")) return;   // native POST works: let it go
    e.preventDefault();
    window.__queuedSubmit = form;                              // the app re-dispatches on ready
  }, true);
</script>
```

---

## Step-by-step walkthrough

1. **Decide which fields can be touched early.** Anything above the fold on a server-rendered page — search boxes, login fields, the first fields of a form — is at risk.
2. **Prefer uncontrolled inputs for those fields.** If the field does not need per-keystroke state, `defaultValue` plus reading on submit (as in [reading values with FormData on submit](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/reading-values-with-formdata-on-submit/)) sidesteps the problem entirely.
3. **For controlled fields, adopt at hydration.** Compare the DOM value with the server-rendered initial value in a layout effect (or `onMounted` in Vue, `$effect.pre` in Svelte) and copy it into state if different.
4. **Handle checkboxes, radios and selects too.** Compare `checked` and `selectedIndex`, not just `value`; users tick boxes before hydration as readily as they type.
5. **Make early submits safe.** A form with a real `action` URL posts natively before hydration — the most robust option, per [progressive enhancement for server-rendered forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/progressive-enhancement-for-server-rendered-forms/). Otherwise, capture the submit in an inline script and replay it when the app is ready.
6. **Preserve focus and selection.** If adoption causes a re-render, restore `selectionStart`/`selectionEnd` so the caret does not jump to the end.

### Why this is not a hydration mismatch

Framework hydration warnings compare the server-rendered *markup* with what the client would render. A value typed by the user changes the element's `value` *property*, not its `value` attribute, so the markup still matches and no warning fires. That is what makes the bug so easy to ship: nothing in development tooling flags it, fast development machines hydrate before anyone can type, and the loss only happens on real devices under real network conditions. It has to be designed out and tested for deliberately.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for how to protect a server-rendered field from losing pre-hydration input, based on whether it can be uncontrolled and whether the form can post natively." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Protecting a field from pre-hydration loss</title>
  <desc>If the field does not need per-keystroke state, make it uncontrolled and read it on submit; nothing is overwritten. If it must be controlled, adopt the DOM value into state at hydration. Separately, if the form can have a real action URL, let pre-hydration submits post natively; otherwise capture them with an inline script and replay them once the app is ready.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Needs per-keystroke state?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Controlled + adopt at hydration</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Can the form post natively?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Real action URL</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Capture and replay</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Inline script holds the submit until ready.</text>
</svg>

---

## Failure modes and edge cases

### 1. Adopting in `useEffect` instead of `useLayoutEffect`

`useEffect` runs after paint: the user sees their text vanish for a frame and reappear. `useLayoutEffect` runs before paint. In frameworks with streaming or selective hydration, hydrate forms early (for React, avoid wrapping them in low-priority Suspense boundaries).

### 2. Browser form restoration

Back/forward navigation and restored tabs can repopulate fields with previous values. Adoption picks these up too — usually desirable, but for sensitive forms set `autocomplete="off"` on non-credential fields where restoration is unwanted.

### 3. Hydration mismatches caused by adoption

Adoption must happen after hydration, not during render: reading `el.value` during render on the client produces markup different from the server's. Always read in an effect.

### 4. Validation state

Adopted values should be validated like typed values but not immediately shown as errors; mark them dirty, not touched, following [touched vs dirty vs visited](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/).

### 5. Testing the gap

Nothing reproduces this on a fast laptop. In Playwright, delay the bundle with `page.route("**/*.js", …)` for a few seconds, type into the field, release the bundle and assert the value survives.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a Playwright test that holds the JavaScript bundle, types into the server-rendered field, releases the bundle, waits for hydration and asserts the typed text is still present." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Testing the pre-hydration window in Playwright</title>
  <desc>The test routes script requests and holds them. It navigates to the page, which paints from server HTML. It types a sentence into the message field. It then releases the held scripts, waits for an application-ready signal, and asserts that the field still contains the typed sentence and that the app&#x27;s state holds it too.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Test</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Browser</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Held bundle</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">route **/*.js: hold</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">goto /contact (HTML paints)</text>
  <path d="M122.7,97.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,93.0 339.0,97.0 332.0,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">fill #message &quot;Hello, I need…&quot;</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">release scripts</text>
  <path d="M122.7,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">hydrated: value still present</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] With JavaScript delayed by 3 seconds, text typed before hydration is still present after it.
- [ ] Checkboxes and selects changed before hydration keep their state.
- [ ] Adopted values reach application state, not only the DOM.
- [ ] The caret stays where the user left it.
- [ ] A submit before hydration either posts natively or is replayed after it.
- [ ] No hydration mismatch warnings appear.
- [ ] Adopted values are dirty but do not show errors until blur or submit.

---

## Frequently Asked Questions

<details>
<summary><strong>Does React 19 preserve typed values during hydration?</strong></summary>

React has improved how it handles some pre-hydration events, such as replaying certain discrete events after hydration, but a controlled input still ends up with whatever its state says. If state starts empty, the DOM value is replaced. Adopting the DOM value, or using an uncontrolled input, is still the reliable approach.

</details>

<details>
<summary><strong>Is it better to disable inputs until hydration?</strong></summary>

No. Disabled-until-ready forms punish the users on slow devices whom server rendering was meant to help, and a script failure leaves the form unusable. Keep inputs usable and preserve what they receive.

</details>

<details>
<summary><strong>Does this apply to islands or partial hydration?</strong></summary>

Yes, and the window can be longer, because islands often hydrate on visibility or idle. A form island hydrated "on visible" can be typed into while it is visible but not yet hydrated. Hydrate form islands eagerly, or rely on uncontrolled inputs within them.

</details>

---

## Related

- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
- [Preventing Hydration Mismatch in Next.js Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/preventing-hydration-mismatch-in-nextjs-forms/)
- [Syncing Default Values When Initial Data Changes](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/syncing-default-values-when-initial-data-changes/)

← [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
