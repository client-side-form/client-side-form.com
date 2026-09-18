---
layout: page.njk
title: "Form Validation With React Router Actions"
description: "Validate forms in React Router (v7 / Remix) route actions: returning data() with field errors and status 400, reading actionData in the component, useNavigation for pending state, fetcher forms for inline edits, and revalidation after mutations."
slug: form-validation-with-react-router-actions
type: howto
breadcrumb: "React Router Actions"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Form Validation With React Router Actions"
  parent: "Hydration Sync for SSR Forms"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Form Validation With React Router Actions",
      "description": "Validate forms in React Router (v7 / Remix) route actions: returning data() with field errors and status 400, reading actionData in the component, useNavigation for pending state, fetcher forms for inline edits, and revalidation after mutations.",
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
          "name": "Form Validation With React Router Actions",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/form-validation-with-react-router-actions/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate forms with React Router route actions",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Validate in the action with a schema"
        },
        {
          "@type": "HowToStep",
          "name": "Return data(…, { status: 400 }) on failure"
        },
        {
          "@type": "HowToStep",
          "name": "Return the submitted values"
        },
        {
          "@type": "HowToStep",
          "name": "Redirect on success"
        },
        {
          "@type": "HowToStep",
          "name": "Derive pending UI from useNavigation"
        },
        {
          "@type": "HowToStep",
          "name": "Use useFetcher for non-navigating forms"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is this the same in Remix?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes in substance. Remix v2's json() helper became data() in React Router v7, and imports moved from @remix-run/* to react-router, but actions, useActionData, useNavigation and fetchers work the same way."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use client-side validation too?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Validate on blur with the same schema for instant feedback, and let the action be the authority. With clientAction you can also validate before the request leaves the browser, returning errors without a round trip — but keep the server action's validation regardless."
          }
        },
        {
          "@type": "Question",
          "name": "How do I show a success message without navigating?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Return data({ ok: true }) with status 200 and render a role=\"status\" message from actionData, accepting that loaders revalidate. Or use a fetcher, whose data holds the success result without navigation."
          }
        }
      ]
    }
  ]
}
</script>

# Form Validation With React Router Actions

React Router's framework mode (and Remix before it) makes every `<Form>` post to a route `action`, which is elegant until validation fails: returning a plain object with status 200 makes the router revalidate every loader for nothing, `actionData` vanishes on the next navigation, and a fetcher-based inline edit shows errors in the wrong place.

This page covers route actions as the validation layer for server-rendered React apps: returning errors with a 400, reading them with `useActionData`, pending UI through `useNavigation`, and `useFetcher` for forms that should not navigate. It sits alongside [returning validation errors from Next.js server actions](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/returning-validation-errors-from-nextjs-server-actions/) within [hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/).

---

## Context and prerequisites

How React Router's data APIs handle a form:

- **`<Form method="post">`** submits to the current route's `action` (or the one named by `action=`). Without JavaScript it is a normal HTML form post; with it, the router intercepts and uses `fetch`.
- **`action({ request })`** reads `await request.formData()`, validates, and either returns data (to re-render the route with `actionData`) or returns/throws a `redirect`.
- **Revalidation** — after an action, the router re-runs the loaders on the page so data reflects the mutation. By default a 4xx/5xx action response skips revalidation; a 200 does not.
- **`useNavigation()`** exposes `state` (`idle` / `submitting` / `loading`) and `formData` for pending UI.
- **`useFetcher()`** submits to an action without navigating, with its own `data` and `state` — ideal for inline edits, row-level saves and search-as-you-type.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a React Router Form submission to a route action that validates, returns data with field errors and status 400, and the component re-renders with actionData while loaders are not revalidated." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A failed validation in a route action</title>
  <desc>The component&#x27;s Form posts to the route action. The router shows the submitting state through useNavigation. The action validates the form data, finds errors, and returns data with the field errors and submitted values and status 400. Because the status is 400, the router skips revalidating loaders. The component re-renders with useActionData containing the errors and values, and navigation returns to idle.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form component</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Router</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Route action</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&lt;Form method=&quot;post&quot;&gt; submit</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">navigation.state = &quot;submitting&quot;</text>
  <path d="M340.0,97.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,93.0 123.7,97.0 130.7,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">action({ request })</text>
  <path d="M340.0,125.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">data({ errors, values }, { status: 400 })</text>
  <path d="M557.3,153.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">actionData; loaders NOT revalidated</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: action, component and fetcher

```tsx
// app/routes/settings.profile.tsx (React Router v7 framework mode)
import { data, redirect, Form, useActionData, useNavigation, useLoaderData } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/settings.profile";

const Profile = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters."),
  bio: z.string().trim().max(280, "Keep your bio to 280 characters or fewer."),
});

export async function loader({ request }: Route.LoaderArgs) {
  return { profile: await getProfile(request) };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const values = { displayName: String(form.get("displayName") ?? ""), bio: String(form.get("bio") ?? "") };
  const parsed = Profile.safeParse(values);
  if (!parsed.success) {
    // 400: tells the router not to revalidate loaders for a failed mutation.
    return data({ errors: parsed.error.flatten().fieldErrors, values }, { status: 400 });
  }
  await saveProfile(request, parsed.data);
  return redirect("/settings/profile?saved=1");   // POST/redirect/GET
}

export default function ProfileSettings() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting" && navigation.formAction?.endsWith("/settings/profile");
  const errors = actionData?.errors ?? {};
  const values = actionData?.values ?? profile;

  return (
    <Form method="post" noValidate>
      <label htmlFor="displayName">Display name</label>
      <input id="displayName" name="displayName" defaultValue={values.displayName}
        aria-invalid={errors.displayName ? true : undefined}
        aria-describedby={errors.displayName ? "displayName-error" : undefined} />
      {errors.displayName && <p id="displayName-error">{errors.displayName[0]}</p>}
      <label htmlFor="bio">Bio</label>
      <textarea id="bio" name="bio" defaultValue={values.bio} aria-invalid={errors.bio ? true : undefined}
        aria-describedby={errors.bio ? "bio-error" : undefined} />
      {errors.bio && <p id="bio-error">{errors.bio[0]}</p>}
      <button type="submit" aria-disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
    </Form>
  );
}
declare function getProfile(r: Request): Promise<{ displayName: string; bio: string }>;
declare function saveProfile(r: Request, d: unknown): Promise<void>;
```

```tsx
// Inline edit that should not navigate: a fetcher per row.
function RenameRow({ item }: { item: { id: string; name: string } }) {
  const fetcher = useFetcher<typeof action>();
  const error = fetcher.data?.errors?.displayName?.[0];
  return (
    <fetcher.Form method="post" action={`/items/${item.id}/rename`}>
      <label htmlFor={`name-${item.id}`}>Name</label>
      <input id={`name-${item.id}`} name="displayName" defaultValue={item.name} aria-invalid={error ? true : undefined} />
      {error && <p role="alert">{error}</p>}
      <button aria-disabled={fetcher.state !== "idle"}>Rename</button>
    </fetcher.Form>
  );
}
```

---

## Step-by-step walkthrough

1. **Validate in the action with a schema.** The action runs on the server for native posts and fetch submissions alike.
2. **Return `data(…, { status: 400 })` on failure.** The status keeps the router from re-running loaders for a mutation that did not happen, and it is the correct HTTP semantics for the no-JS path.
3. **Return the submitted values.** Use them as `defaultValue`s so a failed submit keeps the user's input on both paths.
4. **Redirect on success.** POST/redirect/GET prevents duplicate submissions on reload and triggers the loaders that should reflect the change.
5. **Derive pending UI from `useNavigation`.** Check `navigation.formAction` so only the submitting form shows a pending state when a page has several.
6. **Use `useFetcher` for non-navigating forms.** Each fetcher has its own `data`, so errors appear next to the row that produced them rather than in page-level `actionData`.

### Why the status code changes behaviour

React Router treats an action's response status as a signal about whether data changed. A 2xx from an action means "a mutation happened", so every loader on the page is re-run to pick up new data — for a failed validation, that is wasted server work and can reset other state on the page. A 4xx means "nothing changed", so revalidation is skipped. Returning validation errors with status 400 is therefore not just correct HTTP; it is how you tell the router to leave the rest of the page alone. You can fine-tune the decision per route with `shouldRevalidate`, but getting the status right removes most of the need.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of possible route action results — data with 400, data with 200, redirect, and thrown response — with the router behaviour and where the user ends up." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Action results and what the router does next</title>
  <desc>Returning data with status 400 re-renders the route with actionData and skips loader revalidation; the user stays on the form with errors. Returning data with status 200 re-renders with actionData and revalidates all loaders; use it for success messages that stay on the page. Returning a redirect navigates to the target and runs its loaders, the usual success path. Throwing a response renders the nearest error boundary and should be reserved for unexpected failures, not validation.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action returns</text>
  <text x="221.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Router does</text>
  <text x="463.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Use for</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">data(…, { status: 400 })</text>
  <text x="221.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">actionData; skip revalidation</text>
  <text x="463.7" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">validation errors</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">data(…) (200)</text>
  <text x="221.1" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">actionData; revalidate loaders</text>
  <text x="463.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">success message in place</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">redirect(url)</text>
  <text x="221.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">navigate; run target loaders</text>
  <text x="463.7" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">normal success</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">throw new Response(…)</text>
  <text x="221.1" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">error boundary</text>
  <text x="463.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">unexpected failures only</text>
</svg>

---

## Failure modes and edge cases

### 1. `actionData` disappears

`actionData` belongs to the navigation that produced it; after the next navigation it is gone. That is correct for errors. For persistent messages ("Saved"), redirect with a query parameter or a flash session value instead of relying on `actionData`.

### 2. Multiple forms, one action

If a route hosts several forms posting to one action, include an `intent` field (`<button name="intent" value="rename">`) and branch in the action; return errors namespaced by intent so each form renders only its own.

### 3. Aborted submissions

Submitting again while a submission is in flight cancels the first request on the client (the router aborts it), but the server may still process it. Make actions idempotent where duplicates matter, as in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

### 4. Focus after errors

The route re-renders in place after a failed submit; nothing moves focus. Add an effect keyed on `actionData` that focuses the error summary or first invalid field, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).

### 5. Optimistic UI with fetchers

`fetcher.formData` exposes the values being submitted, which lets you render the new state immediately. If the action returns errors, the optimistic state disappears when `fetcher.formData` clears; show the error and the old value, following [rolling back optimistic updates on failure](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/rolling-back-optimistic-updates-on-failure/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing when to use the Form component, useFetcher and the imperative useSubmit in React Router." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Form, fetcher, or submit()?</title>
  <desc>Use the Form component for page-level forms whose success should navigate, such as settings pages and signups; errors come back as actionData. Use useFetcher for inline or repeated forms that should not navigate, such as row renames and toggles; each fetcher has its own data and state. Use useSubmit for programmatic submissions such as autosave, while keeping a real form for no-JavaScript users.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">&lt;Form&gt;</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Page-level forms.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Navigate on success.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Errors in actionData.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">useFetcher</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Inline and per-row forms.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No navigation.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Errors in fetcher.data.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">useSubmit</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Programmatic (autosave).</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Keep a real form underneath.</text>
</svg>

---

## Verification checklist

- [ ] Invalid submissions return status 400 and do not re-run page loaders.
- [ ] Errors render next to their fields, with values preserved.
- [ ] The form works with JavaScript disabled.
- [ ] Success redirects and a reload does not resubmit.
- [ ] Pending UI appears only on the form that is submitting.
- [ ] Inline fetcher forms show errors on their own row.
- [ ] Focus moves to the first problem after a failed submit.
- [ ] Multi-form routes use an intent field and namespaced errors.

---

## Frequently Asked Questions

<details>
<summary><strong>Is this the same in Remix?</strong></summary>

Yes in substance. Remix v2's `json()` helper became `data()` in React Router v7, and imports moved from `@remix-run/*` to `react-router`, but actions, `useActionData`, `useNavigation` and fetchers work the same way.

</details>

<details>
<summary><strong>Can I use client-side validation too?</strong></summary>

Yes. Validate on blur with the same schema for instant feedback, and let the action be the authority. With `clientAction` you can also validate before the request leaves the browser, returning errors without a round trip — but keep the server action's validation regardless.

</details>

<details>
<summary><strong>How do I show a success message without navigating?</strong></summary>

Return `data({ ok: true })` with status 200 and render a `role="status"` message from `actionData`, accepting that loaders revalidate. Or use a fetcher, whose `data` holds the success result without navigation.

</details>

---

## Related

- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
- [Progressive Enhancement for Server-Rendered Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/progressive-enhancement-for-server-rendered-forms/)
- [Cancelling In-Flight Submissions on Navigation](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/cancelling-in-flight-submissions-on-navigation/)

← [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
