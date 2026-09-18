---
layout: page.njk
title: "Dynamic FormArray Controls in Angular"
description: "Build add, remove and reorder rows with Angular's FormArray: typed FormArray of FormGroups, trackBy on control identity, moving controls without losing state, array-level validators for min, max and uniqueness, and focus management on add and remove."
slug: dynamic-formarray-controls-in-angular
type: howto
breadcrumb: "Dynamic FormArray"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Dynamic FormArray Controls in Angular"
  parent: "Angular Reactive Forms Adapters"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Dynamic FormArray Controls in Angular",
      "description": "Build add, remove and reorder rows with Angular's FormArray: typed FormArray of FormGroups, trackBy on control identity, moving controls without losing state, array-level validators for min, max and uniqueness, and focus management on add and remove.",
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
          "name": "Dynamic FormArray Controls in Angular",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/dynamic-formarray-controls-in-angular/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Manage dynamic rows with an Angular FormArray",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Type the array as FormArray"
        },
        {
          "@type": "HowToStep",
          "name": "Track by control instance"
        },
        {
          "@type": "HowToStep",
          "name": "Move instances, not values"
        },
        {
          "@type": "HowToStep",
          "name": "Validate the array as a whole"
        },
        {
          "@type": "HowToStep",
          "name": "Gate array errors"
        },
        {
          "@type": "HowToStep",
          "name": "Manage focus on add and remove"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use FormArray or FormRecord for rows?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use FormArray when order matters or rows are anonymous (line items). Use FormRecord when rows are keyed by a meaningful id and order does not matter (per-user permissions). FormRecord avoids index translation entirely at the cost of explicit ordering."
          }
        },
        {
          "@type": "Question",
          "name": "Does moving controls re-run validators?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Structural changes update the array's value and validity, so array-level validators re-run. Row-level validators do not, because the row's value did not change — which is correct, and another reason to move instances rather than copy values."
          }
        },
        {
          "@type": "Question",
          "name": "How do I support drag-and-drop reordering?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "CDK drag-and-drop reports previousIndex and currentIndex; call moveItemInArray on a copy of items.controls or use removeAt/insert with the instance at previousIndex. Keep keyboard reordering available too, as in keyboard reordering of repeatable rows."
          }
        }
      ]
    }
  ]
}
</script>

# Dynamic FormArray Controls in Angular

A `FormArray` of line items looks simple until rows move: rendering with `@for (… ; track $index)` makes Angular reuse DOM for the wrong row, `removeAt` shifts every later index so validation messages flicker, and the minimum-count rule shows an error before the user has added anything.

Angular's `FormArray` already holds the right thing — *control instances* whose identity follows the row — so most bugs come from rendering and validation code that reintroduces positions. This page builds a typed repeatable group with stable tracking, safe moves, array-level validators and focus handling. It is the Angular implementation of [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/), within the [Angular reactive forms adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/) topic.

---

## Context and prerequisites

What a `FormArray` gives you:

- **Ordered controls** — `at(i)`, `push`, `insert`, `removeAt`, `clear`, and `setControl`.
- **Aggregate state** — the array's `value`, `status` and `errors`, plus array-level validators that see all rows.
- **Identity** — each row is a `FormGroup` *instance*. Its value, touched state, errors and pending async checks live on the instance, so they move with it when you reorder by moving instances.

The things to avoid: tracking rows by `$index`, reordering by copying values between controls (which leaves touched and errors behind), and array validators that fire before the user has interacted.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing moving a FormArray row by copying values between controls with moving the control instance itself, across what moves and what is left behind." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two ways to move row 3 to the top</title>
  <desc>Copying values with patchValue from row three to row one moves only the values; touched flags, errors, pending async validation and the DOM tracked by index stay at their old positions, attached to the wrong rows. Moving the control instance with removeAt and insert moves everything the row owns, and with tracking by control identity the DOM and focus move with it.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">What moves</text>
  <text x="210.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Copy values (patchValue)</text>
  <text x="443.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Move the instance</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">values</text>
  <text x="210.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="443.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">touched / dirty</text>
  <text x="210.3" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">stay at old index</text>
  <text x="443.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">errors, pending checks</text>
  <text x="210.3" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">stay at old index</text>
  <text x="443.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">DOM and focus (track by control)</text>
  <text x="210.3" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">wrong row</text>
  <text x="443.1" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
</svg>

---

## The core pattern: typed rows, identity tracking, instance moves

```typescript
import { Component, ElementRef, inject, viewChildren } from "@angular/core";
import {
  AbstractControl, FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule,
  ValidationErrors, ValidatorFn, Validators,
} from "@angular/forms";

type LineItem = FormGroup<{
  description: import("@angular/forms").FormControl<string>;
  qty: import("@angular/forms").FormControl<number>;
}>;

// Array-level rules: count limits and uniqueness, reported once for the array.
export function rowRules(min: number, max: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const arr = ctrl as FormArray<LineItem>;
    if (arr.length < min) return { minRows: { min } };
    if (arr.length > max) return { maxRows: { max, extra: arr.length - max } };
    const seen = new Set<string>();
    for (const g of arr.controls) {
      const key = g.controls.description.value.trim().toLowerCase();
      if (key && seen.has(key)) return { duplicateRows: true };
      seen.add(key);
    }
    return null;
  };
}

@Component({
  selector: "app-line-items",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form" aria-describedby="items-error">
      <legend>Line items</legend>
      @if (showArrayError()) { <p id="items-error">{{ arrayMessage() }}</p> }
      <div formArrayName="items">
        <!-- track the CONTROL INSTANCE: identity follows the row -->
        @for (row of items.controls; track row; let i = $index) {
          <fieldset [formGroupName]="i" [attr.data-row]="i">
            <legend #rowLegend tabindex="-1">Item {{ i + 1 }} of {{ items.length }}</legend>
            <label [for]="'desc-' + i">Description</label>
            <input [id]="'desc-' + i" formControlName="description" />
            <label [for]="'qty-' + i">Quantity</label>
            <input [id]="'qty-' + i" type="number" formControlName="qty" />
            <button type="button" (click)="move(i, -1)" [disabled]="i === 0">Move up<span class="visually-hidden"> item {{ i + 1 }}</span></button>
            <button type="button" (click)="remove(i)">Remove<span class="visually-hidden"> item {{ i + 1 }}</span></button>
          </fieldset>
        }
      </div>
      <button type="button" (click)="add()">Add item</button>
    </fieldset>`,
})
export class LineItemsComponent {
  private fb = inject(NonNullableFormBuilder);
  form = this.fb.group({ items: this.fb.array<LineItem>([], { validators: rowRules(1, 20) }) });
  get items() { return this.form.controls.items; }
  private submitted = false;
  private legends = viewChildren<ElementRef<HTMLElement>>("rowLegend");

  private newRow(): LineItem {
    return this.fb.group({
      description: this.fb.control("", Validators.required),
      qty: this.fb.control(1, [Validators.required, Validators.min(1)]),
    });
  }

  add() {
    this.items.push(this.newRow());
    // Focus the new row's first input after it renders.
    queueMicrotask(() => document.getElementById(`desc-${this.items.length - 1}`)?.focus());
  }

  remove(i: number) {
    this.items.removeAt(i);
    // Focus a neighbour's legend so keyboard users are not dropped on <body>.
    queueMicrotask(() => {
      const target = this.legends()[Math.min(i, this.items.length - 1)];
      target ? target.nativeElement.focus() : document.querySelector<HTMLElement>("button[type=button]:last-of-type")?.focus();
    });
  }

  move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= this.items.length) return;
    const row = this.items.at(i);
    // Move the INSTANCE: its value, touched, errors and pending checks go with it.
    this.items.removeAt(i, { emitEvent: false });
    this.items.insert(j, row);
  }

  showArrayError() { return (this.submitted || this.items.touched) && !!this.items.errors; }
  arrayMessage() {
    const e = this.items.errors ?? {};
    if (e["minRows"]) return "Add at least one item.";
    if (e["maxRows"]) return `You can add up to ${e["maxRows"].max} items. Remove ${e["maxRows"].extra} to continue.`;
    if (e["duplicateRows"]) return "Each item must have a different description.";
    return "";
  }
}
```

---

## Step-by-step walkthrough

1. **Type the array as `FormArray<LineItem>`.** A factory (`newRow()`) builds each row with the same structure and validators, so every row is consistent.
2. **Track by control instance.** `track row` in the `@for` block (or a `trackBy` returning the control in `*ngFor`) ties DOM to the row's identity — the Angular equivalent of [stable keys for reorderable field arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/).
3. **Move instances, not values.** `removeAt` then `insert` with the same instance carries touched state, errors and pending async validation with the row.
4. **Validate the array as a whole.** One array-level validator reports count limits and uniqueness once, rendered on the array's `fieldset`, not on individual rows.
5. **Gate array errors.** Show them after submit or after the array is touched, following [validating minimum and maximum row counts](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/).
6. **Manage focus on add and remove.** New rows get focus on their first input; removal moves focus to a neighbour's legend, or to the Add button when the array is empty.

### Why the index still appears in the template

The template uses `$index` for `formGroupName`, ids and legends even though tracking is by instance. That is safe for the same reason as in other frameworks: those are recomputed on every render from the current position. `[formGroupName]="i"` re-binds each row's fieldset to the control now at index `i` — which, because tracking is by instance, is the same control the DOM was already showing. The one place an index must never be used is anything that *persists*: a value stored in a map keyed by position, an error collection indexed in parallel to the array, or a `track` expression.

<svg viewBox="0 0 680 255" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of removing the second of three rows from a FormArray, showing the control instance removed, the remaining rows keeping their state, focus moving to the next row&#x27;s legend and the legends renumbering." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Removing a middle row, done right</title>
  <desc>The user activates Remove on item two. removeAt removes that row&#x27;s FormGroup instance, taking its value, errors and pending checks with it. Rows one and three keep their instances and state. Because the template tracks by instance, the DOM for row three is reused and simply renumbered to item two of two. Focus moves to that row&#x27;s legend, and a polite live region announces that item two was removed.</desc>
  <rect x="0" y="0" width="680" height="255" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="388.7" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Remove item 2</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">items.removeAt(1)</text>
  <text x="432.7" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Its instance, value and errors are gone with it.</text>
  <path d="M208.4,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="204.4,89.0 208.4,96.0 212.4,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="388.7" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Other rows unchanged</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Instances 1 and 3 keep their state.</text>
  <text x="432.7" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">track row: DOM for old row 3 is reused, not rebuilt.</text>
  <path d="M208.4,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="204.4,174.0 208.4,181.0 212.4,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="388.7" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Renumber and refocus</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Item 2 of 2&quot; legend focused.</text>
  <text x="432.7" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Announced politely; undo offered if supported.</text>
</svg>

---

## Failure modes and edge cases

### 1. `track $index`

Tracking by index reuses DOM by position, so after a removal the input that had focus now shows the next row's value, and CSS transitions play on the wrong row. Track by the control.

### 2. Array validator runs on every keystroke

An array-level validator re-runs whenever any row's value changes. Keep it cheap (counts and a single pass for duplicates). Expensive cross-row checks belong on submit or in a worker, as in [moving heavy validation to a Web Worker](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/moving-heavy-validation-to-a-web-worker/).

### 3. Server errors by index

A 422 naming `items[2].qty` refers to the order that was sent. Translate with a snapshot of `items.controls` taken at submit, not the current order — see [keeping array errors aligned after reorder and delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/) — then call `setErrors` on that instance.

### 4. `getRawValue()` for payloads

If rows contain disabled controls (a computed line total), `items.value` omits them. Use `getRawValue()` for the payload, as in [typed reactive forms in Angular](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/typed-reactive-forms-in-angular/).

### 5. Patching an array from loaded data

`patchValue` on a `FormArray` updates existing controls but does not add or remove them. When loading a record, rebuild the array to the right length first (`clear()` then `push` a row per item), then patch.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of FormArray operations — push, insert, removeAt, move by removeAt and insert, setControl and patchValue — with whether each preserves the state of other rows and when to use it." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>FormArray operations and what they preserve</title>
  <desc>push adds a row at the end and leaves every other row untouched. insert adds a row at a position and shifts later indices but keeps their instances. removeAt removes one instance and shifts later indices while keeping their instances. Moving by removeAt and insert of the same instance carries the row&#x27;s full state. setControl replaces the instance at an index and discards the old row&#x27;s state, so use it only to reset a row deliberately. patchValue changes values of existing rows but never adds or removes rows.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Operation</text>
  <text x="206.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Other rows&#x27; state</text>
  <text x="403.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Use it to</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">push(row)</text>
  <text x="206.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">untouched</text>
  <text x="403.1" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">add at the end</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">insert(i, row)</text>
  <text x="206.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">instances kept</text>
  <text x="403.1" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">add at a position</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">removeAt(i)</text>
  <text x="206.0" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">instances kept</text>
  <text x="403.1" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">delete one row</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">removeAt + insert (same instance)</text>
  <text x="206.0" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">instances kept</text>
  <text x="403.1" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">move a row with all its state</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">setControl(i, row)</text>
  <text x="206.0" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">replaced row&#x27;s state lost</text>
  <text x="403.1" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">reset one row on purpose</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">patchValue([...])</text>
  <text x="206.0" y="209.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">values only; no add/remove</text>
  <text x="403.1" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">load values after rebuilding length</text>
</svg>

---

## Verification checklist

- [ ] Rows are rendered with tracking by control instance.
- [ ] Moving a row carries its value, touched state, errors and pending checks.
- [ ] Removing a middle row leaves other rows' errors on the correct rows.
- [ ] The minimum-count error does not appear before interaction or submit.
- [ ] Count and uniqueness errors render once, on the array's fieldset.
- [ ] Focus moves into a new row and to a neighbour after removal.
- [ ] Server errors by index are applied to the rows that were sent at those indices.
- [ ] Loading a record rebuilds the array to the right length before patching.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use FormArray or FormRecord for rows?</strong></summary>

Use `FormArray` when order matters or rows are anonymous (line items). Use `FormRecord` when rows are keyed by a meaningful id and order does not matter (per-user permissions). `FormRecord` avoids index translation entirely at the cost of explicit ordering.

</details>

<details>
<summary><strong>Does moving controls re-run validators?</strong></summary>

Structural changes update the array's value and validity, so array-level validators re-run. Row-level validators do not, because the row's value did not change — which is correct, and another reason to move instances rather than copy values.

</details>

<details>
<summary><strong>How do I support drag-and-drop reordering?</strong></summary>

CDK drag-and-drop reports `previousIndex` and `currentIndex`; call `moveItemInArray` on a copy of `items.controls` or use `removeAt`/`insert` with the instance at `previousIndex`. Keep keyboard reordering available too, as in [keyboard reordering of repeatable rows](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-reordering-of-repeatable-rows/).

</details>

---

## Related

- [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
- [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
- [Undoing Row Deletion in Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/)

← [Angular Reactive Forms Adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/angular-reactive-forms-adapters/)
