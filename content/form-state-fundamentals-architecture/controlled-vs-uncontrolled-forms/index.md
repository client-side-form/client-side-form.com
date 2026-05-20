---
layout: page.njk
title: "Controlled vs Uncontrolled Forms"
description: "Architecture and validation strategies for controlled and uncontrolled form patterns — state ownership, memory allocation, and hybrid adapters."
eleventyNavigation:
  key: "Controlled vs Uncontrolled Forms"
  parent: "Form State Fundamentals"
  order: 1
---
# Controlled vs Uncontrolled Forms: Architecture & Validation Strategies

Modern UI frameworks require explicit decisions regarding DOM ownership and state propagation. The architectural divide between [Form State Fundamentals & Architecture](/form-state-fundamentals-architecture/) paradigms dictates how input events, validation pipelines, and submission handlers interact. This guide examines the transition triggers, memory implications, and validation routing strategies required to implement robust form systems at scale.

## State Ownership & Memory Allocation

Controlled components route every keystroke through framework state, enabling deterministic rendering but introducing render-cycle overhead. Uncontrolled components delegate value storage to the DOM, reducing framework reconciliation costs but complicating cross-field dependency resolution. Tracking mutation boundaries requires explicit [Dirty and Pristine State Tracking](/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) logic to prevent unnecessary re-renders while preserving submission integrity. The transition from pristine to dirty state acts as the primary trigger for validation initialization and UI feedback loops.

### Event Delegation & Render Batching

Framework event pooling and synthetic event normalization impact how quickly state updates propagate. Uncontrolled inputs bypass render queues entirely, requiring imperative DOM reads via `useRef` or query selectors. Controlled inputs trigger synchronous state updates, which can be batched using concurrent rendering features. Selecting the appropriate architecture depends on form complexity, field count, and required interactivity levels.

## Validation Pipeline Integration

Validation execution must align with the chosen state model to prevent race conditions and stale error states. The [Form Validation Lifecycle](/form-state-fundamentals-architecture/form-validation-lifecycle/) dictates whether validation runs synchronously on input, asynchronously on blur, or deferred until submission. Controlled forms enable real-time schema evaluation and inline error injection, while uncontrolled forms require manual constraint validation API calls or custom event listeners to surface feedback. Architectural consistency ensures validation rules remain decoupled from UI rendering logic.

## Adapter Pattern for Hybrid Implementations

Large-scale applications frequently require mixed-mode forms that combine controlled validation with uncontrolled performance. An adapter layer standardizes value extraction, error mapping, and submission routing across disparate input types. Following [Best Practices for Uncontrolled Form State](/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/) ensures that imperative reads do not bypass validation contracts. When integrating live data streams, Implementing Real-Time Collaborative Form State requires strict event ordering and optimistic updates to maintain UI responsiveness. Network latency introduces synchronization risks that must be mitigated through Preventing State Desync in WebSocket Forms patterns, ensuring local DOM state reconciles correctly with remote payloads.

## TypeScript Validation Adapter for Mixed-Mode Forms

The following implementation bridges controlled and uncontrolled fields, enforcing a unified validation pipeline while maintaining strict type safety, async lock handling, and error state isolation.

```typescript
type ValidationRule<T> = (value: T, context: Record<string, unknown>) => Promise<string | null> | string | null;

interface FormAdapterConfig<T extends Record<string, unknown>> {
  controlledFields: (keyof T)[];
  uncontrolledFields: (keyof T)[];
  schema: Partial<Record<keyof T, ValidationRule<T[keyof T]>>>;
}

export class FormValidationAdapter<T extends Record<string, unknown>> {
  private config: FormAdapterConfig<T>;
  private errors: Partial<Record<keyof T, string>> = {};
  private validationLocks: Map<keyof T, Promise<void>> = new Map();

  constructor(config: FormAdapterConfig<T>) {
    this.config = config;
  }

  async validateField(field: keyof T, value: T[keyof T], context: T): Promise<string | null> {
    const rule = this.config.schema[field];
    if (!rule) return null;

    // Prevent concurrent validation race conditions for the same field
    const existingLock = this.validationLocks.get(field);
    if (existingLock) await existingLock;

    const validationPromise = (async () => {
      try {
        const error = await rule(value, context);
        if (error) {
          this.errors[field] = error;
        } else {
          delete this.errors[field];
        }
        return error;
      } catch (err) {
        console.error(`Validation failed for field ${String(field)}:`, err);
        this.errors[field] = 'Validation error occurred';
        return 'Validation error occurred';
      } finally {
        this.validationLocks.delete(field);
      }
    })();

    this.validationLocks.set(field, validationPromise.then(() => {}));
    return await validationPromise;
  }

  extractUncontrolledValues(formRef: HTMLFormElement | null): Partial<T> {
    if (!formRef) return {};

    const formData = new FormData(formRef);
    const values: Partial<T> = {};

    for (const field of this.config.uncontrolledFields) {
      const rawValue = formData.get(field as string);
      if (rawValue !== null) {
        // Type assertion required for FormData extraction; validate schema downstream
        values[field] = rawValue as unknown as T[keyof T];
      }
    }
    return values;
  }

  getErrors(): Readonly<Partial<Record<keyof T, string>>> {
    return { ...this.errors };
  }

  resetState(): void {
    this.errors = {};
    this.validationLocks.clear();
  }
}
```

## Common Pitfalls

- **Hydration mismatches:** Mixing controlled and uncontrolled inputs without a reconciliation adapter causes stale DOM reads and hydration errors during SSR.
- **Main-thread blocking:** Triggering synchronous validation on every keystroke in large forms degrades input latency and blocks the event loop.
- **Residual error states:** Failing to reset validation state on form reset leaves stale errors attached to pristine fields.
- **State desynchronization:** Using imperative DOM queries for controlled fields bypasses framework state and creates infinite update loops.
- **Async race conditions:** Omitting debounce logic or validation locks on remote endpoints causes out-of-order error surfacing and flickering UI states.

## Frequently Asked Questions

**When should I choose uncontrolled over controlled forms?** 
Uncontrolled forms are optimal for high-field-count inputs, file uploads, or scenarios where DOM performance outweighs framework state synchronization. They reduce render cycles but require manual validation routing via refs or `FormData` extraction.

**How do I handle cross-field validation in uncontrolled components?** 
Implement a centralized validation coordinator that reads DOM values on blur or submit events. Use a shared validation schema and trigger cross-field checks imperatively, ensuring error states are mapped back to the UI without relying on framework re-renders.

**Can controlled and uncontrolled inputs coexist in the same form?** 
Yes, through an adapter pattern that normalizes value extraction, validation execution, and submission routing. The adapter must track field ownership, prevent state collisions, and ensure consistent error propagation across both paradigms.