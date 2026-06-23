---
layout: page.njk
title: "Error State Mapping Patterns"
description: "How to normalize heterogeneous validation payloads into a deterministic FieldErrorMap, route errors to the right UI components, and keep error state in sync across async boundaries — with production-ready TypeScript."
slug: error-state-mapping-patterns
type: cluster
breadcrumb:
  - label: "Form State Fundamentals & Architecture"
    url: "/form-state-fundamentals-architecture/"
  - label: "Error State Mapping Patterns"
    url: "/form-state-fundamentals-architecture/error-state-mapping-patterns/"
datePublished: "2025-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Error State Mapping Patterns"
  parent: "Form State Fundamentals"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Error State Mapping Patterns",
      "description": "How to normalize heterogeneous validation payloads into a deterministic FieldErrorMap, route errors to the right UI components, and keep error state in sync across async boundaries — with production-ready TypeScript.",
      "datePublished": "2025-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" },
      "publisher": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Error State Mapping Patterns", "item": "https://client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Error State Mapping with an Adapter Pattern",
      "step": [
        { "@type": "HowToStep", "name": "Define a unified FieldErrorState type", "text": "Create a canonical typed interface that every validation adapter outputs." },
        { "@type": "HowToStep", "name": "Build the ErrorStateAdapter class", "text": "Write a class that normalizes Zod, Yup, and AJV payloads into the unified map, guarding on touched fields." },
        { "@type": "HowToStep", "name": "Wire async validation with AbortController", "text": "Wrap safeParseAsync in an abort-aware method so stale promises never overwrite current UI state." },
        { "@type": "HowToStep", "name": "Batch DOM commits", "text": "Use queueMicrotask or React.startTransition to collapse multiple error updates into one render pass." },
        { "@type": "HowToStep", "name": "Connect to ARIA attributes", "text": "Propagate FieldErrorState to aria-invalid and aria-describedby on each input after every map update." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent error flicker during rapid input changes?",
          "acceptedAnswer": { "@type": "Answer", "text": "Debounce validation triggers and batch error map updates before committing to the DOM. Use an AbortController to cancel in-flight validation requests so stale results never reach the UI." }
        },
        {
          "@type": "Question",
          "name": "Should error states live globally or locally within components?",
          "acceptedAnswer": { "@type": "Answer", "text": "Store normalized error maps in a centralized context or state store, then derive local UI state via selectors. This maintains a single source of truth, prevents prop drilling, and lets design system components consume error metadata independently." }
        },
        {
          "@type": "Question",
          "name": "How does the adapter handle cross-field validation errors?",
          "acceptedAnswer": { "@type": "Answer", "text": "Normalize cross-field errors to a shared parent path (e.g., 'confirmPassword') or distribute them to the relevant child fields using a routing map. Each component receives only its applicable error payload while the parent form context retains awareness of aggregate failures." }
        },
        {
          "@type": "Question",
          "name": "What data-attributes should I use for Playwright selectors on error states?",
          "acceptedAnswer": { "@type": "Answer", "text": "Add data-field-error and data-field-valid attributes to error message containers and inputs. Playwright locators like page.locator('[data-field-error=\"email\"]') remain stable across CSS and DOM structural changes." }
        }
      ]
    }
  ]
}
</script>

# Error State Mapping Patterns

When a validation pipeline fires, the error payload it emits rarely matches the shape your UI components expect. Zod produces `ZodError.issues`, Yup returns a `ValidationError.inner` array, and AJV outputs an `ErrorObject[]` — three incompatible formats, all describing the same domain: which fields are wrong and why. The error mapping layer is the seam that normalises these heterogeneous payloads into a single, deterministic `FieldErrorMap` your component tree can consume without caring which schema library produced it.

This page covers: the state machine that governs when errors surface, the adapter class that performs normalisation, async-safe validation patterns using `AbortController`, how this layer wires into the broader [Form State Fundamentals & Architecture](/form-state-fundamentals-architecture/) pipeline, and the edge cases most teams only discover under production load.

---

## Problem statement

The concrete failure this pattern prevents: a user blurs an email field, async uniqueness validation fires, the user immediately focuses a password field and triggers a second validation pass, and the first request resolves *after* the second — stamping an outdated "email taken" message onto a field the user has already corrected.

A secondary failure: surfacing errors on fields the user has never touched, because a submit-time validation run maps every schema error regardless of interaction state. Both problems share a root cause — no isolation between the schema library's output and the UI's consumption of it. The adapter pattern closes that gap.

---

## State machine specification

Error mapping is not a function call; it is a state machine. The transitions below are the source of truth for when an error appears, updates, or clears.

<svg viewBox="0 0 720 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Error mapping state machine: IDLE transitions to VALIDATING on blur/change/submit, then to VALID or INVALID, with INVALID transitioning to CLEARING on reset or successful re-validation" style="width:100%;max-width:720px;display:block;margin:1.5rem auto;">
  <title>Error Mapping State Machine</title>
  <desc>State diagram showing IDLE, VALIDATING, VALID, INVALID, and CLEARING states with labelled transition arrows</desc>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
  <!-- IDLE -->
  <rect x="20" y="100" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="70" y="125" text-anchor="middle" font-size="13" fill="currentColor" font-family="inherit">IDLE</text>
  <!-- VALIDATING -->
  <rect x="200" y="100" width="120" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
  <text x="260" y="125" text-anchor="middle" font-size="13" fill="currentColor" font-family="inherit">VALIDATING</text>
  <!-- VALID -->
  <rect x="420" y="40" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
  <text x="470" y="65" text-anchor="middle" font-size="13" fill="currentColor" font-family="inherit">VALID</text>
  <!-- INVALID -->
  <rect x="420" y="160" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <text x="470" y="185" text-anchor="middle" font-size="13" fill="currentColor" font-family="inherit">INVALID</text>
  <!-- CLEARING -->
  <rect x="590" y="100" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="640" y="125" text-anchor="middle" font-size="13" fill="currentColor" font-family="inherit">CLEARING</text>
  <!-- IDLE → VALIDATING -->
  <line x1="120" y1="120" x2="198" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.7"/>
  <text x="159" y="113" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">blur/change/submit</text>
  <!-- VALIDATING → VALID -->
  <line x1="310" y1="108" x2="418" y2="68" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6"/>
  <text x="370" y="78" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">no errors</text>
  <!-- VALIDATING → INVALID -->
  <line x1="310" y1="132" x2="418" y2="172" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="370" y="168" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.8">errors found</text>
  <!-- VALID → CLEARING -->
  <line x1="520" y1="60" x2="600" y2="108" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6"/>
  <text x="572" y="78" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">reset</text>
  <!-- INVALID → CLEARING -->
  <line x1="520" y1="180" x2="600" y2="132" stroke="currentColor" stroke-width="1.5" marker-end="url(#arrow)" opacity="0.6"/>
  <text x="572" y="168" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.7">reset / re-valid</text>
  <!-- CLEARING → IDLE (arc back) -->
  <path d="M640,100 Q640,20 70,95" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow)" opacity="0.4"/>
  <text x="370" y="26" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.5">clearAll()</text>
</svg>

| State | What it means | Entry trigger | Exit trigger |
|---|---|---|---|
| `IDLE` | Field untouched, no error to show | Initial / after `clearAll()` | `blur`, `change`, `submit` |
| `VALIDATING` | Schema parse in progress | Any validation trigger fires | Parse settles (success or error) |
| `VALID` | Parse succeeded; error cleared | `mapSchemaErrors` with 0 matching errors | `reset` or new trigger |
| `INVALID` | One or more errors mapped to this field | `mapSchemaErrors` with ≥1 matching error | Re-validate to `VALID`, or `reset` |
| `CLEARING` | `clearAll()` / `clearField()` called, pending DOM flush | `reset` event or submit success | Next microtask; returns to `IDLE` |

The key constraint: transitions from `VALIDATING` only apply if the field is in the `touchedFields` set. If it is not, the result is discarded silently — no `VALID`, no `INVALID`. This is what prevents premature error surfacing, and it depends directly on [dirty and pristine state tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) to know which fields the user has actually interacted with.

---

## Core implementation

The `ErrorStateAdapter` class below is production-ready. It handles synchronous normalisation, async-safe validation, and per-field accessors. Every non-obvious line is annotated.

```typescript
// Canonical error shape emitted by any validation library adapter.
type ValidationError = { path: string; message: string; code?: string };

// The unified type your UI components consume — never the raw library output.
type FieldErrorState = {
  isValid: boolean;
  message: string;
  touched: boolean;
};

export class ErrorStateAdapter {
  // WeakMap is NOT used here because field keys are strings, not objects.
  // A plain Map gives O(1) lookup and explicit clear() semantics.
  private errorMap: Map<string, FieldErrorState> = new Map();

  /**
   * Normalizes heterogeneous validation payloads into a UI-ready map.
   *
   * Algorithm:
   *  1. Seed the map with VALID entries for every touched field — this
   *     clears stale errors on fields that have since become valid.
   *  2. Overwrite entries whose paths appear in the error list.
   *
   * Fields NOT in touchedFields are intentionally excluded: showing errors
   * on fields the user hasn't interacted with creates a hostile UX and
   * violates WCAG 3.3.1 (Error Identification on demand).
   */
  public mapSchemaErrors(
    errors: ValidationError[],
    touchedFields: Set<string>
  ): ReadonlyMap<string, FieldErrorState> {
    const nextMap = new Map<string, FieldErrorState>();

    // Step 1: default every touched field to valid.
    for (const field of touchedFields) {
      nextMap.set(field, { isValid: true, message: '', touched: true });
    }

    // Step 2: overwrite with actual errors, but only for touched fields.
    for (const err of errors) {
      if (nextMap.has(err.path)) {
        nextMap.set(err.path, {
          isValid: false,
          message: err.message,
          touched: true,
        });
      }
    }

    this.errorMap = nextMap;
    // Freeze prevents accidental mutation by consumers between renders.
    return Object.freeze(this.errorMap) as ReadonlyMap<string, FieldErrorState>;
  }

  /**
   * Async-safe validation wrapper.
   *
   * The AbortSignal check AFTER awaiting is critical: the promise may have
   * resolved after a newer validation pass already updated the error map.
   * Without this guard, the earlier result would silently overwrite the
   * current state — the classic stale-async-overlay bug.
   *
   * Usage:
   *   const controller = new AbortController();
   *   // Cancel any previous in-flight call before starting a new one:
   *   prevController?.abort();
   *   const map = await adapter.validateAndMap(schema, data, controller.signal, touchedFields);
   */
  public async validateAndMap(
    schema: {
      safeParseAsync: (
        data: unknown
      ) => Promise<{ success: boolean; error?: { errors: ValidationError[] } }>;
    },
    data: unknown,
    signal: AbortSignal,   // <-- caller must create a new AbortController per call
    touchedFields: Set<string>
  ): Promise<ReadonlyMap<string, FieldErrorState>> {
    const result = await schema.safeParseAsync(data);

    // Check AFTER the await — not before. The signal state is only meaningful
    // once the async work is done and we are about to commit to the UI.
    if (signal.aborted) {
      // Throw a DOMException so callers can distinguish abort from schema errors.
      throw new DOMException('Validation aborted', 'AbortError');
    }

    if (result.success) {
      this.clearAll();
      return new Map();
    }

    return this.mapSchemaErrors(result.error!.errors, touchedFields);
  }

  /** Returns the current state for one field without triggering re-validation. */
  public getFieldState(fieldPath: string): FieldErrorState {
    return this.errorMap.get(fieldPath) ?? {
      isValid: true,
      message: '',
      touched: false,
    };
  }

  /** Clears a single field's error — call this on targeted programmatic resets. */
  public clearField(fieldPath: string): void {
    this.errorMap.delete(fieldPath);
  }

  /** Wipes the entire error map — call this on form reset or successful submission. */
  public clearAll(): void {
    this.errorMap.clear();
  }
}
```

### Batching DOM commits

Every call to `mapSchemaErrors` produces a new map. Naively committing each update synchronously causes a DOM commit per keystroke in `onChange` mode, which saturates the main thread on large forms.

```typescript
// React: defer error map updates out of the high-priority render lane.
import { startTransition } from 'react';

function handleChange(data: unknown) {
  startTransition(() => {
    const map = adapter.mapSchemaErrors(parseErrors(data), touchedFields);
    setErrorMap(map);
  });
}

// Vanilla / non-React: collapse multiple updates into one microtask flush.
let pending = false;
function scheduleErrorUpdate(map: ReadonlyMap<string, FieldErrorState>) {
  latestMap = map;
  if (!pending) {
    pending = true;
    // queueMicrotask fires after the current task but before the next
    // paint — safe for synchronous schema validation results.
    queueMicrotask(() => {
      commitErrorMapToDOM(latestMap);
      pending = false;
    });
  }
}
```

---

## Integration guidance

This adapter slots into the validation lifecycle at the normalisation stage — after the schema library fires and before any component reads error state.

The [form validation lifecycle](/form-state-fundamentals-architecture/form-validation-lifecycle/) page defines the four canonical trigger points (`onBlur`, `onChange`, `onSubmit`, `reset`). The adapter is called at all four:

- **`onBlur`** — call `validateAndMap` with a fresh `AbortController`. Store the controller reference so the next blur on the same field cancels the previous one.
- **`onChange`** — call `mapSchemaErrors` synchronously for schema libraries that expose synchronous parse (e.g. `z.safeParse`), or `validateAndMap` for async ones. Debounce to 300–500 ms.
- **`onSubmit`** — call `validateAndMap` without the touched-field guard: pass the full field set so all errors surface regardless of interaction history.
- **`reset`** — call `clearAll()` and reset the `touchedFields` set to empty.

When bridging [controlled vs uncontrolled forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/), the error mapping layer must receive updates from both paths. Uncontrolled inputs emit native `input` / `change` events rather than framework state updates; wire those events to the same adapter call via a lightweight event bus so the normalised map stays unified.

For [binding the normalised map to specific DOM nodes](/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/), see the child page on mapping validation errors to UI components — it covers `aria-describedby` wiring, live-region injection, and design-system token propagation.

---

## Edge cases and failure modes

### Concurrent validation on the same field

A user tabs through a field quickly: `onBlur` fires, async validation starts, the field is focused again, `onChange` fires, and a second validation pass starts. Without cancellation, both promises race to update the map.

**Resolution:** maintain a `Map<string, AbortController>` keyed by field path. Before starting a new validation call for a field, call `abort()` on the existing controller, then replace it.

```typescript
// Per-field AbortController registry — one entry per field under active validation.
const controllers = new Map<string, AbortController>();

async function validateField(fieldPath: string, data: unknown) {
  // Abort any in-flight validation for this specific field.
  controllers.get(fieldPath)?.abort();

  const controller = new AbortController();
  controllers.set(fieldPath, controller);

  try {
    const map = await adapter.validateAndMap(fieldSchema, data, controller.signal, touchedFields);
    applyErrorMap(map);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return; // expected
    throw err; // unexpected schema errors should surface
  } finally {
    // Clean up the registry entry once settled to prevent memory growth.
    if (controllers.get(fieldPath) === controller) {
      controllers.delete(fieldPath);
    }
  }
}
```

### Hydration mismatches in SSR frameworks

Server-rendered forms often pre-populate error state (e.g. after a server action). The client-side adapter may initialise with an empty map before hydration completes, causing a flash of no-error state followed by error state on hydration. This triggers React's hydration mismatch warning.

**Resolution:** initialise the adapter with the server-rendered error payload during hydration:

```typescript
// Pass server errors as seed data to the adapter constructor.
const adapter = new ErrorStateAdapter(serverErrors, serverTouchedFields);
```

Add an optional constructor overload that calls `mapSchemaErrors` immediately with the seed data, so the client-side initial render matches the server output.

### Shadow DOM boundaries

Web component-based design systems may render inputs inside a shadow root. The adapter's `getFieldState` call still works, but connecting `aria-describedby` across the shadow boundary requires either explicitly slotted error nodes or the error element living in the same shadow root as the input.

**Resolution:** expose a `getErrorId(fieldPath: string)` helper that returns a deterministic element ID, then let each web component query its own shadow root for that ID during its `connectedCallback`.

### Cross-field (interdependent) validation errors

Zod's `.refine()` and `.superRefine()` produce errors at the schema root level (`path: []`) or at a computed path. These do not map naturally to individual field entries.

**Resolution:** implement a routing map that distributes root-level errors to the appropriate field path before calling `mapSchemaErrors`:

```typescript
// Routes root-level schema errors to specific field paths.
function routeCrossFieldErrors(
  errors: ValidationError[],
  routing: Record<string, string>  // e.g. { 'passwordMismatch': 'confirmPassword' }
): ValidationError[] {
  return errors.map(err => {
    const target = err.code && routing[err.code];
    return target ? { ...err, path: target } : err;
  });
}
```

---

## Troubleshooting reference

| Failure scenario | Diagnostic step | Recovery action |
|---|---|---|
| Stale error message persists after field becomes valid | Check that `touchedFields` still contains the field after re-validation; verify `mapSchemaErrors` receives `errors: []` for that path | Confirm the validation pass runs to completion and that `AbortController.abort()` is not being called prematurely |
| Error clears then reappears ("flicker") | Inspect microtask ordering; check whether two validation passes are racing | Cancel the in-flight controller before starting a new one; debounce `onChange` triggers |
| `aria-invalid` not updating after error state changes | Verify the component reads from the normalised map, not directly from schema output; check that re-renders are triggered after `setErrorMap()` | Ensure the map object reference changes on each update — spread into a new `Map()` if referential equality blocks re-renders |
| Cross-field error appears on wrong field | Log the raw `ValidationError[]` before routing; check that `code` values match the routing map keys | Update the routing map or use Zod's `ctx.addIssue` with an explicit `path` |
| Errors vanish on form reset but field still shows `aria-invalid="true"` | Confirm `clearAll()` is called AND the DOM update that writes `aria-invalid` fires after the clear | Sequence: `clearAll()` → `scheduleErrorUpdate(new Map())` → let framework re-render before resetting the native input |

---

## Testing and QA hooks

### Data-attribute strategy for Playwright / Cypress

Add stable `data-*` attributes to error message containers at render time, keyed by field path. CSS classes and DOM structure change; data attributes are explicit contracts.

```html
<!-- Error container rendered by your design system component: -->
<span
  id="email-error"
  role="alert"
  aria-live="polite"
  data-field-error="email"
  data-field-valid="false"
>Email address is already in use.</span>

<input
  aria-invalid="true"
  aria-describedby="email-error"
  data-field="email"
/>
```

Playwright locator:
```typescript
// Stable selector regardless of CSS changes or component refactors.
const emailError = page.locator('[data-field-error="email"]');
await expect(emailError).toBeVisible();
await expect(emailError).toHaveText(/already in use/);

// Verify ARIA is wired correctly.
const emailInput = page.locator('[data-field="email"]');
await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
```

### ARIA regression coverage

Every field error must satisfy three accessibility requirements: `aria-invalid="true"` on the input, `aria-describedby` pointing to the error container's `id`, and the error container either having `role="alert"` or being inside an `aria-live="polite"` region. Add axe-core assertions after your error-trigger interactions:

```typescript
import { checkA11y } from 'axe-playwright';

test('email field error is accessible', async ({ page }) => {
  await page.fill('[data-field="email"]', 'taken@example.com');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-field-error="email"]')).toBeVisible();
  await checkA11y(page, '[data-field="email"]');
});
```

---

## Common pitfalls

- **Mapping errors before checking touched state.** Calling `mapSchemaErrors` on submit without filtering to touched fields surfaces errors on every field simultaneously, creating an overwhelming and inaccessible error dump. Use the full field set only on explicit submit, and only after the user has attempted submission.
- **Mutating the schema library's output directly.** Zod, Yup, and AJV return objects they may reuse internally. Normalise into a fresh `FieldErrorState` — never annotate the original error objects.
- **Unbatched error updates in reactive frameworks.** Setting error state inside a synchronous loop triggers one render per field. Collect the full normalised map first, then set state once.
- **Forgetting to call `clearAll()` on successful submission.** The form resets visually, but residual entries in the error map surface on the next render cycle — typically visible as a brief flash of old errors on the next form open.
- **No `finally` block on async validation.** If the validation promise rejects for a non-abort reason, the field remains in `VALIDATING` state forever. Always clear the per-field `AbortController` registry entry in a `finally` block.

---

## Frequently Asked Questions

**How do I prevent error flicker during rapid input changes?**

Debounce `onChange` validation to 300–500 ms and cancel in-flight requests via `AbortController` before starting a new one. Batch the resulting map update with `queueMicrotask` or `React.startTransition` so the DOM commits once per debounce window, not once per keystroke.

**Should error states live globally or locally within components?**

Store the normalised `FieldErrorMap` in a centralized context or state store. Components derive their local `FieldErrorState` via a selector keyed by field path (`adapter.getFieldState('email')`). This keeps a single source of truth, prevents prop drilling through deeply nested forms, and lets standalone design-system components consume error metadata without knowing the validation library.

**How does the adapter handle cross-field validation errors?**

Normalise root-level or cross-field errors to the most relevant field path using a `routeCrossFieldErrors` routing map before calling `mapSchemaErrors`. For errors that genuinely belong to the whole form rather than a single field (e.g., "at least one contact method is required"), map them to a reserved `'_form'` key and render them in a form-level error summary above the submit button.

**What data-attributes should I use for Playwright selectors on error states?**

`data-field-error="<fieldPath>"` on the error message container and `data-field="<fieldPath>"` on the input. These survive CSS refactors, component renames, and DOM restructuring. Avoid selecting by class name, placeholder text, or visible error copy — all three change during content updates.

---

## Related

- [Mapping Validation Errors to UI Components](/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/) — binding the normalised `FieldErrorMap` to `aria-describedby`, live regions, and design-system tokens
- [Dirty and Pristine State Tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the touched-field set that gates which errors the adapter is allowed to surface
- [Form Validation Lifecycle](/form-state-fundamentals-architecture/form-validation-lifecycle/) — the four trigger points (`onBlur`, `onChange`, `onSubmit`, `reset`) that drive the error mapping state machine
- [Controlled vs Uncontrolled Forms](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — bridging the two input models so the error mapping layer receives a unified event stream

← [Form State Fundamentals & Architecture](/form-state-fundamentals-architecture/)
