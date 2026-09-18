---
layout: page.njk
title: "Provide/Inject for Nested Form Sections"
description: "Share one form's state with deeply nested section components using Vue's provide/inject: a typed injection key, scoped section contexts with path prefixes, registration for validation and focus, and avoiding prop drilling without creating a global store."
slug: provide-inject-for-nested-form-sections
type: howto
breadcrumb: "Provide/Inject Sections"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Provide/Inject for Nested Form Sections"
  parent: "Vue Composition API Form Adapters"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Provide/Inject for Nested Form Sections",
      "description": "Share one form's state with deeply nested section components using Vue's provide/inject: a typed injection key, scoped section contexts with path prefixes, registration for validation and focus, and avoiding prop drilling without creating a global store.",
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
          "name": "Provide/Inject for Nested Form Sections",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/provide-inject-for-nested-form-sections/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Share form state with nested Vue sections via provide and inject",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Provide an interface, not raw reactive state"
        },
        {
          "@type": "HowToStep",
          "name": "Type the key with InjectionKey"
        },
        {
          "@type": "HowToStep",
          "name": "Scope sections with a prefix"
        },
        {
          "@type": "HowToStep",
          "name": "Resolve paths in the field hook"
        },
        {
          "@type": "HowToStep",
          "name": "Register elements for focus"
        },
        {
          "@type": "HowToStep",
          "name": "Unregister on unmount"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is provide/inject \"implicit\" in a bad way?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is implicit compared with props, which is why it should carry a narrow, typed interface rather than arbitrary state. Used for one well-defined dependency — the enclosing form — it removes noise without hiding meaningful data flow."
          }
        },
        {
          "@type": "Question",
          "name": "Does provide/inject cause extra re-renders?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Injection itself is not reactive; what you inject may be. Because fields read their own path through computed refs, a change to one path triggers only the components that read it, in line with Vue's fine-grained reactivity."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test a section in isolation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Mount it with global.provide in Vue Test Utils, supplying a fake form context whose getValue/setValue are backed by a plain object. Assert that the section's fields read and write the expected prefixed paths."
          }
        }
      ]
    }
  ]
}
</script>

# Provide/Inject for Nested Form Sections

Large Vue forms are split into section components — address, payment, contacts — nested two or three levels deep, and teams end up either drilling `form`, `errors` and `touched` through every level as props, or moving the form into Pinia so any component can reach it, which leaks one form's state into global scope and breaks when the same form appears twice.

`provide`/`inject` sits between those extremes: the form component provides its state once, and any descendant can inject it, scoped to that form instance. The [Vue composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) topic defines the form composable; this page shows how to share it with nested sections safely, including sections that are reused under different path prefixes.

---

## Context and prerequisites

Three ways to get form state into a nested section:

- **Props** — explicit and traceable, but every intermediate component must forward values, errors and handlers, even ones that do not use them.
- **A global store (Pinia)** — reachable from anywhere, but one store instance per form type means two instances of the form share state, and the state outlives the form unless reset carefully. Pinia fits when state must survive navigation, as in [syncing Vue form state with Pinia](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/syncing-vue-form-state-with-pinia/).
- **Provide/inject** — scoped to the providing component's subtree, created and destroyed with the form, typed through an `InjectionKey`.

For most forms, provide/inject is the right default for *sharing within one form*.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards comparing props, a global Pinia store and provide/inject for sharing form state with nested section components." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three ways to reach a nested section</title>
  <desc>Props are explicit but require every intermediate component to forward form values, errors and handlers. A global Pinia store is reachable anywhere but shares state between two instances of the same form and outlives the form unless reset. Provide and inject is scoped to the providing form&#x27;s subtree, is created and destroyed with the form, and is typed through an InjectionKey.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Props</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Explicit, traceable.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Every level forwards everything.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Global store</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Reachable anywhere.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Two instances share state; outlives the</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">form.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Provide / inject</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Scoped to this form&#x27;s subtree.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Lives and dies with the form.</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Typed via InjectionKey.</text>
</svg>

---

## The core pattern: a typed form context and prefixed section scopes

```typescript
// form-context.ts
import { inject, provide, type InjectionKey, type Ref } from "vue";

export interface FormContext {
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  error(path: string): Ref<string | undefined>;           // computed per path
  blur(path: string): void;
  register(path: string, el: () => HTMLElement | null): () => void;   // for focus-on-error
}

const FormKey: InjectionKey<FormContext> = Symbol("form");
const PrefixKey: InjectionKey<string> = Symbol("form-prefix");

export function provideForm(ctx: FormContext) {
  provide(FormKey, ctx);
  provide(PrefixKey, "");
}

// A section scopes its descendants under a path prefix: "shipping." or "billing."
export function provideSection(name: string) {
  const parent = inject(PrefixKey, "");
  provide(PrefixKey, parent ? `${parent}${name}.` : `${name}.`);
}

// Fields call this; they never see the prefix logic.
export function useFormField(name: string) {
  const form = inject(FormKey);
  if (!form) throw new Error(`useFormField("${name}") used outside a form`);
  const path = inject(PrefixKey, "") + name;
  return {
    path,
    get value() { return form.getValue(path); },
    set value(v: unknown) { form.setValue(path, v); },
    error: form.error(path),
    blur: () => form.blur(path),
    register: (el: () => HTMLElement | null) => form.register(path, el),
  };
}
```

```html
<!-- AddressSection.vue — reusable for shipping and billing -->
<script setup lang="ts">
import { provideSection } from "./form-context";
const props = defineProps<{ name: "shipping" | "billing"; legend: string }>();
provideSection(props.name);   // every field below resolves to "shipping.street" etc.
</script>
<template>
  <fieldset>
    <legend>{{ legend }}</legend>
    <FormTextField name="street" label="Street" autocomplete="street-address" />
    <FormTextField name="city" label="Town or city" autocomplete="address-level2" />
    <FormTextField name="postcode" label="Postcode" autocomplete="postal-code" />
  </fieldset>
</template>
```

```html
<!-- Checkout.vue -->
<AddressSection name="shipping" legend="Shipping address" />
<AddressSection name="billing" legend="Billing address" />
```

---

## Step-by-step walkthrough

1. **Provide an interface, not raw reactive state.** Exposing `getValue`/`setValue`/`error(path)` instead of the whole reactive object keeps descendants from mutating state in ways the form does not see, and lets the form change its internals freely.
2. **Type the key with `InjectionKey<T>`.** `inject(FormKey)` is then typed, and a missing provider is detectable (it returns `undefined`).
3. **Scope sections with a prefix.** A section provides a new prefix that its fields inherit, so the same `AddressSection` works under `shipping.` and `billing.` without knowing where it lives.
4. **Resolve paths in the field hook.** Fields pass a local name; `useFormField` joins it with the inherited prefix. Error paths from the schema (`shipping.postcode`) match without mapping, as in [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/).
5. **Register elements for focus.** Each field registers a getter for its input; the form can then move focus to the first invalid path in document order after submit, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).
6. **Unregister on unmount.** `register` returns an unregister function; call it in `onBeforeUnmount` so conditional sections do not leave stale focus targets.

<svg viewBox="0 0 680 269" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow from the checkout form providing the form context and an empty prefix, through an address section providing the shipping prefix, to a field calling useFormField with the local name postcode and resolving the full path shipping.postcode." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>How a nested field resolves its path</title>
  <desc>The checkout form calls provideForm, which provides the form context and an empty prefix. The shipping AddressSection calls provideSection with shipping, injecting the empty parent prefix and providing shipping dot. The postcode field calls useFormField with postcode, injects the form context and the shipping prefix, and resolves the full path shipping.postcode, which is the same path the schema uses for its errors.</desc>
  <rect x="0" y="0" width="680" height="269" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="343.9" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Checkout provides</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">FormKey → context</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">PrefixKey → &quot;&quot;</text>
  <text x="387.9" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One context per form instance.</text>
  <path d="M185.9,83.0 V103.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="181.9,103.0 185.9,110.0 189.9,103.0" fill="#7b4f8a"/>
  <rect x="14.0" y="111.0" width="343.9" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="134.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">AddressSection provides</text>
  <text x="26.0" y="153.0" font-size="9.5" fill="#6b5f75" font-family="inherit">PrefixKey → &quot;shipping.&quot;</text>
  <text x="387.9" y="133.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Inherits the parent prefix and extends it.</text>
  <path d="M185.9,168.0 V188.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="181.9,188.0 185.9,195.0 189.9,188.0" fill="#7b4f8a"/>
  <rect x="14.0" y="196.0" width="343.9" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="219.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Field injects</text>
  <text x="26.0" y="238.0" font-size="9.5" fill="#6b5f75" font-family="inherit">useFormField(&quot;postcode&quot;)</text>
  <text x="387.9" y="218.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Resolves to &quot;shipping.postcode&quot; — the schema&#x27;s error path.</text>
</svg>

### Section-level state: validity and dirtiness per section

Sections are also a natural unit for summaries. A long checkout benefits from showing "Shipping address — 1 problem" in a sidebar or accordion header, and a wizard needs to know whether a section is complete before moving on. Because every field under a section resolves to the section's prefix, the form can answer these questions by filtering its error and dirty maps by prefix: `errors` whose path starts with `shipping.` belong to the shipping section. Expose a small `useSectionStatus()` helper that injects the prefix and returns computed counts, rather than having sections track their own children.

This keeps the form as the single owner of state. Sections become pure views over a slice of it, which is what lets the same `AddressSection` appear twice on a page — once for shipping, once for billing — with independent statuses and no state of its own to reset. It also means a section that unmounts, such as a collapsed optional block, cannot take its errors with it by accident; they stay in the form until the relevance rules say otherwise.

---

## Failure modes and edge cases

### 1. Injecting outside a provider

A field rendered outside any form (in a storybook, or a component reused elsewhere) gets `undefined`. Throw a clear error, or provide a default no-op context in isolation environments.

### 2. Providing reactive state directly

`provide("form", reactive(values))` lets any descendant write `form.city = "x"` and bypass validation, dirty tracking and change events. Provide functions; if you must provide state, wrap it with `readonly()`.

### 3. Reactivity loss from destructuring

Destructuring a reactive object returned from `inject` breaks reactivity. The pattern above returns getters and computed refs; if you return plain objects, use `toRefs` before destructuring.

### 4. Two forms on one page

Each form component provides its own context, so nested fields bind to their nearest form. This is exactly what a global store gets wrong; confirm it with two instances of the same form side by side.

### 5. Sections that move between forms

A section in a modal teleported to `body` still injects from its *component* ancestors, not its DOM position, so it keeps working with `Teleport`. It stops working if the modal is mounted by a separate app instance.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of symptoms when using provide and inject for forms, with the cause and the fix." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Troubleshooting injected form state</title>
  <desc>A field that throws used outside a form is missing a provider; wrap it or provide a default context in isolated environments. A field that does not update after inject lost reactivity through destructuring; use computed refs or toRefs. Two forms that share values are using a global store instead of provide; move the state into the form&#x27;s provide. Errors that do not appear on nested fields have mismatched paths; resolve paths with the section prefix.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Symptom</text>
  <text x="236.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cause</text>
  <text x="448.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Fix</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;used outside a form&quot; error</text>
  <text x="236.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">no provider above</text>
  <text x="448.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">wrap in a form; default in stories</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">field does not update</text>
  <text x="236.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">destructured reactive</text>
  <text x="448.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">computed refs / toRefs</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">two forms share values</text>
  <text x="236.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">global store</text>
  <text x="448.6" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">provide per form instance</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">nested errors never show</text>
  <text x="236.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">path mismatch</text>
  <text x="448.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">resolve with the section prefix</text>
</svg>

---

## Verification checklist

- [ ] No intermediate component forwards form props it does not use.
- [ ] The same section component works under two different prefixes on one page.
- [ ] Two instances of the same form keep independent values and errors.
- [ ] Schema error paths match resolved field paths without manual mapping.
- [ ] Focus-on-error reaches fields inside nested sections, in document order.
- [ ] Unmounted conditional sections unregister their fields.
- [ ] Descendants cannot mutate form state except through the provided functions.

---

## Frequently Asked Questions

<details>
<summary><strong>Is provide/inject "implicit" in a bad way?</strong></summary>

It is implicit compared with props, which is why it should carry a narrow, typed interface rather than arbitrary state. Used for one well-defined dependency — the enclosing form — it removes noise without hiding meaningful data flow.

</details>

<details>
<summary><strong>Does provide/inject cause extra re-renders?</strong></summary>

No. Injection itself is not reactive; what you inject may be. Because fields read their own path through computed refs, a change to one path triggers only the components that read it, in line with Vue's fine-grained reactivity.

</details>

<details>
<summary><strong>How do I test a section in isolation?</strong></summary>

Mount it with `global.provide` in Vue Test Utils, supplying a fake form context whose `getValue`/`setValue` are backed by a plain object. Assert that the section's fields read and write the expected prefixed paths.

</details>

---

## Related

- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
- [Custom Form Inputs With defineModel in Vue 3.4+](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/custom-form-inputs-with-definemodel/)
- [Splitting Form Context to Stop Cascading Re-Renders](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/splitting-form-context-to-stop-cascading-renders/)

← [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
