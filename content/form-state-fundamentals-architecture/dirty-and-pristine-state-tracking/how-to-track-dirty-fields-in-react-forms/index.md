---
layout: page.njk
title: "How to Track Dirty Fields in React Forms"
description: "Build a type-safe useDirtyTracker hook using immutable baseline snapshots and useMemo diffing to detect field-level mutations in React without re-render overhead."
slug: "how-to-track-dirty-fields-in-react-forms"
type: howto
breadcrumb: "How to Track Dirty Fields in React Forms"
datePublished: "2025-03-10"
dateModified: "2026-06-23"
eleventyNavigation:
  key: "How to Track Dirty Fields in React Forms"
  parent: "Dirty and Pristine State Tracking"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "How to Track Dirty Fields in React Forms",
      "description": "Build a type-safe useDirtyTracker hook using immutable baseline snapshots and useMemo diffing to detect field-level mutations in React without re-render overhead.",
      "datePublished": "2025-03-10",
      "dateModified": "2026-06-23",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Form State Fundamentals & Architecture", "item": "https://client-side-form.com/form-state-fundamentals-architecture/" },
        { "@type": "ListItem", "position": 3, "name": "Dirty and Pristine State Tracking", "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/" },
        { "@type": "ListItem", "position": 4, "name": "How to Track Dirty Fields in React Forms", "item": "https://client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/how-to-track-dirty-fields-in-react-forms/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to Track Dirty Fields in React Forms",
      "description": "Implement field-level dirty tracking in React using a baseline ref snapshot, useMemo diffing, and a syncBaseline callback for async hydration.",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Capture a baseline snapshot in a ref", "text": "Store initial values in useRef so the baseline never triggers a re-render." },
        { "@type": "HowToStep", "position": 2, "name": "Derive the dirty map with useMemo", "text": "Compute which fields differ from the baseline using strict equality for primitives and JSON.stringify for objects." },
        { "@type": "HowToStep", "position": 3, "name": "Expose syncBaseline for async hydration", "text": "After async data resolves, call syncBaseline to atomically update both the baseline ref and current state." },
        { "@type": "HowToStep", "position": 4, "name": "Wire updateField callbacks to inputs", "text": "Replace raw onChange handlers with updateField so all mutations flow through the hook's state." },
        { "@type": "HowToStep", "position": 5, "name": "Verify with data-dirty attributes and DevTools Profiler", "text": "Confirm no false positives during hydration and no unnecessary re-renders using React DevTools." }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does this approach handle nested form objects?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The hook uses shallow strict-equality comparison by default. For nested structures, wrap the comparison in a deep-equal utility or use JSON.stringify selectively. Apply serialization only to object-valued fields, not globally — JSON.stringify is O(n) in the serialized size and will slow down large forms if applied indiscriminately."
          }
        },
        {
          "@type": "Question",
          "name": "Can this hook integrate with React Hook Form or Formik?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. The hook operates independently of any library. Wrap it alongside a library's field arrays to add dirty tracking, auto-save triggers, or custom submission guards without touching the library's internal state."
          }
        },
        {
          "@type": "Question",
          "name": "What is the performance impact on large forms?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "useMemo runs O(n) in field count only when current state changes. For forms above roughly 100 fields, add field-level memoization or debounce rapid input events so setCurrent does not fire on every keystroke."
          }
        },
        {
          "@type": "Question",
          "name": "Why use useRef for the baseline instead of useState?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Mutating a ref never schedules a React re-render. If the baseline lived in useState, resetting it would force a full component update even when current values haven't changed — doubling render work during async hydration."
          }
        }
      ]
    }
  ]
}
</script>

# How to Track Dirty Fields in React Forms

The exact problem: a controlled React form marks every field as dirty the moment async-loaded default values arrive, because the baseline was set before the server data resolved.

This page shows how to capture a stable baseline snapshot in a ref, derive a per-field dirty map without extra state, and expose a `syncBaseline` callback that makes async hydration invisible to the dirty-detection logic — all without triggering unnecessary re-renders.

## Context and Prerequisites

This pattern builds on [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/) — the distinction between a user-driven mutation and a programmatic reset. Before reading further, make sure you understand [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) because the hook here assumes fully controlled inputs where React owns every field value.

## How the Baseline-Ref Pattern Works

The diagram below shows data flow through the hook at mount time and after async hydration.

<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Data flow diagram showing how useDirtyTracker captures a baseline on mount, updates it on syncBaseline, and derives the dirty map via useMemo" style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>useDirtyTracker data flow</title>
  <desc>At mount, initialValues flows into both useRef (baseline) and useState (current). On each updateField call, only useState updates, and useMemo recomputes the dirtyMap by comparing current against baseline.current. When syncBaseline is called after async data resolves, it atomically writes the new values to both the ref and useState, so dirtyMap collapses back to all-false.</desc>
  <rect x="0" y="0" width="680" height="320" fill="#f9f5fb"/>
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#7b4f8a"/>
    </marker>
  </defs>
  <!-- Background -->
  <rect width="680" height="320" rx="12" fill="none" stroke="#cbb8d9" stroke-width="1"/>
  <!-- initialValues -->
  <rect x="20" y="130" width="130" height="44" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="85" y="148" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="ui-monospace,monospace" font-weight="600">initialValues</text>
  <text x="85" y="164" text-anchor="middle" font-size="10" fill="#6b5f75">prop / empty shape</text>
  <!-- useRef box -->
  <rect x="215" y="60" width="140" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="285" y="83" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="ui-monospace,monospace" font-weight="600">useRef</text>
  <text x="285" y="100" text-anchor="middle" font-size="10" fill="#6b5f75">baseline.current</text>
  <!-- useState box -->
  <rect x="215" y="196" width="140" height="56" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="285" y="219" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="ui-monospace,monospace" font-weight="600">useState</text>
  <text x="285" y="236" text-anchor="middle" font-size="10" fill="#6b5f75">current — triggers renders</text>
  <!-- arrows: initialValues → useRef -->
  <line x1="150" y1="142" x2="213" y2="100" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <!-- arrows: initialValues → useState -->
  <line x1="150" y1="158" x2="213" y2="214" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <!-- useMemo box -->
  <rect x="420" y="130" width="140" height="44" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="490" y="148" text-anchor="middle" font-size="12" fill="#1e1a24" font-family="ui-monospace,monospace" font-weight="600">useMemo</text>
  <text x="490" y="164" text-anchor="middle" font-size="10" fill="#6b5f75">derived, not stored</text>
  <!-- arrows: useRef → useMemo -->
  <line x1="355" y1="99" x2="418" y2="142" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <!-- arrows: useState → useMemo -->
  <line x1="355" y1="214" x2="418" y2="166" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <!-- syncBaseline label -->
  <rect x="215" y="270" width="140" height="36" rx="6" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="285" y="284" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="ui-monospace,monospace">syncBaseline(newValues)</text>
  <text x="285" y="298" text-anchor="middle" font-size="9" fill="#6b5f75">writes ref + setCurrent atomically</text>
  <!-- arrow: syncBaseline → useRef (routed around the useState card, not through it) -->
  <path d="M215,288 H185 V88 H213" fill="none" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arrowhead)"/>
  <!-- arrow: syncBaseline → useState -->
  <line x1="305" y1="270" x2="305" y2="254" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arrowhead)"/>
  <!-- updateField label -->
  <text x="490" y="262" text-anchor="middle" font-size="10" fill="#6b5f75" font-family="ui-monospace,monospace">updateField(key, value)</text>
  <text x="490" y="276" text-anchor="middle" font-size="9" fill="#6b5f75">only setState, never baseline</text>
  <line x1="490" y1="256" x2="490" y2="176" stroke="#6b5f75" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arrowhead)"/>
</svg>

The key insight: `useRef` holds the baseline and mutating it never triggers a re-render. `useMemo` reads `baseline.current` as a captured value inside its factory, so the dirty map is always fresh without being stored in state.

## Core Hook Implementation

```typescript
import { useState, useRef, useMemo, useCallback } from 'react';

/**
 * Tracks field-level mutations against an immutable baseline snapshot.
 *
 * Design choices:
 *  - baseline lives in useRef: mutating it is synchronous and never
 *    schedules a render, so syncBaseline cannot create a stale-closure window.
 *  - dirtyMap is derived via useMemo: no separate useState means no
 *    redundant update cycle when current changes.
 *  - T extends Record<string, unknown> keeps the generic open enough
 *    for date objects, File instances, and nullable fields.
 */
export function useDirtyTracker<T extends Record<string, unknown>>(
  initialValues: T
) {
  // Ref holds the pristine baseline — mutations here are invisible to React.
  const baseline = useRef<T>(initialValues);

  // useState holds current user-edited values and drives renders.
  const [current, setCurrent] = useState<T>(initialValues);

  // Derive dirty state; only recalculates when `current` object reference changes.
  const dirtyMap = useMemo(() => {
    return Object.keys(current).reduce<Record<string, boolean>>((acc, key) => {
      // Strict equality handles primitives, null, and undefined correctly.
      // For fields holding objects or arrays, replace !== with a deep-equal
      // call or JSON.stringify(a) !== JSON.stringify(b) — but do this only
      // for the affected keys, not globally, to keep O(n) complexity bounded.
      acc[key] = current[key] !== baseline.current[key];
      return acc;
    }, {});
  }, [current]);

  // Route all field updates through here so the hook owns the mutation path.
  const updateField = useCallback(
    (key: keyof T, value: T[keyof T]) => {
      setCurrent(prev => ({ ...prev, [key]: value }));
    },
    [] // setCurrent is stable; no deps needed
  );

  /**
   * Call this when async server data resolves.
   * Sets baseline.current BEFORE calling setCurrent so that the
   * immediately-triggered useMemo sees a matching baseline and
   * produces an all-false dirtyMap — no flash of "everything is dirty".
   */
  const syncBaseline = useCallback((newValues: T) => {
    baseline.current = newValues;  // synchronous — happens before next render
    setCurrent(newValues);
  }, []);

  // Discard all user edits and return to the current baseline.
  const resetToPristine = useCallback(() => {
    setCurrent(baseline.current);
  }, []);

  const isDirty = useMemo(
    () => Object.values(dirtyMap).some(Boolean),
    [dirtyMap]
  );

  return { current, dirtyMap, isDirty, updateField, syncBaseline, resetToPristine };
}
```

## Step-by-Step Walkthrough

1. **Mount with placeholder values.** Pass an empty shape (`{ email: '', password: '' }`) as `initialValues`. Both `baseline.current` and `current` start identical, so `dirtyMap` is all-false immediately — no field appears dirty before the user touches anything.

2. **Async hydration resolves.** Call `syncBaseline(serverData)`. The ref update is synchronous, so when `setCurrent` fires and React schedules a render, `useMemo`'s factory already reads the updated `baseline.current`. The resulting `dirtyMap` is still all-false. Without this atomic ordering, the render between `setCurrent` and a deferred baseline update would show every field as dirty for one frame.

Ordering is the whole trick, and it is easier to see as two timelines of the same fetch:

<svg viewBox="0 0 672 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two timelines of the same async hydration. In the deferred-baseline order the render between setCurrent and the baseline update marks every field dirty; in the ref-first order the baseline is written synchronously so the single render already sees a matching baseline and no field is dirty." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Deferred baseline versus ref-first hydration</title>
  <desc>Top row, deferred baseline: mount with an empty baseline and empty current; server data arrives and setCurrent runs while the baseline is still empty, so the dirty map marks every field; a later effect finally updates the baseline; the reader has already seen a frame of unsaved-changes badges. Bottom row, ref-first: mount identically; the server data is written straight to baseline.current, which is synchronous and schedules no render; setCurrent then triggers one render in which useMemo already reads the new baseline; the reader sees the saved values with no badges.</desc>
  <rect x="0" y="0" width="672" height="300" fill="#f9f5fb"/>
  <text x="12" y="24" font-size="12" font-weight="700" fill="#a63d6f" font-family="inherit">Deferred baseline — one render shows every field dirty</text>
  <rect x="12" y="36" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="24" y="58" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · mount</text>
  <text x="24" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">baseline = {} (empty)</text>
  <text x="24" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">current = {} (empty)</text>
  <rect x="24" y="98" width="74" height="16" rx="8" fill="#f9f5fb" stroke="#2d6342" stroke-width="1"/>
  <text x="61" y="109.5" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">dirty: none</text>
  <path d="M166,74 L174,79 L166,84 Z" fill="#6b5f75"/>
  <rect x="178" y="36" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="190" y="58" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · data arrives</text>
  <text x="190" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">setCurrent(server)</text>
  <text x="190" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">baseline still empty</text>
  <rect x="190" y="98" width="66" height="16" rx="8" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1"/>
  <text x="223" y="109.5" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">dirty: all</text>
  <path d="M332,74 L340,79 L332,84 Z" fill="#6b5f75"/>
  <rect x="344" y="36" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="356" y="58" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · effect fires</text>
  <text x="356" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">baseline = server</text>
  <text x="356" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">one render too late</text>
  <rect x="356" y="98" width="74" height="16" rx="8" fill="#f9f5fb" stroke="#2d6342" stroke-width="1"/>
  <text x="393" y="109.5" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">dirty: none</text>
  <path d="M498,74 L506,79 L498,84 Z" fill="#6b5f75"/>
  <rect x="510" y="36" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="522" y="58" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">4 · reader sees</text>
  <text x="522" y="76" font-size="9.5" fill="#6b5f75" font-family="inherit">a flash of unsaved</text>
  <text x="522" y="90" font-size="9.5" fill="#6b5f75" font-family="inherit">badges on every row</text>
  <rect x="522" y="98" width="70" height="16" rx="8" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1"/>
  <text x="557" y="109.5" text-anchor="middle" font-size="9" fill="#a63d6f" font-family="inherit">regression</text>
  <text x="12" y="168" font-size="12" font-weight="700" fill="#2d6342" font-family="inherit">Ref-first — same data, same fetch, no dirty frame</text>
  <rect x="12" y="180" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="24" y="202" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">1 · mount</text>
  <text x="24" y="220" font-size="9.5" fill="#6b5f75" font-family="inherit">baseline = {} (empty)</text>
  <text x="24" y="234" font-size="9.5" fill="#6b5f75" font-family="inherit">current = {} (empty)</text>
  <rect x="24" y="242" width="74" height="16" rx="8" fill="#f9f5fb" stroke="#2d6342" stroke-width="1"/>
  <text x="61" y="253.5" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">dirty: none</text>
  <path d="M166,218 L174,223 L166,228 Z" fill="#6b5f75"/>
  <rect x="178" y="180" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="190" y="202" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">2 · data arrives</text>
  <text x="190" y="220" font-size="9.5" fill="#6b5f75" font-family="inherit">baseline.current =</text>
  <text x="190" y="234" font-size="9.5" fill="#6b5f75" font-family="inherit">server — no render</text>
  <rect x="190" y="242" width="72" height="16" rx="8" fill="#f9f5fb" stroke="#7b4f8a" stroke-width="1"/>
  <text x="226" y="253.5" text-anchor="middle" font-size="9" fill="#7b4f8a" font-family="inherit">sync write</text>
  <path d="M332,218 L340,223 L332,228 Z" fill="#6b5f75"/>
  <rect x="344" y="180" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="356" y="202" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">3 · setCurrent</text>
  <text x="356" y="220" font-size="9.5" fill="#6b5f75" font-family="inherit">useMemo reads the</text>
  <text x="356" y="234" font-size="9.5" fill="#6b5f75" font-family="inherit">new baseline</text>
  <rect x="356" y="242" width="74" height="16" rx="8" fill="#f9f5fb" stroke="#2d6342" stroke-width="1"/>
  <text x="393" y="253.5" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">dirty: none</text>
  <path d="M498,218 L506,223 L498,228 Z" fill="#6b5f75"/>
  <rect x="510" y="180" width="150" height="86" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="522" y="202" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">4 · reader sees</text>
  <text x="522" y="220" font-size="9.5" fill="#6b5f75" font-family="inherit">the saved values,</text>
  <text x="522" y="234" font-size="9.5" fill="#6b5f75" font-family="inherit">no badges anywhere</text>
  <rect x="522" y="242" width="52" height="16" rx="8" fill="#f9f5fb" stroke="#2d6342" stroke-width="1"/>
  <text x="548" y="253.5" text-anchor="middle" font-size="9" fill="#2d6342" font-family="inherit">clean</text>
  <text x="12" y="288" font-size="10" fill="#6b5f75" font-family="inherit">The only difference is that the baseline write is synchronous, so it lands before React renders — not after.</text>
</svg>

3. **User edits a field.** The `onChange` handler calls `updateField('email', e.target.value)`. Only `current` changes; `baseline.current` is untouched. `useMemo` recomputes and marks `dirtyMap.email = true`.

4. **Conditional UI responds.** Read `isDirty` to enable a save button, or read `dirtyMap.fieldName` to show a per-field "unsaved" indicator via the `data-dirty` attribute.

5. **User cancels.** Call `resetToPristine()` to snap `current` back to `baseline.current`. `dirtyMap` collapses to all-false on the next render.

### Usage: Form with Async Hydration

```typescript
import { useEffect } from 'react';
import { useDirtyTracker } from './useDirtyTracker';

interface ProfileFields {
  email: string;
  displayName: string;
}

export function ProfileForm() {
  const {
    current,
    dirtyMap,
    isDirty,
    updateField,
    syncBaseline,
    resetToPristine,
  } = useDirtyTracker<ProfileFields>({ email: '', displayName: '' });

  // Establish the real pristine baseline once server data arrives.
  useEffect(() => {
    async function fetchProfile() {
      const profile = await fetch('/api/me').then(r => r.json()) as ProfileFields;
      syncBaseline(profile); // atomic: baseline ref then setCurrent
    }
    void fetchProfile();
  }, [syncBaseline]);

  // Dev-only audit: log which fields changed and when.
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isDirty) {
      const changedKeys = Object.entries(dirtyMap)
        .filter(([, d]) => d)
        .map(([k]) => k);
      console.debug('[DirtyTracker] Modified fields:', changedKeys);
    }
  }, [dirtyMap, isDirty]);

  return (
    <form onSubmit={e => e.preventDefault()}>
      <label>
        Email
        <input
          type="email"
          value={current.email}
          onChange={e => updateField('email', e.target.value)}
          data-dirty={dirtyMap.email ? 'true' : 'false'}
          aria-label="Email address"
        />
      </label>
      <label>
        Display name
        <input
          type="text"
          value={current.displayName}
          onChange={e => updateField('displayName', e.target.value)}
          data-dirty={dirtyMap.displayName ? 'true' : 'false'}
          aria-label="Display name"
        />
      </label>
      <button type="submit" disabled={!isDirty}>
        {isDirty ? 'Save Changes' : 'No Changes'}
      </button>
      <button type="button" onClick={resetToPristine} disabled={!isDirty}>
        Discard
      </button>
    </form>
  );
}
```

## Failure Modes and Edge Cases

### 1. Object-valued fields always appear dirty

`!==` compares references, not structure. Which comparison a field needs depends entirely on what that field holds:

<svg viewBox="0 0 700 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison matrix of dirty-detection equality strategies: strict inequality suits primitives at constant cost and is correct; strict inequality on objects is constant cost but always reports dirty; JSON.stringify handles plain objects at a cost proportional to size but is key-order sensitive; a per-key deep equal handles nested objects at a cost proportional to size and is correct when opted into; normalising a field before comparing handles dates, files and numeric strings at constant cost and is the most reliable for typed fields." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which equality check each field shape needs</title>
  <desc>Five strategies compared across field shape, cost and verdict. Strict inequality: primitives, constant cost, correct. Strict inequality on object values: objects and arrays, constant cost, always reports dirty. JSON.stringify comparison: plain serialisable objects, cost proportional to value size, key-order sensitive. Per-key deep equal: nested objects, cost proportional to value size, correct but opt in per field. Normalise then compare: dates, File objects and numeric strings, constant cost after normalising, the most reliable option for typed fields.</desc>
  <rect x="0" y="0" width="700" height="226" fill="#f9f5fb"/>
  <rect x="10" y="10" width="680" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="10" width="680" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="30" width="680" height="10" fill="#e2d6ec"/>
  <text x="24" y="30" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Comparison</text>
  <text x="222" y="30" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field shape it fits</text>
  <text x="416" y="30" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Cost per key</text>
  <text x="540" y="30" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Verdict</text>
  <text x="24" y="60" font-size="10" fill="#1e1a24" font-family="inherit">a !== b</text>
  <text x="222" y="60" font-size="10" fill="#6b5f75" font-family="inherit">strings, numbers, null</text>
  <text x="416" y="60" font-size="10" fill="#6b5f75" font-family="inherit">constant</text>
  <text x="540" y="60" font-size="10" fill="#2d6342" font-family="inherit">correct — the default</text>
  <line x1="10" y1="74" x2="690" y2="74" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="94" font-size="10" fill="#1e1a24" font-family="inherit">a !== b on objects</text>
  <text x="222" y="94" font-size="10" fill="#6b5f75" font-family="inherit">objects, arrays</text>
  <text x="416" y="94" font-size="10" fill="#6b5f75" font-family="inherit">constant</text>
  <text x="540" y="94" font-size="10" fill="#a63d6f" font-family="inherit">always dirty</text>
  <line x1="10" y1="108" x2="690" y2="108" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="128" font-size="10" fill="#1e1a24" font-family="inherit">JSON.stringify pair</text>
  <text x="222" y="128" font-size="10" fill="#6b5f75" font-family="inherit">plain, serialisable</text>
  <text x="416" y="128" font-size="10" fill="#6b5f75" font-family="inherit">size of value</text>
  <text x="540" y="128" font-size="10" fill="#b07a55" font-family="inherit">key-order sensitive</text>
  <line x1="10" y1="142" x2="690" y2="142" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="162" font-size="10" fill="#1e1a24" font-family="inherit">deep equal, per key</text>
  <text x="222" y="162" font-size="10" fill="#6b5f75" font-family="inherit">nested objects</text>
  <text x="416" y="162" font-size="10" fill="#6b5f75" font-family="inherit">size of value</text>
  <text x="540" y="162" font-size="10" fill="#2d6342" font-family="inherit">correct — opt in only</text>
  <line x1="10" y1="176" x2="690" y2="176" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="196" font-size="10" fill="#1e1a24" font-family="inherit">normalise, then !==</text>
  <text x="222" y="196" font-size="10" fill="#6b5f75" font-family="inherit">Date, File, "007"</text>
  <text x="416" y="196" font-size="10" fill="#6b5f75" font-family="inherit">constant</text>
  <text x="540" y="196" font-size="10" fill="#2d6342" font-family="inherit">most reliable</text>
</svg>

Back to the reference trap: if a field holds `{ x: 1 }`, two separate object literals are never `===` even when they contain the same data.

```typescript
// Fix: serialize object fields before comparing
acc[key] =
  typeof current[key] === 'object' && current[key] !== null
    ? JSON.stringify(current[key]) !== JSON.stringify(baseline.current[key])
    : current[key] !== baseline.current[key];
```

Apply this only to the fields you know are objects — applying it globally is unnecessary and slower.

### 2. Stale baseline when async data races a user edit

If the user edits a field before `syncBaseline` runs, `syncBaseline` will overwrite `current` and discard the edit. Gate it with a "loaded" flag:

```typescript
const hasHydrated = useRef(false);

async function fetchProfile() {
  const profile = await fetch('/api/me').then(r => r.json()) as ProfileFields;
  if (!hasHydrated.current) {
    hasHydrated.current = true;
    syncBaseline(profile);
  }
}
```

### 3. Browser autofill bypasses `updateField`

Chrome and Firefox can autofill inputs without firing `onChange`. The input's displayed value diverges from `current`, so the dirty map will show no change even though the UI looks different.

```typescript
// Listen for the 'input' event as well, which autofill does trigger in most browsers.
<input
  type="email"
  value={current.email}
  onChange={e => updateField('email', e.target.value)}
  onInput={e => updateField('email', (e.target as HTMLInputElement).value)}
  aria-label="Email address"
/>
```

### 4. Storing `dirtyMap` in `useState` creates a render cascade

If you lift `dirtyMap` into its own `useState`, every field edit causes two state updates in sequence — one for `current`, one for `dirtyMap` — doubling render work. Keep dirty state derived, not stored.

### 5. Hydration mismatch from `undefined` initial values

If any field starts as `undefined` instead of an explicit empty string, React's hydration may produce a markup mismatch between server-rendered HTML (where the input has no value attribute) and the client (where React adds one). Always provide explicit empty-string defaults for string fields.

## Verification Checklist

- `dirtyMap` is all-false immediately after mount (before any user interaction)
- `dirtyMap` is all-false immediately after `syncBaseline` resolves (no dirty flash)
- Editing a single field marks exactly that field dirty, no others
- `resetToPristine` collapses `dirtyMap` to all-false in one render
- Object-valued fields use structural comparison, not reference equality
- All inputs provide `aria-label` or are associated with a `<label>`
- `data-dirty` attributes are present and toggling correctly (verify in DevTools Elements panel)
- No `console.error` about uncontrolled-to-controlled transition (all fields initialized with non-undefined values)
- React DevTools Profiler shows no wasted renders on unaffected fields when one field changes

## FAQ

<details>
<summary><span>Why use <code>useRef</code> for the baseline instead of <code>useState</code>?</span></summary>

Mutating a ref is synchronous and never schedules a React render. If the baseline lived in `useState`, resetting it would queue a render even when `current` hasn't changed, doubling the update work during async hydration. The ref also lets `syncBaseline` update the baseline atomically — before React processes the `setCurrent` call — so there is no intermediate render where `current` has moved but `baseline` has not.

</details>

<details>
<summary>How does this approach handle nested form objects?</summary>

The hook defaults to shallow strict-equality (`!==`), which is correct for primitives. For fields that hold objects or arrays, replace the comparison for those specific keys with `JSON.stringify` or a dedicated deep-equal utility. Avoid applying serialization globally — it is O(n) in the size of the serialized value and will noticeably slow `useMemo` on forms with large embedded objects (for example, a rich-text field containing an entire document tree).

</details>

<details>
<summary>Can this hook work alongside React Hook Form or Formik?</summary>

Yes. The hook is self-contained and does not touch any library's internal state. You can mount it in the same component as a React Hook Form `useForm` call and use its `dirtyMap` to drive auto-save logic, unsaved-changes warnings, or custom submission guards. If you are using React Hook Form, note that it already exposes `formState.dirtyFields` — this hook is most useful when you need dirty tracking outside React Hook Form's controlled lifecycle, for example in a hybrid uncontrolled form where some fields are managed by refs. See [building a custom useFormField hook](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/) for a pattern that composes well with this approach.

</details>

<details>
<summary>What is the performance impact on large forms?</summary>

`useMemo` runs in O(n) time relative to field count, but only when `current` changes. For forms with roughly 100 or more fields, two strategies help: (1) debounce rapid typing so `setCurrent` is called at most once every 150 ms rather than on every keystroke; (2) split the form into subsections with their own `useDirtyTracker` instances so only the relevant section's memo runs on each update. For [debouncing validation triggers](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/) the same debounce wrapper applies here.

</details>

---

**Related**

- [Implementing Pristine State in Vue 3](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/implementing-pristine-state-in-vue-3/) — equivalent pattern using Vue 3's reactive refs and watchers
- [Building a Custom useFormField Hook](https://www.client-side-form.com/framework-adapters-custom-hooks/react-form-hook-architecture/building-a-custom-useformfield-hook/) — composable hook architecture that this tracker plugs into
- [Debouncing Validation Triggers in React](https://www.client-side-form.com/validation-logic-schema-integration/synchronous-validation-patterns/debouncing-validation-triggers-in-react/) — pair with dirty tracking to avoid validation on every keystroke
- [Mapping Validation Errors to UI Components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/) — wire dirty flags to error display so errors only surface on touched fields

← [Dirty and Pristine State Tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/)
