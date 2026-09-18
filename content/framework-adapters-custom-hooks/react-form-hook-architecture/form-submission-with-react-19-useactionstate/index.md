---
layout: page.njk
title: "Form Submission With React 19 useActionState"
description: "Use React 19's useActionState and form actions for submission state: pending flags without manual booleans, returning field errors from the action, keeping user input on failure, useFormStatus for nested buttons, and where client validation still belongs."
slug: form-submission-with-react-19-useactionstate
type: howto
breadcrumb: "useActionState"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Form Submission With React 19 useActionState"
  parent: "React Form Hook Architecture"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Form Submission With React 19 useActionState",
      "description": "Use React 19's useActionState and form actions for submission state: pending flags without manual booleans, returning field errors from the action, keeping user input on failure, useFormStatus for nested buttons, and where client validation still belongs.",
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
          "name": "React Form Hook Architecture",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Form Submission With React 19 useActionState",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/form-submission-with-react-19-useactionstate/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Handle form submission with useActionState in React 19",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Design the returned state as a discriminated union"
        },
        {
          "@type": "HowToStep",
          "name": "Always return the submitted values"
        },
        {
          "@type": "HowToStep",
          "name": "Validate inside the action with a schema"
        },
        {
          "@type": "HowToStep",
          "name": "Map issues to one message per field"
        },
        {
          "@type": "HowToStep",
          "name": "Put the pending UI in a child using useFormStatus"
        },
        {
          "@type": "HowToStep",
          "name": "Keep instant client checks where they help"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I still need a form library with React 19 actions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For simple forms, actions plus a schema are enough. Libraries still earn their place for field arrays, per-field subscriptions in large forms, and rich client-side validation timing. Many now integrate with actions, so the choice is about client-side ergonomics rather than submission."
          }
        },
        {
          "@type": "Question",
          "name": "Can I opt out of the automatic reset?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not with a flag. You either return the values and use them as defaults (as above), use controlled inputs, or call event.preventDefault() in an onSubmit and invoke the action yourself with startTransition. Returning values is the least code and also works with progressive enhancement."
          }
        },
        {
          "@type": "Question",
          "name": "Does useActionState work without JavaScript?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "With server functions in a framework that supports them, the form posts to the server and renders the returned state in the response, so it works before hydration. With a client-only action, nothing happens without JavaScript; provide a real action URL fallback if that matters, as in progressive enhancement for server-rendered forms."
          }
        }
      ]
    }
  ]
}
</script>

# Form Submission With React 19 useActionState

React 19's form actions replace the familiar pile of `isSubmitting`, `error` and `result` state with one hook, but teams porting existing forms hit the same three surprises: the form resets its uncontrolled inputs after every action, errors returned from the action need a shape the UI can map to fields, and client-side validation seems to have nowhere to go.

This page covers `useActionState` as a submission primitive inside the [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/). It works with plain client actions and with server functions in frameworks that support them; the patterns for server-rendered frameworks specifically are in [returning validation errors from Next.js server actions](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/returning-validation-errors-from-nextjs-server-actions/).

---

## Context and prerequisites

The pieces:

- **`<form action={fn}>`** — React calls `fn(formData)` on submit, inside a transition. No `preventDefault`, no `onSubmit`.
- **`useActionState(action, initialState)`** — returns `[state, formAction, isPending]`. React calls `action(previousState, formData)`, stores whatever it returns as the next `state`, and sets `isPending` while it runs. Submissions are queued and run in order.
- **`useFormStatus()`** — from `react-dom`, callable in any component *inside* the form, returns `{ pending, data, method, action }` for the enclosing form. Ideal for a reusable submit button.
- **Automatic reset** — after a successful action, React resets uncontrolled fields of a `<form action>` to their `defaultValue`s. Great for a comment box; surprising for an edit form that failed validation.

The key design decision is the **state shape** the action returns. It is your error model, your "last submitted values" store and your success signal all at once.

<svg viewBox="0 0 680 199" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user submitting a form with an action, React marking the action pending, the action validating and returning a state with field errors, and the component rendering those errors while keeping the submitted values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One submission through useActionState</title>
  <desc>The user presses submit. React starts a transition, sets isPending to true and calls the action with the previous state and the form data. The action validates the data with a schema; it fails, so the action returns a state containing field errors and the submitted values. React stores it as the new state and sets isPending to false. The component renders each field&#x27;s error and uses the returned values as default values, so the user&#x27;s input is not lost to the automatic form reset.</desc>
  <rect x="0" y="0" width="680" height="199" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">React</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Action</text>
  <path d="M122.7,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">submit</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">action(prevState, formData); isPending =</text>
  <text x="348.0" y="105.0" font-size="9.5" fill="#6b5f75" font-family="inherit">true</text>
  <path d="M340.0,109.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,105.0 556.3,109.0 549.3,113.0" fill="#7b4f8a"/>
  <text x="348.0" y="133.0" font-size="9.5" fill="#a63d6f" font-family="inherit">{ ok: false, errors, values }</text>
  <path d="M557.3,137.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,133.0 341.0,137.0 348.0,141.0" fill="#7b4f8a"/>
  <text x="130.7" y="161.0" font-size="9.5" fill="#2d6342" font-family="inherit">render errors; defaults from values</text>
  <path d="M340.0,165.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,161.0 123.7,165.0 130.7,169.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: a typed action state with values and errors

```tsx
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { z } from "zod";

const Profile = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters."),
  email: z.string().trim().email("Enter an email like name@example.com."),
});

type Values = { displayName: string; email: string };

type ActionState =
  | { status: "idle"; values: Values }
  | { status: "invalid"; values: Values; fieldErrors: Partial<Record<keyof Values, string>>; formError?: string }
  | { status: "saved"; values: Values; savedAt: number };

async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Read raw strings; keep them to re-populate the form on failure.
  const values: Values = {
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = Profile.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof Values, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Values;
      fieldErrors[key] ??= issue.message;            // first message per field
    }
    return { status: "invalid", values, fieldErrors };
  }
  const res = await fetch("/api/profile", { method: "PUT", body: JSON.stringify(parsed.data) });
  if (!res.ok) return { status: "invalid", values, fieldErrors: {}, formError: "We couldn't save your profile. Try again." };
  return { status: "saved", values: parsed.data, savedAt: Date.now() };
}

function SubmitButton() {
  const { pending } = useFormStatus();                // reads the ENCLOSING form's status
  return <button type="submit" aria-disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>;
}

export function ProfileForm({ initial }: { initial: Values }) {
  const [state, formAction] = useActionState(saveProfile, { status: "idle", values: initial });
  const err = state.status === "invalid" ? state.fieldErrors : {};
  return (
    // key: remount after each result so defaultValue reflects state.values —
    // this is what counteracts the automatic reset on failure.
    <form action={formAction} key={state.status === "saved" ? state.savedAt : "edit"} noValidate>
      {state.status === "invalid" && state.formError && <p role="alert">{state.formError}</p>}
      <label htmlFor="displayName">Display name</label>
      <input id="displayName" name="displayName" defaultValue={state.values.displayName}
        aria-invalid={err.displayName ? true : undefined} aria-describedby={err.displayName ? "displayName-error" : undefined} />
      {err.displayName && <p id="displayName-error">{err.displayName}</p>}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" defaultValue={state.values.email}
        aria-invalid={err.email ? true : undefined} aria-describedby={err.email ? "email-error" : undefined} />
      {err.email && <p id="email-error">{err.email}</p>}
      <SubmitButton />
      <p role="status">{state.status === "saved" ? "Profile saved." : ""}</p>
    </form>
  );
}
```

---

## Step-by-step walkthrough

1. **Design the returned state as a discriminated union.** `idle`, `invalid` and `saved` each carry what their UI needs; TypeScript then forces every render path to handle all three.
2. **Always return the submitted values.** React resets uncontrolled inputs after the action completes; feeding `state.values` back as `defaultValue` restores what the user typed when validation fails.
3. **Validate inside the action with a schema.** The same Zod schema can run on the server when the action is a server function — see [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/).
4. **Map issues to one message per field.** Keep the first issue per path; show form-level failures (network, 5xx) in a separate `role="alert"` paragraph, following [modelling form-level vs field-level errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/).
5. **Put the pending UI in a child using `useFormStatus`.** It reads the nearest parent form, so one `SubmitButton` component works in every form without prop threading.
6. **Keep instant client checks where they help.** Per-field feedback on blur still uses your field hook; the action is the authoritative check at submit time.

<svg viewBox="0 0 680 265" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of submission concerns showing which are handled by useActionState and form actions and which still need your own code." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What useActionState replaces, and what it does not</title>
  <desc>The pending flag is handled by useActionState&#x27;s isPending or useFormStatus. Storing the result is handled by the returned state. Ordering of rapid submissions is handled because actions are queued. Preventing default submission is handled by the action prop. Keeping user input after a failed validation still requires returning values and using them as defaults. Per-field blur validation, focus management after errors and double-submit protection on the server still require your own code.</desc>
  <rect x="0" y="0" width="680" height="265" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="236.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Concern</text>
  <text x="221.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Handled by React 19</text>
  <text x="448.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Still yours</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">pending flag</text>
  <text x="221.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">isPending / useFormStatus</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">result storage</text>
  <text x="221.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">returned state</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">ordering of submits</text>
  <text x="221.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">actions queue in order</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">keeping input on failure</text>
  <text x="448.6" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">return values; use as defaults</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">blur-time field feedback</text>
  <text x="448.6" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">your field hook</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">focus after errors</text>
  <text x="448.6" y="209.0" font-size="9.5" fill="#a63d6f" font-family="inherit">move focus to summary or field</text>
  <line x1="14" y1="219.0" x2="666" y2="219.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="238.5" font-size="9.5" fill="#1e1a24" font-family="inherit">idempotency</text>
  <text x="448.6" y="238.5" font-size="9.5" fill="#a63d6f" font-family="inherit">server-side keys</text>
</svg>

---

## Failure modes and edge cases

### 1. Inputs wiped after a failed submit

The automatic reset applies to uncontrolled fields of a form whose `action` is a function. Returning `values` and using them as `defaultValue` fixes the content; keying the form so it remounts with those defaults makes it deterministic.

### 2. Focus lost after the action returns

A remount (from the key) moves focus to `<body>`. After an invalid result, move focus to the error summary or the first invalid field in an effect keyed on the state, following [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).

### 3. `useFormStatus` returns `pending: false`

It only reports the form that *contains* the component calling it. Calling it in the same component that renders the `<form>` always returns the default. Move the button into a child component.

### 4. Controlled inputs and actions

Controlled inputs are not reset by React, and their values are still read from the DOM into `FormData`. Mixing them is fine, but be consistent: if the field is controlled, its value comes from your state, not from `state.values`.

### 5. Queued submissions

Pressing submit three times queues three action calls, each receiving the previous one's state. That preserves order, but still sends three requests. Guard with `isPending` in the button and an idempotency key server-side, as in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the idle, invalid and saved action states and what the form renders in each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The three states and their UI</title>
  <desc>In the idle state the form renders the initial values and no messages. In the invalid state it renders the submitted values as defaults, each field&#x27;s error linked with aria-describedby, and any form-level error in an alert, and moves focus to the first problem. In the saved state it renders the saved values, remounts the form so it is pristine, and announces profile saved through a status region.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">idle</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Initial values.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No messages.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">invalid</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submitted values as defaults.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Field errors + optional alert.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus to the first problem.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">saved</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Saved values; form remounted.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Profile saved.&quot; in a status region.</text>
</svg>

---

## Verification checklist

- [ ] A failed validation keeps every value the user typed.
- [ ] Each field error is linked with `aria-describedby` and toggles `aria-invalid`.
- [ ] A network failure shows a form-level alert and keeps the input.
- [ ] The submit button shows a pending label via `useFormStatus` in a child component.
- [ ] Focus moves to the first problem after an invalid result.
- [ ] A successful save is announced and the form returns to pristine.
- [ ] Rapid repeated submits do not create duplicate records.

---

## Frequently Asked Questions

<details>
<summary><strong>Do I still need a form library with React 19 actions?</strong></summary>

For simple forms, actions plus a schema are enough. Libraries still earn their place for field arrays, per-field subscriptions in large forms, and rich client-side validation timing. Many now integrate with actions, so the choice is about client-side ergonomics rather than submission.

</details>

<details>
<summary><strong>Can I opt out of the automatic reset?</strong></summary>

Not with a flag. You either return the values and use them as defaults (as above), use controlled inputs, or call `event.preventDefault()` in an `onSubmit` and invoke the action yourself with `startTransition`. Returning values is the least code and also works with progressive enhancement.

</details>

<details>
<summary><strong>Does useActionState work without JavaScript?</strong></summary>

With server functions in a framework that supports them, the form posts to the server and renders the returned state in the response, so it works before hydration. With a client-only action, nothing happens without JavaScript; provide a real `action` URL fallback if that matters, as in [progressive enhancement for server-rendered forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/progressive-enhancement-for-server-rendered-forms/).

</details>

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
- [Building a Custom useFormField Hook](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/)
- [Returning Validation Errors From Next.js Server Actions](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/returning-validation-errors-from-nextjs-server-actions/)

← [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
