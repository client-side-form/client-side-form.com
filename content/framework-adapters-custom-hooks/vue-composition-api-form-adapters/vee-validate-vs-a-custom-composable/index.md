---
layout: page.njk
title: "VeeValidate vs a Custom Composable"
description: "When VeeValidate earns its place in a Vue form and when a hundred-line composable is enough: a side-by-side of the same form in both, bundle and render costs, field arrays, schema integration, and the migration path between them."
slug: vee-validate-vs-a-custom-composable
type: howto
breadcrumb: "VeeValidate vs Composable"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "VeeValidate vs a Custom Composable"
  parent: "Vue Composition API Form Adapters"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "VeeValidate vs a Custom Composable",
      "description": "When VeeValidate earns its place in a Vue form and when a hundred-line composable is enough: a side-by-side of the same form in both, bundle and render costs, field arrays, schema integration, and the migration path between them.",
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
          "name": "VeeValidate vs a Custom Composable",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/vee-validate-vs-a-custom-composable/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Choose between VeeValidate and a custom Vue form composable",
      "step": [
        {
          "@type": "HowToStep",
          "name": "List the features the form needs today"
        },
        {
          "@type": "HowToStep",
          "name": "List the features the next three forms will need"
        },
        {
          "@type": "HowToStep",
          "name": "Prototype the hardest form both ways"
        },
        {
          "@type": "HowToStep",
          "name": "Measure render behaviour"
        },
        {
          "@type": "HowToStep",
          "name": "Keep the schema library-independent"
        },
        {
          "@type": "HowToStep",
          "name": "Wrap either behind your own field component"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is VeeValidate heavy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It adds a moderate amount to the bundle and tree-shakes the parts you do not import, plus the size of your schema library adapter. For an app with several non-trivial forms, it is small relative to the code it replaces. For a marketing site with one contact form, it is probably unnecessary."
          }
        },
        {
          "@type": "Question",
          "name": "What about FormKit or other Vue form libraries?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FormKit takes a different approach — schema-driven components that render inputs for you — which is attractive for form-heavy admin apps and constraining for bespoke designs. The same decision process applies: prototype your hardest form in it."
          }
        },
        {
          "@type": "Question",
          "name": "Can I start with a composable and adopt the library later?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, if templates talk to field components and composables expose a stable shape. Keep the composable's API close to useField (value, errorMessage, handleBlur) and the switch is mostly mechanical."
          }
        }
      ]
    }
  ]
}
</script>

# VeeValidate vs a Custom Composable

Vue teams tend to reach for VeeValidate by default, or to reject libraries on principle and hand-roll everything — and both choices go wrong in predictable ways: the library is adopted for a three-field login and fought over its conventions, or the composable grows field arrays, async cancellation and error mapping until it is a worse copy of the library.

The [Vue composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) topic defines what an adapter must do. This page compares the two ways of getting one — VeeValidate's `useForm`/`useField` and a small custom composable — on the same form, and names the features that should tip the decision.

---

## Context and prerequisites

VeeValidate v4 provides, via the composition API:

- **`useForm`** — form-level values, errors, `meta` (dirty, touched, valid, pending), `handleSubmit`, `resetForm`, `setFieldError`.
- **`useField` / `defineField`** — per-field value, errors, meta, and bindings for inputs or components.
- **`useFieldArray`** — repeatable groups with stable keys.
- **Schema integration** — `toTypedSchema` adapters for Zod, Yup and Valibot, plus Standard Schema support.
- **Async validation handling** — pending state and ordering of results.

A custom composable written for one app can do the subset it needs in 100–200 lines, with no conventions to learn. The question is which subset you need, now and in a year.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison table of form capabilities across VeeValidate and a custom composable, showing which are provided out of the box and which must be written." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The same capabilities, library versus composable</title>
  <desc>Per-field value, error and touched state are provided by VeeValidate and are simple to write in a composable. Schema integration is provided through typed schema adapters and is simple to write with safeParse. Field arrays with stable keys are provided by VeeValidate and are moderate work to write correctly. Async validation with pending state and stale result handling is provided and is moderate work to write. Nested object paths and array error mapping are provided and take real effort to write. Devtools integration is provided only by the library.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Capability</text>
  <text x="256.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">VeeValidate</text>
  <text x="443.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Custom composable</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">field value, error, touched</text>
  <text x="256.9" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">built in</text>
  <text x="443.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">simple</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">schema integration</text>
  <text x="256.9" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">toTypedSchema</text>
  <text x="443.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">simple with safeParse</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">field arrays, stable keys</text>
  <text x="256.9" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">useFieldArray</text>
  <text x="443.1" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">moderate; easy to get wrong</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">async rules, pending, stale results</text>
  <text x="256.9" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">built in</text>
  <text x="443.1" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">moderate</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">nested paths, array error mapping</text>
  <text x="256.9" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">built in</text>
  <text x="443.1" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">real effort</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">devtools inspector</text>
  <text x="256.9" y="209.0" font-size="9.5" fill="#2d6342" font-family="inherit">Vue devtools plugin</text>
  <text x="443.1" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">none</text>
</svg>

---

## The core pattern: the same form, two ways

```typescript
// Shared schema
import { z } from "zod";
export const Contact = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter an email like name@example.com."),
});
export type ContactValues = z.infer<typeof Contact>;
```

```typescript
// A) VeeValidate
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";

export function useContactFormVee() {
  const { defineField, errors, handleSubmit, meta } = useForm({
    validationSchema: toTypedSchema(Contact),
    initialValues: { name: "", email: "" },
  });
  const [name, nameAttrs] = defineField("name", { validateOnModelUpdate: false }); // validate on blur
  const [email, emailAttrs] = defineField("email", { validateOnModelUpdate: false });
  const onSubmit = handleSubmit(async (values) => { await save(values); });
  return { name, nameAttrs, email, emailAttrs, errors, meta, onSubmit };
}
```

```typescript
// B) Custom composable — the same behaviour, spelled out
import { computed, reactive } from "vue";

export function useContactForm() {
  const values = reactive<ContactValues>({ name: "", email: "" });
  const touched = reactive<Record<keyof ContactValues, boolean>>({ name: false, email: false });
  const submitted = reactive({ value: false });

  const parsed = computed(() => Contact.safeParse(values));
  const allErrors = computed(() => {
    const out: Partial<Record<keyof ContactValues, string>> = {};
    if (!parsed.value.success) for (const i of parsed.value.error.issues) out[i.path[0] as keyof ContactValues] ??= i.message;
    return out;
  });
  // Only reveal errors for touched fields or after submit (timing policy lives here).
  const errors = computed(() => {
    const out: Partial<Record<keyof ContactValues, string>> = {};
    for (const k of Object.keys(values) as (keyof ContactValues)[]) {
      if (touched[k] || submitted.value) out[k] = allErrors.value[k];
    }
    return out;
  });
  const blur = (k: keyof ContactValues) => { touched[k] = true; };
  async function onSubmit() {
    submitted.value = true;
    if (parsed.value.success) await save(parsed.value.data);
  }
  return { values, errors, blur, onSubmit };
}
declare function save(v: ContactValues): Promise<void>;
```

For this form, B is about as long as A plus its imports, has no dependency, and its behaviour is readable in one screen. Add three repeatable groups, a nested address and an async email check, and B roughly quadruples while A grows by a few lines.

---

## Step-by-step walkthrough

1. **List the features the form needs today.** Field count, repeatable groups, nested objects, async rules, server error mapping, multi-step.
2. **List the features the next three forms will need.** Library adoption is a codebase decision, not a per-form one; one complex form in the roadmap usually settles it.
3. **Prototype the hardest form both ways.** Not the login form. The one with field arrays and async checks will expose the true cost of the composable.
4. **Measure render behaviour.** Vue's fine-grained reactivity makes both approaches cheap per keystroke for normal forms; confirm with the Vue devtools timeline rather than assuming.
5. **Keep the schema library-independent.** Whichever you choose, a plain Zod (or Standard Schema) object can move between them, as in [standard schema for library-agnostic forms](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/).
6. **Wrap either behind your own field component.** Components like the one in [custom form inputs with defineModel](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/custom-form-inputs-with-definemodel/) take `v-model` and `error`, so switching engines later touches composables, not templates.

<svg viewBox="0 0 680 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for choosing VeeValidate or a custom composable based on field arrays, async validation, nested error paths and the number of forms." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Library or composable?</title>
  <desc>If the app has repeatable field groups, choose VeeValidate because stable keys and index-mapped errors are easy to get wrong by hand. If it has async validation that must handle pending and stale results, choose VeeValidate or plan real time for it. If there are nested objects whose errors must map to deep paths, choose the library. Otherwise, for a handful of flat forms, a custom composable is simpler to read and has no dependency.</desc>
  <rect x="0" y="0" width="680" height="308" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Repeatable field groups?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">VeeValidate</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Async rules with pending and stale results?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">VeeValidate, or budget real time</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Deeply nested error paths?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">VeeValidate</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Custom composable</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A few flat forms: less to learn, no dependency.</text>
</svg>

### The costs that do not show up in a prototype

Two costs are easy to miss when comparing a prototype. The first is **team knowledge**: a library brings documentation, a community and conventions that new team members may already know, while a composable's behaviour lives only in its source and in the heads of whoever wrote it. The second is **edge-case accretion**: a composable starts at a hundred lines, and every production bug — a stale async result, a reset that forgot touched flags, an array error on the wrong row — adds a special case. After a year, many hand-rolled form layers are a partial reimplementation of a library, without its tests.

The opposite cost is real too. A library's defaults encode someone else's UX decisions, and bending them to your error timing, your summary pattern or your server error model can take more code than writing the behaviour directly. The prototype of your hardest form is where you find out which cost is larger for your team.

---

## Failure modes and edge cases

### 1. Fighting the library's timing defaults

VeeValidate validates on model update by default, so errors appear as the user types. Configure `validateOnModelUpdate: false` (or the global `configure` options) to validate on blur, matching [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/).

### 2. A composable that recomputes everything

`computed(() => Schema.safeParse(values))` reparses the whole form on every change. That is fine for tens of fields; for hundreds, validate per field on blur and the whole form on submit.

### 3. Two sources of truth

Mixing VeeValidate fields with ad-hoc `reactive` state for some fields splits validity across two systems, so `meta.valid` lies. Either register every field with the library or keep the library out of that form.

### 4. Server errors

Both approaches need a path to put server errors onto fields: `setFieldError` in VeeValidate, a separate server-error map merged by precedence in the composable, as in [merging errors from client, schema and server validators](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/merging-errors-from-multiple-validation-sources/).

### 5. Migrating later

Moving from composable to library is easiest when templates use your own field components and composables return the same shape (`value`, `error`, `blur`). Moving the other way is rarely worth it.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart of the approximate lines of form-specific logic needed for a flat three-field form, a form with an async check, and a form with a field array and nested address, using a custom composable versus VeeValidate." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Lines of form logic as requirements grow</title>
  <desc>Rough orders of magnitude from building the same forms. A flat three-field form takes about 40 lines with a composable and about 25 with VeeValidate. Adding an async email check takes about 90 lines with a composable and about 35 with the library. Adding a field array and nested address takes about 220 lines with a composable and about 60 with the library.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="168.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">flat form: composable</text>
  <rect x="204.0" y="16.0" width="61.2" height="14" rx="3" fill="#2d6342"/>
  <text x="273.2" y="26.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">40 lines</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">flat form: VeeValidate</text>
  <rect x="204.0" y="42.0" width="38.3" height="14" rx="3" fill="#7b4f8a"/>
  <text x="250.3" y="52.5" font-size="9.5" font-weight="700" fill="#7b4f8a" font-family="inherit">25 lines</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">+ async check: composable</text>
  <rect x="204.0" y="68.0" width="137.7" height="14" rx="3" fill="#b07a55"/>
  <text x="349.7" y="78.5" font-size="9.5" font-weight="700" fill="#1e1a24" font-family="inherit">90 lines</text>
  <text x="20.0" y="103.5" font-size="10" fill="#1e1a24" font-family="inherit">+ async check: VeeValidate</text>
  <rect x="204.0" y="94.0" width="53.6" height="14" rx="3" fill="#7b4f8a"/>
  <text x="265.6" y="104.5" font-size="9.5" font-weight="700" fill="#7b4f8a" font-family="inherit">35 lines</text>
  <text x="20.0" y="129.5" font-size="10" fill="#1e1a24" font-family="inherit">+ array, nested: composable</text>
  <rect x="204.0" y="120.0" width="336.7" height="14" rx="3" fill="#a63d6f"/>
  <text x="548.7" y="130.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">220 lines</text>
  <text x="20.0" y="155.5" font-size="10" fill="#1e1a24" font-family="inherit">+ array, nested: VeeValidate</text>
  <rect x="204.0" y="146.0" width="91.8" height="14" rx="3" fill="#7b4f8a"/>
  <text x="303.8" y="156.5" font-size="9.5" font-weight="700" fill="#7b4f8a" font-family="inherit">60 lines</text>
  <text x="14.0" y="194.0" font-size="10" fill="#6b5f75" font-family="inherit">Orders of magnitude, not a benchmark: the gap grows with the features the library already implements.</text>
</svg>

---

## Verification checklist

- [ ] The decision is based on the most complex form planned, not the first one built.
- [ ] Error timing matches the site's policy (blur first, then live correction) in whichever approach is used.
- [ ] Every field in a form is managed by one system.
- [ ] Server errors reach fields and clear when fields change.
- [ ] Templates use shared field components that do not depend on the engine.
- [ ] The schema is plain and portable between engines.

---

## Frequently Asked Questions

<details>
<summary><strong>Is VeeValidate heavy?</strong></summary>

It adds a moderate amount to the bundle and tree-shakes the parts you do not import, plus the size of your schema library adapter. For an app with several non-trivial forms, it is small relative to the code it replaces. For a marketing site with one contact form, it is probably unnecessary.

</details>

<details>
<summary><strong>What about FormKit or other Vue form libraries?</strong></summary>

FormKit takes a different approach — schema-driven components that render inputs for you — which is attractive for form-heavy admin apps and constraining for bespoke designs. The same decision process applies: prototype your hardest form in it.

</details>

<details>
<summary><strong>Can I start with a composable and adopt the library later?</strong></summary>

Yes, if templates talk to field components and composables expose a stable shape. Keep the composable's API close to `useField` (`value`, `errorMessage`, `handleBlur`) and the switch is mostly mechanical.

</details>

---

## Related

- [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
- [Syncing Vue Form State With Pinia](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/syncing-vue-form-state-with-pinia/)
- [React Hook Form vs Custom Reducer Performance](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/react-hook-form-vs-custom-reducer-performance/)

← [Vue Composition API Form Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/)
