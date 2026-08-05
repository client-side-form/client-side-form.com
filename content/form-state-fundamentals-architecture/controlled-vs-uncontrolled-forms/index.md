---
layout: page.njk
title: "Controlled vs Uncontrolled Forms"
description: "Architecture and validation strategies for controlled and uncontrolled form patterns — state ownership, memory allocation, render performance, and a hybrid adapter that handles both."
slug: "controlled-vs-uncontrolled-forms"
type: topic
breadcrumb: "Controlled vs Uncontrolled Forms"
datePublished: "2024-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Controlled vs Uncontrolled Forms"
  parent: "Form State Fundamentals"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Controlled vs Uncontrolled Forms: Architecture & Validation Strategies",
      "description": "Architecture and validation strategies for controlled and uncontrolled form patterns — state ownership, memory allocation, render performance, and a hybrid adapter that handles both.",
      "datePublished": "2024-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Controlled vs Uncontrolled Forms", "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a hybrid controlled/uncontrolled form adapter",
      "step": [
        { "@type": "HowToStep", "name": "Define typed field config", "text": "Declare which fields are controlled and which are uncontrolled in a FormAdapterConfig." },
        { "@type": "HowToStep", "name": "Implement per-field validation with AbortController", "text": "Use a cancellable validation promise per field to prevent stale async results." },
        { "@type": "HowToStep", "name": "Extract uncontrolled values via FormData", "text": "Read uncontrolled field values from the DOM at validation or submit time via FormData." },
        { "@type": "HowToStep", "name": "Wire error state to ARIA attributes", "text": "Map error strings to aria-describedby targets so assistive technology announces errors." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "When should I choose uncontrolled over controlled forms?",
          "acceptedAnswer": { "@type": "Answer", "text": "Uncontrolled forms suit high-field-count inputs, file uploads, or third-party DOM owners. They eliminate per-keystroke re-renders but require manual validation wiring via refs or FormData." }
        },
        {
          "@type": "Question",
          "name": "How do I handle cross-field validation in uncontrolled components?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use a centralized validation coordinator that reads DOM values on blur or submit, applies the shared schema, and writes errors to a parallel error state rather than back to the input value." }
        },
        {
          "@type": "Question",
          "name": "Can controlled and uncontrolled inputs coexist in the same form?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. An adapter normalizes value extraction and validation routing across both types, preventing state collisions and ensuring consistent error propagation." }
        },
        {
          "@type": "Question",
          "name": "How do I cancel an in-flight async validator when the user edits the field again?",
          "acceptedAnswer": { "@type": "Answer", "text": "Store an AbortController per field. On each new validation run, call abort() on the previous controller before starting a new fetch, and check signal.aborted inside the validator to discard stale results." }
        }
      ]
    }
  ]
}
</script>

# Controlled vs Uncontrolled Forms: Architecture & Validation Strategies

The split between controlled and uncontrolled inputs is one of the earliest architectural commitments in a form system — and one of the costliest to reverse mid-lifecycle. This page maps the state ownership model for each paradigm, shows where validation pipelines diverge, and provides a production-ready TypeScript adapter that unifies both under a single validation contract.

## Problem Statement

You are building a form with mixed complexity: some fields need real-time cross-field validation (password / confirm-password, promo code that unlocks a discount tier), while others are large file inputs or third-party widgets whose DOM the framework must not own. Picking one paradigm globally means either over-rendering on every keystroke or losing the simplicity of framework-managed state. The failure modes look like:

- **Stale DOM reads:** an uncontrolled field's `ref.current.value` returns the previous value because a programmatic reset did not propagate.
- **Hydration mismatches:** an SSR server renders a controlled input value that the client's uncontrolled ref did not pick up, causing React's reconciler to warn and potentially blank the field.
- **Validation desync:** a validator fires against React state for some fields and against the DOM for others, producing contradictory error messages when both are displayed at once.

The pattern that resolves all three is an explicit adapter that declares which fields belong to which paradigm and centralises value extraction.

## State Machine: Field Ownership Lifecycle

Each field in a hybrid form moves through a defined ownership lifecycle. The diagram below shows the states for a single field and the transitions that shift it between controlled, uncontrolled, and error modes.

<svg role="img" aria-label="State machine diagram for a form field's ownership lifecycle moving from IDLE through VALIDATING to VALID, INVALID, or RETRYABLE states" viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:720px;display:block;margin:2rem auto;">
  <title>Form Field Ownership State Machine</title>
  <desc>A state machine showing how a form field transitions from IDLE to VALIDATING, then to VALID, INVALID, or RETRYABLE, with arrows indicating user input, validator resolution, validator rejection, and retry triggers.</desc>
  <rect x="0" y="0" width="720" height="340" fill="#f9f5fb"/>
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6 Z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- IDLE -->
  <rect x="20" y="130" width="110" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="75" y="158" text-anchor="middle" font-size="13" font-family="inherit" fill="#1e1a24" font-weight="600">IDLE</text>
  <!-- VALIDATING -->
  <rect x="290" y="130" width="140" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="360" y="158" text-anchor="middle" font-size="13" font-family="inherit" fill="#1e1a24" font-weight="600">VALIDATING</text>
  <!-- VALID -->
  <rect x="560" y="40" width="110" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="615" y="68" text-anchor="middle" font-size="13" font-family="inherit" fill="#1e1a24" font-weight="600">VALID</text>
  <!-- INVALID -->
  <rect x="560" y="140" width="110" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="615" y="168" text-anchor="middle" font-size="13" font-family="inherit" fill="#1e1a24" font-weight="600">INVALID</text>
  <!-- RETRYABLE -->
  <rect x="560" y="240" width="110" height="48" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="615" y="268" text-anchor="middle" font-size="13" font-family="inherit" fill="#1e1a24" font-weight="600">RETRYABLE</text>
  <!-- IDLE → VALIDATING -->
  <line x1="130" y1="154" x2="288" y2="154" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="209" y="145" text-anchor="middle" font-size="11" font-family="inherit" fill="#6b5f75">user input / blur</text>
  <!-- VALIDATING → VALID -->
  <line x1="430" y1="143" x2="558" y2="76" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="506" y="100" text-anchor="middle" font-size="11" font-family="inherit" fill="#6b5f75">resolves null</text>
  <!-- VALIDATING → INVALID -->
  <line x1="430" y1="160" x2="558" y2="162" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="494" y="153" text-anchor="middle" font-size="11" font-family="inherit" fill="#6b5f75">error string</text>
  <!-- VALIDATING → RETRYABLE -->
  <line x1="430" y1="172" x2="558" y2="252" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="506" y="230" text-anchor="middle" font-size="11" font-family="inherit" fill="#6b5f75">network error</text>
  <!-- VALID → IDLE (re-edit) -->
  <path d="M615,40 Q640,20 380,20 Q120,20 75,128" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
  <text x="360" y="14" text-anchor="middle" font-size="10" font-family="inherit" fill="#6b5f75">re-edit</text>
  <!-- INVALID → IDLE (re-edit) -->
  <path d="M560,164 Q540,200 300,210 Q130,210 75,180" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
  <text x="310" y="225" text-anchor="middle" font-size="10" font-family="inherit" fill="#6b5f75">re-edit</text>
  <!-- RETRYABLE → VALIDATING (retry) -->
  <path d="M560,264 Q530,310 430,310 Q370,310 360,180" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#arrow)"/>
  <text x="460" y="322" text-anchor="middle" font-size="10" font-family="inherit" fill="#6b5f75">retry trigger</text>
</svg>

The ownership decision (controlled vs. uncontrolled) is fixed at mount time per field. Transitions between validation states happen identically for both paradigms — only the value-extraction mechanism differs.

## State Ownership & Memory Allocation

**Controlled components** route every keystroke through framework state. The framework is always the single source of truth for the field value, which makes validation, conditional rendering, and cross-field logic straightforward. The cost is a synchronous state update on every character — fine for most forms, measurable at scale when field counts exceed fifty or validators run heavy synchronous transforms.

**Uncontrolled components** store their value in the DOM. The framework does not own the value; you read it on demand via a ref or `FormData`. This eliminates per-keystroke re-renders, but complicates cross-field dependency resolution because you must imperatively pull values rather than reading from a reactive store.

Tracking which fields have changed requires explicit [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) logic in both cases. For controlled components, compare current state against the initial snapshot. For uncontrolled components, compare the DOM's current `value` against a snapshot stored at mount time.

### Event Delegation & Render Batching

Controlled inputs trigger synchronous state updates, which React 18 batches automatically across most event handlers. Uncontrolled inputs bypass the render queue entirely — reads happen imperatively, outside the framework's scheduling. Framework event pooling and synthetic event normalization both introduce subtle timing differences: React's `onChange` fires on every character, but a native `input` listener fires before React's own handler. Test both paths with your target browsers before committing to one model.

Vue's `v-model` directive wraps a controlled pattern but allows `.lazy` to debounce to `change` events — a useful middle ground when per-keystroke updates are too expensive but full uncontrolled DOM ownership is undesirable.

## Validation Pipeline Integration

The [form validation lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) applies to both paradigms, but the wiring diverges at the point of value extraction:

- **Controlled forms:** validators receive values directly from state. Real-time schema evaluation and inline error injection work without extra plumbing. Schema libraries like Zod can evaluate on every state change, and the error shape flows directly to UI components via [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/).
- **Uncontrolled forms:** validators must pull values from refs or the Constraint Validation API (`input.checkValidity()`, `input.setCustomValidity()`). Validation results must be written back to a parallel error state — not to the field value itself — and then re-rendered as error messages.

The most important architectural constraint is that **validation rules must be decoupled from both paradigms**: pure functions that accept a value and return `string | null` or `Promise<string | null>` compose identically for controlled and uncontrolled fields, and they remain testable without a DOM.

## Core Implementation: Hybrid Adapter

Large forms routinely mix controlled validation logic with uncontrolled performance characteristics. The adapter below standardises value extraction, cancellable async validation, and error accumulation across both input types.

```typescript
// AbortController stored per-field so each new validation run can cancel the previous one.
// Without this, a slow network validator from keystroke N can overwrite the result of keystroke N+1.
type ValidationRule<T> = (
  value: T,
  context: Record<string, unknown>,
  signal: AbortSignal  // Passed through so fetch/async calls can self-cancel
) => Promise<string | null> | string | null;

interface FormAdapterConfig<T extends Record<string, unknown>> {
  controlledFields: (keyof T)[];
  uncontrolledFields: (keyof T)[];
  schema: Partial<Record<keyof T, ValidationRule<T[keyof T]>>>;
}

export class FormValidationAdapter<T extends Record<string, unknown>> {
  private config: FormAdapterConfig<T>;
  private errors: Partial<Record<keyof T, string>> = {};

  // One AbortController per field — cancels the previous async validator on each new invocation.
  // WeakMap would be ideal for DOM-node keys, but field names are strings so Map is correct here.
  private controllers: Map<keyof T, AbortController> = new Map();

  constructor(config: FormAdapterConfig<T>) {
    this.config = config;
  }

  async validateField(
    field: keyof T,
    value: T[keyof T],
    context: T
  ): Promise<string | null> {
    const rule = this.config.schema[field];
    if (!rule) return null;

    // Abort any in-progress validation for this field before starting a new one.
    // This prevents out-of-order error rendering when the user types faster than the validator resolves.
    const prev = this.controllers.get(field);
    if (prev) prev.abort();

    const controller = new AbortController();
    this.controllers.set(field, controller);

    try {
      const error = await Promise.resolve(
        rule(value, context, controller.signal)
      );

      // Discard the result if the field was edited again before this run finished.
      if (controller.signal.aborted) return null;

      if (error) {
        this.errors[field] = error;
      } else {
        delete this.errors[field];
      }
      return error;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const msg = err instanceof Error ? err.message : 'Validation error occurred';
      this.errors[field] = msg;
      return msg;
    } finally {
      // Remove the controller once the run is complete to avoid a memory leak
      // when the field is unmounted before the next validation cycle.
      if (this.controllers.get(field) === controller) {
        this.controllers.delete(field);
      }
    }
  }

  /** Read all uncontrolled field values from the DOM at validation or submit time. */
  extractUncontrolledValues(formRef: HTMLFormElement | null): Partial<T> {
    if (!formRef) return {};

    // FormData is the canonical API for reading uncontrolled inputs — it handles
    // checkboxes, multi-selects, and file inputs correctly without manual iteration.
    const formData = new FormData(formRef);
    const values: Partial<T> = {};

    for (const field of this.config.uncontrolledFields) {
      const rawValue = formData.get(field as string);
      if (rawValue !== null) {
        values[field] = rawValue as unknown as T[keyof T];
      }
    }
    return values;
  }

  getErrors(): Readonly<Partial<Record<keyof T, string>>> {
    return { ...this.errors };
  }

  /** Abort all pending validators and clear error state — call on form reset. */
  resetState(): void {
    // Cancel every in-flight async validator to prevent stale results
    // from re-appearing after the form is reset to its pristine state.
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();
    this.errors = {};
  }
}
```

### Wiring the Adapter to ARIA Error Attributes

After `validateField` resolves, write the error string to a `<span>` with a matching `id`, then point the input's `aria-describedby` at that id and toggle `aria-invalid`:

```typescript
function applyFieldError(
  inputEl: HTMLInputElement,
  errorEl: HTMLElement,
  error: string | null
): void {
  if (error) {
    errorEl.textContent = error;
    inputEl.setAttribute('aria-invalid', 'true');
    // aria-describedby must reference the error container's id so screen readers
    // announce the message when the field receives focus after a failed submission.
    inputEl.setAttribute('aria-describedby', errorEl.id);
  } else {
    errorEl.textContent = '';
    inputEl.removeAttribute('aria-invalid');
    inputEl.removeAttribute('aria-describedby');
  }
}
```

This pattern applies whether the field is controlled (call after state update) or uncontrolled (call after `extractUncontrolledValues`). For more on mapping errors to UI components, see [mapping validation errors to UI components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/).

### The ownership matrix

Every field in a form answers two questions independently: who holds the value between keystrokes, and who is allowed to change it. The four combinations behave very differently, and only three of them are legitimate:

<svg viewBox="0 8 700 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Matrix of value ownership. React-owned value with React-only writes is a controlled field. DOM-owned value with user-only writes is an uncontrolled field. DOM-owned value that React also writes through a ref is a hybrid field, which is legitimate when writes are rare. React-owned value that the DOM also writes is the broken quadrant that produces the switching warning." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Who owns the value, and who is allowed to write it</title>
  <desc>A two-by-two matrix. Value in React state and only React writes: a controlled field, predictable and the default choice. Value in the DOM and only the user writes: an uncontrolled field, the cheapest option and the right one for very large forms. Value in the DOM with React writing occasionally through a ref: a hybrid field, legitimate when programmatic writes are rare, such as a reset or an autofill. Value in React state with the DOM also writing: the broken quadrant, which produces React's controlled-to-uncontrolled warning and loses keystrokes.</desc>
  <rect x="0" y="8" width="700" height="210" fill="#f9f5fb"/>
  <text x="196" y="30" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">only the user writes</text>
  <text x="482" y="30" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">code also writes</text>
  <text x="14" y="86" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">value lives</text>
  <text x="14" y="102" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">in the DOM</text>
  <text x="14" y="164" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">value lives</text>
  <text x="14" y="180" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">in state</text>
  <rect x="110" y="40" width="272" height="82" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="124" y="62" font-size="11" font-weight="700" fill="#2d6342" font-family="inherit">uncontrolled</text>
  <text x="124" y="80" font-size="9.5" fill="#6b5f75" font-family="inherit">zero renders per keystroke; read on submit</text>
  <text x="124" y="96" font-size="9.5" fill="#6b5f75" font-family="inherit">with FormData or a ref</text>
  <text x="124" y="112" font-size="9.5" fill="#6b5f75" font-family="inherit">cheapest at 100+ fields</text>
  <rect x="396" y="40" width="290" height="82" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="410" y="62" font-size="11" font-weight="700" fill="#b07a55" font-family="inherit">hybrid — legitimate, with care</text>
  <text x="410" y="80" font-size="9.5" fill="#6b5f75" font-family="inherit">DOM holds the value; code writes it via a ref</text>
  <text x="410" y="96" font-size="9.5" fill="#6b5f75" font-family="inherit">only for rare events: reset, autofill, restore</text>
  <text x="410" y="112" font-size="9.5" fill="#6b5f75" font-family="inherit">must dispatch an input event to stay in sync</text>
  <rect x="110" y="130" width="272" height="82" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="124" y="152" font-size="11" font-weight="700" fill="#a63d6f" font-family="inherit">the broken quadrant</text>
  <text x="124" y="170" font-size="9.5" fill="#6b5f75" font-family="inherit">state is the source of truth but the DOM</text>
  <text x="124" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">also mutates it — keystrokes are lost and</text>
  <text x="124" y="202" font-size="9.5" fill="#6b5f75" font-family="inherit">React logs the switching warning</text>
  <rect x="396" y="130" width="290" height="82" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="410" y="152" font-size="11" font-weight="700" fill="#2d6342" font-family="inherit">controlled</text>
  <text x="410" y="170" font-size="9.5" fill="#6b5f75" font-family="inherit">one owner, one write path, fully predictable</text>
  <text x="410" y="186" font-size="9.5" fill="#6b5f75" font-family="inherit">costs a render per keystroke per subscriber</text>
  <text x="410" y="202" font-size="9.5" fill="#6b5f75" font-family="inherit">the default until profiling says otherwise</text>
</svg>

## Integration Guidance

The adapter slots into the [form state fundamentals architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/) as the normalisation layer between the DOM and your validation schema:

1. At mount, pass your field config to `FormValidationAdapter` — this is the only place where controlled vs. uncontrolled ownership is declared.
2. On each `input` or `blur` event, call `validateField` with the current value. For controlled fields, read from state. For uncontrolled fields, pass `event.target.value` directly (do not wait for a ref read).
3. On submit, call `extractUncontrolledValues` to harvest the full DOM snapshot, merge it with controlled state, then run `validateField` across all fields in parallel.
4. On reset, call `resetState` before restoring initial values, ensuring no aborted validators resurface stale errors.

For React specifically, the adapter class instance should live in a `useRef` (not `useState`) so it is stable across renders. See [building a custom `useFormField` hook](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/) for a complete React integration.

## Edge Cases & Failure Modes

**Hydration mismatches with SSR**
When the server renders an input as controlled (with a value attribute) but the client mounts it as uncontrolled, React's reconciler will either warn or silently drop the server-rendered value. Resolution: during SSR, read the initial value from the store and write it to the `defaultValue` prop for uncontrolled inputs, never to `value`. After hydration the ref picks up the DOM value and stays in sync.

**Autofill bypasses uncontrolled refs**
Browser autofill can populate inputs without triggering `input` or `change` events, leaving refs stale. Resolution: listen for the `animationstart` event on inputs with the `autocomplete` attribute set — browsers trigger a CSS animation on autofilled fields that you can intercept to force a ref read.

**Shadow DOM field boundaries**
Custom elements inside a shadow root do not participate in the outer `FormData` collection unless the element implements the `ElementInternals` API with `setFormValue`. Uncontrolled refs that point across shadow boundaries may return `null`. Resolution: use `internals.setFormValue()` in the custom element and validate via its `form` property rather than a direct ref.

**`React.StrictMode` double-invocation**
In development, `StrictMode` mounts and unmounts components twice. If `resetState` or the adapter constructor has side effects (timers, subscriptions), they fire twice and may leave the error map in an unexpected state. Resolution: make the constructor idempotent — initialise `errors` and `controllers` as empty maps, never from a pre-populated argument.

**Cross-field validators reading stale uncontrolled values**
If field A's validator reads field B's uncontrolled ref synchronously, and field B was just programmatically reset, the ref may still hold the old value. Resolution: always extract uncontrolled values via `extractUncontrolledValues` at the start of a cross-field validation run, never from a cached ref snapshot taken at mount.

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|---|---|---|
| Error message appears after reset | Check `resetState` is called before restoring initial values | Call `adapter.resetState()` first, then set controlled state / reset form element |
| Stale async error overwrites valid result | Log `controller.signal.aborted` inside the validator | Add `if (signal.aborted) return null` as the first line of async validators |
| Uncontrolled field always reads empty string | Check `name` attribute matches the key in `uncontrolledFields` | Ensure every uncontrolled input has a `name` attribute; `FormData.get(key)` returns `null` without it |
| Hydration warning on SSR uncontrolled input | Inspect server HTML for `value=` attribute on uncontrolled inputs | Switch to `defaultValue` prop; never set `value` on an uncontrolled input after mount |
| `aria-describedby` not announced by screen reader | Verify the error `<span>` id exists in the DOM before the input renders | Render the error container in the initial HTML even when empty; do not conditionally mount it |

Cost is the other half of the decision, and it scales with field count rather than with taste:

<svg viewBox="0 8 660 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar comparison of renders caused by typing thirty characters into one field of a form. A fully controlled form with a shared state object renders every field on every keystroke. A controlled form with per-field subscriptions renders only the edited field. An uncontrolled form renders nothing until submit." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Component renders while typing 30 characters, 60-field form</title>
  <desc>Three bars showing total component renders caused by typing thirty characters into one field of a sixty-field form. A single shared state object at the form root produces about eighteen hundred renders, because every field re-renders on every keystroke. Per-field subscriptions through an external store produce about thirty renders, one per keystroke for the edited field only. An uncontrolled form produces zero renders while typing, with the values read once at submit.</desc>
  <rect x="0" y="8" width="660" height="224" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Renders while typing 30 characters into one field of a 60-field form</text>
  <text x="14" y="58" font-size="10" fill="#1e1a24" font-family="inherit">shared state object</text>
  <rect x="176" y="44" width="440" height="22" rx="4" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="624" y="60" font-size="10" fill="#a63d6f" font-family="inherit">1800</text>
  <text x="14" y="74" font-size="9.5" fill="#6b5f75" font-family="inherit">30 keystrokes × 60 fields</text>
  <text x="14" y="112" font-size="10" fill="#1e1a24" font-family="inherit">per-field subscriptions</text>
  <rect x="176" y="98" width="18" height="22" rx="4" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="202" y="114" font-size="10" fill="#2d6342" font-family="inherit">30</text>
  <text x="14" y="128" font-size="9.5" fill="#6b5f75" font-family="inherit">30 keystrokes × 1 field</text>
  <text x="14" y="166" font-size="10" fill="#1e1a24" font-family="inherit">uncontrolled</text>
  <rect x="176" y="152" width="4" height="22" rx="2" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="190" y="168" font-size="10" fill="#2d6342" font-family="inherit">0 until submit</text>
  <text x="14" y="182" font-size="9.5" fill="#6b5f75" font-family="inherit">the browser owns the value</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">The middle row is the honest default: it keeps a single write path and one owner while costing what uncontrolled costs.</text>
  <text x="14" y="228" font-size="10" fill="#6b5f75" font-family="inherit">Reach for the bottom row only when profiling shows the render itself — not the validator — is the bottleneck.</text>
</svg>

## Testing & QA Hooks

Attach `data-field` and `data-field-state` attributes to every input so Playwright and Cypress selectors stay decoupled from CSS class names:

```typescript
// Set on mount and update after every validateField call
inputEl.dataset.field = String(field);
inputEl.dataset.fieldState = error ? 'invalid' : 'valid';
```

In Playwright:

```typescript
// Select a specific field regardless of its position in the DOM
const emailInput = page.locator('[data-field="email"]');
await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
await expect(page.locator('[data-field="email"][data-field-state="invalid"]')).toBeVisible();
```

For accessibility regression coverage, assert that every `aria-invalid="true"` input has a non-empty `aria-describedby` target. A Playwright helper that iterates `data-field-state="invalid"` elements and checks their `aria-describedby` chain catches the category of error most likely to regress across refactors.

## Common Pitfalls

- **Mixing `value` and `defaultValue` on the same input.** React treats an input with `value` as controlled and one with `defaultValue` as uncontrolled. Setting both — or switching between them at runtime — produces the "A component is changing an uncontrolled input to be controlled" warning and undefined state.
- **Reading `ref.current.value` inside an async callback.** By the time a delayed validator resolves, the ref may point to a different value. Capture `ref.current.value` synchronously at the start of the validation run and pass it as a closed-over variable.
- **Forgetting `name` attributes on uncontrolled inputs.** `FormData` silently omits inputs without a `name`. The omission produces no error — the value is simply missing from the extracted object, causing silent validation bypasses.
- **Not aborting validators on unmount.** If a component unmounts mid-validation and the adapter is not destroyed, the pending `AbortController` holds a closure reference to the component's error state, preventing garbage collection. Call `resetState()` in the component's cleanup function.
- **Triggering cross-field validation synchronously on every keystroke.** When field A's validator reads field B's value synchronously on every character typed in field A, it produces N² reads for an N-field form. Debounce cross-field runs and batch them to submit or blur events.

## Frequently Asked Questions

<details>
<summary><strong>When should I choose uncontrolled over controlled forms?</strong></summary>

Uncontrolled forms are a good fit for high-field-count inputs (fifty or more fields), file uploads, or cases where a third-party library owns the DOM element and does not expose a controlled-value interface. They cut render cycles but require manual validation wiring via refs or `FormData`. Controlled forms are simpler to reason about and test for anything interactive where real-time cross-field feedback is expected.

</details>

<details>
<summary><strong>How do I handle cross-field validation in uncontrolled components?</strong></summary>

Implement a centralised validation coordinator that calls `extractUncontrolledValues` on blur or submit to get a full value snapshot, then runs cross-field checks against that snapshot. Write the resulting errors to a separate error state (not back to the input value) and re-render error messages from there. Never read refs inside the cross-field validator itself — the ref is a live reference that changes between keystrokes.

</details>

<details>
<summary><strong>Can controlled and uncontrolled inputs coexist in the same form?</strong></summary>

Yes, through an adapter that normalises value extraction and validation routing. The adapter tracks which fields are controlled and which are uncontrolled, preventing state collisions and ensuring consistent error propagation across both paradigms. The key constraint is that the ownership of each field must be fixed at mount time and must not change during the component's lifetime.

</details>

<details>
<summary><strong>How do I cancel an in-flight async validator when the user edits the field again?</strong></summary>

Store one `AbortController` per field in the adapter (a `Map<keyof T, AbortController>` keyed by field name). Before starting a new validation run, call `abort()` on the existing controller for that field. Inside the async validator, accept the `AbortSignal` as a parameter and pass it to any `fetch` calls. Check `signal.aborted` before writing results back to error state. This pattern is shown in full in the `validateField` implementation above.

</details>

---

## Related

- [Best Practices for Uncontrolled Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) — imperative DOM read patterns, ref snapshots, and reset safety
- [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — comparing current values against initial snapshots for both paradigms
- [Form Validation Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/) — the full event sequence from mount through submit and teardown
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — routing validation errors to the correct UI components

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
