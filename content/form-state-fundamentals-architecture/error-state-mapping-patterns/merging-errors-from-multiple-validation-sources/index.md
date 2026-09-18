---
layout: page.njk
title: "Merging Errors From Client, Schema and Server Validators"
description: "A field can be judged by native constraints, a schema, an async check and the server at once. How to merge those sources into one message per field with explicit precedence, source-aware clearing, and no flicker between them."
slug: merging-errors-from-multiple-validation-sources
type: howto
breadcrumb: "Merging Error Sources"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Merging Errors From Client, Schema and Server Validators"
  parent: "Error State Mapping Patterns"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Merging Errors From Client, Schema and Server Validators",
      "description": "A field can be judged by native constraints, a schema, an async check and the server at once. How to merge those sources into one message per field with explicit precedence, source-aware clearing, and no flicker between them.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Error State Mapping Patterns",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Merging Errors From Client, Schema and Server Validators",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/merging-errors-from-multiple-validation-sources/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Merge errors from several validation sources into one message per field",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give each validator its own slot"
        },
        {
          "@type": "HowToStep",
          "name": "Stamp every error with the value it judged"
        },
        {
          "@type": "HowToStep",
          "name": "Fix a precedence order"
        },
        {
          "@type": "HowToStep",
          "name": "Drop remote slots on value change"
        },
        {
          "@type": "HowToStep",
          "name": "Derive aria-invalid from the displayed error"
        },
        {
          "@type": "HowToStep",
          "name": "Show one message per field"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why rank server errors above async ones?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A server error is the result of an actual submit and is authoritative for that value; an async pre-check is advisory and can be out of date by the time the user submits. If both disagree about the same value, the server's answer is the one that will keep happening."
          }
        },
        {
          "@type": "Question",
          "name": "Should I ever show more than one message for a field?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Password rules are the usual exception: a checklist of requirements the user can satisfy one by one is more helpful than a single message. That is a different UI — a requirements list with its own status — rather than several errors competing for one slot."
          }
        },
        {
          "@type": "Question",
          "name": "Does the forValue stamp replace AbortController?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No, it complements it. Cancelling stale requests saves network and server work; the stamp guarantees correctness even when a response slips through, for example because a server ignored the abort or a cached promise resolved."
          }
        }
      ]
    }
  ]
}
</script>

# Merging Errors From Client, Schema and Server Validators

When a field is checked by native constraints, a schema, an async uniqueness check and the server, the error shown is whichever source wrote last — so "Enter a valid email" flickers into "Email already registered" and back, or a stale server error survives after the user fixes the value.

The mapping from errors to components is covered in [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/). This page is about the step before mapping: several independent validators each have an opinion about the same field, and the form needs one answer. The fix is to store errors per source and derive the displayed message with a fixed precedence.

---

## Context and prerequisites

A signup email field commonly has four validators:

1. **Constraint** — the browser's `type="email"` and `required` via the Constraint Validation API.
2. **Schema** — Zod or similar: format, length, blocked domains.
3. **Async** — "is this address already registered?" against an endpoint.
4. **Server** — the submit response's field errors, which can disagree with all of the above.

Each runs on a different trigger and finishes at a different time. If they write into one `errors.email` slot, the slot holds the last writer's opinion, and clearing is ambiguous: when the async check passes, should it clear a schema error it knows nothing about? Keep the sources separate and the question disappears.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram in which the schema validator writes an invalid-format error, a slower async check for the previous value then writes success and clears it, leaving an invalid email showing no error." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Last writer wins, and a valid error disappears</title>
  <desc>The user types an address and the async uniqueness check starts for it. The user then adds a stray character, making the format invalid, and the schema validator writes an invalid-format error into the shared slot. The async check for the previous value then resolves as available and clears the shared slot. The field now holds an invalid email with no error shown.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Shared error slot</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Validators</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">types ada@example.com; async check starts</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">adds a stray comma</text>
  <path d="M122.7,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#a63d6f" font-family="inherit">schema: invalid format</text>
  <path d="M557.3,125.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,121.0 341.0,125.0 348.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">async (old value): available, clear</text>
  <path d="M557.3,153.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid email, no error shown</text>
  <path d="M340.0,181.0 H130.7" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
  <text x="14.0" y="221.0" font-size="10" fill="#6b5f75" font-family="inherit">Per-source storage fixes this even before you add cancellation: the async result can only clear its own slot.</text>
</svg>

---

## The core pattern: per-source slots and a precedence function

```typescript
export type Source = "constraint" | "schema" | "async" | "server";

export interface SourcedError { message: string; code: string; forValue: string }

// errors[path][source] — each validator owns exactly one slot per field.
export type ErrorTable = Record<string, Partial<Record<Source, SourcedError>>>;

// Earlier in the list wins. Local format problems outrank remote opinions:
// "already registered" is meaningless for a value that is not an email.
const PRECEDENCE: Source[] = ["constraint", "schema", "server", "async"];

export function setSourceError(t: ErrorTable, path: string, source: Source, err: SourcedError | null): ErrorTable {
  const row = { ...(t[path] ?? {}) };
  if (err) row[source] = err; else delete row[source];
  return { ...t, [path]: row };
}

export function displayedError(t: ErrorTable, path: string, currentValue: string): SourcedError | null {
  const row = t[path] ?? {};
  for (const source of PRECEDENCE) {
    const e = row[source];
    // An error computed for a different value is stale: never show it.
    // This matters most for async and server results that arrive late.
    if (e && e.forValue === currentValue) return e;
  }
  return null;
}

// When the value changes, remote opinions about the OLD value are void.
export function onValueChange(t: ErrorTable, path: string): ErrorTable {
  const { server, async: _async, ...local } = t[path] ?? {};
  return { ...t, [path]: local };   // local validators will overwrite their own slots
}
```

Each validator calls `setSourceError` for its own source only, stamping the value it validated in `forValue`. The component renders `displayedError(table, path, value)` and nothing else.

---

## Step-by-step walkthrough

1. **Give each validator its own slot.** A validator can set or clear its slot, never another's. Clearing becomes unambiguous: passing the async check removes only the async error.
2. **Stamp every error with the value it judged.** `forValue` lets the display function discard late results for values the user has already changed, which guards against races even if cancellation is missed.
3. **Fix a precedence order.** Local, deterministic checks first; server next; async last. The ordering encodes "fix the format before worrying about availability".
4. **Drop remote slots on value change.** Server and async errors are about a specific submitted or checked value. The moment the value changes they are void; [clearing server errors when a field changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/) goes deeper on the server side.
5. **Derive `aria-invalid` from the displayed error.** If nothing displays, the field is not invalid, whatever lower-precedence slots hold.
6. **Show one message per field.** Multiple simultaneous messages for one field are noise; the precedence already picked the most useful one.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing the four source slots for an email field across three moments, with the message that the precedence function displays at each moment." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The error table for one field, and what displays</title>
  <desc>At first only the schema slot holds invalid format, so that displays. After the user fixes the format, the schema slot is empty and the async slot holds already registered for the current value, so that displays. After the user changes the address again, the async slot is dropped because it judged a different value, the schema slot is empty, and nothing displays until the new async check returns.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Moment</text>
  <text x="168.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">constraint</text>
  <text x="265.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">schema</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">async</text>
  <text x="531.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Displayed</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">typed &quot;ada@exa,&quot;</text>
  <text x="168.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="265.5" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid format</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="531.1" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">invalid format</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">fixed to ada@example.com</text>
  <text x="168.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="265.5" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">registered (this value)</text>
  <text x="531.1" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">already registered</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">changed to ada2@…</text>
  <text x="168.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="265.5" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">dropped (old value)</text>
  <text x="531.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">nothing, check pending</text>
</svg>

---

## Failure modes and edge cases

### 1. Native and schema messages disagree in wording

The browser's `validationMessage` is localised by the browser and worded differently in each one. If you use the Constraint Validation API for its checks, supply your own message via `setCustomValidity` so the constraint and schema slots speak with one voice, as in [using the Constraint Validation API with custom form state](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/using-the-constraint-validation-api-with-custom-state/).

### 2. Server says valid, client says invalid

After deploying a stricter schema, the server may accept values the client now rejects, or the reverse. Precedence picks one message, but you should also log disagreements; sharing one schema as described in [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/) removes the class of bug.

### 3. Pending async state hides behind a stale error

While the async check runs, show a pending indicator rather than the last result. With `forValue` stamping, the stale result is already hidden; the pending state is covered in [accessible pending state for async validation](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/accessible-pending-state-for-async-validation/).

### 4. Flicker between sources

When the user fixes the format, the schema error clears and the async result for the same value may arrive 300 ms later. Showing nothing in between is correct; animating the message out and back in is the flicker users notice. Keep the message container in place and swap its text without an exit animation.

### 5. Form-scope errors in a field table

Server errors that do not map to a field belong in form scope, not in a slot under an invented path. Keep the table for fields, and model the rest as described in [modelling form-level vs field-level errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing the precedence order constraint, schema, server, async, with the reason each ranks where it does." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The precedence order and why</title>
  <desc>Constraint errors rank first because a missing required value makes every other check meaningless. Schema errors come next because format and length are deterministic and instant. Server errors come third because they reflect the authoritative decision for a submitted value. Async errors come last because availability only matters once the value is well formed.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">1. constraint</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">required, type</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Nothing else matters yet.</text>
  <path d="M156.0,54.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,50.5 183.0,54.5 176.0,58.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">2. schema</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">format, length</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Deterministic, instant.</text>
  <path d="M326.0,54.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,50.5 353.0,54.5 346.0,58.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">3. server</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">authoritative</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">For the submitted value.</text>
  <path d="M496.0,54.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,50.5 523.0,54.5 516.0,58.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">4. async</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">availability</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only for a well-formed</text>
  <text x="536.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">value.</text>
</svg>

---

## Verification checklist

- [ ] Each validator writes only to its own source slot.
- [ ] Every stored error records the value it judged.
- [ ] A late async result for an old value never displays.
- [ ] Editing a field removes its server and async errors immediately.
- [ ] Exactly one message displays per field, chosen by the documented precedence.
- [ ] `aria-invalid` matches whether a message is displayed.
- [ ] Constraint and schema messages use the same wording style.
- [ ] Swapping between messages does not animate the container out and in.

---

## Frequently Asked Questions

<details>
<summary><strong>Why rank server errors above async ones?</strong></summary>

A server error is the result of an actual submit and is authoritative for that value; an async pre-check is advisory and can be out of date by the time the user submits. If both disagree about the same value, the server's answer is the one that will keep happening.

</details>

<details>
<summary><strong>Should I ever show more than one message for a field?</strong></summary>

Password rules are the usual exception: a checklist of requirements the user can satisfy one by one is more helpful than a single message. That is a different UI — a requirements list with its own status — rather than several errors competing for one slot.

</details>

<details>
<summary><strong>Does the forValue stamp replace AbortController?</strong></summary>

No, it complements it. Cancelling stale requests saves network and server work; the stamp guarantees correctness even when a response slips through, for example because a server ignored the abort or a cached promise resolved.

</details>

---

## Related

- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
- [Mapping Validation Errors to UI Components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/)
- [Cancelling Stale Async Validation With AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/)

← [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)
