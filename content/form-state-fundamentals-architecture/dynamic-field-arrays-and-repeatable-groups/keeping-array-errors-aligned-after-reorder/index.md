---
layout: page.njk
title: "Keeping Array Errors Aligned After Reorder and Delete"
description: "Schemas and servers report array errors by index — items.2.price — but rows move. How to translate index paths to row ids at the moment they arrive, using the order that was validated or sent, so errors stay on their rows through every reorder and delete."
slug: keeping-array-errors-aligned-after-reorder
type: howto
breadcrumb: "Aligned Array Errors"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Keeping Array Errors Aligned After Reorder and Delete"
  parent: "Dynamic Field Arrays and Repeatable Groups"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Keeping Array Errors Aligned After Reorder and Delete",
      "description": "Schemas and servers report array errors by index — items.2.price — but rows move. How to translate index paths to row ids at the moment they arrive, using the order that was validated or sent, so errors stay on their rows through every reorder and delete.",
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
          "name": "Keeping Array Errors Aligned After Reorder and Delete",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/keeping-array-errors-aligned-after-reorder/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep field array errors attached to the right rows",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Snapshot the order with every payload"
        },
        {
          "@type": "HowToStep",
          "name": "Translate as soon as the answer arrives"
        },
        {
          "@type": "HowToStep",
          "name": "Use the snapshot, not the current order"
        },
        {
          "@type": "HowToStep",
          "name": "Drop errors for rows that no longer exist"
        },
        {
          "@type": "HowToStep",
          "name": "Route array-level issues separately"
        },
        {
          "@type": "HowToStep",
          "name": "Normalise server pointers first"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I ask the server to return row ids instead of indices?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, if you send the client row id with each item, the server can echo it in errors, which removes the translation step. It is a good design for APIs you control. You still need the translation for schemas and third-party APIs, so keep the helper."
          }
        },
        {
          "@type": "Question",
          "name": "What if the server reorders items before validating?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Then its indices refer to its own order and cannot be translated reliably. Ask for errors keyed by an identifier you sent, or have the server validate in the received order. This is worth fixing in the API contract rather than working around."
          }
        },
        {
          "@type": "Question",
          "name": "Does this matter for synchronous validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Less, because the order cannot change between validating and receiving the result. Passing the current order as the \"snapshot\" is correct there. The discipline matters for anything asynchronous, which in practice includes most server validation."
          }
        }
      ]
    }
  ]
}
</script>

# Keeping Array Errors Aligned After Reorder and Delete

Every validator you use speaks in indices — Zod reports `["items", 2, "price"]`, a 422 response says `/items/2/price` — but the moment the user drags a row or deletes one above, index 2 is a different line item, and the error lands on a price that is perfectly valid.

In the [dynamic field arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/) model, rows have stable ids and all per-row state is keyed by id. The remaining gap is the boundary: errors arrive from code that knows nothing about ids. This page closes it by translating index paths to ids *immediately*, using a snapshot of the order at the time the data was validated or sent — not the order at the time the answer arrives.

---

## Context and prerequisites

Errors reach an array from three places, with different timing:

- **Synchronous schema validation** — computed from the current values, so the current order is the right one to translate with.
- **Asynchronous validation** (a worker, a debounced check) — computed from values captured some milliseconds ago. The user may have reordered since.
- **Server responses** — computed from the submitted payload, possibly seconds ago. Autosave and slow networks make "the user reordered while the request was in flight" routine.

In every case the correct translation uses the order that *produced* the error. That means capturing the order alongside the payload, and carrying it until the answer comes back.

<svg viewBox="0 0 680 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of the form sending line items in order A, B, C, the user moving C to the top while waiting, and the server returning an error for index 2 that must be translated with the sent order to land on C." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A reorder while a submit is in flight</title>
  <desc>The form sends the payload with rows in order A, B, C and keeps a snapshot of that order. While waiting, the user drags C to the top, so the current order is C, A, B. The server responds that items index 2 price must be positive. Translating with the current order would put the error on B. Translating with the snapshot puts it on C, which is the row that was actually invalid.</desc>
  <rect x="0" y="0" width="680" height="215" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">User</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M122.7,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V199.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="348.0" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">POST items [A, B, C] (snapshot order)</text>
  <path d="M340.0,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="130.7" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">drags C to the top: now [C, A, B]</text>
  <path d="M122.7,97.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,93.0 339.0,97.0 332.0,101.0" fill="#7b4f8a"/>
  <text x="348.0" y="121.0" font-size="9.5" fill="#a63d6f" font-family="inherit">422: items[2].price must be positive</text>
  <path d="M557.3,125.0 H348.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,121.0 341.0,125.0 348.0,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">current order → error on B (wrong)</text>
  <path d="M340.0,153.0 H130.7" stroke="#a63d6f" stroke-width="1.4" fill="none" stroke-dasharray="5 3"/>
  <polygon points="130.7,149.0 123.7,153.0 130.7,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">snapshot order → error on C (right)</text>
  <path d="M340.0,181.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,177.0 123.7,181.0 130.7,185.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: translate at the boundary with the producing order

```typescript
type RowId = string;
type Path = (string | number)[];

export interface IdError { rowId: RowId | null; field: string; message: string } // rowId null = array-level

/**
 * Translate schema/server issues with index paths into id-keyed errors.
 * `arrayKey` is the array's property name ("items"); `orderAtProduction`
 * is the list of row ids in the order the VALIDATED/SENT payload used.
 */
export function translateIssues(
  issues: { path: Path; message: string }[],
  arrayKey: string,
  orderAtProduction: RowId[],
  stillExists: (id: RowId) => boolean,
): { rowErrors: IdError[]; unmatched: { path: Path; message: string }[] } {
  const rowErrors: IdError[] = [];
  const unmatched: { path: Path; message: string }[] = [];
  for (const issue of issues) {
    const [head, index, ...rest] = issue.path;
    if (head !== arrayKey) { unmatched.push(issue); continue; }
    if (typeof index !== "number") {
      // Path is just ["items"]: an array-level issue such as min/max count.
      rowErrors.push({ rowId: null, field: "", message: issue.message });
      continue;
    }
    const rowId = orderAtProduction[index];
    // The row may have been deleted since: its error has nowhere to go and
    // must not be re-attached to whatever row now occupies that index.
    if (!rowId || !stillExists(rowId)) continue;
    rowErrors.push({ rowId, field: rest.join("."), message: issue.message });
  }
  return { rowErrors, unmatched };
}

// JSON Pointer from a server ("/items/2/price") → path array.
export const pointerToPath = (p: string): Path =>
  p.split("/").slice(1).map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"))
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg));
```

```typescript
// Usage on submit: capture the order WITH the payload.
async function submit(state: ArrayState<Item>) {
  const order = [...state.order];                 // snapshot
  const payload = order.map((id) => state.rows[id]);
  const res = await fetch("/api/invoices", { method: "POST", body: JSON.stringify({ items: payload }) });
  if (res.status === 422) {
    const body = await res.json() as { errors: { pointer: string; detail: string }[] };
    const issues = body.errors.map((e) => ({ path: pointerToPath(e.pointer), message: e.detail }));
    const { rowErrors } = translateIssues(issues, "items", order, (id) => id in currentState().rows);
    applyRowErrors(rowErrors);
  }
}
declare function currentState(): ArrayState<Item>;
declare function applyRowErrors(e: IdError[]): void;
declare type ArrayState<T> = { order: string[]; rows: Record<string, T> };
declare type Item = { description: string; price: number };
```

---

## Step-by-step walkthrough

1. **Snapshot the order with every payload.** Whether it goes to a schema, a worker or the server, keep `[...order]` alongside it; it is a few bytes.
2. **Translate as soon as the answer arrives.** Convert index paths to row ids before storing anything. No index-keyed error should ever live in state.
3. **Use the snapshot, not the current order.** The snapshot is the only order in which "index 2" means what the validator meant.
4. **Drop errors for rows that no longer exist.** A deleted row's error must not be inherited by the row that now occupies its index.
5. **Route array-level issues separately.** A path of just `["items"]` is a count or aggregate rule; it goes to the group message, as in [validating minimum and maximum row counts](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/validating-minimum-and-maximum-row-counts/).
6. **Normalise server pointers first.** JSON Pointer, dotted paths and bracket paths all reduce to a path array, following [normalizing nested field error paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/).

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table showing an error at items index 2 translated with the snapshot order and with the current order after two different user actions during the request." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Translating the same issue with different orders</title>
  <desc>If nothing changed during the request, both translations give row C. If the user moved C to the top, the snapshot gives C, which is correct, and the current order gives B, which is wrong. If the user deleted C, the snapshot identifies C, which no longer exists, so the error is dropped; the current order would wrongly attach it to whatever row is at index 2, or to nothing if there are only two rows.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">During the request</text>
  <text x="236.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Snapshot says</text>
  <text x="448.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Current order says</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">nothing changed</text>
  <text x="236.3" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">C</text>
  <text x="448.6" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">C</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">user moved C to the top</text>
  <text x="236.3" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">C</text>
  <text x="448.6" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">B</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">user deleted C</text>
  <text x="236.3" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">C gone: drop the error</text>
  <text x="448.6" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">whatever is now at index 2</text>
</svg>

---

## Failure modes and edge cases

### 1. Translating with the current order

The bug is invisible in testing because testers rarely reorder while a request is in flight. It shows up with autosave on slow connections: errors flicker onto the wrong rows. Always pass the snapshot.

### 2. Nested arrays

For `["jobs", 1, "duties", 3, "text"]`, translate level by level: the outer snapshot maps index 1 to a job id, and that job's own duties snapshot maps index 3 to a duty id. Snapshot every level you send.

### 3. Filtering before sending

If you drop blank rows before submitting, the server's indices refer to the *filtered* list. Build the snapshot from the ids actually sent, after filtering — not from the full order.

### 4. Errors for a row the user is editing

A server error for a row whose value has changed since it was sent may already be fixed. Stamp errors with the value they judged and hide stale ones, as in [merging errors from client, schema and server validators](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/merging-errors-from-multiple-validation-sources/).

### 5. Library-managed arrays

React Hook Form stores errors by index (`errors.items?.[2]?.price`) and moves them with `move`/`remove` operations on the field array. That keeps them aligned for local operations, but server errors set with `setError("items.2.price")` after a reorder need the same snapshot translation before you call `setError`.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of an error from a validator reporting an index path, through normalisation to a path array, translation using the producing order snapshot, an existence check, and storage keyed by row id." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The boundary where indices become ids</title>
  <desc>A validator or server reports an error with an index path such as a JSON pointer. The path is normalised into an array. The index is translated to a row id using the order snapshot that was taken when the data was validated or sent. If that row no longer exists the error is dropped. Otherwise the error is stored keyed by row id and field, and from then on it follows the row through every reorder.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="381.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Issue arrives</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">/items/2/price</text>
  <text x="425.1" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">From Zod, a worker or a 422 body.</text>
  <path d="M204.5,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.5,89.0 204.5,96.0 208.5,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="381.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Normalise path</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">[&quot;items&quot;, 2, &quot;price&quot;]</text>
  <text x="425.1" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One shape for every source.</text>
  <path d="M204.5,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.5,174.0 204.5,181.0 208.5,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="381.1" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Translate with snapshot</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">snapshot[2] → row C</text>
  <text x="425.1" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The order that produced the error, not today&#x27;s order.</text>
  <path d="M204.5,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="200.5,259.0 204.5,266.0 208.5,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="381.1" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Store by id</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">errors[C].price = message</text>
  <text x="425.1" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Deleted rows&#x27; errors are dropped here.</text>
</svg>

---

## Verification checklist

- [ ] No error in state is keyed by an array index.
- [ ] Every validation and submit captures the order it used.
- [ ] Reordering during a slow submit still puts server errors on the rows that were sent at those indices.
- [ ] Deleting a row during a submit drops that row's errors rather than moving them.
- [ ] Array-level issues (path ending at the array) show as the group message.
- [ ] Nested arrays translate each level with its own snapshot.
- [ ] Blank rows filtered before sending are excluded from the snapshot.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I ask the server to return row ids instead of indices?</strong></summary>

Yes, if you send the client row id with each item, the server can echo it in errors, which removes the translation step. It is a good design for APIs you control. You still need the translation for schemas and third-party APIs, so keep the helper.

</details>

<details>
<summary><strong>What if the server reorders items before validating?</strong></summary>

Then its indices refer to its own order and cannot be translated reliably. Ask for errors keyed by an identifier you sent, or have the server validate in the received order. This is worth fixing in the API contract rather than working around.

</details>

<details>
<summary><strong>Does this matter for synchronous validation?</strong></summary>

Less, because the order cannot change between validating and receiving the result. Passing the current order as the "snapshot" is correct there. The discipline matters for anything asynchronous, which in practice includes most server validation.

</details>

---

## Related

- [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
- [Mapping 422 Responses to Field Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/)
- [Stable Keys for Reorderable Field Arrays](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/stable-keys-for-reorderable-field-arrays/)

← [Dynamic Field Arrays and Repeatable Groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/)
