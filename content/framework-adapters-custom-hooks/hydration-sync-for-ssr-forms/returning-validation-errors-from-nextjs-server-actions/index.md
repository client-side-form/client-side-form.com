---
layout: page.njk
title: "Returning Validation Errors From Next.js Server Actions"
description: "Validate Next.js App Router form submissions in a server action and return field errors the client can render: a serialisable result type, useActionState wiring, keeping values across the automatic reset, redirects on success, and what never to trust from the client."
slug: returning-validation-errors-from-nextjs-server-actions
type: howto
breadcrumb: "Next.js Server Action Errors"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Returning Validation Errors From Next.js Server Actions"
  parent: "Hydration Sync for SSR Forms"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Returning Validation Errors From Next.js Server Actions",
      "description": "Validate Next.js App Router form submissions in a server action and return field errors the client can render: a serialisable result type, useActionState wiring, keeping values across the automatic reset, redirects on success, and what never to trust from the client.",
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
          "name": "Returning Validation Errors From Next.js Server Actions",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/returning-validation-errors-from-nextjs-server-actions/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Return field-level validation errors from a Next.js server action",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Define the result as a discriminated union of plain data"
        },
        {
          "@type": "HowToStep",
          "name": "Parse untrusted FormData explicitly"
        },
        {
          "@type": "HowToStep",
          "name": "Validate with the shared schema and flatten()"
        },
        {
          "@type": "HowToStep",
          "name": "Return values on failure"
        },
        {
          "@type": "HowToStep",
          "name": "Redirect outside try/catch"
        },
        {
          "@type": "HowToStep",
          "name": "Authorise inside the action"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I also validate on the client?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For instant feedback, yes — run the same schema on blur. But the action must validate regardless, because clients can skip their own checks. Client validation is a courtesy; server validation is the rule."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use next-safe-action or similar libraries?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Libraries that wrap server actions with schema validation and typed results implement the same pattern — validated input, serialisable result, middleware for auth. Choose one if you have many actions; the principles on this page still apply to how you render the results."
          }
        },
        {
          "@type": "Question",
          "name": "How do I map server-only errors like \"email already registered\"?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Add them to fieldErrors under the field's key after your database check, exactly like schema errors. The client does not need to know which ones came from the schema and which from the database."
          }
        }
      ]
    }
  ]
}
</script>

# Returning Validation Errors From Next.js Server Actions

A Next.js server action that throws on invalid input shows the user an error boundary instead of a message next to the field, and one that returns a Zod error object hits "Only plain objects can be passed to Client Components" — the result must be a small, serialisable shape designed for rendering.

This page builds that shape and wires it to `useActionState` in an App Router form: validation with a shared schema, field errors and submitted values in the result, a redirect on success, and the security rules that apply because a server action is a public endpoint. It extends [hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/) and uses the client pattern from [form submission with React 19 useActionState](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/form-submission-with-react-19-useactionstate/).

---

## Context and prerequisites

Facts about server actions that shape the design:

- **They are POST endpoints.** Anyone can call them with any payload; the `"use server"` function's arguments are untrusted input, regardless of what the form looked like.
- **Return values are serialised** across the network with the React Server Components protocol. Plain objects, arrays, strings, numbers, `Date`s and a few other types work; class instances (like `ZodError`) and functions do not.
- **`redirect()` throws** a special error that Next.js catches. Calling it inside `try/catch` swallows the redirect unless you rethrow it.
- **Forms work before hydration.** With `action={formAction}`, a submission before the client bundle loads is a normal POST that renders the returned state on the server.
- **Uncontrolled inputs reset** after a successful action (React 19 behaviour), so failed submissions must return the values to re-populate.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two cards contrasting values that can be returned from a server action, such as plain objects of strings and arrays, with values that cannot, such as ZodError instances, functions and class instances." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What may cross the server action boundary</title>
  <desc>A server action can return plain objects, arrays, strings, numbers, booleans, null and dates, so a result such as ok false with an errors record of strings and a values record is safe. It cannot return class instances such as a ZodError, functions, or objects with prototypes, which fail serialisation. Flatten schema errors into plain strings on the server before returning.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Serialisable</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Plain objects and arrays.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Strings, numbers, booleans, null, Date.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">{ ok: false, errors: Record&lt;string, string[]&gt; }</text>
  <rect x="347.0" y="12.0" width="319.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Not serialisable</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">ZodError and other class instances.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Functions, Maps with non-plain values.</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Anything with a custom prototype.</text>
</svg>

---

## The core pattern: a result type, a server action, a client form

```typescript
// app/contact/schema.ts — shared by client (instant checks) and server (authority)
import { z } from "zod";
export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: z.string().trim().email("Enter an email like name@example.com."),
  message: z.string().trim().min(20, "Tell us a bit more — at least 20 characters."),
});
export type ContactResult =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Record<string, string[]>; formError?: string; values: Record<string, string> };
```

```typescript
// app/contact/actions.ts
"use server";
import { redirect } from "next/navigation";
import { ContactSchema, type ContactResult } from "./schema";

export async function sendContact(_prev: ContactResult, formData: FormData): Promise<ContactResult> {
  // Treat every field as untrusted: coerce to strings, ignore unexpected keys.
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const parsed = ContactSchema.safeParse(values);
  if (!parsed.success) {
    // flatten() → plain { fieldErrors: { name?: string[] … } }: serialisable.
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, values };
  }
  try {
    await deliver(parsed.data);
  } catch {
    return { status: "error", fieldErrors: {}, formError: "We couldn't send your message. Please try again.", values };
  }
  // Outside try/catch: redirect() works by throwing.
  redirect("/contact/thanks");
}
declare function deliver(d: unknown): Promise<void>;
```

```tsx
// app/contact/ContactForm.tsx
"use client";
import { useActionState } from "react";
import { sendContact } from "./actions";
import type { ContactResult } from "./schema";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactResult, FormData>(sendContact, { status: "idle" });
  const err = state.status === "error" ? state.fieldErrors : {};
  const v = state.status === "error" ? state.values : { name: "", email: "", message: "" };
  return (
    <form action={action} noValidate key={state.status === "error" ? JSON.stringify(v) : "fresh"}>
      {state.status === "error" && state.formError && <p role="alert">{state.formError}</p>}
      <label htmlFor="name">Name</label>
      <input id="name" name="name" defaultValue={v.name} aria-invalid={err.name ? true : undefined}
        aria-describedby={err.name ? "name-error" : undefined} autoComplete="name" />
      {err.name && <p id="name-error">{err.name[0]}</p>}
      {/* email and message follow the same pattern */}
      <button type="submit" aria-disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
```

---

## Step-by-step walkthrough

1. **Define the result as a discriminated union of plain data.** It is both the API contract of the action and the client's render input.
2. **Parse untrusted `FormData` explicitly.** Read only the keys you expect, coerce to strings, and never spread `Object.fromEntries(formData)` into a database call.
3. **Validate with the shared schema and `flatten()`.** `flatten().fieldErrors` gives `Record<string, string[]>` — plain and serialisable — which the client maps onto fields. Sharing the schema is covered in [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/).
4. **Return values on failure.** Re-populate inputs with `defaultValue={v.name}`; keying the form on the values ensures React re-applies them after the automatic reset.
5. **Redirect outside `try/catch`.** Or rethrow with `unstable_rethrow` / by checking for the redirect error, depending on your Next.js version.
6. **Authorise inside the action.** Check the session and permissions in the action itself; hiding the form from unauthorised users does not stop them calling the endpoint.

### Why the action must not trust the form's shape

It is tempting to think of a server action as a private function the form calls. It is not: Next.js exposes it as an endpoint with an identifier the page ships to the browser, and any client can invoke it with arbitrary arguments. Hidden fields can be edited, disabled fields can be sent anyway, and fields that do not exist in the form can be added. Everything the action needs to decide — who the user is, which record they may change, which fields they may set — must come from the server's own session and data, with the form's values treated as requests to be validated rather than facts. The schema enforces shape; authorisation enforces permission; both belong inside the action.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of the same invalid contact submission handled before hydration as a native POST with a server-rendered response, and after hydration through useActionState without a reload." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>An invalid submit before and after hydration</title>
  <desc>Before hydration, the browser posts the form natively; Next.js runs the server action, which returns an error result, and the server renders the page with the errors and values in place. After hydration, useActionState sends the same action through the React Server Components request; the action returns the same error result as plain data, and the client re-renders the form with field errors and the user&#x27;s values, with no page reload.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Browser</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Next.js server</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server action</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">before hydration: native POST</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">sendContact(prev, formData)</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#a63d6f" font-family="inherit">{ status: &quot;error&quot;, fieldErrors, values }</text>
  <path d="M557.3,125.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,121.0 341.0,125.0 348.0,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">HTML with errors and values</text>
  <path d="M340.0,153.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#6b5f75" font-family="inherit">after hydration: same action via RSC request</text>
  <path d="M122.7,181.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="549.3,177.0 556.3,181.0 549.3,185.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Throwing for validation failures

`throw new Error("Invalid email")` renders the nearest `error.tsx` boundary and loses the form. Reserve throws for truly unexpected failures; return validation problems as data.

### 2. Returning the schema error object

`return { error: parsed.error }` fails serialisation or produces an unhelpful structure. Flatten or map issues to strings keyed by field.

### 3. Echoing secrets

Returning `values` for a password or card field puts it into the RSC payload and, before hydration, into server-rendered HTML. Exclude sensitive fields from `values`.

### 4. Focus after the action returns

After an error result, move focus to an error summary or the first invalid field in an effect keyed on the result, as described in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/). Without it, the update happens silently for keyboard and screen-reader users.

### 5. Rate limiting and abuse

Because actions are public endpoints, contact and signup actions attract bots. Rate-limit by IP or session inside the action, and consider a challenge for anonymous forms; return a form-level error when limited.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of form concerns in a Next.js server action flow and whether each belongs in the shared schema, the server action or the client component." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where each concern lives</title>
  <desc>Field shape and format rules belong in the shared schema. Authentication, authorisation, rate limiting and uniqueness checks belong in the server action. Rendering errors, focus management and pending state belong in the client component. Redirect after success belongs in the server action, outside try and catch.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Concern</text>
  <text x="252.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Schema</text>
  <text x="382.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Server action</text>
  <text x="545.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Client</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">format and length rules</text>
  <text x="252.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="382.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">runs it</text>
  <text x="545.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">may run it</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">auth and permissions</text>
  <text x="382.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">uniqueness, rate limits</text>
  <text x="382.6" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">redirect on success</text>
  <text x="382.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes (outside try)</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">render errors, focus, pending</text>
  <text x="545.6" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
</svg>

---

## Verification checklist

- [ ] Invalid input returns field errors that render next to their fields.
- [ ] The result object is plain data; no serialisation errors in the console.
- [ ] Values survive a failed submission, excluding secrets.
- [ ] Success redirects, and the redirect is not swallowed by `try/catch`.
- [ ] The form works with JavaScript disabled.
- [ ] The action checks authentication and permissions itself.
- [ ] Focus moves to the first problem after an error result.
- [ ] Repeated submissions are rate-limited with a form-level message.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I also validate on the client?</strong></summary>

For instant feedback, yes — run the same schema on blur. But the action must validate regardless, because clients can skip their own checks. Client validation is a courtesy; server validation is the rule.

</details>

<details>
<summary><strong>Can I use next-safe-action or similar libraries?</strong></summary>

Yes. Libraries that wrap server actions with schema validation and typed results implement the same pattern — validated input, serialisable result, middleware for auth. Choose one if you have many actions; the principles on this page still apply to how you render the results.

</details>

<details>
<summary><strong>How do I map server-only errors like "email already registered"?</strong></summary>

Add them to `fieldErrors` under the field's key after your database check, exactly like schema errors. The client does not need to know which ones came from the schema and which from the database.

</details>

---

## Related

- [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
- [Preventing Hydration Mismatch in Next.js Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/preventing-hydration-mismatch-in-nextjs-forms/)
- [Mapping 422 Responses to Field Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/)

← [Hydration Sync for SSR Forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/)
