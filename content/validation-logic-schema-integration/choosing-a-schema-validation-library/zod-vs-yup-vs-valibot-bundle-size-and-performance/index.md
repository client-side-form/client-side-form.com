---
layout: page.njk
title: "Zod vs Yup vs Valibot: Bundle Size and Performance"
description: "Measure the gzipped bundle contribution and parse throughput of Zod, Yup, and Valibot, and where Valibot's modular tree-shaking actually wins."
slug: zod-vs-yup-vs-valibot-bundle-size-and-performance
type: guide
breadcrumb: "Zod vs Yup vs Valibot"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Zod vs Yup vs Valibot: Bundle Size and Performance"
  parent: "Choosing a Schema Validation Library"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Zod vs Yup vs Valibot: Bundle Size and Performance",
      "description": "Measure the gzipped bundle contribution and parse throughput of Zod, Yup, and Valibot, and where Valibot's modular tree-shaking actually wins.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Choosing a Schema Validation Library", "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/" },
        { "@type": "ListItem", "position": 4, "name": "Zod vs Yup vs Valibot: Bundle Size and Performance", "item": "https://client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/zod-vs-yup-vs-valibot-bundle-size-and-performance/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Measure Schema Library Bundle Size and Throughput",
      "step": [
        { "@type": "HowToStep", "name": "Build the exact schema module your form imports and read its gzipped size from the bundler stats, not the package headline" },
        { "@type": "HowToStep", "name": "Isolate the schema chunk with a bundle analyzer so shared runtime is not double-counted" },
        { "@type": "HowToStep", "name": "Benchmark parse throughput with a warmed loop over representative valid and invalid inputs" },
        { "@type": "HowToStep", "name": "Compare against the route's total gzipped payload to decide whether the delta is material" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Valibot's core size the size I actually ship?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. The advertised core is the base; your delivered size is the core plus every validator function you import — string, email, minLength, and so on. A rich schema imports a long list of these, narrowing the gap to Zod. Measure the real gzipped chunk for your schema before treating Valibot's core number as your budget." }
        },
        {
          "@type": "Question",
          "name": "Does faster parse throughput matter for form validation?",
          "acceptedAnswer": { "@type": "Answer", "text": "Almost never on the keystroke path. A single field parse is microseconds; human typing cadence and debouncing dominate. Throughput only becomes relevant when you validate large arrays or bulk-import hundreds of rows at once, where per-item parse cost multiplies into visible main-thread time." }
        },
        {
          "@type": "Question",
          "name": "How do I measure just the schema library's contribution?",
          "acceptedAnswer": { "@type": "Answer", "text": "Use a bundle analyzer that reports per-module gzipped size and read the schema library's chunk directly, or diff the route's total gzipped output with and without the import. Never trust the package's published size — tree-shaking, shared dependencies, and your specific imports change the delivered number substantially." }
        }
      ]
    }
  ]
}
</script>

# Zod vs Yup vs Valibot: Bundle Size and Performance

You need a defensible number for how many gzipped kilobytes and how much parse time each schema library adds to a specific form route — not a headline from a package page. This is the measurement companion to [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/): that overview weighs inference, ecosystem, and migration cost; this page is only about size and speed, and how to measure both so the decision is grounded in your bundle rather than someone else's benchmark.

---

## Context and Prerequisites

The trap in every "X is smaller than Y" claim is that the number describes the package, not what you ship. Your delivered cost is a function of three things the headline ignores: which validators you import, whether your bundler tree-shakes them, and how much of the runtime is shared with code you already ship. Before trusting any figure, read it as *the gzipped size of the exact module my form route imports, after tree-shaking, measured by my bundler* — anything else is marketing. The parent [choosing a schema validation library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/) page frames where this fits in the overall decision.

---

## Measuring Gzipped Contribution

The only number that matters is the incremental gzipped bytes the library adds to the route that imports it. Measure it by isolating a schema-only module and reading its chunk from the bundler, then confirming with a with/without diff.

```typescript
// schema-probe.ts — a module that imports ONLY what a real form uses.
// Build this in isolation so the bundle analyzer attributes every byte to the
// schema library and nothing leaks in from app code.
import { z } from "zod";

export const signup = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(10).regex(/[0-9]/),
  confirm: z.string(),
});
// Reference the export so tree-shaking cannot drop the whole module.
export const parse = (v: unknown) => signup.safeParse(v);
```

```typescript
// valibot-probe.ts — the same schema, importing only the validators used.
// This is where Valibot's advantage shows: unused validators never enter the
// graph, so the bundler drops everything you did not name.
import { object, string, pipe, trim, minLength, maxLength, email, regex, safeParse } from "valibot";

export const signup = object({
  username: pipe(string(), trim(), minLength(3), maxLength(32)),
  email: pipe(string(), email()),
  password: pipe(string(), minLength(10), regex(/[0-9]/)),
  confirm: string(),
});
export const parse = (v: unknown) => safeParse(signup, v);
```

Then read the real numbers rather than guessing:

```bash
# Build each probe as its own entry and inspect gzipped output.
# Rollup/Vite: emit stats, then read the gzip column for the schema chunk.
npx vite build --mode production
npx source-map-explorer dist/assets/*.js --gzip

# Or diff the route's total gzip with and without the schema import:
#   1. build with the import, record dist gzip size
#   2. stub the schema to a no-op, rebuild, record again
#   3. the delta is the library's true contribution for THIS schema
```

The headline core sizes — roughly ~14 kB gzipped for Zod, ~12 kB for Yup, and ~1.4 kB for Valibot's core — are starting points. For the four-field signup schema above, Valibot's delivered chunk is a fraction of Zod's because only nine validators enter the graph. Add fifty field types with datetime, union, discriminated union, and a dozen refinements, and Valibot's chunk grows toward Zod's while Zod's stays roughly flat, because Zod ships most of its core together regardless of how much you use.

---

## Measuring Parse Throughput

Throughput is measured with a warmed loop over representative inputs, reported as validations per millisecond. Cold numbers are meaningless — the JIT has not optimized the parse path yet.

```typescript
// bench.ts — warm the parser, then time a tight loop.
function bench(label: string, run: () => void, iterations = 100_000): void {
  // Warm-up: let the JIT specialize the parse path before we measure it.
  for (let i = 0; i < 5_000; i++) run();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) run();
  const ms = performance.now() - start;

  // Report throughput; per-parse cost is ms/iterations, usually sub-microsecond.
  console.log(`${label}: ${(iterations / ms).toFixed(0)} parses/ms (${(ms / iterations * 1000).toFixed(2)} µs each)`);
}

const validInput = { username: "ada", email: "ada@x.io", password: "hunter2000", confirm: "hunter2000" };
const invalidInput = { username: "a", email: "nope", password: "short", confirm: "x" };

// Measure BOTH paths — invalid input exercises error construction, which is
// often the slower, more variable branch across libraries.
bench("zod valid", () => zodSignup.safeParse(validInput));
bench("zod invalid", () => zodSignup.safeParse(invalidInput));
```

For a single form field, all three libraries parse in well under a microsecond after warm-up. The difference is real but irrelevant at human typing speed and behind a debounce — see [debouncing validation triggers in React](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/) for why the keystroke path is throttled anyway. Throughput only becomes a budget line when you validate large arrays: a bulk import validating 5,000 rows on submit multiplies per-item cost into tens of milliseconds of main-thread blocking, and that is the one place the fastest parser earns its keep.

---

## Step-by-Step Walkthrough

1. **Write a probe module** importing exactly the validators your real form uses, with a referenced export so tree-shaking keeps it.
2. **Build in production mode** and run a gzip-aware analyzer (`source-map-explorer --gzip`, `rollup-plugin-visualizer`, or `vite-bundle-visualizer`).
3. **Record the schema chunk's gzipped size** for each candidate, or diff the route total with and without the import.
4. **Benchmark throughput** with a warmed loop over both valid and invalid inputs, reporting parses per millisecond.
5. **Divide the size delta by the route total.** If the schema library is under ~2% of the route's gzipped payload, size is not your deciding factor and you should choose on inference and ecosystem instead.

---

## When the Difference Actually Matters

The measured delta only becomes a decision input in specific conditions. Ranked by how often they actually justify choosing on size:

1. **Public routes with a tiny JavaScript budget.** A marketing form, a newsletter signup, or an embedded widget on a content site may ship only a few kilobytes of script total. There, a 10 kB gzipped difference between a monolithic core and a modular one is a large fraction of the payload and directly moves first-paint metrics. This is the one scenario where size routinely wins the decision.
2. **Widely embedded components.** A schema baked into a component that renders on thousands of pages multiplies its cost across every one of them. Even a small per-instance difference compounds at the fleet level, and you often cannot rely on the consumer's bundler to tree-shake well.
3. **Bulk validation on the main thread.** Validating a pasted spreadsheet or an imported CSV runs the parser thousands of times synchronously. Here throughput, not size, is the constraint, and the difference shows up as visible jank. Consider chunking the work or moving it off the main thread rather than only picking the fastest parser.

And the conditions where the difference is noise:

- **Authenticated app routes** already shipping a framework and UI kit measured in hundreds of kilobytes. A few kilobytes of schema is well under the threshold of perception, and choosing on inference or ecosystem yields more value.
- **Lazily loaded form routes** where the schema is not on the initial bundle at all. Optimizing bytes the user downloads only after navigating to the form rarely helps the metrics that matter.
- **Single-field keystroke validation** where throughput is irrelevant behind a debounce.

The discipline is to divide the measured size delta by the route's total gzipped payload and the measured throughput delta by the number of parses per interaction. If neither ratio is material, size and speed are not your deciding factors, and you should defer to the broader [selection framework](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/).

---

## Failure Modes and Edge Cases

**Trusting the published package size.** The npm/bundlephobia number includes code paths your form never imports and ignores your tree-shaking. Always measure your own probe.

```typescript
// WRONG: reasoning from "Valibot core is 1.4 kB" as your shipped budget.
// RIGHT: measure the delivered chunk for the validators you actually import.
import { object, string, email, minLength, pipe /* ...only what you use */ } from "valibot";
```

**Benchmarking cold.** A first-iteration timing measures deopt and allocation, not steady-state parse cost. Always warm the loop for a few thousand iterations before timing.

**Double-counting shared runtime.** If two libraries share a dependency already in your bundle, a naive per-package number over-attributes size. The with/without diff on the whole route avoids this because it measures net bytes added.

**Measuring only the valid path.** Error construction is frequently the slower branch. Benchmark invalid input too, since real forms hit the error path constantly during typing.

**Ignoring code-splitting.** If the schema loads with a lazily imported form route, its bytes are not on your initial payload at all. Confirm which chunk the schema lands in before optimizing it — you may be optimizing bytes the user never downloads on first paint.

---

## Verification Checklist

- [ ] Schema probe imports only the validators the real form uses
- [ ] Gzipped chunk size read from a bundle analyzer, not a package page
- [ ] Size confirmed with a with/without route diff
- [ ] Throughput benchmarked after a warm-up loop
- [ ] Both valid and invalid inputs measured
- [ ] Size delta expressed as a percentage of the route's total gzipped payload
- [ ] Confirmed whether the schema ships on the initial chunk or a lazy one
- [ ] Decision recorded against the full selection framework, not bundle size alone

---

## Frequently Asked Questions

<details>
<summary><strong>Is Valibot's core size the size I actually ship?</strong></summary>

No. The advertised core is the base; your delivered size is the core plus every validator function you import — `string`, `email`, `minLength`, and so on. A rich schema imports a long list of these, narrowing the gap to Zod. Measure the real gzipped chunk for your schema before treating Valibot's core number as your budget.

</details>

<details>
<summary><strong>Does faster parse throughput matter for form validation?</strong></summary>

Almost never on the keystroke path. A single field parse is microseconds; human typing cadence and debouncing dominate. Throughput only becomes relevant when you validate large arrays or bulk-import hundreds of rows at once, where per-item parse cost multiplies into visible main-thread time.

</details>

<details>
<summary><strong>How do I measure just the schema library's contribution?</strong></summary>

Use a bundle analyzer that reports per-module gzipped size and read the schema library's chunk directly, or diff the route's total gzipped output with and without the import. Never trust the package's published size — tree-shaking, shared dependencies, and your specific imports change the delivered number substantially.

</details>

---

## Related

- [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
- [Integrating Zod for Schema Validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [Debouncing Validation Triggers in React](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/)

← [Choosing a Schema Validation Library](https://www.client-side-form.com/validation-logic-schema-integration/choosing-a-schema-validation-library/)
