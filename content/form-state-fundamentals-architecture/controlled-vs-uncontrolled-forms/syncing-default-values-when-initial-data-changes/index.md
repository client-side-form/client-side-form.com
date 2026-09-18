---
layout: page.njk
title: "Syncing Default Values When Initial Data Changes"
description: "Why an uncontrolled input ignores a new defaultValue after mount, and how to re-seed a form from fresh server data with a keyed remount or an explicit reset — without wiping edits the user has already made."
slug: syncing-default-values-when-initial-data-changes
type: howto
breadcrumb: "Syncing Default Values"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Syncing Default Values When Initial Data Changes"
  parent: "Controlled vs Uncontrolled Forms"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Syncing Default Values When Initial Data Changes",
      "description": "Why an uncontrolled input ignores a new defaultValue after mount, and how to re-seed a form from fresh server data with a keyed remount or an explicit reset — without wiping edits the user has already made.",
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
          "name": "Controlled vs Uncontrolled Forms",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Syncing Default Values When Initial Data Changes",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/syncing-default-values-when-initial-data-changes/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Re-seed a form when its initial data changes",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give every record a seed identity"
        },
        {
          "@type": "HowToStep",
          "name": "Write the re-seed decision as a pure function"
        },
        {
          "@type": "HowToStep",
          "name": "Re-seed by remounting, not by patching values"
        },
        {
          "@type": "HowToStep",
          "name": "Move the baseline in the same step"
        },
        {
          "@type": "HowToStep",
          "name": "Turn \"newer data during an edit\" into a prompt"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why doesn't my input update when the defaultValue prop changes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because defaultValue only seeds the element when it is created. After mount, a changed prop updates the HTML attribute, and the browser deliberately does not copy an attribute change into a value the user may already have edited. Remount the input (usually via a key) or assign el.value and el.defaultValue yourself."
          }
        },
        {
          "@type": "Question",
          "name": "Should I just make the form controlled to avoid this?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Switching to controlled inputs moves the problem rather than removing it: you still need a rule for when incoming data replaces local state, and without one a refetch overwrites typing. The decision function on this page is the part that matters, and it works for both models."
          }
        },
        {
          "@type": "Question",
          "name": "Is it safe to use the record's updatedAt instead of a version number?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually, provided the server sets it and it has enough precision that two quick edits never share a timestamp. Compare it numerically after parsing, not as a string, and treat an equal or older value as a duplicate to ignore."
          }
        }
      ]
    }
  ]
}
</script>

# Syncing Default Values When Initial Data Changes

An uncontrolled input reads `defaultValue` exactly once, at mount, so when the record behind a form arrives late or changes underneath it the fields keep showing the old values while your state believes the new ones are loaded.

This is the most common way the split described in [controlled vs uncontrolled forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/) bites in production: an edit screen mounts with an empty or cached record, the fetch resolves a moment later, and nothing on screen changes. If you track edits against a baseline, the same event also corrupts [dirty and pristine state tracking](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/), because the baseline moves while the DOM does not.

---

## Context and prerequisites

Three different "initial values" are in play on any edit form, and the bug comes from treating them as one:

- **The DOM's default** — the `defaultValue` property the browser captured when the element was created. `form.reset()` restores this.
- **Your baseline** — the snapshot your form state compares against to decide what is dirty.
- **The server record** — what the API currently says the entity looks like.

On first render all three agree. The moment the record changes (a late fetch, a websocket push, a route change to a different entity that reuses the same component) the server record moves, and whichever of the other two you forget to move goes stale. React makes this especially easy to miss: changing the `defaultValue` prop on an already-mounted `<input>` updates the attribute but never touches the element's current value, by design.

<svg viewBox="0 0 680 197" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards showing the DOM default, the form baseline and the server record, and what updates each one when the record changes." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Three initial values, one of which the browser owns</title>
  <desc>The DOM default is captured at element creation and only changes on remount or when you assign defaultValue directly. The form baseline is a snapshot in your state and changes only when your code rebases it. The server record changes whenever a fetch or push arrives. A stale-field bug is any moment where these three disagree and the reader cannot tell.</desc>
  <rect x="0" y="0" width="680" height="197" fill="#f9f5fb"/>
  <text x="14.0" y="22.0" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">What moves when the record changes</text>
  <rect x="14.0" y="36.0" width="208.0" height="127.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="59.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">DOM default</text>
  <text x="26.0" y="78.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Captured when the element is created.</text>
  <text x="26.0" y="92.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A new defaultValue prop after mount</text>
  <text x="26.0" y="106.0" font-size="9.5" fill="#6b5f75" font-family="inherit">changes the attribute, not the visible</text>
  <text x="26.0" y="120.0" font-size="9.5" fill="#6b5f75" font-family="inherit">value.</text>
  <text x="26.0" y="134.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves on: remount, or explicit</text>
  <text x="26.0" y="148.0" font-size="9.5" fill="#6b5f75" font-family="inherit">el.defaultValue = x.</text>
  <rect x="236.0" y="36.0" width="208.0" height="127.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="59.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Form baseline</text>
  <text x="248.0" y="78.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Your snapshot for dirty comparison and</text>
  <text x="248.0" y="92.0" font-size="9.5" fill="#6b5f75" font-family="inherit">reset.</text>
  <text x="248.0" y="106.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves only when your code rebases it.</text>
  <text x="248.0" y="120.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Stale baseline = fields flagged dirty that</text>
  <text x="248.0" y="134.0" font-size="9.5" fill="#6b5f75" font-family="inherit">the user never touched.</text>
  <rect x="458.0" y="36.0" width="208.0" height="127.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="59.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Server record</text>
  <text x="470.0" y="78.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Whatever the latest fetch or push</text>
  <text x="470.0" y="92.0" font-size="9.5" fill="#6b5f75" font-family="inherit">returned.</text>
  <text x="470.0" y="106.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves on its own schedule, often after</text>
  <text x="470.0" y="120.0" font-size="9.5" fill="#6b5f75" font-family="inherit">first paint.</text>
  <text x="470.0" y="134.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The only one of the three you do not</text>
  <text x="470.0" y="148.0" font-size="9.5" fill="#6b5f75" font-family="inherit">control.</text>
  <text x="14.0" y="185.0" font-size="10" fill="#6b5f75" font-family="inherit">The fix is always the same shape: pick one event that moves all three together, and make it explicit.</text>
</svg>

---

## The core pattern: a record-keyed seed with an edit guard

The robust approach has two parts. First, derive a **seed identity** from the record — its id plus a version or `updatedAt` — and use that identity to decide when to re-seed. Second, refuse to re-seed silently while the user has unsaved edits; surface the conflict instead.

```typescript
import { useEffect, useRef, useState } from "react";

interface Profile {
  id: string;
  version: number;        // server-side optimistic-concurrency counter
  displayName: string;
  email: string;
}

type SeedDecision = "seed" | "ignore" | "conflict";

// Pure decision function: easy to unit test, no React in it.
export function decideReseed(
  current: Profile | null,
  incoming: Profile,
  isDirty: boolean,
): SeedDecision {
  if (!current) return "seed";                        // first load
  if (current.id !== incoming.id) return "seed";      // different entity: always replace
  if (incoming.version <= current.version) return "ignore"; // stale or duplicate push
  return isDirty ? "conflict" : "seed";               // newer data vs. local edits
}

export function useSeededForm(incoming: Profile | undefined) {
  // The record the form was last seeded from. A ref, not state: changing it
  // must not re-render on its own — the seedKey below drives remounts.
  const seededFrom = useRef<Profile | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [pending, setPending] = useState<Profile | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!incoming) return;
    const decision = decideReseed(seededFrom.current, incoming, dirtyRef.current);
    if (decision === "seed") {
      seededFrom.current = incoming;
      dirtyRef.current = false;
      setPending(null);
      // Bumping the key remounts the <form>, so every uncontrolled input
      // re-reads defaultValue. This moves DOM default AND baseline together.
      setSeedKey((k) => k + 1);
    } else if (decision === "conflict") {
      setPending(incoming); // let the UI ask; never overwrite typing silently
    }
  }, [incoming]);

  return {
    seedKey,
    defaults: seededFrom.current,
    pending,
    markDirty: () => { dirtyRef.current = true; },
    acceptPending: () => {
      if (!pending) return;
      seededFrom.current = pending;
      dirtyRef.current = false;
      setPending(null);
      setSeedKey((k) => k + 1);
    },
  };
}
```

The component renders the form with `key={seedKey}` and reads each input's `defaultValue` from `defaults`. Because the key changes only when the hook decides to seed, a background refetch that returns the same version does nothing, a different entity always replaces the form, and a genuinely newer version arriving during an edit produces a visible prompt rather than a wiped field.

```tsx
function ProfileForm({ profile }: { profile?: Profile }) {
  const seed = useSeededForm(profile);
  if (!seed.defaults) return <p role="status">Loading profile…</p>;
  return (
    <>
      {seed.pending && (
        <div role="alert">
          This profile was updated elsewhere.
          <button type="button" onClick={seed.acceptPending}>Load the new version</button>
        </div>
      )}
      <form key={seed.seedKey} onInput={seed.markDirty}>
        <input name="displayName" defaultValue={seed.defaults.displayName} />
        <input name="email" type="email" defaultValue={seed.defaults.email} />
      </form>
    </>
  );
}
```

---

## Step-by-step walkthrough

1. **Give every record a seed identity.** Use the entity id plus a monotonically increasing version or `updatedAt`. Without a version you cannot tell a stale cache hit from a real update, and you will re-seed on every refetch.
2. **Write the re-seed decision as a pure function.** `decideReseed` takes the current seed, the incoming record and the dirty flag, and returns one of three answers. Keeping it free of framework code means the rule is testable in isolation and portable to Vue or Svelte.
3. **Re-seed by remounting, not by patching values.** A key change recreates every input, so each one re-reads its `defaultValue`, and `form.reset()` afterwards restores the new values rather than the old ones.
4. **Move the baseline in the same step.** Setting `seededFrom` and clearing the dirty flag inside the same branch that bumps the key keeps the DOM default and your comparison snapshot aligned.
5. **Turn "newer data during an edit" into a prompt.** A `role="alert"` banner with an explicit accept action respects the user's typing and makes the conflict visible; the deeper merge strategies are covered in [resolving conflicts when restoring a draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/).

The sequence below shows the late-fetch case, which is the one most teams hit first.

<svg viewBox="0 0 680 305" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram between the server, the seed hook and the form DOM showing a cached record rendering first, a fresher record arriving, the hook comparing versions and remounting the form so the inputs show the new values." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A late fetch with and without a record-keyed seed</title>
  <desc>The form first mounts from a cached record at version 3. The network fetch then returns version 4. The seed hook compares ids and versions, sees the form is not dirty, bumps the seed key and remounts the form, so the inputs read the version 4 defaults. Later a background refetch returns version 4 again and the hook ignores it. Finally a version 5 push arrives while the user is typing; the hook reports a conflict and shows a prompt instead of remounting.</desc>
  <rect x="0" y="0" width="680" height="305" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="122.7" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server / cache</text>
  <rect x="239.3" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="340.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Seed hook</text>
  <rect x="456.7" y="12.0" width="201.3" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="557.3" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form DOM</text>
  <path d="M122.7,41.0 V255.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M340.0,41.0 V255.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M557.3,41.0 V255.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="130.7" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cached record v3 arrives first</text>
  <path d="M122.7,69.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,65.0 339.0,69.0 332.0,73.0" fill="#7b4f8a"/>
  <text x="348.0" y="93.0" font-size="9.5" fill="#6b5f75" font-family="inherit">mount with key 1, defaults from v3</text>
  <path d="M340.0,97.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,93.0 556.3,97.0 549.3,101.0" fill="#7b4f8a"/>
  <text x="130.7" y="121.0" font-size="9.5" fill="#6b5f75" font-family="inherit">fetch resolves: v4</text>
  <path d="M122.7,125.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,121.0 339.0,125.0 332.0,129.0" fill="#7b4f8a"/>
  <text x="348.0" y="149.0" font-size="9.5" fill="#2d6342" font-family="inherit">not dirty: bump key to 2, inputs re-read v4</text>
  <path d="M340.0,153.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,149.0 556.3,153.0 549.3,157.0" fill="#7b4f8a"/>
  <text x="130.7" y="177.0" font-size="9.5" fill="#6b5f75" font-family="inherit">refetch returns v4 again</text>
  <path d="M122.7,181.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,177.0 339.0,181.0 332.0,185.0" fill="#7b4f8a"/>
  <text x="130.7" y="205.0" font-size="9.5" fill="#a63d6f" font-family="inherit">push: v5 while user types</text>
  <path d="M122.7,209.0 H332.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,205.0 339.0,209.0 332.0,213.0" fill="#7b4f8a"/>
  <text x="348.0" y="233.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">dirty: show prompt, keep typed values</text>
  <path d="M340.0,237.0 H549.3" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="549.3,233.0 556.3,237.0 549.3,241.0" fill="#7b4f8a"/>
  <text x="14.0" y="277.0" font-size="10" fill="#6b5f75" font-family="inherit">The refetch that repeats v4 is ignored because the version did not increase — without that check every focus-refetch would remount the</text>
  <text x="14.0" y="293.0" font-size="10" fill="#6b5f75" font-family="inherit">form.</text>
</svg>

---

## Failure modes and edge cases

### 1. Changing `defaultValue` and expecting the input to follow

```tsx
// BROKEN: after mount, React updates the attribute only. The field still shows
// the value the element was created with.
<input name="email" defaultValue={profile.email} />
```

Either key the form on the seed identity, or — if you cannot remount because focus or scroll position would be lost — assign the new default and the value directly on the element: `el.defaultValue = next; el.value = next;`. Assigning only `value` leaves `form.reset()` restoring the stale default.

### 2. Remounting on every refetch

Libraries that refetch on window focus return a *new object* with identical content. If your key is the object identity, or you re-seed whenever `incoming` changes, every tab switch wipes in-progress edits. Compare ids and versions, never references.

### 3. Keying on the id alone

With `key={profile.id}` a same-entity update never re-seeds, which is correct while the user is editing and wrong when they are not: a colleague's change lands in the cache and the form keeps showing the old value until a full reload. The version comparison in `decideReseed` covers both cases.

### 4. Focus lost on re-seed

A remount destroys the focused element. If a re-seed can happen while the form is on screen and focused, record `document.activeElement?.getAttribute("name")` before bumping the key and restore focus to the same-named field in an effect afterwards, as described in [restoring focus after an async submission](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/restoring-focus-after-an-async-submission/).

### 5. Controlled libraries with their own `reset`

Form libraries that hold values in state expose a `reset(values)` call instead of relying on the DOM default. The same decision function applies; call `reset(incoming)` in the "seed" branch and skip the key entirely. Calling `reset` unconditionally in an effect has exactly the refetch problem from failure mode 2.

<svg viewBox="0 0 680 205" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison table of three ways to re-seed a form — keyed remount, direct DOM assignment and a library reset call — across what they update, focus impact, and when to use them." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which re-seed technique fits which form</title>
  <desc>A keyed remount updates the DOM default, the value and the baseline together but loses focus and any component-local state. Direct DOM assignment keeps focus but must set both defaultValue and value on every field, and your baseline separately. A library reset call updates the library&#x27;s values and its baseline but not the native DOM default, so a native form.reset afterwards will disagree. Use remount for uncontrolled forms that are not focused, direct assignment for background updates on a visible form, and the library call for controlled forms.</desc>
  <rect x="0" y="0" width="680" height="205" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="159.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Technique</text>
  <text x="156.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Updates</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Focus</text>
  <text x="482.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Use it when</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Keyed remount</text>
  <text x="156.8" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">default, value and baseline in one step</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">lost; restore it by field</text>
  <text x="350.0" y="75.0" font-size="9.5" fill="#a63d6f" font-family="inherit">name</text>
  <text x="482.8" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Uncontrolled form, record swapped</text>
  <text x="482.8" y="75.0" font-size="9.5" fill="#6b5f75" font-family="inherit">before editing starts</text>
  <line x1="14" y1="85.0" x2="666" y2="85.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="104.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Direct DOM assignment</text>
  <text x="156.8" y="104.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">value and default per field; baseline by</text>
  <text x="156.8" y="118.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">hand</text>
  <text x="350.0" y="104.5" font-size="9.5" fill="#2d6342" font-family="inherit">kept</text>
  <text x="482.8" y="104.5" font-size="9.5" fill="#6b5f75" font-family="inherit">A visible form receiving a background</text>
  <text x="482.8" y="118.0" font-size="9.5" fill="#6b5f75" font-family="inherit">update</text>
  <line x1="14" y1="128.0" x2="666" y2="128.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="147.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Library reset(values)</text>
  <text x="156.8" y="147.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">library values and baseline, not the</text>
  <text x="156.8" y="161.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">native default</text>
  <text x="350.0" y="147.5" font-size="9.5" fill="#2d6342" font-family="inherit">kept</text>
  <text x="482.8" y="147.5" font-size="9.5" fill="#6b5f75" font-family="inherit">Controlled form where the library</text>
  <text x="482.8" y="161.0" font-size="9.5" fill="#6b5f75" font-family="inherit">owns values</text>
  <text x="14.0" y="193.0" font-size="10" fill="#6b5f75" font-family="inherit">Mixing techniques is where drift comes from: a library reset followed by a native form.reset() restores the values from first mount.</text>
</svg>

---

## Verification checklist

- [ ] Loading the edit screen with a cold cache shows the fetched values, not blanks, once the request resolves.
- [ ] Switching from one entity to another in the same route replaces every field.
- [ ] A window-focus refetch that returns the same version does not remount the form or move the cursor.
- [ ] A newer version arriving while the user is typing shows a prompt and keeps the typed text.
- [ ] After a re-seed, `form.reset()` restores the new values, not the ones from first mount.
- [ ] After a re-seed, the form reports itself pristine and the unsaved-changes guard stays quiet.
- [ ] Focus returns to the same-named field if a re-seed happened while a field was focused.
- [ ] The update prompt is announced by a screen reader and its action is reachable by keyboard.

---

## Frequently Asked Questions

<details>
<summary><strong>Why doesn't my input update when the defaultValue prop changes?</strong></summary>

Because `defaultValue` only seeds the element when it is created. After mount, a changed prop updates the HTML attribute, and the browser deliberately does not copy an attribute change into a value the user may already have edited. Remount the input (usually via a `key`) or assign `el.value` and `el.defaultValue` yourself.

</details>

<details>
<summary><strong>Should I just make the form controlled to avoid this?</strong></summary>

Switching to controlled inputs moves the problem rather than removing it: you still need a rule for when incoming data replaces local state, and without one a refetch overwrites typing. The decision function on this page is the part that matters, and it works for both models.

</details>

<details>
<summary><strong>Is it safe to use the record's updatedAt instead of a version number?</strong></summary>

Usually, provided the server sets it and it has enough precision that two quick edits never share a timestamp. Compare it numerically after parsing, not as a string, and treat an equal or older value as a duplicate to ignore.

</details>

---

## Related

- [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
- [Resetting the Dirty Baseline After a Successful Save](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/resetting-the-dirty-baseline-after-a-successful-save/)
- [When to Switch Between Controlled and Uncontrolled Mid-Lifecycle](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/when-to-switch-controlled-uncontrolled-mid-lifecycle/)

← [Controlled vs Uncontrolled Forms](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/)
