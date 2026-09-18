---
layout: page.njk
title: "Integrating Zod for Schema Validation"
description: "Schema-to-state adapter architecture for wiring Zod into reactive form state with deterministic validation triggers, AbortController-safe async refinements, and normalised error propagation."
slug: "integrating-zod-for-schema-validation"
type: topic
breadcrumb: "Integrating Zod for Schema Validation"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Integrating Zod for Schema Validation"
  parent: "Validation Logic"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Integrating Zod for Schema Validation",
      "description": "Schema-to-state adapter architecture for wiring Zod into reactive form state with deterministic validation triggers, AbortController-safe async refinements, and normalised error propagation.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Integrating Zod for Schema Validation", "item": "https://client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Integrating Zod for Schema Validation",
      "step": [
        { "@type": "HowToStep", "name": "Define a Zod schema and TypeScript types", "text": "Author a z.object() schema with field-level refinements and cross-field .superRefine() rules." },
        { "@type": "HowToStep", "name": "Build a schema-to-state adapter", "text": "Write a validateFormState() function that calls safeParse and maps ZodError issues to a flat key-value error dictionary." },
        { "@type": "HowToStep", "name": "Wire validation to interaction lifecycle events", "text": "Attach lightweight onChange checks and full-schema onBlur evaluation; debounce to avoid main-thread saturation." },
        { "@type": "HowToStep", "name": "Add AbortController-safe async refinements", "text": "Cancel in-flight network checks on each new keystroke to eliminate stale result races." },
        { "@type": "HowToStep", "name": "Propagate errors to ARIA attributes", "text": "Set aria-invalid and aria-describedby so screen readers announce field errors on focus." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use Zod's .parse() or .safeParse() for form validation?",
          "acceptedAnswer": { "@type": "Answer", "text": "Always use .safeParse() in UI contexts. It returns a discriminated union instead of throwing, preventing uncaught exceptions that would crash the render cycle." }
        },
        {
          "@type": "Question",
          "name": "How do I handle async validation without blocking form submission?",
          "acceptedAnswer": { "@type": "Answer", "text": "Debounce input events, track pending promise state, cancel prior requests with AbortController, and disable the submit button until all async refinements resolve." }
        },
        {
          "@type": "Question",
          "name": "Can Zod schemas be shared with backend Node.js code?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Zod runs in both environments. Export schemas from a shared package workspace and add tsc --noEmit in CI to catch schema drift before it reaches production." }
        },
        {
          "@type": "Question",
          "name": "How do I test Zod-based form validation with Playwright?",
          "acceptedAnswer": { "@type": "Answer", "text": "Add data-testid attributes to each field and its error container, then assert on aria-invalid and the visible error text after interaction events in your Playwright test." }
        }
      ]
    }
  ]
}
</script>

# Integrating Zod for Schema Validation: Adapter Patterns and State Triggers

**The specific sub-problem:** form validation code that lets Zod's raw parse output reach framework component state directly — no adapter layer, no normalisation — produces inconsistent error shapes, swallows type coercion, and makes cross-field rules impossible to test in isolation. This page details a production adapter architecture that fixes all three failure modes.

This pattern is part of the broader [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/) pipeline. It assumes your project already has Zod installed and that you are working inside a TypeScript-compiled build.

---

## State Machine: Zod Validation Lifecycle

The diagram below shows the full state progression from user input to settled validation outcome. Every transition is driven by an explicit event — no implicit side effects, no fire-and-forget promises.

<svg viewBox="-6 84 682 172" role="img" aria-label="State machine diagram showing Zod validation lifecycle from IDLE through VALIDATING to VALID, INVALID, or RETRYABLE states" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;display:block;margin:2rem 0;">
  <title>Zod Validation Lifecycle State Machine</title>
  <desc>States: IDLE, VALIDATING (sync), ASYNC_PENDING, VALID, INVALID, RETRYABLE. Transitions triggered by onChange, onBlur, abort, resolve, reject, and network error.</desc>
  <rect x="-6" y="84" width="682" height="172" fill="#f9f5fb"/>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
    <style>
      .sm-box { fill: var(--svg-card, #ede5f2); stroke: var(--svg-stroke, #cbb8d9); stroke-width: 1.5; rx: 6; }
      .sm-active { fill: var(--svg-card-alt, #e2d6ec); stroke: var(--svg-accent, #7b4f8a); stroke-width: 2; rx: 6; }
      .sm-label { font: 600 12px/1.4 system-ui,sans-serif; fill: var(--svg-ink, #1e1a24); }
      .sm-sublabel { font: 400 10px/1.4 system-ui,sans-serif; fill: var(--svg-ink-muted, #6b5f75); }
      .sm-edge { stroke: var(--svg-accent, #7b4f8a); stroke-width: 1.2; fill: none; marker-end: url(#arrow); }
      .sm-edge-label { font: 400 9.5px/1.3 system-ui,sans-serif; fill: var(--svg-ink-muted, #6b5f75); }
    </style>
  </defs>
  <!-- IDLE -->
  <rect x="10" y="100" width="90" height="44" rx="6" class="sm-box"/>
  <text x="55" y="119" text-anchor="middle" class="sm-label">IDLE</text>
  <text x="55" y="133" text-anchor="middle" class="sm-sublabel">no errors</text>
  <!-- Arrow IDLE → VALIDATING -->
  <path d="M100,122 L158,122" class="sm-edge"/>
  <text x="129" y="116" text-anchor="middle" class="sm-edge-label">onChange</text>
  <!-- VALIDATING (sync) -->
  <rect x="158" y="100" width="110" height="44" rx="6" class="sm-box"/>
  <text x="213" y="119" text-anchor="middle" class="sm-label">VALIDATING</text>
  <text x="213" y="133" text-anchor="middle" class="sm-sublabel">safeParse running</text>
  <!-- Arrow VALIDATING → INVALID -->
  <path d="M213,144 L213,196 L318,196" class="sm-edge"/>
  <text x="248" y="190" text-anchor="middle" class="sm-edge-label">parse fail</text>
  <!-- Arrow VALIDATING → ASYNC_PENDING -->
  <path d="M268,122 L328,122" class="sm-edge"/>
  <text x="298" y="116" text-anchor="middle" class="sm-edge-label">sync OK</text>
  <!-- ASYNC_PENDING -->
  <rect x="328" y="100" width="116" height="44" rx="6" class="sm-box"/>
  <text x="386" y="119" text-anchor="middle" class="sm-label">ASYNC_PENDING</text>
  <text x="386" y="133" text-anchor="middle" class="sm-sublabel">AbortController live</text>
  <!-- Arrow ASYNC_PENDING → VALID -->
  <path d="M444,122 L506,122" class="sm-edge"/>
  <text x="475" y="116" text-anchor="middle" class="sm-edge-label">resolve OK</text>
  <!-- Arrow ASYNC_PENDING → RETRYABLE -->
  <path d="M386,144 L386,218 L570,218" class="sm-edge"/>
  <text x="480" y="213" text-anchor="middle" class="sm-edge-label">network error</text>
  <!-- Arrow ASYNC_PENDING → INVALID (async fail) -->
  <path d="M444,130 L502,148" class="sm-edge"/>
  <text x="480" y="138" text-anchor="middle" class="sm-edge-label">async fail</text>
  <!-- VALID -->
  <rect x="506" y="100" width="80" height="44" rx="6" class="sm-active"/>
  <text x="546" y="119" text-anchor="middle" class="sm-label">VALID</text>
  <text x="546" y="133" text-anchor="middle" class="sm-sublabel" style="fill: var(--svg-ink, #1e1a24)">submit enabled</text>
  <!-- INVALID -->
  <rect x="318" y="176" width="80" height="44" rx="6" class="sm-box"/>
  <text x="358" y="195" text-anchor="middle" class="sm-label">INVALID</text>
  <text x="358" y="209" text-anchor="middle" class="sm-sublabel">errors shown</text>
  <!-- RETRYABLE -->
  <rect x="570" y="196" width="90" height="44" rx="6" class="sm-box"/>
  <text x="615" y="215" text-anchor="middle" class="sm-label">RETRYABLE</text>
  <text x="615" y="229" text-anchor="middle" class="sm-sublabel">timeout / 5xx</text>
  <!-- Arrow INVALID → IDLE (user edits) -->
  <path d="M318,198 L55,198 L55,144" class="sm-edge"/>
  <text x="160" y="212" text-anchor="middle" class="sm-edge-label">onChange / reset</text>
  <!-- Arrow RETRYABLE → ASYNC_PENDING (retry) -->
  <path d="M615,196 L386,144" class="sm-edge"/>
  <text x="516" y="168" text-anchor="middle" class="sm-edge-label">retry</text>
</svg>

The key insight is that **ASYNC_PENDING always carries a live `AbortController`**. When the user types again, the prior controller is aborted before a new one is created — eliminating the stale-result race that breaks email-uniqueness checks in production.

---

## State Machine Specification Table

| State | Entry trigger | Allowed exits | Side effects |
|---|---|---|---|
| `IDLE` | Mount / reset | `onChange` → VALIDATING | Clear error map, re-enable submit |
| `VALIDATING` | `onChange` / `onBlur` | Parse fail → INVALID; pass → ASYNC_PENDING or VALID | Call `safeParse`; no network I/O |
| `ASYNC_PENDING` | Sync pass + async refinement exists | Resolve → VALID; async fail → INVALID; network error → RETRYABLE | Create `AbortController`, fire fetch |
| `VALID` | Async resolve success | `onChange` → VALIDATING | Enable submit button |
| `INVALID` | Parse fail or async fail | `onChange` → VALIDATING | Populate error map, set `aria-invalid` |
| `RETRYABLE` | Network timeout / 5xx | Manual retry → ASYNC_PENDING | Show retry UI, do not block indefinitely |

---

## Core Implementation

This is the complete, production-ready adapter. Every non-obvious line carries an inline comment.

```typescript
import { z, ZodTypeAny, ZodError } from 'zod';

// ─── Shared types ────────────────────────────────────────────────────────────

/** Flat key-value map: field path (dot-joined) → first error message */
export type FormErrors = Record<string, string>;

export interface ValidationResult<T> {
  isValid: boolean;
  errors: FormErrors;
  data?: T;          // present only when isValid === true
}

// ─── Schema definition ───────────────────────────────────────────────────────

export const UserFormSchema = z.object({
  email:           z.string().email('Please enter a valid email address'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).superRefine((data, ctx) => {
  // superRefine gives access to ctx.addIssue for multiple custom errors
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords must match',
      path: ['confirmPassword']
    });
  }
});

export type UserFormData = z.infer<typeof UserFormSchema>;

// ─── Synchronous adapter ──────────────────────────────────────────────────────

/**
 * Call safeParse (never parse — that throws and crashes the render cycle)
 * and normalise ZodError issues into a flat FormErrors dictionary.
 */
export function validateFormState<T extends ZodTypeAny>(
  schema: T,
  payload: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { isValid: true, errors: {}, data: result.data };
  }

  const normalizedErrors: FormErrors = {};
  result.error.issues.forEach(issue => {
    // Join nested path segments with '.' so 'address.city' maps directly
    // to the form field key — avoids manual path drilling in the UI layer
    const key = issue.path.join('.') || 'root';
    // First error per path wins; subsequent messages are less actionable
    if (!normalizedErrors[key]) {
      normalizedErrors[key] = issue.message;
    }
  });

  return { isValid: false, errors: normalizedErrors };
}

// ─── Async adapter with AbortController ──────────────────────────────────────

/**
 * Wraps synchronous validation and an optional async refinement.
 *
 * The caller passes a signal from its own AbortController. When the user
 * types again, the caller aborts the prior controller — this function
 * detects the abort and returns early instead of committing stale results.
 */
export async function validateAsyncState<T extends ZodTypeAny>(
  schema: T,
  payload: unknown,
  signal: AbortSignal,                                           // AbortSignal from caller's AbortController
  asyncRefine?: (data: z.infer<T>, signal: AbortSignal) => Promise<ZodError | null>
): Promise<ValidationResult<z.infer<T>>> {
  // Run sync checks first; async I/O is pointless if the shape is wrong
  const syncResult = validateFormState(schema, payload);
  if (!syncResult.isValid) return syncResult;

  if (!asyncRefine || syncResult.data === undefined) return syncResult;

  // Guard: if the controller was already aborted before we even started,
  // bail out immediately without touching state
  if (signal.aborted) return syncResult;

  const asyncError = await asyncRefine(syncResult.data, signal);

  // A second guard: the async call might have returned after abort —
  // discard the result rather than overwrite the newer validation cycle
  if (signal.aborted) return syncResult;

  if (asyncError) {
    const errors: FormErrors = {};
    asyncError.issues.forEach(issue => {
      const key = issue.path.join('.') || 'root';
      if (!errors[key]) errors[key] = issue.message;
    });
    return { isValid: false, errors };
  }

  return syncResult;
}

// ─── React integration example ────────────────────────────────────────────────

import { useRef, useState, useCallback } from 'react';

export function useZodForm<T extends ZodTypeAny>(schema: T) {
  const [errors, setErrors]   = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  // Store the AbortController in a ref so the stale-closure problem
  // in debounced handlers can't capture an outdated controller reference
  const controllerRef = useRef<AbortController | null>(null);

  const validate = useCallback(
    async (payload: unknown,
           asyncRefine?: (data: z.infer<T>, signal: AbortSignal) => Promise<ZodError | null>) => {
      // Cancel any in-flight async check from the previous keystroke
      controllerRef.current?.abort();
      const controller = new AbortController();  // fresh controller for this cycle
      controllerRef.current = controller;

      setPending(true);
      const result = await validateAsyncState(schema, payload, controller.signal, asyncRefine);
      if (!controller.signal.aborted) {
        setErrors(result.errors);
        setPending(false);
      }
      return result;
    },
    [schema]
  );

  return { errors, pending, validate };
}
```

---

## Integration with the Validation Pipeline

This adapter slots into [the parent validation pipeline](https://www.client-side-form.com/validation-logic-schema-integration/) at the boundary between raw DOM events and typed state. The sequence:

1. **DOM event fires** (`onChange` / `onBlur`) → event handler calls `validate(formPayload)`.
2. **Adapter normalises types** → Zod receives a well-typed object, not raw string inputs from `event.target.value`.
3. **`safeParse` runs synchronously** → errors are committed to state immediately; no flicker.
4. If sync passes and the field has an async refinement (for example an email-uniqueness check handled by [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)), the async path fires with a fresh `AbortController` signal.
5. **Errors are propagated to ARIA attributes** (see Testing & QA Hooks below).

For [cross-field dependency rules](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/) — passwords matching, end-date after start-date, conditional required fields — use `.superRefine()` rather than chaining `.refine()` calls. `superRefine` can add multiple issues in one pass and lets you short-circuit with `ctx.addIssue` + `return z.NEVER` when a field is already empty, preventing misleading downstream errors.

[Synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) cover the complementary debounce wiring that prevents `validate()` from firing on every keypress.

---

## Parse, safeParse, and the Boundary They Draw

The choice between `parse` and `safeParse` is not a style preference — it decides where invalid data stops being an exception and starts being state. A form has exactly one place where that transition should happen, and putting it anywhere else produces either swallowed errors or a crashed render.

`parse` throws a `ZodError`. That is the right shape at a trust boundary you control, where invalid input is genuinely exceptional: a config file that must be well-formed for the application to start, or a server response whose contract you have already agreed. `safeParse` returns a discriminated result instead, which is the right shape everywhere the input is a person typing — because a half-finished email address is not an exceptional condition, it is the normal state of a form that is being filled in.

```typescript
// At the form boundary: invalid is expected, so never throw.
const result = schema.safeParse(values);
if (!result.success) {
  // result.error.issues is data. Map it, render it, announce it.
  return toFieldErrorMap(result.error.issues);
}
// result.data is fully typed AND coerced — use it, not `values`.
return submit(result.data);
```

The last line carries the point that is easiest to miss. `safeParse` returns *transformed* output, so a schema with `z.coerce.number()` or a `.transform()` gives back a value whose type differs from the input. Submitting `values` instead of `result.data` throws away every coercion the schema performed and sends the server the raw strings the DOM produced, which is how a form that validates correctly still posts `"7"` where the API expects `7`.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of parse and safeParse across four questions: what happens on invalid input, whether the caller needs a try-catch, where the transformed data comes from, and which boundary each belongs at." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which boundary each entry point belongs at</title>
  <desc>On invalid input, parse throws a ZodError while safeParse returns a result object whose success flag is false. Parse therefore requires the caller to wrap it in a try-catch, while safeParse requires only a branch. Both give transformed output — parse as its return value, safeParse as result.data — and in both cases the transformed value, not the raw input, is what should be submitted. Parse belongs at boundaries where invalid input is exceptional, such as configuration and startup; safeParse belongs at boundaries where invalid input is the normal state, which is every form.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Question</text>
  <text x="264" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">parse</text>
  <text x="450" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">safeParse</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">on invalid input</text>
  <text x="264" y="66" font-size="10" fill="#a63d6f" font-family="inherit">throws a ZodError</text>
  <text x="450" y="66" font-size="10" fill="#2d6342" font-family="inherit">returns success: false</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">caller must write</text>
  <text x="264" y="100" font-size="10" fill="#6b5f75" font-family="inherit">try / catch</text>
  <text x="450" y="100" font-size="10" fill="#6b5f75" font-family="inherit">an if</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">transformed output</text>
  <text x="264" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the return value</text>
  <text x="450" y="134" font-size="10" fill="#6b5f75" font-family="inherit">result.data — submit this</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">belongs at</text>
  <text x="264" y="168" font-size="10" fill="#6b5f75" font-family="inherit">config, startup, contracts</text>
  <text x="450" y="168" font-size="10" fill="#7b4f8a" font-family="inherit">every form, always</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Row three is the quiet one: submitting the raw values instead of result.data discards every coercion the schema performed.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Symptom: the form validates, the request is rejected, and the server complains about a type the schema had already fixed.</text>
</svg>

## Edge Cases and Failure Modes

**Concurrency: stale async results**

The most common production bug is an async check for keystroke N completing *after* the check for keystroke N+1 has already resolved, overwriting a valid state with a stale error. The `AbortController` pattern above prevents this, but only if the `signal` is threaded through to the actual `fetch()` call:

```typescript
async function checkEmailAvailable(email: string, signal: AbortSignal): Promise<ZodError | null> {
  const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`, { signal });
  // If signal fires, fetch throws DOMException('AbortError') — do not swallow it
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const { available } = await res.json();
  if (!available) {
    return new ZodError([{ code: 'custom', message: 'Email already in use', path: ['email'] }]);
  }
  return null;
}
```

**Hydration mismatches in SSR**

On server-rendered pages the initial HTML is generated without any JavaScript validation state. When React/Vue hydrates, a `useEffect` or `onMounted` callback may fire validation before the user has touched any field, setting `errors` on previously pristine fields. Guard against this by tracking a `hasTouched` boolean per field and only displaying errors after first `onBlur`.

**Shadow DOM boundaries**

Custom element form controls inside a shadow root do not bubble events through the normal DOM. Wire validation directly inside the custom element's internal event handler, then dispatch a `CustomEvent` with `composed: true` to communicate result to the host form.

**Cross-browser quirks: autofill**

Chrome's autofill fires `change` events asynchronously after page load on some input types. If your adapter only listens to user-initiated events, autofilled values can fail validation silently. Listen on `input` (not just `change`) and add a 300 ms deferred check after mount to catch autofill.

**Schema version drift between client and server**

When the backend adds a new required field, clients using a cached schema build will accept payloads the server rejects. Publish schemas as a versioned workspace package, pin the version in both projects, and add a CI step that runs `tsc --noEmit` against the shared types.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|---|---|---|
| Error state flickers — valid then immediately invalid | Check whether both `onChange` and `onBlur` trigger full schema evaluation | Limit `onChange` to field-level `.pick()` schema; run full schema only on `onBlur` |
| Async check returns after form is already submitted | Log `signal.aborted` before committing async result | Ensure submit handler aborts all pending controllers before proceeding |
| `ZodError` path is empty (`[]`) | The issue was added via root-level `.refine()` without a `path` argument | Use `.superRefine()` and always supply `path`; use key `'root'` to display as a form-level banner |
| TypeScript reports `z.infer<T>` as `unknown` | Schema is assigned `ZodTypeAny` without a generic constraint in the call site | Use `z.ZodType<YourType>` or pass the schema as a const and let TypeScript infer the generic |
| Shared schema rejected by backend but passes client | Backend Zod version differs; `.email()` regex changed across versions | Pin exact Zod version in both `package.json` files; add a backend contract test |

---

One structural decision underlies all of this: whether a form owns one schema or one schema per field. Both are legitimate, and they fail differently.

<svg viewBox="0 8 664 216" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two schema decompositions: a single object schema for the whole form, and one schema per field composed into an object. The first expresses cross-field rules naturally but validates everything on every keystroke; the second validates one field cheaply but cannot express a rule spanning two fields." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One schema for the form, or one per field</title>
  <desc>A single object schema: cross-field refinements are natural because the whole value is in scope, the submit path is one call, but validating a single field means parsing the entire object or reaching into the shape to pull out one field's schema. One schema per field, composed into an object for submit: per-field validation is a single cheap call, but a rule spanning two fields has nowhere to live except the composed schema, so you end up with both. The practical answer is to keep per-field schemas as the units, compose them for submit, and put cross-field rules on the composition — which is what the object plus superRefine shape gives you.</desc>
  <rect x="0" y="8" width="664" height="216" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">one object schema</text>
  <rect x="14" y="36" width="304" height="112" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="58" font-size="10" fill="#2d6342" font-family="inherit">cross-field rules are natural</text>
  <text x="28" y="80" font-size="10" fill="#2d6342" font-family="inherit">submit is a single call</text>
  <text x="28" y="102" font-size="10" fill="#a63d6f" font-family="inherit">one field means parsing all of it</text>
  <text x="28" y="124" font-size="10" fill="#6b5f75" font-family="inherit">or reaching into .shape by hand</text>
  <text x="28" y="142" font-size="9.5" fill="#6b5f75" font-family="inherit">fine below ~20 fields</text>
  <text x="346" y="26" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">one schema per field</text>
  <rect x="346" y="36" width="304" height="112" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="360" y="58" font-size="10" fill="#2d6342" font-family="inherit">per-field validation is cheap</text>
  <text x="360" y="80" font-size="10" fill="#2d6342" font-family="inherit">each unit is testable alone</text>
  <text x="360" y="102" font-size="10" fill="#a63d6f" font-family="inherit">a two-field rule has no home</text>
  <text x="360" y="124" font-size="10" fill="#6b5f75" font-family="inherit">so you compose anyway</text>
  <text x="360" y="142" font-size="9.5" fill="#6b5f75" font-family="inherit">scales, with more wiring</text>
  <text x="14" y="180" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Take both: per-field schemas as the units, composed into an object, cross-field rules on the composition</text>
  <text x="14" y="198" font-size="10" fill="#6b5f75" font-family="inherit">z.object(fieldSchemas).superRefine(crossFieldRules) — per-field calls stay cheap and the composed schema owns the rest.</text>
  <text x="14" y="218" font-size="10" fill="#6b5f75" font-family="inherit">Keep the field schemas in one module so a rule and its message live together, whichever level ends up evaluating them.</text>
</svg>

## Testing and QA Hooks

**Data attributes for Playwright / Cypress**

Add `data-testid` to every field and its associated error container at authoring time — not as an afterthought. This decouples selectors from class names that change with design updates:

```typescript
// In your form component (framework-agnostic pattern)
<input
  id="email"
  data-testid="field-email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert" data-testid="error-email">
    {errors.email}
  </span>
)}
```

**Playwright test skeleton**

```typescript
test('shows email error on blur with invalid input', async ({ page }) => {
  await page.getByTestId('field-email').fill('not-an-email');
  await page.getByTestId('field-email').blur();
  await expect(page.getByTestId('error-email')).toBeVisible();
  await expect(page.getByTestId('field-email')).toHaveAttribute('aria-invalid', 'true');
});
```

**ARIA sync for accessibility regression**

Every field must carry `aria-invalid="true"` when its error key is present in the `FormErrors` map and `aria-invalid="false"` (or omitted) when the key is absent. Test this in your accessibility regression suite — `axe-core` flags missing `aria-describedby` targets as violations, so ensure the `id` on the error element always matches what the input's `aria-describedby` references.

---

## Common Pitfalls

- **Validating on every keystroke without debounce.** Each parse is synchronous and cheap, but async refinements are not. Debounce the entire `validate()` call at 250–400 ms for fields with async checks. For fields without async checks, per-keystroke sync validation is fine.
- **Calling `.parse()` in a synchronous event handler.** It throws; the exception propagates up through the React synthetic event wrapper and crashes the component tree. Always use `.safeParse()`.
- **Mapping `.flatten().fieldErrors` and ignoring `.flatten().formErrors`.** Root-level refinement errors (cross-field mismatches) land in `formErrors`, not `fieldErrors`. Discard `formErrors` and they are silently lost, leaving the user unable to submit with no visible reason.
- **Not threading `AbortSignal` into `fetch()`.** Creating an `AbortController` but not passing its signal to `fetch` means `abort()` has no effect — the prior request still resolves and potentially overwrites newer state.
- **Schema drift between client and server.** Backend contracts evolving independently of the shared client schema causes silent validation gaps. Enforce version parity in CI.

---

## Frequently Asked Questions

**Should I use Zod's `.parse()` or `.safeParse()` for form validation?**

Always use `.safeParse()` in UI contexts. It returns a discriminated union (`{ success: true, data } | { success: false, error }`) that prevents uncaught exceptions during synchronous validation cycles and lets you branch cleanly without a try/catch.

**How do I handle async validation without blocking form submission?**

Debounce input events, track a `pending` boolean in component state, cancel prior requests with `AbortController`, and keep the submit button disabled until `pending === false && isValid === true`. Add a timeout (for example 8 seconds) after which you transition to `RETRYABLE` state rather than waiting indefinitely.

**Can Zod schemas be shared directly with backend Node.js code?**

Yes. Zod runs in both environments. Export schemas from a `@yourproject/schemas` workspace package. Add `tsc --noEmit` on the shared package in your CI pipeline to catch type drift before it reaches production.

**How do I test Zod-based form validation with Playwright?**

Add `data-testid` attributes to each field and its error container. After triggering an `onBlur` or submit event, assert on `aria-invalid="true"` and the visible error text. This approach is resilient to class name changes and directly tests the ARIA contract that screen readers rely on.

---

## Related

- [How to Validate Dependent Fields with Zod](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/) — `.superRefine()` patterns for cross-field rules
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — debounce, AbortController, and retry orchestration
- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) — lightweight per-field checks and trigger lifecycle
- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) — dependency graph evaluation order and memoisation

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)
