---
layout: page.njk
title: "Mapping 422 Responses to Field Errors"
description: "Translate JSON Pointer and snake_case error paths into the names your form actually rendered, and route everything that does not match to the summary instead of dropping it."
slug: mapping-422-responses-to-field-errors
type: howto
breadcrumb: "Mapping 422 Responses to Field Errors"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Mapping 422 Responses to Field Errors"
  parent: "Server Error Reconciliation"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Mapping 422 Responses to Field Errors",
      "description": "Translate JSON Pointer and snake_case error paths into the names your form actually rendered, and route everything that does not match to the summary instead of dropping it.",
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
          "name": "Server Error Reconciliation",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Mapping 422 Responses to Field Errors",
          "item": "https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Map a 422 response onto the form fields that produced it",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Collect the names the form actually rendered"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Strip the response envelope from each error path"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Decode JSON Pointer escapes before splitting"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Convert case per segment, leaving indices alone"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Rebuild the path with bracket notation for indices"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Attach matched paths, promote everything else to the summary"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should path translation live on the client or the server?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ideally the server emits the same field names the form rendered, and the whole problem disappears. Where that is not achievable — a shared API, a different naming convention, an envelope you do not control — the translation belongs on the client in exactly one function, tested against captured payloads. What does not work is translating at each call site: the day the API changes, some places update and others silently stop matching."
          }
        },
        {
          "@type": "Question",
          "name": "What should happen to an error the form cannot map?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It goes to the form-level summary with the server's own message, and it is logged. Dropping it produces the worst failure mode this whole area has — a submit that fails with nothing on screen, which readers report as the button not working. Showing an imperfectly worded message is strictly better than showing nothing."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle errors on rows of a repeated group?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Translate the numeric segment into bracket notation so it matches the name the row generated, and keep a map from row id to the index that was submitted. If the reader added or removed rows while the request was in flight, resolve through that map rather than trusting the index — otherwise an error lands on whichever row now occupies that position, which is worse than not rendering it at all."
          }
        }
      ]
    }
  ]
}
</script>

# Mapping 422 Responses to Field Errors

The exact problem: the API returns `{"errors":[{"pointer":"/data/attributes/billing_address/post_code","detail":"..."}]}` and the form rendered an input named `billingAddress.postCode`. Nothing matches, nothing renders, and the reader sees a submit that fails for no visible reason.

## Context and Prerequisites

This is the translation layer inside [server error reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/), which covers when a 422 is the right branch at all. It assumes the form already normalises errors into the shared shape described in [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — the job here is only to turn a server's idea of "which field" into the form's.

## Core Pattern: One Translation Function

```typescript
/** Field names as the form rendered them, e.g. "billingAddress.postCode". */
type CanonicalPath = string;

/**
 * Convert a server-supplied field reference into the name the form used.
 * Kept as ONE function so a renamed API field is a single failing test rather
 * than an error that quietly stops rendering.
 */
export function toCanonicalPath(ref: string, rendered: ReadonlySet<string>): CanonicalPath | null {
  if (!ref) return null;

  // 1. JSON Pointer, with or without an envelope prefix.
  //    "/data/attributes/billing_address/post_code" → ["billing_address","post_code"]
  const segments = ref
    .replace(/^\/?(data\/)?(attributes\/)?/, '')
    .split('/')
    .filter(Boolean)
    // JSON Pointer escaping: ~1 is "/", ~0 is "~". Decode in this order.
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));

  // 2. snake_case → camelCase per segment, leaving numeric indices alone.
  const camel = segments.map((s) =>
    /^\d+$/.test(s) ? s : s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()));

  // 3. Numeric segments become bracket notation so the result matches the
  //    generated input name: "addresses[1].postCode", not "addresses.1.postCode".
  let path = '';
  for (const seg of camel) {
    path += /^\d+$/.test(seg) ? `[${seg}]` : (path ? `.${seg}` : seg);
  }

  // 4. Only return a path the form actually rendered. Anything else is promoted
  //    to a form-level message by the caller rather than silently dropped.
  return rendered.has(path) ? path : null;
}
```

The `rendered` set is what turns a guess into a check. Build it from the names the form actually emitted — not from the schema, which may contain server-only fields — and pass it in. A path that is not in the set is not a translation failure to log and forget; it is an error that must still reach the reader, via the form-level summary.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four translation stages turning a JSON Pointer into a rendered field name: strip the envelope, decode pointer escapes and split, convert snake case to camel case, and convert numeric segments to bracket notation, followed by a membership check against the names the form rendered." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>From a JSON Pointer to the name on the input</title>
  <desc>Stage one strips the response envelope, removing a leading data and attributes prefix. Stage two splits on slashes and decodes JSON Pointer escapes, where tilde one means a slash and tilde zero means a tilde. Stage three converts each snake case segment to camel case while leaving numeric segments alone. Stage four rebuilds the path with numeric segments in bracket notation so the result matches the name a repeated fieldset generated. Finally the result is checked against the set of names the form actually rendered, and anything absent is promoted to a form-level message rather than dropped.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11" fill="#6b5f75" font-family="inherit">/data/attributes/billing_address/post_code</text>
  <rect x="14" y="40" width="156" height="62" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="92" y="62" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · strip envelope</text>
  <text x="92" y="80" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">drop data/, attributes/</text>
  <text x="92" y="94" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">API-specific, not universal</text>
  <path d="M170,71 H190" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="190" y="40" width="156" height="62" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="268" y="62" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · split, unescape</text>
  <text x="268" y="80" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">~1 is a slash</text>
  <text x="268" y="94" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">~0 is a tilde</text>
  <path d="M346,71 H366" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="366" y="40" width="156" height="62" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="444" y="62" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · snake to camel</text>
  <text x="444" y="80" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">per segment</text>
  <text x="444" y="94" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">indices left alone</text>
  <path d="M522,71 H542" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="542" y="40" width="134" height="62" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="609" y="62" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">4 · brackets</text>
  <text x="609" y="80" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">rows[1].postCode</text>
  <text x="609" y="94" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">matches the input</text>
  <rect x="14" y="122" width="662" height="46" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="142" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Then check membership against the names the form actually rendered</text>
  <text x="28" y="160" font-size="9.5" fill="#6b5f75" font-family="inherit">A path that is not in that set is not dropped — it becomes a form-level message, so the submit never fails invisibly.</text>
  <text x="14" y="192" font-size="10" fill="#6b5f75" font-family="inherit">Build the set from rendered names, not from the schema: the schema contains server-only fields that were never inputs.</text>
  <text x="14" y="208" font-size="10" fill="#6b5f75" font-family="inherit">Every stage above is API-specific. That is the argument for one function, not for a clever general algorithm.</text>
</svg>

## Step-by-Step Walkthrough

1. **Collect the rendered names.** As each field registers, add its generated name to a set. This is the ground truth for what can receive an error.

2. **Strip the envelope.** JSON:API wraps paths in `/data/attributes/`; other conventions wrap differently. This step is API-specific and belongs in the one function.

3. **Decode before splitting logic runs.** JSON Pointer escapes `~1` for `/` and `~0` for `~`, and decoding in the wrong order corrupts a field whose name legitimately contains a tilde.

4. **Convert case per segment.** Whole-string conversion breaks indices and acronyms; per-segment conversion with a numeric guard does not.

5. **Rebuild with bracket notation.** The repeated fieldset generated `addresses[1].postCode` when it rendered; the translation has to produce the same string.

6. **Check, then promote or attach.** In the set, attach to that field. Not in the set, promote to the form-level summary with the server's message.

## Failure Modes and Edge Cases

### 1. The error targets the whole object

A rule spanning fields often arrives with a pointer of `""` or `/data`. That is not a translation failure — it is a genuinely form-level error, and it belongs in the summary. Test for it explicitly rather than letting it fall through the "not in the set" branch, because the two deserve different logging.

### 2. Indices shifted between submit and response

`/addresses/1` refers to a position. If the reader removed a row while the request was in flight, position 1 is now a different address. Map through a stable row id where you have one:

```typescript
// The row component knows its id and its current index; keep the mapping so a
// positional pointer can be resolved to the row that was actually submitted.
const rowIndexAtSubmit = new Map<string, number>();  // rowId -> index in the payload
const idForIndex = (i: number) =>
  [...rowIndexAtSubmit].find(([, idx]) => idx === i)?.[0] ?? null;
```

### 3. The server reports a field the reader cannot see

A conditional field that is currently hidden, or a step of a wizard the reader has not reached, may still be named. Attaching an error to a hidden input renders nothing. Promote it to the summary *and* make the summary entry navigate — reveal the section, or move to the step — so the entry is actionable rather than merely informative.

### 4. Several errors, one field

Keep them all in the map and render the first, as elsewhere in the error pipeline. Discarding the rest loses the diagnostic value when somebody asks why a submit failed.

### 5. The API changes shape without changing status

An API that starts returning `field` where it used to return `pointer` will silently stop matching. Fixtures of captured payloads turn that into a failing test the day the API deploys, which is the only reliable defence.

<svg viewBox="0 8 668 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four outcomes of translating a server error path: matched to a visible field, matched to a hidden or unreached field, an object-level pointer, and an unrecognised path. Each row gives where the message goes and whether it is actionable." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Every path ends somewhere the reader can see</title>
  <desc>A path matching a visible rendered field attaches to that field, and the reader can act on it directly. A path matching a field that exists but is hidden — a collapsed section, or a wizard step not yet reached — attaches to the field and also appears in the summary, where the entry reveals or navigates to it. An object-level pointer, which is empty or points at the root, is a form-level rule and goes straight to the summary. An unrecognised path goes to the summary as well, using the server's own message, and is logged so the mismatch is fixed. No branch discards the error.</desc>
  <rect x="0" y="8" width="668" height="210" fill="#f9f5fb"/>
  <rect x="10" y="16" width="648" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="648" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="648" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Translation result</text>
  <text x="248" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Goes to</text>
  <text x="450" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Actionable?</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">a visible rendered field</text>
  <text x="248" y="66" font-size="10" fill="#6b5f75" font-family="inherit">that field</text>
  <text x="450" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes, directly</text>
  <line x1="10" y1="80" x2="658" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">a hidden or unreached field</text>
  <text x="248" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the field and the summary</text>
  <text x="450" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes — the entry reveals it</text>
  <line x1="10" y1="114" x2="658" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">an object-level pointer</text>
  <text x="248" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the summary</text>
  <text x="450" y="134" font-size="10" fill="#6b5f75" font-family="inherit">informative</text>
  <line x1="10" y1="148" x2="658" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">unrecognised</text>
  <text x="248" y="168" font-size="10" fill="#6b5f75" font-family="inherit">the summary, plus a log</text>
  <text x="450" y="168" font-size="10" fill="#1e1a24" font-family="inherit">at least visible</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">No branch discards the error, which is the property that makes "the submit failed and nothing appeared" impossible.</text>
</svg>

Four error-body shapes cover almost every API you will meet, and each needs one line in the adapter:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A JSON:API style body carries an errors array whose entries hold a source object with a pointer. A problem-details body carries an errors object keyed by field name with an array of messages. A flat body carries an errors object mapping field to a single message. A framework-specific body may carry a list of objects with loc arrays. All four are one line each in the adapter, and the point of listing them is that the adapter is the only place that has to know which one this API uses." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four error-body shapes, and the field each carries the path in</title>
  <desc>A JSON:API style body carries an errors array whose entries hold a source object with a pointer. A problem-details body carries an errors object keyed by field name with an array of messages. A flat body carries an errors object mapping field to a single message. A framework-specific body may carry a list of objects with loc arrays. All four are one line each in the adapter, and the point of listing them is that the adapter is the only place that has to know which one this API uses.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Body shape</text>
  <text x="200" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Where the path lives</text>
  <text x="430" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Where the message lives</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">JSON:API style</text>
  <text x="200" y="66" font-size="10" fill="#6b5f75" font-family="inherit">errors[].source.pointer</text>
  <text x="430" y="66" font-size="10" fill="#6b5f75" font-family="inherit">errors[].detail</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">problem details</text>
  <text x="200" y="100" font-size="10" fill="#6b5f75" font-family="inherit">the key of errors{}</text>
  <text x="430" y="100" font-size="10" fill="#6b5f75" font-family="inherit">errors[key][0]</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">flat map</text>
  <text x="200" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the key of errors{}</text>
  <text x="430" y="134" font-size="10" fill="#6b5f75" font-family="inherit">errors[key]</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">loc arrays</text>
  <text x="200" y="168" font-size="10" fill="#6b5f75" font-family="inherit">detail[].loc, a segment list</text>
  <text x="430" y="168" font-size="10" fill="#6b5f75" font-family="inherit">detail[].msg</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Capture one real response of whichever shape your API uses and make it a fixture; the adapter then has a regression test for free.</text>
</svg>

## Verification Checklist

- [ ] A snake_case pointer with an envelope resolves to the rendered camelCase name
- [ ] A numeric segment produces bracket notation matching the generated input name
- [ ] JSON Pointer escapes are decoded, and in the right order
- [ ] An unmatched path appears in the form-level summary rather than vanishing
- [ ] An error on a hidden field is reachable from the summary
- [ ] Captured fixtures cover every error shape the API can return
- [ ] Focus moves to the summary, or to the single field, after the response

---

**Related**

- [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/) — deciding that a 422 is the right branch
- [Clearing Server Errors When a Field Changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/) — what happens after the error is attached
- [Normalizing Nested Field Error Paths](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/normalizing-nested-field-error-paths/) — the same problem for schema issue paths

← [Server Error Reconciliation](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/)

## Frequently Asked Questions

<details>
<summary><strong>Should path translation live on the client or the server?</strong></summary>

Ideally the server emits the same field names the form rendered, and the whole problem disappears. Where that is not achievable — a shared API, a different naming convention, an envelope you do not control — the translation belongs on the client in exactly one function, tested against captured payloads. What does not work is translating at each call site: the day the API changes, some places update and others silently stop matching.

</details>

<details>
<summary><strong>What should happen to an error the form cannot map?</strong></summary>

It goes to the form-level summary with the server's own message, and it is logged. Dropping it produces the worst failure mode this whole area has — a submit that fails with nothing on screen, which readers report as the button not working. Showing an imperfectly worded message is strictly better than showing nothing.

</details>

<details>
<summary><strong>How do I handle errors on rows of a repeated group?</strong></summary>

Translate the numeric segment into bracket notation so it matches the name the row generated, and keep a map from row id to the index that was submitted. If the reader added or removed rows while the request was in flight, resolve through that map rather than trusting the index — otherwise an error lands on whichever row now occupies that position, which is worse than not rendering it at all.

</details>

