---
layout: page.njk
title: "Choosing a Schema Validation Library"
description: "Compare Zod, Yup, and Valibot for client-side form validation across type inference, bundle size, tree-shaking, and async refinement support."
slug: choosing-a-schema-validation-library
type: topic
breadcrumb: "Choosing a Schema Library"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Choosing a Schema Validation Library"
  parent: "Validation Logic"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Choosing a Schema Validation Library",
      "description": "Compare Zod, Yup, and Valibot for client-side form validation across type inference, bundle size, tree-shaking, and async refinement support.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Choosing a Schema Validation Library", "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Choose a Schema Validation Library for Client-Side Forms",
      "step": [
        { "@type": "HowToStep", "name": "Score each candidate on static type inference quality against your existing TypeScript models" },
        { "@type": "HowToStep", "name": "Measure the gzipped bundle contribution each library adds to the form route, not the marketing headline size" },
        { "@type": "HowToStep", "name": "Confirm async refinement support and AbortSignal-friendly cancellation for server-backed rules" },
        { "@type": "HowToStep", "name": "Verify a maintained resolver exists for your form library and framework adapter" },
        { "@type": "HowToStep", "name": "Estimate migration cost by counting refinements, transforms, and custom error maps that must be ported" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Valibot always the right choice because it is the smallest?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Valibot's modular API only pays off when tree-shaking is working and you import a small subset of validators. On a form route that already validates dozens of field types, or in a bundler configuration that cannot tree-shake, the gap to Zod narrows. Choose on the whole picture — inference, ecosystem, and team familiarity — not the headline core size." }
        },
        {
          "@type": "Question",
          "name": "Does Yup still make sense for a new TypeScript project?",
          "acceptedAnswer": { "@type": "Answer", "text": "Rarely for greenfield TypeScript. Yup's inference is weaker than Zod's or Valibot's — its InferType often produces optional-heavy or loosely typed shapes that require manual assertions. Yup remains reasonable for legacy codebases already invested in it, or JavaScript projects that value its mature, readable chained API over static type precision." }
        },
        {
          "@type": "Question",
          "name": "How much does the schema library actually affect form bundle size?",
          "acceptedAnswer": { "@type": "Answer", "text": "For a typical form route the schema library is a few kilobytes gzipped out of a bundle dominated by the framework and UI kit. It matters most on lightweight landing pages, embedded widgets, and marketing forms where every kilobyte affects Largest Contentful Paint. On an authenticated dashboard already shipping hundreds of kilobytes, the difference is usually noise." }
        },
        {
          "@type": "Question",
          "name": "Can I mix schema libraries within one application?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, but scope it deliberately. Standardize on one library for the shared validation layer and only reach for a second on a route with an extreme size budget. Two schema libraries in one bundle means two runtime cores and two mental models, so treat mixing as a targeted optimization rather than a default." }
        }
      ]
    }
  ]
}
</script>

# Choosing a Schema Validation Library

By the time you are choosing a schema library, the decision is rarely academic — you have a form that is slow to load, a `SchemaType` that will not line up with your API model, or an async refinement that fires a network request on every keystroke and never gets cancelled. Zod, Yup, and Valibot solve the same nominal problem, parsing untrusted input into a typed value, but they make different trade-offs on the four axes that actually bite in production: static type inference, gzipped bundle contribution, tree-shaking granularity, and async refinement ergonomics.

This page gives you a decision framework rather than a verdict. The right choice depends on whether your bottleneck is bundle size on a public marketing form, inference fidelity on a large typed model, or migration cost in a codebase already committed to one library. It sits under [validation logic and schema integration](https://www.client-side-form.com/validation-logic-schema-integration/) and feeds directly into [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) and [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/).

---

## Problem Statement

A schema library has one job at the form boundary: take a bag of `unknown` field values and either produce a typed, normalized object or a structured list of errors keyed by field path. Every candidate does that. The differences show up in four places that determine total cost of ownership:

- **Type inference.** Can you derive your form's TypeScript type from the schema (`z.infer`, `InferType`, `v.InferOutput`) and have it match your API model without hand-written interfaces? Weak inference means you maintain the type twice and they drift.
- **Bundle size and tree-shaking.** What does the library actually add to the gzipped payload of the route that imports it? A small "core" number is meaningless if pulling in `email`, `datetime`, and a couple of refinements drags in a monolithic runtime.
- **Async refinement support.** Server-backed rules — uniqueness checks, availability lookups — need an async validation path that integrates with debouncing and cancellation. A library that only supports synchronous refinement forces you to bolt async validation on outside the schema, splitting your rules across two systems.
- **Ecosystem and resolvers.** Does a maintained resolver exist for React Hook Form, Formik, VeeValidate, or your custom adapter? Reinventing the resolver is a recurring tax.

Get the weighting wrong and you optimize the axis that does not matter for your form while paying on the one that does.

---

## Decision Matrix

The matrix below scores the three libraries on the criteria that drive the choice. Treat it as a starting weighting, not a ranking — the row that matters is the one tied to your actual bottleneck.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 372" role="img" aria-label="Comparison matrix of Zod, Yup, and Valibot across five selection criteria" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>Schema Validation Library Comparison Matrix</title>
  <desc>A five-row matrix comparing Zod, Yup, and Valibot on type inference, gzipped bundle size, async refinement support, tree-shaking granularity, and resolver ecosystem.</desc>
  <rect x="10" y="20" width="700" height="336" rx="12" fill="none" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>
  <!-- Column separators -->
  <line x1="240" y1="20" x2="240" y2="356" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
  <line x1="397" y1="20" x2="397" y2="356" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
  <line x1="553" y1="20" x2="553" y2="356" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
  <!-- Header row -->
  <line x1="10" y1="66" x2="710" y2="66" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="24" y="48" font-family="inherit" font-size="12" font-weight="600" fill="currentColor">Criterion</text>
  <text x="318" y="48" text-anchor="middle" font-family="inherit" font-size="13" font-weight="700" fill="currentColor">Zod</text>
  <text x="475" y="48" text-anchor="middle" font-family="inherit" font-size="13" font-weight="700" fill="currentColor">Yup</text>
  <text x="631" y="48" text-anchor="middle" font-family="inherit" font-size="13" font-weight="700" fill="currentColor">Valibot</text>
  <!-- Row separators -->
  <line x1="10" y1="124" x2="710" y2="124" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
  <line x1="10" y1="182" x2="710" y2="182" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
  <line x1="10" y1="240" x2="710" y2="240" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
  <line x1="10" y1="298" x2="710" y2="298" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
  <!-- Row 1: Type inference -->
  <text x="24" y="99" font-family="inherit" font-size="12" fill="currentColor">Type inference</text>
  <text x="318" y="99" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Excellent</text>
  <text x="475" y="99" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Partial</text>
  <text x="631" y="99" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Excellent</text>
  <!-- Row 2: Bundle size -->
  <text x="24" y="157" font-family="inherit" font-size="12" fill="currentColor">Bundle (gzip)</text>
  <text x="318" y="157" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">~14 kB</text>
  <text x="475" y="157" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">~12 kB</text>
  <text x="631" y="157" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">~1.4 kB core</text>
  <!-- Row 3: Async refinement -->
  <text x="24" y="215" font-family="inherit" font-size="12" fill="currentColor">Async refinement</text>
  <text x="318" y="215" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">parseAsync</text>
  <text x="475" y="215" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">validate()</text>
  <text x="631" y="215" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">pipeAsync</text>
  <!-- Row 4: Tree-shaking -->
  <text x="24" y="273" font-family="inherit" font-size="12" fill="currentColor">Tree-shaking</text>
  <text x="318" y="273" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Limited</text>
  <text x="475" y="273" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Limited</text>
  <text x="631" y="273" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Full (modular)</text>
  <!-- Row 5: Ecosystem -->
  <text x="24" y="331" font-family="inherit" font-size="12" fill="currentColor">Resolver ecosystem</text>
  <text x="318" y="331" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Broad</text>
  <text x="475" y="331" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Broad</text>
  <text x="631" y="331" text-anchor="middle" font-family="inherit" font-size="12" fill="currentColor">Growing</text>
</svg>

The same data in table form, with the nuance the matrix cannot hold:

| Criterion | Zod | Yup | Valibot |
|-----------|-----|-----|---------|
| Static type inference | `z.infer` mirrors schema precisely | `InferType` is optional-heavy, needs assertions | `v.InferOutput` mirrors schema precisely |
| Gzipped contribution | ~14 kB monolithic core | ~12 kB, drags CommonJS deps historically | ~1.4 kB core plus only the validators you import |
| Tree-shaking | Coarse; most of core ships together | Coarse | Fine-grained; each validator is a separate import |
| Async refinement | `.refine`/`.superRefine` + `parseAsync` | `.test` with async, `validate()` | `pipeAsync` + `checkAsync`/`rawCheckAsync` |
| Custom error maps | First-class error map API | Message templating | Per-issue messages, i18n via wrappers |
| Resolver availability | React Hook Form, Formik, VeeValidate, etc. | Broad, long-established | React Hook Form and growing |
| Maturity | Large, stable, widely adopted | Oldest, very stable | Newest, active development |

For the raw measurement methodology behind the size and throughput numbers, see [Zod vs Yup vs Valibot: bundle size and performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/).

---

## The Same Schema in All Three

Nothing exposes ergonomic differences faster than writing one non-trivial schema in each library. The example below is a signup form: a trimmed username, an email, a password with a complexity rule, and a confirmation that must match — the cross-field case detailed in [password confirmation validation pattern](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/).

```typescript
// ----- Zod -----
import { z } from "zod";

const zodSignup = z
  .object({
    username: z.string().trim().min(3).max(32),
    email: z.string().email(),
    password: z.string().min(10).regex(/[0-9]/, "Needs a digit"),
    confirm: z.string(),
  })
  // A cross-field refinement attaches its error to a specific path so the
  // resolver can route the message to the confirm field, not the form root.
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ZodSignup = z.infer<typeof zodSignup>; // fully typed, no manual interface
```

```typescript
// ----- Yup -----
import * as yup from "yup";

const yupSignup = yup.object({
  username: yup.string().trim().min(3).max(32).required(),
  email: yup.string().email().required(),
  password: yup
    .string()
    .min(10)
    .matches(/[0-9]/, "Needs a digit")
    .required(),
  // ref() reaches sideways to another field; note the cross-field rule lives
  // on the field rather than on the object, which changes error placement.
  confirm: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required(),
});

type YupSignup = yup.InferType<typeof yupSignup>; // looser: fields infer as optional-ish
```

```typescript
// ----- Valibot -----
import * as v from "valibot";

const valibotSignup = v.pipe(
  v.object({
    username: v.pipe(v.string(), v.trim(), v.minLength(3), v.maxLength(32)),
    email: v.pipe(v.string(), v.email()),
    password: v.pipe(v.string(), v.minLength(10), v.regex(/[0-9]/, "Needs a digit")),
    confirm: v.string(),
  }),
  // forward() re-targets the object-level check onto the confirm path so the
  // message lands on the right field — the modular equivalent of Zod's path.
  v.forward(
    v.check((input) => input.password === input.confirm, "Passwords do not match"),
    ["confirm"],
  ),
);

type ValibotSignup = v.InferOutput<typeof valibotSignup>; // precise, like Zod
```

Three observations that matter more than syntax taste:

1. **Cross-field placement differs structurally.** Zod and Valibot attach the comparison at the object level and re-target the error path; Yup expresses it on the field with `ref()`. When you port between them, cross-field rules are where the error paths silently move.
2. **Inference quality is visible in the type aliases.** `ZodSignup` and `ValibotSignup` are precise. `YupSignup` tends to widen optionality, which is why Yup projects accumulate `as` assertions at the call site.
3. **Valibot's API is a pipeline of standalone functions.** That is exactly why it tree-shakes: `v.email` and `v.trim` are separate imports the bundler can drop if unused. It is also why a heavy schema imports a long list of named functions.

### Abort-aware async refinement

Server-backed rules are the real test. Below is an async refinement that checks username availability while cooperating with a caller-supplied `AbortSignal`, so a stale in-flight check never resolves onto a newer input. This is the pattern generalized in [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).

```typescript
import { z } from "zod";

// The controller lives OUTSIDE the schema, owned by the field's validation
// round. We abort the previous request before starting a new one so only the
// latest keystroke's check can ever resolve — classic last-write-wins.
let inFlight: AbortController | null = null;

async function isUsernameFree(name: string, signal: AbortSignal): Promise<boolean> {
  const res = await fetch(`/api/username-free?u=${encodeURIComponent(name)}`, { signal });
  const { available } = await res.json();
  return available;
}

const usernameSchema = z.string().min(3).superRefine(async (name, ctx) => {
  // Abort any request from a previous round; the AbortController guarantees the
  // superseded fetch rejects with AbortError instead of racing to completion.
  inFlight?.abort();
  inFlight = new AbortController();
  try {
    const free = await isUsernameFree(name, inFlight.signal);
    if (!free) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Username is taken" });
    }
  } catch (err) {
    // A cancelled round is not a validation failure — swallow AbortError so the
    // superseded check does not surface an error onto newer, valid input.
    if ((err as Error).name !== "AbortError") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Could not verify username" });
    }
  }
});

// Async refinements require the async parser; parse() throws on async rules.
await usernameSchema.parseAsync(usernameValue);
```

The equivalent in Valibot uses `pipeAsync` with `checkAsync` and `parseAsync`; in Yup it is an async `.test` resolved with `validate()`. All three can host the same abort discipline — the controller is yours, not the library's — which is exactly why async support alone rarely decides the choice.

---

## Weighting the Criteria to Your Bottleneck

The matrix rows do not carry equal weight for every form. The correct choice falls out of identifying which single row is your actual constraint, then letting the others break ties. Three recurring scenarios show how the weighting shifts:

**Public marketing or landing-page form.** The constraint is Largest Contentful Paint on a route with almost no other JavaScript, so the bundle row dominates. Here Valibot's modular design is decisive: a three-field newsletter or contact form imports a handful of validators and ships a gzipped chunk a fraction of Zod's. Inference and ecosystem barely register because the schema is tiny and there is no form library to resolve into. Choose the smallest thing that tree-shakes.

**Authenticated enterprise dashboard.** The route already ships a framework, a component kit, and a data layer; the schema library is a rounding error on the payload. The constraint is inference fidelity against a large, evolving typed model and the maintenance cost of keeping validation in sync with it. Zod's precise `z.infer` and its broad resolver ecosystem win here — the few kilobytes it costs over Valibot are invisible next to the correctness leverage of types that cannot drift from the schema. This is also where an existing [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) or [Vue Composition API adapter](https://www.client-side-form.com/framework-adapters-custom-hooks/vue-composition-api-form-adapters/) usually already assumes one library, raising the switching cost further.

**Design-system component library.** You are shipping form primitives other teams consume, so both size and inference matter, and you cannot know downstream bundlers' tree-shaking guarantees. The safe move is to keep the schema behind an interface and let consumers supply the resolver, rather than baking a library into the published package. Peer-dependency the schema library so you do not force two runtimes into a consumer's bundle.

Two secondary factors adjust every scenario. **Team familiarity** is a real cost: a library the team already reasons about fluently ships fewer validation bugs than a marginally smaller one nobody has internalized. **Async refinement ergonomics** matter only if server-backed rules are central to the form; if every rule is synchronous, the async row drops out of the decision entirely and you weight on inference and size alone.

The anti-pattern is optimizing a row that is not your constraint — shaving three kilobytes off a dashboard that ships four hundred, or accepting weaker inference on a form whose real risk is type drift. Name the bottleneck first; the library follows.

---

## Integration Guidance

Whichever library wins, it plugs into the same three seams:

- **Resolver into your form library.** The schema becomes a resolver that returns a `{ values, errors }` shape keyed by field path. If you are hand-rolling the adapter, see how the validation seam is structured in the parent [validation logic and schema integration](https://www.client-side-form.com/validation-logic-schema-integration/) overview, and how Zod specifically wires in at [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/).
- **Async pipeline with cancellation and debounce.** Server-backed refinements belong on the debounced, abortable path documented in [asynchronous validation strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/), never in the synchronous keystroke path.
- **Cross-field dependency ordering.** Rules that compare fields need a defined evaluation order; that ordering, and its revalidation triggers, is covered under [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/).

Keep the schema behind a thin interface — one function that takes raw values and returns typed output or path-keyed errors. Then a library swap touches one module, not every form.

---

## Migration Cost

Switching libraries is cheap for simple schemas and expensive exactly where you have invested. Budget for these:

- **Refinements and custom tests.** Every `.refine`, `.superRefine`, `.test`, or `check` is hand-written logic that must be re-expressed. Count them; that number is your real migration size.
- **Transforms and coercion.** `z.coerce`, Yup's casting, and Valibot's `transform` behave differently on empty strings, `null`, and numeric coercion. Transforms are where migrated forms change behavior silently.
- **Cross-field error paths.** As shown above, the field that receives a cross-field error can move between libraries. Re-verify every multi-field rule against the UI.
- **Error message and i18n wiring.** Custom error maps, message templates, and localization hooks are library-specific and rarely port mechanically.

A practical order: port the object shape first (fast, mostly mechanical), then refinements, then transforms, then error mapping — and keep the old schema running behind a feature flag until the new one produces byte-identical error output on a corpus of real submissions.

---

## Troubleshooting Reference

| Failure scenario | Diagnostic step | Recovery action |
|-----------------|-----------------|-----------------|
| Inferred form type does not match API model | Log `z.infer` / `InferType` / `v.InferOutput` against the model type | Switch fields to explicit schemas; in Yup, add `.defined()`/`.required()` to tighten optionality |
| Bundle grew after adding validation | Inspect the bundle analyzer for the schema chunk | For Valibot, import individual validators; for Zod, ensure the schema module is code-split with the form route |
| Async rule fires on every keystroke | Trace where `parseAsync`/`validate()` is called | Move async refinement off the synchronous path onto the debounced, abortable validator |
| Cross-field error appears on the wrong field | Check the rule's `path`/`forward`/`ref` target | Re-target the error path to the dependent field explicitly |
| `parse()` throws "async refinement" error | Look for async `.refine`/`.test`/`checkAsync` in the schema | Call the async parser (`parseAsync` / `validate`) for schemas containing async rules |

---

## Testing and QA Hooks

Make the library choice testable, not a matter of opinion:

```typescript
// A tiny contract test the resolver must satisfy regardless of the underlying
// library — lets you swap Zod/Yup/Valibot and prove behavior is unchanged.
export interface ValidationResult<T> {
  values: T | null;
  errors: Record<string, string>; // field path -> first message
}

// Expose the outcome to E2E selectors so Playwright can assert on real DOM,
// not on internal library state.
function reflectErrors(form: HTMLFormElement, result: ValidationResult<unknown>): void {
  form.dataset.valid = String(result.values !== null);
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLElement && (el as HTMLInputElement).name) {
      const name = (el as HTMLInputElement).name;
      const msg = result.errors[name];
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) el.dataset.error = msg;
      else delete el.dataset.error;
    }
  }
}
```

```typescript
// Playwright: same assertions pass for any conforming resolver.
await page.fill('[name="confirm"]', 'different');
await page.click('[data-testid="submit"]');
await expect(page.locator('[name="confirm"]')).toHaveAttribute('data-error', 'Passwords do not match');
await expect(page.locator('form')).toHaveAttribute('data-valid', 'false');
```

Run the same contract fixtures through each candidate resolver in CI. If all three pass, the choice is genuinely about size and inference — not correctness — and you can decide on the numbers.

---

## Common Pitfalls

**Choosing on the headline core size.** Valibot's ~1.4 kB core is real, but the delivered size is core plus every validator you import. Measure the actual gzipped chunk for your schema, as covered in the [bundle size and performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/) breakdown, before treating size as the deciding factor.

**Ignoring inference until the types drift.** Yup's looser inference does not hurt on day one; it hurts three months in when the form type and API type have quietly diverged and you are patching with `as` casts. Score inference against your real model up front.

**Putting async refinement on the synchronous parse path.** Calling `parseAsync` on every keystroke turns every character into a network request. Async rules belong on the debounced, abortable path — the schema library choice does not change that.

**Assuming resolvers are interchangeable.** A resolver's error-path shape can differ subtly between libraries. Keep the schema behind a single interface so the form layer never depends on library-specific error structures.

**Migrating everything at once.** A big-bang swap hides behavioral changes in transforms and cross-field paths. Port behind a flag and diff error output against real submissions.

---

## Frequently Asked Questions

<details>
<summary><strong>Is Valibot always the right choice because it is the smallest?</strong></summary>

No. Valibot's modular API only pays off when tree-shaking is working and you import a small subset of validators. On a form route that already validates dozens of field types, or in a bundler configuration that cannot tree-shake, the gap to Zod narrows. Choose on the whole picture — inference, ecosystem, and team familiarity — not the headline core size.

</details>

<details>
<summary><strong>Does Yup still make sense for a new TypeScript project?</strong></summary>

Rarely for greenfield TypeScript. Yup's inference is weaker than Zod's or Valibot's — its `InferType` often produces optional-heavy or loosely typed shapes that require manual assertions. Yup remains reasonable for legacy codebases already invested in it, or JavaScript projects that value its mature, readable chained API over static type precision.

</details>

<details>
<summary><strong>How much does the schema library actually affect form bundle size?</strong></summary>

For a typical form route the schema library is a few kilobytes gzipped out of a bundle dominated by the framework and UI kit. It matters most on lightweight landing pages, embedded widgets, and marketing forms where every kilobyte affects Largest Contentful Paint. On an authenticated dashboard already shipping hundreds of kilobytes, the difference is usually noise.

</details>

<details>
<summary><strong>Can I mix schema libraries within one application?</strong></summary>

Yes, but scope it deliberately. Standardize on one library for the shared validation layer and only reach for a second on a route with an extreme size budget. Two schema libraries in one bundle means two runtime cores and two mental models, so treat mixing as a targeted optimization rather than a default.

</details>

---

## Related

- [Zod vs Yup vs Valibot: Bundle Size and Performance](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/)
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Asynchronous Validation Strategies](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/)
- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)
