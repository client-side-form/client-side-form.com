---
layout: page.njk
title: "Syncing Angular FormControl with a State Machine"
description: "Bridge Angular valueChanges and statusChanges into an explicit state machine with no feedback loops, using emitEvent:false, distinctUntilChanged, and teardown."
slug: syncing-angular-formcontrol-with-a-state-machine
type: howto
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

This page is the mechanical detail behind the [Angular Reactive Forms adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) pattern — read that first for the full snapshot contract and the status-to-state mapping. The goal here is narrower: fold `valueChanges` and `statusChanges` into one reducer that drives an explicit machine, and reconcile the machine's output back into the control without the write re-triggering the read.

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

5. **Complete on destroy.** `takeUntilDestroyed(destroyRef)` completes the merged subscription when the component is torn down, releasing the reducer closure. No `destroy$` Subject, no `ngOnDestroy` — the same teardown discipline the parent adapter uses. This machine-driven bridge is the low-level counterpart to the schema-driven validation in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), where `switchMap` plays the cancellation role `emitEvent:false` plays for loop-breaking.

The loop this pattern exists to break is short enough to draw, and seeing it drawn makes the guard obvious:

<svg viewBox="0 8 660 208" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A four-node cycle between the machine and the control: the machine sends its context to the control, the control emits on valueChanges, the adapter dispatches an event to the machine, and the machine assigns context and sends again. Two places can cut the cycle: emitEvent false on the write, and an equality guard before the dispatch." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The echo cycle, and the two places to cut it</title>
  <desc>Four nodes in a cycle. The machine's context is written into the control. The control emits the new value on valueChanges. The adapter turns that emission into a machine event. The machine assigns new context and writes it into the control again, closing the cycle. Cut one, on the write: pass emitEvent false so the control does not emit for writes that came from the machine. Cut two, before the dispatch: compare the incoming value with the machine's current context and drop the event if they are equal. Either cut alone stops the loop; using both makes the adapter robust to a template that also writes the control.</desc>
  <rect x="0" y="8" width="660" height="208" fill="#f9f5fb"/>
  <rect x="140" y="26" width="170" height="54" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="225" y="48" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">machine context</text>
  <text x="225" y="65" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">the source of truth</text>
  <path d="M310,53 H392" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="351" y="45" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">setValue</text>
  <rect x="392" y="26" width="170" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="477" y="48" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">FormControl</text>
  <text x="477" y="65" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">holds the value</text>
  <path d="M477,80 V116" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="487" y="102" font-size="9.5" fill="#6b5f75" font-family="inherit">valueChanges</text>
  <rect x="392" y="116" width="170" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="477" y="138" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">adapter subscription</text>
  <text x="477" y="155" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">turns it into an event</text>
  <path d="M392,143 H310" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="351" y="135" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">send</text>
  <path d="M225,116 V80" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="150" y="102" font-size="9.5" fill="#6b5f75" font-family="inherit">assign</text>
  <rect x="140" y="116" width="170" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="225" y="138" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">transition</text>
  <text x="225" y="155" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">context is replaced</text>
  <rect x="580" y="26" width="70" height="54" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="615" y="48" text-anchor="middle" font-size="9.5" fill="#2d6342" font-family="inherit">cut 1</text>
  <text x="615" y="64" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">emitEvent</text>
  <rect x="580" y="116" width="70" height="54" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="615" y="138" text-anchor="middle" font-size="9.5" fill="#2d6342" font-family="inherit">cut 2</text>
  <text x="615" y="154" text-anchor="middle" font-size="9" fill="#6b5f75" font-family="inherit">equality</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Cut 1 stops writes the machine caused from echoing back. Cut 2 stops any echo, including one from a binding you do not own.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Keeping both is cheap: the second is one comparison, and it turns a hang into a no-op if the first is ever missed.</text>
</svg>

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

Teardown is the other half. An Angular adapter holds three subscriptions and an actor, and every one of them outlives the component unless it is explicitly ended:

<svg viewBox="0 8 664 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four things an Angular form adapter must release on destroy: the valueChanges subscription, the statusChanges subscription, the machine actor, and any pending async validator request. Each row names what leaks if it is missed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Four things to release in ngOnDestroy</title>
  <desc>The valueChanges subscription: if it is not unsubscribed, the closure keeps the component and its machine alive and continues dispatching events after the view is gone. The statusChanges subscription: the same leak, plus validation state written into a destroyed machine. The machine actor: an XState actor keeps its own timers and invoked services running until it is stopped. Pending async validator requests: an in-flight HTTP call resolves into a destroyed context unless its AbortController is aborted or its takeUntil fires.</desc>
  <rect x="0" y="8" width="664" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="644" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="644" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="644" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Release this</text>
  <text x="234" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">How</text>
  <text x="408" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">If you forget</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">valueChanges subscription</text>
  <text x="234" y="66" font-size="10" fill="#6b5f75" font-family="inherit">takeUntilDestroyed()</text>
  <text x="408" y="66" font-size="10" fill="#a63d6f" font-family="inherit">events after the view is gone</text>
  <line x1="10" y1="80" x2="654" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">statusChanges subscription</text>
  <text x="234" y="100" font-size="10" fill="#6b5f75" font-family="inherit">takeUntilDestroyed()</text>
  <text x="408" y="100" font-size="10" fill="#a63d6f" font-family="inherit">writes into a dead machine</text>
  <line x1="10" y1="114" x2="654" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">the machine actor</text>
  <text x="234" y="134" font-size="10" fill="#6b5f75" font-family="inherit">actor.stop()</text>
  <text x="408" y="134" font-size="10" fill="#a63d6f" font-family="inherit">timers and services keep running</text>
  <line x1="10" y1="148" x2="654" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">pending async validation</text>
  <text x="234" y="168" font-size="10" fill="#6b5f75" font-family="inherit">abort the controller</text>
  <text x="408" y="168" font-size="10" fill="#a63d6f" font-family="inherit">a response with nowhere to go</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Test it: destroy the host component mid-request and assert no error is logged and no dispatch reaches the machine afterwards.</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Route changes, not unit tests, are where these leaks show up — a form the reader visits ten times leaves ten actors running.</text>
</svg>

## Verification Checklist

- [ ] A programmatic setValue in the reducer does not re-enter the subscription (no loop)
- [ ] Every write path (setValue, patchValue, reset) passes { emitEvent: false }
- [ ] Duplicate VALID status emissions do not dispatch redundant transitions
- [ ] Object-valued controls use a structural distinctUntilChanged comparator
- [ ] updateValueAndValidity runs after a silent write when normalization affects validity
- [ ] The subscription completes on component destroy (verify no leak across route changes)
- [ ] The rendered machine state drives aria-invalid and error text only when state === 'INVALID'

## When the machine and the control disagree

Two owners of one value will eventually disagree, usually after a reset or an external patch. The rule that keeps recovery predictable is that the machine wins and the control is re-synchronised from it — never the other way round.

<svg viewBox="0 8 662 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Recovery when the control's value and the machine's context diverge. Detect the divergence on a status emission, then re-write the control from the machine context with events suppressed, then re-run validation once, then announce nothing because the reader caused no change." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Resynchronising after a divergence</title>
  <desc>Step one: divergence is detected when a status emission arrives whose value does not match the machine's context — usually after an external patchValue or a reset called from outside the adapter. Step two: the control is re-written from the machine's context with emitEvent false, so the correction itself does not enter the cycle. Step three: validation is re-run once against the corrected value, because the previous run judged a value that is no longer present. Step four: nothing is announced, because from the reader's point of view nothing changed — announcing here would report a change they did not make.</desc>
  <rect x="0" y="8" width="662" height="200" fill="#f9f5fb"/>
  <rect x="14" y="30" width="150" height="72" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="89" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">1 · detect</text>
  <text x="89" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">control value ≠</text>
  <text x="89" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">machine context</text>
  <path d="M164,66 H186" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="186" y="30" width="150" height="72" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="261" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · re-write</text>
  <text x="261" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from context, with</text>
  <text x="261" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">emitEvent: false</text>
  <path d="M336,66 H358" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="358" y="30" width="150" height="72" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="433" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · re-validate</text>
  <text x="433" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">once, against the</text>
  <text x="433" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">corrected value</text>
  <path d="M508,66 H530" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="530" y="30" width="118" height="72" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="589" y="52" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">4 · stay quiet</text>
  <text x="589" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">no announcement</text>
  <text x="589" y="84" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">— nobody changed</text>
  <text x="14" y="136" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Why the machine wins rather than the control</text>
  <text x="14" y="154" font-size="10" fill="#6b5f75" font-family="inherit">The control holds a value; the machine holds the value plus why it is in that state. Taking the control's value discards</text>
  <text x="14" y="170" font-size="10" fill="#6b5f75" font-family="inherit">the reason, so the next transition is computed from a context that no longer matches what produced it.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Log every divergence in development: a form that resynchronises regularly has a second writer nobody documented.</text>
</svg>

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

- [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) — the full adapter and status-to-state mapping this bridge plugs into
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/) — the switchMap cancellation model that complements loop-breaking
- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) — the same explicit-machine discipline in a reducer-driven React hook

← [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
