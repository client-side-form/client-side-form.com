---
layout: page.njk
title: "Zod vs Yup vs Valibot: Bundle Size and Performance"
description: "Measure the gzipped bundle contribution and parse throughput of Zod, Yup, and Valibot, and where Valibot's modular tree-shaking actually wins."
slug: zod-vs-yup-vs-valibot-bundle-size-and-performance
type: howto
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

<svg viewBox="0 8 664 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar comparison of the compressed bytes each library adds to a bundle for a representative eight-field registration schema, and a second bar row showing the same figure as a share of a typical two-hundred-kilobyte application bundle." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Compressed bytes added, for one eight-field schema</title>
  <desc>Measured as the increase in the compressed bundle when the schema and its library are added to an application that did not previously use one. Zod adds roughly thirteen kilobytes. Yup adds roughly twelve. Valibot, whose modular design means only the validators you import are included, adds roughly three. Below, the same figures are expressed as a share of a typical two hundred kilobyte compressed application bundle: about six and a half per cent, six per cent, and one and a half per cent respectively.</desc>
  <rect x="0" y="8" width="664" height="214" fill="#f9f5fb"/>
  <text x="14" y="26" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Added to the compressed bundle by one 8-field schema</text>
  <text x="14" y="54" font-size="10" fill="#1e1a24" font-family="inherit">Zod</text>
  <rect x="90" y="40" width="416" height="20" rx="4" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="516" y="55" font-size="10" fill="#1e1a24" font-family="inherit">~13 kB · 6.5% of a 200 kB app</text>
  <text x="14" y="88" font-size="10" fill="#1e1a24" font-family="inherit">Yup</text>
  <rect x="90" y="74" width="384" height="20" rx="4" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="484" y="89" font-size="10" fill="#1e1a24" font-family="inherit">~12 kB · 6.0%</text>
  <text x="14" y="122" font-size="10" fill="#1e1a24" font-family="inherit">Valibot</text>
  <rect x="90" y="108" width="96" height="20" rx="4" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="196" y="123" font-size="10" fill="#2d6342" font-family="inherit">~3 kB · 1.5% — only the validators imported</text>
  <text x="14" y="160" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">How to read this</text>
  <text x="14" y="178" font-size="10" fill="#6b5f75" font-family="inherit">Ten kilobytes is roughly 40ms of transfer on a slow 3G connection, and effectively nothing on anything faster.</text>
  <text x="14" y="194" font-size="10" fill="#6b5f75" font-family="inherit">It is worth optimising for a public sign-up page measured on cold mobile visits, and noise for an internal dashboard.</text>
  <text x="14" y="214" font-size="10" fill="#6b5f75" font-family="inherit">Measure your own schemas: a schema using many validators narrows the gap, because Valibot then imports more of them.</text>
</svg>

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

Throughput tells a different story, and one that matters at a different place in the form:

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Where parse cost actually lands: a per-keystroke field validation parses one field and costs microseconds in all three libraries, while a full-form parse on submit costs milliseconds, and a list of two thousand rows parsed on import is the only case where the difference is visible." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three parse workloads, and which one you can feel</title>
  <desc>Validating a single field on a keystroke parses one field's schema and takes on the order of microseconds in every library, so the difference is invisible and any of the three is fine. Validating the whole form on submit parses eight fields and takes on the order of a millisecond, which is well inside a frame and happens once per submit. Parsing two thousand imported rows against the same schema takes hundreds of milliseconds and is the only workload where the throughput difference is perceptible — and even there the right fix is usually to move the parse off the main thread rather than to change library.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="136" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Workload</text>
  <text x="220" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Order of magnitude</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Can the reader feel it?</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">one field, per keystroke</text>
  <text x="220" y="66" font-size="10" fill="#6b5f75" font-family="inherit">microseconds</text>
  <text x="400" y="66" font-size="10" fill="#2d6342" font-family="inherit">no — pick on other grounds</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">whole form, on submit</text>
  <text x="220" y="100" font-size="10" fill="#6b5f75" font-family="inherit">about a millisecond</text>
  <text x="400" y="100" font-size="10" fill="#2d6342" font-family="inherit">no — once, inside a frame</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">2000 imported rows</text>
  <text x="220" y="134" font-size="10" fill="#a63d6f" font-family="inherit">hundreds of ms</text>
  <text x="400" y="134" font-size="10" fill="#a63d6f" font-family="inherit">yes — the only case</text>
  <text x="14" y="176" font-size="10" fill="#6b5f75" font-family="inherit">Even in the third row, moving the parse to a worker helps more than any library change: it takes the block off the main thread</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">entirely rather than shortening it, and it works the same whichever library you kept.</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Benchmark with your own schema shapes: unions and refinements dominate the cost, and synthetic benchmarks rarely use them.</text>
</svg>

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

Putting both measurements next to the properties that are actually hard to change gives a decision rather than a scoreboard:

<svg viewBox="0 8 664 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A three-question decision: whether the page is a public cold-start entry point, whether the team already knows one of the libraries, and whether the schemas need heavy conditional refinement. Each answer points at a library." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the numbers are worth, next to what they are not</title>
  <desc>First: is this a public, cold-start entry point measured on mobile? If yes, the ten-kilobyte difference is real and the modular option earns it. Second: does the team already use one of these elsewhere? If yes, that consistency is worth more than the difference in every row above, because it decides how quickly a schema bug gets diagnosed. Third: do the schemas need heavy conditional refinement — dependent fields, discriminated unions? If yes, choose on how comfortable that syntax is to read, since it is the property you will live with and the one that is expensive to change.</desc>
  <rect x="0" y="8" width="664" height="218" fill="#f9f5fb"/>
  <rect x="14" y="26" width="636" height="52" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="46" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · Is this a public, cold-start page measured on mobile?</text>
  <text x="28" y="64" font-size="9.5" fill="#6b5f75" font-family="inherit">If yes, the 10 kB is a real number and the modular option earns its keep. If no, stop weighing it.</text>
  <rect x="14" y="88" width="636" height="52" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="108" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · Does the team already use one of these elsewhere?</text>
  <text x="28" y="126" font-size="9.5" fill="#6b5f75" font-family="inherit">If yes, take it. Consistency decides how fast a schema bug gets diagnosed, which outweighs every row above.</text>
  <rect x="14" y="150" width="636" height="52" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="170" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · Do the schemas need heavy conditional refinement?</text>
  <text x="28" y="188" font-size="9.5" fill="#6b5f75" font-family="inherit">If yes, choose on how readable that syntax is — it is the property you live with and the one you cannot cheaply undo.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">Three questions, and only the first one is about the benchmarks. That ordering is the actual finding of this page.</text>
</svg>

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
