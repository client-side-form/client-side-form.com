---
layout: page.njk
title: "Syncing Angular FormControl with a State Machine"
description: "Bridge Angular valueChanges and statusChanges into an explicit state machine with no feedback loops, using emitEvent:false, distinctUntilChanged, and teardown."
slug: syncing-angular-formcontrol-with-a-state-machine
type: long_tail
breadcrumb: "Syncing FormControl with a State Machine"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Syncing Angular FormControl with a State Machine"
  parent: "Angular Reactive Forms Adapters"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Syncing Angular FormControl with a State Machine",
      "description": "Bridge Angular valueChanges and statusChanges into an explicit state machine with no feedback loops, using emitEvent:false, distinctUntilChanged, and teardown.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Angular Reactive Forms Adapters", "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/" },
        { "@type": "ListItem", "position": 4, "name": "Syncing Angular FormControl with a State Machine", "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/syncing-angular-formcontrol-with-a-state-machine/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Sync an Angular FormControl with an explicit state machine",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Merge valueChanges and statusChanges into one event stream" },
        { "@type": "HowToStep", "position": 2, "name": "Reduce each event into an explicit machine state" },
        { "@type": "HowToStep", "position": 3, "name": "Write machine-driven values back with emitEvent false to break the loop" },
        { "@type": "HowToStep", "position": 4, "name": "Deduplicate echoes with distinctUntilChanged" },
        { "@type": "HowToStep", "position": 5, "name": "Complete the stream with takeUntilDestroyed" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does writing back to the FormControl cause an infinite loop?",
          "acceptedAnswer": { "@type": "Answer", "text": "setValue and patchValue emit a valueChanges event by default. If your state machine subscribes to valueChanges and also writes to the control in response, the write re-triggers the subscription, which writes again. Pass { emitEvent: false } to any machine-driven write so the reconciliation does not re-enter the stream." }
        },
        {
          "@type": "Question",
          "name": "Do I need distinctUntilChanged if I already use emitEvent false?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, they solve different problems. emitEvent:false stops your own writes from re-entering the stream; distinctUntilChanged stops Angular's own duplicate status emissions — it re-emits VALID on unrelated recalculations — from dispatching redundant machine transitions and waking OnPush change detection." }
        },
        {
          "@type": "Question",
          "name": "Where should I complete the subscription in a standalone component?",
          "acceptedAnswer": { "@type": "Answer", "text": "Inject DestroyRef and pipe the merged stream through takeUntilDestroyed(destroyRef). It completes the subscription when the component is destroyed without a manual destroy$ Subject and without an ngOnDestroy method, which keeps the reducer's captured closure from leaking across route changes." }
        }
      ]
    }
  ]
}
</script>

# Syncing Angular FormControl with a State Machine

The exact problem: a state machine that both reads `FormControl.valueChanges` and writes back to the control creates a feedback loop, because every programmatic write re-emits `valueChanges` and re-enters the reducer.

## Context and Prerequisites

This page is the mechanical detail behind the [Angular Reactive Forms adapters](/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) pattern — read that first for the full snapshot contract and the status-to-state mapping. The goal here is narrower: fold `valueChanges` and `statusChanges` into one reducer that drives an explicit machine, and reconcile the machine's output back into the control without the write re-triggering the read.

## The Feedback-Loop Problem

Angular's `FormControl` is both a value source and a value sink. `valueChanges` emits when the value changes; `setValue`/`patchValue` change the value. A machine that listens to the first and calls the second is a closed loop unless you cut one edge. The default behaviour of `setValue` is to emit `valueChanges`, so the naive wiring below never settles:

```typescript
// BROKEN: this loops. setValue emits valueChanges, which re-enters the handler.
control.valueChanges.subscribe(value => {
  const next = reduce(machine, { type: 'INPUT', value });
  control.setValue(next.value); // <-- re-fires valueChanges -> handler -> setValue ...
});
```

The fix is a single flag on the write: `{ emitEvent: false }` tells Angular to update the model without emitting on the observable streams. That breaks the read-write cycle at exactly one point while leaving genuine user input flowing.

## Core Implementation

The reducer consumes a merged stream of value and status events, produces an explicit state, and reconciles the value back into the control with emission suppressed.

```typescript
import { FormControl } from '@angular/forms';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { map, startWith, distinctUntilChanged, scan } from 'rxjs/operators';

type ControlEvent<T> =
  | { kind: 'value'; value: T }
  | { kind: 'status'; status: string };

type MachineState =
  | 'PRISTINE' | 'EDITING' | 'VALIDATING' | 'VALID' | 'INVALID';

interface Machine<T> {
  state: MachineState;
  value: T;
}

/**
 * Binds a FormControl to an explicit state machine with no feedback loop.
 * Returns the reduced machine as a stream the view can render via async pipe.
 */
export function bindControlToMachine<T>(
  control: FormControl<T>,
  destroyRef: DestroyRef,
) {
  // Merge both Angular streams into one typed event source. startWith seeds
  // the current value/status so the machine has an initial state before the
  // user interacts — the streams themselves only fire on subsequent changes.
  const value$ = control.valueChanges.pipe(
    startWith(control.value),
    map((value): ControlEvent<T> => ({ kind: 'value', value })),
  );
  const status$ = control.statusChanges.pipe(
    startWith(control.status),
    // distinctUntilChanged drops Angular's duplicate status echoes: it re-emits
    // VALID on recalculations that did not actually change the status, and each
    // echo would otherwise dispatch a redundant transition.
    distinctUntilChanged(),
    map((status): ControlEvent<T> => ({ kind: 'status', status })),
  );

  return merge(value$, status$).pipe(
    scan<ControlEvent<T>, Machine<T>>(
      (m, event) => reduce(m, event, control),
      { state: 'PRISTINE', value: control.value },
    ),
    // Collapse identical machine snapshots so OnPush is not woken for no-ops.
    distinctUntilChanged((a, b) => a.state === b.state && a.value === b.value),
    // Completes the subscription on component destroy — no destroy$ Subject,
    // no ngOnDestroy. The captured reducer closure is released cleanly.
    takeUntilDestroyed(destroyRef),
  );
}

function reduce<T>(
  m: Machine<T>,
  event: ControlEvent<T>,
  control: FormControl<T>,
): Machine<T> {
  if (event.kind === 'status') {
    const state: MachineState =
      event.status === 'PENDING' ? 'VALIDATING' :
      event.status === 'INVALID' ? 'INVALID' :
      m.state === 'PRISTINE' ? 'PRISTINE' : 'VALID';
    return { ...m, state };
  }

  // event.kind === 'value': normalise the raw input, then reconcile it back
  // into the control WITHOUT emitting, so this write does not re-enter the
  // merged stream and loop. This is the single cut edge of the cycle.
  const normalized = normalize(event.value);
  if (normalized !== control.value) {
    control.setValue(normalized, { emitEvent: false });
  }
  return { state: 'EDITING', value: normalized };
}

function normalize<T>(value: T): T {
  // Example: trim strings so "ab " and "ab" don't read as distinct values.
  return (typeof value === 'string' ? (value.trim() as unknown as T) : value);
}
```

## Step-by-Step Walkthrough

1. **Merge the two streams.** `valueChanges` and `statusChanges` are separate observables. `merge` combines them into one event source, and tagging each event with a `kind` discriminator lets a single reducer handle both. `startWith` seeds the current value and status so the machine is populated before the first user keystroke.

2. **Deduplicate status echoes.** Angular re-emits the same status on recalculations that did not change it. `distinctUntilChanged()` on `status$` drops those echoes before they reach the reducer, so `VALID → VALID` never dispatches a redundant transition.

3. **Reduce into an explicit state.** The `scan` operator is the reducer: it folds each event into a `Machine` snapshot. Status events map onto `VALIDATING`/`INVALID`/`VALID`; value events set `EDITING` and normalize.

4. **Reconcile without emitting.** When the reducer normalizes a value and writes it back with `setValue(normalized, { emitEvent: false })`, the write updates the control model but does not fire `valueChanges`. This is the one cut edge that prevents the loop. The guard `normalized !== control.value` avoids an unnecessary write when nothing changed.

5. **Complete on destroy.** `takeUntilDestroyed(destroyRef)` completes the merged subscription when the component is torn down, releasing the reducer closure. No `destroy$` Subject, no `ngOnDestroy` — the same teardown discipline the parent adapter uses. This machine-driven bridge is the low-level counterpart to the schema-driven validation in [asynchronous validation strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/), where `switchMap` plays the cancellation role `emitEvent:false` plays for loop-breaking.

## Failure Modes and Edge Cases

### 1. Forgetting emitEvent:false on one write path

If any write path omits the flag — a `patchValue` in an error handler, a `reset()` — that path re-enters the stream and loops. Audit every mutation.

```typescript
// Every machine-driven write must suppress emission.
control.reset(baseline, { emitEvent: false });
control.patchValue(next, { emitEvent: false });
```

### 2. distinctUntilChanged on objects compares by reference

If the control value is an object, the default `distinctUntilChanged` uses `===` and treats every new object literal as distinct, letting duplicates through.

```typescript
// Supply a structural comparator for object-valued controls.
distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
```

### 3. Suppressing validation along with the loop

`{ emitEvent: false }` also suppresses `statusChanges`, so a reconciling write does not re-run validators. If normalization can change validity, run validation explicitly after the write.

```typescript
control.setValue(normalized, { emitEvent: false });
control.updateValueAndValidity({ emitEvent: false }); // recompute status silently
```

### 4. Machine falls behind on synchronous burst updates

Rapid programmatic updates in the same tick can coalesce, and `scan` sees only the final value. If you need every intermediate state, debounce upstream rather than relying on per-tick delivery.

## Verification Checklist

- [ ] A programmatic setValue in the reducer does not re-enter the subscription (no loop)
- [ ] Every write path (setValue, patchValue, reset) passes { emitEvent: false }
- [ ] Duplicate VALID status emissions do not dispatch redundant transitions
- [ ] Object-valued controls use a structural distinctUntilChanged comparator
- [ ] updateValueAndValidity runs after a silent write when normalization affects validity
- [ ] The subscription completes on component destroy (verify no leak across route changes)
- [ ] The rendered machine state drives aria-invalid and error text only when state === 'INVALID'

## FAQ

<details>
<summary><strong>Why does writing back to the FormControl cause an infinite loop?</strong></summary>

`setValue` and `patchValue` emit a `valueChanges` event by default. If your state machine subscribes to `valueChanges` and also writes to the control in response, the write re-triggers the subscription, which writes again — an unbounded loop. Pass `{ emitEvent: false }` to any machine-driven write so the reconciliation updates the model without re-entering the stream. That single flag cuts exactly one edge of the read-write cycle while leaving genuine user input flowing normally.

</details>

<details>
<summary><strong>Do I need distinctUntilChanged if I already use emitEvent:false?</strong></summary>

Yes — they solve different problems. `emitEvent:false` stops *your own* writes from re-entering the stream. `distinctUntilChanged` stops *Angular's own* duplicate status emissions: the framework re-emits `VALID` on recalculations that did not change the status, and each echo would otherwise dispatch a redundant machine transition and wake `OnPush` change detection. You need both: one guards the write side, the other guards the read side.

</details>

<details>
<summary><strong>Where should I complete the subscription in a standalone component?</strong></summary>

Inject `DestroyRef` and pipe the merged stream through `takeUntilDestroyed(destroyRef)`. It completes the subscription when the component is destroyed without a manual `destroy$` Subject and without an `ngOnDestroy` method, which keeps the reducer's captured closure from leaking across route changes. In a service that outlives components, prefer an explicit `takeUntil(this.destroy$)` tied to the service's own lifecycle instead.

</details>

---

**Related**

- [Angular Reactive Forms Adapters](/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) — the full adapter and status-to-state mapping this bridge plugs into
- [Asynchronous Validation Strategies](/validation-logic-schema-integration/asynchronous-validation-strategies/) — the switchMap cancellation model that complements loop-breaking
- [React Form Hook Architecture](/framework-adapters-custom-hooks/react-form-hook-architecture/) — the same explicit-machine discipline in a reducer-driven React hook

← [Angular Reactive Forms Adapters](/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
