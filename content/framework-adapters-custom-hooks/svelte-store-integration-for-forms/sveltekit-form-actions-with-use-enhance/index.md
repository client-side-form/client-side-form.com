---
layout: page.njk
title: "SvelteKit Form Actions With use:enhance"
description: "Server-validated SvelteKit forms that work without JavaScript and upgrade with use:enhance: returning fail() with field errors and values, customising the enhance callback for pending state and focus, and avoiding the reset and invalidation surprises."
slug: sveltekit-form-actions-with-use-enhance
type: howto
breadcrumb: "Form Actions & use:enhance"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "SvelteKit Form Actions With use:enhance"
  parent: "Svelte Store Integration for Forms"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "SvelteKit Form Actions With use:enhance",
      "description": "Server-validated SvelteKit forms that work without JavaScript and upgrade with use:enhance: returning fail() with field errors and values, customising the enhance callback for pending state and focus, and avoiding the reset and invalidation surprises.",
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
          "name": "SvelteKit Form Actions With use:enhance",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/sveltekit-form-actions-with-use-enhance/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a SvelteKit form action with progressive enhancement",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Validate in the action with a schema"
        },
        {
          "@type": "HowToStep",
          "name": "Return fail(400, { errors, values })"
        },
        {
          "@type": "HowToStep",
          "name": "Render inputs from form?.values"
        },
        {
          "@type": "HowToStep",
          "name": "Customise use:enhance"
        },
        {
          "@type": "HowToStep",
          "name": "Move focus after a failure"
        },
        {
          "@type": "HowToStep",
          "name": "Redirect on success with 303"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why 303 for the redirect after a successful action?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "303 See Other tells the browser to follow with a GET, so reloading the destination page does not re-POST the form. SvelteKit's redirect defaults are designed around this; use 303 for post-action redirects."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use named actions for multiple forms on one page?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Export actions = { create, delete } and point each form at ?/create or ?/delete. The returned form prop is shared, so include which action produced the result (for example an action: \"create\" field) so each form renders only its own errors."
          }
        },
        {
          "@type": "Question",
          "name": "Does use:enhance work with Svelte 4 syntax?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes; the action API is the same. The example uses Svelte 5 runes ($props, $state, $derived) for component state, but export let form and let pending = false work identically in Svelte 4."
          }
        }
      ]
    }
  ]
}
</script>

# SvelteKit Form Actions With use:enhance

SvelteKit form actions give you forms that work before JavaScript loads and upgrade to in-place updates after — but the default `use:enhance` behaviour surprises people twice: a successful submit resets the form, and a failed one leaves focus wherever it was with no announcement, so keyboard and screen-reader users do not learn that anything went wrong.

This page builds a form action that returns field errors and submitted values with `fail()`, and a customised `use:enhance` callback that manages pending state, focus and announcements. It is the SvelteKit counterpart to the store-based patterns in [Svelte store integration for forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/), and follows the same principle as [progressive enhancement for server-rendered forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/progressive-enhancement-for-server-rendered-forms/): start from a form that posts and reloads, then intercept it.

---

## Context and prerequisites

How the pieces fit:

- **Actions** live in `+page.server.ts` as `export const actions = { default: async ({ request }) => … }`. They receive the `FormData` of a normal HTML `POST`.
- **`fail(status, data)`** returns a non-2xx result whose `data` becomes the page's `form` prop. Returning an object from a successful action does the same with a 2xx.
- **Without JavaScript**, the browser posts, SvelteKit runs the action and renders the page with `form` populated. Errors display on a full reload.
- **With `use:enhance`**, SvelteKit intercepts submit, posts with `fetch`, updates `form` and `page.status`, and by default resets the form on success and re-runs `load` functions (invalidation).

The customisation hook is the function you pass to `use:enhance`: it runs before submit and returns a callback that receives the result, where you decide whether to call the default `update()` and with which options.

<svg viewBox="0 0 680 227" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a form submit to a SvelteKit action returning fail with field errors, showing the full-reload path without JavaScript and the enhanced fetch path with JavaScript, both ending with the form prop populated." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One submit, with and without JavaScript</title>
  <desc>Without JavaScript, the browser posts the form, the action validates and returns fail 400 with errors and values, and SvelteKit renders a full page with the form prop populated. With use:enhance, the submit is intercepted and sent with fetch; the action returns the same fail result; the enhance callback receives it, updates the form prop without a reload, keeps the typed values, moves focus to the error summary and announces the problem count.</desc>
  <rect x="0" y="0" width="680" height="227" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Browser</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">SvelteKit client</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Action</text>
  <path d="M122.7,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">no JS: POST, full reload with form prop</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">JS: submit intercepted by use:enhance</text>
  <path d="M122.7,97.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,93.0 339.0,97.0 332.0,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">fetch POST (FormData)</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">fail(400, { errors, values })</text>
  <path d="M557.3,153.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">update form prop; focus summary;</text>
  <text x="130.7" y="189.0" font-size="9.5" fill="#2d6342" font-family="inherit">announce</text>
  <path d="M340.0,193.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,189.0 123.7,193.0 130.7,197.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: an action returning errors and values, and a custom enhance

```typescript
// src/routes/signup/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import type { Actions } from "./$types";

const Signup = z.object({
  email: z.string().trim().email("Enter an email like name@example.com."),
  name: z.string().trim().min(1, "Enter your name."),
});

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const values = { email: String(formData.get("email") ?? ""), name: String(formData.get("name") ?? "") };
    const parsed = Signup.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
      // Never echo secrets back (passwords, card numbers): omit them from values.
      return fail(400, { errors, values });
    }
    await createAccount(parsed.data);
    redirect(303, "/welcome");
  },
};
declare function createAccount(d: z.infer<typeof Signup>): Promise<void>;
```

```html
<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import { tick } from "svelte";
  let { form } = $props();            // populated by the action result
  let pending = $state(false);
  let summary: HTMLElement | undefined = $state();

  const errors = $derived(form?.errors ?? {});
  const count = $derived(Object.keys(errors).length);

  function submitEnhance() {
    pending = true;
    return async ({ result, update }) => {
      // reset: false keeps what the user typed on success paths that stay on the page.
      await update({ reset: false });
      pending = false;
      if (result.type === "failure") {
        await tick();                 // wait for the summary to render
        summary?.focus();
      }
    };
  }
</script>

<form method="POST" use:enhance={submitEnhance} novalidate>
  {#if count}
    <div bind:this={summary} tabindex="-1" role="group" aria-labelledby="summary-title" class="error-summary">
      <h2 id="summary-title">There {count === 1 ? "is 1 problem" : `are ${count} problems`}</h2>
      <ul>{#each Object.entries(errors) as [field, msg]}<li><a href={`#${field}`}>{msg}</a></li>{/each}</ul>
    </div>
  {/if}
  <label for="name">Name</label>
  <input id="name" name="name" value={form?.values?.name ?? ""} aria-invalid={errors.name ? "true" : undefined}
    aria-describedby={errors.name ? "name-error" : undefined} autocomplete="name" />
  {#if errors.name}<p id="name-error">{errors.name}</p>{/if}
  <label for="email">Email</label>
  <input id="email" name="email" type="email" value={form?.values?.email ?? ""} aria-invalid={errors.email ? "true" : undefined}
    aria-describedby={errors.email ? "email-error" : undefined} autocomplete="email" />
  {#if errors.email}<p id="email-error">{errors.email}</p>{/if}
  <button aria-disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
</form>
```

---

## Step-by-step walkthrough

1. **Validate in the action with a schema.** The action is the authority; it runs whether or not JavaScript loaded.
2. **Return `fail(400, { errors, values })`.** Errors keyed by field name, and the submitted values (minus secrets) so the page can re-populate inputs on both the no-JS and enhanced paths.
3. **Render inputs from `form?.values`.** Using `value={form?.values?.email ?? ""}` makes the no-JS reload show what the user typed.
4. **Customise `use:enhance`.** Set `pending` before submit, call `update({ reset: false })` in the callback, and clear `pending` after.
5. **Move focus after a failure.** Wait for the DOM with `tick()`, then focus the error summary, whose links jump to each field — the pattern in [building an accessible error summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/).
6. **Redirect on success with 303.** A redirect after POST prevents resubmission on reload; with `use:enhance`, SvelteKit follows it client-side.

### Why the no-JavaScript path still matters

It is tempting to treat the non-enhanced path as a legacy fallback. In practice it runs more often than expected: while the page is still hydrating on a slow phone, when a script fails to load behind a corporate proxy, when a browser extension throws during startup, and for every user who submits within the first second of a server-rendered page appearing. Designing the action so that the full-reload response is complete — errors, values, summary — means those users get a working form instead of a form that silently does nothing. It also makes the action easy to test with a plain HTTP request, independent of any client code.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the default behaviours of SvelteKit&#x27;s use:enhance — resetting the form, invalidating load data, applying the result and focus handling — with when to keep or override each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>use:enhance defaults and when to override them</title>
  <desc>By default use:enhance resets the form after a successful result; override with reset false when the user stays on the page to keep editing. It invalidates and reruns load functions after success; keep it when the page shows data the action changed, and skip it when nothing else depends on the action. It applies the result to the form prop; keep it. It does not move focus after a failure; add focus management yourself.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Default behaviour</text>
  <text x="221.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Keep when</text>
  <text x="448.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Override when</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">reset form on success</text>
  <text x="221.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">the form is for creating new items</text>
  <text x="448.6" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">editing continues on the page</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">invalidate load data</text>
  <text x="221.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">the page shows changed data</text>
  <text x="448.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing else depends on it</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">apply result to form prop</text>
  <text x="221.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">always</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">focus after failure</text>
  <text x="448.6" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">not handled: add it yourself</text>
</svg>

---

## Failure modes and edge cases

### 1. Inputs cleared after a successful save on an edit page

On success, `update()` resets the form, which restores each input's `defaultValue` — the value it had at server render, not the saved one. Use `update({ reset: false })` on edit forms, or re-render with the saved values returned from the action.

### 2. Echoing passwords in `values`

Returning the whole `FormData` as `values` puts passwords and card numbers into the rendered HTML on the no-JS path and into client state. Build `values` from an allow-list of safe fields.

### 3. Double submission

Buttons remain clickable during the request. Guard in the enhance function (`if (pending) return cancel()` using the `cancel` argument it receives) and make the action idempotent, per [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

### 4. Client-side validation on top

For instant feedback, add a client schema check on blur; keep the action as the authority. Libraries such as Superforms automate the sharing, covered in [validating SvelteKit forms with Superforms and Zod](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/validating-sveltekit-forms-with-superforms-and-zod/).

### 5. Files and large bodies

File inputs require `enctype="multipart/form-data"`; SvelteKit parses them into `File` objects in `request.formData()`. Server body limits (the adapter's `BODY_SIZE_LIMIT`) apply, and exceeding them fails before your action runs — validate size on the client too.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing what users experience when submitting before hydration, after hydration with default enhance, and after hydration with the customised enhance." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the user experiences on each path</title>
  <desc>Before hydration the form posts and reloads, and the page shows the summary and field errors with values preserved, with focus at the top of the page. After hydration with default enhance the page updates in place without moving focus, so keyboard and screen-reader users may not notice the errors. After hydration with the customised enhance the page updates in place, keeps values, focuses the error summary and announces the problem count.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Before hydration</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">POST + reload.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Summary and values shown.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus at page top.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Default use:enhance</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">In-place update.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus unchanged; errors easy to miss.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Custom enhance</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">In-place update.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Values kept; summary focused.</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Problem count announced.</text>
</svg>

---

## Verification checklist

- [ ] With JavaScript disabled, submitting invalid data shows errors and keeps the typed values.
- [ ] With JavaScript, invalid submits update in place and move focus to the error summary.
- [ ] Summary links move focus to the matching inputs.
- [ ] Edit forms keep their values after a successful save.
- [ ] Passwords and other secrets are never echoed back in `values`.
- [ ] Rapid double clicks send one request.
- [ ] Success redirects with 303 and a reload does not resubmit.

---

## Frequently Asked Questions

<details>
<summary><strong>Why 303 for the redirect after a successful action?</strong></summary>

303 See Other tells the browser to follow with a GET, so reloading the destination page does not re-POST the form. SvelteKit's `redirect` defaults are designed around this; use 303 for post-action redirects.

</details>

<details>
<summary><strong>Can I use named actions for multiple forms on one page?</strong></summary>

Yes. Export `actions = { create, delete }` and point each form at `?/create` or `?/delete`. The returned `form` prop is shared, so include which action produced the result (for example an `action: "create"` field) so each form renders only its own errors.

</details>

<details>
<summary><strong>Does use:enhance work with Svelte 4 syntax?</strong></summary>

Yes; the action API is the same. The example uses Svelte 5 runes (`$props`, `$state`, `$derived`) for component state, but `export let form` and `let pending = false` work identically in Svelte 4.

</details>

---

## Related

- [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
- [Handling Svelte Form Hydration Mismatches](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/handling-svelte-form-hydration-mismatches/)
- [Svelte 5 Runes Migration for Form Stores](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/svelte-5-runes-migration-for-form-stores/)

← [Svelte Store Integration for Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/)
