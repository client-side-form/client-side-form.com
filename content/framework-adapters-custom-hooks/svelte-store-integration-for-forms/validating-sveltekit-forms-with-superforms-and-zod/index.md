---
layout: page.njk
title: "Validating SvelteKit Forms With Superforms and Zod"
description: "Use Superforms to share one Zod schema between a SvelteKit action and the browser: superValidate on the server, the superForm client store for errors and constraints, client-side validation timing, tainted-field navigation guards, and nested data."
slug: validating-sveltekit-forms-with-superforms-and-zod
type: howto
breadcrumb: "Superforms + Zod"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validating SvelteKit Forms With Superforms and Zod"
  parent: "Svelte Store Integration for Forms"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating SvelteKit Forms With Superforms and Zod",
      "description": "Use Superforms to share one Zod schema between a SvelteKit action and the browser: superValidate on the server, the superForm client store for errors and constraints, client-side validation timing, tainted-field navigation guards, and nested data.",
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
          "name": "Validating SvelteKit Forms With Superforms and Zod",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/validating-sveltekit-forms-with-superforms-and-zod/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate a SvelteKit form with Superforms and a shared Zod schema",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Put the schema in $lib"
        },
        {
          "@type": "HowToStep",
          "name": "Load with superValidate(data, adapter)"
        },
        {
          "@type": "HowToStep",
          "name": "Validate in the action with superValidate(request, adapter)"
        },
        {
          "@type": "HowToStep",
          "name": "Add server-only rules with setError"
        },
        {
          "@type": "HowToStep",
          "name": "Configure client validation timing"
        },
        {
          "@type": "HowToStep",
          "name": "Spread $constraints onto inputs"
        },
        {
          "@type": "HowToStep",
          "name": "Use taintedMessage for the unsaved-changes guard"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need Superforms if I already use form actions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Actions plus a schema work well for small forms. Superforms pays off when you have many forms, want client validation from the same schema, need typed coercion of FormData, or want built-in tainted tracking and constraints."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use Valibot or another library instead of Zod?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Superforms ships adapters for several validation libraries; replace zod/zodClient with the matching adapter. The rest of the page is unchanged, which is the benefit of keeping validation behind an adapter."
          }
        },
        {
          "@type": "Question",
          "name": "Where should async checks like \"username available\" run?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As server-only rules in the action for the authoritative check, and optionally as a debounced client request for early feedback, following implementing async email availability checks. Avoid async refinements in the shared schema, which would run the network check during every client validation."
          }
        }
      ]
    }
  ]
}
</script>

# Validating SvelteKit Forms With Superforms and Zod

Hand-written SvelteKit actions repeat the same plumbing on every form — parse `FormData`, coerce types, validate, collect errors by field, echo values, mirror constraints into the markup, repeat the rules on the client — and every copy drifts slightly from the others.

Superforms packages that plumbing around a single schema. The server calls `superValidate(request, adapter(schema))`; the page gets a `superForm` store that knows the values, errors, constraints, submitting state and which fields the user has changed. This page wires it with Zod, configures client validation to match good error timing, and covers the parts that still need decisions: nested data, dirty-state navigation guards and server-only rules. It builds on [SvelteKit form actions with use:enhance](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/sveltekit-form-actions-with-use-enhance/) inside [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/).

---

## Context and prerequisites

What Superforms gives you on each side:

- **Server:** `superValidate(request, zod(schema))` parses and coerces `FormData` using the schema's types (numbers, booleans, dates), validates, and returns a `form` object with `valid`, `data`, `errors` and `constraints`. Return it with `fail(400, { form })` on error; `message(form, …)` and `setError(form, "field", …)` add server messages.
- **Client:** `superForm(data.form, options)` returns stores — `$form` (values), `$errors`, `$constraints`, `$submitting`, `$tainted` — and an `enhance` action that wraps SvelteKit's.
- **Constraints:** derived from the schema (`required`, `minlength`, `pattern`, `min`, `max`) and spread onto inputs, so the browser's native validity and required state match the schema.

The schema is the contract; everything else is derived from it.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing a single Zod schema feeding server validation, generated HTML constraints, client-side validation and TypeScript types." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One schema, four consumers</title>
  <desc>The Zod schema is defined once. superValidate uses it on the server to parse and validate the posted FormData. Superforms derives HTML constraints such as required and minlength from it and spreads them onto inputs. The client superForm store can run the same schema for instant feedback. TypeScript types for the form data are inferred from it for both server and page.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Zod schema</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Defined once.</text>
  <path d="M156.0,47.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,43.5 183.0,47.5 176.0,51.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Server</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">superValidate parses and</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">validates FormData.</text>
  <path d="M326.0,47.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,43.5 353.0,47.5 346.0,51.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Markup</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">$constraints: required,</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">minlength, pattern.</text>
  <path d="M496.0,47.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,43.5 523.0,47.5 516.0,51.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Client</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same schema for instant</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">feedback; inferred types.</text>
</svg>

---

## The core pattern: superValidate on the server, superForm on the page

```typescript
// src/lib/schemas/profile.ts
import { z } from "zod";
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters."),
  email: z.string().trim().email("Enter an email like name@example.com."),
  age: z.number().int().min(16, "You must be 16 or over.").optional(),
  newsletter: z.boolean().default(false),
});
```

```typescript
// src/routes/profile/+page.server.ts
import { fail } from "@sveltejs/kit";
import { superValidate, message, setError } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { profileSchema } from "$lib/schemas/profile";

export const load = async ({ locals }) => {
  // Populate from the current record; superValidate with data does not show errors on load.
  const form = await superValidate(await getProfile(locals.user.id), zod(profileSchema));
  return { form };
};

export const actions = {
  default: async ({ request, locals }) => {
    const form = await superValidate(request, zod(profileSchema));
    if (!form.valid) return fail(400, { form });
    // Server-only rule: the schema cannot know whether the email is taken.
    if (await emailTakenByOther(form.data.email, locals.user.id)) {
      return setError(form, "email", "That email is used by another account.");
    }
    await saveProfile(locals.user.id, form.data);
    return message(form, "Profile saved.");
  },
};
declare function getProfile(id: string): Promise<Record<string, unknown>>;
declare function emailTakenByOther(e: string, id: string): Promise<boolean>;
declare function saveProfile(id: string, d: unknown): Promise<void>;
```

```html
<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import { zodClient } from "sveltekit-superforms/adapters";
  import { profileSchema } from "$lib/schemas/profile";
  let { data } = $props();
  const { form, errors, constraints, message, submitting, enhance } = superForm(data.form, {
    validators: zodClient(profileSchema),  // client-side validation with the same schema
    validationMethod: "onblur",             // first errors on blur…
    taintedMessage: "You have unsaved changes. Leave anyway?",
    resetForm: false,                       // edit form: keep values after save
  });
</script>

<form method="POST" use:enhance novalidate>
  <label for="name">Name</label>
  <input id="name" name="name" bind:value={$form.name} {...$constraints.name}
    aria-invalid={$errors.name ? "true" : undefined} aria-describedby={$errors.name ? "name-error" : undefined} />
  {#if $errors.name}<p id="name-error">{$errors.name[0]}</p>{/if}
  <!-- email and age follow the same pattern -->
  <button aria-disabled={$submitting}>{$submitting ? "Saving…" : "Save"}</button>
  {#if $message}<p role="status">{$message}</p>{/if}
</form>
```

---

## Step-by-step walkthrough

1. **Put the schema in `$lib`.** Server and page import the same module; nothing is copied.
2. **Load with `superValidate(data, adapter)`.** Passing existing data populates the form without reporting errors on first render.
3. **Validate in the action with `superValidate(request, adapter)`.** It coerces `FormData` strings into the schema's types, so `age` arrives as a number and `newsletter` as a boolean.
4. **Add server-only rules with `setError`.** Uniqueness, permissions and anything needing the database stay on the server and land on the right field — the same idea as [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).
5. **Configure client validation timing.** `validators` enables it; `validationMethod: "onblur"` shows first errors on blur, while fields with errors re-validate as they change — matching [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/).
6. **Spread `$constraints` onto inputs.** The browser gets `required`, `minlength` and friends, and assistive technology announces required fields.
7. **Use `taintedMessage` for the unsaved-changes guard.** Superforms tracks which fields the user changed and prompts on navigation, as in [warning before leaving a form with unsaved changes](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/warning-before-leaving-a-form-with-unsaved-changes/).

### What the library decides for you, and what it does not

Superforms makes firm decisions about data flow: the server is authoritative, the client store mirrors the returned form object, and errors are arrays of strings per path. Those decisions are sound and save a great deal of code. It does not decide your error presentation — whether there is a summary, where focus goes after a failed submit, how messages are worded, or how errors are announced. Those remain yours, and the accessibility behaviour of a Superforms form is only as good as the markup you render from its stores.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the main Superforms client stores and the markup or behaviour each should drive." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Superforms stores and what to bind them to</title>
  <desc>The form store holds values and is bound to inputs with bind:value. The errors store holds arrays of messages per field and drives the error paragraphs, aria-invalid and aria-describedby. The constraints store holds HTML validation attributes derived from the schema and is spread onto inputs. The tainted store records user-changed fields and drives the unsaved-changes prompt. The submitting store drives the pending label on the button. The message store holds a form-level success or failure message shown in a status or alert region.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Store</text>
  <text x="163.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Holds</text>
  <text x="396.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Bind to</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">$form</text>
  <text x="163.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">values</text>
  <text x="396.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">bind:value on inputs</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">$errors</text>
  <text x="163.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">string[] per path</text>
  <text x="396.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">error text, aria-invalid, aria-describedby</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">$constraints</text>
  <text x="163.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">required, minlength…</text>
  <text x="396.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">spread onto inputs</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">$tainted</text>
  <text x="163.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">changed fields</text>
  <text x="396.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">unsaved-changes prompt</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">$submitting</text>
  <text x="163.7" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">boolean</text>
  <text x="396.6" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">button label, aria-disabled</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">$message</text>
  <text x="163.7" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">form-level message</text>
  <text x="396.6" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">role=status or role=alert</text>
</svg>

---

## Failure modes and edge cases

### 1. Nested objects and arrays without `dataType: "json"`

HTML forms post flat key/value pairs. For nested objects or arrays, set `dataType: "json"` in `superForm` options; Superforms then posts the data as JSON instead of relying on field names. This requires JavaScript — for no-JS support, keep the schema flat.

### 2. Optional numbers from empty inputs

An empty number input posts `""`. Superforms treats it according to the schema's optionality and defaults; check that an empty optional `age` becomes `undefined` rather than `0` in your version and schema, and use `.optional()` or `.nullable()` explicitly.

### 3. Errors shown on load

Calling `superValidate(request, …)` in `load` (instead of with data) validates an empty form and shows errors immediately. Load with data, or with nothing, and validate only in actions.

### 4. Focus after failure

Superforms can scroll to the first error (`scrollToError`) and focus it (`autoFocusOnError`). Check both are on, and if you render an error summary, focus the summary instead so users hear how many problems there are.

### 5. Client and server messages disagree

Client validation uses the same schema, but server-only rules exist only on the server. Word them consistently and put them on fields, so the user sees the same style of message whichever side produced it.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a profile save where client validation passes, the server schema passes, the server-only uniqueness rule fails and setError returns the email error to the field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A save with a server-only rule failing</title>
  <desc>The user blurs through fields and client validation shows nothing because values are well formed. On submit, superValidate on the server also passes. The server-only check finds the email is used by another account and calls setError on the email field. The action returns a 400 with the form object, and the client store shows the message under the email field and focuses it.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Client validation passes</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Same schema, on blur.</text>
  <text x="466.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Values are well formed.</text>
  <path d="M225.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,89.0 225.0,96.0 229.0,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">superValidate passes</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Coerced, validated on the server.</text>
  <text x="466.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The schema agrees with the client.</text>
  <path d="M225.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,174.0 225.0,181.0 229.0,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Server-only rule fails</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">email used by another account</text>
  <text x="466.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setError(form, &quot;email&quot;, …) returns 400.</text>
  <path d="M225.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,259.0 225.0,266.0 229.0,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Error on the field</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">$errors.email updated.</text>
  <text x="466.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Shown under the input; focus moves to it.</text>
</svg>

---

## Verification checklist

- [ ] The schema is imported from one module by both server and page.
- [ ] Loading the page with existing data shows no errors.
- [ ] Posting without JavaScript shows errors and keeps values.
- [ ] Client validation shows first errors on blur and clears them as fields are fixed.
- [ ] Server-only rules land on the correct field via `setError`.
- [ ] `$constraints` spread onto inputs, and required fields are announced as required.
- [ ] Navigating away with unsaved changes prompts once.
- [ ] Nested data uses `dataType: "json"` or the schema is kept flat.

---

## Frequently Asked Questions

<details>
<summary><strong>Do I need Superforms if I already use form actions?</strong></summary>

No. Actions plus a schema work well for small forms. Superforms pays off when you have many forms, want client validation from the same schema, need typed coercion of `FormData`, or want built-in tainted tracking and constraints.

</details>

<details>
<summary><strong>Can I use Valibot or another library instead of Zod?</strong></summary>

Yes. Superforms ships adapters for several validation libraries; replace `zod`/`zodClient` with the matching adapter. The rest of the page is unchanged, which is the benefit of keeping validation behind an adapter.

</details>

<details>
<summary><strong>Where should async checks like "username available" run?</strong></summary>

As server-only rules in the action for the authoritative check, and optionally as a debounced client request for early feedback, following [implementing async email availability checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/). Avoid async refinements in the shared schema, which would run the network check during every client validation.

</details>

---

## Related

- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Deriving Validation State From Svelte Stores](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/deriving-validation-state-from-svelte-stores/)
- [Sharing One Zod Schema Between Client and Server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/)

← [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
