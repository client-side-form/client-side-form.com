---
layout: page.njk
title: "Modelling a Branching Wizard With XState"
description: "Encode a multi-step form whose path depends on earlier answers as an XState v5 machine: guarded transitions, per-step validation before each NEXT, a context that survives going back, and a submit state that invokes an async actor."
slug: modelling-a-branching-wizard-with-xstate
type: howto
breadcrumb: "Branching Wizard in XState"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Modelling a Branching Wizard With XState"
  parent: "Multi-Step Form State Machines"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Modelling a Branching Wizard With XState",
      "description": "Encode a multi-step form whose path depends on earlier answers as an XState v5 machine: guarded transitions, per-step validation before each NEXT, a context that survives going back, and a submit state that invokes an async actor.",
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
          "name": "Multi-Step Form State Machines",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Modelling a Branching Wizard With XState",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/modelling-a-branching-wizard-with-xstate/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Model a branching form wizard as an XState machine",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Make each step a state and each button an event"
        },
        {
          "@type": "HowToStep",
          "name": "Express branching as guarded transitions"
        },
        {
          "@type": "HowToStep",
          "name": "Merge answers into context with assign"
        },
        {
          "@type": "HowToStep",
          "name": "Mirror the forward guards on BACK"
        },
        {
          "@type": "HowToStep",
          "name": "Validate before sending NEXT"
        },
        {
          "@type": "HowToStep",
          "name": "Invoke the submit as an actor"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is XState overkill for a three-step wizard?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a linear three-step form, a step index and a reducer are enough. The machine earns its keep when paths branch, when back navigation must mirror forward decisions, and when submission has states of its own. The moment you write a second if in a Next handler, it is worth considering."
          }
        },
        {
          "@type": "Question",
          "name": "Should field values live in the machine context?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Store committed step answers in context and keep in-progress field state in the step's own form. That keeps the machine free of per-keystroke updates and makes each step's form reusable, while context remains the single record of what the user has confirmed."
          }
        },
        {
          "@type": "Question",
          "name": "How do I test the branching?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Create an actor, send a sequence of events with representative data, and assert actor.getSnapshot().value after each. Because the machine is pure logic, these tests need no DOM and run in milliseconds; add one per path in the table above."
          }
        }
      ]
    }
  ]
}
</script>

# Modelling a Branching Wizard With XState

A wizard whose next step depends on earlier answers — business accounts get a company step, only non-US businesses get a tax step — turns into nested `if` statements scattered across "Next" handlers, and the back button eventually lands somewhere the forward path never visited.

[Multi-step form state machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/) argues for deriving the path from answers. XState makes that argument executable: the steps are states, "Next" and "Back" are events, branching is a guard on a transition, and the machine refuses events that are not valid in the current state. This page builds one with XState v5 and shows the parts that matter for forms specifically.

---

## Context and prerequisites

The example wizard has five possible steps:

1. **account** — personal or business.
2. **company** — only for business accounts.
3. **address** — everyone.
4. **tax** — only for business accounts outside the US.
5. **review** — everyone, then submit.

A personal account visits account → address → review. A US business visits account → company → address → review. A non-US business visits all five. "Back" from review must go to whichever step preceded it *on this user's path*, and if the user goes back to account and switches to personal, the company and tax answers must stop counting without being thrown away.

<svg viewBox="0 0 680 425" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of wizard states from account through company, address and tax to review and submitting, with the guard that decides each optional step." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The branching path as states and guarded transitions</title>
  <desc>From account, NEXT goes to company if the account is business, otherwise straight to address. From company, NEXT goes to address. From address, NEXT goes to tax if the account is business and the country is not US, otherwise to review. From tax, NEXT goes to review. From review, SUBMIT enters submitting, which invokes the save actor and ends in done or returns to review with an error.</desc>
  <rect x="0" y="0" width="680" height="425" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="351.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">account</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">personal | business</text>
  <text x="395.8" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT → company if business, else → address.</text>
  <path d="M189.9,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.9,89.0 189.9,96.0 193.9,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="351.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">company (business only)</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">name, registration number</text>
  <text x="395.8" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT → address. BACK → account.</text>
  <path d="M189.9,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.9,174.0 189.9,181.0 193.9,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="351.8" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">address</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">street, city, country</text>
  <text x="395.8" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT → tax if business and country ≠ US, else → review.</text>
  <path d="M189.9,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.9,259.0 189.9,266.0 193.9,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="351.8" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">tax (non-US business only)</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">VAT number</text>
  <text x="395.8" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT → review. BACK → address.</text>
  <path d="M189.9,324.0 V344.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="185.9,344.0 189.9,351.0 193.9,344.0" fill="#7b4f8a"/>
  <rect x="14.0" y="352.0" width="351.8" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="375.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">review → submitting</text>
  <text x="26.0" y="394.0" font-size="9.5" fill="#6b5f75" font-family="inherit">SUBMIT invokes the save actor</text>
  <text x="395.8" y="374.0" font-size="9.5" fill="#6b5f75" font-family="inherit">onDone → done; onError → review with a form-level error.</text>
</svg>

---

## The core pattern: an XState v5 machine

```typescript
import { assign, fromPromise, setup } from "xstate";

type Answers = {
  accountType?: "personal" | "business";
  company?: { name: string; regNo: string };
  address?: { street: string; city: string; country: string };
  vatNumber?: string;
};

type WizardEvent =
  | { type: "NEXT"; data: Partial<Answers> }
  | { type: "BACK" }
  | { type: "SUBMIT" };

export const wizard = setup({
  types: { context: {} as { answers: Answers; error: string | null }, events: {} as WizardEvent },
  guards: {
    isBusiness: ({ context }) => context.answers.accountType === "business",
    needsTax: ({ context }) =>
      context.answers.accountType === "business" && context.answers.address?.country !== "US",
  },
  actions: {
    // Merge, never replace: answers for steps the user is not currently on
    // must survive, so switching back to "business" restores them.
    save: assign({ answers: ({ context, event }) =>
      event.type === "NEXT" ? { ...context.answers, ...event.data } : context.answers }),
  },
  actors: {
    submit: fromPromise(async ({ input }: { input: Answers }) => {
      const res = await fetch("/api/accounts", { method: "POST", body: JSON.stringify(input) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }),
  },
}).createMachine({
  id: "signup",
  initial: "account",
  context: { answers: {}, error: null },
  states: {
    account: {
      on: { NEXT: [
        { guard: "isBusiness", target: "company", actions: "save" },
        { target: "address", actions: "save" },
      ] },
    },
    company: { on: { NEXT: { target: "address", actions: "save" }, BACK: "account" } },
    address: {
      on: {
        NEXT: [
          // Guards see context BEFORE this transition's actions run, so the
          // country submitted with this event is not in context yet: read it
          // from the event instead (see failure mode 1).
          { guard: ({ context, event }) =>
              event.type === "NEXT" && context.answers.accountType === "business" &&
              event.data.address?.country !== "US",
            target: "tax", actions: "save" },
          { target: "review", actions: "save" },
        ],
        BACK: [{ guard: "isBusiness", target: "company" }, { target: "account" }],
      },
    },
    tax: { on: { NEXT: { target: "review", actions: "save" }, BACK: "address" } },
    review: {
      on: {
        SUBMIT: "submitting",
        BACK: [{ guard: "needsTax", target: "tax" }, { target: "address" }],
      },
    },
    submitting: {
      invoke: {
        src: "submit",
        input: ({ context }) => context.answers,
        onDone: "done",
        onError: { target: "review", actions: assign({ error: ({ event }) => String(event.error) }) },
      },
    },
    done: { type: "final" },
  },
});
```

The component sends `{ type: "NEXT", data }` only after the current step's fields validate. Validation stays outside the machine — the machine decides *where to go*, your step schema decides *whether you may go*.

---

## Step-by-step walkthrough

1. **Make each step a state and each button an event.** The machine then rejects impossible sequences — there is no `SUBMIT` handler on `company`, so a stray submit from a lingering Enter key does nothing.
2. **Express branching as guarded transitions.** An array of transitions is tried in order; the first whose guard passes wins. The unguarded last entry is the default path.
3. **Merge answers into context with `assign`.** Replacing the answers object on each step would lose data for steps not on the current path; merging keeps it for when the user switches back.
4. **Mirror the forward guards on `BACK`.** Back from review goes to tax only if tax is on the path. Deriving both directions from the same guard names keeps them consistent.
5. **Validate before sending `NEXT`.** Run the step's schema — see [validating only the current step](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/) — and send the event only with clean data.
6. **Invoke the submit as an actor.** `invoke` starts the promise on entering `submitting` and cancels interest in it if the state is left, so a user who navigates away does not trigger `onDone` later.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of three kinds of user and the sequence of states each visits, along with where BACK from review leads." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Paths through the machine by answers</title>
  <desc>A personal account visits account, address, review. A business in the US visits account, company, address, review. A business outside the US visits account, company, address, tax, review. BACK from review leads to address for the first two and to tax for the third, because the review BACK transition uses the same needsTax guard as the forward path.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">User</text>
  <text x="179.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">States visited</text>
  <text x="520.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">BACK from review</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Personal</text>
  <text x="179.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">account → address → review</text>
  <text x="520.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">address</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Business, US</text>
  <text x="179.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">account → company → address → review</text>
  <text x="520.8" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">address</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Business, non-US</text>
  <text x="179.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">account → company → address → tax → review</text>
  <text x="520.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">tax</text>
</svg>

---

## Failure modes and edge cases

### 1. Guards see the context before the transition's actions

In XState, a transition's guard is evaluated against the current context, *before* that transition's `assign` runs. A guard on the address step that reads `context.answers.address.country` sees the *previous* country. Read the just-submitted value from the event, as the address transition does, or split into an intermediate transient state.

### 2. Answers that became irrelevant still reach the server

If a business user switches to personal on the first step, `company` and `vatNumber` remain in context. That is intended — they come back if the user switches again — but the submit input must drop them. Apply the relevance rule from [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/) in the actor's `input`.

### 3. Browser history

The machine owns step state; the URL does not know about it, so the browser Back button leaves the wizard entirely. Sync them deliberately, as in [syncing wizard steps with browser history](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/syncing-wizard-steps-with-browser-history/).

### 4. Persisting a machine across reloads

XState v5 actors can return a persisted snapshot with `actor.getPersistedSnapshot()` and restore with `createActor(machine, { snapshot })`. Snapshots taken while in `submitting` restore into a state whose promise no longer exists — persist only from step states, and restore `submitting` as `review`.

### 5. Focus after each transition

Every transition replaces the visible step. Move focus to the new step's heading on each transition, as described in [focus management in multi-step wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/), or keyboard and screen-reader users are left on a button that no longer exists.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards separating the responsibilities of the machine, the step schemas and the view." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What lives where</title>
  <desc>The machine owns the current step, the path decisions through guards and the submit lifecycle. The step schemas own whether the current step&#x27;s data is valid and produce the data sent with NEXT. The view renders the current step, sends events, moves focus on each transition and syncs the URL.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Machine</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Current step.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Path via guards.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit lifecycle via invoke.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Step schemas</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Is this step valid?</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Clean data for NEXT.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No knowledge of the path.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">View</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Renders the step.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Sends events.</text>
  <text x="470.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves focus; syncs the URL.</text>
</svg>

---

## Verification checklist

- [ ] Each of the three user types visits exactly the expected states.
- [ ] BACK from review returns to the last step actually visited on this path.
- [ ] Switching from business to personal and back restores company and tax answers.
- [ ] Irrelevant answers are excluded from the submit payload.
- [ ] NEXT is sent only after the current step validates.
- [ ] A submit failure returns to review with a visible, announced form-level error.
- [ ] Focus moves to the new step's heading after every transition.
- [ ] The machine's transitions are covered by tests that send events and assert states.

---

## Frequently Asked Questions

<details>
<summary><strong>Is XState overkill for a three-step wizard?</strong></summary>

For a linear three-step form, a step index and a reducer are enough. The machine earns its keep when paths branch, when back navigation must mirror forward decisions, and when submission has states of its own. The moment you write a second `if` in a Next handler, it is worth considering.

</details>

<details>
<summary><strong>Should field values live in the machine context?</strong></summary>

Store committed step answers in context and keep in-progress field state in the step's own form. That keeps the machine free of per-keystroke updates and makes each step's form reusable, while context remains the single record of what the user has confirmed.

</details>

<details>
<summary><strong>How do I test the branching?</strong></summary>

Create an actor, send a sequence of events with representative data, and assert `actor.getSnapshot().value` after each. Because the machine is pure logic, these tests need no DOM and run in milliseconds; add one per path in the table above.

</details>

---

## Related

- [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
- [Persisting Wizard Progress Across Reloads](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/)
- [Building a Review Step Before Final Submit](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/building-a-review-step-before-final-submit/)

← [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
