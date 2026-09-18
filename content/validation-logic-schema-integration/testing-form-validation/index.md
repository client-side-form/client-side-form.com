---
layout: page.njk
title: "Testing Form Validation"
description: "A testing strategy for client-side validation: pure rule tests, component tests for timing and ARIA, network mocking for async and server errors, end-to-end tests for real browser behaviour, and property-based tests for edge cases — with selectors that survive refactors."
slug: testing-form-validation
type: topic
breadcrumb: "Testing Validation"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Testing Form Validation"
  parent: "Validation Logic"
  order: 8
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Testing Form Validation",
      "description": "A testing strategy for client-side validation: pure rule tests, component tests for timing and ARIA, network mocking for async and server errors, end-to-end tests for real browser behaviour, and property-based tests for edge cases — with selectors that survive refactors.",
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
          "name": "Testing Form Validation",
          "item": "https://client-side-form.com/validation-logic-schema-integration/testing-form-validation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a layered test strategy for form validation",
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
          "name": "Turning production bugs into regression tests"
        },
        {
          "@type": "HowToStep",
          "name": "Keeping client and server tests in agreement"
        },
        {
          "@type": "HowToStep",
          "name": "What not to test"
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
          "name": "Jest or Vitest?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Either works; the techniques are the same. Vitest's fake timers are API-compatible with Jest's for the parts used here. Choose whichever your build tooling already supports."
          }
        },
        {
          "@type": "Question",
          "name": "Is jsdom good enough for form tests?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For timing, rules and ARIA wiring, yes. It does not implement layout, real focus behaviour in every case, autofill or IME, and its :user-invalid and selection support are limited. Cover those in a small set of real-browser tests."
          }
        },
        {
          "@type": "Question",
          "name": "How many end-to-end tests does a form need?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Few: one happy path, one path through every error type the server can return, and one per real-browser behaviour you rely on (autofill, caret in masked fields). Everything else belongs lower in the stack, where it is faster and less flaky."
          }
        },
        {
          "@type": "Question",
          "name": "Should QA test with real screen readers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, at least for the main error flows before release. Automated checks catch missing labels and broken references; only a screen reader shows whether announcements are timely, not duplicated, and understandable."
          }
        }
      ]
    }
  ]
}
</script>

# Testing Form Validation

Validation bugs slip through test suites because most suites test the wrong layer: they check that the schema rejects `"abc"` as an email — which it always did — and never check that the error appears at the right *time*, on the right *field*, is *announced*, and *clears* when the user fixes it, which is where production bugs actually live.

Form validation has four distinct things to test, each best tested at a different layer: the **rules** (is this value valid?), the **timing** (when is an error shown or cleared?), the **wiring** (is the message attached to the right field and exposed to assistive technology?), and the **integration** (do async checks, server errors and real browser behaviours such as autofill and IME work?). This topic sets out a layered strategy with guides for the techniques that need the most care. It complements the patterns across [validation logic and schema integration](https://www.client-side-form.com/validation-logic-schema-integration/), and supports the QA teams among this site's readers as much as the engineers.

---

## Problem statement

Why form validation is harder to test than it looks:

- **Time is part of the behaviour.** Debounced validators, "show on blur, clear on change" timing and async checks all depend on timing. Tests that use real time are slow and flaky; tests that ignore time miss the bugs.
- **The DOM is part of the contract.** A correct error message that is not linked with `aria-describedby`, or an `aria-invalid` that lags behind the visible state, is a real accessibility bug that rule tests cannot see.
- **The network is part of the flow.** Availability checks, server 422s and conflicts need controlled responses — including slow, failed and out-of-order ones.
- **Real browsers differ from test DOMs.** Autofill, IME composition, caret movement and focus behaviour only happen in real engines.

The strategy: test each concern at the cheapest layer that can observe it, and use a small number of expensive end-to-end tests for what only a real browser shows.

<svg viewBox="0 0 680 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table assigning form validation concerns to test layers — unit tests for rules, component tests for timing and ARIA wiring, integration tests with a mocked network, and end-to-end browser tests — with speed and what each layer can observe." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to test at each layer</title>
  <desc>Unit tests run in milliseconds and cover rules and schemas, including property-based tests. Component tests with fake timers run in tens of milliseconds and cover error timing, aria-invalid and aria-describedby wiring and focus after submit. Integration tests with a mocked network cover async validators, server error mapping and conflicts, including slow and out-of-order responses. End-to-end tests in real browsers are slowest and cover autofill, IME, caret behaviour, real focus and cross-browser differences.</desc>
  <rect x="0" y="0" width="680" height="190" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="161.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Layer</text>
  <text x="187.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Speed</text>
  <text x="320.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Observes</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">unit (pure rules)</text>
  <text x="187.0" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">ms</text>
  <text x="320.4" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">rules, schemas, messages, edge cases</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">component (DOM + fake</text>
  <text x="24.0" y="104.5" font-size="9.5" fill="#1e1a24" font-family="inherit">timers)</text>
  <text x="187.0" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">tens of ms</text>
  <text x="320.4" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">timing, aria-invalid, describedby, focus</text>
  <line x1="14" y1="114.5" x2="666" y2="114.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="134.0" font-size="9.5" fill="#1e1a24" font-family="inherit">integration (mocked network)</text>
  <text x="187.0" y="134.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">100s of ms</text>
  <text x="320.4" y="134.0" font-size="9.5" fill="#6b5f75" font-family="inherit">async checks, 422 mapping, races</text>
  <line x1="14" y1="144.0" x2="666" y2="144.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="163.5" font-size="9.5" fill="#1e1a24" font-family="inherit">end-to-end (real browser)</text>
  <text x="187.0" y="163.5" font-size="9.5" fill="#a63d6f" font-family="inherit">seconds</text>
  <text x="320.4" y="163.5" font-size="9.5" fill="#6b5f75" font-family="inherit">autofill, IME, caret, cross-browser</text>
</svg>

---

## State machine specification

The behaviour under test is itself a state machine per field, and good tests walk its transitions rather than sampling random inputs:

| From | Event | To | Observable |
|---|---|---|---|
| pristine | type (invalid) | editing | no message, no `aria-invalid` |
| editing | blur (invalid) | error shown | message visible, linked, `aria-invalid="true"` |
| error shown | type (valid) | valid | message removed immediately, `aria-invalid` removed |
| any | submit (invalid) | error shown for all | summary focused, each field linked |
| valid | async check pending | pending | status text after delay, no `aria-invalid` |
| pending | async result (taken) | error shown | message, one announcement |

Each row is a test. Writing them as a table in the test file — event, expected state, expected DOM — makes gaps visible and turns the timing policy into an executable specification.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a component test that walks one field through its validation states — typing an invalid value, blurring, fixing it, and submitting — asserting the DOM at each step." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A field&#x27;s timing policy as a test script</title>
  <desc>The test renders the form and types an invalid email; it asserts there is no error message and no aria-invalid. It blurs the field and asserts the message appears, is referenced by aria-describedby, and aria-invalid is true. It types characters that make the email valid and asserts the message disappears on that keystroke. It clears the field and submits, and asserts the error summary receives focus and links to the field.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="414.4" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Type &quot;ada@&quot; (invalid)</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expect: no message, no aria-invalid</text>
  <text x="458.4" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Punish late: nothing while typing.</text>
  <path d="M221.2,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="217.2,89.0 221.2,96.0 225.2,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="414.4" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Blur</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expect: message, describedby, aria-invalid</text>
  <text x="458.4" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The error appears now.</text>
  <path d="M221.2,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="217.2,174.0 221.2,181.0 225.2,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="414.4" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Type &quot;example.com&quot;</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expect: message gone immediately</text>
  <text x="458.4" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Reward early: clears on the fixing keystroke.</text>
  <path d="M221.2,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="217.2,259.0 221.2,266.0 225.2,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="414.4" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Clear and submit</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expect: summary focused, link to field</text>
  <text x="458.4" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit reveals everything at once.</text>
</svg>

---

## Core implementation

A compact component test with Testing Library and Vitest, using fake timers and role- and label-based queries. It encodes the timing table above.

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { SignupForm } from "./SignupForm";

describe("email field timing and wiring", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("shows the error on blur, clears it on the fixing keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SignupForm />);
    const email = screen.getByLabelText("Email address");

    await user.type(email, "ada@");
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText(/enter an email/i)).toBeNull();

    await user.tab();                                     // blur
    const message = screen.getByText(/enter an email like name@example.com/i);
    expect(email).toHaveAttribute("aria-invalid", "true");
    // The message must be programmatically associated, not just nearby.
    expect(email).toHaveAccessibleDescription(expect.stringMatching(/enter an email/i));

    await user.click(email);
    await user.type(email, "example.com");
    expect(message).not.toBeInTheDocument();              // cleared on the keystroke
    expect(email).not.toHaveAttribute("aria-invalid");
  });

  it("focuses the error summary on an invalid submit", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SignupForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    const summary = screen.getByRole("group", { name: /there (is|are) \d+ problems?/i });
    expect(summary).toHaveFocus();
    expect(screen.getByRole("link", { name: /enter your email address/i })).toHaveAttribute("href", "#email");
  });
});
```

`toHaveAccessibleDescription` checks the computed accessible description, which only passes if `aria-describedby` actually resolves — the wiring bug a visual check misses. The guides below cover fake timers for debounced validators, network mocking and end-to-end tests in depth.

---

## Integration guidance

**Selectors.** Query by role and accessible name (`getByLabelText`, `getByRole("button", { name })`). If a test cannot find a field by its label, a screen-reader user cannot either — the test fails for the right reason. For repeatable rows and other structures without unique labels, add `data-testid` or `data-row-id` hooks deliberately, as described in [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/).

**Time.** Debounce, throttle, delayed pending indicators and retry backoff all need controlled clocks. [Testing debounced validation with fake timers](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/testing-debounced-validation-with-fake-timers/) covers the interplay between fake timers, promises and user-event.

**Network.** Mock at the network layer, not by stubbing your fetch wrapper, so the real request code runs. [Mocking async validators with MSW](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/mocking-async-validators-with-msw/) shows deferred responses for race conditions, 429s and 422s.

**Real browsers.** Keep a thin layer of Playwright tests for behaviour only engines show — autofill, focus order, caret movement, IME — as in [end-to-end form error tests with Playwright](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/end-to-end-form-error-tests-with-playwright/).

**Rules.** Pure validators and schemas are ideal for generated inputs: [property-based testing for validators](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/property-based-testing-for-validators/) finds edge cases no hand-written table includes.

**Accessibility scans.** Run axe (via `@axe-core/playwright` or `jest-axe`) on the form in its error state, not only its initial state; many issues — unlabelled error regions, colour-only indicators — only exist once errors are shown.

<svg viewBox="0 0 680 154" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart showing a suggested distribution of form validation tests across layers — many unit and property tests, a solid set of component tests, fewer integration tests and a small number of end-to-end tests." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A healthy distribution of validation tests</title>
  <desc>A suggested distribution for a medium-sized form suite. Around sixty unit and property-based tests cover rules and schemas. Around thirty component tests cover timing, ARIA wiring and focus. Around fifteen integration tests with a mocked network cover async validation and server errors. Around eight end-to-end tests cover behaviour only real browsers show.</desc>
  <rect x="0" y="0" width="680" height="154" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="116.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">unit + property</text>
  <rect x="204.0" y="16.0" width="352.0" height="14" rx="3" fill="#2d6342"/>
  <text x="564.0" y="26.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">60 tests</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">component (timing, ARIA)</text>
  <rect x="204.0" y="42.0" width="176.0" height="14" rx="3" fill="#2d6342"/>
  <text x="388.0" y="52.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">30 tests</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">integration (mocked network)</text>
  <rect x="204.0" y="68.0" width="88.0" height="14" rx="3" fill="#7b4f8a"/>
  <text x="300.0" y="78.5" font-size="9.5" font-weight="700" fill="#7b4f8a" font-family="inherit">15 tests</text>
  <text x="20.0" y="103.5" font-size="10" fill="#1e1a24" font-family="inherit">end-to-end (real browser)</text>
  <rect x="204.0" y="94.0" width="46.9" height="14" rx="3" fill="#b07a55"/>
  <text x="258.9" y="104.5" font-size="9.5" font-weight="700" fill="#1e1a24" font-family="inherit">8 tests</text>
  <text x="14.0" y="142.0" font-size="10" fill="#6b5f75" font-family="inherit">A suggested shape, not a quota: push each concern to the cheapest layer that can observe it.</text>
</svg>

---

## Turning production bugs into regression tests

The most valuable validation tests are the ones written after something went wrong, because they encode a failure that real users actually hit. When a form bug is reported, resist fixing it first. Reproduce it at the lowest layer that can observe it — often a component test with a specific sequence of typing, blurring and submitting, or an integration test with a particular server response — and watch it fail. Then fix the code and keep the test.

Form bugs cluster into a handful of families, and it pays to recognise which family a report belongs to, because each has a characteristic test shape:

- **Timing bugs** ("the error appeared while I was still typing", "the error did not go away when I fixed it") are component tests that walk the field's state table with fake timers.
- **Wiring bugs** ("my screen reader did not say what was wrong", "clicking the error did nothing") are component tests asserting accessible descriptions, `aria-invalid` and focus.
- **Race bugs** ("it said my username was taken, then it wasn't", "the wrong row got the error") are integration tests with deferred responses resolved in a deliberately awkward order.
- **Parsing bugs** ("it would not accept my phone number", "the amount was wrong after saving") are unit tests with the exact input the user typed, plus property-based tests around it.
- **Environment bugs** ("it only fails on my phone", "autofill leaves the field empty") are end-to-end tests in the affected engine, or explicit manual checks if automation cannot reach them.

Keep the original report's wording in the test name. A test called "clears the password mismatch when the password is changed, not only the confirmation" explains itself to the next person who breaks it, and links the test suite back to a real user's experience rather than to an implementation detail.

---

## Keeping client and server tests in agreement

When the same schema validates on both sides, as in [sharing one Zod schema between client and server](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/sharing-one-zod-schema-between-client-and-server/), a shared table of test cases can run against both. Define the cases once — input, expected field, expected message code — and execute them in the client's unit tests against the schema and in the API's tests against the real endpoint. The client run proves the form will show the right message; the server run proves the API rejects the same input with an issue on the same path. When the two ever disagree, a single failing case points straight at the drift.

This also protects the contract between the teams that own each side. A backend change that renames a field, tightens a limit or changes an error code breaks the shared cases immediately, in the backend's own pipeline, rather than surfacing weeks later as a form that shows "Something went wrong" instead of a field error. For APIs that return Problem Details, include the expected JSON Pointer in the case table and assert it on the server side, so the pointer-to-field mapping on the client is guaranteed an input it understands.

---

## What not to test

A validation suite can also be too large. Tests that re-verify a schema library's own behaviour — that `z.string().email()` rejects `"abc"` — add run time without protecting anything you own. Snapshot tests of whole forms change with every design tweak and are approved without reading. Tests that assert internal state of a form library couple the suite to a version and miss user-visible regressions. And end-to-end tests that duplicate what a component test already covers, only slower, make the suite painful to run, which is how suites end up skipped.

A useful filter: for each test, ask what user-visible failure it would catch that no cheaper test already catches. If the answer is "none", delete it or move it down a layer. The distribution chart above is the result of applying that question consistently: lots of cheap, precise tests, and a few expensive ones reserved for behaviour that only a real browser can show.

---

## Edge cases and failure modes

**Tests that pass because nothing renders.** `queryByText(/error/)` returning `null` passes whether the error is correctly absent or the component crashed. Pair absence assertions with a presence assertion on something that should exist (the field itself).

**Flaky async tests.** Real timers plus real network delays produce intermittent failures. Control both: fake timers for debounce, deferred mock responses for network, and `findBy*` queries (which retry) for asynchronous DOM updates.

**Snapshot tests for error messages.** Large DOM snapshots break on every markup change and are approved without review. Assert specific messages and attributes instead.

**Testing implementation details.** Tests that read a form library's internal state break on upgrades and miss user-visible bugs. Assert what users and assistive technology observe.

**Locale-dependent tests.** Number, date and currency tests pass in one locale and fail in another. Set the locale explicitly in tests, and run date tests under several time zones, as discussed in [validating dates across time zones](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/validating-dates-across-time-zones/).

---

## Troubleshooting reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Debounced validation never fires in tests | Check whether fake timers are advanced and user-event knows about them | `userEvent.setup({ advanceTimers })`; advance past the debounce |
| Test times out waiting for an error | Check for a pending promise behind a fake timer | Use `shouldAdvanceTime` or advance timers inside `waitFor` |
| Error found by text but not associated | Assert `toHaveAccessibleDescription` | Fix `aria-describedby` ids; ensure the element exists when referenced |
| Race-condition bug not reproducible | Check that responses resolve in controlled order | Use deferred mock responses and resolve them out of order |
| Passes locally, fails in CI | Compare locale, time zone and viewport | Pin locale and `TZ`; set viewport explicitly |

---

## Testing and QA hooks

For QA teams, the most valuable hooks are stable, meaningful attributes that do not change with styling: `data-field` on each field wrapper with the field's path, `data-state` mirroring the timing state (`pristine`, `editing`, `error`, `valid`, `pending`), and `data-row-id` on repeatable rows. They let manual testers and automation alike see *why* a field looks the way it does, and let end-to-end tests wait for `[data-state="error"]` rather than for arbitrary timeouts.

Pair them with an accessibility checklist per form that testers run with a screen reader: every error announced once, every summary link moving focus into the right field, and no information conveyed by colour alone. The [screen-reader testing matrix for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/screen-reader-testing-matrix-for-form-errors/) lists the combinations worth covering.

---

## Common pitfalls

- **Only testing that the schema rejects bad input.** The schema was rarely the bug; timing and wiring were.
- **Using real time for debounce tests.** Slow and flaky; use fake timers.
- **Stubbing your own fetch wrapper.** It hides bugs in request code; mock at the network layer.
- **Querying by CSS class.** Refactors break tests while accessibility regressions pass them.
- **Scanning only the pristine form for accessibility.** Most error-related issues appear only when errors are visible.

---

## Frequently Asked Questions

<details>
<summary><strong>Jest or Vitest?</strong></summary>

Either works; the techniques are the same. Vitest's fake timers are API-compatible with Jest's for the parts used here. Choose whichever your build tooling already supports.

</details>

<details>
<summary><strong>Is jsdom good enough for form tests?</strong></summary>

For timing, rules and ARIA wiring, yes. It does not implement layout, real focus behaviour in every case, autofill or IME, and its `:user-invalid` and selection support are limited. Cover those in a small set of real-browser tests.

</details>

<details>
<summary><strong>How many end-to-end tests does a form need?</strong></summary>

Few: one happy path, one path through every error type the server can return, and one per real-browser behaviour you rely on (autofill, caret in masked fields). Everything else belongs lower in the stack, where it is faster and less flaky.

</details>

<details>
<summary><strong>Should QA test with real screen readers?</strong></summary>

Yes, at least for the main error flows before release. Automated checks catch missing labels and broken references; only a screen reader shows whether announcements are timely, not duplicated, and understandable.

</details>

---

## Related

- [Testing Debounced Validation With Fake Timers](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/testing-debounced-validation-with-fake-timers/)
- [Mocking Async Validators With MSW](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/mocking-async-validators-with-msw/)
- [End-to-End Form Error Tests With Playwright](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/end-to-end-form-error-tests-with-playwright/)
- [Property-Based Testing for Validators](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/property-based-testing-for-validators/)

← [Validation Logic & Schema Integration](https://www.client-side-form.com/validation-logic-schema-integration/)
