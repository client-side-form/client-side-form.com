---
layout: section.njk
title: "Validation Logic & Schema Integration"
description: "Schema-driven validation pipelines with Zod, async strategies, cross-field dependency graphs, and synchronous validation patterns for production-grade client-side form state."
slug: "validation-logic-schema-integration"
type: section
breadcrumb: "Validation Logic & Schema Integration"
datePublished: "2024-01-15"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validation Logic"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validation Logic & Schema Integration",
      "description": "Schema-driven validation pipelines with Zod, async strategies, cross-field dependency graphs, and synchronous validation patterns for production-grade client-side form state.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-09-18",
      "author": { "@type": "Organization", "name": "client-side-form.com" },
      "publisher": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Architect a schema-driven validation pipeline",
      "step": [
        { "@type": "HowToStep", "name": "Define the validation state model", "text": "Model explicit lifecycle states: idle, validating, dirty, pristine, valid, invalid. Each field owns its own status flags." },
        { "@type": "HowToStep", "name": "Attach a runtime schema parser", "text": "Integrate Zod (or a comparable schema library) as the single source of truth for field rules, transformations, and error shapes." },
        { "@type": "HowToStep", "name": "Layer synchronous then asynchronous checks", "text": "Run synchronous rules on every keystroke or blur, then gate async network checks behind debounce and AbortController cancellation." },
        { "@type": "HowToStep", "name": "Build a cross-field dependency graph", "text": "Map field relationships as a directed acyclic graph so that upstream value changes only re-trigger their direct dependants." },
        { "@type": "HowToStep", "name": "Normalize errors and wire ARIA attributes", "text": "Translate raw schema errors into a flat field-keyed dictionary, then apply aria-invalid and aria-describedby synchronously with state updates." },
        { "@type": "HowToStep", "name": "Implement lifecycle teardown", "text": "Expose a destroy() method that aborts in-flight requests, clears debounce timers, removes event listeners, and unregisters reactive subscriptions." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How should form state handle concurrent validation triggers?",
          "acceptedAnswer": { "@type": "Answer", "text": "Attach an AbortController to each field's pending async check. Every new input event calls abort() on the previous controller before creating a fresh one, ensuring only the latest response resolves into state." }
        },
        {
          "@type": "Question",
          "name": "What is the most efficient way to map schema errors to UI components?",
          "acceptedAnswer": { "@type": "Answer", "text": "Normalize raw validation outputs into a flat field-keyed dictionary in a dedicated translation layer. Map error codes to localized strings and apply ARIA attributes in the same synchronous update, never in a separate render pass." }
        },
        {
          "@type": "Question",
          "name": "When should validation be deferred versus executed synchronously?",
          "acceptedAnswer": { "@type": "Answer", "text": "Execute synchronous schema rules on every blur event and on submit. Defer async network-dependent checks using debounced triggers (300–500 ms), isolating the async_pending status to the specific field rather than locking the whole form." }
        },
        {
          "@type": "Question",
          "name": "How do you architect reset functionality without memory leaks?",
          "acceptedAnswer": { "@type": "Answer", "text": "Maintain an immutable snapshot of the initial form values. On reset, swap the active state reference with that snapshot, call abort() on all live AbortControllers, clear debounce timers, and deregister any reactive dependency subscriptions." }
        }
      ]
    }
  ]
}
</script>

# Validation Logic & Schema Integration

Production form bugs rarely come from incorrect field rules — they come from the gaps between rules: async responses that resolve after a reset, cross-field constraints that fire in the wrong order, error messages that never reach screen readers, and cancellation logic that leaks memory across route changes. This page covers the architecture that closes those gaps.

<!-- SVG: Validation pipeline overview diagram -->
<svg viewBox="-6 64 772 223" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Validation pipeline: input event flows through sync schema check, then async checks, then error normalization, then ARIA sync" style="width:100%;max-width:760px;display:block;margin:2rem auto;">
  <title>Validation Pipeline Overview</title>
  <desc>A left-to-right flow diagram showing an input event entering a synchronous schema check, branching to async validators in parallel, merging into an error normalization layer, and finally updating ARIA attributes on the input element.</desc>
  <rect x="-6" y="64" width="772" height="223" fill="#f9f5fb"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- Stage boxes -->
  <rect x="10" y="120" width="110" height="56" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="65" y="144" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="system-ui,sans-serif">Input Event</text>
  <text x="65" y="160" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">(blur / keystroke)</text>
  <rect x="160" y="120" width="120" height="56" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="220" y="144" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="system-ui,sans-serif">Sync Schema</text>
  <text x="220" y="160" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">Parse &amp; type-check</text>
  <!-- Async branch boxes -->
  <rect x="340" y="80" width="120" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="400" y="100" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="system-ui,sans-serif">Async Check 1</text>
  <text x="400" y="116" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">e.g. email unique</text>
  <rect x="340" y="164" width="120" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="400" y="184" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="system-ui,sans-serif">Async Check N</text>
  <text x="400" y="200" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">AbortController</text>
  <!-- Normalize -->
  <rect x="520" y="120" width="120" height="56" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="580" y="144" text-anchor="middle" font-size="11" fill="#1e1a24" font-family="system-ui,sans-serif">Normalize</text>
  <text x="580" y="160" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">field-keyed errors</text>
  <!-- ARIA -->
  <rect x="700" y="120" width="50" height="56" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="725" y="144" text-anchor="middle" font-size="10" fill="#1e1a24" font-family="system-ui,sans-serif">ARIA</text>
  <text x="725" y="160" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="system-ui,sans-serif">sync</text>
  <!-- Arrows -->
  <line x1="120" y1="148" x2="157" y2="148" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="280" y1="140" x2="337" y2="104" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="280" y1="156" x2="337" y2="180" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="460" y1="104" x2="517" y2="140" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="460" y1="180" x2="517" y2="156" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="640" y1="148" x2="697" y2="148" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Status label -->
  <text x="380" y="268" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="system-ui,sans-serif">Async checks run in parallel; AbortController cancels stale responses</text>
</svg>

## Problem Framing

The failure modes this architecture prevents are specific:

- **Race conditions** — two async responses resolve out of order; the first-issued (stale) response overwrites the second (fresh) one.
- **Memory leaks** — `AbortController` instances accumulate on the heap because no cleanup path calls `abort()` before garbage collection.
- **Accessibility regressions** — validation state changes but `aria-invalid` and `aria-describedby` are updated a render cycle too late, leaving screen readers reading stale information.
- **Hydration mismatches** — server-rendered forms carry pre-populated error markup that the client-side validator immediately disagrees with, causing a visible error flash.
- **Cross-field cascade failures** — a change to field A should invalidate field B, but the re-validation fires for the entire form, creating unnecessary network round-trips and UI flicker.

Understanding these failure modes makes every architectural decision below readable as a direct countermeasure, not a convention to memorize.

## State Model Overview

Every field participates in a validation lifecycle. Encode it as a discriminated union so the TypeScript compiler rejects impossible state combinations:

```typescript
// The validation lifecycle for a single field.
// Discriminated on 'status' so impossible combinations (e.g.
// status:'valid' with errors present) are caught at compile time.
type FieldStatus =
  | 'pristine'      // never focused, never changed
  | 'dirty'         // user has typed; sync rules haven't run yet
  | 'validating'    // async check in-flight
  | 'valid'         // all rules passed, errors is empty
  | 'invalid';      // at least one rule failed

interface FieldState {
  value: string;
  status: FieldStatus;
  errors: string[];       // localized, display-ready messages
  touched: boolean;       // focused at least once (drives blur validation)
}

// The aggregate form state. Each field key maps to its own lifecycle.
type FormStatus =
  | 'idle'
  | 'validating'    // at least one field is 'validating'
  | 'submitting'
  | 'success'
  | 'error';        // server-side rejection after submit

interface FormState<T extends Record<string, unknown>> {
  fields: { [K in keyof T]: FieldState };
  status: FormStatus;
  submitError: string | null;
}
```

The `FormStatus` rolls up individual `FieldStatus` values: the form enters `validating` if any field is `validating`, and only enters `submitting` once all fields are `valid`. This avoids the common mistake of letting a submit proceed while an async uniqueness check is still in-flight.

The relationship between field lifecycle and [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) matters here: `dirty` and `pristine` are not validation outcomes — they are user-intent signals that determine *when* validation should run, not *what* it should check.

## Architecture & Design Principles

Four principles make this architecture predictable under production conditions:

**1. Decoupled validation pipelines.** The component that renders an input should not own the validation logic. Pass a `validate` function reference into the field handler; the handler invokes it and writes results to state. This lets you swap Zod for a custom schema library without touching any JSX.

**2. Normalized flat error state.** Store errors as `Record<string, string[]>` keyed by field name — never as a nested schema-library object. This keeps the render layer simple: any component can read `errors['email']` without knowing which library produced the error.

**3. Immutable state updates.** Every transition produces a new state object. This is what allows time-travel debugging, cheap equality checks in `React.memo` / `computed`, and reliable snapshot comparison on reset.

**4. `AbortController` as a first-class citizen.** Every async validation request must be paired with an `AbortController` stored in a field-level `WeakMap` (so the GC can reclaim controllers whose fields have been removed from the DOM). The controller is aborted before any new request for the same field starts.

```typescript
// WeakMap keyed by a field descriptor object — NOT by field name string —
// so entries are automatically eligible for GC when the field is removed.
const pendingControllers = new WeakMap<FieldDescriptor, AbortController>();

interface FieldDescriptor {
  name: string;
  // A plain object reference; kept alive by the form state tree.
}

function cancelPending(descriptor: FieldDescriptor): void {
  const prev = pendingControllers.get(descriptor);
  if (prev) {
    prev.abort(); // discard any in-flight response for this field
  }
}

function registerController(
  descriptor: FieldDescriptor,
  controller: AbortController
): void {
  cancelPending(descriptor);
  // Store the new controller; the old one is already aborted above.
  pendingControllers.set(descriptor, controller);
}
```

## Subsystem: Synchronous Schema Validation

[Synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) are the backbone of the pipeline. They run inline — on blur, on change when a field has already been `touched`, and always on submit — producing errors within the same microtask that processes the input event.

[Integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) makes this declarative. A `z.object` schema defines the entire form's contract; `safeParse` returns a typed result without throwing, and Zod's `ZodError.flatten()` produces the flat field-keyed structure the render layer expects directly:

```typescript
import { z } from 'zod';

const CheckoutSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter'),
  confirmPassword: z.string()
}).refine(
  data => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

type CheckoutValues = z.infer<typeof CheckoutSchema>;

function runSyncValidation(
  values: Partial<CheckoutValues>
): Record<string, string[]> {
  const result = CheckoutSchema.safeParse(values);

  if (result.success) return {};

  // flatten() gives { fieldErrors: { email: ['...'], password: ['...'] } }
  // — exactly the shape the render layer needs.
  return result.error.flatten().fieldErrors as Record<string, string[]>;
}
```

Note that cross-field rules (`confirmPassword` refinement) live inside the schema, not scattered across field handlers. That keeps the source of truth in one place and makes the rule testable without a browser.

## Subsystem: Asynchronous & Network-Aware Validation

[Asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) introduce three failure modes not present in synchronous checks: stale responses, abandoned requests that keep connections open, and pending UI state that blocks submit before the check resolves.

The full pipeline for a single async field check:

```typescript
// Debounce delay before issuing a network request.
// Balances responsiveness against unnecessary server load.
const ASYNC_DEBOUNCE_MS = 350;

interface AsyncFieldResult {
  valid: boolean;
  message: string | null;
}

function createAsyncValidator(
  descriptor: FieldDescriptor,
  checkFn: (value: string, signal: AbortSignal) => Promise<AsyncFieldResult>,
  onResult: (result: AsyncFieldResult) => void,
  onStatusChange: (status: 'validating' | 'idle') => void
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return function validate(value: string): void {
    // Clear any pending debounce from the previous keystroke.
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      // Cancel the previously in-flight request for this descriptor.
      // registerController calls abort() on the old controller first.
      const controller = new AbortController();
      registerController(descriptor, controller);

      onStatusChange('validating');

      try {
        const result = await checkFn(value, controller.signal);
        // Only update state if this request was not aborted.
        // An aborted fetch throws DOMException with name 'AbortError'.
        onResult(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Silently discard — a newer request superseded this one.
          return;
        }
        // Surface unexpected errors as a validation failure, not an uncaught exception.
        onResult({ valid: false, message: 'Validation check failed. Please try again.' });
      } finally {
        onStatusChange('idle');
      }
    }, ASYNC_DEBOUNCE_MS);
  };
}
```

The `signal` is passed directly into `fetch()` as `fetch(url, { signal })`, which causes the browser to cancel the TCP connection when `abort()` fires — no dangling sockets.

## Subsystem: Cross-Field Dependency Orchestration

[Cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) is necessary whenever changing one field's value must trigger re-validation of another. A flat re-run of the whole schema on every change is correct but expensive for large forms — and causes cascading async re-checks that compound the race condition problem.

Model dependencies explicitly as a directed acyclic graph:

```typescript
// A DAG entry: when 'source' changes, re-validate each item in 'dependants'.
interface FieldDependency {
  source: string;
  dependants: string[];
}

// Example: 'password' change must re-check 'confirmPassword'.
const dependencies: FieldDependency[] = [
  { source: 'password', dependants: ['confirmPassword'] },
  { source: 'country', dependants: ['stateProvince', 'postalCode'] }
];

// Build a lookup map for O(1) access during input events.
function buildDependencyMap(
  deps: FieldDependency[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const { source, dependants } of deps) {
    map.set(source, dependants);
  }
  return map;
}

const dependencyMap = buildDependencyMap(dependencies);

function getFieldsToRevalidate(changedField: string): string[] {
  // Always re-validate the changed field itself, plus any dependants.
  return [changedField, ...(dependencyMap.get(changedField) ?? [])];
}
```

The DAG approach means a `password` change re-validates `confirmPassword`, but does not re-trigger the async uniqueness check on `email`. Without this, multi-step forms with async validators make far more network requests than necessary.

## Subsystem: Choosing and Isolating the Schema Layer

The three subsystems above assume a schema library exists and produces issues. Which library, and how tightly the rest of the form is bound to it, is a separate decision — and one worth making deliberately, because it is the piece most likely to be replaced within the lifetime of the code around it.

[Choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/) works through the comparison in full. The architectural point is narrower: almost every property teams compare on is cheap to change later, and the two that are expensive are rarely on the list. Bundle size and parse throughput belong to the library, so swapping it changes them wholesale. The refinement model — how you express "this field is required only when that one is set" — belongs to *your schemas*, and it is spread across every form you own. So is the set of ecosystem bindings you have adopted.

The way to keep the expensive properties cheap is a boundary, not a benchmark. Define the call your form makes and the shape it gets back, and let exactly one module know which library sits behind it:

```typescript
// The entire surface the form knows about. Everything library-specific lives
// behind this one function, which is also the only thing that needs rewriting
// if the library is replaced.
export type Validate<T> = (values: T) => FieldErrorMap;

// The adapter: schema in, normalized map out. ~30 lines, fully unit-testable
// against a table of inputs and expected maps — a suite that survives the swap.
export function makeValidator<T>(schema: Schema<T>): Validate<T> {
  return (values) => {
    const result = schema.safeParse(values);
    // A pass produces no entries at all, not an empty-string entry per field:
    // downstream code tests presence, and "" is present.
    return result.success ? {} : toFieldErrorMap(result.error.issues);
  };
}
```

Two things are deliberate here. The adapter returns a normalized `FieldErrorMap` rather than the library's own issue list, so nothing downstream — rendering, ARIA wiring, the error summary, analytics — ever imports the library. And a successful parse returns an empty object rather than a map of empty strings, because every consumer tests for the *presence* of an error and an empty string is present.

What should not be abstracted is the schema DSL itself. Wrapping `z.string().email()` in a house `field.email()` produces a second, worse library that has to track the first, and it usually loses the type inference that made the original worth adopting. Abstract the call and the error shape; write the schemas in the library's own idiom.

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A layered view of the validation stack: schemas written in the library's own idiom, one adapter that normalises the result, and above it the form, the ARIA wiring, the error summary and analytics — none of which import the library. An arrow marks the single replaceable layer." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One layer knows the library; nothing above it does</title>
  <desc>Bottom layer: the schemas, written in the chosen library's own idiom so its type inference and refinement syntax are used directly rather than wrapped. Middle layer: a single adapter module that calls the schema and converts its issue list into a normalized field error map keyed by field name. Top layer: the form, the ARIA wiring, the error summary and analytics, each consuming only the normalized map. Replacing the library means rewriting the middle layer only, and the adapter's test table — inputs paired with expected maps — carries over unchanged.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="14" y="26" width="150" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="89" y="48" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">the form</text>
  <text x="89" y="66" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">renders messages</text>
  <rect x="180" y="26" width="150" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="255" y="48" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">ARIA wiring</text>
  <text x="255" y="66" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">invalid, describedby</text>
  <rect x="346" y="26" width="150" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="421" y="48" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">error summary</text>
  <text x="421" y="66" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">one entry per field</text>
  <rect x="512" y="26" width="150" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="587" y="48" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">analytics</text>
  <text x="587" y="66" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">which rule fired</text>
  <path d="M89,78 V102" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M255,78 V102" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M421,78 V102" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M587,78 V102" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="14" y="102" width="648" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="338" y="124" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">one adapter — the only module that imports the library</text>
  <text x="338" y="142" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">issue list in, normalized FieldErrorMap out · ~30 lines · the only thing a swap rewrites</text>
  <path d="M338,154 V178" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="14" y="178" width="648" height="46" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="338" y="198" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the schemas, in the library&#39;s own idiom</text>
  <text x="338" y="216" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">no house DSL on top — that is a second, worse library that also loses the type inference</text>
</svg>

The same boundary pays for itself the first time a rule has to run in two places. A schema that lives behind an adapter can be imported by a server route as easily as by a form, so the browser and the API enforce one definition instead of two that drift. That is worth more than any figure in a bundle-size comparison: a rule the client enforces and the server does not is a bug, and a rule the server enforces and the client does not is a wasted round trip.

<svg viewBox="0 8 664 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One schema module imported by both the browser form and the server route, so client-side validation and server-side enforcement cannot diverge. Below, the two failure modes of duplicated rules: a client-only rule that the server does not enforce, and a server-only rule the client cannot anticipate." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One definition, two enforcement points</title>
  <desc>A single schema module is imported by the browser form and by the server route that receives the submission, so both enforce exactly the same rules and a change is made once. Below, the two failure modes when the rules are written twice. A rule the client enforces but the server does not is a bug that any direct API call bypasses. A rule the server enforces but the client does not know about is a wasted round trip that the reader experiences as a form that accepted their input and then rejected it.</desc>
  <rect x="0" y="8" width="664" height="214" fill="#f9f5fb"/>
  <rect x="180" y="24" width="304" height="46" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="332" y="44" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">one schema module</text>
  <text x="332" y="62" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">changed once, enforced twice</text>
  <path d="M240,70 V94 H150" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M424,70 V94 H514" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="14" y="94" width="212" height="46" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="120" y="114" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">the browser form</text>
  <text x="120" y="132" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">fast feedback, per field</text>
  <rect x="438" y="94" width="212" height="46" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="544" y="114" text-anchor="middle" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">the server route</text>
  <text x="544" y="132" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">the actual guarantee</text>
  <rect x="14" y="158" width="316" height="46" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="178" font-size="10" font-weight="700" fill="#a63d6f" font-family="inherit">client-only rule</text>
  <text x="28" y="196" font-size="9.5" fill="#6b5f75" font-family="inherit">a bug — any direct API call walks past it</text>
  <rect x="346" y="158" width="304" height="46" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="360" y="178" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">server-only rule</text>
  <text x="360" y="196" font-size="9.5" fill="#6b5f75" font-family="inherit">a wasted trip — accepted, then rejected</text>
</svg>

## Formatted Inputs and Testing Validation

Two further subsystems sit alongside the validators themselves. **Formatted inputs** — phone numbers, card numbers, currency, dates — have a raw value that is validated and a display value that is shown, and most masking bugs come from confusing the two or from rewriting the input without preserving the caret. [Input masking and formatting](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/) separates them, with guides on [preserving caret position in masked inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/preserving-caret-position-in-masked-inputs/), [locale-aware number and currency inputs](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/locale-aware-number-and-currency-inputs/) and [validating international phone numbers](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/).

**Testing** closes the loop. Validation bugs live in timing, wiring and races more than in rules, so [testing form validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/) layers tests by what each can observe: pure rule and property-based tests, component tests with fake timers for timing and ARIA, network-level mocks for async checks and server errors, and a thin set of real-browser tests. [Mocking async validators with MSW](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/mocking-async-validators-with-msw/) shows how to reproduce the out-of-order response race deterministically.

On the server side, [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/) and [Problem Details (RFC 9457) for form errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/problem-details-rfc-9457-for-form-errors/) keep the rules and the error format consistent across the boundary.

---

## Error Propagation & Accessibility

Validation state that does not reach assistive technology is a WCAG 2.1 failure, not an edge case. The wiring is straightforward but must be synchronous with the state update — a separate `useEffect` that sets ARIA attributes a render later is too slow.

```typescript
// Apply ARIA state to an input immediately when validation results are written.
// Call this in the same update handler that writes errors to form state.
function syncAriaValidation(
  inputEl: HTMLInputElement,
  fieldName: string,
  errors: string[]
): void {
  if (errors.length > 0) {
    // aria-invalid tells screen readers the field has failed validation.
    inputEl.setAttribute('aria-invalid', 'true');
    // aria-describedby points to the element that contains the error text.
    // The error container must have id="${fieldName}-error" in the markup.
    inputEl.setAttribute('aria-describedby', `${fieldName}-error`);
  } else {
    inputEl.removeAttribute('aria-invalid');
    inputEl.removeAttribute('aria-describedby');
  }
}
```

The matching error container in markup:

```html
<input id="email" name="email" type="email" aria-describedby="email-error" />
<p id="email-error" role="alert" aria-live="polite"></p>
```

`role="alert"` on the error container triggers an implicit live region. Use `aria-live="polite"` for field-level errors (announced after the user pauses) and `aria-live="assertive"` only for submit-level failures that require immediate attention.

Never rely solely on color to communicate invalid state. Always pair `border-color: red` with a visible text message and the `aria-invalid` attribute.

See [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) for the full normalization layer that translates raw schema errors into display-ready messages with severity levels.

## Lifecycle Teardown

Failing to clean up is how validation logic creates memory leaks and ghost state updates. Expose a `destroy()` method as part of your validator API so callers have a deterministic cleanup path:

```typescript
interface ValidatorCleanup {
  (): void; // call this on component unmount or route change
}

function createFormValidator<T extends Record<string, unknown>>(
  descriptors: Record<keyof T, FieldDescriptor>
): { destroy: ValidatorCleanup } {
  // Track all debounce timers so they can be cleared on teardown.
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function destroy(): void {
    // 1. Clear every pending debounce timer to stop deferred async checks.
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();

    // 2. Abort every in-flight network request.
    // WeakMap entries are keyed by descriptor objects; iterate via
    // the descriptors record to reach each one.
    for (const descriptor of Object.values(descriptors)) {
      cancelPending(descriptor as FieldDescriptor);
    }

    // 3. Any reactive subscriptions (e.g. MobX reactions, Vue watchers,
    // Svelte store unsubscribers) must also be called here.
    // Store their cleanup functions in an array and iterate.
  }

  return { destroy };
}
```

Call `destroy()` in React's `useEffect` cleanup, Vue's `onUnmounted`, Svelte's `onDestroy`, or an Angular `ngOnDestroy` hook. Without this, navigating away from a multi-step form can leave async checks resolving into state that no longer has a mounted consumer.

## Common Pitfalls

**1. Running sync and async checks in the same execution path without a priority queue.** Async checks should only start *after* sync rules pass. If `safeParse` returns errors, skip the network round-trip entirely — there is nothing useful to check remotely on a malformed value.

**2. Storing `AbortController` instances in component-local variables instead of a stable `WeakMap`.** Local variables are re-created on every render in React function components, making the previous controller unreachable and its `abort()` method uncallable. Use a `useRef` or a module-scoped `WeakMap` keyed by a stable descriptor object.

**3. Updating ARIA attributes in a separate effect or microtask after state writes.** Screen readers observe attribute changes synchronously; a delayed write means the reader announces the previous state. Set `aria-invalid` and `aria-describedby` in the same operation that writes `errors` to field state.

**4. Re-validating the entire form on every field change instead of using a dependency graph.** In forms with async validators, this multiplies network requests linearly with field count. Build the dependency graph once at initialization and only re-trigger the fields it maps.

**5. Returning raw library error objects to the render layer.** Zod's `ZodIssue`, Yup's `ValidationError`, and Valibot's error objects all have different shapes. Normalize to `Record<string, string[]>` at the schema boundary so the render layer is library-agnostic.

**6. Not resetting `async_pending` / `validating` status on unmount.** If a `validating` field is removed from the DOM (conditional rendering, multi-step navigation), the status flag stays `validating` in state, which can block submit logic that checks `fields[name].status`.

**7. Bypassing the state machine with direct `setState` calls for programmatic resets.** A reset must go through the same transition logic as user input — clearing errors, aborting pending checks, and restoring `pristine` flags atomically. Direct mutation skips these side effects and leaves the form in an inconsistent state.

## Frequently Asked Questions

<details>
<summary><strong>How should form state handle concurrent validation triggers?</strong></summary>

Attach an `AbortController` to each field's pending async check. Every new input event calls `abort()` on the previous controller before creating a fresh one. Store controllers in a `WeakMap` keyed by the field descriptor object — not a string key — so that removed fields do not accumulate dead entries. Only the response from the most recently created controller should ever resolve into state.

</details>

<details>
<summary><strong>What is the most efficient way to map schema errors to UI components?</strong></summary>

Normalize raw validation outputs into a flat `Record<string, string[]>` in a dedicated translation layer immediately after `safeParse`. Map error codes to localized strings at that point, not in the render function. Apply `aria-invalid` and `aria-describedby` in the same synchronous operation that writes the normalized errors to state — never in a separate `useEffect` or watcher.

</details>

<details>
<summary><strong>When should validation be deferred versus executed synchronously?</strong></summary>

Execute synchronous schema rules on every blur event and unconditionally on submit. Defer async checks behind a 300–500 ms debounce, and only fire them if sync rules pass first. Never make a network round-trip for a value that already fails a local format check. Keep `validating` status scoped to the specific field rather than the whole form to avoid blocking unrelated submit-gate logic.

</details>

<details>
<summary><strong>How do you architect reset functionality without memory leaks?</strong></summary>

Maintain an immutable snapshot of the initial field values taken at form initialization. On reset, call `destroy()` to abort all in-flight requests and clear all debounce timers, then atomically replace the active state reference with the pristine snapshot. Deregister any reactive dependency subscriptions (Vue watchers, MobX reactions, Svelte store unsubscribers) before reinitializing them. Never mutate the snapshot itself — always copy it.

</details>

---

## Related

- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) — immediate feedback on blur and change events without blocking the main thread
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — runtime type parsing, schema composition, and typed error extraction
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — AbortController lifecycle, debounce coordination, and retry logic for network-bound checks
- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) — DAG-based re-validation triggers for interdependent fields

← [Home](https://www.client-side-form.com/)
