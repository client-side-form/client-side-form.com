---
layout: page.njk
title: "React Hook Form vs Custom Reducer: Performance Tradeoffs"
description: "Compare React Hook Form's uncontrolled subscription model against a controlled useReducer form: re-render counts, when each wins, and the migration path."
slug: react-hook-form-vs-custom-reducer-performance
type: howto
breadcrumb: "React Hook Form vs Custom Reducer"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "React Hook Form vs Custom Reducer: Performance Tradeoffs"
  parent: "React Form Hook Architecture"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "React Hook Form vs Custom Reducer: Performance Tradeoffs",
      "description": "Compare React Hook Form's uncontrolled subscription model against a controlled useReducer form: re-render counts, when each wins, and the migration path.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Framework Adapters & Custom Hooks", "item": "https://client-side-form.com/framework-adapters-custom-hooks/" },
        { "@type": "ListItem", "position": 3, "name": "React Form Hook Architecture", "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/" },
        { "@type": "ListItem", "position": 4, "name": "React Hook Form vs Custom Reducer: Performance Tradeoffs", "item": "https://client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/react-hook-form-vs-custom-reducer-performance/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Choose between React Hook Form and a custom useReducer form",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Measure re-render counts per keystroke with the DevTools Profiler" },
        { "@type": "HowToStep", "position": 2, "name": "Classify the form as data-entry heavy or interdependent-logic heavy" },
        { "@type": "HowToStep", "position": 3, "name": "Pick uncontrolled subscription for raw input throughput" },
        { "@type": "HowToStep", "position": 4, "name": "Pick a controlled reducer for cross-field derived state" },
        { "@type": "HowToStep", "position": 5, "name": "Plan an incremental migration through a shared schema" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does React Hook Form re-render less than my useReducer form?",
          "acceptedAnswer": { "@type": "Answer", "text": "React Hook Form keeps field values in the DOM through uncontrolled refs and register, not in React state. A keystroke updates the input directly and notifies only subscribers of that field, so the form component does not re-render on every character. A controlled useReducer dispatches on each keystroke, producing a new state object and re-rendering every component that reads it unless you add selector-based memoization." }
        },
        {
          "@type": "Question",
          "name": "When is a custom useReducer form actually the better choice?",
          "acceptedAnswer": { "@type": "Answer", "text": "When the form is logic-heavy rather than input-heavy: many fields whose values derive from other fields, a wizard whose steps unlock conditionally, or state a state machine must own explicitly. A reducer gives you one deterministic transition function and a serializable state you can test in isolation. The re-render cost is real but bounded, and selector subscriptions recover most of it." }
        },
        {
          "@type": "Question",
          "name": "Can I migrate from a useReducer form to React Hook Form incrementally?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, if both share one validation schema. Keep the schema as the source of truth, then move fields to register one section at a time, wrapping any remaining controlled widgets with Controller. The shared schema means validation behaviour does not change during the migration, so you can move field by field and diff re-render counts as you go." }
        }
      ]
    }
  ]
}
</script>

# React Hook Form vs Custom Reducer: Performance Tradeoffs

The exact problem: a controlled `useReducer` form re-renders the entire tree on every keystroke, and you need to decide whether React Hook Form's uncontrolled subscription model is worth adopting — or whether the reducer's explicit state is worth keeping.

## Context and Prerequisites

This comparison sits under [React form hook architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/), which specifies the reducer-driven hook in full. The question here is architectural: React Hook Form and a hand-rolled reducer make opposite bets about where field values live, and that single decision drives their re-render profiles. Understanding [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) is the prerequisite, because it is exactly the axis these two libraries diverge on.

## The Core Tradeoff

React Hook Form is uncontrolled by default: field values live in the DOM, read through `register` and refs, and React state is not touched on each keystroke. A custom `useReducer` form is controlled: every keystroke dispatches an action, produces a new state object, and re-renders every consumer of that state. The diagram contrasts what happens on a single keystroke in each model.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-label="Comparison of re-render propagation on one keystroke: React Hook Form subscription model versus controlled useReducer" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>React Hook Form versus custom reducer re-render propagation</title>
  <desc>On a keystroke, React Hook Form updates the DOM input directly and notifies only the subscribed field, leaving sibling fields unrendered. A controlled useReducer dispatches an action, creates a new state object, and re-renders every field that reads the state unless selectors are added.</desc>
  <rect x="0" y="0" width="720" height="340" fill="#f9f5fb"/>
  <defs>
    <marker id="arr-rhf-reducer" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
  <rect width="720" height="340" rx="12" fill="none" stroke="#cbb8d9" stroke-width="1"/>
  <!-- Divider -->
  <line x1="360" y1="24" x2="360" y2="316" stroke="#6b5f75" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="180" y="42" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">React Hook Form (uncontrolled)</text>
  <text x="540" y="42" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">useReducer (controlled)</text>
  <!-- LEFT: keystroke -->
  <rect x="60" y="70" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="120" y="96" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">keystroke</text>
  <!-- LEFT: DOM ref -->
  <rect x="60" y="150" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="120" y="170" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">DOM ref</text>
  <text x="120" y="184" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">no React state</text>
  <!-- LEFT: subscribed field -->
  <rect x="60" y="240" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="120" y="260" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">1 field renders</text>
  <text x="120" y="274" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">siblings idle</text>
  <path d="M120 112 L120 141" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-rhf-reducer)"/>
  <path d="M120 192 L120 231" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-rhf-reducer)"/>
  <text x="228" y="216" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">subscribe(name)</text>
  <!-- RIGHT: keystroke -->
  <rect x="480" y="70" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="540" y="96" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">keystroke</text>
  <!-- RIGHT: dispatch -->
  <rect x="480" y="150" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="540" y="170" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">dispatch()</text>
  <text x="540" y="184" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">new state object</text>
  <!-- RIGHT: all fields render -->
  <rect x="480" y="240" width="120" height="42" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="540" y="260" text-anchor="middle" font-family="inherit" font-size="11" fill="#1e1a24">N fields render</text>
  <text x="540" y="274" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">unless selectors</text>
  <path d="M540 112 L540 141" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-rhf-reducer)"/>
  <path d="M540 192 L540 231" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-rhf-reducer)"/>
  <text x="648" y="216" text-anchor="middle" font-family="inherit" font-size="9" fill="#6b5f75">state changes</text>
</svg>

## Re-Render Counts Compared

The table below is the empirical shape of the tradeoff. Numbers are renders triggered per action on a 60-field form; measure your own with the DevTools Profiler before deciding.

| Interaction | React Hook Form | Controlled useReducer (naive) | useReducer + selectors |
|-------------|-----------------|-------------------------------|------------------------|
| Single keystroke | 0 form renders; 1 field if watched | 1 form render + all field renders | 1 field render |
| Blur / touch a field | 1 subscribed field | full tree | 1 field |
| Cross-field derived value | needs `watch`, re-renders watchers | free — reducer computes it | free — reducer computes it |
| Submit | 1 render | 1 render | 1 render |
| Programmatic reset | 1 render | 1 render | affected fields |

The pattern is clear. React Hook Form wins raw input throughput because it does not route keystrokes through React state at all. A naive controlled reducer loses badly on typing but wins on derived state, because the reducer computes dependent values in one deterministic pass. Adding selector subscriptions — the technique in [custom useFormField hook performance tuning](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/custom-useformfield-hook-performance-tuning/) — closes most of the keystroke gap while keeping the reducer's explicit-state advantage.

## Minimal Implementations Side by Side

```typescript
// React Hook Form: values live in the DOM; the form does not render on keystroke.
import { useForm } from 'react-hook-form';

function RhfForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();
  return (
    <form onSubmit={handleSubmit(v => console.log(v))}>
      {/* register wires an uncontrolled ref — no value/onChange round-trip. */}
      <input {...register('email', { required: 'Required' })} aria-invalid={!!errors.email} />
      {errors.email && <p role="alert">{errors.email.message}</p>}
    </form>
  );
}
```

```typescript
// Controlled useReducer: every keystroke dispatches; derived state is trivial.
import { useReducer } from 'react';

type State = { price: number; qty: number; total: number };
type Action = { type: 'set'; key: 'price' | 'qty'; value: number };

function reducer(s: State, a: Action): State {
  const next = { ...s, [a.key]: a.value };
  // Derived field computed in the same transition — no extra render, no watch().
  next.total = next.price * next.qty;
  return next;
}

function ReducerForm() {
  const [state, dispatch] = useReducer(reducer, { price: 0, qty: 1, total: 0 });
  return (
    <form>
      <input type="number" value={state.qty}
        onChange={e => dispatch({ type: 'set', key: 'qty', value: +e.target.value })} />
      <output>{state.total}</output>
    </form>
  );
}
```

## Step-by-Step: Choosing Between Them

1. **Profile first.** Open the React DevTools Profiler and record a few keystrokes. If the whole form flashes on every character, you have a controlled-state storm. Quantify it before optimizing.

2. **Classify the form.** Is it input-heavy (a long data-entry form, mostly independent fields) or logic-heavy (interdependent fields, conditional steps, a state machine)? The classification, not a benchmark alone, points to the model.

3. **Pick uncontrolled for throughput.** For input-heavy forms, React Hook Form's subscription model gives near-zero render cost per keystroke with minimal code. Reach for `watch` only where you genuinely need a live derived value.

4. **Pick a reducer for logic.** For logic-heavy forms, a `useReducer` gives one deterministic transition function, derived fields for free, and serializable state you can unit-test without rendering. Recover keystroke cost with selector subscriptions.

5. **Plan migration through a shared schema.** Keep one validation schema — see [integrating Zod for schema validation](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/) — so behaviour is stable while you move fields between models one section at a time.

Performance is where this comparison usually starts, but it is rarely where the decision is actually made. The costs that matter over a project's life are the ones in the middle rows:

<svg viewBox="0 8 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of a form library against a hand-rolled reducer across five dimensions: renders per keystroke, bundle cost, time to a working form, how much of the behaviour you must own, and how well each survives an unusual requirement." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The dimensions that actually decide this</title>
  <desc>Renders per keystroke: both can reach one, the library by registering uncontrolled inputs and the reducer by subscribing per field, so this is a tie once either is done properly. Bundle cost: the library adds roughly ten kilobytes minified and compressed, the reducer adds under one. Time to a working form: hours for the library, days for the reducer. Behaviour you must own: almost none for the library — array fields, dependent validation and reset semantics are supplied — against all of it for the reducer. Surviving an unusual requirement: the library may require working around its model, while the reducer bends because you wrote it. The summary is that the library wins on time and the reducer wins on control, and neither wins on renders.</desc>
  <rect x="0" y="8" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="16" width="680" height="204" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Dimension</text>
  <text x="250" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Form library</text>
  <text x="420" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Hand-rolled reducer</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">renders per keystroke</text>
  <text x="250" y="66" font-size="10" fill="#2d6342" font-family="inherit">1, via uncontrolled inputs</text>
  <text x="420" y="66" font-size="10" fill="#2d6342" font-family="inherit">1, via per-field subscriptions</text>
  <line x1="10" y1="80" x2="690" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">bundle cost</text>
  <text x="250" y="100" font-size="10" fill="#1e1a24" font-family="inherit">~10 kB compressed</text>
  <text x="420" y="100" font-size="10" fill="#2d6342" font-family="inherit">under 1 kB</text>
  <line x1="10" y1="114" x2="690" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">time to a working form</text>
  <text x="250" y="134" font-size="10" fill="#2d6342" font-family="inherit">hours</text>
  <text x="420" y="134" font-size="10" fill="#a63d6f" font-family="inherit">days</text>
  <line x1="10" y1="148" x2="690" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">behaviour you must own</text>
  <text x="250" y="168" font-size="10" fill="#2d6342" font-family="inherit">almost none</text>
  <text x="420" y="168" font-size="10" fill="#a63d6f" font-family="inherit">arrays, deps, reset, focus</text>
  <line x1="10" y1="182" x2="690" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">an unusual requirement</text>
  <text x="250" y="202" font-size="10" fill="#1e1a24" font-family="inherit">work around the model</text>
  <text x="420" y="202" font-size="10" fill="#2d6342" font-family="inherit">bends — you wrote it</text>
</svg>

## Failure Modes and Edge Cases

### 1. Overusing watch turns React Hook Form controlled again

`watch()` subscribes the calling component to field changes and re-renders it on each keystroke. Watching many fields at a high level recreates the very storm you adopted the library to avoid.

```typescript
// Prefer useWatch scoped to a child, not a top-level watch of everything.
const total = useWatch({ control, name: 'total' }); // re-renders only this subtree
```

### 2. Controller wraps every field and erases the benefit

Wrapping controlled component libraries in `Controller` reintroduces React state per field. Use it only for inputs that truly cannot be uncontrolled, not as the default.

### 3. Naive reducer with no selectors on a large form

A single `useContext(state)` at the leaf makes every field a full-state subscriber. Add a selector layer before concluding the reducer approach is too slow.

### 4. Reset semantics differ between models

React Hook Form's `reset()` rewrites the DOM refs; a reducer's reset dispatches an action producing a new state. Migrating between them silently changes what "dirty after reset" means — re-verify your dirty tracking, covered in [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/).

Read as a decision rather than a table, three questions settle it, and none of them is about speed:

<svg viewBox="0 8 660 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three-question decision tree. If the form is a standard shape, take the library. If it is unusual but the library has an escape hatch for the unusual part, still take the library. Only when the form's core model conflicts with the library's is a hand-rolled reducer the cheaper option." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three questions, in this order</title>
  <desc>Question one: is this a conventional form — fields, validation, submit? If yes, take the library; you will not beat it on time and you will not need to beat it on renders. Question two: if the form is unusual, is the unusual part reachable through the library's escape hatches, such as a custom controller or a manual register? If yes, still take the library. Question three: does the form's core model genuinely conflict with the library's — a machine-driven wizard, values living in a shared store outside the form, or a field graph the library cannot express? Only then is a reducer the cheaper option, and even then only for the conflicting part.</desc>
  <rect x="0" y="8" width="660" height="224" fill="#f9f5fb"/>
  <rect x="14" y="24" width="250" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="46" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · a conventional form?</text>
  <text x="28" y="64" font-size="9.5" fill="#1e1a24" font-family="inherit">fields, validation, submit</text>
  <path d="M264,50 H320" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="292" y="42" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">yes</text>
  <rect x="320" y="24" width="326" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="334" y="46" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">take the library</text>
  <text x="334" y="64" font-size="9.5" fill="#6b5f75" font-family="inherit">you will not beat it on time, and need not on renders</text>
  <path d="M139,76 V102" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="149" y="94" font-size="9.5" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14" y="102" width="250" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="124" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · escape hatch enough?</text>
  <text x="28" y="142" font-size="9.5" fill="#1e1a24" font-family="inherit">controller, manual register</text>
  <path d="M264,128 H320" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="292" y="120" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">yes</text>
  <rect x="320" y="102" width="326" height="52" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="334" y="124" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">still take the library</text>
  <text x="334" y="142" font-size="9.5" fill="#6b5f75" font-family="inherit">one custom field is cheaper than one custom form</text>
  <path d="M139,154 V180" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="149" y="172" font-size="9.5" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14" y="180" width="632" height="46" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="200" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · the models genuinely conflict — write the reducer, for the conflicting part only</text>
  <text x="28" y="218" font-size="9.5" fill="#6b5f75" font-family="inherit">a machine-driven wizard, values owned by a shared store, or a field graph the library cannot express</text>
</svg>

## Verification Checklist

- [ ] Measured per-keystroke render count in the DevTools Profiler for both models
- [ ] Confirmed the form is classified correctly as input-heavy or logic-heavy
- [ ] watch/useWatch scoped to the smallest subtree that needs the live value
- [ ] Controller used only for genuinely uncontrolled-incompatible inputs
- [ ] Reducer form has selector subscriptions before judging its performance
- [ ] Dirty/reset semantics re-verified after any migration between models
- [ ] aria-invalid and role="alert" behaviour identical across both implementations

## FAQ

<details>
<summary><strong>Why does React Hook Form re-render less than my useReducer form?</strong></summary>

React Hook Form keeps field values in the DOM through uncontrolled refs and `register`, not in React state. A keystroke updates the input directly and notifies only subscribers of that field, so the form component does not re-render on every character. A controlled `useReducer` dispatches on each keystroke, producing a new state object and re-rendering every component that reads it — unless you add selector-based memoization that lets each field subscribe to only its own slice. The difference is architectural, not a matter of one library being "faster."

</details>

<details>
<summary><strong>When is a custom useReducer form actually the better choice?</strong></summary>

When the form is logic-heavy rather than input-heavy: many fields whose values derive from other fields, a wizard whose steps unlock conditionally, or state that a state machine must own explicitly. A reducer gives you one deterministic transition function and a serializable state you can test in isolation without rendering. The re-render cost is real but bounded, and selector subscriptions recover most of it. If your form is mostly independent inputs with little cross-field logic, the reducer's advantages do not apply and React Hook Form is the simpler win.

</details>

<details>
<summary><strong>Can I migrate from a useReducer form to React Hook Form incrementally?</strong></summary>

Yes, if both share one validation schema. Keep the schema as the source of truth, then move fields to `register` one section at a time, wrapping any remaining controlled widgets with `Controller`. The shared schema means validation behaviour does not change during the migration, so you can move field by field and diff re-render counts in the Profiler as you go. Migrate the input-heavy sections first, since those show the largest render reduction, and leave interdependent sections for last or keep them on the reducer permanently.

</details>

---

**Related**

- [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/) — the reducer-driven hook this comparison measures against
- [Custom useFormField Hook Performance Tuning](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/custom-useformfield-hook-performance-tuning/) — selector subscriptions that close the reducer's keystroke gap
- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) — the axis these two models diverge on

← [React Form Hook Architecture](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/)
