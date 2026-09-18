---
layout: page.njk
title: "Cancelling Angular Async Validators With switchMap"
description: "Write Angular AsyncValidatorFn implementations that debounce, cancel stale HTTP requests and never leave a control stuck in PENDING: timer plus switchMap, first() completion, updateOn blur, and error handling that does not block the form."
slug: cancelling-angular-async-validators-with-switchmap
type: howto
breadcrumb: "Async Validators & switchMap"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Cancelling Angular Async Validators With switchMap"
  parent: "Angular Reactive Forms Adapters"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Cancelling Angular Async Validators With switchMap",
      "description": "Write Angular AsyncValidatorFn implementations that debounce, cancel stale HTTP requests and never leave a control stuck in PENDING: timer plus switchMap, first() completion, updateOn blur, and error handling that does not block the form.",
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
          "name": "Cancelling Angular Async Validators With switchMap",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/cancelling-angular-async-validators-with-switchmap/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Write a cancellable, debounced Angular async validator",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Rely on sync validators to gate the request"
        },
        {
          "@type": "HowToStep",
          "name": "Debounce with timer inside the validator"
        },
        {
          "@type": "HowToStep",
          "name": "Start the request with switchMap"
        },
        {
          "@type": "HowToStep",
          "name": "Catch errors into a soft result"
        },
        {
          "@type": "HowToStep",
          "name": "End with first()"
        },
        {
          "@type": "HowToStep",
          "name": "Show the pending state accessibly"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why not debounce valueChanges and set errors manually?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can, but you then bypass Angular's status model: the control is not PENDING during the check, form.valid is wrong until your subscription sets errors, and you must manage subscriptions and cancellation yourself. An AsyncValidatorFn integrates with status, submit and markAllAsTouched for free."
          }
        },
        {
          "@type": "Question",
          "name": "Should the validator return an error when the network fails?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Return a distinct, soft error such as availabilityUnknown that your UI shows as a warning and your submit logic allows through, since the server re-checks on submit. Returning emailTaken on failure blames the user for an outage."
          }
        },
        {
          "@type": "Question",
          "name": "Does this work with signals-based forms?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The observable pattern is specific to reactive forms. With signal-first form APIs, the same ideas apply — a delay before starting, cancellation on change, guaranteed completion — expressed with the APIs those forms provide for async validation. The bridging approach is covered in bridging Angular signals and reactive forms."
          }
        }
      ]
    }
  ]
}
</script>

# Cancelling Angular Async Validators With switchMap

The textbook Angular async validator — `return this.http.get(...).pipe(map(...))` — fires a request on every keystroke, lets slow responses for old values overwrite newer ones in some setups, and leaves the control stuck in `PENDING` forever if the observable never completes, which silently disables submit.

Angular does part of the work for you: when a control's value changes, it unsubscribes from the previous async validator's observable, which cancels an in-flight `HttpClient` request. What it does not do is debounce, guarantee completion, or handle errors. This page writes an async validator that does all three, for use within the [Angular reactive forms adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) architecture.

---

## Context and prerequisites

How Angular runs async validators:

1. Sync validators run first. **If any sync validator fails, async validators do not run** — no request for an obviously malformed email.
2. If sync validation passes, the control's status becomes `PENDING` and Angular subscribes to each `AsyncValidatorFn`'s observable.
3. Angular takes the **first emitted value** as the result. The control stays `PENDING` until the observable emits (and it must complete for some flows, such as `statusChanges` consumers waiting on completion).
4. On the next value change, Angular **unsubscribes** from the previous observable before starting a new one. For `HttpClient`, unsubscribing aborts the XHR.

So cancellation of in-flight requests is automatic; debouncing is not, because a new validator invocation starts immediately on each change. The standard technique is to debounce *inside* the validator with `timer`, so an unsubscribed invocation never reaches its HTTP call.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of keystrokes typing an email, showing when HTTP requests are sent by a naive async validator, a validator debounced with timer and switchMap, and a validator with updateOn blur." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Typing &quot;ada@ex.io&quot; with three validator designs</title>
  <desc>The naive validator sends a request for every keystroke that passes sync validation, and all but the last are cancelled mid-flight. The timer-debounced validator waits 400 milliseconds after the last keystroke and sends one request. The updateOn blur configuration sends one request when the user leaves the field, at about 2.6 seconds.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">naive (per keystroke)</text>
  <rect x="278.8" y="14.0" width="32.8" height="14" rx="3" fill="#a63d6f"/>
  <rect x="311.6" y="14.0" width="32.8" height="14" rx="3" fill="#a63d6f"/>
  <rect x="344.4" y="14.0" width="32.8" height="14" rx="3" fill="#a63d6f"/>
  <rect x="377.2" y="14.0" width="65.6" height="14" rx="3" fill="#a63d6f"/>
  <text x="377.2" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">5 requests, 4 cancelled</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">timer(400) + switchMap</text>
  <rect x="442.8" y="56.0" width="65.6" height="14" rx="3" fill="#2d6342"/>
  <text x="442.8" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">1 request after pause</text>
  <text x="14.0" y="108.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">updateOn blur</text>
  <rect x="590.4" y="98.0" width="65.6" height="14" rx="3" fill="#2d6342"/>
  <text x="590.4" y="124.0" font-size="9" fill="#2d6342" font-family="inherit">1 request on</text>
  <text x="590.4" y="136.0" font-size="9" fill="#2d6342" font-family="inherit">blur</text>
  <text x="164.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0ms</text>
  <text x="246.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">500ms</text>
  <text x="328.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1000ms</text>
  <text x="410.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">1500ms</text>
  <text x="492.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2000ms</text>
  <text x="574.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2500ms</text>
  <text x="656.0" y="160.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">3000ms</text>
</svg>

---

## The core pattern: timer, switchMap, first, catchError

```typescript
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from "@angular/forms";
import { Observable, of, timer } from "rxjs";
import { catchError, first, map, switchMap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class EmailAvailability {
  private http = inject(HttpClient);

  validator(debounceMs = 400): AsyncValidatorFn {
    return (control: AbstractControl<string>): Observable<ValidationErrors | null> => {
      const value = (control.value ?? "").trim().toLowerCase();
      if (!value) return of(null);                   // "required" is a sync validator's job

      // timer() delays the request. If the value changes during the delay,
      // Angular unsubscribes from THIS observable, so the HTTP call never starts.
      return timer(debounceMs).pipe(
        // switchMap: if timer emitted, start the request. Unsubscribing later
        // (next keystroke) cancels the in-flight HttpClient request (XHR abort).
        switchMap(() =>
          this.http.get<{ available: boolean }>("/api/email-available", { params: { email: value } }),
        ),
        map((res) => (res.available ? null : { emailTaken: true })),
        // Network failure must not block the form: report a soft, retryable error
        // (or null, if the server will re-check on submit anyway).
        catchError(() => of({ availabilityUnknown: true })),
        // Guarantee completion after the first result, so PENDING always ends.
        first(),
      );
    };
  }
}
```

```typescript
// Usage: sync validators first, async validator second, optionally updateOn: "blur".
email = new FormControl("", {
  nonNullable: true,
  validators: [Validators.required, Validators.email],
  asyncValidators: [inject(EmailAvailability).validator()],
  updateOn: "change",            // or "blur" to validate only when the user leaves
});
```

---

## Step-by-step walkthrough

1. **Rely on sync validators to gate the request.** Put `required` and `email` in `validators`; Angular skips async validators while they fail, so malformed input never hits the network.
2. **Debounce with `timer` inside the validator.** Each keystroke starts a new validator; the previous one is unsubscribed during its timer, so its request is never sent.
3. **Start the request with `switchMap`.** If the value changes after the request starts, Angular's unsubscribe cancels it — the same effect as [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).
4. **Catch errors into a soft result.** A thrown error leaves the control's status in an inconsistent state; map failures to `{ availabilityUnknown: true }` and let the UI say "We couldn't check this right now".
5. **End with `first()`.** The control leaves `PENDING` only when the observable emits; `first()` makes the contract explicit and completes the stream.
6. **Show the pending state accessibly.** `control.pending` drives a visible "Checking…" with a polite announcement, as described in [accessible pending state for async validation](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/accessible-pending-state-for-async-validation/).

### Why debouncing belongs inside the validator

It is natural to try debouncing `valueChanges` and calling `updateValueAndValidity` yourself, or to use `debounceTime` inside the validator's pipe. Neither works cleanly. Angular calls the validator function once per value change and subscribes to a *new* observable each time, so an operator like `debounceTime` inside one invocation only ever sees that invocation's single value and debounces nothing. The debounce must be expressed as a delay before the work starts — `timer` — combined with Angular's own unsubscribe-on-change, which cancels every delayed invocation except the last. The result is a debounce built from two cooperating mechanisms, which is why it is worth wrapping in a reusable factory rather than rewriting per field.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing four async validator pipelines on requests per typed word, stale-result safety and whether the control can get stuck in PENDING." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Validator pipelines and their behaviour</title>
  <desc>A bare HTTP call sends one request per keystroke, is cancelled by Angular on change, and can stay pending if the request errors without handling. Adding debounceTime inside the pipe does not debounce because each invocation sees one value. timer plus switchMap sends one request after a pause and is cancellation safe. Adding catchError and first guarantees the control always leaves PENDING.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Pipeline</text>
  <text x="303.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Requests per word</text>
  <text x="489.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stuck PENDING?</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">http.get(...)</text>
  <text x="303.4" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">one per keystroke</text>
  <text x="489.7" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">on unhandled error</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">debounceTime(400) + http</text>
  <text x="303.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">still one per keystroke</text>
  <text x="489.7" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">on unhandled error</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">timer(400) + switchMap(http)</text>
  <text x="303.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">one after the pause</text>
  <text x="489.7" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">on unhandled error</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">catchError + first()</text>
  <text x="303.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">one after the pause</text>
  <text x="489.7" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">never</text>
</svg>

---

## Failure modes and edge cases

### 1. Form-level `PENDING` blocks submit

`form.valid` is false while any control is `PENDING`. If a submit button is disabled on `!form.valid`, a slow availability check disables submission. On submit, if `form.pending`, wait for `statusChanges` to leave `PENDING` (with a timeout) rather than rejecting the submit.

### 2. Async validators re-run on unrelated updates

`form.updateValueAndValidity()` or `patchValue` on the whole form re-runs every validator, including async ones. Pass `{ emitEvent: false }` where appropriate, or skip the request when the value equals the last checked value (cache it in the service, as in [caching async validation results](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/caching-async-validation-results/)).

### 3. `updateOn: "blur"` and the final keystroke

With `updateOn: "blur"`, the control's value (and validation) updates only on blur. Pressing Enter to submit without blurring uses the old value on some flows; call `form.updateValueAndValidity()` at submit or use `updateOn: "submit"` for the final check.

### 4. Rate limits

Even debounced validators can be rate-limited by the server. Treat 429 as "unknown" rather than "taken", as in [handling timeouts and 429s in async validators](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/handling-timeouts-and-429s-in-async-validators/).

### 5. Server re-check on submit

An availability pre-check is advisory; two users can pick the same email between check and submit. The submit endpoint must enforce uniqueness and return a field error the form maps back onto the control with `setErrors`.

<svg viewBox="0 0 680 227" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a FormControl moving from VALID through PENDING while the async validator&#x27;s timer and request run, then to INVALID when the server reports the email as taken." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Control status through one async check</title>
  <desc>The user types a well-formed email and sync validators pass. The control&#x27;s status becomes PENDING and the async validator starts its 400 millisecond timer. When the timer fires, switchMap starts the HTTP request. The server responds that the email is not available. The validator emits emailTaken and completes via first, and the control&#x27;s status becomes INVALID with the emailTaken error.</desc>
  <rect x="0" y="0" width="680" height="227" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">FormControl</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Async validator</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M95.5,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V211.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">value passes sync validators</text>
  <path d="M95.5,69.0 H250.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="250.5,65.0 257.5,69.0 250.5,73.0" fill="#7b4f8a"/>
  <text x="266.5" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">status PENDING; subscribe</text>
  <path d="M258.5,97.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,93.0 420.5,97.0 413.5,101.0" fill="#7b4f8a"/>
  <text x="429.5" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">after 400 ms: GET</text>
  <text x="429.5" y="133.0" font-size="9.5" fill="#6b5f75" font-family="inherit">/email-available</text>
  <path d="M421.5,137.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,133.0 583.5,137.0 576.5,141.0" fill="#7b4f8a"/>
  <text x="429.5" y="161.0" font-size="9.5" fill="#a63d6f" font-family="inherit">{ available: false }</text>
  <path d="M584.5,165.0 H429.5" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="429.5,161.0 422.5,165.0 429.5,169.0" fill="#7b4f8a"/>
  <text x="266.5" y="189.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">emit { emailTaken } + complete</text>
  <path d="M421.5,193.0 H266.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="266.5,189.0 259.5,193.0 266.5,197.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] Typing a full email sends one request after the user pauses.
- [ ] Malformed input sends no requests.
- [ ] A new keystroke during an in-flight request cancels it (visible as cancelled in the Network panel).
- [ ] Network errors produce a soft "couldn't check" state, not a stuck `PENDING`.
- [ ] The control always leaves `PENDING`.
- [ ] Submit waits for or re-runs pending checks rather than failing silently.
- [ ] The pending state is visible and announced politely.
- [ ] The server enforces the same rule at submit and its error maps back to the control.

---

## Frequently Asked Questions

<details>
<summary><strong>Why not debounce valueChanges and set errors manually?</strong></summary>

You can, but you then bypass Angular's status model: the control is not `PENDING` during the check, `form.valid` is wrong until your subscription sets errors, and you must manage subscriptions and cancellation yourself. An `AsyncValidatorFn` integrates with status, submit and `markAllAsTouched` for free.

</details>

<details>
<summary><strong>Should the validator return an error when the network fails?</strong></summary>

Return a distinct, soft error such as `availabilityUnknown` that your UI shows as a warning and your submit logic allows through, since the server re-checks on submit. Returning `emailTaken` on failure blames the user for an outage.

</details>

<details>
<summary><strong>Does this work with signals-based forms?</strong></summary>

The observable pattern is specific to reactive forms. With signal-first form APIs, the same ideas apply — a delay before starting, cancellation on change, guaranteed completion — expressed with the APIs those forms provide for async validation. The bridging approach is covered in [bridging Angular signals and reactive forms](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/bridging-angular-signals-and-reactive-forms/).

</details>

---

## Related

- [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
- [Typed Reactive Forms in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/typed-reactive-forms-in-angular/)
- [Implementing Async Email Availability Checks](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/implementing-async-email-availability-checks/)

← [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
