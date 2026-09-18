---
layout: page.njk
title: "Wiring React Hook Form to a Zod Resolver"
description: "Connect React Hook Form to a Zod schema with @hookform/resolvers: typing the form from the schema's input and output, coercing strings, mapping refinement errors to the right field, async refinements, and validation modes that do not fight the resolver."
slug: wiring-react-hook-form-to-a-zod-resolver
type: howto
breadcrumb: "RHF + Zod Resolver"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Wiring React Hook Form to a Zod Resolver"
  parent: "React Form Hook Architecture"
  order: 7
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Wiring React Hook Form to a Zod Resolver",
      "description": "Connect React Hook Form to a Zod schema with @hookform/resolvers: typing the form from the schema's input and output, coercing strings, mapping refinement errors to the right field, async refinements, and validation modes that do not fight the resolver.",
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
          "name": "React Form Hook Architecture",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Wiring React Hook Form to a Zod Resolver",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/wiring-react-hook-form-to-a-zod-resolver/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Connect React Hook Form to a Zod schema",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Write the schema for DOM input"
        },
        {
          "@type": "HowToStep",
          "name": "Type the form with three generics"
        },
        {
          "@type": "HowToStep",
          "name": "Give every refinement a path"
        },
        {
          "@type": "HowToStep",
          "name": "Re-run dependent fields"
        },
        {
          "@type": "HowToStep",
          "name": "Choose modes that match your timing policy"
        },
        {
          "@type": "HowToStep",
          "name": "Keep async refinements cheap and cancellable"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does zodResolver validate the whole form on every change?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes — a resolver validates the entire schema and React Hook Form then updates errors for the relevant fields. For typical forms this is fast. For very large schemas, prefer submit-time resolver validation and cheap field-level validate functions for instant feedback."
          }
        },
        {
          "@type": "Question",
          "name": "Should defaultValues match the input or output type?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The input type: they populate the DOM. With the three-generic useForm, TypeScript enforces that. A numeric field's default is usually \"\" in the input type, which the schema turns into a number or undefined on parse."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use Valibot or another library the same way?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. @hookform/resolvers provides resolvers for Valibot, Yup, ArkType and others, plus a Standard Schema resolver that accepts any compliant library. The input/output typing and path discipline on this page apply to all of them."
          }
        }
      ]
    }
  ]
}
</script>

# Wiring React Hook Form to a Zod Resolver

Pairing React Hook Form with Zod through `zodResolver` takes three lines, and then the problems start: number fields fail with "Expected number, received string", a password-confirmation error never appears because it has no path, and TypeScript insists the submitted data is the raw strings rather than the parsed values.

Each problem comes from the boundary between the two libraries: React Hook Form collects *input* values from the DOM, Zod turns them into *output* values, and the resolver converts Zod issues into React Hook Form's error object. This page wires that boundary deliberately. It complements the library-agnostic [Zod schema integration](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) and the architecture in [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/).

---

## Context and prerequisites

What the resolver does, in order:

1. React Hook Form gathers the current values (strings from text inputs, booleans from checkboxes, `FileList` from file inputs).
2. `zodResolver(schema)` calls `schema.safeParseAsync(values)` (or the sync variant with `{ mode: "sync" }`).
3. On success, the **parsed output** is passed to your `handleSubmit` callback — transformed, coerced, trimmed.
4. On failure, each Zod issue's `path` becomes a key in `formState.errors` (`["address", "city"]` → `errors.address.city`), with the issue's message.

So the schema must accept what the DOM produces, the form's TypeScript types must distinguish input from output, and every refinement must put its issue on a path that a rendered field reads.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of values from the inputs through React Hook Form&#x27;s collection, the zodResolver&#x27;s parse, and either the typed submit handler or the errors object keyed by issue path." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>From DOM strings to typed submit data</title>
  <desc>Inputs hold strings, booleans and file lists. React Hook Form collects them into the input values object. The zodResolver runs the schema&#x27;s parse, coercing and transforming as the schema declares. On success the output values, with numbers as numbers and trimmed strings, reach handleSubmit. On failure each issue&#x27;s path becomes a key in formState.errors, and only issues whose path matches a registered field name are displayed next to that field.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="381.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">DOM inputs</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">strings, booleans, FileList</text>
  <text x="425.8" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Whatever the elements produce.</text>
  <path d="M204.9,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.9,89.0 204.9,96.0 208.9,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="381.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">RHF input values</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">z.input&lt;typeof Schema&gt;</text>
  <text x="425.8" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Typed as what the form holds, not what you submit.</text>
  <path d="M204.9,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.9,174.0 204.9,181.0 208.9,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="381.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">zodResolver parse</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">coerce, trim, transform, refine</text>
  <text x="425.8" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Async parse by default; sync if the schema is sync.</text>
  <path d="M204.9,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.9,259.0 204.9,266.0 208.9,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="381.8" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">handleSubmit(output) or errors</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">z.output&lt;typeof Schema&gt; | errors[path]</text>
  <text x="425.8" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Issues whose path matches no field are invisible.</text>
</svg>

---

## The core pattern: typed input and output, coercion, pathed refinements

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Signup = z.object({
  email: z.string().trim().toLowerCase().email("Enter an email like name@example.com."),
  // DOM gives strings: coerce explicitly, and treat "" as missing rather than 0.
  age: z.preprocess((v) => (v === "" ? undefined : v),
    z.coerce.number({ invalid_type_error: "Enter your age as a number." }).int().min(16, "You must be 16 or over.")),
  password: z.string().min(12, "Use at least 12 characters."),
  confirmPassword: z.string(),
}).superRefine((v, ctx) => {
  if (v.password !== v.confirmPassword) {
    // Put the issue on the field the user must change, or it will never render.
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match." });
  }
});

type SignupInput = z.input<typeof Signup>;    // what the form holds
type SignupOutput = z.output<typeof Signup>;  // what handleSubmit receives

export function SignupForm({ onValid }: { onValid: (data: SignupOutput) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<SignupInput, unknown, SignupOutput>({
      resolver: zodResolver(Signup),
      mode: "onTouched",          // first error after blur…
      reValidateMode: "onChange", // …then clear as soon as it is fixed
      defaultValues: { email: "", age: "" as unknown as number, password: "", confirmPassword: "" },
    });

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" {...register("email")}
        aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "email-error" : undefined} />
      {errors.email && <p id="email-error">{errors.email.message}</p>}

      <label htmlFor="age">Age</label>
      <input id="age" inputMode="numeric" {...register("age")} aria-invalid={errors.age ? true : undefined} />
      {errors.age && <p id="age-error">{errors.age.message}</p>}

      <label htmlFor="password">Password</label>
      <input id="password" type="password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}

      <label htmlFor="confirmPassword">Confirm password</label>
      <input id="confirmPassword" type="password" {...register("confirmPassword", { deps: ["password"] })} />
      {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}

      <button type="submit" aria-disabled={isSubmitting}>Create account</button>
    </form>
  );
}
```

---

## Step-by-step walkthrough

1. **Write the schema for DOM input.** Text inputs produce strings; coerce numbers and dates explicitly, and convert `""` to `undefined` so an empty optional field is not parsed as `0` — detailed in [coercing form strings with Zod preprocess and coerce](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/coercing-form-strings-with-zod-preprocess/).
2. **Type the form with three generics.** `useForm<Input, Context, Output>` makes `register` and `defaultValues` use input types and `handleSubmit` receive parsed output. Without it, TypeScript either complains about string defaults or lies about submitted types.
3. **Give every refinement a path.** Object-level `superRefine` issues default to the root path (`""`), which React Hook Form stores as `errors.root`-ish keys no field reads. Set `path` to the field the user should change.
4. **Re-run dependent fields.** `register("confirmPassword", { deps: ["password"] })` revalidates confirmation when the password changes, so a fixed mismatch clears — the cross-field pattern from [password confirmation validation](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/).
5. **Choose modes that match your timing policy.** `mode: "onTouched"` with `reValidateMode: "onChange"` is reward-early, punish-late; avoid `mode: "onChange"` with async refinements, which would call the server per keystroke.
6. **Keep async refinements cheap and cancellable.** Zod has no cancellation; a slow uniqueness check inside the schema runs on every validation. Prefer a separate debounced field-level check, as in [async refinements for remote checks with Zod](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/async-refinements-for-remote-checks-with-zod/).

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common zodResolver problems, their visible symptom, and the fix." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Resolver pitfalls and their fixes</title>
  <desc>A number field fails with expected number, received string because the DOM produces strings; coerce in the schema. An optional number becomes zero when empty; preprocess empty strings to undefined. A superRefine error never shows because it has no path; add a path to the field. handleSubmit data is typed as strings; use the three useForm generics. An async refinement fires a request per keystroke; use onTouched mode or move the check out of the schema.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Symptom</text>
  <text x="251.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cause</text>
  <text x="448.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Fix</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;Expected number, received string&quot;</text>
  <text x="251.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">DOM yields strings</text>
  <text x="448.6" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">z.coerce.number()</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">empty optional becomes 0</text>
  <text x="251.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Number(&quot;&quot;) is 0</text>
  <text x="448.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">preprocess &quot;&quot; → undefined</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">cross-field error never shows</text>
  <text x="251.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">issue has no path</text>
  <text x="448.6" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">ctx.addIssue({ path: [field] })</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">submit data typed as strings</text>
  <text x="251.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">one generic only</text>
  <text x="448.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">useForm&lt;In, Ctx, Out&gt;</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">request per keystroke</text>
  <text x="251.4" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">async refine + onChange mode</text>
  <text x="448.6" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">onTouched, or check outside schema</text>
</svg>

### Reusing the schema beyond the resolver

The same schema that drives the resolver can do more work. Export its inferred output type and use it for the API client, so the request body is type-checked against what the form produces. Import it in the server route or server action and parse the request body again, so a client that bypasses the form still meets the same rules. And derive defaults and field metadata from it where helpful — whether a field is optional, its maximum length — so labels ("optional") and `maxLength` attributes cannot drift from validation. The resolver is one consumer of the schema, not its owner.

---

## Failure modes and edge cases

### 1. `valueAsNumber` plus coercion

`register("age", { valueAsNumber: true })` makes React Hook Form pass `NaN` for empty input. Combined with `z.coerce.number()`, `NaN` fails with a type message instead of "required". Use one mechanism — schema coercion is easier to reason about.

### 2. Checkbox groups and `FileList`

Several checkboxes registered under one name yield an array of values, or `false` when none are checked; file inputs yield a `FileList`, not an array. Model both in the schema (`z.array(z.string())` with a preprocess for `false`; `z.instanceof(FileList)` then `.transform((l) => Array.from(l))`).

### 3. Errors for array items

Issues inside arrays have numeric path segments (`["items", 2, "price"]`), which React Hook Form maps to `errors.items[2].price`. With `useFieldArray`, render using `field.id` as the key and read errors by index at render time — they move with the library's own `move`/`remove` operations.

### 4. Server errors after a successful parse

The resolver only covers client validation. Map server 422s onto fields with `setError("email", { type: "server", message })`, and clear them when the field changes, as in [clearing server errors when a field changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/).

### 5. Focus on submit errors

`shouldFocusError: true` (the default) focuses the first field with an error, in registration order. That is often right; if you render an error summary, set it to `false` and focus the summary yourself.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards pairing React Hook Form validation modes with schema characteristics." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which mode pairs with which schema</title>
  <desc>For purely synchronous schemas, onTouched with reValidateMode onChange gives reward-early, punish-late feedback at negligible cost. For schemas with an async refinement, use onTouched or onSubmit so the remote check does not run per keystroke. For very large schemas where full parsing is expensive, use onSubmit plus field-level checks for instant feedback.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Sync schema</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">mode: onTouched</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">reValidateMode: onChange</text>
  <rect x="236.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Async refinement</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">mode: onTouched or onSubmit</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never onChange.</text>
  <rect x="458.0" y="12.0" width="208.0" height="71.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Very large schema</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">mode: onSubmit</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Field-level checks for instant feedback.</text>
</svg>

---

## Verification checklist

- [ ] Number and date fields parse from strings without type errors.
- [ ] Empty optional numeric fields submit as `undefined`, not `0`.
- [ ] `handleSubmit` receives parsed output types (numbers, trimmed strings).
- [ ] Every refinement error appears next to a field.
- [ ] Changing the password revalidates the confirmation field.
- [ ] No network request fires per keystroke from async refinements.
- [ ] Server errors set with `setError` clear when their field changes.
- [ ] Errors are linked to inputs with `aria-describedby` and toggle `aria-invalid`.

---

## Frequently Asked Questions

<details>
<summary><strong>Does zodResolver validate the whole form on every change?</strong></summary>

Yes — a resolver validates the entire schema and React Hook Form then updates errors for the relevant fields. For typical forms this is fast. For very large schemas, prefer submit-time resolver validation and cheap field-level `validate` functions for instant feedback.

</details>

<details>
<summary><strong>Should defaultValues match the input or output type?</strong></summary>

The input type: they populate the DOM. With the three-generic `useForm`, TypeScript enforces that. A numeric field's default is usually `""` in the input type, which the schema turns into a number or `undefined` on parse.

</details>

<details>
<summary><strong>Can I use Valibot or another library the same way?</strong></summary>

Yes. `@hookform/resolvers` provides resolvers for Valibot, Yup, ArkType and others, plus a Standard Schema resolver that accepts any compliant library. The input/output typing and path discipline on this page apply to all of them.

</details>

---

## Related

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Standard Schema for Library-Agnostic Forms](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/standard-schema-for-library-agnostic-forms/)

← [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
