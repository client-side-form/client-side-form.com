---
layout: page.njk
title: "End-to-End Form Error Tests With Playwright"
description: "Test what only a real browser shows: error summaries receiving focus, summary links landing in fields, accessible names and descriptions, keyboard-only submission, autofill reconciliation and caret behaviour — with role-based locators, axe scans in the error state and stable waiting."
slug: end-to-end-form-error-tests-with-playwright
type: howto
breadcrumb: "Playwright E2E"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "End-to-End Form Error Tests With Playwright"
  parent: "Testing Form Validation"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "End-to-End Form Error Tests With Playwright",
      "description": "Test what only a real browser shows: error summaries receiving focus, summary links landing in fields, accessible names and descriptions, keyboard-only submission, autofill reconciliation and caret behaviour — with role-based locators, axe scans in the error state and stable waiting.",
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
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "End-to-End Form Error Tests With Playwright",
          "item": "https://client-side-form.com/validation-logic-schema-integration/testing-form-validation/end-to-end-form-error-tests-with-playwright/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Write end-to-end form error tests with Playwright",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Locate by role and label only"
        },
        {
          "@type": "HowToStep",
          "name": "Submit the way users do"
        },
        {
          "@type": "HowToStep",
          "name": "Assert focus after submit"
        },
        {
          "@type": "HowToStep",
          "name": "Follow summary links and assert visibility"
        },
        {
          "@type": "HowToStep",
          "name": "Scan the error state with axe"
        },
        {
          "@type": "HowToStep",
          "name": "Control the server response"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can Playwright test screen-reader output?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not directly — it cannot run NVDA or VoiceOver. It can assert the accessibility tree through accessible names, descriptions and roles, and snapshot it with toMatchAriaSnapshot. Real screen-reader checks remain a manual or specialised-tool task, described in the screen-reader testing matrix for form errors."
          }
        },
        {
          "@type": "Question",
          "name": "Should end-to-end tests hit a real backend?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Some should — a smoke test of the full flow against a staging environment catches contract drift. Error-scenario tests are more reliable with mocked responses, because producing a 409 or a 429 on demand from a real backend is awkward and slow."
          }
        },
        {
          "@type": "Question",
          "name": "How do I keep the suite fast?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Keep it small, run tests in parallel, reuse authentication state, and push anything that does not need a real browser down to component tests. A handful of well-chosen tests per form covers the behaviours only browsers reveal."
          }
        }
      ]
    }
  ]
}
</script>

# End-to-End Form Error Tests With Playwright

Component tests can prove an error message is rendered and wired; only a real browser proves that pressing Enter on the last field submits the form, that focus actually lands in the error summary, that following a summary link scrolls to and focuses the right input under a sticky header, and that autofill and masked inputs behave.

Playwright drives Chromium, Firefox and WebKit with the same API, and its role- and label-based locators double as an accessibility check: if a test cannot find a field by its label, neither can a screen-reader user. This page, part of [testing form validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/), writes a compact set of end-to-end tests for form errors, including an axe scan in the error state.

---

## Context and prerequisites

Tools used:

- **Locators** — `page.getByLabel("Email address")`, `page.getByRole("button", { name: "Create account" })`, `page.getByRole("link", { name: /enter your email/i })`. They auto-wait and retry.
- **Web-first assertions** — `await expect(locator).toBeFocused()`, `toHaveAttribute`, `toHaveAccessibleDescription`, `toBeInViewport`. They retry until the condition holds or times out, removing arbitrary sleeps.
- **Keyboard** — `page.keyboard.press("Tab")`, `locator.press("Enter")`, `pressSequentially` for realistic typing.
- **`@axe-core/playwright`** — runs axe accessibility rules against the live page.
- **Network control** — `page.route` for server responses, or MSW handlers shared with unit tests.

Keep the end-to-end suite small and focused on behaviour lower layers cannot observe.

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of form behaviours that require a real browser to test, with the Playwright technique used for each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What only the end-to-end layer can see</title>
  <desc>Implicit submission by pressing Enter in a text field is tested with locator press Enter. Focus moving to the error summary is tested with toBeFocused. Summary links focusing the field under a sticky header are tested with toBeFocused and toBeInViewport. Autofill reconciliation is tested by filling fields without input events through page evaluate or a browser profile. Caret position in masked inputs is tested by reading selectionStart after typing mid-value. Cross-engine differences are tested by running the same tests in Chromium, Firefox and WebKit projects.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Behaviour</text>
  <text x="332.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Playwright technique</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Enter submits the form</text>
  <text x="332.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">locator.press(&quot;Enter&quot;)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">summary receives focus</text>
  <text x="332.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">expect(summary).toBeFocused()</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">link lands in field, visible</text>
  <text x="332.8" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">toBeFocused() + toBeInViewport()</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">autofill reconciled at submit</text>
  <text x="332.8" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">set .value without events, then submit</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">caret stays mid-value</text>
  <text x="332.8" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">evaluate(el =&gt; el.selectionStart)</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">engine differences</text>
  <text x="332.8" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">chromium, firefox, webkit projects</text>
</svg>

---

## The core pattern: a small, focused error suite

```typescript
// tests/signup-errors.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("signup form errors", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/signup"); });

  test("Enter on an empty form shows a focused summary with working links", async ({ page }) => {
    await page.getByLabel("Full name").press("Enter");                      // implicit submission

    const summary = page.getByRole("group", { name: /there are \d+ problems/i });
    await expect(summary).toBeFocused();

    const link = summary.getByRole("link", { name: "Enter your email address" });
    await link.click();
    const email = page.getByLabel("Email address");
    await expect(email).toBeFocused();
    await expect(email).toBeInViewport();                                   // not hidden under the sticky header
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription(/enter your email address/i);
  });

  test("fixing a field clears its error without another submit", async ({ page }) => {
    await page.getByRole("button", { name: "Create account" }).click();
    const email = page.getByLabel("Email address");
    await email.pressSequentially("ada@example.com");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter your email address")).toHaveCount(0);
  });

  test("the error state has no axe violations", async ({ page }) => {
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("group", { name: /problems/ })).toBeVisible();
    const results = await new AxeBuilder({ page }).include("form").analyze();
    expect(results.violations).toEqual([]);
  });

  test("server 422 lands on the right field", async ({ page }) => {
    await page.route("**/api/signup", (route) => route.fulfill({
      status: 422, contentType: "application/problem+json",
      body: JSON.stringify({ type: "https://api.example.com/problems/validation",
        errors: [{ pointer: "#/email", detail: "That email is used by another account." }] }),
    }));
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByLabel("Create a password").fill("correct horse battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByLabel("Email address")).toHaveAccessibleDescription(/used by another account/);
  });
});
```

---

## Step-by-step walkthrough

1. **Locate by role and label only.** If `getByLabel("Email address")` fails, the label is missing or broken — a real accessibility bug surfaced by the test.
2. **Submit the way users do.** Press Enter in a field and click the button in separate tests; implicit submission has its own rules, covered in [implicit submission and the Enter key](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/implicit-submission-and-the-enter-key/).
3. **Assert focus after submit.** The summary (or first invalid field) must be focused; `toBeFocused` retries until it is, so no sleeps are needed.
4. **Follow summary links and assert visibility.** Focus alone is not enough if a sticky header covers the field; `toBeInViewport` catches that, as in [scrolling invalid fields into view under sticky headers](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/scrolling-invalid-fields-into-view-under-sticky-headers/).
5. **Scan the error state with axe.** Scan after errors are visible; include only the form to keep results focused and stable.
6. **Control the server response.** `page.route` (or shared MSW handlers) produces 422, 409 and 5xx responses so server-error mapping is tested end to end.

### Why the error state needs its own accessibility scan

Accessibility scans are commonly run once, on page load, where forms look fine: every input has a label, contrast is good, nothing is invalid. The problems appear when errors do — an error container with an `id` referenced before it exists, an error summary heading that skips levels, red text on a pink background that fails contrast, an `aria-describedby` pointing at a removed element, duplicate ids when the same error component renders twice. None of these exist in the initial state, so none are caught unless the scan runs after a failed submit. Adding one scan in the error state to each important form catches a class of regressions that otherwise reach users.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of the first Playwright test — pressing Enter on an empty form, checking the summary is focused, following a link, and checking the field is focused, visible and correctly described." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One test, as a user would experience it</title>
  <desc>The test presses Enter in the full name field, which submits the empty form. It waits for the error summary group, named by its heading, to receive focus. It activates the summary link for the email error. It checks that the email input is focused, is inside the viewport rather than under the sticky header, has aria-invalid true, and has an accessible description containing the error message.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="371.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Press Enter in &quot;Full name&quot;</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Implicit submission.</text>
  <text x="415.1" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No mouse involved.</text>
  <path d="M199.5,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.5,89.0 199.5,96.0 203.5,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="371.1" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Summary focused</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">toBeFocused() on the group.</text>
  <text x="415.1" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Named by its heading: &quot;There are 3 problems&quot;.</text>
  <path d="M199.5,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.5,174.0 199.5,181.0 203.5,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="371.1" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Follow the email link</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">getByRole(&quot;link&quot;, { name })</text>
  <text x="415.1" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The link text is the error message.</text>
  <path d="M199.5,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.5,259.0 199.5,266.0 203.5,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="371.1" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Field focused, visible, described</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">toBeFocused, toBeInViewport, description</text>
  <text x="415.1" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Exactly what a keyboard or screen-reader user needs.</text>
</svg>

### Keeping selectors meaningful as the UI evolves

Role- and label-based locators have a second benefit beyond accessibility: they survive visual redesigns. A test that finds "the button named Create account" keeps working when the button moves, changes colour or gains an icon, and fails only when its accessible name changes — which is a change users of assistive technology would notice too. Where a form has genuinely ambiguous elements, such as several "Remove" buttons in a repeatable group, prefer giving each a more specific accessible name ("Remove contact 2") over adding test ids, because the more specific name also helps screen-reader users. Reserve `data-testid` for structure with no meaningful accessible name at all.

---

## Failure modes and edge cases

### 1. Asserting on text that is not associated

`getByText("Enter your email address")` finds the message even if `aria-describedby` is broken. Always pair it with `toHaveAccessibleDescription` on the input.

### 2. Flaky focus assertions

Focus moves after a render or an animation. Web-first assertions retry; avoid `evaluate(() => document.activeElement)` snapshots taken once, which race with the update.

### 3. Autofill is hard to simulate

Real browser autofill cannot be triggered from tests. Simulate its effect — set `input.value` in `page.evaluate` without dispatching events — and assert that submit reconciles it, per [handling browser autofill in controlled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/).

### 4. Viewport-dependent behaviour

Sticky headers and scrolling differ between desktop and mobile viewports. Run the focus-and-visibility test in at least one mobile project (`devices["iPhone 13"]`) as well as desktop.

### 5. Axe results that vary

Scanning the whole page includes third-party widgets and changes with unrelated content. Scope scans with `.include("form")` and disable rules only with a comment explaining why.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards listing the minimum end-to-end tests for an important form — keyboard submission with summary focus, live correction, server error mapping and an accessibility scan in the error state." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The minimum end-to-end set for an important form</title>
  <desc>The first test submits with Enter on an empty form and checks the summary is focused and its links land in visible fields. The second checks that fixing a field clears its error without resubmitting. The third mocks a 422 and checks the error lands on the right field. The fourth runs axe on the form in its error state.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Keyboard submit</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Enter → summary focused.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Links land, visible.</text>
  <rect x="180.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Live correction</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Fix clears error.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No resubmit needed.</text>
  <rect x="347.0" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Server mapping</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">422 → right field.</text>
  <rect x="513.5" y="12.0" width="152.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Axe in error state</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Scoped to the form.</text>
</svg>

---

## Verification checklist

- [ ] All locators use roles and labels; none use CSS classes.
- [ ] Implicit submission and button submission are both covered.
- [ ] Focus after submit is asserted with a retrying assertion.
- [ ] Summary links are followed and the target is focused and in the viewport.
- [ ] Accessible descriptions are asserted for error messages.
- [ ] An axe scan runs in the error state, scoped to the form.
- [ ] Server 422 mapping is tested end to end.
- [ ] Tests run in Chromium, Firefox and WebKit, and at least one mobile viewport.

---

## Frequently Asked Questions

<details>
<summary><strong>Can Playwright test screen-reader output?</strong></summary>

Not directly — it cannot run NVDA or VoiceOver. It can assert the accessibility tree through accessible names, descriptions and roles, and snapshot it with `toMatchAriaSnapshot`. Real screen-reader checks remain a manual or specialised-tool task, described in the [screen-reader testing matrix for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/screen-reader-testing-matrix-for-form-errors/).

</details>

<details>
<summary><strong>Should end-to-end tests hit a real backend?</strong></summary>

Some should — a smoke test of the full flow against a staging environment catches contract drift. Error-scenario tests are more reliable with mocked responses, because producing a 409 or a 429 on demand from a real backend is awkward and slow.

</details>

<details>
<summary><strong>How do I keep the suite fast?</strong></summary>

Keep it small, run tests in parallel, reuse authentication state, and push anything that does not need a real browser down to component tests. A handful of well-chosen tests per form covers the behaviours only browsers reveal.

</details>

---

## Related

- [Testing Form Validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/)
- [Building an Accessible Error Summary](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/building-an-accessible-error-summary/)
- [Keystroke Latency Budgets and INP for Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/keystroke-latency-budgets-and-inp-for-forms/)

← [Testing Form Validation](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/)
