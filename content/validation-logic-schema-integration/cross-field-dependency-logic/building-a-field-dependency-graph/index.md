---
layout: page.njk
title: "Building a Field Dependency Graph"
description: "Have every rule declare what it reads and writes, build the adjacency once, sort it topologically, and get change propagation, evaluation order and cycle detection for free."
slug: building-a-field-dependency-graph
type: howto
breadcrumb: "Building a Field Dependency Graph"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Building a Field Dependency Graph"
  parent: "Cross-Field Dependency Logic"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Building a Field Dependency Graph",
      "description": "Have every rule declare what it reads and writes, build the adjacency once, sort it topologically, and get change propagation, evaluation order and cycle detection for free.",
      "datePublished": "2026-08-05",
      "dateModified": "2026-08-05",
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
          "item": "https://www.client-side-form.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Validation Logic & Schema Integration",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Cross-Field Dependency Logic",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Building a Field Dependency Graph",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/building-a-field-dependency-graph/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a field dependency graph from your rules",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Make every rule declare what it reads and writes"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Build the adjacency once at registration"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Sort topologically and cache the order"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Assert acyclicity in a test"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Walk descendants when a field changes"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Evaluate the affected rules in sorted order"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Dispatch async rules after the synchronous pass"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What should happen when a cycle is detected?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Fail loudly at build or test time. A cycle means two rules each require the other to have settled first, and no evaluation order satisfies that — so any runtime handling is a choice about which rule silently loses. Assert that topologicalOrder returns non-null in a unit test over the real rule set, and the failure lands on whoever added the rule rather than on a reader whose tab hangs."
          }
        },
        {
          "@type": "Question",
          "name": "Is a graph worth it for four conditional rules?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Probably not for four with no chains. It starts paying when rules affect fields that other rules read — the point at which order matters and the answer to 'what does changing this affect' stops being obvious. The migration is mechanical, so a reasonable rule of thumb is to declare reads and writes from the start and only build the graph when the second chained rule appears."
          }
        },
        {
          "@type": "Question",
          "name": "How do async rules fit into a topological order?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "They do not, and forcing them to leads to a pass that awaits a network round trip. Run the synchronous chain to completion so the form is consistent, then dispatch the async rules for the affected fields and let their results arrive through the validation queue. The graph tells you which ones to dispatch; it does not have to sequence them."
          }
        }
      ]
    }
  ]
}
</script>

# Building a Field Dependency Graph

The exact problem: a form has fourteen conditional rules written as `if` statements inside change handlers, and nobody can answer two questions about it — which fields does changing the country affect, and can a rule ever trigger itself.

## Context and Prerequisites

The reasoning behind modelling dependencies as a graph is in [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/). This page builds the graph: how to declare edges, how to sort them, and how to detect the cycle that no evaluation order can satisfy.

## Core Pattern

```typescript
interface Rule {
  readonly id: string;
  /** Fields this rule READS. These are the incoming edges. */
  readonly reads: readonly string[];
  /** Fields this rule WRITES — validity, requiredness, visibility, a value. */
  readonly writes: readonly string[];
  readonly evaluate: (values: Values) => RuleResult;
}

/** Adjacency built from the rules: field → the fields it can affect. */
export function buildGraph(rules: readonly Rule[]): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  for (const rule of rules) {
    for (const from of rule.reads) {
      const to = edges.get(from) ?? new Set<string>();
      for (const w of rule.writes) if (w !== from) to.add(w);
      edges.set(from, to);
    }
  }
  return edges;
}

/**
 * Kahn's algorithm. Returns null when a cycle exists — which is a bug in the
 * RULE SET, so it should fail a test rather than be handled at runtime.
 */
export function topologicalOrder(edges: Map<string, Set<string>>): string[] | null {
  const indegree = new Map<string, number>();
  for (const [from, tos] of edges) {
    indegree.set(from, indegree.get(from) ?? 0);
    for (const to of tos) indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([n]) => n);
  const order: string[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const to of edges.get(node) ?? []) {
      const d = indegree.get(to)! - 1;
      indegree.set(to, d);
      if (d === 0) queue.push(to);
    }
  }
  // Fewer nodes emitted than exist means at least one is stuck in a cycle.
  return order.length === indegree.size ? order : null;
}

/** After a field changes, only its descendants need re-evaluating. */
export function affectedBy(field: string, edges: Map<string, Set<string>>): string[] {
  const seen = new Set<string>();
  const stack = [field];
  while (stack.length) {
    const n = stack.pop()!;
    for (const to of edges.get(n) ?? []) if (!seen.has(to)) { seen.add(to); stack.push(to); }
  }
  return [...seen];
}
```

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three questions a dependency graph answers that scattered conditionals cannot: which fields a change affects, in what order rules must run, and whether any cycle exists." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three questions the graph answers and the conditionals cannot</title>
  <desc>What does changing this field affect? A reachability walk from the changed field returns exactly its descendants, so only those rules re-run instead of all of them. In what order should the rules run? A topological sort gives an order in which every rule's inputs are already settled when it evaluates, so one pass suffices instead of iterating to a fixed point. Can a rule trigger itself? A failed topological sort is a cycle, detectable when the rule set is built rather than when a reader finds it — which makes it a failing test instead of a hung tab.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <rect x="14" y="30" width="212" height="88" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">what does this affect?</text>
  <text x="28" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">walk the descendants of the</text>
  <text x="28" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">changed field</text>
  <text x="28" y="108" font-size="9.5" fill="#2d6342" font-family="inherit">re-run only those rules</text>
  <rect x="238" y="30" width="212" height="88" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="252" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">in what order?</text>
  <text x="252" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">topological sort — inputs are</text>
  <text x="252" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">settled before each rule runs</text>
  <text x="252" y="108" font-size="9.5" fill="#2d6342" font-family="inherit">one pass, not a fixed point</text>
  <rect x="462" y="30" width="214" height="88" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="476" y="52" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">is there a cycle?</text>
  <text x="476" y="72" font-size="9.5" fill="#6b5f75" font-family="inherit">a failed sort is a cycle,</text>
  <text x="476" y="88" font-size="9.5" fill="#6b5f75" font-family="inherit">found at build time</text>
  <text x="476" y="108" font-size="9.5" fill="#a63d6f" font-family="inherit">a failing test, not a hung tab</text>
  <rect x="14" y="140" width="662" height="52" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="28" y="162" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">All three come free once rules declare what they read and what they write</text>
  <text x="28" y="180" font-size="9.5" fill="#1e1a24" font-family="inherit">The declaration is the whole cost: fourteen scattered conditionals become fourteen objects with two arrays each.</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Sort once when the rule set is registered and cache the order — it changes only when the rules do, never per keystroke.</text>
</svg>

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A validation edge exists where a rule reads one field to judge another. A requiredness edge exists where one field decides whether another must be filled. A visibility edge exists where one field decides whether another is rendered at all. A value edge exists where a rule writes another field's value outright. All four are edges in the same graph, and the last two are the ones most often left undeclared because they do not look like validation." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three kinds of edge, all of which count</title>
  <desc>A validation edge exists where a rule reads one field to judge another. A requiredness edge exists where one field decides whether another must be filled. A visibility edge exists where one field decides whether another is rendered at all. A value edge exists where a rule writes another field's value outright. All four are edges in the same graph, and the last two are the ones most often left undeclared because they do not look like validation.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Edge kind</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Created when</text>
  <text x="460" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Often missed?</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">validation</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">a rule reads A to judge B</text>
  <text x="460" y="66" font-size="10" fill="#6b5f75" font-family="inherit">no</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">requiredness</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">A decides whether B is required</text>
  <text x="460" y="100" font-size="10" fill="#1e1a24" font-family="inherit">sometimes</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">visibility</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">A decides whether B is rendered</text>
  <text x="460" y="134" font-size="10" fill="#a63d6f" font-family="inherit">often</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">value</text>
  <text x="200" y="168" font-size="10" fill="#6b5f75" font-family="inherit">a rule writes B’s value</text>
  <text x="460" y="168" font-size="10" fill="#a63d6f" font-family="inherit">often</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">The bottom two do not look like validation, which is exactly why they are left out — and why the cycle appears later.</text>
</svg>

## Step-by-Step Walkthrough

1. **Make every rule declare `reads` and `writes`.** This is the entire migration, and it is mechanical.

2. **Build the adjacency once.** At registration, not per change.

3. **Sort once and cache.** The order depends on the rules, which do not change at runtime.

4. **Assert acyclicity in a test.** A cycle is a rule-set bug; discovering it in a browser is a hung tab.

5. **Walk descendants on change.** Only the affected subgraph re-evaluates.

6. **Evaluate in sorted order.** Every rule's inputs are settled when it runs, so one pass is enough.

## Failure Modes and Edge Cases

### 1. Under-declared reads

A rule that quietly reads a field it did not declare will not re-run when that field changes. Under-declaring is the dangerous direction; over-declaring only costs extra evaluations.

### 2. A rule that writes what it reads

Self-edges are excluded above, which is right for the common "normalise this field" rule but hides a real cycle if two rules do it to each other. The sort catches the pair.

### 3. Async rules in the order

A remote check cannot block the pass. Run the synchronous chain to completion, then dispatch the async ones — and treat their results as arriving later, through the queue rather than through the graph.

### 4. Dynamic rules

Rules added when a section appears change the graph. Rebuild and re-sort on registration change, and re-assert acyclicity then too.

### 5. The order is not an announcement order

Sorted order is right for evaluation. For announcing consequences, the reader needs cause before effect, which is the same order — but only if you announce as you evaluate, not after collecting everything.

<svg viewBox="0 8 690 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The rules are registered once, at module load or when a section mounts. The adjacency is built from them at that moment, and the topological order is computed and cached. From then on, every keystroke only walks the cached graph — no rebuilding, no re-sorting. The graph changes again only when the rule set does, at which point both the build and the sort re-run and the acyclicity assertion runs with them." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What changes when, in the graph’s life</title>
  <desc>The rules are registered once, at module load or when a section mounts. The adjacency is built from them at that moment, and the topological order is computed and cached. From then on, every keystroke only walks the cached graph — no rebuilding, no re-sorting. The graph changes again only when the rule set does, at which point both the build and the sort re-run and the acyclicity assertion runs with them.</desc>
  <rect x="0" y="8" width="690" height="168" fill="#f9f5fb"/>
  <text x="14" y="30" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">What changes when, in the graph’s life</text>
  <rect x="14" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="88" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">register</text>
  <text x="88" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">rules declare reads</text>
  <text x="88" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">and writes</text>
  <path d="M163,80 H185" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="185" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="259" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">build</text>
  <text x="259" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">adjacency, once,</text>
  <text x="259" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from the rules</text>
  <path d="M334,80 H356" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="356" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="430" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">sort</text>
  <text x="430" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">topological order,</text>
  <text x="430" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">cached</text>
  <path d="M505,80 H527" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="527" y="42" width="149" height="76" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="601" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">per keystroke</text>
  <text x="601" y="86" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">walk the cached graph —</text>
  <text x="601" y="102" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing is rebuilt</text>
  <text x="14" y="142" font-size="10" fill="#6b5f75" font-family="inherit">If any of the first three happens per keystroke, the graph has become more expensive than the conditionals it replaced.</text>
</svg>

## Verification Checklist

- [ ] Every rule declares both `reads` and `writes`
- [ ] The graph is built once, at registration
- [ ] A cycle fails a test rather than reaching a browser
- [ ] Changing a field re-evaluates only its descendants
- [ ] One pass settles every affected rule
- [ ] Async rules run after the synchronous chain
- [ ] Adding rules at runtime rebuilds and re-asserts the graph

## Common Pitfalls

- **Under-declaring reads.** A rule that quietly reads an undeclared field never re-runs when that field changes, and the bug looks like validation that works for some readers and not others.
- **Leaving visibility rules out.** Showing and hiding fields creates edges exactly like validation does, and a pair that hides each other is a cycle that manifests as flickering.
- **Rebuilding per keystroke.** The graph depends on the rules, which do not change at runtime. Build and sort once, then only walk.
- **Handling cycles at runtime.** Any runtime handling is a silent choice about which rule loses. Assert the sort succeeds in a test instead.
- **Putting async rules in the order.** A topological pass that awaits a round trip stops being a pass. Run the synchronous chain, then dispatch.

---

**Related**

- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) — why the graph shape matters
- [Conditional Required Fields Without Cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/) — the rule shape that most often creates one
- [Queueing Async Validators in Order](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/queueing-async-validators-in-order/) — where the async rules go

← [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)

## Frequently Asked Questions

<details>
<summary><strong>What should happen when a cycle is detected?</strong></summary>

Fail loudly at build or test time. A cycle means two rules each require the other to have settled first, and no evaluation order satisfies that — so any runtime handling is a choice about which rule silently loses. Assert that topologicalOrder returns non-null in a unit test over the real rule set, and the failure lands on whoever added the rule rather than on a reader whose tab hangs.

</details>

<details>
<summary><strong>Is a graph worth it for four conditional rules?</strong></summary>

Probably not for four with no chains. It starts paying when rules affect fields that other rules read — the point at which order matters and the answer to 'what does changing this affect' stops being obvious. The migration is mechanical, so a reasonable rule of thumb is to declare reads and writes from the start and only build the graph when the second chained rule appears.

</details>

<details>
<summary><strong>How do async rules fit into a topological order?</strong></summary>

They do not, and forcing them to leads to a pass that awaits a network round trip. Run the synchronous chain to completion so the form is consistent, then dispatch the async rules for the affected fields and let their results arrive through the validation queue. The graph tells you which ones to dispatch; it does not have to sequence them.

</details>

