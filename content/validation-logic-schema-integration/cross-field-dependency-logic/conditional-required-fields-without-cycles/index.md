---
layout: page.njk
title: "Conditional Required Fields Without Cycles"
description: "Mutual requirement, mutual exclusion and two-way derivation each become one rule that reads both fields and writes to the group — the shape that cannot close a loop."
slug: conditional-required-fields-without-cycles
type: howto
breadcrumb: "Conditional Required Fields Without Cycles"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Conditional Required Fields Without Cycles"
  parent: "Cross-Field Dependency Logic"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Conditional Required Fields Without Cycles",
      "description": "Mutual requirement, mutual exclusion and two-way derivation each become one rule that reads both fields and writes to the group — the shape that cannot close a loop.",
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
          "name": "Conditional Required Fields Without Cycles",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Express conditional requirements without creating a cycle",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Write each two-field relationship as one rule"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Write the result to the group rather than to either field"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Give derived pairs a single direction"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Declare value clearing as a write"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Include visibility rules in the graph"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Assert the rule set sorts topologically"
        },
        {
          "@type": "HowToStep",
          "position": 7,
          "name": "Prefer a structural branch where one exists"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is a cycle always a bug?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In a rule set, yes. A cycle means there is no order in which every rule sees settled inputs, so whichever field the reader touches first determines the outcome — the form is non-deterministic from their point of view. What is usually not a bug is the intent behind it: mutual requirement, mutual exclusion and two-way derivation are all reasonable things to want, and all three have an acyclic expression."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the error for a mutual rule go?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On the group, not duplicated onto both fields. A message on each of two fields is announced twice and counted twice in the summary, while telling the reader nothing more than one message would. Put it on the fieldset that contains them, which is also where aria-describedby belongs for a group-level problem, and let focus land on the first field of the group."
          }
        },
        {
          "@type": "Question",
          "name": "Can a discriminated union replace a conditional requirement?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Often, and it is stronger when it can. 'Post code is required when delivery is home' is a rule that has to be maintained; a union where the home variant has a post code field and the collect variant does not is a shape where the requirement cannot be violated. The type narrows with it, so code reading a collect order cannot even refer to a post code. Use a rule when the branch is not structural — a threshold, a date comparison — and structure when it is."
          }
        }
      ]
    }
  ]
}
</script>

# Conditional Required Fields Without Cycles

The exact problem: "post code is required when country is United Kingdom" and "country is required when a post code is entered" are both reasonable-sounding rules, and together they are a cycle — a form that can never settle, and that blames whichever field the reader filled second.

## Context and Prerequisites

Detection is covered in [building a field dependency graph](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/building-a-field-dependency-graph/): a failed topological sort is a cycle. This page is about the shapes that create one and the rewrites that remove it, because a detected cycle still has to be fixed.

## Three Shapes That Create a Cycle

**Mutual requirement.** A requires B, B requires A. Neither can be filled first, so the reader is stuck whichever they choose. The intent is almost always "at least one of A or B", which is not a cycle at all:

```typescript
// Wrong: two rules, each naming the other, and no valid starting point.
{ id: 'a-needs-b', reads: ['b'], writes: ['a'] }
{ id: 'b-needs-a', reads: ['a'], writes: ['b'] }

// Right: one rule reading both, writing a form-level requirement.
{ id: 'at-least-one', reads: ['a', 'b'], writes: ['__form'] }
```

**Mutual exclusion.** "Only one of these may be filled" written as two clearing rules — filling A clears B, filling B clears A — oscillates. One rule that reads both and reports on both terminates:

```typescript
{ id: 'exactly-one', reads: ['card', 'account'], writes: ['__form'],
  evaluate: (v) => (!!v.card === !!v.account)
    ? { error: 'Enter either a card or an account, not both' } : {} }
```

**Derivation both ways.** Price and quantity each computing the other from a total. Pick one direction, mark the other read-only, and let the reader switch which is derived if they genuinely need to.

<svg viewBox="0 8 690 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cyclic rule shapes and their rewrites: mutual requirement becomes an at-least-one form rule, mutual exclusion becomes one exactly-one rule reading both, and two-way derivation becomes one direction with the other field read-only." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three cycles, and the acyclic rule that replaces each</title>
  <desc>Mutual requirement, where A requires B and B requires A, leaves the reader with no valid first move; the intent is at least one of A or B, which is a single rule reading both fields and writing a form-level requirement. Mutual exclusion written as two clearing rules oscillates, because each clear triggers the other; the intent is exactly one, which is again a single rule reading both. Two-way derivation, where each of two fields computes the other, has no fixed point; choose one direction and make the other field read-only, offering a control to switch which is derived if that is genuinely needed.</desc>
  <rect x="0" y="8" width="690" height="220" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The cyclic shape</text>
  <text x="230" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What goes wrong</text>
  <text x="440" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">The acyclic rewrite</text>
  <text x="24" y="66" font-size="10" fill="#a63d6f" font-family="inherit">A requires B, B requires A</text>
  <text x="230" y="66" font-size="10" fill="#6b5f75" font-family="inherit">no valid first move</text>
  <text x="440" y="66" font-size="10" fill="#2d6342" font-family="inherit">one rule: "at least one of A or B"</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#a63d6f" font-family="inherit">A clears B, B clears A</text>
  <text x="230" y="100" font-size="10" fill="#6b5f75" font-family="inherit">oscillates forever</text>
  <text x="440" y="100" font-size="10" fill="#2d6342" font-family="inherit">one rule: "exactly one of A or B"</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#a63d6f" font-family="inherit">A derives B, B derives A</text>
  <text x="230" y="134" font-size="10" fill="#6b5f75" font-family="inherit">no fixed point</text>
  <text x="440" y="134" font-size="10" fill="#2d6342" font-family="inherit">one direction; the other read-only</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#6b5f75" font-family="inherit">The pattern in all three: a relationship between two fields is ONE rule that reads both, not two rules that point at each other.</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">A rule that reads both and writes a form-level result has no outgoing edge to either field, so it cannot participate in a cycle.</text>
  <text x="14" y="222" font-size="10" fill="#6b5f75" font-family="inherit">That is also why the error belongs on the group or the form rather than being duplicated onto both fields.</text>
</svg>

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two rules pointing at each other each own half the relationship, so neither can be understood alone, both have to be kept in step, and together they form an edge in each direction — a cycle by construction. One rule that reads both fields owns the whole relationship, is testable as a single pure function of two values, and has no outgoing edge to either field because it writes to the group instead. The rewrite is almost always shorter than what it replaces." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two rules that point at each other, or one that reads both</title>
  <desc>Two rules pointing at each other each own half the relationship, so neither can be understood alone, both have to be kept in step, and together they form an edge in each direction — a cycle by construction. One rule that reads both fields owns the whole relationship, is testable as a single pure function of two values, and has no outgoing edge to either field because it writes to the group instead. The rewrite is almost always shorter than what it replaces.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">two rules pointing at each other</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">each owns half the relationship</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">neither is understandable alone</text>
  <text x="28" y="106" font-size="10" fill="#a63d6f" font-family="inherit">an edge in each direction</text>
  <text x="28" y="128" font-size="10" fill="#a63d6f" font-family="inherit">a cycle by construction</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">one rule reading both</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">owns the whole relationship</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">a pure function of two values</text>
  <text x="366" y="106" font-size="10" fill="#2d6342" font-family="inherit">writes to the group, not the fields</text>
  <text x="366" y="128" font-size="10" fill="#2d6342" font-family="inherit">no outgoing edge, so no cycle</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">The rewrite is usually shorter than what it replaces, which is unusual for a correctness fix.</text>
</svg>

## Step-by-Step Walkthrough

1. **Write the relationship as one rule.** If a sentence mentions two fields, it is one rule reading both — not two rules pointing at each other.

2. **Write to a group, not to the participants.** A rule writing `__form` or a fieldset id has no outgoing edge to either field, so it cannot close a loop.

3. **Choose a direction for derivations.** One field is the input; the other is computed and read-only.

4. **Attach the message where the action is.** For "exactly one", that is the group. For "B is required when A is X", that is B, because B is what the reader must fill.

5. **Assert acyclicity in a test.** Over the real rule set, so a new rule that closes a loop fails review.

6. **Prefer structure over rules.** A field required only in one mode is often better expressed as a [discriminated union](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/) than as a conditional rule.

## Failure Modes and Edge Cases

### 1. The cycle only exists for some values

`A requires B when A is filled` and `B requires A when B is filled` is a cycle only when both are filled. The graph is value-independent, so it reports the cycle always — which is right: a rule set that *can* cycle will.

### 2. Clearing as a side effect

A rule that clears another field's value creates an edge that is easy to miss, because it looks like housekeeping. Declare it in `writes`.

### 3. A three-rule cycle

A affects B, B affects C, C affects A. No pair looks wrong in review; only the sort finds it. This is the strongest argument for the assertion.

### 4. Visibility rules

Showing and hiding fields creates edges exactly like validation does, and a pair of rules that hide each other is a cycle that manifests as flickering.

### 5. Requiredness driven by a server response

An async rule that makes a field required, where that field feeds the same request, is a cycle across an await. The graph will not catch it; a bounded retry count will.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A rule about a pair of fields inside a fieldset attaches its message to the fieldset, is described by an element after the legend, and focuses the first field of the group when the summary entry is activated. A rule about the whole form attaches to the form-level summary, has no field to describe, and focuses the summary itself. Neither case attaches a message to both participants, which would be announced twice and counted twice." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where a group-level error attaches, and what focuses</title>
  <desc>A rule about a pair of fields inside a fieldset attaches its message to the fieldset, is described by an element after the legend, and focuses the first field of the group when the summary entry is activated. A rule about the whole form attaches to the form-level summary, has no field to describe, and focuses the summary itself. Neither case attaches a message to both participants, which would be announced twice and counted twice.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Scope</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Message attaches to</text>
  <text x="400" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Summary entry focuses</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">a pair in a fieldset</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">the fieldset</text>
  <text x="400" y="66" font-size="10" fill="#2d6342" font-family="inherit">the first field of the group</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">the whole form</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the form-level summary</text>
  <text x="400" y="100" font-size="10" fill="#2d6342" font-family="inherit">the summary itself</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">one field</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">that field</text>
  <text x="400" y="134" font-size="10" fill="#2d6342" font-family="inherit">that field</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#a63d6f" font-family="inherit">both participants</text>
  <text x="200" y="168" font-size="10" fill="#a63d6f" font-family="inherit">never do this</text>
  <text x="400" y="168" font-size="10" fill="#a63d6f" font-family="inherit">announced twice, counted twice</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">The bottom row is the tempting one, because it looks more helpful — and it makes the summary claim two problems where there is one.</text>
</svg>

## Verification Checklist

- [ ] Every relationship between two fields is one rule reading both
- [ ] Rules about a pair write to the group, not to either field
- [ ] Derived pairs have exactly one direction
- [ ] Clearing another field's value is declared in `writes`
- [ ] Visibility rules are in the graph too
- [ ] A test asserts the real rule set sorts topologically
- [ ] Conditional requirements are structural where they can be

---

**Related**

- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/) — the graph these rules form
- [Building a Field Dependency Graph](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/building-a-field-dependency-graph/) — detecting the cycle
- [Discriminated Unions for Conditional Schemas](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/discriminated-unions-for-conditional-schemas/) — expressing the branch structurally

← [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)

## Frequently Asked Questions

<details>
<summary><strong>Is a cycle always a bug?</strong></summary>

In a rule set, yes. A cycle means there is no order in which every rule sees settled inputs, so whichever field the reader touches first determines the outcome — the form is non-deterministic from their point of view. What is usually not a bug is the intent behind it: mutual requirement, mutual exclusion and two-way derivation are all reasonable things to want, and all three have an acyclic expression.

</details>

<details>
<summary><strong>Where should the error for a mutual rule go?</strong></summary>

On the group, not duplicated onto both fields. A message on each of two fields is announced twice and counted twice in the summary, while telling the reader nothing more than one message would. Put it on the fieldset that contains them, which is also where aria-describedby belongs for a group-level problem, and let focus land on the first field of the group.

</details>

<details>
<summary><strong>Can a discriminated union replace a conditional requirement?</strong></summary>

Often, and it is stronger when it can. 'Post code is required when delivery is home' is a rule that has to be maintained; a union where the home variant has a post code field and the collect variant does not is a shape where the requirement cannot be violated. The type narrows with it, so code reading a collect order cannot even refer to a post code. Use a rule when the branch is not structural — a threshold, a date comparison — and structure when it is.

</details>

