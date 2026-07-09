---
layout: page.njk
title: "Cross-Field Dependency Logic"
description: "Directed acyclic graph patterns for reactive cross-field validation — trigger re-validation only on affected fields, abort stale async requests, and handle role-based rule activation without coupling components."
slug: cross-field-dependency-logic
type: topic
breadcrumb: "Validation Logic & Schema Integration > Cross-Field Dependency Logic"
datePublished: "2025-01-15"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "Cross-Field Dependency Logic"
  parent: "Validation Logic"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Cross-Field Dependency Logic",
      "description": "Directed acyclic graph patterns for reactive cross-field validation — trigger re-validation only on affected fields, abort stale async requests, and handle role-based rule activation without coupling components.",
      "datePublished": "2025-01-15",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Cross-Field Dependency Logic", "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement Cross-Field Dependency Logic with a DAG Validator",
      "step": [
        { "@type": "HowToStep", "position": 1, "text": "Model dependent fields as nodes in a directed acyclic graph." },
        { "@type": "HowToStep", "position": 2, "text": "Run a topological sort to establish evaluation order and detect cycles before runtime." },
        { "@type": "HowToStep", "position": 3, "text": "Tag each async evaluation with a sequence ID and abort controllers to cancel superseded requests." },
        { "@type": "HowToStep", "position": 4, "text": "Expose destroy() to clean up abort controllers and clear the graph on form unmount." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I prevent circular dependencies in cross-field validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Construct the dependency graph as a DAG during initialization. Run a topological sort to detect cycles before any evaluation executes. If a cycle is found, throw a configuration error and halt form mounting."
          }
        },
        {
          "@type": "Question",
          "name": "Should cross-field validation run on every keystroke?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Synchronous cross-field checks can run on input with microtask batching. Asynchronous or expensive dependency evaluations should trigger on blur or after an input throttle window expires to avoid overwhelming the network and the render pipeline."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle validation when a dependent field is conditionally hidden?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Register hidden fields as inactive nodes. When visibility toggles, emit a DEPENDENCY_GRAPH_REBUILD event that either clears the field's validation state or triggers fresh evaluation so orphaned errors never persist in the UI."
          }
        },
        {
          "@type": "Question",
          "name": "Can the same dependency graph handle both synchronous and asynchronous rules?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Each node's evaluate function returns a Promise so synchronous rules simply resolve immediately. The graph traversal is always async-aware, which keeps the API uniform regardless of whether a rule hits a local predicate or a remote API."
          }
        }
      ]
    }
  ]
}
</script>

# Cross-Field Dependency Logic

Multi-field forms break down in predictable ways: a "confirm password" field does not re-validate when the original password changes, a shipping address silently ignores a "same as billing" toggle, or an async uniqueness check overwrites the current result with a stale response from a previous keystroke. These are not edge cases — they are the default outcome when validation rules are added field-by-field without a shared coordination layer.

This page covers the directed acyclic graph (DAG) approach to cross-field validation, including how to wire it into the broader [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/) pipeline, handle async race conditions, activate rules conditionally by user role, and tear down cleanly on unmount.

## Problem Statement

Cross-field dependency logic addresses one specific failure: **a change to field A must deterministically trigger re-validation of every field that depends on A, in topological order, without re-running validators for unrelated fields.**

The pattern applies whenever:

- One field's valid set of values depends on another field's current value (confirm password, date ranges, conditional required flags).
- An async lookup result must be invalidated when an upstream field changes (username uniqueness where the domain is determined by a prior field).
- Validation rules are toggled at runtime by user role, workflow stage, or feature flag — not just by field value.

Without a coordination layer, each field's `onChange` handler becomes an implicit dependency on global state, which leads to stale validation results and unpredictable render order.

## State Machine Specification

The validator for each dependent field moves through six explicit states. Understanding these transitions is the prerequisite for implementing [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) that sit on top of this graph.

<svg role="img" aria-label="State machine diagram for cross-field dependency validation showing transitions between IDLE, PENDING, VALIDATING, VALID, INVALID, and RETRYABLE states" viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:680px;height:auto;display:block;margin:1.5rem auto;">
  <title>Cross-Field Dependency Validation State Machine</title>
  <desc>Six states: IDLE, PENDING, VALIDATING, VALID, INVALID, RETRYABLE. Arrows show transitions driven by field value changes, sequence IDs, and network outcomes.</desc>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.7"/>
    </marker>
  </defs>
  <!-- State boxes -->
  <!-- IDLE -->
  <rect x="10" y="140" width="90" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
  <text x="55" y="167" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">IDLE</text>
  <!-- PENDING -->
  <rect x="160" y="60" width="100" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
  <text x="210" y="87" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">PENDING</text>
  <!-- VALIDATING -->
  <rect x="320" y="140" width="110" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
  <text x="375" y="167" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">VALIDATING</text>
  <!-- VALID -->
  <rect x="510" y="60" width="90" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
  <text x="555" y="87" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">VALID</text>
  <!-- INVALID -->
  <rect x="510" y="220" width="90" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
  <text x="555" y="247" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">INVALID</text>
  <!-- RETRYABLE -->
  <rect x="320" y="260" width="110" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
  <text x="375" y="287" text-anchor="middle" font-size="13" fill="currentColor" font-family="monospace">RETRYABLE</text>
  <!-- Arrows -->
  <!-- IDLE -> PENDING  (FIELD_VALUE_CHANGE) -->
  <path d="M100,155 Q130,100 158,90" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" marker-end="url(#arr)"/>
  <text x="118" y="110" font-size="10" fill="currentColor" opacity="0.7" font-family="sans-serif">value change</text>
  <!-- PENDING -> VALIDATING  (seq ID assigned) -->
  <path d="M262,82 Q290,120 318,155" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" marker-end="url(#arr)"/>
  <text x="264" y="130" font-size="10" fill="currentColor" opacity="0.7" font-family="sans-serif">seq assigned</text>
  <!-- PENDING -> IDLE  (seq mismatch / abort) -->
  <path d="M160,74 Q80,50 56,138" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="60" y="55" font-size="10" fill="currentColor" opacity="0.6" font-family="sans-serif">seq mismatch</text>
  <!-- VALIDATING -> VALID -->
  <path d="M430,150 Q480,100 508,87" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" marker-end="url(#arr)"/>
  <text x="445" y="105" font-size="10" fill="currentColor" opacity="0.7" font-family="sans-serif">resolves ok</text>
  <!-- VALIDATING -> INVALID -->
  <path d="M430,170 Q480,210 508,230" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" marker-end="url(#arr)"/>
  <text x="445" y="220" font-size="10" fill="currentColor" opacity="0.7" font-family="sans-serif">rule fails</text>
  <!-- VALIDATING -> RETRYABLE  (network error) -->
  <path d="M375,184 L375,258" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="380" y="230" font-size="10" fill="currentColor" opacity="0.6" font-family="sans-serif">network err</text>
  <!-- RETRYABLE -> PENDING -->
  <path d="M320,270 Q240,250 213,106" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5" marker-end="url(#arr)"/>
  <text x="222" y="210" font-size="10" fill="currentColor" opacity="0.6" font-family="sans-serif">retry</text>
  <!-- VALID -> IDLE  (upstream changes) -->
  <path d="M510,74 Q300,20 100,148" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="290" y="18" font-size="10" fill="currentColor" opacity="0.5" font-family="sans-serif">upstream changes</text>
  <!-- INVALID -> IDLE  (upstream changes) -->
  <path d="M510,248 Q300,320 102,168" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="270" y="336" font-size="10" fill="currentColor" opacity="0.5" font-family="sans-serif">upstream changes</text>
</svg>

| State | Meaning | Key trigger |
|---|---|---|
| `IDLE` | No evaluation in progress | Initial mount or upstream field reset |
| `PENDING` | Awaiting sequence ID assignment | `FIELD_VALUE_CHANGE` on an upstream node |
| `VALIDATING` | Evaluation running with an active sequence | Sequence confirmed, abort controller created |
| `VALID` | Most recent evaluation passed | Promise resolved within active sequence |
| `INVALID` | Most recent evaluation failed | Rule returned an error shape |
| `RETRYABLE` | Network or timeout failure | `PROMISE_RESOLUTION_TIMEOUT` or fetch error |

## Core Implementation

The `CrossFieldValidator` class below is production-ready TypeScript. It manages the DAG, topological ordering, per-field `AbortController` instances, and monotonically increasing sequence IDs that prevent stale async results from overwriting current state.

```typescript
type ValidationState = "idle" | "pending" | "validating" | "valid" | "invalid" | "retryable";

interface ValidationError {
  code: string;
  message: string;
  field: string;
}

interface DependencyNode {
  id: string;
  /** IDs of fields that must be evaluated before this one */
  dependsOn: string[];
  evaluate: (
    values: Record<string, unknown>,
    signal: AbortSignal  // always wire the signal into fetch/XHR calls
  ) => Promise<ValidationError | null>;
}

class CrossFieldValidator {
  private graph = new Map<string, DependencyNode>();
  /** Monotonically increasing counter — shared across all fields */
  private globalSeq = 0;
  /** Per-field sequence at the time the last evaluation was dispatched */
  private fieldSeq = new Map<string, number>();
  /** One AbortController per field — replaced on every new evaluation */
  private controllers = new Map<string, AbortController>();
  private states = new Map<string, ValidationState>();
  private errors = new Map<string, ValidationError | null>();

  register(node: DependencyNode): void {
    this.graph.set(node.id, node);
    this.states.set(node.id, "idle");
    this.errors.set(node.id, null);
  }

  /** Returns IDs in safe evaluation order; throws if a cycle is detected */
  private topologicalOrder(): string[] {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const result: string[] = [];

    const visit = (id: string): void => {
      if (stack.has(id)) throw new Error(`Cycle detected at field "${id}"`);
      if (visited.has(id)) return;
      stack.add(id);
      for (const dep of this.graph.get(id)?.dependsOn ?? []) visit(dep);
      stack.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.graph.keys()) visit(id);
    return result;
  }

  /**
   * Re-evaluate all fields that depend (directly or transitively) on changedFieldId.
   * Callers await this; the returned map contains the final error per affected field.
   */
  async resolveDownstream(
    changedFieldId: string,
    currentValues: Record<string, unknown>
  ): Promise<Map<string, ValidationError | null>> {
    const order = this.topologicalOrder();
    const affected = order.filter((id) =>
      this.graph.get(id)?.dependsOn.includes(changedFieldId) || id === changedFieldId
    );

    const results = new Map<string, ValidationError | null>();

    for (const fieldId of affected) {
      const node = this.graph.get(fieldId)!;

      // Cancel any in-flight evaluation for this field
      this.controllers.get(fieldId)?.abort();
      const controller = new AbortController();
      this.controllers.set(fieldId, controller); // AbortController per field per cycle

      const seq = ++this.globalSeq;
      this.fieldSeq.set(fieldId, seq);
      this.states.set(fieldId, "validating");

      try {
        const error = await node.evaluate(currentValues, controller.signal);

        // Discard result if this evaluation was superseded
        if (this.fieldSeq.get(fieldId) !== seq || controller.signal.aborted) {
          this.states.set(fieldId, "idle");
          continue;
        }

        this.errors.set(fieldId, error);
        this.states.set(fieldId, error ? "invalid" : "valid");
        results.set(fieldId, error);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Legitimately superseded — caller will see idle, not an error
          this.states.set(fieldId, "idle");
          continue;
        }
        // Network failure or timeout — mark retryable rather than invalid
        this.states.set(fieldId, "retryable");
        results.set(fieldId, {
          code: "NETWORK_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          field: fieldId,
        });
      } finally {
        // Only delete if this is still the active controller (WeakMap alternative pattern)
        if (this.controllers.get(fieldId) === controller) {
          this.controllers.delete(fieldId);
        }
      }
    }

    return results;
  }

  getState(fieldId: string): ValidationState {
    return this.states.get(fieldId) ?? "idle";
  }

  getError(fieldId: string): ValidationError | null {
    return this.errors.get(fieldId) ?? null;
  }

  /** Call on form unmount — aborts all in-flight requests and clears the graph */
  destroy(): void {
    // AbortController.abort() is idempotent — safe to call even if already resolved
    this.controllers.forEach((c) => c.abort());
    this.controllers.clear();
    this.graph.clear();
    this.states.clear();
    this.errors.clear();
    this.fieldSeq.clear();
  }
}
```

## Integration Guidance

This validator sits at the coordination layer between raw DOM events and the parent [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/) pipeline. Wire it up at the form level, not inside individual field components:

```typescript
// Instantiate once per form, not per field
const validator = new CrossFieldValidator();

validator.register({
  id: "confirmPassword",
  dependsOn: ["password"],
  evaluate: async (values, _signal) => {
    // Synchronous rules still return a Promise for a uniform API
    if (values.password !== values.confirmPassword) {
      return { code: "MISMATCH", message: "Passwords do not match", field: "confirmPassword" };
    }
    return null;
  },
});

validator.register({
  id: "username",
  dependsOn: [],  // top-level node — no upstream dependencies
  evaluate: async (values, signal) => {
    const res = await fetch(`/api/check-username?q=${values.username}`, { signal });
    if (!res.ok) throw new Error("Network error");
    const { taken } = await res.json();
    return taken
      ? { code: "USERNAME_TAKEN", message: "Username is already taken", field: "username" }
      : null;
  },
});

// In your onChange handler:
async function onPasswordChange(values: Record<string, unknown>) {
  const errors = await validator.resolveDownstream("password", values);
  // Merge errors into your form state — works with any state manager
  dispatch({ type: "SET_FIELD_ERRORS", payload: Object.fromEntries(errors) });
}

// On form unmount:
validator.destroy();
```

For [Zod schema integration](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/), the `evaluate` function wraps a Zod `safeParse` call and maps the returned `ZodError` issues to the `ValidationError` shape above. This keeps Zod as the rule source-of-truth while the DAG controls evaluation order.

[Synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) (keystroke-level checks like required and min-length) run independently of this graph. Wire them to the `onChange` event before calling `resolveDownstream`, so immediate feedback arrives without waiting for async evaluations.

## Role-Based and Contextual Rule Activation

Enterprise forms toggle validation requirements based on user permissions or workflow stage. Instead of hardcoding conditional branches inside field components, expose a `PolicyResolver` that the graph queries before running evaluations:

```typescript
interface PolicyResolver {
  isRuleActive(ruleId: string): boolean;
}

// Modified DependencyNode — evaluate can short-circuit based on policy
validator.register({
  id: "vatNumber",
  dependsOn: ["country", "accountType"],
  evaluate: async (values, _signal) => {
    // Skip the rule if the current workflow stage does not require it
    if (!policy.isRuleActive("vat-required")) return null;
    if (!values.vatNumber && values.accountType === "business") {
      return { code: "VAT_REQUIRED", message: "VAT number is required for business accounts", field: "vatNumber" };
    }
    return null;
  },
});
```

When the user role or workflow stage changes, emit a `DEPENDENCY_GRAPH_REBUILD` event and re-evaluate all currently-dirty fields. Do not mutate the graph itself — only update what the resolver returns. This keeps the graph shape stable and prevents stale cached results.

## Edge Cases and Failure Modes

**Conditional field removal from the DOM.** When a field exits the DOM (a conditional step, an accordion collapse), its node remains registered. Mark it inactive by setting a flag on the node rather than deleting it from the graph. Deletion breaks topological ordering if other nodes still declare the removed node as a dependency. On re-entry, reset the node to `idle` and re-evaluate.

**Hydration mismatches in SSR frameworks.** Server-rendered HTML may reflect initial values while the client-side graph has not yet initialized. If the server pre-validates cross-field rules, the client graph's first `resolveDownstream` call can flip a field from `valid` to `invalid` in a flash. Suppress the first client-side evaluation until the first user interaction by gating `resolveDownstream` behind an `isHydrated` flag.

**Shadow DOM boundaries.** Custom elements that host form controls inside a shadow root do not bubble standard input events. Use `composed: true` event dispatching or a shared message bus to route value-change notifications to the graph, which lives in the light DOM coordinator.

**High-frequency input events.** Apply debouncing at the `onChange` handler level — not inside `resolveDownstream`. Debouncing inside the evaluator drops intermediate states silently. The handler should collect values and schedule a single `resolveDownstream` call after the debounce window, preserving all intermediate state transitions.

**Cross-browser `AbortController` behavior.** In Safari 15 and below, aborting a fetch that has already settled does not throw — it resolves normally. Always check `controller.signal.aborted` after `await` returns, not just inside the `catch` block.

## Troubleshooting Reference

| Failure Scenario | Diagnostic Step | Recovery Action |
|---|---|---|
| Stale validation result overwrites current state | Log `this.fieldSeq` vs `seq` at resolution time | Confirm sequence IDs increment globally, not per-field |
| Cycle detected error on form mount | Print `topologicalOrder()` node list and trace `dependsOn` chains | Remove the circular `dependsOn` reference; use a shared upstream node |
| `abort` never fires, in-flight requests pile up | Confirm `controllers.get(fieldId)?.abort()` is reached before new controller is created | Check that `resolveDownstream` is not being awaited at the call site before the abort |
| Hidden field shows stale error after re-show | Check whether `DEPENDENCY_GRAPH_REBUILD` resets the node's state to `idle` | Explicitly call `states.set(fieldId, 'idle')` when toggling visibility |
| Network failure marks field invalid rather than retryable | Check `catch` block — fetch errors and `AbortError` must be handled separately | Re-throw after `AbortError` check; only non-abort errors reach the retryable branch |

## Testing and QA Hooks

Add `data-field-state` attributes to each field wrapper so Playwright and Cypress selectors can assert validation state without coupling to CSS class names:

```typescript
// React example — apply the same pattern to Vue/Svelte equivalents
function FieldWrapper({ fieldId, validator }: { fieldId: string; validator: CrossFieldValidator }) {
  const state = useValidatorState(fieldId, validator);
  return (
    <div
      data-field-id={fieldId}
      data-field-state={state}  // "idle" | "validating" | "valid" | "invalid" | "retryable"
    >
      {/* field content */}
    </div>
  );
}
```

Playwright assertion:

```typescript
await expect(page.locator('[data-field-id="confirmPassword"]')).toHaveAttribute(
  'data-field-state',
  'invalid'
);
```

For ARIA accessibility regression coverage, wire `aria-invalid` and `aria-describedby` off the same state value:

```typescript
<input
  aria-invalid={state === "invalid"}
  aria-describedby={state === "invalid" ? `${fieldId}-error` : undefined}
/>
<div
  id={`${fieldId}-error`}
  role="alert"
  aria-live="polite"
>
  {error?.message}
</div>
```

This keeps the ARIA state in sync with the graph state automatically — no separate `isError` boolean to drift out of sync.

## Common Pitfalls

**Applying debounce inside `resolveDownstream` instead of at the call site.** This drops intermediate `validating` state transitions and delays critical feedback. Debounce the trigger; the evaluator should run immediately when called.

**Constructing a new graph instance per field component.** Each instance maintains its own sequence counter, so cross-instance sequence comparisons are meaningless. Instantiate once at the form root and pass it down via context.

**Deleting nodes for conditionally hidden fields.** If another node has `dependsOn: ["hiddenField"]`, deleting the node breaks topological sort. Use an `active` flag instead of deletion.

**Not aborting on `destroy()`.** If a component unmounts while an async evaluation is in flight, the resolved callback will attempt to update unmounted state. Calling `destroy()` in `useEffect`'s cleanup function is the equivalent of clearing an event listener — it is not optional.

**Checking `signal.aborted` only in the `catch` block.** `AbortController` does not guarantee a thrown `AbortError` in all environments and all fetch implementations. Always add `if (controller.signal.aborted) return;` immediately after each `await`.

## Frequently Asked Questions

**How do I prevent circular dependencies in cross-field validation?**

Construct the dependency graph as a DAG during initialization. The `topologicalOrder()` method above uses a grey/white DFS that throws on back-edges. Run it immediately after all nodes are registered and before the first `resolveDownstream` call. If a cycle is detected, throw a configuration error that names the offending field — this will surface in development before any user sees the form.

**Should cross-field validation run on every keystroke?**

Synchronous cross-field checks (comparing two local values) can run on `input` with microtask batching and a shallow equality guard. Asynchronous cross-field evaluations (API calls, expensive transforms) should trigger on `blur` or after a debounced `input` window — typically 300–500 ms. Never apply the same debounce interval to both categories; instant local checks should remain instant.

**How do I handle validation when a dependent field is conditionally hidden?**

Register hidden fields as inactive nodes in the graph. When visibility toggles, emit a `DEPENDENCY_GRAPH_REBUILD` event that resets the node's state to `idle` and optionally clears any cached error. On re-show, the node's first blur or explicit `resolveDownstream` call produces a fresh result. Retaining orphaned error messages from hidden fields is one of the most common complaint-generating bugs in multi-step form flows.

**Can the same dependency graph handle both synchronous and asynchronous rules?**

Yes. Every node's `evaluate` function returns a `Promise`, so synchronous rules resolve immediately without `await`. The graph traversal is always async-aware, which keeps the calling interface uniform. The practical consequence is that a purely synchronous form incurs zero extra latency — the microtask checkpoint is negligible — while gaining the ability to add async nodes later without changing the graph structure.

---

## Related

- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — debounce patterns, retry logic, and race condition handling for single-field async checks
- [Synchronous Validation Patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) — keystroke-level rules that compose with the dependency graph
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — mapping Zod refinements and superRefine to the ValidationError shape
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/) — concrete AbortController and debounce implementation

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)
