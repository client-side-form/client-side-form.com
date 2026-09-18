---
layout: page.njk
title: "Custom Form Inputs With defineModel in Vue 3.4+"
description: "Build custom Vue input components with defineModel: two-way binding without prop/emit boilerplate, model modifiers for trimming and number parsing, multiple v-models per component, and passing validation state and ARIA attributes through correctly."
slug: custom-form-inputs-with-definemodel
type: howto
breadcrumb: "defineModel Inputs"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Custom Form Inputs With defineModel in Vue 3.4+"
  parent: "Vue Composition API Form Adapters"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Custom Form Inputs With defineModel in Vue 3.4+",
      "description": "Build custom Vue input components with defineModel: two-way binding without prop/emit boilerplate, model modifiers for trimming and number parsing, multiple v-models per component, and passing validation state and ARIA attributes through correctly.",
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
          "name": "Vue Composition API Form Adapters",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Custom Form Inputs With defineModel in Vue 3.4+",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/custom-form-inputs-with-definemodel/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a custom Vue input component with defineModel",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare the model with defineModel"
        },
        {
          "@type": "HowToStep",
          "name": "Read modifiers from the second tuple element"
        },
        {
          "@type": "HowToStep",
          "name": "Transform in set, not in a watcher"
        },
        {
          "@type": "HowToStep",
          "name": "Turn off inheritAttrs and bind $attrs to the input"
        },
        {
          "@type": "HowToStep",
          "name": "Generate ids with useId"
        },
        {
          "@type": "HowToStep",
          "name": "Wire the error with aria-invalid and aria-describedby"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does defineModel work with Vue 3.3?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It was experimental in 3.3 behind a compiler flag and became stable in 3.4. On earlier versions, use the prop plus emit pattern with a computed getter and setter; the component's public API (v-model) is identical, so parents do not change when you upgrade."
          }
        },
        {
          "@type": "Question",
          "name": "Should validation run inside the input component?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Keep rules in the form composable so they can see other fields and so timing is consistent. The component can run trivial presentational checks (such as showing a character count) but should receive its error as a prop."
          }
        },
        {
          "@type": "Question",
          "name": "How do I focus the inner input from the parent?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Expose a focus method with defineExpose({ focus: () => inputRef.value?.focus() }). The parent calls it through a template ref, which is how an error summary moves focus to a custom field."
          }
        }
      ]
    }
  ]
}
</script>

# Custom Form Inputs With defineModel in Vue 3.4+

Before Vue 3.4, every custom input needed a `modelValue` prop, an `update:modelValue` emit and a computed getter/setter to glue them — and the most common bug was mutating the prop directly, which Vue warns about and which silently breaks when the parent passes a non-reactive value.

`defineModel()` collapses that into one line that returns a ref you can read and write. The [Vue composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) topic covers the form-level composables; this page is about the leaf: an input component that participates in `v-model`, applies modifiers, exposes its error to assistive technology, and forwards attributes to the right element.

---

## Context and prerequisites

What `defineModel` does under the hood:

- Declares a `modelValue` prop and an `update:modelValue` emit (or `title` / `update:title` for a named model).
- Returns a ref whose getter reads the prop and whose setter emits the update. Writing the ref never mutates the prop.
- Keeps a **local copy** when the parent does not bind `v-model`, so the component still works uncontrolled.
- Exposes **modifiers** (`v-model.trim`, custom ones like `v-model.digits`) through a second return value, with optional `get`/`set` transforms.

For forms, the important part is that the input component stays a thin, predictable wrapper: the parent owns the value; the component owns presentation, formatting and accessibility wiring.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing the code a custom Vue input needed before Vue 3.4 with what it needs using defineModel." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Before and after defineModel</title>
  <desc>Before Vue 3.4 a custom input declared a modelValue prop, an update:modelValue emit and a computed with get and set to bridge them, and a common bug was assigning to the prop. With defineModel, one call returns a writable ref that emits updates, works uncontrolled when the parent does not bind v-model, and exposes modifiers with get and set transforms.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Concern</text>
  <text x="190.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Before 3.4</text>
  <text x="433.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">With defineModel</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">declare binding</text>
  <text x="190.8" y="61.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">props + emits + computed</text>
  <text x="433.4" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">const model = defineModel()</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">write the value</text>
  <text x="190.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">emit(&quot;update:modelValue&quot;, v)</text>
  <text x="433.4" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">model.value = v</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">parent omits v-model</text>
  <text x="190.8" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no local state</text>
  <text x="433.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">local copy kept</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">modifiers</text>
  <text x="190.8" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">modelModifiers prop by hand</text>
  <text x="433.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">[model, modifiers] + get/set</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">common bug</text>
  <text x="190.8" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">mutating the prop</text>
  <text x="433.4" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">not possible via the ref</text>
</svg>

---

## The core pattern: a text field with modifiers, error wiring and attribute forwarding

```html
<!-- TextField.vue -->
<script setup lang="ts">
import { computed, useId } from "vue";

defineOptions({ inheritAttrs: false });   // forward $attrs to the <input>, not the wrapper

const props = defineProps<{ label: string; error?: string; hint?: string; required?: boolean }>();

// v-model with custom modifiers: v-model.trim and v-model.digits
const [model, modifiers] = defineModel<string, "trim" | "digits">({
  default: "",
  set(value) {
    // Transform on the way OUT to the parent. Keep this cheap: it runs per keystroke.
    let v = value;
    if (modifiers.digits) v = v.replace(/\D+/g, "");
    return v;
  },
});

const id = useId();                        // Vue 3.5+: SSR-safe unique id
const errorId = computed(() => (props.error ? `${id}-error` : undefined));
const hintId = computed(() => (props.hint ? `${id}-hint` : undefined));
// Order matters: screen readers read the error before the hint.
const describedBy = computed(() => [errorId.value, hintId.value].filter(Boolean).join(" ") || undefined);

function onBlur(e: FocusEvent) {
  // .trim is applied on blur, not per keystroke, so users can type spaces mid-word.
  if (modifiers.trim) model.value = (e.target as HTMLInputElement).value.trim();
}
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}<span v-if="required" aria-hidden="true"> *</span></label>
    <p v-if="hint" :id="hintId" class="hint">{{ hint }}</p>
    <input
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @blur="onBlur"
    />
    <p v-if="error" :id="errorId" class="error">{{ error }}</p>
  </div>
</template>
```

```html
<!-- Parent -->
<TextField v-model.trim="form.name" label="Full name" required :error="errors.name" autocomplete="name" />
<TextField v-model.digits="form.phone" label="Phone" inputmode="tel" :error="errors.phone" />
```

---

## Step-by-step walkthrough

1. **Declare the model with `defineModel`.** Type it (`defineModel<string>()`) and give it a default so the uncontrolled case has a value.
2. **Read modifiers from the second tuple element.** Built-in `v-model.trim` and `.number` apply automatically on native inputs inside your component only if you pass them through; for custom components, you implement them in `set` (or on blur for `trim`).
3. **Transform in `set`, not in a watcher.** `set` runs when the component writes the ref, before the parent is notified — one update instead of two.
4. **Turn off `inheritAttrs` and bind `$attrs` to the input.** Attributes such as `autocomplete`, `inputmode`, `name` and `maxlength` belong on the `<input>`, not the wrapper `div`. The token list is in [autocomplete tokens for autofill-friendly forms](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/).
5. **Generate ids with `useId`.** It is stable between server and client render, which avoids hydration mismatches on `for`, `id` and `aria-describedby`.
6. **Wire the error with `aria-invalid` and `aria-describedby`.** The component receives `error` as a prop; the parent's composable decides when to show it, per [touched vs dirty vs visited](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/touched-vs-dirty-vs-visited-field-flags/).

<svg viewBox="0 0 680 187" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a keystroke in a phone field using a digits modifier, from the native input event through the model setter&#x27;s transform to the parent&#x27;s reactive state and back down as the prop." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A keystroke through a defineModel input with a modifier</title>
  <desc>The user types a hyphen into the phone input. The native input&#x27;s v-model writes the raw text into the model ref. The model&#x27;s set transform strips non-digits and emits update:modelValue with the cleaned value. The parent&#x27;s form state updates, and the new modelValue flows back down as a prop, so the input displays the digits only.</desc>
  <rect x="0" y="0" width="680" height="187" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">TextField input</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">defineModel ref</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Parent form state</text>
  <path d="M95.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V171.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">types &quot;-&quot;</text>
  <path d="M95.5,69.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,65.0 257.5,69.0 250.5,73.0" fill="#7b4f8a"/>
  <text x="266.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">model.value = &quot;0207-&quot;</text>
  <path d="M258.5,97.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,93.0 420.5,97.0 413.5,101.0" fill="#7b4f8a"/>
  <text x="429.5" y="121.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">set(): emit &quot;0207&quot;</text>
  <path d="M421.5,125.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,121.0 583.5,125.0 576.5,129.0" fill="#7b4f8a"/>
  <text x="266.5" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">prop modelValue = &quot;0207&quot;</text>
  <path d="M584.5,153.0 H266.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="266.5,149.0 259.5,153.0 266.5,157.0" fill="#7b4f8a"/>
</svg>

### Designing the component's public API

A custom input is used in dozens of places, so its props are an API worth designing once. Keep it to what varies between uses: `label`, `hint`, `error`, `required`, plus `v-model` and any named models. Everything else — `autocomplete`, `inputmode`, `maxlength`, `name`, `placeholder`, `disabled` — should arrive as ordinary attributes through `$attrs`, so the component never needs a new prop when a use case needs a new native attribute. Resist props like `showError` or `validateOn`: whether an error is visible, and when validation runs, are decisions for the form composable, and a component that makes them independently produces forms where fields disagree about timing.

The `required` prop deserves care. Setting the native `required` attribute gives screen-reader users the "required" state for free, but it also turns on native constraint validation unless the form has `novalidate`. Most custom forms want the announcement without the browser bubble, so pair the component with `novalidate` on the form, or use `aria-required="true"` when native validation is not wanted at all.

---

## Failure modes and edge cases

### 1. Caret jumps with transforming modifiers

When `set` changes the value the user typed (stripping a hyphen), the parent sends back a different string and the browser moves the caret to the end. For anything beyond stripping trailing characters, preserve the selection explicitly — the technique in [preserving caret position in masked inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/).

### 2. `.number` on a custom component

`v-model.number` on a custom component sets `modifiers.number` but does nothing unless you implement it. For numeric fields, prefer keeping raw text and parsing in the form composable, as in [controlled number inputs and intermediate values](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/controlled-number-inputs-and-intermediate-values/).

### 3. Attributes landing on the wrapper

Without `inheritAttrs: false`, `autocomplete="email"` ends up on the `div`, where it does nothing, and browser autofill stops working for the field. Also check `class` and `style`: they are part of `$attrs` and will move to the input — bind them to the wrapper separately if needed.

### 4. Multiple models

A date-range component can expose `defineModel("start")` and `defineModel("end")`, bound with `v-model:start` and `v-model:end`. Each is independent; validate their relationship at the form level, not inside the component.

### 5. Objects as models

`defineModel<Address>()` returns a ref to the parent's object. Mutating `model.value.city = "x"` mutates the parent's object without emitting — it works by accident with reactive parents and fails with plain objects. Replace the whole object: `model.value = { ...model.value, city: "x" }`.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards dividing responsibilities between a custom input component and the parent form composable." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the component owns versus the parent</title>
  <desc>The input component owns the label, input and error markup, id generation, aria-invalid and aria-describedby wiring, attribute forwarding, and cheap per-keystroke formatting through modifiers. The parent form owns the value, validation rules and timing, when an error is shown, and submission.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Input component</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Markup: label, input, hint, error.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">useId, aria-invalid, aria-describedby.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">$attrs forwarding; modifier transforms.</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Parent form</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The value (via v-model).</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Rules and timing; which error to show.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submission and server errors.</text>
</svg>

---

## Verification checklist

- [ ] `v-model` on the component updates the parent, and parent changes update the input.
- [ ] Without `v-model`, the component still works with its own local value.
- [ ] `v-model.trim` trims on blur, allowing spaces while typing.
- [ ] A custom modifier transforms values without a second update cycle.
- [ ] `autocomplete`, `inputmode` and `name` reach the `<input>` element.
- [ ] Ids match between server render and hydration.
- [ ] The error is announced via `aria-describedby`, and `aria-invalid` toggles with it.
- [ ] Object models are replaced, never mutated in place.

---

## Frequently Asked Questions

<details>
<summary><strong>Does defineModel work with Vue 3.3?</strong></summary>

It was experimental in 3.3 behind a compiler flag and became stable in 3.4. On earlier versions, use the prop plus emit pattern with a computed getter and setter; the component's public API (`v-model`) is identical, so parents do not change when you upgrade.

</details>

<details>
<summary><strong>Should validation run inside the input component?</strong></summary>

Keep rules in the form composable so they can see other fields and so timing is consistent. The component can run trivial presentational checks (such as showing a character count) but should receive its error as a prop.

</details>

<details>
<summary><strong>How do I focus the inner input from the parent?</strong></summary>

Expose a `focus` method with `defineExpose({ focus: () => inputRef.value?.focus() })`. The parent calls it through a template ref, which is how an error summary moves focus to a custom field.

</details>

---

## Related

- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
- [Vue 3 watchEffect vs watch for Validation Triggers](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/vue-3-watcheffect-vs-watch-for-validation/)
- [Wiring aria-describedby for Multiple Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/)

← [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
