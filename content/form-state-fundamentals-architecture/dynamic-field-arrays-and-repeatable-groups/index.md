---
layout: page.njk
title: "Dynamic Field Arrays and Repeatable Groups"
description: "Architecture for forms with add, remove and reorder rows — line items, contacts, education history: stable row identity, per-row and whole-array validation, errors that follow their rows, focus on add and remove, and undo."
slug: dynamic-field-arrays-and-repeatable-groups
type: topic
breadcrumb: "Field Arrays"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Dynamic Field Arrays and Repeatable Groups"
  parent: "Form State Fundamentals"
  order: 9
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Dynamic Field Arrays and Repeatable Groups",
      "description": "Architecture for forms with add, remove and reorder rows — line items, contacts, education history: stable row identity, per-row and whole-array validation, errors that follow their rows, focus on add and remove, and undo.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Dynamic Field Arrays and Repeatable Groups",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a robust repeatable field group",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Problem statement"
        },
        {
          "@type": "HowToStep",
          "name": "State machine specification"
        },
        {
          "@type": "HowToStep",
          "name": "Core implementation"
        },
        {
          "@type": "HowToStep",
          "name": "Integration guidance"
        },
        {
          "@type": "HowToStep",
          "name": "Ordered lists versus unordered collections"
        },
        {
          "@type": "HowToStep",
          "name": "Edge cases and failure modes"
        },
        {
          "@type": "HowToStep",
          "name": "Testing and QA hooks"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I use the array index if my rows are never reordered?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only if rows are also never removed from anywhere but the end and never inserted anywhere but the end. Deleting a middle row reshuffles every index after it, which is enough to misattribute errors and focus. Generating an id per row costs one line and removes the whole category of bugs."
          }
        },
        {
          "@type": "Question",
          "name": "Should the client id be sent to the server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is harmless and occasionally useful — for example as an idempotency hint for creating child records, or to map server errors by id instead of index. But the server should not depend on it as a permanent identifier; assign real ids on the server when rows are saved."
          }
        },
        {
          "@type": "Question",
          "name": "How do I show an error that belongs to the whole list?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Render array-level errors once, at the top of the group's fieldset, below its legend, and reference them from the fieldset with aria-describedby. Do not attach them to the first or last row — they are about the collection, and the error summary should link to the group, or to the Add button when the fix is to add a row."
          }
        },
        {
          "@type": "Question",
          "name": "What is the right maximum number of rows?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Whatever the domain requires, enforced both by hiding or disabling the Add action at the limit (with a visible explanation) and by array-level validation for data that arrives by other routes, such as paste or import. Never silently drop rows beyond the limit."
          }
        }
      ]
    }
  ]
}
</script>

# Dynamic Field Arrays and Repeatable Groups

Repeatable groups — invoice line items, emergency contacts, work history, passenger lists — are where form state models that assume a fixed set of named fields break down: rows are added, removed and reordered, and every piece of state keyed by *position* silently attaches itself to the wrong row.

The symptoms are familiar to anyone who has shipped one. Delete row 2 and the error that belonged to row 3 now sits on the row that moved up into its place. Reorder two rows and the text a user was typing jumps into the other row. Add a row and focus stays on the "Add" button, so a screen-reader user has no idea a new set of fields appeared. This topic sets out the model that avoids all of them — rows with stable identity, state keyed by that identity, validation at two levels, and deliberate focus and announcement on every structural change — and links to the guides that implement each part.

It builds on the flat-state principles in [form state fundamentals and architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/), and it is the structural counterpart to [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/): an array rule such as "line totals must not exceed the budget" is a dependency across a variable number of fields.

---

## Problem statement

A repeatable group has three properties that ordinary fields do not:

1. **Cardinality changes at runtime.** The set of fields is not known at build time; it grows and shrinks as the user works.
2. **Order may be meaningful.** A priority list or itinerary is ordered; a set of tags or contacts may not be. The model must know which.
3. **Rows have identity independent of position.** "The contact for Ada" is the same row whether it is first or third.

Most form bugs in repeatable groups come from conflating identity with position. Array indices are the obvious key — `items[2].price`, `errors["items.2.price"]`, `key={index}` in React — and they are correct only until the first delete or reorder. After that, every piece of state stored by index describes a different row than it did a moment ago.

The pattern applies whenever users can add or remove instances of a group of fields. It matters most when rows carry their own state beyond values: validation errors, touched flags, pending async checks, expanded or collapsed UI, uploaded files.

<svg viewBox="0 0 680 165" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing three rows of a contacts group before and after deleting the second row, with how index-keyed errors and id-keyed errors end up attached." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Index-keyed state after deleting row 2</title>
  <desc>Before the delete, row one is Ada with no error, row two is Grace with an invalid phone error, and row three is Alan with a missing email error. After deleting Grace, index-keyed state still has an error at index one, now showing Alan with Grace&#x27;s invalid phone message, and Alan&#x27;s missing email error is attached to index two, which no longer exists. With id-keyed state, Grace&#x27;s error is removed with her row and Alan keeps his own missing email error.</desc>
  <rect x="0" y="0" width="680" height="165" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Position after delete</text>
  <text x="159.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Row</text>
  <text x="268.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Index-keyed error shown</text>
  <text x="472.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Id-keyed error shown</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">0</text>
  <text x="159.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Ada</text>
  <text x="268.5" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">none</text>
  <text x="472.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">none</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">1</text>
  <text x="159.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Alan</text>
  <text x="268.5" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;invalid phone&quot; (was Grace&#x27;s)</text>
  <text x="472.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">&quot;email is required&quot;</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">(2)</text>
  <text x="159.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">—</text>
  <text x="268.5" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">&quot;email is required&quot; orphaned</text>
  <text x="472.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">removed with Grace</text>
  <text x="14.0" y="152.5" font-size="10" fill="#6b5f75" font-family="inherit">Index keys are correct only until the first structural change. Every delete, insert-above or reorder reshuffles them.</text>
</svg>

---

## State machine specification

Each row moves through a small lifecycle, and the array as a whole has its own validity:

| Row state | Entered by | Leaves on |
|---|---|---|
| `new` | Add row (empty values, not yet touched) | First edit → `editing` |
| `editing` | Edit | Blur/submit → `valid` or `invalid` |
| `valid` / `invalid` | Row validation result | Edit → `editing`; remove → `removed` |
| `removed` | Remove (kept for undo) | Undo → previous state; timeout/submit → gone |

The array-level state is derived, not stored: `tooFew` / `tooMany` from the row count against min and max, and `invalidAggregate` from cross-row rules such as duplicates or totals. Two validation levels run independently — row-level for each row's own fields, array-level for rules about the collection — and their errors render in different places.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a repeatable row from new, through editing and validated states, to removed and either restored by undo or discarded." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A row&#x27;s lifecycle, including undo</title>
  <desc>A row starts as new when added, with empty values and no errors shown. The first edit moves it to editing. Blur or submit validates it into valid or invalid, and further edits return it to editing. Removing a row moves it to removed, where it is hidden but kept with its values, errors and position so undo can restore it exactly. After the undo window or on submit, removed rows are discarded.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="349.2" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">new</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Empty values; no errors shown.</text>
  <text x="393.2" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus moves to its first field and its addition is announced.</text>
  <path d="M188.6,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.6,89.0 188.6,96.0 192.6,89.0" fill="#7b4f8a"/>
  <text x="198.6" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">first edit</text>
  <rect x="14.0" y="97.0" width="349.2" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">editing</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Values change; errors deferred.</text>
  <text x="393.2" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Reward-early, punish-late timing applies per field.</text>
  <path d="M188.6,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.6,174.0 188.6,181.0 192.6,174.0" fill="#7b4f8a"/>
  <text x="198.6" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">blur / submit</text>
  <rect x="14.0" y="182.0" width="349.2" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">valid | invalid</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Row-level validation result.</text>
  <text x="393.2" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Errors keyed by row id, never by index.</text>
  <path d="M188.6,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="184.6,259.0 188.6,266.0 192.6,259.0" fill="#7b4f8a"/>
  <text x="198.6" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">remove</text>
  <rect x="14.0" y="267.0" width="349.2" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">removed (undoable)</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Hidden, values and position kept.</text>
  <text x="393.2" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Undo restores it exactly; timeout or submit discards it.</text>
</svg>

---

## Core implementation

The model below is framework-agnostic. Rows carry a client-generated `id` that never changes; every per-row piece of state is keyed by it. Order lives in one array of ids.

```typescript
export type RowId = string;

export interface ArrayState<V> {
  order: RowId[];                              // the only place position exists
  rows: Record<RowId, V>;                      // values by identity
  errors: Record<RowId, Record<string, string>>;
  touched: Record<RowId, Record<string, boolean>>;
  removed: { id: RowId; index: number; value: V; at: number }[]; // undo stack
}

const newId = (): RowId => crypto.randomUUID();

export function addRow<V>(s: ArrayState<V>, value: V, at = s.order.length): [ArrayState<V>, RowId] {
  const id = newId();
  const order = [...s.order];
  order.splice(at, 0, id);
  return [{ ...s, order, rows: { ...s.rows, [id]: value } }, id];
}

export function removeRow<V>(s: ArrayState<V>, id: RowId): ArrayState<V> {
  const index = s.order.indexOf(id);
  if (index === -1) return s;
  // Keep the row's value for undo; drop its errors and touched flags with it
  // so nothing can be inherited by the row that moves into its place.
  const { [id]: value, ...rows } = s.rows;
  const { [id]: _e, ...errors } = s.errors;
  const { [id]: _t, ...touched } = s.touched;
  return {
    ...s, rows, errors, touched,
    order: s.order.filter((r) => r !== id),
    removed: [...s.removed, { id, index, value, at: Date.now() }],
  };
}

export function moveRow<V>(s: ArrayState<V>, id: RowId, to: number): ArrayState<V> {
  const order = s.order.filter((r) => r !== id);
  order.splice(Math.max(0, Math.min(to, order.length)), 0, id);
  return { ...s, order };                     // nothing else changes: state is keyed by id
}

// Serialise for submission: positions exist only here, at the edge.
export function toPayload<V>(s: ArrayState<V>): V[] {
  return s.order.map((id) => s.rows[id]);
}

// Map server/schema errors that use indices back onto ids at the edge too.
export function errorsFromIndexed<V>(s: ArrayState<V>, byIndex: Record<number, Record<string, string>>) {
  const out: Record<RowId, Record<string, string>> = {};
  for (const [i, e] of Object.entries(byIndex)) {
    const id = s.order[Number(i)];
    if (id) out[id] = e;
  }
  return out;
}

// Array-level rules run on the ordered values and return ONE message each.
export function arrayErrors<V>(s: ArrayState<V>, rules: { min?: number; max?: number;
  unique?: (v: V) => string }): string[] {
  const values = toPayload(s);
  const msgs: string[] = [];
  if (rules.min !== undefined && values.length < rules.min) msgs.push(`Add at least ${rules.min}.`);
  if (rules.max !== undefined && values.length > rules.max) msgs.push(`Remove ${values.length - rules.max} to continue; the limit is ${rules.max}.`);
  if (rules.unique) {
    const seen = new Set<string>();
    if (values.some((v) => { const k = rules.unique!(v); if (seen.has(k)) return true; seen.add(k); return false; })) {
      msgs.push("Each entry must be different.");
    }
  }
  return msgs;
}
```

Two rules make this robust. First, **positions exist only at the edges** — in `order`, in the submitted payload, and in the translation of index-based errors from schemas and servers. Second, **structural operations touch only `order`** except for remove, which deletes the row's own state so nothing can be inherited.

---

## Integration guidance

**Rendering.** In React, `key={id}`; in Vue, `:key="id"`; in Svelte, `{#each order as id (id)}`. The key is what tells the framework that a row moved rather than that its contents changed — the full treatment is in [stable keys for reorderable field arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/). Field `name` attributes can still use positions (`items[2].price`) for native submission, because they are regenerated from `order` on every render.

**Validation.** Run row-level validation per row with the same schema used for the item type, and array-level rules on the ordered payload. Schemas such as Zod report item errors with index paths (`["items", 2, "price"]`); translate them to ids immediately with `errorsFromIndexed`, as detailed in [keeping array errors aligned after reorder and delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/). Minimum and maximum counts have their own UX, covered in [validating minimum and maximum row counts](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/).

**Dirty tracking.** Compare by id, not by position: a reordered-but-otherwise-unchanged ordered list is dirty (order changed), while an unordered set that was reordered is not. Use the set/list distinction from [deep equality for dirty detection on nested values](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/deep-equality-for-dirty-detection-on-nested-values/).

**Accessibility.** Each row is a `fieldset` with a `legend` that includes its position and a meaningful label ("Contact 2: Grace Hopper"). Adding a row moves focus to its first field; removing a row moves focus to a sensible neighbour and announces the removal with an undo option — see [undoing row deletion in repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/) and [keyboard reordering of repeatable rows](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-reordering-of-repeatable-rows/).

**Framework adapters.** React Hook Form's `useFieldArray` generates its own `id` per row for exactly this reason (use `field.id` as the key, never the index); Angular's `FormArray` holds control instances whose identity follows the row, covered in [dynamic FormArray controls in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/dynamic-formarray-controls-in-angular/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing positions existing only at the edges of the array model — incoming data, the order array, the rendered names, and the outgoing payload — while all per-row state in between is keyed by id." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Where position is allowed to exist</title>
  <desc>Incoming data from the server is an ordered array, and each item is given a fresh client id on load. Inside the model, position lives only in the order array, and values, errors, touched flags and pending checks are keyed by id. Rendering derives field names such as items 2 price from the order at render time. The payload is produced by mapping the order back to values, and index-based errors from schemas or the server are translated to ids on arrival.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Load</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Server array.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Assign an id to each item.</text>
  <path d="M156.0,54.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,50.5 183.0,54.5 176.0,58.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Model</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">order: id[]</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Everything else keyed by</text>
  <text x="196.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">id.</text>
  <path d="M326.0,54.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,50.5 353.0,54.5 346.0,58.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Render</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">key = id.</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">name = items[i].x from</text>
  <text x="366.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">order.</text>
  <path d="M496.0,54.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,50.5 523.0,54.5 516.0,58.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submit / errors</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Payload from order.</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Index errors → ids.</text>
</svg>

---

## Ordered lists versus unordered collections

Decide early whether the order of rows means something, because several behaviours hang off that one decision. An itinerary, a ranked list of preferences or the steps of a recipe are **ordered**: moving a row is a real edit, it makes the form dirty, the submitted array must preserve it, and users need a way to reorder by keyboard as well as by drag. A set of email recipients, a list of skills or a group of emergency contacts is usually **unordered**: the order users happen to add rows in is incidental, reordering controls are clutter, dirty checking should ignore order, and the server may sort the items however it likes.

Mixed cases exist. Invoice line items are unordered in meaning but users expect them to stay where they put them, so treat them as ordered for display and unordered for comparison. Whatever you choose, write it next to the field's schema so the dirty check, the reorder UI and the server contract all read the same decision rather than each guessing.

The decision also affects validation messages. For ordered lists, row labels should include position ("Stop 3"), and an error about a specific row should name it by position and content. For unordered collections, position is noise; label rows by their content ("Contact: Grace Hopper") and keep the numbering purely visual.

---

## Edge cases and failure modes

**Rows loaded from the server already have ids.** Use a separate client id anyway, or reuse the server id only if every row has one. New rows do not have a server id until saved, and mixing "has server id" and "does not" as keys invites collisions and remount bugs.

**Duplicate a row.** Copy the values into a new row with a *new* id. Copying the id makes two rows share errors and touched state, and makes the framework treat them as the same element.

**Nested arrays.** A work history where each job has a list of responsibilities is an array of rows each containing an `ArrayState`. The same rules apply recursively; the error path translation needs both levels (`["jobs", 1, "duties", 3]` → `[jobId, dutyId]`).

**Very long lists.** Hundreds of rows need virtualisation, and virtualised rows unmount when scrolled away. Because state is keyed by id in the model, not in components, unmounting loses nothing — the approach in [virtualizing long fieldsets without losing state](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/virtualizing-long-fieldsets-without-losing-state/).

**Autofill into a new row.** Browsers can autofill a newly added address row. Reconcile at submit as with any autofilled field.

**Drag-and-drop libraries.** Many reorder by index callbacks (`onDragEnd(from, to)`). Translate to ids immediately — `moveRow(state, order[from], to)` — so the rest of the model never sees indices.

---

## Troubleshooting reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Error message appears on the wrong row after a delete | Log the error map's keys; if they are numbers, errors are index-keyed | Key errors by row id; translate schema paths on arrival |
| Typed text jumps to another row after reorder | Check the list's render key; index keys reuse DOM nodes | Use the row id as the key |
| Focus lost after removing a row | Check `document.activeElement` after removal — usually `<body>` | Move focus to the next row's legend, previous row, or the Add button |
| "Add at least one" error shows before the user has done anything | Array-level rules running on mount | Show array errors only after submit or after a row has been removed |
| Server 422 highlights the wrong line item | Compare the payload order with the order at response time | Translate index paths using the order that was *sent*, not the current order |

---

## Testing and QA hooks

Give each row a stable test hook tied to its identity, not its position: `data-row-id` on the row's `fieldset`. Tests can then add three rows, delete the second, and assert that the third row's error is still on the element with the third row's id. Avoid `nth-child` selectors in tests for repeatable groups; they encode exactly the index-keyed assumption that produces the bugs.

For accessibility regression tests, assert that after adding a row `document.activeElement` is inside the new row, that the live region contains the add or remove announcement, and that each row's `legend` includes an updated position ("Contact 2 of 3") after reordering. [End-to-end form error tests with Playwright](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/end-to-end-form-error-tests-with-playwright/) shows the selector strategy in full.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of five structural test cases for repeatable groups, the action, and the assertion that proves identity is preserved." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Test cases every repeatable group needs</title>
  <desc>Delete a middle row with errors and assert the following row keeps its own error. Reorder two rows while one has focus and assert typed text stays with its row. Add a row and assert focus is in the new row&#x27;s first field and the addition was announced. Undo a delete and assert the row returns in its original position with its values. Submit after a reorder that the server rejects and assert the error lands on the row that was sent in that position.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Case</text>
  <text x="168.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Action</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Assert</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">delete middle</text>
  <text x="168.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">3 rows with errors; delete #2</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">row #3&#x27;s error still on row #3 (by data-row-id)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">reorder</text>
  <text x="168.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">move row while typing</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">typed text stays with its row</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">add</text>
  <text x="168.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">press Add</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">focus in new row; addition announced</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">undo</text>
  <text x="168.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">delete, then Undo</text>
  <text x="386.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">row restored at its index with values</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">server errors</text>
  <text x="168.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">reorder, submit, 422 by index</text>
  <text x="386.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">error on the row sent at that index</text>
</svg>

---

## Common pitfalls

- **Using the index as the React/Vue key.** The single most common cause of state jumping between rows.
- **Storing errors and touched flags in an array parallel to values.** Parallel arrays must be spliced in lockstep on every operation; one missed splice and they drift.
- **Validating the minimum count on mount.** A new form with zero rows is not an error until the user tries to submit.
- **Deleting without undo.** Row deletion is destructive and easy to trigger by accident; a short undo window is cheaper than a confirmation dialog.
- **Letting the "Add" button keep focus.** Sighted users see the new row; keyboard and screen-reader users need focus moved to it.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I use the array index if my rows are never reordered?</strong></summary>

Only if rows are also never removed from anywhere but the end and never inserted anywhere but the end. Deleting a middle row reshuffles every index after it, which is enough to misattribute errors and focus. Generating an id per row costs one line and removes the whole category of bugs.

</details>

<details>
<summary><strong>Should the client id be sent to the server?</strong></summary>

It is harmless and occasionally useful — for example as an idempotency hint for creating child records, or to map server errors by id instead of index. But the server should not depend on it as a permanent identifier; assign real ids on the server when rows are saved.

</details>

<details>
<summary><strong>How do I show an error that belongs to the whole list?</strong></summary>

Render array-level errors once, at the top of the group's `fieldset`, below its `legend`, and reference them from the `fieldset` with `aria-describedby`. Do not attach them to the first or last row — they are about the collection, and the error summary should link to the group, or to the Add button when the fix is to add a row.

</details>

<details>
<summary><strong>What is the right maximum number of rows?</strong></summary>

Whatever the domain requires, enforced both by hiding or disabling the Add action at the limit (with a visible explanation) and by array-level validation for data that arrives by other routes, such as paste or import. Never silently drop rows beyond the limit.

</details>

---

## Related

- [Stable Keys for Reorderable Field Arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/)
- [Validating Minimum and Maximum Row Counts](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/)
- [Keeping Array Errors Aligned After Reorder and Delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/)
- [Undoing Row Deletion in Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/)

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
