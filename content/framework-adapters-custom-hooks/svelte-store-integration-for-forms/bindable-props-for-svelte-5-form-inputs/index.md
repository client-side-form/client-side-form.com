---
layout: page.njk
title: "Bindable Props for Svelte 5 Form Inputs"
description: "Build reusable Svelte 5 input components with $bindable: two-way binding with bind:value, fallback values, validation state passed as props, attribute spreading with rest props, and avoiding the pitfalls of mutating bound objects."
slug: bindable-props-for-svelte-5-form-inputs
type: howto
breadcrumb: "$bindable Inputs"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Bindable Props for Svelte 5 Form Inputs"
  parent: "Svelte Store Integration for Forms"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Bindable Props for Svelte 5 Form Inputs",
      "description": "Build reusable Svelte 5 input components with $bindable: two-way binding with bind:value, fallback values, validation state passed as props, attribute spreading with rest props, and avoiding the pitfalls of mutating bound objects.",
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
          "name": "Svelte Store Integration for Forms",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Bindable Props for Svelte 5 Form Inputs",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/bindable-props-for-svelte-5-form-inputs/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a reusable Svelte 5 input with $bindable",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare value = $bindable(fallback)"
        },
        {
          "@type": "HowToStep",
          "name": "Type the props with HTMLInputAttributes"
        },
        {
          "@type": "HowToStep",
          "name": "Spread rest props onto the input, before your ARIA attributes"
        },
        {
          "@type": "HowToStep",
          "name": "Generate stable ids"
        },
        {
          "@type": "HowToStep",
          "name": "Receive errors as props"
        },
        {
          "@type": "HowToStep",
          "name": "Bind to properties of $state objects"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should every prop on an input component be bindable?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Make only the value the component edits bindable. Labels, errors and hints are inputs to the component; allowing them to be bound invites children to write state they should only display."
          }
        },
        {
          "@type": "Question",
          "name": "Can a bindable prop have validation inside the component?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The component can format or constrain what it writes (for example stripping non-digits), but validation that depends on other fields or on timing belongs in the form. Keep the component predictable: what the user typed, optionally normalised, goes up; the error comes down."
          }
        },
        {
          "@type": "Question",
          "name": "How do I bind a checkbox group?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use bind:group on native checkboxes inside the component, with a bindable array prop: let { selected = $bindable([]) } = $props() and . Wrap the group in a fieldset with a legend, and put group errors on the fieldset."
          }
        }
      ]
    }
  ]
}
</script>

# Bindable Props for Svelte 5 Form Inputs

In Svelte 4 any prop could be bound with `bind:`; Svelte 5 makes binding opt-in with `$bindable()`, so input components migrated from Svelte 4 suddenly throw "Cannot bind to property … as it is not declared with $bindable", and components written fresh often forget it and silently become one-way.

This page builds a reusable text field component for Svelte 5 runes: a bindable `value`, error and hint props wired to ARIA, attribute forwarding with rest props, and the rules for binding objects and numbers. It complements the store patterns in [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/) and the migration notes in [Svelte 5 runes migration for form stores](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/svelte-5-runes-migration-for-form-stores/).

---

## Context and prerequisites

In Svelte 5, component props come from `let { … } = $props()`. A prop is **one-way by default**: the child can read it, and may reassign its local copy, but the parent does not see the change. Declaring `value = $bindable()` in the destructuring makes it **two-way** when the parent uses `bind:value`, and one-way when the parent passes `value={x}`.

`$bindable(fallback)` provides a fallback used when the parent passes nothing, which lets the component work uncontrolled. Rest props (`...rest`) collect everything else the parent passes — `autocomplete`, `inputmode`, `name`, event handlers — for spreading onto the native input.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of how props, binding, fallbacks and attribute forwarding work in Svelte 4 and Svelte 5." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Props in Svelte 4 and Svelte 5</title>
  <desc>In Svelte 4 props were declared with export let, any prop could be bound, fallbacks were default values on export let, and attributes were forwarded with $$restProps. In Svelte 5 props are declared with $props, only props declared with $bindable can be bound, fallbacks are passed to $bindable or given as destructuring defaults, and attributes are forwarded with rest props from the $props destructuring.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Concern</text>
  <text x="175.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Svelte 4</text>
  <text x="403.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Svelte 5</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">declare</text>
  <text x="175.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">export let value</text>
  <text x="403.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">let { value } = $props()</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">two-way binding</text>
  <text x="175.6" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">any prop</text>
  <text x="403.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">only value = $bindable()</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">fallback</text>
  <text x="175.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">export let value = &quot;&quot;</text>
  <text x="403.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">value = $bindable(&quot;&quot;)</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">forward attributes</text>
  <text x="175.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">$$restProps</text>
  <text x="403.1" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">...rest from $props()</text>
</svg>

---

## The core pattern: a bindable text field

```html
<!-- TextField.svelte -->
<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = Omit<HTMLInputAttributes, "value"> & {
    label: string;
    value?: string;
    error?: string;
    hint?: string;
  };

  // value is two-way when the parent uses bind:value, and falls back to ""
  // when the parent passes nothing (uncontrolled use).
  let { label, value = $bindable(""), error, hint, id, ...rest }: Props = $props();

  // $props.id() (Svelte 5.20+) is stable across SSR and hydration.
  const uid = $props.id();
  const inputId = $derived(id ?? `field-${uid}`);
  const errorId = $derived(error ? `${inputId}-error` : undefined);
  const hintId = $derived(hint ? `${inputId}-hint` : undefined);
  const describedBy = $derived([errorId, hintId].filter(Boolean).join(" ") || undefined);
</script>

<div class="field">
  <label for={inputId}>{label}</label>
  {#if hint}<p id={hintId} class="hint">{hint}</p>{/if}
  <input
    id={inputId}
    bind:value
    {...rest}
    aria-invalid={error ? "true" : undefined}
    aria-describedby={describedBy}
  />
  {#if error}<p id={errorId} class="error">{error}</p>{/if}
</div>
```

```html
<!-- Parent -->
<script lang="ts">
  import TextField from "./TextField.svelte";
  let form = $state({ email: "", name: "" });
  let touched = $state({ email: false, name: false });
  const emailError = $derived(touched.email && !/^\S+@\S+\.\S+$/.test(form.email) ? "Enter an email like name@example.com." : undefined);
</script>

<TextField label="Email" type="email" autocomplete="email" bind:value={form.email}
  error={emailError} onblur={() => (touched.email = true)} />
```

---

## Step-by-step walkthrough

1. **Declare `value = $bindable(fallback)`.** Only `$bindable` props accept `bind:`; the fallback keeps uncontrolled use working.
2. **Type the props with `HTMLInputAttributes`.** `Omit<HTMLInputAttributes, "value">` plus your own props gives full typing for every native attribute callers might pass.
3. **Spread rest props onto the input, before your ARIA attributes.** Callers' `autocomplete`, `inputmode`, `name`, `maxlength` and event handlers reach the element; your `aria-invalid` and `aria-describedby` come after so they are not overridden accidentally.
4. **Generate stable ids.** `$props.id()` avoids hydration mismatches on `for`, `id` and `aria-describedby` in SvelteKit.
5. **Receive errors as props.** The parent (or a form store) decides when an error is visible — for example after blur, as in [touched vs dirty vs visited](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/).
6. **Bind to properties of `$state` objects.** `bind:value={form.email}` works because `$state` objects are deeply reactive proxies.

### Why binding is now explicit

Svelte 4's "every prop is bindable" made data flow hard to follow: any child could write back to any parent value, and a component's public interface did not say which props it might change. Svelte 5 makes that part of the contract. A component that declares `$bindable` is announcing that it owns editing of that value; one that does not is purely presentational for it. For form inputs this is exactly the right boundary — the input edits its value, and nothing else — and it lets readers of a parent component see at a glance, from `bind:` versus plain attributes, which children can change which state.

<svg viewBox="0 0 680 187" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user typing in a TextField, the native input&#x27;s bind:value updating the component&#x27;s bindable prop, which updates the parent&#x27;s state object, while an error prop flows back down." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>bind:value through a component boundary</title>
  <desc>The user types into the native input. The input&#x27;s bind:value updates the TextField&#x27;s value prop. Because value is declared with $bindable and the parent used bind:value, the parent&#x27;s form.email state updates. The parent&#x27;s derived emailError recomputes and flows back down to TextField as the error prop, which updates aria-invalid and the error paragraph.</desc>
  <rect x="0" y="0" width="680" height="187" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">native input</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">TextField</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Parent state</text>
  <path d="M95.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">types</text>
  <path d="M95.5,69.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,65.0 257.5,69.0 250.5,73.0" fill="#7b4f8a"/>
  <text x="266.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">bind:value → value</text>
  <path d="M258.5,97.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,93.0 420.5,97.0 413.5,101.0" fill="#7b4f8a"/>
  <text x="429.5" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">$bindable → form.email</text>
  <path d="M421.5,125.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,121.0 583.5,125.0 576.5,129.0" fill="#7b4f8a"/>
  <text x="429.5" y="149.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">error prop (derived)</text>
  <path d="M584.5,153.0 H429.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="429.5,149.0 422.5,153.0 429.5,157.0" fill="#7b4f8a"/>
</svg>

### Composing inputs into larger fields

The same rules scale up to composite fields. A date-of-birth field made of day, month and year inputs can expose one bindable `value` as an ISO string, parse it into three local `$state` values, and write the joined string back whenever any part changes and all three are complete. The parent binds one value and receives one error; the component handles the parts internally. Put the three inputs in a `fieldset` with a `legend` ("Date of birth"), label each part, and attach the error to the fieldset so screen-reader users hear it once when entering the group rather than three times.

Avoid exposing three separate bindable props for such a field. It pushes the parsing and the "is it complete yet?" logic into every parent, and cross-part validation — 31 February — ends up duplicated wherever the field is used.

---

## Failure modes and edge cases

### 1. Binding a prop that is not `$bindable`

`<TextField bind:value={x} />` against a component with `let { value } = $props()` throws at runtime in development. Add `$bindable()`; this is the most common Svelte 4 → 5 migration error for input components.

### 2. Mutating a non-bound object prop

If the parent passes `address={form.address}` without `bind:`, and the child writes `address.city = "x"`, Svelte warns about mutating state it does not own (the `ownership_invalid_mutation` warning) because the parent never agreed to two-way data. Either bind it, or have the child emit changes through a callback prop.

### 3. Numbers

`bind:value` on `type="number"` inputs gives numbers, and `null` for empty or invalid input. For money and quantities where intermediate text matters, bind a string and parse in the form, per [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).

### 4. Event handler props

Svelte 5 uses `onblur`, `oninput` props rather than `on:blur` directives; they arrive in `rest` and are spread onto the input automatically. If the component also needs its own `onblur`, call the caller's handler from yours rather than letting one overwrite the other.

### 5. Exposing focus

An error summary needs to focus the inner input. Bind the element (`bind:this={inputEl}`) and export a function (`export function focus() { inputEl.focus(); }` in the instance script), which parents call through a component reference.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing when to use a one-way prop, a bindable prop and a callback prop in Svelte 5 input components." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One-way, two-way, and callback props</title>
  <desc>A one-way prop suits values the component only displays, such as label, hint and error. A bindable prop suits the value the component edits, such as an input&#x27;s text. A callback prop such as onchange suits cases where the parent must decide whether to accept a change, such as formatting or rejecting input.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">One-way prop</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">label, hint, error.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The component only displays it.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">$bindable prop</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">value.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The component edits it.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Callback prop</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">onchange(v).</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The parent decides whether to accept it.</text>
</svg>

---

## Verification checklist

- [ ] `bind:value` on the component updates the parent's state, and parent changes update the input.
- [ ] Passing `value={x}` without `bind:` works one-way without warnings.
- [ ] Using the component without `value` works with the fallback.
- [ ] `autocomplete`, `inputmode`, `name` and handlers reach the native input.
- [ ] Ids are identical in server render and after hydration.
- [ ] Errors toggle `aria-invalid` and are referenced by `aria-describedby`.
- [ ] No ownership mutation warnings appear in development.

---

## Frequently Asked Questions

<details>
<summary><strong>Should every prop on an input component be bindable?</strong></summary>

No. Make only the value the component edits bindable. Labels, errors and hints are inputs to the component; allowing them to be bound invites children to write state they should only display.

</details>

<details>
<summary><strong>Can a bindable prop have validation inside the component?</strong></summary>

The component can format or constrain what it writes (for example stripping non-digits), but validation that depends on other fields or on timing belongs in the form. Keep the component predictable: what the user typed, optionally normalised, goes up; the error comes down.

</details>

<details>
<summary><strong>How do I bind a checkbox group?</strong></summary>

Use `bind:group` on native checkboxes inside the component, with a bindable array prop: `let { selected = $bindable([]) } = $props()` and `<input type="checkbox" bind:group={selected} value={option}>`. Wrap the group in a `fieldset` with a `legend`, and put group errors on the fieldset.

</details>

---

## Related

- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Custom Form Inputs With defineModel in Vue 3.4+](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/custom-form-inputs-with-definemodel/)
- [Accessible Errors for Radio and Checkbox Groups](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-errors-for-radio-and-checkbox-groups/)

← [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
