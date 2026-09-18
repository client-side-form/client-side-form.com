---
layout: page.njk
title: "Typed Reactive Forms in Angular"
description: "Use Angular's strictly typed reactive forms: inferring value types from FormGroup, nonNullable controls that reset to their initial value, value vs getRawValue with disabled controls, FormRecord for dynamic keys, and typing custom validators."
slug: typed-reactive-forms-in-angular
type: howto
breadcrumb: "Typed Reactive Forms"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Typed Reactive Forms in Angular"
  parent: "Angular Reactive Forms Adapters"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Typed Reactive Forms in Angular",
      "description": "Use Angular's strictly typed reactive forms: inferring value types from FormGroup, nonNullable controls that reset to their initial value, value vs getRawValue with disabled controls, FormRecord for dynamic keys, and typing custom validators.",
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
          "name": "Typed Reactive Forms in Angular",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/typed-reactive-forms-in-angular/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Type an Angular reactive form end to end",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Inject NonNullableFormBuilder"
        },
        {
          "@type": "HowToStep",
          "name": "Opt specific fields into null"
        },
        {
          "@type": "HowToStep",
          "name": "Use getRawValue() for payloads"
        },
        {
          "@type": "HowToStep",
          "name": "Use FormRecord for dynamic keys"
        },
        {
          "@type": "HowToStep",
          "name": "Type validators by their input"
        },
        {
          "@type": "HowToStep",
          "name": "Access controls through form.controls"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why did the migration give me UntypedFormGroup everywhere?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The automatic migration preserved existing behaviour by switching to the untyped aliases, so nothing broke at upgrade time. Replacing them with typed constructors, form by form, is the intended follow-up."
          }
        },
        {
          "@type": "Question",
          "name": "Is nonNullable the same as Validators.required?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. nonNullable affects the type and what reset() restores; it does not make the field required. An empty string is a valid string. Use Validators.required for \"must be filled in\"."
          }
        },
        {
          "@type": "Question",
          "name": "Can I infer the form type from a Zod schema instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can derive a TypeScript type with z.infer and assert that getRawValue() matches it with a satisfies check. The two stay in sync if you also validate the raw value with the schema before submitting, which catches template–type mismatches at runtime."
          }
        }
      ]
    }
  ]
}
</script>

# Typed Reactive Forms in Angular

Since Angular 14, reactive forms are strictly typed — but many codebases still carry `UntypedFormGroup` from the automatic migration, and teams that do adopt types are surprised that `form.value.email` is `string | undefined`, that `reset()` sets fields to `null`, and that disabled controls vanish from `value`.

Each surprise is a deliberate part of the type model, and each has a precise fix. This page walks through typing a real form — nullable versus non-nullable controls, `value` versus `getRawValue()`, dynamic keys with `FormRecord`, and typed validators — as groundwork for the adapter patterns in [Angular reactive forms adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/).

---

## Context and prerequisites

The type rules Angular applies:

- **`new FormControl("x")`** has type `FormControl<string | null>`, because `reset()` with no argument sets the value to `null`.
- **`new FormControl("x", { nonNullable: true })`** has type `FormControl<string>`, and `reset()` restores `"x"` — the initial value, not `null`.
- **`FormGroup.value`** is `Partial<…>`: every key is optional, because *disabled* controls are omitted from `value`.
- **`FormGroup.getRawValue()`** includes disabled controls and is fully typed without `Partial`.
- **`FormBuilder.nonNullable`** (or `NonNullableFormBuilder`) builds every control non-nullable, which is what most forms actually want.

Once you know these four rules, the types stop being noise and start catching real bugs — a submit handler that forgets a disabled field, a reset that blanks required values.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing the TypeScript type and runtime value of form.value, form.getRawValue, a nullable control after reset and a non-nullable control after reset, for a form whose email control is disabled." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each API returns for a form with one disabled field</title>
  <desc>For a form with name, email and a disabled accountId, form.value is typed Partial with all keys optional and at runtime omits accountId. getRawValue is fully typed and includes accountId. A nullable control after reset with no argument holds null. A non-nullable control after reset holds its initial value.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Expression</text>
  <text x="216.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Type</text>
  <text x="438.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Runtime value</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">form.value</text>
  <text x="216.6" y="61.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">Partial&lt;{ name; email; accountId }&gt;</text>
  <text x="438.9" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">accountId missing (disabled)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">form.getRawValue()</text>
  <text x="216.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">{ name; email; accountId }</text>
  <text x="438.9" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">includes accountId</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">control.reset() (nullable)</text>
  <text x="216.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">string | null</text>
  <text x="438.9" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">null</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">control.reset() (nonNullable)</text>
  <text x="216.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">string</text>
  <text x="438.9" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">the initial value</text>
</svg>

---

## The core pattern: a non-nullable builder, explicit raw values, typed validators

```typescript
import { Component, inject } from "@angular/core";
import {
  AbstractControl, FormRecord, NonNullableFormBuilder, ReactiveFormsModule,
  ValidationErrors, ValidatorFn, Validators, FormControl,
} from "@angular/forms";

// A typed validator: declares the value type it accepts and the error shape it returns.
export function minAgeValidator(min: number): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    const v = control.value;
    if (v === null) return null;                     // "required" is a separate validator
    return v < min ? { minAge: { required: min, actual: v } } : null;
  };
}

@Component({
  selector: "app-account-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./account-form.html",
})
export class AccountFormComponent {
  private fb = inject(NonNullableFormBuilder);      // every control non-nullable

  form = this.fb.group({
    accountId: this.fb.control({ value: "ACC-812", disabled: true }),   // shown, not editable
    name: this.fb.control("", [Validators.required, Validators.minLength(2)]),
    email: this.fb.control("", [Validators.required, Validators.email]),
    // Genuinely optional numeric field: opt back INTO null explicitly.
    age: new FormControl<number | null>(null, [minAgeValidator(16)]),
    // Dynamic keys (feature flags, custom attributes): FormRecord keeps value typing.
    preferences: new FormRecord<FormControl<boolean>>({}),
  });

  addPreference(key: string) {
    this.form.controls.preferences.addControl(key, this.fb.control(false));
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // getRawValue: includes disabled accountId and is fully typed (no Partial).
    const payload = this.form.getRawValue();
    //    ^? { accountId: string; name: string; email: string; age: number | null; preferences: Record<string, boolean> }
    this.save(payload);
  }

  resetToLoaded() {
    this.form.reset();   // non-nullable controls return to their INITIAL values, not null
  }

  private save(_p: ReturnType<typeof this.form.getRawValue>) { /* … */ }
}
```

---

## Step-by-step walkthrough

1. **Inject `NonNullableFormBuilder`.** Most fields should reset to their initial value; making non-nullability the default removes `| null` from nearly every type.
2. **Opt specific fields into null.** A truly optional number or date uses `new FormControl<T | null>(null)`, so "empty" is representable and the type says so.
3. **Use `getRawValue()` for payloads.** It includes disabled controls and has no `Partial`; `value` is for cases where omitting disabled fields is intended, which ties into [skipping validation for disabled and hidden fields](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/skipping-validation-for-disabled-and-hidden-fields/).
4. **Use `FormRecord` for dynamic keys.** Unlike `FormGroup`, it allows adding and removing controls by arbitrary string keys while keeping each control's type.
5. **Type validators by their input.** `AbstractControl<number | null>` in the signature documents what the validator expects and catches misuse at the call site.
6. **Access controls through `form.controls`.** `form.controls.email` is typed; `form.get("email")` returns `AbstractControl | null` and loses the type.

### Why value is Partial, and why that is useful

It feels like a type-system annoyance that `form.value.email` may be `undefined` when every control exists. The reason is runtime behaviour: Angular excludes disabled controls from a group's `value`, and whether a control is disabled is a runtime fact the compiler cannot know. The `Partial` type is therefore telling the truth. The practical consequence is healthy: code that builds a request body from `value` must handle the absent case, which is exactly the bug — a disabled field silently missing from the payload — that the type exists to prevent. Choose deliberately between `value` (participating fields only) and `getRawValue()` (everything).

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of migrating an Angular form from UntypedFormGroup to typed reactive forms in four steps." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Migrating an untyped form to typed</title>
  <desc>Start by replacing UntypedFormBuilder with NonNullableFormBuilder, which types every control from its initial value. Fix compile errors where code assumed values could be null or undefined. Replace form.get with form.controls access to keep types. Finally switch submit payloads to getRawValue where disabled fields must be included, and add explicit nullable controls for genuinely optional fields.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="350.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Swap the builder</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">UntypedFormBuilder → NonNullableFormBuilder</text>
  <text x="394.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Types flow from initial values.</text>
  <path d="M189.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.0,89.0 189.0,96.0 193.0,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="350.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Fix the compile errors</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Places that assumed null/undefined.</text>
  <text x="394.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each error is a real assumption made visible.</text>
  <path d="M189.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.0,174.0 189.0,181.0 193.0,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="350.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">form.get → form.controls</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Keep control types.</text>
  <text x="394.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">String paths lose typing.</text>
  <path d="M189.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.0,259.0 189.0,266.0 193.0,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="350.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Payloads and optional fields</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">getRawValue(); FormControl&lt;T | null&gt; where needed.</text>
  <text x="394.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Disabled fields included on purpose; optional fields explicit.</text>
</svg>

### Typing the template side

Types in the component class do not automatically reach templates in older setups. Enable `strictTemplates` in the Angular compiler options so bindings such as `[formControl]="form.controls.email"` and expressions reading `form.controls.age.value` are type-checked. With it on, a template that treats a nullable age as a number, or references a control that was renamed, fails the build instead of rendering `null` at runtime. Pair it with a small typed helper for error messages — `errorText(form.controls.email)` returning a string or `null` — so templates never index into the untyped `errors` record directly.

---

## Failure modes and edge cases

### 1. `reset()` blanks required fields

With nullable controls, `reset()` sets values to `null`, making required fields invalid and, in templates, displaying empty. Non-nullable controls reset to their initial value. If "initial" should be the last saved value, rebuild or `reset(savedValues)` — the same rebasing logic as [resetting the dirty baseline after a successful save](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/resetting-the-dirty-baseline-after-a-successful-save/).

### 2. Numbers from text inputs

`<input type="number" formControlName="age">` gives a number through Angular's number value accessor (and `null` when empty). A plain text input gives a string even if the control is typed `number`; the type is a promise the template must keep. Use the right input type or a custom value accessor.

### 3. `patchValue` versus `setValue`

`setValue` requires every key (typed as the full value); `patchValue` accepts `Partial`. Loading a record with missing optional keys needs `patchValue`, or defaults applied first.

### 4. Errors typed as `any`

`control.errors` is `ValidationErrors | null`, a string-keyed record of `any`. Wrap access in a helper that maps known keys (`required`, `minlength`, `minAge`) to messages, so templates never read raw error objects.

### 5. Signals interop

Typed controls expose typed `valueChanges`, which convert cleanly to signals with `toSignal` — the basis of [bridging Angular signals and reactive forms](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/bridging-angular-signals-and-reactive-forms/).

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing when to use a non-nullable control, an explicitly nullable control and a FormRecord." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Choosing a control type</title>
  <desc>Use a non-nullable control for most fields, such as names and emails, which reset to their initial value. Use an explicitly nullable control for genuinely optional values where empty must be representable, such as an optional age or date. Use a FormRecord for groups whose keys are only known at runtime, such as user-defined preferences.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Non-nullable</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Names, emails, most fields.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">reset() → initial value.</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">FormControl&lt;T | null&gt;</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Optional number or date.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Empty is representable.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">FormRecord</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Keys known only at runtime.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Each control stays typed.</text>
</svg>

---

## Verification checklist

- [ ] No `Untyped*` classes remain in the form.
- [ ] `reset()` returns fields to their initial values, not `null`.
- [ ] Submit payloads use `getRawValue()` where disabled fields must be included.
- [ ] Optional numeric and date fields are explicitly nullable.
- [ ] Controls are accessed via `form.controls`, not `form.get("…")`.
- [ ] Custom validators declare the value type they accept.
- [ ] Error objects are mapped to messages in one helper, not read in templates.

---

## Frequently Asked Questions

<details>
<summary><strong>Why did the migration give me UntypedFormGroup everywhere?</strong></summary>

The automatic migration preserved existing behaviour by switching to the untyped aliases, so nothing broke at upgrade time. Replacing them with typed constructors, form by form, is the intended follow-up.

</details>

<details>
<summary><strong>Is nonNullable the same as Validators.required?</strong></summary>

No. `nonNullable` affects the *type* and what `reset()` restores; it does not make the field required. An empty string is a valid `string`. Use `Validators.required` for "must be filled in".

</details>

<details>
<summary><strong>Can I infer the form type from a Zod schema instead?</strong></summary>

You can derive a TypeScript type with `z.infer` and assert that `getRawValue()` matches it with a `satisfies` check. The two stay in sync if you also validate the raw value with the schema before submitting, which catches template–type mismatches at runtime.

</details>

---

## Related

- [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
- [Syncing Angular FormControl With a State Machine](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/syncing-angular-formcontrol-with-a-state-machine/)
- [Dynamic FormArray Controls in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/dynamic-formarray-controls-in-angular/)

← [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
