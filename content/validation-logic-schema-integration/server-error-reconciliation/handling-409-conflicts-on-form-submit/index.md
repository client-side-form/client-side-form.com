---
layout: page.njk
title: "Handling 409 Conflicts on Form Submit"
description: "When someone else changed the record while the user was editing, the server should reject the save with 409 or 412 — and the form should show what changed, keep the user's edits, and let them merge. Optimistic concurrency with versions or ETags, and a field-level merge UI."
slug: handling-409-conflicts-on-form-submit
type: howto
breadcrumb: "409 Conflicts"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Handling 409 Conflicts on Form Submit"
  parent: "Server Error Reconciliation"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Handling 409 Conflicts on Form Submit",
      "description": "When someone else changed the record while the user was editing, the server should reject the save with 409 or 412 — and the form should show what changed, keep the user's edits, and let them merge. Optimistic concurrency with versions or ETags, and a field-level merge UI.",
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
          "name": "Validation Logic & Schema Integration",
          "item": "https://client-side-form.com/validation-logic-schema-integration/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Server Error Reconciliation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Handling 409 Conflicts on Form Submit",
          "item": "https://client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/handling-409-conflicts-on-form-submit/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Detect and resolve edit conflicts on form submit",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Load the record with its version or ETag, and keep that base snapshot"
        },
        {
          "@type": "HowToStep",
          "name": "Send the version with every save"
        },
        {
          "@type": "HowToStep",
          "name": "On 409/412, get the current record"
        },
        {
          "@type": "HowToStep",
          "name": "Compute a per-field three-way merge"
        },
        {
          "@type": "HowToStep",
          "name": "Present conflicts field by field, keep the user's edits"
        },
        {
          "@type": "HowToStep",
          "name": "Save the resolution against the new version"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I lock the record while someone is editing instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pessimistic locks prevent conflicts but create stale locks when people close tabs, and block colleagues for the length of an edit. For most forms, optimistic concurrency with a good conflict screen is less disruptive; locks suit long, exclusive workflows."
          }
        },
        {
          "@type": "Question",
          "name": "ETag and If-Match, or a version field in the body?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Both work. ETags with If-Match are the HTTP-native approach and fit REST APIs with caching; a version field is simpler with RPC-style endpoints and GraphQL. The client logic is the same either way."
          }
        },
        {
          "@type": "Question",
          "name": "Can I show who made the other change?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If the server includes updatedBy and updatedAt in the current record, show them (\"Updated by Grace at 14:32\") — it helps users decide whether to keep their version or talk to their colleague first."
          }
        }
      ]
    }
  ]
}
</script>

# Handling 409 Conflicts on Form Submit

Two people open the same customer record; one fixes the phone number, the other updates the address; the second save silently overwrites the first, and the corrected phone number is gone — no error, no warning, just lost work that someone will rediscover weeks later.

Optimistic concurrency control prevents the silent overwrite: each save states which version it was based on, and the server rejects saves based on a stale version with 409 Conflict (or 412 Precondition Failed when using `If-Match`). The form then has a new job — show the user what changed, keep their edits, and let them resolve the difference. This page, part of [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/), implements both halves.

---

## Context and prerequisites

The server side, briefly:

- Every record carries a **version** (an integer incremented on each write) or an **ETag** (a hash of the representation).
- The client sends the version it loaded — in the body, or as `If-Match: "<etag>"`.
- The server performs the write only if the stored version still matches (`UPDATE … WHERE id = ? AND version = ?`), otherwise returns **409** (version in body) or **412** (`If-Match` precondition failed), ideally with the current record in the response.

The client side needs three snapshots to resolve a conflict:

- **Base** — what the user's form was loaded from.
- **Mine** — what the user wants to save.
- **Theirs** — what the server has now.

Comparing each field across the three gives a precise, per-field picture: changed only by me, changed only by them, changed by both.

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table comparing base, mine and theirs values for four fields of a customer record, with the resulting merge decision for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three-way comparison of one record</title>
  <desc>The phone field is unchanged by me but changed by them, so their value is taken automatically. The address field was changed by me but not by them, so my value is kept automatically. The notes field was changed by both to different values, which is a true conflict requiring the user&#x27;s choice. The email field was changed by neither and stays as it is.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="120.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Base</text>
  <text x="253.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Mine</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Theirs</text>
  <text x="519.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Merge</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">phone</text>
  <text x="120.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">0161 555 010</text>
  <text x="253.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">0161 555 010</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">0161 555 019</text>
  <text x="519.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">take theirs</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">address</text>
  <text x="120.6" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1 High St</text>
  <text x="253.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">7 Mill Lane</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">1 High St</text>
  <text x="519.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">keep mine</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">notes</text>
  <text x="120.6" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">VIP</text>
  <text x="253.4" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">VIP, prefers email</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">VIP, call before 5pm</text>
  <text x="519.0" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">choose</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">email</text>
  <text x="120.6" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">a@x.com</text>
  <text x="253.4" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">a@x.com</text>
  <text x="386.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">a@x.com</text>
  <text x="519.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">unchanged</text>
</svg>

---

## The core pattern: version-guarded save and a three-way merge

```typescript
type Rec = Record<string, unknown> & { id: string; version: number };

export type MergeField = { field: string; base: unknown; mine: unknown; theirs: unknown;
  resolution: "mine" | "theirs" | "conflict" | "same" };

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function threeWay(base: Rec, mine: Rec, theirs: Rec): MergeField[] {
  const fields = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  fields.delete("id"); fields.delete("version");
  return [...fields].map((field) => {
    const [b, m, t] = [base[field], mine[field], theirs[field]];
    const iChanged = !eq(b, m), theyChanged = !eq(b, t);
    const resolution =
      !iChanged && !theyChanged ? "same" :
      iChanged && !theyChanged ? "mine" :
      !iChanged && theyChanged ? "theirs" :
      eq(m, t) ? "same" : "conflict";               // both changed to the same value: no conflict
    return { field, base: b, mine: m, theirs: t, resolution };
  });
}

export async function saveWithConcurrency(base: Rec, mine: Rec) {
  const res = await fetch(`/api/customers/${mine.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": `"${base.version}"` },
    body: JSON.stringify(mine),
  });
  if (res.status === 409 || res.status === 412) {
    // Prefer the server's current record in the response; fetch it if absent.
    const theirs: Rec = (await res.json().catch(() => null))?.current
      ?? (await (await fetch(`/api/customers/${mine.id}`)).json());
    const merge = threeWay(base, mine, theirs);
    // Auto-resolvable fields are pre-applied; true conflicts need a decision.
    const proposed: Rec = { ...theirs };
    for (const f of merge) if (f.resolution === "mine") proposed[f.field] = f.mine;
    return { status: "conflict" as const, theirs, merge, proposed };
  }
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  return { status: "saved" as const, record: (await res.json()) as Rec };
}
```

The conflict UI shows a banner ("This customer was updated by someone else while you were editing"), lists auto-merged changes for information, and for each true conflict offers both values with a clear choice. Saving the resolution sends `proposed` (with the user's choices applied) based on `theirs.version` — so a *third* concurrent change is also detected.

---

## Step-by-step walkthrough

1. **Load the record with its version or ETag, and keep that base snapshot.** The base is what makes a three-way comparison possible; without it you can only show "yours vs theirs" and cannot tell who changed what.
2. **Send the version with every save.** `If-Match` with an ETag, or a `version` field in the body — the server rejects stale writes.
3. **On 409/412, get the current record.** Ideally the server includes it in the response to save a round trip.
4. **Compute a per-field three-way merge.** Fields changed on one side only are resolved automatically; fields changed on both sides to different values are real conflicts.
5. **Present conflicts field by field, keep the user's edits.** Never discard "mine". Show both values side by side with labels ("Your change" / "Their change"), and pre-select nothing for true conflicts.
6. **Save the resolution against the new version.** The next save is itself version-guarded, so if a third person edits meanwhile, the process repeats rather than overwriting them.

### Why "last write wins" is not a neutral default

Without concurrency control, the second save silently wins, and it feels harmless because nothing errors. But the loss is real, invisible and discovered late — a corrected phone number reverts, a cancelled order is re-enabled. The cost of optimistic concurrency is small: a version column and a `WHERE` clause on the server, and a conflict screen that most users rarely see. The cost of skipping it is data loss that looks like user error. For any form editing shared records — CRM entries, tickets, settings pages multiple admins use — version checks should be the default, and the conflict screen part of the design from the start.

<svg viewBox="0 0 680 255" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of editor A and editor B loading version 7 of a record, A saving successfully to version 8, and B&#x27;s save being rejected with a conflict, merged and saved as version 9." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two editors, one record</title>
  <desc>Editor A and editor B both load the customer at version 7. A changes the phone number and saves with If-Match 7; the server accepts and the record becomes version 8. B changes the address and saves with If-Match 7; the server rejects with 412 and returns version 8. B&#x27;s form computes a three-way merge: the phone change is theirs, the address change is B&#x27;s, and nothing conflicts. B confirms, and the merged record saves with If-Match 8, becoming version 9 with both changes.</desc>
  <rect x="0" y="0" width="680" height="255" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Editor A</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Editor B</text>
  <path d="M122.7,41.0 V239.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V239.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V239.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">load v7</text>
  <path d="M340.0,69.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,65.0 123.7,69.0 130.7,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">load v7</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">PUT phone, If-Match 7 → v8</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">PUT address, If-Match 7</text>
  <path d="M557.3,153.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,149.0 341.0,153.0 348.0,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#a63d6f" font-family="inherit">412 + current v8</text>
  <path d="M340.0,181.0 H549.3" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,177.0 556.3,181.0 549.3,185.0" fill="#7b4f8a"/>
  <text x="348.0" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">merged (phone theirs, address mine),</text>
  <text x="348.0" y="217.0" font-size="9.5" fill="#2d6342" font-family="inherit">If-Match 8 → v9</text>
  <path d="M557.3,221.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,217.0 341.0,221.0 348.0,225.0" fill="#7b4f8a"/>
</svg>

---

## Failure modes and edge cases

### 1. Comparing only two versions

"Yours vs theirs" without the base cannot distinguish "they changed the phone" from "you changed it back". Users then have to re-decide every differing field, including ones only the other person touched.

### 2. Treating 409 as a validation error

A conflict is not a problem with the user's input. Do not mark fields invalid or show red errors; use a distinct, calm conflict state, as in the routing from [problem details (RFC 9457) for form errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/problem-details-rfc-9457-for-form-errors/).

### 3. Arrays and nested objects

Per-field comparison of whole arrays reports a conflict whenever both sides edited any line item. For repeatable groups, merge per row by row id, and per field within each row, using the identity model from [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/).

### 4. Autosave and conflicts

Autosave makes conflicts frequent and invisible. When an autosave gets 409, stop autosaving, show the conflict banner, and let the user resolve before continuing — similar to the cross-tab lease in [syncing drafts across tabs with BroadcastChannel](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/syncing-drafts-across-tabs-with-broadcastchannel/).

### 5. Accessibility of the merge UI

Conflict choices are radio groups per field ("Keep your change" / "Use their change") with the values as text, inside a `fieldset` whose `legend` names the field. Move focus to the conflict banner when it appears, and announce the number of conflicts.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing the sections of a conflict resolution screen — the banner, the auto-merged changes list and the per-field conflict choices." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The conflict screen, in order</title>
  <desc>A banner at the top explains that the record was changed by someone else while the user was editing, receives focus, and states how many fields need a decision. Below it, an informational list shows changes merged automatically, such as their new phone number and the user&#x27;s new address. Then each true conflict is a fieldset with the field name as legend and two radio options, keep your change or use their change, each showing the value.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Banner (focused)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Updated by someone else while you</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">were editing.&quot;</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;1 field needs your decision.&quot;</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Merged automatically</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Phone: their new number.</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Address: your change kept.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Needs a decision</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Notes: keep yours or use theirs?</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Radio pair, values as text.</text>
</svg>

---

## Verification checklist

- [ ] Every save sends the version or ETag it was based on.
- [ ] A stale save is rejected with 409 or 412, never silently applied.
- [ ] The conflict screen keeps every edit the user made.
- [ ] Fields changed on only one side are merged automatically and listed.
- [ ] True conflicts require an explicit choice per field.
- [ ] The resolved save is itself version-guarded.
- [ ] Autosave stops on conflict until the user resolves it.
- [ ] The conflict banner receives focus and announces the number of decisions needed.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I lock the record while someone is editing instead?</strong></summary>

Pessimistic locks prevent conflicts but create stale locks when people close tabs, and block colleagues for the length of an edit. For most forms, optimistic concurrency with a good conflict screen is less disruptive; locks suit long, exclusive workflows.

</details>

<details>
<summary><strong>ETag and If-Match, or a version field in the body?</strong></summary>

Both work. ETags with `If-Match` are the HTTP-native approach and fit REST APIs with caching; a version field is simpler with RPC-style endpoints and GraphQL. The client logic is the same either way.

</details>

<details>
<summary><strong>Can I show who made the other change?</strong></summary>

If the server includes `updatedBy` and `updatedAt` in the current record, show them ("Updated by Grace at 14:32") — it helps users decide whether to keep their version or talk to their colleague first.

</details>

---

## Related

- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
- [Resolving Conflicts When Restoring a Draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/)
- [Syncing Default Values When Initial Data Changes](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/syncing-default-values-when-initial-data-changes/)

← [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)
