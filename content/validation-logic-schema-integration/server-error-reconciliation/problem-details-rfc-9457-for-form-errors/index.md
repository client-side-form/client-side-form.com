---
layout: page.njk
title: "Problem Details (RFC 9457) for Form Errors"
description: "Use the Problem Details standard (RFC 9457, successor to RFC 7807) for form validation responses: the application/problem+json shape, an errors extension with JSON Pointers, stable type URIs, and a client parser that routes field, form and retryable problems."
slug: problem-details-rfc-9457-for-form-errors
type: howto
breadcrumb: "Problem Details"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Problem Details (RFC 9457) for Form Errors"
  parent: "Server Error Reconciliation"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Problem Details (RFC 9457) for Form Errors",
      "description": "Use the Problem Details standard (RFC 9457, successor to RFC 7807) for form validation responses: the application/problem+json shape, an errors extension with JSON Pointers, stable type URIs, and a client parser that routes field, form and retryable problems.",
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
          "name": "Validation Logic & Schema Integration",
          "item": "https://client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Server Error Reconciliation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Problem Details (RFC 9457) for Form Errors",
          "item": "https://client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/problem-details-rfc-9457-for-form-errors/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Return and consume form validation errors as Problem Details",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Define problem types as URIs you own"
        },
        {
          "@type": "HowToStep",
          "name": "Return validation failures with a stable errors extension"
        },
        {
          "@type": "HowToStep",
          "name": "Set application/problem+json"
        },
        {
          "@type": "HowToStep",
          "name": "Switch on type in the client"
        },
        {
          "@type": "HowToStep",
          "name": "Convert pointers to form paths and check they exist"
        },
        {
          "@type": "HowToStep",
          "name": "Show instance as a reference on unexpected errors"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is 422 or 400 the right status for validation errors?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Both are used. 422 Unprocessable Content signals that the request was well-formed but semantically invalid, which fits form validation well; 400 is common for malformed bodies. Pick one convention for validation and keep 400 for requests the server could not parse at all."
          }
        },
        {
          "@type": "Question",
          "name": "Is the errors array part of the standard?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is an extension member. RFC 9457 shows a validation example with an errors array of objects carrying detail and pointer, but extension names are up to the API. Document yours alongside the problem type URI."
          }
        },
        {
          "@type": "Question",
          "name": "Do framework error formats map onto this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Many do or can: ASP.NET Core produces Problem Details natively (with a errors dictionary keyed by field name), Spring supports ProblemDetail, and other frameworks have middleware. Normalise their field keys to your pointer format in the client router."
          }
        }
      ]
    }
  ]
}
</script>

# Problem Details (RFC 9457) for Form Errors

Every API invents its own error envelope — `{ error: "…" }`, `{ errors: [{ field, msg }] }`, `{ message, details: { … } }` — and every client grows a parser per endpoint, which is why server errors so often end up as a generic toast instead of on the field that caused them.

Problem Details, standardised in RFC 9457 (which obsoletes RFC 7807), gives HTTP APIs a common error format with `type`, `title`, `status`, `detail` and `instance`, plus extension members for anything specific. This page, part of [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/), defines a validation problem type with per-field errors as JSON Pointers, and a client that routes any problem response to the right place in the form.

---

## Context and prerequisites

The standard members:

- **`type`** — a URI identifying the problem type; the primary key for client logic. Defaults to `about:blank`.
- **`title`** — a short, human-readable summary of the *type* (same for every occurrence).
- **`status`** — the HTTP status code, duplicated for convenience.
- **`detail`** — a human-readable explanation of *this* occurrence.
- **`instance`** — a URI identifying this occurrence (useful for support logs).

The media type is `application/problem+json`. RFC 9457 adds guidance for multiple problems of the same type, and describes an example validation problem that lists errors, each with a `detail` and a `pointer` — a JSON Pointer (RFC 6901) into the request body, such as `#/address/postcode` or `/items/2/qty`. That pointer is exactly what a form needs to place an error on a field.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the Problem Details members type, title, status, detail, instance and an errors extension, with what each means and how a form client uses it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Problem Details members and how a form uses them</title>
  <desc>The type URI identifies the problem kind and is what the client switches on. The title is a short summary of the type, usable as a banner heading. The status repeats the HTTP status. The detail explains this occurrence and suits a form-level message. The instance identifies the occurrence for support. An errors extension lists individual problems, each with a detail and a JSON Pointer into the request body that the client maps to a field.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Member</text>
  <text x="160.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Meaning</text>
  <text x="403.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Form client uses it to</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">type</text>
  <text x="160.5" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">problem kind (URI)</text>
  <text x="403.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">choose how to handle it</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">title</text>
  <text x="160.5" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">summary of the kind</text>
  <text x="403.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">banner heading</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">status</text>
  <text x="160.5" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">HTTP status</text>
  <text x="403.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">sanity check</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">detail</text>
  <text x="160.5" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">this occurrence</text>
  <text x="403.1" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">form-level message</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">instance</text>
  <text x="160.5" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">occurrence id</text>
  <text x="403.1" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">show a reference for support</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">errors[] (extension)</text>
  <text x="160.5" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">detail + pointer each</text>
  <text x="403.1" y="209.0" font-size="9.5" fill="#2d6342" font-family="inherit">place errors on fields</text>
</svg>

---

## The core pattern: a validation problem type and a routing client

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation",
  "title": "Your request has invalid fields.",
  "status": 422,
  "detail": "2 fields need attention.",
  "instance": "/requests/9f2c1e",
  "errors": [
    { "pointer": "#/email", "detail": "That email is used by another account.", "code": "email_taken" },
    { "pointer": "#/items/2/qty", "detail": "Only 3 left in stock.", "code": "stock_limit" }
  ]
}
```

```typescript
export interface Problem {
  type?: string; title?: string; status?: number; detail?: string; instance?: string;
  errors?: { pointer?: string; detail: string; code?: string }[];
  [ext: string]: unknown;
}

export type Routed =
  | { kind: "fields"; fields: { path: (string | number)[]; message: string; code?: string }[]; unplaced: string[] }
  | { kind: "conflict"; message: string }
  | { kind: "retryable"; message: string; retryAfterMs?: number; reference?: string }
  | { kind: "form"; message: string; reference?: string };

const T = {
  validation: "https://api.example.com/problems/validation",
  conflict: "https://api.example.com/problems/edit-conflict",
  rateLimited: "https://api.example.com/problems/rate-limited",
};

// "#/items/2/qty" or "/items/2/qty" → ["items", 2, "qty"]  (RFC 6901 unescaping)
export function pointerToPath(pointer: string): (string | number)[] {
  const p = pointer.startsWith("#") ? decodeURIComponent(pointer.slice(1)) : pointer;
  return p.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~")).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

export async function routeProblem(res: Response, knownPaths: Set<string>): Promise<Routed> {
  const isProblem = (res.headers.get("Content-Type") ?? "").includes("application/problem+json");
  const body: Problem = isProblem ? await res.json().catch(() => ({})) : {};
  const reference = body.instance;

  if (body.type === T.validation && body.errors) {
    const fields: { path: (string | number)[]; message: string; code?: string }[] = [];
    const unplaced: string[] = [];
    for (const e of body.errors) {
      const path = e.pointer ? pointerToPath(e.pointer) : [];
      // Only place errors on fields the form actually renders; the rest go to the summary.
      if (path.length && knownPaths.has(path.join("."))) fields.push({ path, message: e.detail, code: e.code });
      else unplaced.push(e.detail);
    }
    return { kind: "fields", fields, unplaced };
  }
  if (body.type === T.conflict || res.status === 409) {
    return { kind: "conflict", message: body.detail ?? "This record was changed by someone else." };
  }
  if (body.type === T.rateLimited || res.status === 429 || res.status >= 500) {
    const ra = Number(res.headers.get("Retry-After"));
    return { kind: "retryable", message: body.detail ?? "Something went wrong on our side. Please try again.",
             retryAfterMs: Number.isFinite(ra) ? ra * 1000 : undefined, reference };
  }
  return { kind: "form", message: body.detail ?? body.title ?? "We couldn't save your changes.", reference };
}
```

---

## Step-by-step walkthrough

1. **Define problem types as URIs you own.** `…/problems/validation`, `…/problems/edit-conflict`, `…/problems/rate-limited`. Ideally they resolve to documentation for developers.
2. **Return validation failures with a stable `errors` extension.** Each entry has a JSON Pointer to the offending input and a user-facing `detail`, plus a machine `code` for translation.
3. **Set `application/problem+json`.** Clients detect the format by media type, not by guessing at body shape.
4. **Switch on `type` in the client.** Validation problems go to fields; conflicts go to reconciliation (see [handling 409 conflicts on form submit](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/handling-409-conflicts-on-form-submit/)); rate limits and 5xx become retryable banners; anything else is a form-level message.
5. **Convert pointers to form paths and check they exist.** Errors for fields the form does not render go to the summary instead of disappearing.
6. **Show `instance` as a reference on unexpected errors.** "Reference 9f2c1e" lets support find the server log.

### Why a standard format pays off in the form layer

The value of Problem Details is not the specific member names; it is that every endpoint returns errors the same way, so one client function handles them all. Without that, each form's submit handler grows bespoke parsing for its endpoint's quirks, and the handling of rarer cases — conflicts, rate limits, unexpected 500s — is inconsistent or missing. With a standard envelope and a small set of problem types, the routing logic lives in one tested module, and every form gets correct field placement, conflict handling and retry banners for free.

<svg viewBox="0 0 680 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow that routes a Problem Details response by its type — validation, conflict, rate limited or server error — to field errors, conflict resolution, a retryable banner or a form-level message." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Routing a problem response</title>
  <desc>If the type is validation, map each error&#x27;s JSON pointer to a field and send unknown pointers to the summary. If the type is edit conflict or the status is 409, start conflict reconciliation. If the type is rate limited or the status is 429 or 5xx, show a retryable banner honouring Retry-After. Otherwise show a form-level message with the instance as a reference.</desc>
  <rect x="0" y="0" width="680" height="308" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">type = validation?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Place errors on fields</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">type = edit-conflict or 409?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Conflict reconciliation</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">rate-limited, 429 or 5xx?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Retryable banner</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Form-level message</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">detail or title; show instance as reference.</text>
</svg>

---

## Failure modes and edge cases

### 1. Parsing HTML error pages as problems

Proxies and load balancers return HTML for 502 and 504. Check the `Content-Type` before parsing, and treat non-problem responses by status alone.

### 2. Pointers to renamed fields

If the API names a field `postal_code` and the form uses `postcode`, pointers will not match. Map API paths to form paths in one place — the normalisation described in [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/) — rather than in each form.

### 3. Indices after reorder

A pointer like `#/items/2/qty` refers to the order that was sent. Translate with a snapshot of that order, as in [keeping array errors aligned after reorder and delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/).

### 4. Leaking internals in `detail`

`detail` is shown to users; never put stack traces, SQL or internal ids in it. Log those server-side against the `instance`.

### 5. Localisation

`title` and `detail` are human-readable and should follow the request's `Accept-Language`, or the client should translate from `code`. Mixed-language screens — English server messages in a German form — are a common symptom of skipping this.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a form submit receiving a validation problem that is placed on fields, then after a fix a rate-limited problem shown as a retryable banner, then success." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One submit, three kinds of problem</title>
  <desc>The form submits and receives a validation problem with two errors; the client places them on the email field and the third line item. The user fixes both and submits again; the server responds with a rate-limited problem and Retry-After, and the client shows a retryable banner while keeping all input. After the wait, the retry succeeds.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Problem router</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">API</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">POST /orders</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">422 validation: #/email, #/items/2/qty</text>
  <path d="M557.3,97.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,93.0 341.0,97.0 348.0,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">errors on email and item 3</text>
  <path d="M340.0,125.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,121.0 123.7,125.0 130.7,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">POST /orders (fixed)</text>
  <path d="M122.7,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">429 rate-limited, Retry-After: 5</text>
  <path d="M557.3,181.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,177.0 341.0,181.0 348.0,185.0" fill="#7b4f8a"/>
  <text x="130.7" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">retryable banner; input kept</text>
  <path d="M340.0,209.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,205.0 123.7,209.0 130.7,213.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] Every error response from form endpoints uses `application/problem+json`.
- [ ] Validation problems list each error with a JSON Pointer and a user-facing detail.
- [ ] The client routes on `type`, with status as a fallback.
- [ ] Pointers are converted to form paths; unknown paths appear in the summary.
- [ ] Conflicts, rate limits and 5xx each have distinct handling.
- [ ] Non-problem (HTML) error responses are handled by status without parse errors.
- [ ] `detail` never contains internal information; `instance` is shown as a support reference.
- [ ] Messages follow the user's language.

---

## Frequently Asked Questions

<details>
<summary><strong>Is 422 or 400 the right status for validation errors?</strong></summary>

Both are used. 422 Unprocessable Content signals that the request was well-formed but semantically invalid, which fits form validation well; 400 is common for malformed bodies. Pick one convention for validation and keep 400 for requests the server could not parse at all.

</details>

<details>
<summary><strong>Is the errors array part of the standard?</strong></summary>

It is an extension member. RFC 9457 shows a validation example with an `errors` array of objects carrying `detail` and `pointer`, but extension names are up to the API. Document yours alongside the problem type URI.

</details>

<details>
<summary><strong>Do framework error formats map onto this?</strong></summary>

Many do or can: ASP.NET Core produces Problem Details natively (with a `errors` dictionary keyed by field name), Spring supports `ProblemDetail`, and other frameworks have middleware. Normalise their field keys to your pointer format in the client router.

</details>

---

## Related

- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
- [Mapping 422 Responses to Field Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/)
- [Clearing Server Errors When a Field Changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/)

← [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
