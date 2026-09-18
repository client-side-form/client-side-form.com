---
layout: page.njk
title: "Bridging Angular Signals and Reactive Forms"
description: "Expose reactive form values, status and errors as signals with toSignal, derive computed form state without subscriptions, drive controls from signals with effect safely, and avoid the feedback loops and initial-value gaps that trip up the bridge."
slug: bridging-angular-signals-and-reactive-forms
type: howto
breadcrumb: "Signals + Reactive Forms"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Bridging Angular Signals and Reactive Forms"
  parent: "Angular Reactive Forms Adapters"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Bridging Angular Signals and Reactive Forms",
      "description": "Expose reactive form values, status and errors as signals with toSignal, derive computed form state without subscriptions, drive controls from signals with effect safely, and avoid the feedback loops and initial-value gaps that trip up the bridge.",
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
          "name": "Framework Adapters & Custom Hooks for Form State",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Angular Reactive Forms Adapters",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Bridging Angular Signals and Reactive Forms",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/bridging-angular-signals-and-reactive-forms/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Bridge Angular reactive forms and signals",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Convert the unified events stream"
        },
        {
          "@type": "HowToStep",
          "name": "Seed with the current snapshot"
        },
        {
          "@type": "HowToStep",
          "name": "Snapshot, do not stream deltas"
        },
        {
          "@type": "HowToStep",
          "name": "Derive with computed"
        },
        {
          "@type": "HowToStep",
          "name": "Write from signals to the form inside untracked, with an equality guard"
        },
        {
          "@type": "HowToStep",
          "name": "Keep the form the source of truth for field values"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is toSignal subscription cleanup automatic?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, when created in an injection context: the subscription ends when the component or service is destroyed. Outside one, pass { injector } or { manualCleanup: true } and unsubscribe yourself."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use signals in the template instead of form.controls?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For display — totals, status badges, conditional sections — yes, and it simplifies change detection with zoneless setups. Keep formControlName or [formControl] bindings for the inputs themselves, since they carry the value accessor wiring."
          }
        },
        {
          "@type": "Question",
          "name": "Does the events stream exist in older Angular versions?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It arrived in Angular 18. On earlier versions, combine valueChanges and statusChanges with startWith for value and status, and track touched yourself on blur, since older versions do not emit touched changes."
          }
        }
      ]
    }
  ]
}
</script>

# Bridging Angular Signals and Reactive Forms

Angular components increasingly use signals for state, while forms still live in `FormGroup` with RxJS `valueChanges` — and the obvious bridge, `toSignal(form.valueChanges)`, returns `undefined` until the first change, misses status changes caused by async validators, and invites effects that write back into the form and loop.

This page builds a small, reusable bridge: signals for value, status, errors and dirty/touched state that are correct from the first render, computed values derived without subscriptions, and a controlled path for pushing signal state into the form. It extends the adapter architecture in [Angular reactive forms adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) and builds on [typed reactive forms in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/typed-reactive-forms-in-angular/).

---

## Context and prerequisites

The observables a control exposes:

- **`valueChanges`** — emits on value changes; does not emit the initial value.
- **`statusChanges`** — emits `VALID`, `INVALID`, `PENDING`, `DISABLED`; does not emit the initial status.
- **`events`** (Angular 18+) — a unified stream of `ValueChangeEvent`, `StatusChangeEvent`, `TouchedChangeEvent`, `PristineChangeEvent`, `FormSubmittedEvent` and `FormResetEvent`. This is the only stream that reports touched and pristine changes.

`toSignal(obs$, { initialValue })` converts an observable to a signal, subscribing for the lifetime of the injection context. The initial value matters: without it, the signal is `undefined` until the first emission — i.e. until the user types.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of the reactive form observables valueChanges, statusChanges and events, with whether each emits the initial value and which changes it covers." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each form stream reports</title>
  <desc>valueChanges does not emit its initial value and covers value changes only. statusChanges does not emit its initial status and covers validity including PENDING from async validators. The unified events stream, available from Angular 18, covers value, status, touched, pristine, submit and reset events, and is the only way to observe touched and pristine changes.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stream</text>
  <text x="190.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Emits initial?</text>
  <text x="342.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Covers</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">valueChanges</text>
  <text x="190.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="342.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">value</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">statusChanges</text>
  <text x="190.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="342.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">VALID / INVALID / PENDING / DISABLED</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">events (18+)</text>
  <text x="190.8" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="342.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">value, status, touched, pristine, submit, reset</text>
</svg>

---

## The core pattern: a form-state signal that starts correct

```typescript
import { computed, DestroyRef, effect, inject, Signal, signal, untracked } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl, FormGroup } from "@angular/forms";
import { map, startWith } from "rxjs/operators";

export interface ControlSnapshot<T> {
  value: T;
  status: AbstractControl["status"];
  errors: AbstractControl["errors"];
  touched: boolean;
  dirty: boolean;
}

// Snapshot the control on every event, starting with its current state.
export function controlState<T>(control: AbstractControl<T>): Signal<ControlSnapshot<T>> {
  const snap = (): ControlSnapshot<T> => ({
    value: control.value, status: control.status, errors: control.errors,
    touched: control.touched, dirty: control.dirty,
  });
  return toSignal(
    control.events.pipe(map(snap), startWith(snap())),
    { initialValue: snap() },     // correct on first render, before any event
  );
}

// Usage inside a component (an injection context):
export class CheckoutComponent {
  form = inject(CheckoutFormFactory).create();
  private state = controlState(this.form);

  // Derived UI state with no subscriptions to manage.
  readonly canSubmit = computed(() => this.state().status === "VALID");
  readonly checking = computed(() => this.state().status === "PENDING");
  readonly total = computed(() => {
    const v = this.state().value;
    return v.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  });

  // Signal → form: a discount code signal applied to the form, guarded against loops.
  readonly appliedCode = signal<string | null>(null);
  constructor() {
    effect(() => {
      const code = this.appliedCode();
      untracked(() => {
        const ctrl = this.form.controls.discountCode;
        if (ctrl.value !== code) ctrl.setValue(code ?? "", { emitEvent: true });
      });
    });
  }
}
declare class CheckoutFormFactory { create(): FormGroup<any>; }
```

---

## Step-by-step walkthrough

1. **Convert the unified `events` stream.** It covers status (including `PENDING` from async validators), touched and pristine, which `valueChanges` alone cannot.
2. **Seed with the current snapshot.** `startWith(snap())` plus `initialValue` makes the signal correct at first render, so templates never show `undefined`.
3. **Snapshot, do not stream deltas.** Mapping every event to a full snapshot keeps the signal's value self-consistent; `computed` readers get value and status from the same moment.
4. **Derive with `computed`.** Totals, "can submit", "is checking" — no subscriptions, no `takeUntilDestroyed`, recalculated only when the snapshot changes.
5. **Write from signals to the form inside `untracked`, with an equality guard.** The effect should depend only on the source signal; reading form state inside it (tracked) or writing unconditionally creates a loop.
6. **Keep the form the source of truth for field values.** Signals are views and occasional inputs; the `FormGroup` still owns values, validation and status, so `markAllAsTouched`, `reset` and validators keep working.

### Why not replace the form with signals entirely?

Moving every field's value into a `signal` and validating with `computed` is attractive, and signal-first form APIs are the direction Angular is heading. For existing reactive forms, though, the `FormGroup` provides behaviour that a set of signals does not: validator composition, async validator status, disabled-state participation, `markAllAsTouched`, the value accessors that connect custom controls, and a large ecosystem of controls built on `ControlValueAccessor`. A bridge lets components adopt signals for everything around the form — derived UI, cross-component state, template logic — without rewriting the form layer. When a signal-based form API is adopted, the same derived `computed` values can be kept and pointed at the new source.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two connected cards showing data flowing from the FormGroup to signals through the events stream and toSignal, and a guarded effect writing from a signal back into one control." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Direction of data across the bridge</title>
  <desc>From form to signals, the FormGroup&#x27;s events stream is mapped to snapshots and converted with toSignal, seeded with the current state; computed signals derive totals, submit readiness and pending state from it. From signals to the form, an effect reads one source signal and, inside untracked with an equality guard, sets the value of one control, which then flows back through the events stream.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="312.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">FormGroup → signals</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">events → snapshot → toSignal.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Seeded with current state.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">computed: total, canSubmit, checking.</text>
  <path d="M326.0,54.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,50.5 353.0,54.5 346.0,58.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="312.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Signal → one control</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">effect reads the source signal.</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">untracked + equality guard.</text>
  <text x="366.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">setValue flows back via events.</text>
</svg>

### Zoneless change detection and the bridge

Applications moving to zoneless change detection rely on signals to tell Angular what changed. Reactive forms update their own state synchronously, but without Zone.js nothing schedules a render when an async validator resolves or a control's status flips outside an event handler. A signal bridge closes that gap: because the snapshot signal changes on every form event, templates that read it are marked for update exactly when the form changes, including after asynchronous validation. In zoneless applications, reading form state in templates through the bridge rather than through `form.controls.x.status` directly is what keeps "Checking…" indicators and submit readiness from going stale.

---

## Failure modes and edge cases

### 1. `undefined` on first render

`toSignal(form.valueChanges)` without `initialValue` is `undefined` until the first change, so a computed total renders `NaN` or throws. Always seed.

### 2. Effects that loop

An effect that reads `this.state()` and calls `setValue` re-triggers itself through the events stream. Read only the source signal in the effect body, perform form writes inside `untracked`, and skip writes that would not change the value.

### 3. Missing `PENDING`

A signal built from `valueChanges` shows `VALID` while an async validator is still running, enabling submit too early. Use `events` or `statusChanges`; the async side is covered in [cancelling Angular async validators with switchMap](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/cancelling-angular-async-validators-with-switchmap/).

### 4. Calling `toSignal` outside an injection context

`toSignal` needs an injection context (constructor, field initialiser, or `runInInjectionContext`) to clean up on destroy. Creating bridges in `ngOnInit` throws unless you pass an explicit `injector`.

### 5. Performance with large forms

Snapshotting the whole form on every event is fine for typical forms. For forms with hundreds of controls, bridge individual controls (`controlState(form.controls.email)`) where signals are needed, instead of the whole group, following the isolation idea in [memoization boundaries for form fields](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/memoization-boundaries-for-form-fields/).

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for choosing how to bridge reactive forms and signals — whether you need touched or pristine, whether you need async pending status, or just values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which bridge for which need</title>
  <desc>If you need touched or pristine state, use the unified events stream. If you need async validation pending status, use events or statusChanges with a seeded initial value. If you only need the current value for derived display, toSignal of valueChanges with startWith and an initial value is enough.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Need touched or pristine?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">control.events</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Need PENDING from async validators?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">events or statusChanges</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">valueChanges + startWith</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Value-only derived display.</text>
</svg>

---

## Verification checklist

- [ ] Every bridged signal has a correct value on first render.
- [ ] Derived signals update when async validators move the form in and out of `PENDING`.
- [ ] Touched and pristine signals change on blur and edit.
- [ ] No effect writes to the form in a way that re-triggers itself.
- [ ] Bridges are created in an injection context and clean up on destroy.
- [ ] Large forms bridge only the controls that need signals.

---

## Frequently Asked Questions

<details>
<summary><strong>Is toSignal subscription cleanup automatic?</strong></summary>

Yes, when created in an injection context: the subscription ends when the component or service is destroyed. Outside one, pass `{ injector }` or `{ manualCleanup: true }` and unsubscribe yourself.

</details>

<details>
<summary><strong>Can I use signals in the template instead of form.controls?</strong></summary>

For display — totals, status badges, conditional sections — yes, and it simplifies change detection with zoneless setups. Keep `formControlName` or `[formControl]` bindings for the inputs themselves, since they carry the value accessor wiring.

</details>

<details>
<summary><strong>Does the events stream exist in older Angular versions?</strong></summary>

It arrived in Angular 18. On earlier versions, combine `valueChanges` and `statusChanges` with `startWith` for value and status, and track touched yourself on blur, since older versions do not emit touched changes.

</details>

---

## Related

- [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
- [Syncing Angular FormControl With a State Machine](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/syncing-angular-formcontrol-with-a-state-machine/)
- [Svelte 5 Runes Migration for Form Stores](https://www.client-side-form.com/framework-adapters-custom-hooks/svelte-store-integration-for-forms/svelte-5-runes-migration-for-form-stores/)

← [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
