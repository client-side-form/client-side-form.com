---
layout: page.njk
title: "Server Error Reconciliation"
description: "Route a rejected submit to the right place: field-scoped 422s onto their inputs with the rejected value recorded, conflicts to reconciliation, and outages to a retryable banner that leaves fields alone."
slug: server-error-reconciliation
type: topic
breadcrumb: "Validation Logic & Schema Integration > Server Error Reconciliation"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Server Error Reconciliation"
  parent: "Validation Logic"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Server Error Reconciliation",
      "description": "Route a rejected submit to the right place: field-scoped 422s onto their inputs with the rejected value recorded, conflicts to reconciliation, and outages to a retryable banner that leaves fields alone.",
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
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the server error message be shown verbatim?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only as a fallback. Server wording is usually written for whoever is reading logs, may not be localised, and can leak internal vocabulary — 'constraint uq_users_email violated' is accurate and useless. Map the stable code to copy you own, and fall back to the server's message only when the code is unrecognised, so a new rule shipped by the API still surfaces something rather than nothing."
          }
        },
        {
          "@type": "Question",
          "name": "How do I attach a server error to the right field when paths do not match?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "One translation function, tested against captured payloads. It converts the server's vocabulary — JSON Pointer, snake_case, a nested resource path — into the canonical dotted name the form used when it rendered the input. Keeping it in one place means a renamed API field is a single failing test rather than an error that silently stops rendering, and it gives you a natural home for the fallback that promotes unmatched paths to the form-level summary."
          }
        },
        {
          "@type": "Question",
          "name": "Should server errors be persisted with a draft?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Generally no. A server error is a judgement about a specific payload at a specific moment, and by the time a draft is restored it may be hours out of date — the address that was taken may now be free. Persist the answers, let the next submit re-earn any rejection. The exception is a form-level error that is still obviously relevant, such as an account being suspended, and even that is better re-fetched than restored."
          }
        },
        {
          "@type": "Question",
          "name": "What is the right retry behaviour after a 422?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "None automatic. A 422 means the payload was understood and rejected, so retrying the same payload gets the same answer — the retry has to wait for the reader to change something. Keep the idempotency key so that when they do resubmit it is still the same logical request, and re-enable the submit control immediately rather than after a timer, because the reader is the thing you are waiting for."
          }
        }
      ]
    }
  ]
}
</script>

# Server Error Reconciliation

Client-side validation is a courtesy. The server's rejection is the fact. Every form eventually has to render a failure it could not have predicted — an address that is already registered, a coupon that expired between page load and submit, a business rule that only the server can evaluate — and the machinery for that is different from the machinery for "this field is empty".

## Problem Statement

The specific sub-problem is *attribution over time*. A local validation error is a pure function of the current value, so it is always current: change the value and it is recomputed. A server error is a snapshot of a judgement made about one particular payload at one particular moment. It cannot be recomputed locally, it may be stale the instant the reader types, and there is no rule that says when it stops being true.

That difference produces four requirements that a form built only for local validation does not meet:

- **Every server error needs an origin and a subject.** Which field, and what value was rejected. Without the value, there is no way to decide when the error stops applying.
- **Server errors must not be cleared by the same trigger that clears local ones.** A keystroke invalidates a local rule; it does not invalidate a server judgement.
- **Some server errors belong to no field at all.** "Your session expired" and "this order can no longer be modified" have no input to sit beside.
- **Rejections are not all validation.** A 500 and a 422 both fail the submit, and treating them the same tells the reader their input was wrong when the truth is that your service was.

## State Machine Specification

The submission's outcome fans out into four handling paths, and conflating any two of them produces a recognisable bug.

| Response | Meaning | Where it goes | Retry? |
|---|---|---|---|
| `2xx` | accepted | success state; draft discarded | n/a |
| `422` with field paths | per-field validation failure | mapped onto the fields named | after an edit |
| `409` | the record changed underneath | conflict resolution, not validation | after reconciling |
| `4xx` without field paths | form-level refusal — auth, policy, rate limit | the form-level summary | depends |
| `5xx`, network, timeout | your service failed, not their input | a retryable banner; fields untouched | yes, unchanged |

The last row is the one most often collapsed into the second. Marking fields invalid because a gateway timed out blocks a submit the server would have accepted, and it tells the reader they made a mistake they did not make.

<svg viewBox="0 8 690 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A submit response fanning out into four handling paths: field-scoped 422 errors mapped onto inputs, a 409 routed to conflict resolution, a form-level 4xx sent to the summary, and a 5xx or network failure shown as a retryable banner with fields untouched." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One response, four very different destinations</title>
  <desc>The submit response is inspected once. A 422 carrying field paths is mapped onto the named fields, where each error records the value that was rejected. A 409 goes to conflict resolution rather than to validation, because the reader's input was not wrong — the record moved. A 4xx with no field paths, such as an authorisation or policy refusal, goes to the form-level summary, since there is no field to attach it to. A 5xx, a network failure or a timeout produces a retryable banner and leaves every field exactly as it was, because nothing about the reader's input has been judged.</desc>
  <rect x="0" y="8" width="690" height="226" fill="#f9f5fb"/>
  <rect x="14" y="96" width="150" height="60" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="89" y="120" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">submit response</text>
  <text x="89" y="138" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">inspected once</text>
  <path d="M164,126 H192 V44 H220" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M164,126 H192 V98 H220" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M164,126 H192 V152 H220" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <path d="M164,126 H192 V206 H220" fill="none" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="220" y="24" width="180" height="40" rx="7" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="232" y="40" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">422 with field paths</text>
  <text x="232" y="56" font-size="9.5" fill="#6b5f75" font-family="inherit">their input was rejected</text>
  <text x="418" y="48" font-size="9.5" fill="#6b5f75" font-family="inherit">→ onto the named fields, with the rejected value</text>
  <rect x="220" y="78" width="180" height="40" rx="7" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="232" y="94" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">409</text>
  <text x="232" y="110" font-size="9.5" fill="#6b5f75" font-family="inherit">the record moved</text>
  <text x="418" y="102" font-size="9.5" fill="#6b5f75" font-family="inherit">→ conflict resolution, not validation</text>
  <rect x="220" y="132" width="180" height="40" rx="7" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="232" y="148" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">4xx, no field paths</text>
  <text x="232" y="164" font-size="9.5" fill="#6b5f75" font-family="inherit">auth, policy, rate limit</text>
  <text x="418" y="156" font-size="9.5" fill="#6b5f75" font-family="inherit">→ the form-level summary</text>
  <rect x="220" y="186" width="180" height="40" rx="7" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="232" y="202" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">5xx, network, timeout</text>
  <text x="232" y="218" font-size="9.5" fill="#6b5f75" font-family="inherit">your service failed</text>
  <text x="418" y="210" font-size="9.5" fill="#2d6342" font-family="inherit">→ retryable banner; fields untouched</text>
</svg>

## Core Implementation

The reconciler is a pure function from a response to a set of state changes. Keeping it pure is what makes the five rows above testable against captured payloads rather than against a running server.

```typescript
interface ServerFieldError {
  readonly field: string;          // canonical dotted path, matching the rendered name
  readonly message: string;        // shown as-is; the server owns this wording
  readonly code: string;           // stable identifier for analytics and for tests
  /** The exact value that was rejected. This is what makes clearing possible. */
  readonly rejectedValue: unknown;
  readonly origin: 'server';
}

type SubmitOutcome =
  | { kind: 'accepted'; record: unknown }
  | { kind: 'field-errors'; errors: ServerFieldError[] }
  | { kind: 'form-error'; message: string; code: string; retryable: boolean }
  | { kind: 'conflict'; remoteVersion: string }
  | { kind: 'unavailable'; retryAfterMs: number | null };

export function reconcile(res: Response, body: unknown, sent: Record<string, unknown>): SubmitOutcome {
  if (res.ok) return { kind: 'accepted', record: body };

  if (res.status === 409) {
    return { kind: 'conflict', remoteVersion: String((body as any)?.version ?? '') };
  }

  if (res.status === 422 && Array.isArray((body as any)?.errors)) {
    const errors: ServerFieldError[] = [];
    for (const raw of (body as any).errors as any[]) {
      const field = toCanonicalPath(raw.pointer ?? raw.field ?? '');
      // An error we cannot attach to a rendered field must NOT be dropped —
      // it becomes a form-level message instead, or the submit fails silently.
      if (!field) continue;
      errors.push({
        field,
        message: String(raw.detail ?? raw.message ?? 'This value was not accepted'),
        code: String(raw.code ?? 'server_rejected'),
        // Capture what was sent, not what is in the field now: the reader may
        // already have typed something else while the request was in flight.
        rejectedValue: valueAt(sent, field),
        origin: 'server',
      });
    }
    if (errors.length > 0) return { kind: 'field-errors', errors };
  }

  if (res.status >= 500 || res.status === 408) {
    const header = res.headers.get('retry-after');
    return { kind: 'unavailable', retryAfterMs: header ? Number(header) * 1000 : null };
  }

  return {
    kind: 'form-error',
    message: String((body as any)?.detail ?? 'We could not submit this form.'),
    code: String((body as any)?.code ?? `http_${res.status}`),
    retryable: res.status === 429,
  };
}
```

`rejectedValue` is the field that makes everything downstream possible. It is captured from the payload that was *sent*, not from the form's current values, because a reader can keep typing while a request is in flight — and an error attributed to a value they have already replaced is an error that should never have been shown.

## Integration Guidance

Server errors join the same `FieldErrorMap` that local validation produces, which means everything in [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) applies to rendering them. The difference is precedence and lifetime: a server error outranks a local one for the same field, because it was produced with information the client does not have, and it survives triggers that clear local errors.

Path translation is the other integration point, and it is where most of the practical difficulty lives. Servers describe fields in their own vocabulary — JSON Pointer, snake_case, a nested resource path — and the form describes them in the vocabulary its inputs were rendered with. One translation function, tested against captured payloads, is the whole solution; scattering `replace('/', '.')` calls through components is how a renamed API field becomes a silently unrendered error.

The submission lifecycle from [submission state and optimistic updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) supplies the states these outcomes drive. `field-errors` and `form-error` both move the submission to `failed` while keeping the idempotency key, so a corrected retry is still the same logical request.

<svg viewBox="0 8 690 214" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of local and server errors across five properties: what produces them, whether they can be recomputed, what clears them, their precedence for the same field, and whether they survive a page reload." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two kinds of error that only look alike when rendered</title>
  <desc>A local error is produced by a rule in the client's own schema, can be recomputed at any moment, is cleared by the next keystroke, loses precedence to a server error for the same field, and cannot survive a reload because it is derived. A server error is produced by information only the server has, cannot be recomputed locally, is cleared only when the value differs from the one that was rejected, outranks a local error for the same field, and can survive a reload if it is persisted with the draft. Rendering them identically is correct; managing them identically is not.</desc>
  <rect x="0" y="8" width="690" height="214" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="170" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Property</text>
  <text x="230" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Local error</text>
  <text x="440" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Server error</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">produced by</text>
  <text x="230" y="66" font-size="10" fill="#6b5f75" font-family="inherit">a rule you own</text>
  <text x="440" y="66" font-size="10" fill="#6b5f75" font-family="inherit">data only the server has</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">recomputable</text>
  <text x="230" y="100" font-size="10" fill="#2d6342" font-family="inherit">any time</text>
  <text x="440" y="100" font-size="10" fill="#a63d6f" font-family="inherit">never, locally</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">cleared by</text>
  <text x="230" y="134" font-size="10" fill="#6b5f75" font-family="inherit">the next keystroke</text>
  <text x="440" y="134" font-size="10" fill="#7b4f8a" font-family="inherit">a value that differs from the rejected one</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">precedence</text>
  <text x="230" y="168" font-size="10" fill="#6b5f75" font-family="inherit">loses</text>
  <text x="440" y="168" font-size="10" fill="#2d6342" font-family="inherit">wins — it saw more</text>
  <text x="14" y="206" font-size="10" fill="#6b5f75" font-family="inherit">Render them the same way; manage them differently. A single "error" type with no origin field cannot express any of this.</text>
</svg>

## Edge Cases and Failure Modes

**The server names a field the form does not render.** A rule about a derived or server-only field produces an error with nowhere to go. Never drop it — promote it to a form-level message so the reader at least learns why the submit failed.

**The reader edits during the request.** By the time the 422 arrives, the field may hold something else. Because the error records `rejectedValue`, the comparison is trivial: if the current value already differs, the error is stale and must not be rendered at all.

**Two errors for one field.** A server can legitimately return several issues for the same input. Render the first and keep the rest, exactly as [error state mapping patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) prescribes — a field showing four messages at once is a field nobody reads.

**Repeated groups and indices.** `/addresses/1/postcode` refers to a position, and positions move. If the reader deletes a row between submit and response, the error now points at a different row. Key rows by a stable id and translate the index through it, or re-validate after any structural edit.

**A localised message you cannot use.** If the server's wording is not in the reader's language, or is written for an operator rather than a reader, map the `code` to your own copy and treat `message` as a fallback. This is exactly why `code` is required rather than optional.

The submission state each outcome leaves behind is worth writing down too, because it decides what the reader can do next:

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="An accepted submit moves to succeeded, discards the idempotency key and the snapshot, and clears the draft. A field-scoped 422 moves to failed while keeping the key, so a corrected resubmit is still the same logical request, and it re-enables the submit control immediately because the reader is what the form is waiting for. A form-level refusal does the same but has no field to focus, so focus goes to the summary. An unavailable service keeps the key and retries automatically before handing the reader a manual retry." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each outcome leaves the form in</title>
  <desc>An accepted submit moves to succeeded, discards the idempotency key and the snapshot, and clears the draft. A field-scoped 422 moves to failed while keeping the key, so a corrected resubmit is still the same logical request, and it re-enables the submit control immediately because the reader is what the form is waiting for. A form-level refusal does the same but has no field to focus, so focus goes to the summary. An unavailable service keeps the key and retries automatically before handing the reader a manual retry.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="166" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Outcome</text>
  <text x="190" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Submission state</text>
  <text x="350" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Key kept?</text>
  <text x="480" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Reader can</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">accepted</text>
  <text x="190" y="66" font-size="10" fill="#2d6342" font-family="inherit">succeeded</text>
  <text x="350" y="66" font-size="10" fill="#6b5f75" font-family="inherit">no — discarded</text>
  <text x="480" y="66" font-size="10" fill="#6b5f75" font-family="inherit">move on</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">422, field-scoped</text>
  <text x="190" y="100" font-size="10" fill="#a63d6f" font-family="inherit">failed</text>
  <text x="350" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="480" y="100" font-size="10" fill="#6b5f75" font-family="inherit">fix and resubmit</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">4xx, form-level</text>
  <text x="190" y="134" font-size="10" fill="#a63d6f" font-family="inherit">failed</text>
  <text x="350" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="480" y="134" font-size="10" fill="#6b5f75" font-family="inherit">read the summary</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">5xx or network</text>
  <text x="190" y="168" font-size="10" fill="#1e1a24" font-family="inherit">failed, retryable</text>
  <text x="350" y="168" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="480" y="168" font-size="10" fill="#6b5f75" font-family="inherit">wait, or retry now</text>
  <text x="14" y="226" font-size="10" fill="#6b5f75" font-family="inherit">Only the first row discards the key. Every failure keeps it, which is what makes any retry safe.</text>
</svg>

## Troubleshooting Reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Submit fails with nothing on screen | Log how many mapped errors matched a rendered field | Promote unmatched errors to the form-level summary |
| A server error vanishes on the first keystroke | Check whether clearing branches on `origin` | Clear server errors only when the value differs from `rejectedValue` |
| Fields go red after a gateway timeout | Check the branch order — is `>= 500` reached before the 422 branch? | Route 5xx to a retryable banner and leave fields alone |
| An error lands on the wrong row of a repeated group | Compare the path index against the rendered row's id | Key rows by id; re-validate after structural edits |
| The message reads like a stack trace | Check whether `code` is being mapped to house copy | Map codes to your own wording; keep `message` as fallback |

### Who owns the wording

A rejection arrives with two things that could be shown to the reader: a machine-readable code and a human-readable message. Which one you render decides who owns the wording of your form, and the answer should almost always be that you do.

Server messages are written for whoever reads them first, which is usually an engineer looking at a log or a client developer reading API documentation. They leak internal vocabulary — constraint names, table names, the word *validation* — they are frequently untranslated, and they change without notice because nobody considers a message string a breaking change. Rendering them verbatim means your form's copy standards apply to every string except the ones the reader sees at the moment they are most stuck.

Mapping codes to copy you own inverts that. The server's `code` becomes the stable contract, your copy table becomes the wording, and an unrecognised code falls back to the server's message so a rule shipped by the API today still surfaces *something* rather than nothing:

```typescript
// The code is the contract; the message is the fallback. An unmapped code still
// renders — badly worded is strictly better than invisible.
const COPY: Record<string, string> = {
  email_taken:      'That address is already registered — sign in instead?',
  coupon_expired:   'That code has expired. Remove it to continue.',
  address_unserviced: 'We do not deliver to that post code yet.',
};

const messageFor = (e: ServerFieldError) => COPY[e.code] ?? e.message;
```

Two things follow from this that are worth doing deliberately. First, log every unmapped code, because a steady stream of one code means a rule the reader is being told about in the API's voice rather than yours. Second, treat the code list as part of the API contract in review: a new rejection reason that ships without a code is a rejection reason your form cannot speak about properly.

## Testing and QA Hooks

Capture real payloads and test the reconciler against them. A fixture directory of recorded 422, 409, 429 and 500 responses turns the whole surface into fast unit tests, and it catches the case that integration tests never reach: an API that changes its error shape without changing its status code.

```typescript
it('does not render a server error the reader has already edited past', () => {
  const sent = { email: 'ada@example.com' };
  const out = reconcile(res422, body, sent);
  const err = (out as any).errors[0];
  expect(isStale(err, { email: 'ada@example.org' })).toBe(true);   // already changed
  expect(isStale(err, { email: 'ada@example.com' })).toBe(false);  // unchanged
});
```

For end-to-end coverage, assert on `data-error-origin="server"` rather than on message text, and add one test per row of the response table above. The 5xx row is the one worth being strict about: assert that no field carries `aria-invalid` after a simulated gateway failure.

## Common Pitfalls

- **A single `error: string` per field.** With no origin, no code and no rejected value, none of the behaviour on this page is expressible.
- **Clearing every error on change.** It makes server errors disappear on a stray keypress while the problem remains.
- **Rendering 5xx as validation.** It blames the reader for your outage and blocks a submit that would have succeeded.
- **Dropping unmapped errors.** A failed submit with no visible reason is indistinguishable from a broken form.
- **Trusting the message.** Server wording is written for whoever wrote the API. Map codes to copy you control.

---

**Related**

- [Mapping 422 Responses to Field Errors](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/mapping-422-responses-to-field-errors/) — the path translation in full
- [Clearing Server Errors When a Field Changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/) — the lifetime rule, implemented
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/) — the shared shape both kinds of error land in
- [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) — the states these outcomes drive

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)

## Frequently Asked Questions

<details>
<summary><strong>Should the server error message be shown verbatim?</strong></summary>

Only as a fallback. Server wording is usually written for whoever is reading logs, may not be localised, and can leak internal vocabulary — 'constraint uq_users_email violated' is accurate and useless. Map the stable code to copy you own, and fall back to the server's message only when the code is unrecognised, so a new rule shipped by the API still surfaces something rather than nothing.

</details>

<details>
<summary><strong>How do I attach a server error to the right field when paths do not match?</strong></summary>

One translation function, tested against captured payloads. It converts the server's vocabulary — JSON Pointer, snake_case, a nested resource path — into the canonical dotted name the form used when it rendered the input. Keeping it in one place means a renamed API field is a single failing test rather than an error that silently stops rendering, and it gives you a natural home for the fallback that promotes unmatched paths to the form-level summary.

</details>

<details>
<summary><strong>Should server errors be persisted with a draft?</strong></summary>

Generally no. A server error is a judgement about a specific payload at a specific moment, and by the time a draft is restored it may be hours out of date — the address that was taken may now be free. Persist the answers, let the next submit re-earn any rejection. The exception is a form-level error that is still obviously relevant, such as an account being suspended, and even that is better re-fetched than restored.

</details>

<details>
<summary><strong>What is the right retry behaviour after a 422?</strong></summary>

None automatic. A 422 means the payload was understood and rejected, so retrying the same payload gets the same answer — the retry has to wait for the reader to change something. Keep the idempotency key so that when they do resubmit it is still the same logical request, and re-enable the submit control immediately rather than after a timer, because the reader is the thing you are waiting for.

</details>

