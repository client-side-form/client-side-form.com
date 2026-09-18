---
layout: page.njk
title: "Stable Keys for Reorderable Field Arrays"
description: "Why key={index} makes typed text, focus and uncontrolled input values jump between rows when a field array is reordered or a row is removed — and how to generate, persist and render stable row ids in React, Vue and Svelte."
slug: stable-keys-for-reorderable-field-arrays
type: howto
breadcrumb: "Stable Row Keys"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Stable Keys for Reorderable Field Arrays"
  parent: "Dynamic Field Arrays and Repeatable Groups"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Stable Keys for Reorderable Field Arrays",
      "description": "Why key={index} makes typed text, focus and uncontrolled input values jump between rows when a field array is reordered or a row is removed — and how to generate, persist and render stable row ids in React, Vue and Svelte.",
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
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Stable Keys for Reorderable Field Arrays",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Give field array rows stable keys",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Generate ids when rows enter the client"
        },
        {
          "@type": "HowToStep",
          "name": "Give every new row a fresh id"
        },
        {
          "@type": "HowToStep",
          "name": "Key the rendered row by the id"
        },
        {
          "@type": "HowToStep",
          "name": "Keep using indices for name and labels"
        },
        {
          "@type": "HowToStep",
          "name": "Strip ids before submitting"
        },
        {
          "@type": "HowToStep",
          "name": "Translate library callbacks immediately"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is key={index} ever acceptable?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only for lists that are never reordered, never have items removed or inserted except at the end, and whose rows hold no state outside props. Repeatable form groups almost never meet all three, because deleting a row is the whole point."
          }
        },
        {
          "@type": "Question",
          "name": "Does crypto.randomUUID work everywhere?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is available in all current browsers in secure contexts (HTTPS and localhost) and in Node 19+ globally. For older environments or insecure origins, a counter (row-${++n}) is enough — ids need to be unique within the page, not globally."
          }
        },
        {
          "@type": "Question",
          "name": "Should the key be on the fieldset or on a wrapper component?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On whatever element the list map returns directly. If each row is a component, put the key on it; the component's internal state then follows the row too."
          }
        }
      ]
    }
  ]
}
</script>

# Stable Keys for Reorderable Field Arrays

Rendering repeatable rows with the array index as the key tells the framework that "row 2" is the same element before and after a delete — so it keeps row 2's DOM node, its uncontrolled input value, its focus and its component state, and gives them to whichever row now sits at position 2.

[Dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/) sets out the identity-over-position model. The render key is where that model meets the framework's reconciler. Get it wrong and everything else — id-keyed errors, undo, reorder — is undermined by the DOM itself holding position-keyed state.

---

## Context and prerequisites

Every virtual-DOM and compiled framework reconciles lists by key. When the list changes, it matches old and new children with the same key, reuses their DOM nodes and component instances, and only creates or destroys the unmatched ones. The key therefore *is* the element's identity as far as the framework is concerned.

With `key={index}` the keys after deleting the second of three rows are `0, 1` — the framework sees "row 2 was removed" (the last one), not "row 1 was removed". It destroys the *last* DOM node and patches the props of the remaining two. Anything not driven by props survives on the wrong row:

- the current value of an **uncontrolled** input (the DOM owns it),
- **focus** and text selection,
- **component-local state** such as "expanded", a pending async check, or a date picker's open state,
- CSS transitions and animation state.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing what the framework does when the middle of three rows is deleted, with index keys and with stable id keys, for DOM nodes, uncontrolled values and focus." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Deleting the middle row with index keys and with id keys</title>
  <desc>With index keys, the framework destroys the last DOM node and patches the first two, so the node that held Grace&#x27;s half-typed uncontrolled value now shows Alan&#x27;s props but keeps Grace&#x27;s typed text and focus. With id keys, the framework destroys Grace&#x27;s node and leaves Ada&#x27;s and Alan&#x27;s nodes untouched, so every value and focus stays with its row.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Aspect</text>
  <text x="172.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">key = index</text>
  <text x="424.1" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">key = row id</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Node destroyed</text>
  <text x="172.2" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">the last one (Alan&#x27;s)</text>
  <text x="424.1" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">Grace&#x27;s</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Alan&#x27;s row shows</text>
  <text x="172.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">Grace&#x27;s node, patched with Alan&#x27;s props</text>
  <text x="424.1" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">Alan&#x27;s own node, untouched</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Uncontrolled typed text</text>
  <text x="172.2" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Grace&#x27;s text in Alan&#x27;s row</text>
  <text x="424.1" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">stays with its row</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Focus</text>
  <text x="172.2" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">stays at position 2 (now Alan)</text>
  <text x="424.1" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">lost only if Grace&#x27;s row had it</text>
</svg>

---

## The core pattern: assign ids once, at the edges

```typescript
export type WithId<T> = T & { _rowId: string };

// Assign on the way IN: server data and defaults get ids once, at load.
export function withRowIds<T extends object>(items: T[]): WithId<T>[] {
  return items.map((item) => ({ ...item, _rowId: crypto.randomUUID() }));
}

// Strip on the way OUT: the server never needs the client row id.
export function withoutRowIds<T extends object>(items: WithId<T>[]): T[] {
  return items.map(({ _rowId, ...rest }) => rest as unknown as T);
}

// New rows and duplicates always get a FRESH id.
export const blankRow = <T extends object>(defaults: T): WithId<T> =>
  ({ ...defaults, _rowId: crypto.randomUUID() });

export const duplicateRow = <T extends object>(row: WithId<T>): WithId<T> =>
  ({ ...row, _rowId: crypto.randomUUID() });
```

```tsx
// React
{rows.map((row, i) => (
  <fieldset key={row._rowId} data-row-id={row._rowId}>
    <legend>Contact {i + 1} of {rows.length}</legend>
    {/* name uses the index: fine, it is recomputed on every render */}
    <input name={`contacts[${i}].name`} defaultValue={row.name} />
  </fieldset>
))}
```

```html
<!-- Vue -->
<fieldset v-for="(row, i) in rows" :key="row._rowId" :data-row-id="row._rowId">…</fieldset>

<!-- Svelte -->
{#each rows as row, i (row._rowId)}<fieldset data-row-id={row._rowId}>…</fieldset>{/each}
```

---

## Step-by-step walkthrough

1. **Generate ids when rows enter the client.** Wrap server data with `withRowIds` at load, before it reaches any component, so every row has an id from the first render.
2. **Give every new row a fresh id.** Blank rows and duplicated rows both get `crypto.randomUUID()`; copying an existing id makes two rows share one identity.
3. **Key the rendered row by the id.** `key`, `:key`, or Svelte's keyed each. Put the same id on a `data-row-id` attribute for tests and for mapping DOM events back to rows.
4. **Keep using indices for `name` and labels.** Positions are fine in anything that is recomputed on every render — `name` attributes, "Contact 2 of 3" legends. They are not fine in anything that persists across renders.
5. **Strip ids before submitting.** The payload is built from the ordered rows without `_rowId`, unless your API deliberately accepts it.
6. **Translate library callbacks immediately.** Drag-and-drop and table libraries report `(fromIndex, toIndex)`; convert to ids on the spot, as in [keeping array errors aligned after reorder and delete](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/).

### Why the name attribute can still use positions

It can seem inconsistent to key rows by id while naming their inputs `contacts[2].name`. The difference is lifetime. A key persists across renders — it is how the framework decides which element is which from one render to the next — so it must follow the row. A `name` is read only at the moment the form is serialised: `FormData` walks the DOM in document order and collects each name and value as they are *now*. Because names are recomputed from the current order on every render, the submitted payload is always in the order the user sees. Using ids in names (`contacts[3f2a…].name`) would work too, but most server frameworks expect bracketed indices for arrays, and the ids would have to be stripped on the server. Positions in names, ids in keys: each is used where its lifetime fits.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing unsuitable row keys — the array index, a value field, a random value generated during render, and the server id alone — and why each fails." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the key must not be</title>
  <desc>The array index shifts on delete, insert and reorder. A value field such as email changes as the user types, remounting the row on every keystroke and losing focus, and may not be unique. A random value generated during render changes every render and remounts every row every time. A server id alone is missing for new unsaved rows. A client id assigned once when the row enters the client avoids all four.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Index</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Shifts on delete, insert and</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">reorder.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">A value (email, name)</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Changes as the user types;</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">remounts and drops focus.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Random at render</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">New key every render;</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">every row remounts.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Server id alone</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">New rows have none until</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">saved.</text>
</svg>

---

## Failure modes and edge cases

### 1. Keys generated during render

`key={crypto.randomUUID()}` or `key={Math.random()}` inside the map produces a new key every render, so every row remounts on every keystroke: focus is lost after each character. Ids must be created once and stored with the row.

### 2. Using a field value as the key

`key={row.email}` looks stable until the user edits the email — every keystroke changes the key, remounting the row and dropping focus. It also collides when two rows temporarily hold the same value (two blank rows).

### 3. Server ids plus client ids

When loaded rows have server ids and new rows do not, `key={row.id ?? row.tempId}` works only if a row keeps the *same* key after it is saved. If saving replaces `tempId` with the new server `id`, the key changes and the row remounts mid-edit. Keep the client id for the row's lifetime on screen.

### 4. React Hook Form's `field.id`

`useFieldArray` returns `fields` each with a generated `id`. Use `field.id` as the key, never the index, and do not overwrite it with your own `id` property — the library's `keyName` option exists to avoid that collision.

### 5. Hydration

Ids generated with `crypto.randomUUID()` during server rendering differ from those generated on the client, causing a hydration mismatch on `data-row-id`. Either generate ids only on the client after hydration or serialise the server-generated ids into the page along with the data, as discussed in [hydration sync for SSR forms](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/).

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of a user typing into row three while another row is removed, showing the index-keyed framework reusing the wrong DOM node so the typed text appears in the wrong row." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Typing during a delete, with index keys</title>
  <desc>The user has focus in row three and has typed half an email into an uncontrolled input. A remove action deletes row two. With index keys the framework keeps the DOM nodes at positions zero and one and destroys position two. Row three&#x27;s data moves to position one, but the DOM node at position one is row two&#x27;s old node, so the user&#x27;s half-typed email is gone from view and focus is lost. With id keys, row three&#x27;s node is untouched and the typed text and focus remain.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Framework</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">DOM</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">typing in row 3 (uncontrolled)</text>
  <path d="M122.7,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">remove row 2</text>
  <path d="M122.7,97.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,93.0 339.0,97.0 332.0,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#a63d6f" font-family="inherit">index keys: destroy node at position 2</text>
  <path d="M340.0,125.0 H549.3" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,121.0 556.3,125.0 549.3,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">row 3&#x27;s text and focus gone</text>
  <path d="M557.3,153.0 H130.7" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">id keys: destroy row 2&#x27;s node only</text>
  <path d="M340.0,181.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="549.3,177.0 556.3,181.0 549.3,185.0" fill="#7b4f8a"/>
</svg>

---

## Verification checklist

- [ ] Every row has an id assigned once, when it enters the client.
- [ ] New and duplicated rows receive fresh ids.
- [ ] The rendered key is the row id in every repeatable list.
- [ ] Typing into row 3 while row 2 is removed keeps the text and focus in row 3.
- [ ] Reordering rows keeps each row's expanded state and pending checks with it.
- [ ] No key changes when a row is saved and receives a server id.
- [ ] Server rendering and hydration produce the same row ids, or ids are client-only.
- [ ] Tests locate rows by `data-row-id`, not by position.

---

## Frequently Asked Questions

<details>
<summary><strong>Is key={index} ever acceptable?</strong></summary>

Only for lists that are never reordered, never have items removed or inserted except at the end, and whose rows hold no state outside props. Repeatable form groups almost never meet all three, because deleting a row is the whole point.

</details>

<details>
<summary><strong>Does crypto.randomUUID work everywhere?</strong></summary>

It is available in all current browsers in secure contexts (HTTPS and localhost) and in Node 19+ globally. For older environments or insecure origins, a counter (`row-${++n}`) is enough — ids need to be unique within the page, not globally.

</details>

<details>
<summary><strong>Should the key be on the fieldset or on a wrapper component?</strong></summary>

On whatever element the list map returns directly. If each row is a `<ContactRow>` component, put the key on it; the component's internal state then follows the row too.

</details>

---

## Related

- [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
- [Keyboard Reordering of Repeatable Rows](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/keyboard-reordering-of-repeatable-rows/)
- [Best Practices for Uncontrolled Form State](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/best-practices-for-uncontrolled-form-state/)

← [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
