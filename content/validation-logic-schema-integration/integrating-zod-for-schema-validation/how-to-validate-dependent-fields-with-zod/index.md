---
layout: page.njk
title: "How to Validate Dependent Fields with Zod"
description: "Use Zod .superRefine() to implement cross-field validation constraints — password confirmation, date ranges, conditional requirements — with full TypeScript type safety and per-field ARIA error wiring."
slug: how-to-validate-dependent-fields-with-zod
type: long_tail
breadcrumb: "How to Validate Dependent Fields with Zod"
datePublished: "2024-11-01"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "How to Validate Dependent Fields with Zod"
  parent: "Integrating Zod for Schema Validation"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "How to Validate Dependent Fields with Zod",
      "description": "Use Zod .superRefine() to implement cross-field validation constraints — password confirmation, date ranges, conditional requirements — with full TypeScript type safety and per-field ARIA error wiring.",
      "datePublished": "2024-11-01",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Integrating Zod for Schema Validation", "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/" },
        { "@type": "ListItem", "position": 4, "name": "How to Validate Dependent Fields with Zod", "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to Validate Dependent Fields with Zod",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Define the base object schema", "text": "Declare all interdependent fields inside a single z.object() so Zod can see their values simultaneously during refinement." },
        { "@type": "HowToStep", "position": 2, "name": "Chain .superRefine() for multi-field rules", "text": "Use ctx.addIssue() with an explicit path array to attach each error to the correct field rather than the schema root." },
        { "@type": "HowToStep", "position": 3, "name": "Map ZodError paths to form state", "text": "Flatten issue.path arrays into dot-separated keys and write them to a field-error map your UI components consume." },
        { "@type": "HowToStep", "position": 4, "name": "Wire ARIA attributes on each input", "text": "Set aria-invalid and aria-describedby on each control based on the error map; use aria-live='polite' on the error container." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I target a specific field in a superRefine callback?",
          "acceptedAnswer": { "@type": "Answer", "text": "Pass path: ['fieldName'] inside ctx.addIssue(). The path array maps directly to the key the error map uses to match inputs." }
        },
        {
          "@type": "Question",
          "name": "Does superRefine run synchronously or asynchronously?",
          "acceptedAnswer": { "@type": "Answer", "text": "Synchronously inside .safeParse() / .parse(). For async work use an async callback and call .safeParseAsync()." }
        },
        {
          "@type": "Question",
          "name": "How do I handle optional dependent fields?",
          "acceptedAnswer": { "@type": "Answer", "text": "Mark the field .optional() in the base schema and add an explicit undefined guard at the top of the superRefine callback before comparing values." }
        },
        {
          "@type": "Question",
          "name": "Can I chain multiple .superRefine() calls on the same schema?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Each call runs in order; returning z.NEVER from one stops execution of subsequent refinements for that parse attempt." }
        }
      ]
    }
  ]
}
</script>

# How to Validate Dependent Fields with Zod

**The problem this page solves:** `.refine()` attaches its error to the schema root (or a single path you hard-code up front), so when two fields must agree — a password and its confirmation, a date range's start and end, a conditional billing address — the error lands in the wrong place and the per-field inline feedback breaks. `.superRefine()` fixes this by letting you call `ctx.addIssue()` with any `path` you choose, including multiple paths in one callback.

This page covers the exact `superRefine` workflow. Before reading further, make sure you understand how schemas feed into the broader [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) adapter layer, because the refinements here slot into that pipeline's `safeParse` call-site.

---

## The field-dependency validation flow

The diagram below shows what happens from user input through `superRefine` to per-field ARIA state. Every step is synchronous unless you explicitly use `.safeParseAsync()`.

<svg role="img" aria-label="Data flow: user input triggers safeParse, superRefine compares dependent fields, errors map to ARIA state" viewBox="0 0 660 260" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:660px;display:block;margin:1.5rem auto;">
  <title>Dependent field validation flow</title>
  <desc>A left-to-right flow diagram showing: user input event leads to safeParse call, which runs field-level checks then superRefine cross-field checks, then either returns valid data or a ZodError that gets mapped to a field-error record, which updates aria-invalid and aria-describedby on each input.</desc>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor"/>
    </marker>
  </defs>
  <!-- boxes -->
  <rect x="8" y="100" width="100" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="58" y="118" text-anchor="middle" font-size="12" fill="currentColor">User input</text>
  <text x="58" y="134" text-anchor="middle" font-size="11" fill="currentColor">event</text>
  <rect x="140" y="100" width="110" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="195" y="118" text-anchor="middle" font-size="12" fill="currentColor">safeParse()</text>
  <text x="195" y="134" text-anchor="middle" font-size="11" fill="currentColor">field-level rules</text>
  <rect x="282" y="58" width="116" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="340" y="76" text-anchor="middle" font-size="12" fill="currentColor">superRefine()</text>
  <text x="340" y="92" text-anchor="middle" font-size="11" fill="currentColor">cross-field rules</text>
  <rect x="282" y="150" width="116" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="340" y="168" text-anchor="middle" font-size="12" fill="currentColor">result.success</text>
  <text x="340" y="184" text-anchor="middle" font-size="11" fill="currentColor">parsed data</text>
  <rect x="430" y="100" width="110" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="485" y="118" text-anchor="middle" font-size="12" fill="currentColor">Error map</text>
  <text x="485" y="134" text-anchor="middle" font-size="11" fill="currentColor">path → message</text>
  <rect x="552" y="100" width="100" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="602" y="118" text-anchor="middle" font-size="11" fill="currentColor">aria-invalid</text>
  <text x="602" y="134" text-anchor="middle" font-size="11" fill="currentColor">aria-describedby</text>
  <!-- arrows -->
  <line x1="108" y1="122" x2="138" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="250" y1="110" x2="280" y2="82" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="250" y1="134" x2="280" y2="160" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="398" y1="82" x2="428" y2="114" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="398" y1="162" x2="428" y2="130" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <line x1="540" y1="122" x2="550" y2="122" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <!-- labels on branch arrows -->
  <text x="258" y="100" text-anchor="middle" font-size="10" fill="currentColor">fail</text>
  <text x="258" y="152" text-anchor="middle" font-size="10" fill="currentColor">pass</text>
</svg>

---

## Core pattern: `.superRefine()` with targeted `ctx.addIssue()`

The complete implementation below covers three archetypal cases — password confirmation, date range ordering, and conditional field requirement — in a single runnable file.

```typescript
import { z } from 'zod';

// ─── 1. Password confirmation ──────────────────────────────────────────────
export const PasswordConfirmSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    // confirmPassword has no independent constraint; the cross-field rule owns the message
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        // path targets the specific input that should display the error
        path: ['confirmPassword'],
      });
    }
  });

// ─── 2. Date range ────────────────────────────────────────────────────────
export const DateRangeSchema = z
  .object({
    startDate: z.coerce.date({ invalid_type_error: 'Start date is required' }),
    endDate: z.coerce.date({ invalid_type_error: 'End date is required' }),
  })
  .superRefine((data, ctx) => {
    // Guard: if either date failed its own parse, skip comparison
    // (Zod will have already attached its own type error for that field)
    if (!(data.startDate instanceof Date) || !(data.endDate instanceof Date)) return;

    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must come after start date',
        path: ['endDate'],
      });
    }
  });

// ─── 3. Conditional requirement (shipping vs. billing address) ────────────
export const AddressSchema = z
  .object({
    // shippingAddress is always required
    shippingAddress: z.string().min(1, 'Shipping address is required'),
    // billingAddress is required only when useSeparateBilling is true
    useSeparateBilling: z.boolean(),
    billingAddress: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.useSeparateBilling && !data.billingAddress?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Billing address is required when using a separate billing address',
        path: ['billingAddress'],
      });
    }
  });

// ─── 4. Chained refinements (order matters) ───────────────────────────────
// Each .superRefine() runs in sequence; returning z.NEVER stops the chain.
export const RegistrationSchema = z
  .object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    termsAccepted: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  })
  .superRefine((data, ctx) => {
    // This refinement still runs even if the first one added an issue,
    // because we did NOT return z.NEVER above.
    if (!data.termsAccepted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must accept the terms and conditions',
        path: ['termsAccepted'],
      });
    }
  });
```

---

## Step-by-step walkthrough

**Step 1 — Wrap all interdependent fields in a single `z.object()`.**
`superRefine` receives the fully parsed object as its first argument. If your dependent fields live in separate schemas, merge them with `z.object().merge()` or use `z.intersection()` before chaining the refinement.

**Step 2 — Choose `.superRefine()` over `.refine()`.**
`.refine()` accepts one `path` option set at call-time and cannot vary per issue. If your callback needs to attach errors to different fields based on runtime values — e.g., flag both `startDate` and `endDate` as invalid — only `.superRefine()` lets you call `ctx.addIssue()` multiple times with different paths.

**Step 3 — Guard against upstream parse failures before comparing.**
Field-level errors (wrong type, missing required value) are collected first. Your refinement callback still executes, but the dependent values may be `undefined` if a field failed its own parse. Check explicitly before comparing — `if (!data.startDate || !data.endDate) return;` — to avoid misleading cross-field error messages on top of already-reported type errors.

**Step 4 — Return `z.NEVER` only to halt the chain.**
Returning `z.NEVER` from a `.superRefine()` callback prevents any subsequent `.superRefine()` from running in the same parse attempt. Omit the return value (or `return;`) when downstream refinements should still execute regardless of earlier failures.

**Step 5 — Always use `.safeParse()` at the call-site.**
Never call `.parse()` in a UI event handler. It throws on failure and crashes the render cycle. `.safeParse()` returns a discriminated union (`{ success: true, data }` or `{ success: false, error }`); your error-mapping function consumes the `.error` branch.

---

## Mapping ZodError paths to UI state

The `issue.path` array from a `superRefine` refinement is exactly what you set in `ctx.addIssue({ path: [...] })`. Flatten it to a dot-separated string to match your form field identifiers:

```typescript
import { z } from 'zod';

export type FieldErrors = Record<string, string>;

/**
 * Converts a ZodError into a flat map of fieldPath → firstErrorMessage.
 * Works for both field-level errors and cross-field superRefine issues.
 */
export function zodErrorToFieldMap(error: z.ZodError): FieldErrors {
  const map: FieldErrors = {};

  for (const issue of error.issues) {
    // Nested paths (e.g. ['address', 'street']) become 'address.street'
    const key = issue.path.length > 0 ? issue.path.join('.') : 'root';
    // First error per path wins — redundant messages only add noise
    if (!map[key]) {
      map[key] = issue.message;
    }
  }

  return map;
}

// Usage inside a form submit handler:
function handleSubmit(rawValues: unknown): void {
  const result = PasswordConfirmSchema.safeParse(rawValues);

  if (!result.success) {
    const errors = zodErrorToFieldMap(result.error);
    // errors.confirmPassword → 'Passwords do not match'
    applyErrorsToDOM(errors);
    return;
  }

  // result.data is fully typed: { password: string, confirmPassword: string }
  submitToServer(result.data);
}
```

Apply the resulting map to each input's ARIA attributes. Pair [mapping validation errors to UI components](/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/) with a live region on the error container so screen readers announce messages without interrupting typing:

```typescript
/**
 * Wires or clears ARIA error attributes on a single input.
 * Call after every safeParse that touches this field.
 */
function syncFieldAria(
  inputEl: HTMLInputElement,
  errorId: string,
  errorMessage: string | undefined
): void {
  if (errorMessage) {
    inputEl.setAttribute('aria-invalid', 'true');
    // errorId must match the id of the element containing errorMessage
    inputEl.setAttribute('aria-describedby', errorId);
  } else {
    inputEl.removeAttribute('aria-invalid');
    inputEl.removeAttribute('aria-describedby');
  }
}
// Set aria-live="polite" on the error container in HTML so announcements
// don't interrupt the user while they are still typing.
```

---

## Failure modes and edge cases

**Refinement fires but error appears on the wrong field.**
You passed `path: ['fieldname']` but the field name in your form state uses a different key (camelCase vs. snake_case, or a nested path you forgot to join). Log `error.issues` directly after `safeParse` and compare `.path` values against your form field registry before assuming the refinement is broken.

**Both fields show "required" errors AND the cross-field error fires simultaneously.**
This is expected behaviour: Zod runs field-level checks first, then the refinement. Add a guard at the top of your `superRefine` callback that returns early when upstream fields are missing or invalid — `if (!data.startDate || !data.endDate) return;`. Without this guard you get stacked errors that confuse users.

**Cross-field error does not clear after the user fixes the input.**
You are only running `safeParse` on blur, but the user fixed the issue via keyboard without triggering another blur. Add an `onChange` handler that re-runs `safeParse` and updates the error map; the performance cost is negligible for synchronous schemas. For expensive schemas, debounce `onChange` to 200 ms.

**Stale `.refine()` output persists after a programmatic form reset.**
When you call a reset function that clears input values programmatically, the error map does not update automatically unless you also re-run `safeParse` against the cleared data. On reset, call `schema.safeParse(emptyDefaults)` and write the (empty) result to your error state. This aligns with how [dirty and pristine state tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) distinguishes user-driven from programmatic mutations.

**Using `.transform()` inside the schema before `.superRefine()`.**
`.transform()` changes the output type, and any `.superRefine()` chained after it operates on the *transformed* type, not the raw input. If you need to compare raw input values (e.g., the literal strings the user typed), place `.superRefine()` before `.transform()`, or apply transformations in a separate step after validation.

---

## Verification checklist

- `superRefine` callback guards against `undefined` before comparing dependent values
- `ctx.addIssue()` uses the correct `path` array matching form field identifiers
- Call-site uses `.safeParse()` (never `.parse()`) inside UI event handlers
- `zodErrorToFieldMap` output keys match the `name` or `id` of each input
- Each errored input has `aria-invalid="true"` and a matching `aria-describedby`
- Error container has `aria-live="polite"` so screen readers announce messages
- Form reset re-runs `safeParse` with empty defaults and clears the error map
- Tested in Chrome, Firefox, and Safari — VoiceOver/NVDA announce errors correctly
- No `.transform()` placed before `.superRefine()` when you need raw value access

---

## FAQ

**How do I target a specific field in a `superRefine` callback?**
Pass `path: ['fieldName']` inside `ctx.addIssue()`. The path array is what your error-mapping function joins into a dot-separated key; it must exactly match the key your UI uses for that control. For nested schemas, use `['parentKey', 'childKey']`.

**Does `superRefine` run synchronously or asynchronously?**
Synchronously inside `.safeParse()` and `.parse()`. This makes validation deterministic and avoids race conditions in [asynchronous validation strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/) where you might otherwise interleave sync and async error state. When you need async refinements (e.g., a uniqueness check), pass an async callback and call `.safeParseAsync()` instead.

**How do I handle optional dependent fields?**
Apply `.optional()` to the field in the base schema and add an explicit `undefined` guard before any comparison: `if (data.billingAddress === undefined) return;`. Zod skips validation for missing optional keys at the field level, but your refinement callback still receives the full object — the optional field will simply be `undefined` in `data`.

**Can I chain multiple `.superRefine()` calls on the same schema?**
Yes. Each call runs in declaration order. If you `return z.NEVER` from a refinement, subsequent refinements in the chain are skipped for that parse attempt. Omit the return (or use `return;`) when you want all refinements to run independently and accumulate multiple errors in one pass.

---

## Related

- [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — the adapter layer that calls `safeParse` and feeds errors to UI state
- [Cross-Field Dependency Logic](/validation-logic-schema-integration/cross-field-dependency-logic/) — DAG-based dependency graphs for reactive multi-field re-validation
- [Mapping Validation Errors to UI Components](/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/) — error map patterns and ARIA wiring
- [Asynchronous Validation Strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/) — when cross-field rules require network round-trips

← [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
