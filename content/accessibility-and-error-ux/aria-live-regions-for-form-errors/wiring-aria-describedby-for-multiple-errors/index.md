---
layout: page.njk
title: "Wiring aria-describedby for Multiple Errors"
description: "Associate one input with a hint, an error, and a live character count using a space-separated aria-describedby token list — add and remove ids without clobbering."
slug: wiring-aria-describedby-for-multiple-errors
type: howto
breadcrumb: "aria-describedby for Multiple Errors"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Wiring aria-describedby for Multiple Errors"
  parent: "ARIA Live Regions for Form Errors"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Wiring aria-describedby for Multiple Errors",
      "description": "Associate one input with a hint, an error, and a live character count using a space-separated aria-describedby token list — add and remove ids without clobbering.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Accessibility & Error UX", "item": "https://client-side-form.com/accessibility-and-error-ux/" },
        { "@type": "ListItem", "position": 3, "name": "ARIA Live Regions for Form Errors", "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/" },
        { "@type": "ListItem", "position": 4, "name": "aria-describedby for Multiple Errors", "item": "https://client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Wire aria-describedby for multiple descriptions",
      "step": [
        { "@type": "HowToStep", "name": "Give every hint, error, and counter element a stable, unique id" },
        { "@type": "HowToStep", "name": "Read the current aria-describedby into an ordered token list" },
        { "@type": "HowToStep", "name": "Add or remove only the token you own, preserving foreign tokens" },
        { "@type": "HowToStep", "name": "Write the deduplicated token list back, or remove the attribute when empty" },
        { "@type": "HowToStep", "name": "Order tokens hint, then error, then counter to control announcement sequence" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does the order of ids in aria-describedby change what the screen reader announces?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Assistive technology concatenates the referenced elements in the order the ids appear in the token list, not in DOM order. Put the persistent hint first, the error second, and a volatile character count last so the most stable guidance is read before transient state." }
        },
        {
          "@type": "Question",
          "name": "Should I remove the error id from aria-describedby when the field becomes valid?",
          "acceptedAnswer": { "@type": "Answer", "text": "Remove the error token but keep its element in the DOM if you use a live region to announce clearing. Leaving a stale error id in the token list makes the screen reader read an empty or hidden node, which sounds like a glitch. Toggle only the token you own and never rebuild the whole attribute." }
        },
        {
          "@type": "Question",
          "name": "Why did my aria-describedby lose the hint id when I set the error?",
          "acceptedAnswer": { "@type": "Answer", "text": "You assigned the attribute with a single string instead of merging into the existing token list. setAttribute overwrites the whole value, so writing the error id alone clobbers the hint and counter ids. Read the current tokens, add yours, deduplicate, and write the merged list back." }
        }
      ]
    }
  ]
}
</script>

# Wiring aria-describedby for Multiple Errors

A single input frequently needs three descriptions at once — a persistent format hint, a validation error, and a live character count — and `aria-describedby` is the only attribute that carries all three, but only if you treat its value as an ordered token list rather than a string you overwrite.

The bug this page fixes: your error message reaches the screen reader, but the format hint silently disappears, because the code called `input.setAttribute('aria-describedby', errorId)` and clobbered the two ids that were already there. `aria-describedby` accepts a *space-separated list* of ids, and every subsystem that wants to describe the field must add and remove only its own token without disturbing the others.

This pattern sits underneath the [ARIA live regions for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/) work: the live region announces the *change*, while `aria-describedby` provides the descriptions a screen reader reads when the user navigates *back onto* the field. You need both, and they reference the same error node.

---

## The token-list model

`aria-describedby` is an [IDREF list](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/). Its value is any number of element ids separated by ASCII spaces. When focus lands on the input, assistive technology looks up each id in order, gathers the text content of each referenced element, and reads them as one description string. Three consequences follow directly:

- **Order in the token list controls announcement order** — not DOM order, not source order. `describedby="hint err count"` reads hint → error → count regardless of where those nodes sit on the page.
- **A dangling id is not an error** but it is a defect: the browser skips ids that resolve to nothing, so a stale error id whose element you removed produces a silent gap or, worse, reads a hidden empty node on some AT.
- **Every writer must be additive.** The hint is written once at render. The validator adds and removes the error id. The counter adds its id when the field has a maxlength. None may overwrite the others.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 250" role="img" aria-label="Diagram of an input whose aria-describedby lists three ids resolving to hint, error, and count elements" style="max-width:100%;height:auto;display:block;margin:2rem auto;">
  <title>aria-describedby token list resolution</title>
  <desc>An input element with aria-describedby containing three space-separated ids, each arrow pointing to the hint, error, and count elements it references, read in list order.</desc>
  <rect x="0" y="0" width="720" height="250" fill="#f9f5fb"/>
  <rect width="720" height="250" rx="12" fill="none" stroke="#cbb8d9" stroke-width="1"/>
  <rect x="40" y="100" width="220" height="50" rx="8" fill="none" stroke="#cbb8d9" stroke-width="2"/>
  <text x="150" y="122" text-anchor="middle" font-family="inherit" font-size="12" font-weight="600" fill="#1e1a24">&lt;input aria-describedby=</text>
  <text x="150" y="140" text-anchor="middle" font-family="inherit" font-size="11" fill="#6b5f75">"pw-hint pw-err pw-count"&gt;</text>
  <rect x="470" y="30" width="200" height="44" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="570" y="50" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">#pw-hint</text>
  <text x="570" y="66" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">read 1st — persistent</text>
  <rect x="470" y="103" width="200" height="44" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="570" y="123" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">#pw-err</text>
  <text x="570" y="139" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">read 2nd — toggled</text>
  <rect x="470" y="176" width="200" height="44" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="570" y="196" text-anchor="middle" font-family="inherit" font-size="11" font-weight="600" fill="#1e1a24">#pw-count</text>
  <text x="570" y="212" text-anchor="middle" font-family="inherit" font-size="10" fill="#6b5f75">read 3rd — volatile</text>
  <path d="M260 118 C360 90 400 60 470 52" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-describedby)"/>
  <path d="M260 125 L470 125" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-describedby)"/>
  <path d="M260 132 C360 160 400 190 470 198" fill="none" stroke="#7b4f8a" stroke-width="1.5" marker-end="url(#arr-describedby)"/>
  <defs>
    <marker id="arr-describedby" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7b4f8a"/>
    </marker>
  </defs>
</svg>

---

## Core implementation

The whole pattern reduces to two safe primitives — add a token, remove a token — that read the current list, mutate only their own id, deduplicate, and write back. Everything else builds on them.

```typescript
/**
 * Read aria-describedby into an ordered, de-duplicated token array.
 * Splitting on /\s+/ and filtering Boolean drops the empty string that
 * results from a missing attribute or stray double spaces.
 */
function getDescribedBy(el: HTMLElement): string[] {
  const raw = el.getAttribute("aria-describedby") ?? "";
  return raw.split(/\s+/).filter(Boolean);
}

/**
 * Write tokens back, or remove the attribute entirely when the list is
 * empty. An empty aria-describedby="" is technically valid but some AT
 * still tries to resolve it, so removing it is cleaner.
 */
function setDescribedBy(el: HTMLElement, tokens: string[]): void {
  if (tokens.length === 0) {
    el.removeAttribute("aria-describedby");
  } else {
    el.setAttribute("aria-describedby", tokens.join(" "));
  }
}

/**
 * Add `id` to the list if absent. `position` controls announcement order:
 * "end" for volatile state (counter), or an explicit index for the error,
 * which must sit after the hint but before the counter.
 */
function addDescribedBy(el: HTMLElement, id: string, index?: number): void {
  const tokens = getDescribedBy(el);
  if (tokens.includes(id)) return; // idempotent — never duplicate a token
  if (index === undefined || index >= tokens.length) {
    tokens.push(id);
  } else {
    tokens.splice(index, 0, id);
  }
  setDescribedBy(el, tokens);
}

/** Remove only the caller's own id; foreign tokens are untouched. */
function removeDescribedBy(el: HTMLElement, id: string): void {
  const tokens = getDescribedBy(el).filter((t) => t !== id);
  setDescribedBy(el, tokens);
}
```

Now the field-level orchestration. A field owns up to three description ids with a fixed priority so the read order is deterministic regardless of which writer fires first:

```typescript
interface DescriptionIds {
  hint?: string;   // priority 0 — persistent format guidance
  error?: string;  // priority 1 — current validation error
  count?: string;  // priority 2 — live character count
}

const PRIORITY: (keyof DescriptionIds)[] = ["hint", "error", "count"];

/**
 * Rebuild aria-describedby from a declarative "which descriptions are
 * active" object, always emitting tokens in PRIORITY order. This is the
 * safe alternative to hand-toggling when a field's own descriptions are
 * fully owned by one controller. Foreign tokens (from a fieldset, say)
 * are preserved by prepending anything not in `ids`.
 */
function syncFieldDescriptions(
  input: HTMLElement,
  ids: DescriptionIds,
  active: { hint: boolean; error: boolean; count: boolean }
): void {
  const owned = new Set(Object.values(ids).filter(Boolean) as string[]);
  const foreign = getDescribedBy(input).filter((t) => !owned.has(t));

  const mine: string[] = [];
  for (const key of PRIORITY) {
    const id = ids[key];
    if (id && active[key]) mine.push(id);
  }
  // Foreign tokens keep their leading position; ours follow in priority.
  setDescribedBy(input, [...foreign, ...mine]);
}
```

---

The surgery is easier to picture as three states of one attribute — what was there, what you add, and what survives a cleanup:

<svg viewBox="0 8 660 236" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three states of one aria-describedby attribute. Before validation it holds only the hint token. After a failed check the two error tokens are prepended while the hint token is preserved. After the field passes, only the error tokens are removed and the hint token remains." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Adding and removing error tokens without losing the hint</title>
  <desc>State one, before validation: aria-describedby holds the single token pw-hint, contributed by the design system. State two, after a failed check: the tokens pw-err-length and pw-err-digit are prepended so errors are read first, and pw-hint is still present at the end. State three, after the field passes: only the two error tokens are filtered out and pw-hint survives untouched, which is what a blanket setAttribute call would have destroyed.</desc>
  <rect x="0" y="8" width="660" height="236" fill="#f9f5fb"/>
  <text x="14" y="24" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">1 · before validation — the design system owns the attribute</text>
  <rect x="14" y="32" width="632" height="38" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="26" y="42" width="90" height="18" rx="9" fill="#f9f5fb" stroke="#6b5f75" stroke-width="1"/>
  <text x="71" y="55" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">pw-hint</text>
  <text x="132" y="55" font-size="9.5" fill="#6b5f75" font-family="inherit">"Use 12 characters or more" — not yours to remove</text>
  <text x="14" y="98" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">2 · after a failed check — errors go in front, hint stays put</text>
  <rect x="14" y="106" width="632" height="38" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <rect x="26" y="116" width="118" height="18" rx="9" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1"/>
  <text x="85" y="129" text-anchor="middle" font-size="9.5" fill="#a63d6f" font-family="inherit">pw-err-length</text>
  <rect x="152" y="116" width="112" height="18" rx="9" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1"/>
  <text x="208" y="129" text-anchor="middle" font-size="9.5" fill="#a63d6f" font-family="inherit">pw-err-digit</text>
  <rect x="272" y="116" width="90" height="18" rx="9" fill="#f9f5fb" stroke="#6b5f75" stroke-width="1"/>
  <text x="317" y="129" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">pw-hint</text>
  <text x="376" y="129" font-size="9.5" fill="#6b5f75" font-family="inherit">order is speech order — the failure is heard first</text>
  <text x="14" y="172" font-size="11" font-weight="700" fill="#1e1a24" font-family="inherit">3 · after the field passes — filter, never overwrite</text>
  <rect x="14" y="180" width="632" height="38" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <rect x="26" y="190" width="90" height="18" rx="9" fill="#f9f5fb" stroke="#6b5f75" stroke-width="1"/>
  <text x="71" y="203" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">pw-hint</text>
  <text x="132" y="203" font-size="9.5" fill="#2d6342" font-family="inherit">only the tokens you added were removed — the hint survived</text>
  <text x="14" y="238" font-size="10" fill="#6b5f75" font-family="inherit">setAttribute("aria-describedby", errorIds) collapses all three states into state 2 and then loses the hint forever.</text>
</svg>

## Step-by-step walkthrough

1. **Assign stable ids at render.** Each description element gets a deterministic id derived from the field name: `pw-hint`, `pw-err`, `pw-count`. Deterministic ids let the validator, the counter, and any test reference the same node without querying the DOM.
2. **Write the hint once.** On mount, `addDescribedBy(input, 'pw-hint', 0)`. The hint is persistent, so it is never removed and always occupies index 0.
3. **Toggle the error on validation.** When validation fails, `addDescribedBy(input, 'pw-err', 1)` — index 1 places it after the hint. When the field becomes valid, `removeDescribedBy(input, 'pw-err')`. Only the error token moves; the hint and counter stay put.
4. **Append the counter last.** The live character count is the most volatile description, so it is appended with `addDescribedBy(input, 'pw-count')` (no index → end of list). It is read last, after guidance the user actually needs first.
5. **Read back to verify order.** After any mutation, `getDescribedBy(input)` returns `["pw-hint", "pw-err", "pw-count"]`. That array *is* the announcement order.

Because every writer goes through `addDescribedBy` / `removeDescribedBy`, no writer can clobber another. The declarative `syncFieldDescriptions` is the alternative when one controller owns all three descriptions and you would rather express intent than sequence mutations.

---

## Failure modes and edge cases

### setAttribute clobbers foreign tokens

The classic regression: `input.setAttribute('aria-describedby', errorId)` overwrites the entire list, dropping the hint and counter ids. This is why the primitives above always read-merge-write.

```typescript
// WRONG — destroys hint and count tokens
input.setAttribute("aria-describedby", "pw-err");

// RIGHT — additive, preserves the rest
addDescribedBy(input, "pw-err", 1);
```

### Duplicate ids after re-validation

Calling `addDescribedBy` on every keystroke without the `includes` guard appends `pw-err pw-err pw-err`. Some AT reads the description three times. The `if (tokens.includes(id)) return` line makes the operation idempotent — always keep it.

### A stale id whose element was unmounted

If a conditional error node is removed from the DOM but its id lingers in `aria-describedby`, the browser resolves nothing and most screen readers skip it — but VoiceOver on older Safari has been observed reading an empty description. Always `removeDescribedBy` in the same code path that unmounts the node.

### Character-count updates spamming the description

The counter node updating on every keystroke is fine for `aria-describedby` (it is read on focus, not on change) but becomes a firehose if that same node is also an `aria-live="polite"` region. Keep the counter's live announcements throttled — see [aria-invalid timing and screen reader announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/) for the debounce coordination that prevents mid-typing chatter.

### Hidden hint text still gets announced

An element referenced by `aria-describedby` is announced even if it is visually hidden with `.sr-only` — that is intentional. But `display:none` or `hidden` on the referenced node suppresses the description entirely. Use a clipping utility (`position:absolute; clip-path`), never `display:none`, for descriptions you want read but not shown.

---

It matters because the attribute is not read in isolation. A screen reader assembles one utterance per field, and your tokens are only the tail of it:

<svg viewBox="0 8 668 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The order in which a screen reader assembles one utterance for a field: the accessible name from the label, then the role, then the current value, then the invalid state, then each described-by token in attribute order." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What the reader hears, in the order they hear it</title>
  <desc>Five segments left to right forming a single utterance: the accessible name taken from the label element; the role, edit text; the current value of the field; the invalid state contributed by aria-invalid; and finally the described-by tokens, read in the order they appear in the attribute. A note underneath explains that a described-by token placed after a long hint is heard last, which is why error tokens are prepended.</desc>
  <rect x="0" y="8" width="668" height="176" fill="#f9f5fb"/>
  <text x="14" y="24" font-size="12" font-weight="700" fill="#1e1a24" font-family="inherit">One field, one utterance, assembled in this order</text>
  <rect x="14" y="34" width="112" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="70" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">name</text>
  <text x="70" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from &lt;label&gt;</text>
  <path d="M126,61 H144" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="144" y="34" width="112" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="200" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">role</text>
  <text x="200" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">"edit text"</text>
  <path d="M256,61 H274" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="274" y="34" width="112" height="54" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="330" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">value</text>
  <text x="330" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">what is typed</text>
  <path d="M386,61 H404" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="404" y="34" width="112" height="54" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="460" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">state</text>
  <text x="460" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">from aria-invalid</text>
  <path d="M516,61 H534" stroke="#7b4f8a" stroke-width="1.4"/>
  <rect x="534" y="34" width="120" height="54" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="594" y="55" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">description</text>
  <text x="594" y="72" text-anchor="middle" font-size="9.5" fill="#6b5f75" font-family="inherit">token order</text>
  <text x="14" y="118" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Consequences of the tail position</text>
  <text x="14" y="136" font-size="10" fill="#6b5f75" font-family="inherit">A reader who interrupts after the state has already heard the failure — but not why it failed.</text>
  <text x="14" y="152" font-size="10" fill="#6b5f75" font-family="inherit">Putting a 20-word hint before the error means the reason arrives several seconds late, so errors are prepended.</text>
  <text x="14" y="168" font-size="10" fill="#6b5f75" font-family="inherit">Tokens pointing at removed or empty elements contribute nothing and silently shorten the utterance.</text>
</svg>

## Verification checklist

- [ ] aria-describedby contains all active description ids, space-separated, after each state change
- [ ] Setting an error never removes the hint or counter id from the list
- [ ] Token order is hint → error → count; confirmed by reading the attribute value, not DOM order
- [ ] Adding the same id twice is a no-op (no duplicate tokens)
- [ ] The error id is removed from the list when the field becomes valid
- [ ] The attribute is fully removed (not left as ="") when no descriptions are active
- [ ] Referenced description nodes are clipped, not display:none, so AT still reads them
- [ ] Tested with NVDA + Firefox and VoiceOver + Safari: navigating onto the field reads hint, then error, then count
- [ ] axe-core reports no dangling aria-describedby id references

---

## Frequently Asked Questions

<details>
<summary><strong>Does the order of ids in aria-describedby change what the screen reader announces?</strong></summary>

Yes. Assistive technology concatenates the referenced elements in the order the ids appear in the token list, not in DOM order. Put the persistent hint first, the error second, and a volatile character count last so the most stable guidance is read before transient state. This is why the implementation inserts the error at index 1 rather than pushing it to the end.

</details>

<details>
<summary><strong>Should I remove the error id from aria-describedby when the field becomes valid?</strong></summary>

Remove the error token but keep its element in the DOM if you use a live region to announce clearing. Leaving a stale error id in the token list makes the screen reader read an empty or hidden node when the user navigates back onto the field, which sounds like a glitch. Toggle only the token you own with `removeDescribedBy` and never rebuild the whole attribute.

</details>

<details>
<summary><strong>Why did my aria-describedby lose the hint id when I set the error?</strong></summary>

You assigned the attribute with a single string instead of merging into the existing token list. `setAttribute` overwrites the whole value, so writing the error id alone clobbers the hint and counter ids. Read the current tokens with `getDescribedBy`, add yours, deduplicate, and write the merged list back — that is exactly what `addDescribedBy` does.

</details>

---

## Related

- [aria-invalid Timing and Screen Reader Announcements](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/aria-invalid-timing-and-announcements/)
- [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
- [Error State Mapping Patterns](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/)

← [ARIA Live Regions for Form Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/)
