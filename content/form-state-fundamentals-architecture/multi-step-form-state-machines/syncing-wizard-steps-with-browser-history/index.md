---
layout: page.njk
title: "Syncing Wizard Steps With Browser History"
description: "Make the browser Back button move between wizard steps instead of leaving the form: pushState per step, popstate handling that respects guards, deep-link protection, and replaceState for steps that should not be revisited."
slug: syncing-wizard-steps-with-browser-history
type: howto
breadcrumb: "Wizard and History"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Syncing Wizard Steps With Browser History"
  parent: "Multi-Step Form State Machines"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Syncing Wizard Steps With Browser History",
      "description": "Make the browser Back button move between wizard steps instead of leaving the form: pushState per step, popstate handling that respects guards, deep-link protection, and replaceState for steps that should not be revisited.",
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
          "name": "Syncing Wizard Steps With Browser History",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/syncing-wizard-steps-with-browser-history/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep wizard steps in sync with browser history",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Put the step in the URL"
        },
        {
          "@type": "HowToStep",
          "name": "Treat the URL as a request, not a command"
        },
        {
          "@type": "HowToStep",
          "name": "Correct with replaceState"
        },
        {
          "@type": "HowToStep",
          "name": "Push on in-page navigation only"
        },
        {
          "@type": "HowToStep",
          "name": "Store the step in history.state as well"
        },
        {
          "@type": "HowToStep",
          "name": "Combine with the unsaved-changes guard carefully"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should every step get its own history entry?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually yes, because it is what users expect from Back. The exception is a transient step such as a \"checking your details\" interstitial, which should use replaceState so Back skips over it."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use the Navigation API instead of history.pushState?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The Navigation API's navigate event lets you intercept Back and Forward in one place and is available in Chromium-based browsers and, more recently, others. The logic is the same — treat the destination as a request and let the machine decide. Keep a popstate fallback for browsers without it."
          }
        },
        {
          "@type": "Question",
          "name": "Does the step need to be in the URL if I persist progress anyway?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Persistence restores answers; the URL is what makes Back and Forward work. You can keep the step out of the query string by storing it only in history.state, but a visible parameter also makes support conversations easier (\"which step are you on?\")."
          }
        }
      ]
    }
  ]
}
</script>

# Syncing Wizard Steps With Browser History

Users press the browser's Back button to go to the previous wizard step; if the wizard keeps its step only in component state, Back leaves the page, the unsaved-changes prompt fires, and a user who dismisses it loses every answer.

The step logic itself belongs to the machine described in [multi-step form state machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/). History is a second, external source of navigation that the machine has to accept events from and report its position to — without letting the URL bypass validation or the branching rules.

---

## Context and prerequisites

Three expectations from users collide here:

- **Back goes to the previous step**, not the previous page. People use the browser button, the mouse's back key and the swipe gesture far more than an in-page "Back" link.
- **Reload keeps the step.** Refreshing on step 3 should show step 3, which means the step is in the URL (or in restored state).
- **Links cannot skip ahead.** A bookmarked or shared `?step=review` must not open the review step for a user who has not completed the steps before it.

The pattern: the URL is a *request* to be on a step; the machine decides whether that request is allowed; the URL is then corrected to wherever the machine actually is.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram between the browser history, the wizard adapter and the step machine, showing a forward step pushing a history entry and the Back button producing a popstate that becomes a BACK event." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Back button handled by the machine</title>
  <desc>When the user completes the address step, the machine moves to review and the adapter pushes a history entry for the review step. When the user presses the browser Back button, the browser fires popstate with the address step. The adapter translates it into a BACK event, the machine moves to address, and no new history entry is pushed because the history already points there.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Browser history</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Adapter</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Step machine</text>
  <path d="M122.7,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="348.0" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT (address valid)</text>
  <path d="M340.0,69.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,65.0 556.3,69.0 549.3,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">now at review</text>
  <path d="M557.3,97.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,93.0 341.0,97.0 348.0,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">pushState step=review</text>
  <path d="M340.0,125.0 H130.7" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="130.7,121.0 123.7,125.0 130.7,129.0" fill="#7b4f8a"/>
  <text x="130.7" y="149.0" font-size="9.5" fill="#6b5f75" font-family="inherit">popstate step=address (Back pressed)</text>
  <path d="M122.7,153.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,149.0 339.0,153.0 332.0,157.0" fill="#7b4f8a"/>
  <text x="348.0" y="177.0" font-size="9.5" fill="#2d6342" font-family="inherit">BACK</text>
  <path d="M340.0,181.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,177.0 556.3,181.0 549.3,185.0" fill="#7b4f8a"/>
  <text x="348.0" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">now at address; no push</text>
  <path d="M557.3,209.0 H348.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="348.0,205.0 341.0,209.0 348.0,213.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: a two-way adapter with the machine as authority

```typescript
export interface StepMachine {
  current(): string;
  canVisit(step: string): boolean;           // every step before it complete and on the path
  goTo(step: string): void;                  // only called after canVisit
  subscribe(fn: (step: string) => void): () => void;
}

const STEP_PARAM = "step";

export function syncWizardWithHistory(machine: StepMachine): () => void {
  const readStep = () => new URL(location.href).searchParams.get(STEP_PARAM);
  const urlFor = (step: string) => {
    const u = new URL(location.href);
    u.searchParams.set(STEP_PARAM, step);
    return u.toString();
  };

  // 1. On load: the URL is a REQUEST. Honour it only if the machine allows it,
  //    otherwise correct the URL in place (replace, not push).
  const requested = readStep();
  if (requested && requested !== machine.current() && machine.canVisit(requested)) {
    machine.goTo(requested);
  }
  history.replaceState({ wizardStep: machine.current() }, "", urlFor(machine.current()));

  // 2. Machine moved (via in-page buttons): add a history entry — unless the
  //    move came FROM history, in which case the entry already exists.
  let fromPopstate = false;
  const unsubscribe = machine.subscribe((step) => {
    if (fromPopstate) return;
    if (history.state?.wizardStep === step) return;
    history.pushState({ wizardStep: step }, "", urlFor(step));
  });

  // 3. Back/Forward: translate into machine navigation, respecting guards.
  const onPop = (e: PopStateEvent) => {
    const target = (e.state?.wizardStep as string | undefined) ?? readStep();
    if (!target) return;
    fromPopstate = true;
    try {
      if (machine.canVisit(target)) machine.goTo(target);
      // Forward to a step that is no longer on the path (answers changed):
      // stay put and rewrite this entry so the URL tells the truth.
      else history.replaceState({ wizardStep: machine.current() }, "", urlFor(machine.current()));
    } finally {
      fromPopstate = false;
    }
  };
  addEventListener("popstate", onPop);

  return () => { unsubscribe(); removeEventListener("popstate", onPop); };
}
```

In a framework router the same shape applies: treat the route parameter as the request, validate it against the machine in a route guard or loader, and redirect with `replace` when it is not allowed.

---

## Step-by-step walkthrough

1. **Put the step in the URL.** A query parameter or path segment makes reload and Back work with no extra storage.
2. **Treat the URL as a request, not a command.** On load and on `popstate`, ask the machine whether the step can be visited; it can only if every earlier step on the current path is complete.
3. **Correct with `replaceState`.** When the request is refused, rewrite the current entry to the machine's actual step so the address bar never lies and no junk entries accumulate.
4. **Push on in-page navigation only.** Next and Back buttons move the machine; the subscriber pushes an entry. A move that came from `popstate` must not push, or Back would add an entry and trap the user.
5. **Store the step in `history.state` as well.** It survives even if another script rewrites the query string, and it tells you which entry you are on.
6. **Combine with the unsaved-changes guard carefully.** Moving between steps is not leaving the form; only the entry *before* the first step should trigger the guard from [warning before leaving a form with unsaved changes](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/warning-before-leaving-a-form-with-unsaved-changes/).

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for a step requested through the URL or popstate — whether it is the current step, whether the machine allows it — ending in either moving there or correcting the URL." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Handling a requested step from the URL</title>
  <desc>If the requested step is already the current step, do nothing. If the machine allows the step because every earlier step on the path is complete, move the machine there without pushing a new history entry. Otherwise keep the machine where it is and replace the current history entry with the machine&#x27;s actual step, so the URL matches what is shown.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Requested step is current?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Do nothing</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">machine.canVisit(step)?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Move the machine</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">replaceState to actual step</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The URL is corrected, not obeyed.</text>
</svg>

---

## Failure modes and edge cases

### 1. Back after submit

After a successful submit, Back returns to the review step and a second click on Submit creates a duplicate. When the machine reaches `done`, `replaceState` the review entry with the confirmation URL, so Back from the confirmation goes to the page before the wizard. Pair it with the server-side protections in [handling double submit and idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

### 2. Forward to a step that is no longer on the path

The user reached the tax step, went back to account, switched to personal. The Forward button now points at `step=tax`, which is not on their path. `canVisit` refuses, and the entry is rewritten — which is the correct outcome, even if it means Forward appears to do nothing once.

### 3. Validation on Back

Do not validate the current step before moving back. Users go back to check or change an earlier answer; blocking them because the current step is incomplete is hostile. Keep the partial answers in state instead.

### 4. Scroll and focus restoration

Browsers restore scroll position on `popstate`, often to the wrong place because the step's content changed. Set `history.scrollRestoration = "manual"` while the wizard is mounted, scroll to the top, and move focus to the step heading.

### 5. Server-rendered steps

If each step is a separate server-rendered page, history works by default but the server must enforce the same `canVisit` rule — redirecting a direct request for step 4 to the first incomplete step — or deep links skip validation.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of pushState, replaceState and no history change with the wizard events that should trigger each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>History operations and when to use each</title>
  <desc>Use pushState when the user moves to a different step with an in-page Next or Back button. Use replaceState on initial load to normalise the URL, when a requested step is refused, and when the wizard completes to replace review with the confirmation. Make no history change when the move came from popstate, because the entry already exists.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Operation</text>
  <text x="187.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Use when</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">pushState</text>
  <text x="187.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">in-page Next or Back moved the machine to a different step</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">replaceState</text>
  <text x="187.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">initial load; a refused request; completion replaces review with confirmation</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">no change</text>
  <text x="187.0" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">the move came from popstate: the entry already exists</text>
</svg>

---

## Verification checklist

- [ ] The browser Back button moves to the previous step on the user's path.
- [ ] Forward works after Back, and refuses steps no longer on the path.
- [ ] Reloading on any step shows the same step with its answers.
- [ ] A link to a later step opens the first incomplete step instead.
- [ ] No duplicate history entries accumulate from moving back and forth.
- [ ] Back from the confirmation page does not return to a submittable review.
- [ ] Focus moves to the step heading after every history navigation.
- [ ] The unsaved-changes prompt appears only when leaving the wizard, not between steps.

---

## Frequently Asked Questions

<details>
<summary><strong>Should every step get its own history entry?</strong></summary>

Usually yes, because it is what users expect from Back. The exception is a transient step such as a "checking your details" interstitial, which should use `replaceState` so Back skips over it.

</details>

<details>
<summary><strong>Can I use the Navigation API instead of history.pushState?</strong></summary>

The Navigation API's `navigate` event lets you intercept Back and Forward in one place and is available in Chromium-based browsers and, more recently, others. The logic is the same — treat the destination as a request and let the machine decide. Keep a `popstate` fallback for browsers without it.

</details>

<details>
<summary><strong>Does the step need to be in the URL if I persist progress anyway?</strong></summary>

Persistence restores answers; the URL is what makes Back and Forward work. You can keep the step out of the query string by storing it only in `history.state`, but a visible parameter also makes support conversations easier ("which step are you on?").

</details>

---

## Related

- [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
- [Modelling a Branching Wizard With XState](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/modelling-a-branching-wizard-with-xstate/)
- [Persisting Wizard Progress Across Reloads](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/)

← [Multi-Step Form State Machines](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/)
