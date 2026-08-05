---
layout: page.njk
title: "Multi-Step Form State Machines"
description: "Model a wizard as a state machine: derived step status, a computed path through conditional steps, and a stale phase that keeps later answers when an earlier one changes."
slug: multi-step-form-state-machines
type: topic
breadcrumb: "Form State Fundamentals & Architecture > Multi-Step Form State Machines"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Multi-Step Form State Machines"
  parent: "Form State Fundamentals"
  order: 7
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Multi-Step Form State Machines",
      "description": "Model a wizard as a state machine: derived step status, a computed path through conditional steps, and a stale phase that keeps later answers when an earlier one changes.",
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
          "name": "Form State Fundamentals & Architecture",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Multi-Step Form State Machines",
          "item": "https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should the current step live in the URL?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually yes. Putting it in the URL makes browser Back, Forward, refresh and link-sharing behave the way readers already expect, and it costs one guard: treat a step id arriving from the address bar as untrusted and ignore it if that step is locked. The main reason not to is a wizard inside a modal, where the URL describes the page behind it. If you do keep it out of the URL, intercept the Back button explicitly — otherwise Back leaves the form entirely, which readers experience as losing their work."
          }
        },
        {
          "@type": "Question",
          "name": "How do I handle a step that becomes irrelevant after the reader changes an earlier answer?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Recompute the path from the answers on every patch, and drop steps that are no longer on it. Their recorded values can stay in the draft — restoring the earlier answer should bring the step back with its answers intact — but they must not count towards submission, and a step that is not on the path must never block submit. If the step the reader is currently on leaves the path, move them to the nearest earlier step that is still on it and announce the move rather than jumping silently."
          }
        },
        {
          "@type": "Question",
          "name": "Is it worth using a state machine library for this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For a wizard with conditional paths and a stale phase, yes — the reducer above is roughly the point where hand-rolling stops paying. A library gives you visualisation, exhaustiveness checking on transitions, and a serialisable state you can persist and restore directly. For a fixed three-step wizard with no branching, a library is more concept than the problem has, and the reducer here fits in a file."
          }
        },
        {
          "@type": "Question",
          "name": "Where should cross-step validation rules live?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "In the path and dependency functions, not inside a step's schema. A rule that reads two steps is a property of the sequence rather than of either step, and burying it in one of them makes that step untestable in isolation and silently couples it to the other. Keep step schemas closed over their own values, and express anything spanning steps as a dependency edge plus a rule evaluated when the whole path is complete."
          }
        }
      ]
    }
  ]
}
</script>

# Multi-Step Form State Machines

A multi-step form is not a form with pagination. It is a state machine whose states happen to render fields, and the moment you treat it as the former you inherit a class of bugs that no amount of careful component work will fix: a Back button that loses a step's answers, a step that validates fields the reader has not reached, a resumed draft that lands on step four with step two empty, and a submit that fires from a step that was never completed.

## Problem Statement

The specific sub-problem is *reachability*. In a single-page form every field is present, so "is this form valid" is one question over one set of values. In a wizard the fields arrive over time, which splits that question in two: is the current step valid, and is the path taken to reach it still valid? Those can disagree. A reader who completes step two, advances to step three, then uses browser Back and changes an answer on step two has invalidated conclusions step three was built on — and nothing in the DOM knows that.

The pattern applies whenever any of the following is true: steps are conditional on earlier answers, the reader can navigate backwards, progress survives a reload, or the form is long enough that validating everything at once would bury the reader in errors. If none of those hold, a single form with fieldsets is simpler and you should use it.

Three properties are worth stating as requirements before any code, because each one rules out an implementation that otherwise looks reasonable:

- **The current step is derived, never stored twice.** If a step index lives in component state *and* in the URL *and* in a saved draft, they will disagree. Exactly one is the source of truth and the others are projections of it.
- **A step is only reachable if every step before it on its path is complete.** Not "has been visited" — complete. This is what makes a resumed draft land somewhere sensible.
- **Editing an earlier answer invalidates later steps that depended on it.** Silently keeping their answers is how a reader ends up submitting a delivery address for a collection order.

## State Machine Specification

The machine has two orthogonal pieces of state: which step is current, and what is known about each step. Modelling them separately is what keeps the transitions small.

```typescript
// One entry per step, regardless of whether it has been visited.
type StepStatus =
  | { phase: 'locked' }                                   // an earlier step is incomplete
  | { phase: 'available' }                                // reachable, not yet completed
  | { phase: 'complete'; values: Readonly<StepValues> }   // validated; values frozen
  | { phase: 'stale'; values: Readonly<StepValues> };     // was complete, an input changed

interface WizardState {
  readonly stepIds: readonly string[];        // the full ordered set
  readonly currentId: string;                 // exactly one source of truth
  readonly status: Readonly<Record<string, StepStatus>>;
  readonly submitAttempted: boolean;
}

type WizardEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GOTO'; stepId: string }          // from a progress indicator
  | { type: 'PATCH'; stepId: string; values: StepValues }
  | { type: 'SUBMIT' };
```

The `stale` phase is the piece most implementations omit, and the one that earns its place. Without it there are only two ways to handle an edit to a completed step: discard everything after it, which throws away work the reader may not have needed to redo, or keep everything, which is how contradictory answers get submitted. `stale` is the third option — the answers are kept, the step is no longer treated as complete, and the reader is told which later steps need another look.

<svg viewBox="0 8 690 232" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Step status transitions: a locked step becomes available when its prerequisites complete, an available step becomes complete when it validates, a complete step becomes stale when an input it depended on changes, and a stale step becomes complete again when it is re-validated." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The four phases a step can be in, and what moves it between them</title>
  <desc>Locked: an earlier step on this step's path is not complete, so the step cannot be navigated to. When those prerequisites complete, it becomes available. Available: the step is reachable and its fields render, but it has not been validated. When the reader advances and validation passes, it becomes complete and its values are frozen into the status entry. Complete: the step contributed valid values. If a value it depended on changes — an answer on an earlier step — it becomes stale, keeping its values but no longer counting as complete. Stale: the answers are still there, the step is flagged for review, and re-validating it returns it to complete.</desc>
  <rect x="0" y="8" width="690" height="232" fill="#f9f5fb"/>
  <rect x="14" y="82" width="140" height="60" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="84" y="106" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">locked</text>
  <text x="84" y="124" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">not reachable yet</text>
  <path d="M154,112 H206" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="180" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">path clears</text>
  <rect x="206" y="82" width="140" height="60" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="276" y="106" text-anchor="middle" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">available</text>
  <text x="276" y="124" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">renders, unvalidated</text>
  <path d="M346,112 H398" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="372" y="70" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">NEXT passes</text>
  <rect x="398" y="82" width="140" height="60" rx="8" fill="#e2d6ec" stroke="#2d6342" stroke-width="1.5"/>
  <text x="468" y="106" text-anchor="middle" font-size="11" font-weight="700" fill="#2d6342" font-family="inherit">complete</text>
  <text x="468" y="124" text-anchor="middle" font-size="9.5" fill="#1e1a24" font-family="inherit">values frozen</text>
  <path d="M468,142 V178 H348" fill="none" stroke="#a63d6f" stroke-width="1.4"/>
  <text x="500" y="164" font-size="9.5" fill="#a63d6f" font-family="inherit">an input it read changed</text>
  <rect x="208" y="158" width="140" height="60" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="278" y="182" text-anchor="middle" font-size="11" font-weight="700" fill="#a63d6f" font-family="inherit">stale</text>
  <text x="278" y="200" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">values kept, flagged</text>
  <path d="M348,188 H560 V142" fill="none" stroke="#2d6342" stroke-width="1.4"/>
  <text x="570" y="176" font-size="9.5" fill="#2d6342" font-family="inherit">re-validated</text>
  <text x="14" y="40" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">Why "stale" is worth a fourth phase</text>
  <text x="14" y="58" font-size="10" fill="#6b5f75" font-family="inherit">Without it, editing an earlier answer means either discarding later work or submitting answers that contradict it.</text>
  <text x="14" y="234" font-size="10" fill="#6b5f75" font-family="inherit">A stale step keeps its answers, so re-validating is usually free: the reader confirms rather than retypes.</text>
</svg>

The transition table is small enough to review in one sitting, which is the point of writing it down rather than letting it emerge from event handlers:

| Event | Guard | Effect |
|---|---|---|
| `NEXT` | current step validates | mark current `complete`, unlock the next reachable step, set it current |
| `NEXT` | validation fails | stay; mark `submitAttempted` for this step so errors render; move focus to the first invalid field |
| `BACK` | a previous step exists on the path | set it current; change no statuses |
| `GOTO` | target is `available`, `complete` or `stale` | set it current |
| `GOTO` | target is `locked` | ignore; the control should not have been enabled |
| `PATCH` | always | store values; mark any `complete` step that read them `stale` |
| `SUBMIT` | every step on the path is `complete` | submit |
| `SUBMIT` | any step is `stale` or incomplete | refuse; navigate to the first such step |

## Core Implementation

The reducer below is the whole machine. It is deliberately free of framework imports so the same file can be unit-tested without a renderer and reused by the [framework adapters](https://www.client-side-form.com/framework-adapters-custom-hooks/) — the contract is values in, state out.

```typescript
import type { WizardState, WizardEvent, StepValues } from './types';

/**
 * Which steps are on the path, given the answers so far. Conditional steps are
 * the reason this is a function rather than a constant: a "delivery address"
 * step is not on the path at all when the reader chose collection, and a step
 * that is not on the path must never block submit.
 */
export type PathFn = (values: Record<string, StepValues>) => readonly string[];

/**
 * Which steps a given step reads. Used to mark dependants stale on a PATCH.
 * Declaring this explicitly beats inferring it: a step that silently reads an
 * earlier answer is exactly the coupling that produces contradictory submissions.
 */
export type DepsFn = (stepId: string) => readonly string[];

export function wizardReducer(
  state: WizardState,
  event: WizardEvent,
  deps: { path: PathFn; dependsOn: DepsFn; validate: (id: string, v: StepValues) => boolean },
): WizardState {
  const values = collectValues(state);
  const path = deps.path(values);
  const index = path.indexOf(state.currentId);

  switch (event.type) {
    case 'PATCH': {
      const entry = state.status[event.stepId];
      const kept = entry && 'values' in entry ? entry.values : undefined;
      const next: Record<string, StepStatus> = {
        ...state.status,
        // A patch never completes a step — only NEXT does, and only via validate.
        [event.stepId]: { phase: 'available' },
      };
      // Any COMPLETE step that declared a dependency on this one is now stale.
      // Its values are preserved so the reader confirms rather than retypes.
      for (const id of path) {
        const s = next[id];
        if (s?.phase === 'complete' && deps.dependsOn(id).includes(event.stepId)) {
          next[id] = { phase: 'stale', values: s.values };
        }
      }
      void kept;
      return { ...state, status: next, values: { ...state.values, [event.stepId]: event.values } };
    }

    case 'NEXT': {
      const ok = deps.validate(state.currentId, state.values[state.currentId] ?? {});
      if (!ok) return { ...state, submitAttempted: true };
      const next = { ...state.status };
      next[state.currentId] = {
        phase: 'complete',
        // Frozen: a later mutation of the live values object must not silently
        // rewrite what this step recorded as its validated answer.
        values: Object.freeze({ ...(state.values[state.currentId] ?? {}) }),
      };
      // Recompute the path AFTER completing, because completing may add or
      // remove conditional steps from it.
      const after = deps.path(collectValues({ ...state, status: next }));
      const target = after[after.indexOf(state.currentId) + 1];
      if (target && next[target]?.phase === 'locked') next[target] = { phase: 'available' };
      return { ...state, status: next, currentId: target ?? state.currentId, submitAttempted: false };
    }

    case 'BACK': {
      const target = index > 0 ? path[index - 1] : state.currentId;
      return { ...state, currentId: target, submitAttempted: false };
    }

    case 'GOTO': {
      const phase = state.status[event.stepId]?.phase;
      if (phase === 'locked' || phase === undefined) return state;  // guard, not an error
      return { ...state, currentId: event.stepId, submitAttempted: false };
    }

    case 'SUBMIT': {
      const blocker = path.find((id) => state.status[id]?.phase !== 'complete');
      if (blocker) return { ...state, currentId: blocker, submitAttempted: true };
      return state;   // the caller performs the request; the machine only permits it
    }
  }
}
```

Two decisions in there are worth defending. The path is recomputed *after* a step completes rather than before, because completing a step is exactly when a conditional branch opens or closes — computing it first sends the reader to whichever step was next under the old answers. And `SUBMIT` does not perform the request; it either refuses and navigates, or returns unchanged and lets the caller proceed. Keeping the network out of the reducer is what makes the whole machine testable as a pure function, and it keeps the submission lifecycle where it belongs, in [submission state and optimistic updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/).

## Integration Guidance

The wizard machine sits above per-field state rather than replacing it. Each step still owns its fields through whatever mechanism the rest of the form uses — [controlled or uncontrolled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/), a field store, a framework adapter — and emits a single `PATCH` when its values settle. The machine never sees individual keystrokes, which is what keeps a fifty-field wizard from re-running path computation sixty times a second.

Validation composes the same way. A step's `validate` function is an ordinary schema call over that step's values, so everything in [synchronous validation patterns](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/) applies unchanged; the machine only cares whether it passed. Cross-step rules are the exception, and they belong in the `dependsOn` map rather than inside a step's schema — a rule that reads two steps is a property of the path, not of either step.

Navigation deserves a decision rather than a default. Putting the current step in the URL makes Back, Forward, refresh and link-sharing behave the way readers expect, at the cost of having to treat an arbitrary step id arriving from the address bar as untrusted input — which the `GOTO` guard above already does. Keeping it out of the URL is simpler and makes the browser's Back button leave the form entirely, which readers experience as losing their work. The first is almost always right; the second is defensible only for a wizard inside a modal.

<svg viewBox="0 8 690 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Layered view of a wizard: fields own their own state and emit one patch per step, the wizard machine owns step status and the path, and the submission layer sits above it. Arrows show that keystrokes never reach the machine and the machine never performs the request." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the machine sees, and what it deliberately does not</title>
  <desc>Bottom layer: the fields of the current step, owning their own values and validation exactly as they would in a single-page form, emitting one patch when their values settle rather than one per keystroke. Middle layer: the wizard machine, which owns step status, the computed path and the current step, and knows nothing about individual fields. Top layer: the submission, which asks the machine whether every step on the path is complete and performs the request itself. The two boundaries are what keep the machine pure: keystrokes stop below it and network calls start above it.</desc>
  <rect x="0" y="8" width="690" height="240" fill="#f9f5fb"/>
  <rect x="14" y="24" width="662" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="46" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">submission layer</text>
  <text x="28" y="64" font-size="9.5" fill="#6b5f75" font-family="inherit">asks "may I submit?", performs the request, owns the idempotency key and the rollback</text>
  <path d="M345,76 V100" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="355" y="93" font-size="9.5" fill="#6b5f75" font-family="inherit">SUBMIT — permitted or redirected</text>
  <rect x="14" y="100" width="662" height="60" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="2"/>
  <text x="28" y="124" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the wizard machine — a pure reducer</text>
  <text x="28" y="142" font-size="9.5" fill="#1e1a24" font-family="inherit">step status, the computed path, the current step · no fields, no network, no framework imports</text>
  <path d="M345,160 V184" stroke="#7b4f8a" stroke-width="1.4"/>
  <text x="355" y="177" font-size="9.5" fill="#6b5f75" font-family="inherit">PATCH — once per step, not per keystroke</text>
  <rect x="14" y="184" width="662" height="52" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="28" y="206" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">the current step&#39;s fields</text>
  <text x="28" y="224" font-size="9.5" fill="#6b5f75" font-family="inherit">values, per-field validation, ARIA wiring — identical to a single-page form</text>
</svg>

## Edge Cases and Failure Modes

**A conditional step disappears while the reader is on it.** Changing an earlier answer can remove the current step from the path entirely — the reader was on "delivery address" and has just switched to collection. The machine must detect that `currentId` is no longer in the path and move to the nearest earlier step that is, rather than rendering a step that no longer exists. Announce the move; a silent jump reads as the form losing its place.

**Back after a conditional branch closes.** The reverse case: the reader goes back, changes the answer, and the step they came *from* is now unreachable. Recomputing the path on every `PATCH` handles this, but only if the path function is a pure function of the answers rather than of the visit history.

**Refresh mid-step with unsaved patches.** Values that have not yet been patched into the machine are lost on reload. Either patch on blur rather than on step change, or accept the loss and say so — a wizard that silently drops the current step's typing is worse than one that patches slightly more often. The persistence side of this is covered in [draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/).

**Two tabs, one draft.** Nothing in the machine prevents a second tab from loading the same saved wizard, advancing it, and writing back. The machine is not the right place to solve that; a version or timestamp on the persisted draft is.

**The progress indicator lies.** A progress bar computed from `currentIndex / stepCount` is wrong the moment a conditional step is added or removed. Compute it from the current path — `path.indexOf(currentId) / path.length` — or the reader sees progress go backwards after answering a question.

The progress indicator is where the path model becomes visible to the reader, and where an index-based implementation gives itself away:

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Computing progress from the full step list counts steps the reader will never see, so answering a question that removes a step makes the bar jump backwards, and a wizard with three conditional branches reports a different total to every reader. Computing it from the current path counts only the steps that apply to the answers so far, so the total shrinks when a branch closes and the position always matches what the reader is actually being asked." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Progress from the step list, or from the path</title>
  <desc>Computing progress from the full step list counts steps the reader will never see, so answering a question that removes a step makes the bar jump backwards, and a wizard with three conditional branches reports a different total to every reader. Computing it from the current path counts only the steps that apply to the answers so far, so the total shrinks when a branch closes and the position always matches what the reader is actually being asked.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#a63d6f" font-family="inherit">from the full step list</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">total counts steps this reader will never see</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">answering a question can move the bar backwards</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">"step 3 of 7" when only 4 apply</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">different readers, same misleading total</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">from the computed path</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">total is the steps that apply to these answers</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">closing a branch shrinks the total, honestly</text>
  <text x="366" y="106" font-size="10" fill="#6b5f75" font-family="inherit">"step 3 of 4" — and it is 4</text>
  <text x="366" y="128" font-size="10" fill="#6b5f75" font-family="inherit">path.indexOf(currentId) / path.length</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">Same problem for "you have N steps left" copy: derive it from the path or do not claim a number at all.</text>
</svg>

## Troubleshooting Reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Back loses the step's answers | Check whether the step patches on unmount or only on `NEXT` | Patch on blur; treat `NEXT` as validation, not as the only save point |
| Submit refuses with no visible error | Log which step id `SUBMIT` returned as the blocker | Navigate to it and render its errors — a refusal the reader cannot see is a dead form |
| A completed step re-asks a question | Check whether `dependsOn` lists a step it does not actually read | Trim the dependency map; over-declaring makes steps stale for no reason |
| Progress bar jumps backwards | Compare `stepCount` against `path.length` | Derive progress from the current path, never from the full step list |
| Resumed draft lands on step 1 | Inspect the persisted `status` map for `locked` entries | Recompute status from the saved values on load rather than persisting it |

That last row is worth expanding, because it is the commonest resume bug. Persisting `status` alongside the values means persisting a derived value, and derived values go stale — a saved status computed under last week's path function will not match this week's. Persist the answers, recompute the status on load, and a resumed draft always lands on the first step that is genuinely incomplete.

## Testing and QA Hooks

The reducer is a pure function, so the valuable tests are sequences of events rather than rendered assertions:

```typescript
// A path test reads as the story a reader would tell about the bug.
it('marks the payment step stale when the delivery choice changes', () => {
  let s = init(['contact', 'delivery', 'payment']);
  s = run(s, [
    { type: 'PATCH', stepId: 'contact', values: { email: 'ada@example.com' } }, { type: 'NEXT' },
    { type: 'PATCH', stepId: 'delivery', values: { method: 'home' } },         { type: 'NEXT' },
    { type: 'PATCH', stepId: 'payment', values: { card: '4242…' } },           { type: 'NEXT' },
    { type: 'GOTO', stepId: 'delivery' },
    { type: 'PATCH', stepId: 'delivery', values: { method: 'collect' } },
  ]);
  expect(s.status.payment.phase).toBe('stale');
  expect(s.status.payment).toHaveProperty('values');   // answers kept, not discarded
});
```

For the rendered layer, expose the machine's state as data attributes — `data-step-id`, `data-step-phase`, `data-path-length` — so a Playwright or Cypress test asserts against the machine rather than against copy that a designer may reword. Pair those with the accessibility assertions from [focus management in multi-step form wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/): after every transition, `document.activeElement` must be the new step's heading, and the live region must have announced the new position.

## Common Pitfalls

- **Storing the step index rather than the step id.** Indices shift when a conditional step is added; ids do not. An index persisted in a draft is a bug with a delay fuse.
- **Validating every step on every transition.** It is O(steps) work for no benefit, and it renders errors on steps the reader has not reached — the single most common complaint about wizards.
- **Treating "visited" as "complete".** A reader who tabs through a step without filling it has visited it. Only validation completes it.
- **Putting the submit button on every step.** If submit is only legal from the last step on the path, render it only there; a disabled button on step two is a question the reader has to answer for themselves.
- **Freezing nothing.** A step's recorded values must be a snapshot. Sharing the live object means a later edit rewrites history, and the `stale` transition never fires because the old and new values are the same object.

---

**Related**

- [Persisting Wizard Progress Across Reloads](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/) — turning the machine's state into a resumable draft
- [Validating Only the Current Step](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/validating-only-the-current-step/) — scoping a schema to one step without splitting it
- [Focus Management in Multi-Step Form Wizards](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/focus-management-in-multi-step-wizards/) — what must happen on every transition
- [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) — the lifecycle the machine hands off to

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)

## Frequently Asked Questions

<details>
<summary><strong>Should the current step live in the URL?</strong></summary>

Usually yes. Putting it in the URL makes browser Back, Forward, refresh and link-sharing behave the way readers already expect, and it costs one guard: treat a step id arriving from the address bar as untrusted and ignore it if that step is locked. The main reason not to is a wizard inside a modal, where the URL describes the page behind it. If you do keep it out of the URL, intercept the Back button explicitly — otherwise Back leaves the form entirely, which readers experience as losing their work.

</details>

<details>
<summary><strong>How do I handle a step that becomes irrelevant after the reader changes an earlier answer?</strong></summary>

Recompute the path from the answers on every patch, and drop steps that are no longer on it. Their recorded values can stay in the draft — restoring the earlier answer should bring the step back with its answers intact — but they must not count towards submission, and a step that is not on the path must never block submit. If the step the reader is currently on leaves the path, move them to the nearest earlier step that is still on it and announce the move rather than jumping silently.

</details>

<details>
<summary><strong>Is it worth using a state machine library for this?</strong></summary>

For a wizard with conditional paths and a stale phase, yes — the reducer above is roughly the point where hand-rolling stops paying. A library gives you visualisation, exhaustiveness checking on transitions, and a serialisable state you can persist and restore directly. For a fixed three-step wizard with no branching, a library is more concept than the problem has, and the reducer here fits in a file.

</details>

<details>
<summary><strong>Where should cross-step validation rules live?</strong></summary>

In the path and dependency functions, not inside a step's schema. A rule that reads two steps is a property of the sequence rather than of either step, and burying it in one of them makes that step untestable in isolation and silently couples it to the other. Keep step schemas closed over their own values, and express anything spanning steps as a dependency edge plus a rule evaluated when the whole path is complete.

</details>

