---
layout: page.njk
title: "Angular Reactive Forms Adapters"
description: "Adapt Angular Reactive Forms FormControl and FormGroup streams onto a framework-agnostic state machine with Zod validation and cancellable async validators."
slug: angular-reactive-forms-adapters
type: topic
breadcrumb: "Angular Reactive Forms"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Angular Reactive Forms Adapters"
  parent: "Framework Adapters"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Angular Reactive Forms Adapters",
      "description": "Adapt Angular Reactive Forms FormControl and FormGroup streams onto a framework-agnostic state machine with Zod validation and cancellable async validators.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "Angular Reactive Forms Adapters", "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Adapt Angular Reactive Forms onto a framework-agnostic state machine",
      "step": [
        { "@type": "HowToStep", "name": "Subscribe to valueChanges and statusChanges to project the control tree into a typed snapshot" },
        { "@type": "HowToStep", "name": "Map Angular's VALID / INVALID / PENDING / DISABLED status onto explicit machine states" },
        { "@type": "HowToStep", "name": "Wire a shared Zod schema into a synchronous ValidatorFn that returns ValidationErrors" },
        { "@type": "HowToStep", "name": "Implement a cancellable AsyncValidatorFn using switchMap so stale requests never resolve" },
        { "@type": "HowToStep", "name": "Expose custom inputs through ControlValueAccessor and render with OnPush plus the async pipe" },
        { "@type": "HowToStep", "name": "Tear down every subscription with takeUntilDestroyed to prevent memory leaks" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does my Angular form flip to INVALID before the async validator finishes?",
          "acceptedAnswer": { "@type": "Answer", "text": "It does not — while an AsyncValidatorFn is running the control's status is PENDING, not INVALID. If your UI shows an error during that window you are reading a stale errors object or rendering on VALID/INVALID only and treating the absence of VALID as invalid. Gate error display on status === 'INVALID' explicitly and show a spinner while status === 'PENDING'." }
        },
        {
          "@type": "Question",
          "name": "How do I cancel an in-flight async validator when the user keeps typing?",
          "acceptedAnswer": { "@type": "Answer", "text": "Return an observable from the AsyncValidatorFn and pipe the source through switchMap. Angular re-invokes the validator on each value change and unsubscribes from the previous inner observable, which cancels the outstanding HTTP request through Angular's HttpClient. switchMap is the RxJS equivalent of aborting the previous request with an AbortController." }
        },
        {
          "@type": "Question",
          "name": "Should I run a Zod schema as a sync validator or an async validator?",
          "acceptedAnswer": { "@type": "Answer", "text": "Run pure structural and format rules synchronously with safeParse inside a ValidatorFn so they resolve in the same tick and never flip the control to PENDING. Reserve AsyncValidatorFn for checks that genuinely require I/O, such as server-side uniqueness. Mixing a network call into the sync validator blocks the status stream and defeats PENDING." }
        },
        {
          "@type": "Question",
          "name": "Do I still need to unsubscribe if I use the async pipe everywhere?",
          "acceptedAnswer": { "@type": "Answer", "text": "The async pipe unsubscribes the streams it renders when the component is destroyed, so template-bound observables are safe. Any subscription you open imperatively in a component or service — valueChanges you subscribe to in ngOnInit, for example — still leaks unless you pipe it through takeUntilDestroyed or takeUntil(this.destroy$). The async pipe only covers what the template consumes." }
        }
      ]
    }
  ]
}
</script>

# Angular Reactive Forms Adapters

Angular Reactive Forms already model a form as a tree of `FormControl`, `FormGroup`, and `FormArray` nodes, each exposing `valueChanges` and `statusChanges` observables plus a synchronous `status` field. That looks like a state machine — but it is Angular's state machine, coupled to `@angular/forms`, RxJS operators, and Angular's change detection. The moment you need the same validation contract in a React screen, a background worker, or a server route, that coupling becomes the bug: the rules live inside `Validators` closures you cannot reuse, the "is this field pending?" logic is scattered across templates, and teardown is an afterthought that leaks subscriptions on every route change.

This page specifies an adapter that projects the Angular control tree onto a framework-agnostic state machine and drives validation from a shared schema. The adapter treats `FormGroup` as the transport layer and a plain, serializable snapshot as the source of truth other subsystems read. It sits alongside the [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) adapter and the [Vue Composition API form adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) so that all three frameworks resolve to one validation pipeline and one set of typed errors. For the underlying model, see the [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/) architecture guide.

---

## Problem Statement

Angular's forms API answers "what is the value and status of this control right now?" extremely well. It answers three other questions poorly, and those are the ones that break in production:

- **Reuse.** A `Validators.required` closure or a hand-written `emailUniqueValidator` cannot run outside Angular. If your backend, your React admin panel, and your Angular customer form must agree on what "valid" means, duplicating rules per framework guarantees drift.
- **Explicit lifecycle.** Angular collapses everything into four status strings: `VALID`, `INVALID`, `PENDING`, `DISABLED`. There is no first-class notion of "submitting", "submit succeeded", or "server rejected the payload". Teams bolt those on with ad-hoc booleans that fall out of sync with the control status.
- **Teardown.** Every imperative `valueChanges.subscribe()` you open is a leak unless you explicitly complete it. Route away from a form mid-validation and the subscription — and the closure it captured — survives.

The adapter draws a hard boundary. Angular's `FormGroup` remains the DOM binding and event source. The adapter subscribes once, maps status strings onto an explicit discriminated-union machine, runs a shared schema for validation, and exposes an observable of a plain snapshot. Consumers never touch `FormControl` directly, so the same snapshot shape works whether the host is Angular, a test harness, or a non-Angular renderer.

---

## State Machine Specification

The adapter's states are a superset of Angular's status strings. Angular tells us `VALID | INVALID | PENDING | DISABLED`; the machine adds the submission lifecycle that Angular omits. The `status` value drives most transitions, but submit intent and server responses drive the rest.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 360" role="img" aria-label="Data flow between Angular FormControl, the adapter, and the schema validation pipeline" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Angular FormControl to adapter to schema pipeline</title>
  <desc>FormControl and FormGroup emit valueChanges and statusChanges into the adapter. The adapter runs a synchronous Zod ValidatorFn and a cancellable AsyncValidatorFn, maps Angular status onto an explicit state machine, and emits a plain snapshot consumed by an OnPush component through the async pipe. takeUntilDestroyed completes every stream.</desc>
  <defs>
    <marker id="arr-angular-adapters" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="currentColor" opacity="0.75"/>
    </marker>
  </defs>
  <rect width="760" height="360" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.08" stroke-width="1"/>
  <!-- FormGroup node -->
  <rect x="30" y="140" width="150" height="70" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="105" y="168" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">FormGroup</text>
  <text x="105" y="186" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">valueChanges</text>
  <text x="105" y="200" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">statusChanges</text>
  <!-- Adapter node -->
  <rect x="290" y="130" width="170" height="90" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="375" y="158" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">Adapter</text>
  <text x="375" y="176" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">map status → state</text>
  <text x="375" y="190" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">merge sync + async</text>
  <text x="375" y="204" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">emit snapshot</text>
  <!-- Schema node -->
  <rect x="560" y="30" width="170" height="76" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="645" y="58" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">Zod schema</text>
  <text x="645" y="76" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">safeParse (sync)</text>
  <text x="645" y="90" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">refine + async check</text>
  <!-- Component node -->
  <rect x="560" y="250" width="170" height="76" rx="10" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/>
  <text x="645" y="278" text-anchor="middle" font-family="inherit" font-size="13" font-weight="600" fill="currentColor">OnPush view</text>
  <text x="645" y="296" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">async pipe</text>
  <text x="645" y="310" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">snapshot$ | async</text>
  <!-- Arrows -->
  <!-- FormGroup -> Adapter -->
  <path d="M180 175 L284 175" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-angular-adapters)"/>
  <text x="232" y="166" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">streams</text>
  <!-- Adapter -> Schema -->
  <path d="M448 135 C514 102 538 92 550 82" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-angular-adapters)"/>
  <text x="512" y="104" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">validate(value)</text>
  <!-- Schema -> Adapter (errors) -->
  <path d="M574 98 C524 128 504 138 472 150" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" stroke-dasharray="5 3" marker-end="url(#arr-angular-adapters)"/>
  <text x="502" y="144" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">ValidationErrors</text>
  <!-- Adapter -> Component -->
  <path d="M448 210 C514 238 538 246 550 256" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.7" marker-end="url(#arr-angular-adapters)"/>
  <text x="512" y="248" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">snapshot$</text>
  <!-- Component -> FormGroup (CVA writeValue) -->
  <path d="M560 300 C360 338 200 296 132 220" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="5 3" marker-end="url(#arr-angular-adapters)"/>
  <text x="360" y="330" text-anchor="middle" font-family="inherit" font-size="10" fill="currentColor" opacity="0.75">ControlValueAccessor writeValue / onChange</text>
</svg>

The status-to-state mapping is the load-bearing table. Read it as the contract between Angular's four strings and the machine's explicit states:

| Angular signal | Adapter state | Meaning | Error display |
|----------------|--------------|---------|---------------|
| `status === 'VALID'`, untouched | `PRISTINE` | Nothing typed, schema passes | none |
| `status === 'VALID'`, dirty | `VALID` | Passes sync schema and async checks | none |
| `status === 'PENDING'` | `VALIDATING` | An `AsyncValidatorFn` is in flight | spinner, not error |
| `status === 'INVALID'` | `INVALID` | Sync or resolved async check failed | show mapped errors |
| `status === 'DISABLED'` | `DISABLED` | Control excluded from validation and value | none |
| `submit()` called, machine `VALID` | `SUBMITTING` | Payload posted, awaiting server | disable submit |
| server 2xx | `SUCCEEDED` | Persisted; new pristine baseline | none |
| server 4xx with field errors | `INVALID` (server) | Merge server errors into control | show server errors |

The critical distinction production teams miss is `PENDING` versus `INVALID`. While an async validator runs, Angular reports `PENDING`, and the control's `errors` object is `null`. If your template renders "an error" whenever the control is not `VALID`, you flash a false error during every async round-trip. Gate error rendering on `status === 'INVALID'` and render the `VALIDATING` state as a spinner.

---

## Core Implementation

The adapter subscribes to the `FormGroup` once, folds `valueChanges` and `statusChanges` into a single snapshot stream, and maps Angular's status onto the machine. Validation is delegated to a shared schema — see [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) for the schema-authoring side of this contract.

```typescript
import { FormGroup } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith, distinctUntilChanged } from 'rxjs/operators';

// Explicit machine states — a superset of Angular's four status strings.
export type FormMachineState =
  | 'PRISTINE'
  | 'VALID'
  | 'VALIDATING'
  | 'INVALID'
  | 'DISABLED'
  | 'SUBMITTING'
  | 'SUCCEEDED';

export interface FormSnapshot<T> {
  readonly value: T;
  readonly state: FormMachineState;
  // Field-path -> array of human-readable messages, framework-agnostic.
  readonly errors: Readonly<Record<string, string[]>>;
  readonly dirty: boolean;
  readonly touched: boolean;
}

/**
 * Projects an Angular FormGroup onto a plain, serializable snapshot stream.
 * The returned observable is cold and multicast-free; wrap with shareReplay(1)
 * at the call site if multiple template bindings consume it.
 */
export function toSnapshot<T extends Record<string, unknown>>(
  group: FormGroup,
  submitState$: Observable<'idle' | 'submitting' | 'succeeded'>,
): Observable<FormSnapshot<T>> {
  // startWith replays the current value/status so the first render is populated
  // synchronously — valueChanges/statusChanges only fire on *subsequent* changes.
  const value$ = group.valueChanges.pipe(startWith(group.getRawValue()));
  const status$ = group.statusChanges.pipe(startWith(group.status));

  return combineLatest([value$, status$, submitState$]).pipe(
    map(([value, status, submit]): FormSnapshot<T> => {
      const state = mapState(status, group, submit);
      return {
        value: value as T,
        state,
        errors: collectErrors(group),
        dirty: group.dirty,
        touched: group.touched,
      };
    }),
    // Snapshots are structurally comparable; skip identical emissions so
    // OnPush change detection is not woken for no-op status echoes.
    distinctUntilChanged(
      (a, b) => a.state === b.state && shallowEqual(a.value, b.value),
    ),
  );
}

function mapState(
  status: string,
  group: FormGroup,
  submit: 'idle' | 'submitting' | 'succeeded',
): FormMachineState {
  if (submit === 'submitting') return 'SUBMITTING';
  if (submit === 'succeeded') return 'SUCCEEDED';
  if (status === 'DISABLED') return 'DISABLED';
  if (status === 'PENDING') return 'VALIDATING';
  if (status === 'INVALID') return 'INVALID';
  // VALID: distinguish an untouched pristine form from an edited valid one.
  return group.dirty ? 'VALID' : 'PRISTINE';
}

function collectErrors(group: FormGroup): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, control] of Object.entries(group.controls)) {
    if (control.errors) {
      // Angular's errors is Record<string, unknown>; normalise to messages.
      out[name] = Object.values(control.errors).map(String);
    }
  }
  return out;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  return ka.length === kb.length &&
    ka.every(k => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}
```

Two design decisions matter. First, `startWith` seeds the stream with the control's current value and status — `valueChanges` and `statusChanges` are hot but only fire on *subsequent* changes, so without `startWith` the first render is empty until the user types. Second, `distinctUntilChanged` suppresses no-op status echoes; Angular re-emits `VALID` on unrelated recalculations, and each echo would otherwise wake `OnPush` change detection for nothing.

### Wiring a shared Zod schema into a ValidatorFn

Pure structural and format rules run synchronously. A single `ValidatorFn` runs the schema's `safeParse` and returns Angular's `ValidationErrors` shape, so one schema governs Angular, React, and the server.

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { z } from 'zod';

/**
 * Builds a synchronous Angular ValidatorFn from a Zod schema.
 * Runs in the same tick as the value change — never flips the control to
 * PENDING — so reserve it strictly for structural/format rules, not I/O.
 */
export function zodValidator<S extends z.ZodTypeAny>(schema: S): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value);
    if (result.success) return null;

    // Flatten Zod issues into { <code>: message } so Angular's errors object
    // stays a plain map. The adapter's collectErrors() then normalises it.
    const errors: ValidationErrors = {};
    for (const issue of result.error.issues) {
      errors[issue.code] = issue.message;
    }
    return errors;
  };
}
```

### A cancellable AsyncValidatorFn

Server-side checks — uniqueness, cross-account rules — belong in an `AsyncValidatorFn`. The cancellation model is RxJS `switchMap`: Angular re-invokes the validator on each value change and unsubscribes the previous inner observable, which cancels the outstanding `HttpClient` request. This is the RxJS equivalent of aborting the prior fetch with an `AbortController` — the same discipline covered in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/).

```typescript
import { AsyncValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError, first } from 'rxjs/operators';

/**
 * Async uniqueness validator with built-in cancellation.
 *
 * switchMap is the cancellation primitive here: when the control value changes,
 * Angular resubscribes and switchMap unsubscribes from the prior inner
 * observable. Angular's HttpClient wires the underlying XHR abort to that
 * unsubscription, so the stale request is cancelled at the network layer —
 * exactly what an AbortController.abort() would do for fetch().
 */
export function uniqueEmailValidator(http: HttpClient): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = control.value as string;
    if (!value) return of(null);

    return timer(300).pipe(
      // Debounce inside the validator: wait 300ms of quiet before the request.
      switchMap(() =>
        http.get<{ available: boolean }>(
          `/api/email-available?email=${encodeURIComponent(value)}`,
        ).pipe(
          map(res => (res.available ? null : { emailTaken: 'Email already registered' })),
          // Network failure should not permanently block the form; treat as pass
          // and let the server re-validate on submit.
          catchError(() => of(null)),
        ),
      ),
      // AsyncValidatorFn must emit exactly once then complete, or the control
      // stays PENDING forever. first() enforces the completion contract.
      first(),
    );
  };
}
```

The `first()` operator is not optional. An `AsyncValidatorFn` must emit exactly once and complete; a validator whose observable never completes leaves the control stuck in `PENDING` forever, and the machine never leaves `VALIDATING`.

### ControlValueAccessor for custom inputs

Custom widgets — a tag picker, a segmented control — participate in the same status/value streams only if they implement `ControlValueAccessor`. That is the seam that lets a non-native element behave like a `FormControl`.

```typescript
import { Component, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      *ngFor="let tag of options"
      [attr.aria-pressed]="selected.has(tag)"
      [disabled]="isDisabled"
      (click)="toggle(tag)">
      {{ tag }}
    </button>
  `,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
})
export class TagInputComponent implements ControlValueAccessor {
  options = ['ops', 'billing', 'security'];
  selected = new Set<string>();
  isDisabled = false;

  // Angular hands us these callbacks; we invoke them to push value/touch upward.
  private onChange: (v: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  // Angular -> component: programmatic value writes (patchValue, reset, hydrate).
  writeValue(value: string[] | null): void {
    this.selected = new Set(value ?? []);
  }
  registerOnChange(fn: (v: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }

  toggle(tag: string): void {
    this.selected.has(tag) ? this.selected.delete(tag) : this.selected.add(tag);
    // component -> Angular: this is what flips the control to dirty and fires
    // valueChanges, which the adapter's snapshot stream picks up.
    this.onChange([...this.selected]);
    this.onTouched();
  }
}
```

### Assembling the form with OnPush and takeUntilDestroyed

The host component builds the `FormGroup`, attaches the validators, and renders the snapshot through the `async` pipe under `OnPush`. Every imperative subscription is completed with `takeUntilDestroyed`.

```typescript
import { Component, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, shareReplay } from 'rxjs';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  displayName: z.string().min(2, 'At least 2 characters'),
});

@Component({
  selector: 'app-signup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" *ngIf="snapshot$ | async as snap">
      <input formControlName="email" aria-describedby="email-err" />
      <p id="email-err" role="alert" *ngIf="snap.state === 'INVALID' && snap.errors['email']">
        {{ snap.errors['email'][0] }}
      </p>
      <span *ngIf="snap.state === 'VALIDATING'" aria-live="polite">Checking…</span>
      <button [disabled]="snap.state !== 'VALID'">Sign up</button>
    </form>
  `,
})
export class SignupComponent {
  private http = inject(HttpClient);
  // DestroyRef is the injectable that takeUntilDestroyed reads to know when
  // the component is torn down — the modern replacement for a destroy$ Subject.
  private destroyRef = inject(DestroyRef);

  private submitState$ = new BehaviorSubject<'idle' | 'submitting' | 'succeeded'>('idle');

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: zodValidator(signupSchema.shape.email),
      asyncValidators: uniqueEmailValidator(this.http),
    }),
    displayName: new FormControl('', {
      nonNullable: true,
      validators: zodValidator(signupSchema.shape.displayName),
    }),
  });

  snapshot$ = toSnapshot(this.form, this.submitState$).pipe(shareReplay(1));

  constructor() {
    // Example imperative subscription: analytics on every value change.
    // takeUntilDestroyed completes it when the component is destroyed, so the
    // captured closure is released and no leak survives a route change.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.track(v));
  }

  submit(): void {
    if (this.form.status !== 'VALID') return;
    this.submitState$.next('submitting');
    this.http.post('/api/signup', this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitState$.next('succeeded');
          // New pristine baseline: reset marks the form pristine/untouched.
          this.form.reset(this.form.getRawValue());
        },
        error: () => this.submitState$.next('idle'),
      });
  }

  private track(_v: unknown): void { /* analytics */ }
}
```

---

## Integration Guidance

The adapter is the boundary between Angular's control tree and every other subsystem. Because it emits a plain `FormSnapshot<T>`, consumers never import `@angular/forms`.

- **Shared schema.** The same Zod schema feeds the Angular `zodValidator`, the [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) resolver, and the server route. One rule set, three runtimes. When a rule changes, it changes in one file.
- **Cross-field rules.** Dependencies such as "confirm password must match password" belong in a schema `refine`, not in a per-control validator, so they survive the framework boundary — see [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) for the schema-side pattern.
- **State machine hand-off.** The `FormMachineState` union is the same vocabulary used across the site's adapters. Downstream code reads `snapshot.state`, never Angular's raw `status` string, so a React screen and an Angular screen make identical rendering decisions. The bridging of `valueChanges`/`statusChanges` into that machine without feedback loops is detailed in [syncing Angular FormControl with a state machine](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/syncing-angular-formcontrol-with-a-state-machine/).

---

## Edge Cases and Failure Modes

### Feedback loops from patchValue inside a valueChanges subscription

If you subscribe to `valueChanges` and call `patchValue()` in the handler to normalize input, the patch fires `valueChanges` again, which re-runs the handler — an infinite loop or, at best, a doubled emission.

**Resolution:** pass `{ emitEvent: false }` to `patchValue`/`setValue` for any programmatic write that should not re-enter the stream. This is the Angular equivalent of guarding a reducer against its own dispatch, covered in depth in the child page on syncing with a state machine.

### PENDING never resolves

A custom `AsyncValidatorFn` that returns an observable which emits but never completes leaves the control in `PENDING` permanently. The submit button, gated on `state === 'VALID'`, stays disabled forever.

**Resolution:** terminate every async validator with `first()` or `take(1)`. Verify the observable completes, not merely emits.

### Stale async result lands on a reset form

The user triggers an async check, then resets the form before the HTTP response arrives. Without cancellation the late response can re-mark a cleared control invalid.

**Resolution:** `switchMap` already cancels the prior request on each new value. On explicit `reset()`, Angular re-runs validators against the reset value, and the stale inner observable is unsubscribed. Do not hand-roll a `mergeMap` here — `mergeMap` keeps every in-flight request alive and is the classic source of this bug.

### Change detection never fires under OnPush

With `ChangeDetectionStrategy.OnPush`, a value mutated outside Angular's zone (a `setTimeout`, a raw WebSocket callback) updates the model but never repaints.

**Resolution:** render through the `async` pipe, which calls `markForCheck()` on every emission. If you must update imperatively, inject `ChangeDetectorRef` and call `markForCheck()` yourself — but prefer the pipe.

### Shadow DOM and native form participation

A custom element wrapping a `ControlValueAccessor` may sit inside a shadow root whose `change` events do not compose across the boundary, so Angular never sees them.

**Resolution:** dispatch `composed: true` custom events from the element, or bind the `ControlValueAccessor` callbacks directly rather than relying on event delegation across the shadow boundary.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|----------------|----------------|
| Error flashes while async validator runs | Log `control.status` during the round-trip — it reads `PENDING`, not `INVALID` | Gate error UI on `status === 'INVALID'`; render `PENDING` as a spinner |
| Submit button never enables | Check whether any async validator's observable completes | Add `first()`/`take(1)` so the control leaves `PENDING` |
| valueChanges fires twice per keystroke | Look for a `patchValue` call inside the subscription | Pass `{ emitEvent: false }` on the programmatic write |
| Memory grows on every route change | Audit imperative `.subscribe()` calls for missing teardown | Pipe through `takeUntilDestroyed(destroyRef)` |
| Custom input shows value but form stays pristine | Confirm `onChange`/`onTouched` are invoked in the widget | Call both callbacks in the widget's change handler |

---

## Testing and QA Hooks

Project machine state onto `data-*` attributes so Playwright and Cypress select on semantics, not CSS classes. Mirror the `FormSnapshot.state` string.

```typescript
// Bind in the template so tests read machine state, not Angular internals.
// [attr.data-state]="snap.state"  [attr.data-dirty]="snap.dirty"
```

```typescript
// Playwright: assert the VALIDATING -> INVALID transition on a taken email.
await page.fill('[formControlName="email"]', 'taken@example.com');
await expect(page.locator('form')).toHaveAttribute('data-state', 'VALIDATING');
await expect(page.locator('form')).toHaveAttribute('data-state', 'INVALID');
await expect(page.locator('#email-err')).toHaveText(/already registered/i);
```

For ARIA regression coverage, assert that the error paragraph carries `role="alert"` and is referenced by the input's `aria-describedby` only while `state === 'INVALID'`, and that the `VALIDATING` spinner uses `aria-live="polite"` — the accessible-announcement discipline shared with the [accessibility and error UX](https://www.client-side-form.com/accessibility-and-error-ux/) guide. Axe-core will flag `aria-invalid="true"` left on a control that has returned to `VALID`.

---

## Common Pitfalls

**Treating "not VALID" as "invalid".** Angular has four statuses; `PENDING` and `DISABLED` are neither valid nor an error. Branch on the exact status string.

**Putting a network call in a synchronous ValidatorFn.** A sync validator that awaits I/O blocks the status stream and cannot flip the control to `PENDING`. Move all I/O into an `AsyncValidatorFn`.

**Using mergeMap instead of switchMap for async validation.** `mergeMap` keeps stale requests alive, so an old response can overwrite a newer one. `switchMap` cancels the prior request — always use it for validation.

**Forgetting `{ emitEvent: false }` on programmatic writes.** Any `setValue`/`patchValue` inside a `valueChanges` subscription re-enters the stream and loops.

**Relying on the async pipe to clean up imperative subscriptions.** The pipe only unsubscribes what the template renders. Every hand-written `.subscribe()` still needs `takeUntilDestroyed`.

---

## Frequently Asked Questions

<details>
<summary><strong>Why does my Angular form flip to INVALID before the async validator finishes?</strong></summary>

It does not — while an `AsyncValidatorFn` is running the control's status is `PENDING`, not `INVALID`, and its `errors` object is `null`. If your UI shows an error during that window you are either reading a stale errors object or rendering on the absence of `VALID` and treating that as invalid. Gate error display on `status === 'INVALID'` explicitly, and render a spinner while `status === 'PENDING'`. The adapter maps `PENDING` to the `VALIDATING` machine state precisely so the view can tell the two apart.

</details>

<details>
<summary><strong>How do I cancel an in-flight async validator when the user keeps typing?</strong></summary>

Return an observable from the `AsyncValidatorFn` and pipe the source through `switchMap`. Angular re-invokes the validator on each value change and unsubscribes from the previous inner observable, which cancels the outstanding `HttpClient` request at the network layer. `switchMap` is the RxJS equivalent of aborting the previous request with an `AbortController` — the previous work is discarded, not merged. Never use `mergeMap` here, because it leaves stale requests running and lets an old response overwrite a newer one.

</details>

<details>
<summary><strong>Should I run a Zod schema as a sync validator or an async validator?</strong></summary>

Run pure structural and format rules synchronously with `safeParse` inside a `ValidatorFn`, so they resolve in the same tick and never flip the control to `PENDING`. Reserve `AsyncValidatorFn` for checks that genuinely require I/O, such as server-side uniqueness. Mixing a network call into the sync validator blocks the status stream and defeats the purpose of `PENDING`. A single schema can back both: use `schema.shape.field` for the sync path and a `refine` that calls the server only inside the async validator.

</details>

<details>
<summary><strong>Do I still need to unsubscribe if I use the async pipe everywhere?</strong></summary>

The `async` pipe unsubscribes the streams it renders when the component is destroyed, so template-bound observables are safe. Any subscription you open imperatively — `valueChanges` you subscribe to in the constructor or `ngOnInit`, an HTTP call in a submit handler — still leaks unless you pipe it through `takeUntilDestroyed(destroyRef)` or `takeUntil(this.destroy$)`. The async pipe only covers what the template consumes, so treat every hand-written `.subscribe()` as your responsibility to tear down.

</details>

---

## Related

- [Syncing Angular FormControl with a State Machine](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/syncing-angular-formcontrol-with-a-state-machine/)
- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)

← [Framework Adapters & Custom Hooks](https://www.client-side-form.com/framework-adapters-custom-hooks/)
