---
layout: page.njk
title: "Sharing One Zod Schema Between Client and Server"
description: "Put form validation rules in one package used by the browser and the API: structuring shared schemas, keeping server-only rules out of the bundle, returning issues in a shape the client maps back, versioning when client and server deploy separately, and bundle-size care."
slug: sharing-one-zod-schema-between-client-and-server
type: howto
breadcrumb: "Shared Client/Server Schema"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Sharing One Zod Schema Between Client and Server"
  parent: "Server Error Reconciliation"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Sharing One Zod Schema Between Client and Server",
      "description": "Put form validation rules in one package used by the browser and the API: structuring shared schemas, keeping server-only rules out of the bundle, returning issues in a shape the client maps back, versioning when client and server deploy separately, and bundle-size care.",
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
          "name": "Sharing One Zod Schema Between Client and Server",
          "item": "https://client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Share a Zod schema between the browser form and the API",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Create a dependency-free schema module"
        },
        {
          "@type": "HowToStep",
          "name": "Export inferred types alongside schemas"
        },
        {
          "@type": "HowToStep",
          "name": "Parse request bodies with the shared schema on the server"
        },
        {
          "@type": "HowToStep",
          "name": "Layer server-only rules after parsing"
        },
        {
          "@type": "HowToStep",
          "name": "Send issues in a wire format, not a ZodError"
        },
        {
          "@type": "HowToStep",
          "name": "Version the schema when deployments can skew"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I share schemas between a TypeScript frontend and a non-JavaScript backend?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not directly. Generate a JSON Schema from the Zod schema (with a converter) and validate with a JSON Schema library on the backend, or the reverse — author JSON Schema and validate it in the browser, as in JSON Schema validation in the browser with Ajv."
          }
        },
        {
          "@type": "Question",
          "name": "Should the server trust that the client already validated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Never. The client's validation is for the user's benefit. Anyone can send requests without the client, so the server parses and checks everything as if no client-side validation existed."
          }
        },
        {
          "@type": "Question",
          "name": "How do tRPC or server actions change this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They make sharing implicit: the procedure's input schema is imported by the client for types and can be used for form validation directly. The same rules apply — keep server-only checks inside the procedure and return issues in a shape the form maps back."
          }
        }
      ]
    }
  ]
}
</script>

# Sharing One Zod Schema Between Client and Server

When the browser and the API each have their own copy of the validation rules, they drift: the client allows a 60-character display name, the server caps it at 50, and users get past every client check only to see "Something went wrong" — or worse, the server accepts data the client would have rejected and the UI cannot display it.

A shared schema module fixes the drift by construction: the same rules run in the form for instant feedback and in the API for authority, and the server's issues come back in a shape the client already understands. This page, part of [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/), covers how to structure the shared module, what must stay server-only, and how to handle client and server deploying at different times.

---

## Context and prerequisites

What "sharing" means in practice:

- **One module** exports the schemas (`src/shared/schemas/profile.ts`) with no imports from browser-only or server-only code — no DOM, no database clients, no environment secrets.
- **The client** imports it for form validation, typically via a resolver or `safeParse` on blur and submit.
- **The server** imports it to parse request bodies, then applies server-only rules (uniqueness, permissions, rate limits) on top.
- **Issues travel back** in a stable format — path and code, optionally message — so the client can place them on fields without guessing, as in [mapping 422 responses to field errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/).

Monorepos make this easy (a workspace package); separate repos can publish a small versioned package.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of a shared schema module used by the browser form for instant feedback, by the API handler for authoritative parsing, and by generated TypeScript types for both, with server-only rules layered only on the server." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One schema module, three consumers</title>
  <desc>The shared schema module contains shapes and per-field rules with no browser or server dependencies. The browser form imports it for validation on blur and submit. The API handler imports it to parse request bodies and then applies server-only checks such as uniqueness and permissions. TypeScript types inferred from the schema are used by both the form state and the API client, so a field renamed in one place fails to compile everywhere it is used.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Browser form</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">safeParse on blur/submit.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Instant feedback.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Shared module</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Shapes + per-field rules.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No DOM, no DB, no secrets.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Inferred types.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">API handler</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">safeParse the body.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Then server-only rules.</text>
</svg>

---

## The core pattern: a shared module, a server layer, a transport format

```typescript
// packages/schemas/src/profile.ts — imported by BOTH sides
import { z } from "zod";

export const ProfileInput = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(50, "Use 50 characters or fewer."),
  email: z.string().trim().toLowerCase().email("Enter an email like name@example.com."),
  website: z.string().trim().url("Enter a full web address, like https://example.com.").optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

// A stable, serialisable issue shape for the wire. No ZodError across HTTP.
export interface WireIssue { path: string; code: string; message: string }
export const toWireIssues = (e: z.ZodError): WireIssue[] =>
  e.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message }));

// Bump when a change would make old clients and new servers disagree.
export const PROFILE_SCHEMA_VERSION = 3;
```

```typescript
// server: apps/api/src/routes/profile.ts
import { ProfileInput, toWireIssues, type WireIssue, PROFILE_SCHEMA_VERSION } from "@acme/schemas/profile";

export async function putProfile(req: Request, userId: string): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = ProfileInput.safeParse(body);
  if (!parsed.success) return json(422, { issues: toWireIssues(parsed.error), schemaVersion: PROFILE_SCHEMA_VERSION });

  // Server-only rules live HERE, never in the shared module.
  const issues: WireIssue[] = [];
  if (await emailUsedByAnother(parsed.data.email, userId)) {
    issues.push({ path: "email", code: "email_taken", message: "That email is used by another account." });
  }
  if (issues.length) return json(422, { issues, schemaVersion: PROFILE_SCHEMA_VERSION });

  await saveProfile(userId, parsed.data);
  return json(200, { profile: parsed.data });
}
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
declare function emailUsedByAnother(e: string, id: string): Promise<boolean>;
declare function saveProfile(id: string, d: unknown): Promise<void>;
```

```typescript
// client: apps/web/src/profile/submit.ts
import { ProfileInput, type WireIssue } from "@acme/schemas/profile";

export async function submitProfile(values: unknown, setFieldError: (path: string, msg: string) => void) {
  const local = ProfileInput.safeParse(values);          // same rules, instant
  if (!local.success) { local.error.issues.forEach((i) => setFieldError(i.path.join("."), i.message)); return; }
  const res = await fetch("/api/profile", { method: "PUT", body: JSON.stringify(local.data) });
  if (res.status === 422) {
    const { issues } = (await res.json()) as { issues: WireIssue[] };
    issues.forEach((i) => setFieldError(i.path, i.message));   // same paths, same field names
  }
}
```

---

## Step-by-step walkthrough

1. **Create a dependency-free schema module.** Only the validation library is imported. Anything touching the database, the DOM or secrets stays out.
2. **Export inferred types alongside schemas.** Form state, API clients and handlers use `z.infer`, so a renamed field breaks the build everywhere it is used.
3. **Parse request bodies with the shared schema on the server.** The server's first check is identical to the client's last check; divergence becomes impossible for those rules.
4. **Layer server-only rules after parsing.** Uniqueness, ownership, quotas and rate limits require server state, and their messages use the same issue format.
5. **Send issues in a wire format, not a `ZodError`.** Path as a dotted string, a code, and a message. The client places them by path without knowing whether the schema or the database produced them.
6. **Version the schema when deployments can skew.** Include a schema version in error responses; if the client sees a newer version, it can prompt a reload rather than rendering issues for fields it does not know.

### Why server-only rules must stay out of the shared module

It is tempting to put "email must be unique" in the shared schema as an async refinement that calls an API. On the server that refinement would call itself over HTTP, or need a second implementation; on the client it would run network checks during every local validation, including on each keystroke if validation is live. It also drags server concerns — endpoints, auth headers — into a module that should be pure. Keep the shared module to rules that can be decided from the value alone, and let each side add the context-dependent rules it is able to evaluate: the client adds debounced availability hints, the server adds the authoritative check.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table assigning validation rules to the shared schema, the server only, or the client only, with the reason." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where each rule lives</title>
  <desc>Required fields, length limits, formats and enums belong in the shared schema because they depend only on the value. Uniqueness, ownership, permissions and quotas belong only on the server because they depend on stored data. Availability hints while typing, typo suggestions and unsaved-change warnings belong only on the client because they are user-experience helpers.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Rule</text>
  <text x="241.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Lives in</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">required, length, format, enum</text>
  <text x="241.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">shared</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">depends only on the value</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">uniqueness, ownership, quotas</text>
  <text x="241.3" y="91.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">server only</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">needs stored data and auth</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">availability hints, typo suggestions</text>
  <text x="241.3" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">client only</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">UX helpers; server re-checks</text>
</svg>

---

## Failure modes and edge cases

### 1. Bundle size

A shared schema module pulls the validation library into the client bundle. Zod is moderately sized; if bundle size is critical, consider a smaller library, per [Zod vs Yup vs Valibot bundle size and performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/), or code-split the form.

### 2. Transforms that differ by side

`.transform()` in a shared schema runs on both sides. A transform that formats a phone number for display is harmless; one that hashes a password or reads the clock produces different results. Keep transforms deterministic and side-agnostic.

### 3. Deploy skew

If the server deploys a stricter rule before clients reload, users with old tabs pass client validation and fail server validation — still correctly, because the server is authoritative, and the issue maps to the right field. The reverse (a looser server) is harmless. Skew only becomes a problem when a field is renamed; handle that with versioned endpoints or a reload prompt.

### 4. Coercion differences

The client parses strings from inputs; the server parses JSON with real numbers. If the shared schema coerces, the server becomes lenient too. Keep coercion in a client-side form layer, as in [coercing form strings with Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/).

### 5. Messages and locale

Shared schemas with English messages give server responses in English regardless of the user. Either translate on the client from codes, or apply a locale-aware error map on the server, per [custom Zod error maps and localised messages](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/custom-zod-error-maps-and-localised-messages/).

<svg viewBox="0 0 680 159" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a stricter display name limit deployed to the server before an open browser tab reloads, the old client passing local validation, the server returning a 422 on the correct path, and the client displaying it on the field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A rule change deployed server-first</title>
  <desc>The server deploys schema version three, lowering the display name limit from sixty to fifty characters. An old browser tab still runs version two and accepts a 55 character name locally. The server parses the body with version three, rejects it with a 422 issue on the displayName path and schema version three. The client places the message on the display name field; because the response&#x27;s schema version is newer, it also suggests reloading to get the latest form.</desc>
  <rect x="0" y="0" width="680" height="159" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="310.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="177.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Old client (v2)</text>
  <rect x="348.0" y="12.0" width="310.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="503.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server (v3)</text>
  <path d="M177.0,41.0 V143.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M503.0,41.0 V143.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="185.0" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">PUT displayName (55 chars) — passed v2 rules</text>
  <path d="M177.0,69.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,65.0 502.0,69.0 495.0,73.0" fill="#7b4f8a"/>
  <text x="185.0" y="93.0" font-size="9.5" fill="#a63d6f" font-family="inherit">422 { path: displayName, schemaVersion: 3 }</text>
  <path d="M503.0,97.0 H185.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="185.0,93.0 178.0,97.0 185.0,101.0" fill="#7b4f8a"/>
  <text x="185.0" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">client: show on field + suggest reload</text>
  <path d="M503.0,125.0 H185.0" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="185.0,121.0 178.0,125.0 185.0,129.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] One module defines the rules; neither side has its own copy.
- [ ] The shared module imports nothing browser- or server-specific.
- [ ] The server parses every request body with the shared schema before other logic.
- [ ] Server-only rules return issues in the same wire format.
- [ ] Client code places server issues by path without special cases.
- [ ] Coercion lives in the client form layer, not in the shared schema.
- [ ] Error responses include a schema version for deploy-skew handling.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I share schemas between a TypeScript frontend and a non-JavaScript backend?</strong></summary>

Not directly. Generate a JSON Schema from the Zod schema (with a converter) and validate with a JSON Schema library on the backend, or the reverse — author JSON Schema and validate it in the browser, as in [JSON Schema validation in the browser with Ajv](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/json-schema-validation-in-the-browser-with-ajv/).

</details>

<details>
<summary><strong>Should the server trust that the client already validated?</strong></summary>

Never. The client's validation is for the user's benefit. Anyone can send requests without the client, so the server parses and checks everything as if no client-side validation existed.

</details>

<details>
<summary><strong>How do tRPC or server actions change this?</strong></summary>

They make sharing implicit: the procedure's input schema is imported by the client for types and can be used for form validation directly. The same rules apply — keep server-only checks inside the procedure and return issues in a shape the form maps back.

</details>

---

## Related

- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
- [Returning Validation Errors From Next.js Server Actions](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/returning-validation-errors-from-nextjs-server-actions/)
- [Standard Schema for Library-Agnostic Forms](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/)

← [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
