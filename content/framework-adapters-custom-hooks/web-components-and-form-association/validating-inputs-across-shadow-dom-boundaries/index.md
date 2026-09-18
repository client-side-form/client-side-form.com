---
layout: page.njk
title: "Validating Inputs Across Shadow DOM Boundaries"
description: "Ids, label associations and querySelector all stop at a shadow root. Two component shapes that keep references resolvable, and boundary-aware replacements for the queries a form relies on."
slug: validating-inputs-across-shadow-dom-boundaries
type: howto
breadcrumb: "Validating Inputs Across Shadow DOM Boundaries"
datePublished: "2026-08-05"
dateModified: "2026-08-05"
eleventyNavigation:
  key: "Validating Inputs Across Shadow DOM Boundaries"
  parent: "Web Components and Form Association"
  order: 2
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating Inputs Across Shadow DOM Boundaries",
      "description": "Ids, label associations and querySelector all stop at a shadow root. Two component shapes that keep references resolvable, and boundary-aware replacements for the queries a form relies on.",
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
          "name": "Framework Adapters & Custom Hooks",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Web Components and Form Association",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Validating Inputs Across Shadow DOM Boundaries",
          "item": "https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Keep validation references working across a shadow boundary",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Choose one component shape and keep references inside one tree"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Pass element references, never ids, across a boundary"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Replace attribute queries with the form elements collection"
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Delegate focus so label clicks and links land on the control"
        },
        {
          "@type": "HowToStep",
          "position": 5,
          "name": "Expose the inner control as a part for styling"
        },
        {
          "@type": "HowToStep",
          "position": 6,
          "name": "Dispatch every form-facing event with composed set to true"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can aria-describedby point at an element in another tree?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not by id — id references are scoped to the tree they are written in, so an attribute in the light DOM cannot name an element inside a shadow root, and vice versa. ElementInternals exposes ariaDescribedByElements, which takes element references rather than strings, and references cross the boundary. Where that is unavailable, the fallback is to keep the message inside the same tree as the control that references it."
          }
        },
        {
          "@type": "Question",
          "name": "Why does my first-invalid query find nothing?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Because querySelector does not descend into shadow roots, so an attribute selector on the form matches only light-DOM inputs. Iterate form.elements instead: form-associated custom elements are members of that collection, and each exposes its own validity through the API you gave it. That also avoids depending on aria-invalid being mirrored onto the host at all."
          }
        },
        {
          "@type": "Question",
          "name": "Should the label live inside or outside the component?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Inside, if the component is a whole field — then the label, the control and the message are one tree and every reference resolves. Outside, if the control is a leaf that a form composes with its own labels; in that case use label with a for attribute pointing at the host, and set delegatesFocus so the click reaches the inner input. Wrapping a custom element in a label does not create an association."
          }
        }
      ]
    }
  ]
}
</script>

# Validating Inputs Across Shadow DOM Boundaries

The exact problem: a form's "focus the first invalid field" routine returns nothing, its error summary links go nowhere, and `aria-describedby` points at an id that resolves to null — because the fields are inside shadow roots and every one of those mechanisms is scoped to a single tree.

## Context and Prerequisites

This assumes the controls are already form-associated as described in [web components and form association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/). Form association solves value and validity. It does not solve *reference*: ids, `for`, `aria-describedby` and `querySelector` all stop at a shadow boundary, and each needs a different answer.

## What Crosses the Boundary, and What Does Not

```typescript
// Inside a shadow root, ids are scoped to that root. This is the whole problem.
// document.getElementById('email-error') will not find an element inside a
// shadow tree, and aria-describedby="email-error" on a light-DOM input will
// not resolve to it either.

// Crosses: form association, events (composed), CSS custom properties, ::part.
// Does not cross: ids, label[for], aria-describedby by id, querySelector.
```

The practical consequence is that a message element must live in the *same tree* as the thing that references it. There are only two shapes that work, and mixing them is what produces the dangling references.

**Shape A — the whole field is one component.** The input, its label, its message element and its `aria-describedby` wiring all live inside one shadow root. Ids are internal, so they always resolve, and the outside world only needs the value and validity that form association already provides. This is the shape to prefer.

**Shape B — the control is a leaf and the form owns the messages.** The message lives in the light DOM, so it cannot be referenced by id from inside the shadow root. `ElementInternals` provides the escape hatch: `internals.ariaDescribedByElements` takes element references rather than ids, and references may cross the boundary.

```typescript
// Shape B: the form hands the element the message NODE, not an id string.
// Element references cross shadow boundaries; id strings do not.
element.internals.ariaDescribedByElements = [messageEl];
```

<svg viewBox="0 8 690 226" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two component shapes: one where the label, input and message all live inside the shadow root so ids resolve internally, and one where the control is a leaf and the form passes element references through ElementInternals." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Keep references inside one tree, or pass elements instead of ids</title>
  <desc>Shape A: a single component owns the label, the input and the message element, all inside one shadow root. Every id reference is internal so it always resolves, and the outside world interacts only through the value and validity that form association already exposes. Shape B: the control is a leaf element and the form owns the message in the light DOM. An id reference cannot cross the boundary, so the form passes the message element itself through the internals' described-by element list, which accepts references rather than strings.</desc>
  <rect x="0" y="8" width="690" height="226" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">Shape A — one component owns everything</text>
  <rect x="14" y="38" width="316" height="150" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="60" font-size="9.5" fill="#6b5f75" font-family="inherit">shadow root</text>
  <rect x="28" y="70" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#cbb8d9" stroke-width="1.2"/>
  <text x="40" y="89" font-size="10" fill="#1e1a24" font-family="inherit">&lt;label&gt;Email&lt;/label&gt;</text>
  <rect x="28" y="106" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#cbb8d9" stroke-width="1.2"/>
  <text x="40" y="125" font-size="10" fill="#1e1a24" font-family="inherit">&lt;input aria-describedby="msg"&gt;</text>
  <rect x="28" y="142" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#2d6342" stroke-width="1.2"/>
  <text x="40" y="161" font-size="10" fill="#2d6342" font-family="inherit">&lt;p id="msg"&gt;…&lt;/p&gt; — same tree, resolves</text>
  <text x="360" y="28" font-size="11.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Shape B — the form owns the message</text>
  <rect x="360" y="38" width="316" height="150" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="374" y="60" font-size="9.5" fill="#6b5f75" font-family="inherit">light DOM</text>
  <rect x="374" y="70" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#cbb8d9" stroke-width="1.2"/>
  <text x="386" y="89" font-size="10" fill="#1e1a24" font-family="inherit">&lt;x-field name="email"&gt;&lt;/x-field&gt;</text>
  <rect x="374" y="106" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#a63d6f" stroke-width="1.2"/>
  <text x="386" y="125" font-size="10" fill="#a63d6f" font-family="inherit">&lt;p id="note"&gt; — id cannot cross in</text>
  <rect x="374" y="142" width="288" height="30" rx="5" fill="#f9f5fb" stroke="#2d6342" stroke-width="1.2"/>
  <text x="386" y="161" font-size="10" fill="#2d6342" font-family="inherit">ariaDescribedByElements = [msg]</text>
  <text x="14" y="212" font-size="10" fill="#6b5f75" font-family="inherit">Prefer A. Reach for B when the form must own message layout — a shared summary, or a design that positions messages itself.</text>
  <text x="14" y="228" font-size="10" fill="#6b5f75" font-family="inherit">What fails is the mixture: an id written in the light DOM and read inside the shadow root, which resolves to nothing.</text>
</svg>

<svg viewBox="0 8 690 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Form association crosses, so value and validity reach the form regardless of the boundary. Composed events cross, which is why every form-facing event needs composed set to true. CSS custom properties cross, which is how the theme reaches inside. The part pseudo-element crosses, which is how the outside styles the inside. Id references do not cross, in either direction. Label for association reaches the host but not the inner control without delegated focus. And querySelector does not descend at all." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What crosses a shadow boundary and what does not</title>
  <desc>Form association crosses, so value and validity reach the form regardless of the boundary. Composed events cross, which is why every form-facing event needs composed set to true. CSS custom properties cross, which is how the theme reaches inside. The part pseudo-element crosses, which is how the outside styles the inside. Id references do not cross, in either direction. Label for association reaches the host but not the inner control without delegated focus. And querySelector does not descend at all.</desc>
  <rect x="0" y="8" width="690" height="274" fill="#f9f5fb"/>
  <rect x="10" y="16" width="670" height="200" rx="8" fill="none" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="10" y="16" width="670" height="30" rx="8" fill="#e2d6ec"/>
  <rect x="10" y="36" width="670" height="10" fill="#e2d6ec"/>
  <text x="24" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Mechanism</text>
  <text x="190" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Crosses?</text>
  <text x="300" y="36" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Consequence</text>
  <text x="24" y="66" font-size="10" fill="#1e1a24" font-family="inherit">form association</text>
  <text x="190" y="66" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="300" y="66" font-size="10" fill="#6b5f75" font-family="inherit">value and validity reach the form</text>
  <line x1="10" y1="80" x2="680" y2="80" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="100" font-size="10" fill="#1e1a24" font-family="inherit">composed events</text>
  <text x="190" y="100" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="300" y="100" font-size="10" fill="#6b5f75" font-family="inherit">set composed: true on every one</text>
  <line x1="10" y1="114" x2="680" y2="114" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="134" font-size="10" fill="#1e1a24" font-family="inherit">custom properties, ::part</text>
  <text x="190" y="134" font-size="10" fill="#2d6342" font-family="inherit">yes</text>
  <text x="300" y="134" font-size="10" fill="#6b5f75" font-family="inherit">theming and styling work</text>
  <line x1="10" y1="148" x2="680" y2="148" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="168" font-size="10" fill="#1e1a24" font-family="inherit">id references</text>
  <text x="190" y="168" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="300" y="168" font-size="10" fill="#6b5f75" font-family="inherit">pass elements instead of ids</text>
  <line x1="10" y1="182" x2="680" y2="182" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24" y="202" font-size="10" fill="#1e1a24" font-family="inherit">querySelector</text>
  <text x="190" y="202" font-size="10" fill="#a63d6f" font-family="inherit">no</text>
  <text x="300" y="202" font-size="10" fill="#6b5f75" font-family="inherit">use form.elements instead</text>
  <text x="14" y="260" font-size="10" fill="#6b5f75" font-family="inherit">Four of the five are fine. The two that are not are exactly the two the form’s validation code depends on most.</text>
</svg>

## Step-by-Step Walkthrough

1. **Pick a shape per component and stay in it.** The failures all come from mixing.

2. **Never write an id reference across a boundary.** If a reference must cross, pass the element.

3. **Rewrite queries to be boundary-aware.** `form.querySelectorAll('[aria-invalid="true"]')` finds nothing inside shadow roots. Query the form's elements collection instead — form-associated elements appear there — and read validity from the element's own API.

4. **Delegate focus.** Without `delegatesFocus`, `focus()` on the host is a no-op, so first-invalid focus and summary links silently fail.

5. **Expose a part for the inner control.** `::part(input)` lets the form's stylesheet indicate invalid state without piercing the boundary.

6. **Compose your events.** A custom `input` or `change` event must be dispatched with `composed: true`, or a listener on the form never sees it.

## Failure Modes and Edge Cases

### 1. The first-invalid query returns nothing

```typescript
// Wrong: attribute selectors do not descend into shadow roots.
const first = form.querySelector('[aria-invalid="true"]');

// Right: iterate the form's own elements — form-associated custom elements
// are members — and ask each one for its validity.
const first = [...form.elements].find(
  (el) => 'validity' in el && !(el as HTMLObjectElement).validity.valid,
);
```

### 2. Events that stop at the boundary

An event dispatched without `composed: true` does not escape the shadow root. Every event the form listens for — `input`, `change`, a custom `field-committed` — needs it.

### 3. Focus visibly lands nowhere

`delegatesFocus` fixes `focus()`, but `document.activeElement` then reports the *host*, not the inner input. Tests asserting on the inner element must read `element.shadowRoot.activeElement`.

### 4. A label outside, a control inside

`<label for="x">` associates with a form-associated host, and the click focuses it — which works only with `delegatesFocus`. Wrapping labels (`<label><x-field></x-field></label>`) do not associate at all with custom elements; use `for`.

### 5. Styling invalid state from outside

The form's stylesheet cannot select the inner input. Reflect state onto the host as an attribute and expose the inner node as a part, then style `x-field[data-invalid]::part(input)`.

<svg viewBox="0 8 690 198" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="With delegatesFocus set, calling focus on the host moves focus to the first focusable element inside the shadow root — so label clicks, error-summary links and first-invalid routines all work. But document.activeElement then reports the host, not the inner input, because the inner element is in a different tree. Tests that assert on the inner control must read shadowRoot.activeElement instead, and code that compares activeElement against a field list must compare against hosts." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two focus questions that have different answers</title>
  <desc>With delegatesFocus set, calling focus on the host moves focus to the first focusable element inside the shadow root — so label clicks, error-summary links and first-invalid routines all work. But document.activeElement then reports the host, not the inner input, because the inner element is in a different tree. Tests that assert on the inner control must read shadowRoot.activeElement instead, and code that compares activeElement against a field list must compare against hosts.</desc>
  <rect x="0" y="8" width="690" height="198" fill="#f9f5fb"/>
  <text x="14" y="28" font-size="11.5" font-weight="700" fill="#2d6342" font-family="inherit">does focus() work?</text>
  <rect x="14" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="28" y="62" font-size="10" fill="#6b5f75" font-family="inherit">yes, with delegatesFocus</text>
  <text x="28" y="84" font-size="10" fill="#6b5f75" font-family="inherit">label clicks reach the input</text>
  <text x="28" y="106" font-size="10" fill="#6b5f75" font-family="inherit">summary links reach the input</text>
  <text x="28" y="128" font-size="10" fill="#6b5f75" font-family="inherit">first-invalid routines work</text>
  <text x="352" y="28" font-size="11.5" font-weight="700" fill="#1e1a24" font-family="inherit">what is activeElement?</text>
  <rect x="352" y="38" width="324" height="118" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="366" y="62" font-size="10" fill="#6b5f75" font-family="inherit">the host, not the inner input</text>
  <text x="366" y="84" font-size="10" fill="#6b5f75" font-family="inherit">because they are different trees</text>
  <text x="366" y="106" font-size="10" fill="#1e1a24" font-family="inherit">tests read shadowRoot.activeElement</text>
  <text x="366" y="128" font-size="10" fill="#1e1a24" font-family="inherit">field comparisons compare hosts</text>
  <text x="14" y="190" font-size="10" fill="#6b5f75" font-family="inherit">Both answers are correct and they surprise people in opposite directions, which is why they are worth writing down.</text>
</svg>

## Verification Checklist

- [ ] The first-invalid routine finds custom elements
- [ ] Summary links move focus into the shadow root's input
- [ ] `aria-describedby` resolves — by id within a tree, or by element reference across one
- [ ] Every dispatched event the form listens for is `composed`
- [ ] Labels use `for`, not wrapping
- [ ] Invalid state is styleable from outside via a part and a host attribute
- [ ] Tests read `shadowRoot.activeElement` where focus is delegated

---

**Related**

- [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/) — value and validity across the boundary
- [Form-Associated Custom Elements with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/form-associated-custom-elements-with-elementinternals/) — the element implementation
- [Wiring aria-describedby for Multiple Errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/) — the token model inside one tree

← [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)

## Frequently Asked Questions

<details>
<summary><strong>Can aria-describedby point at an element in another tree?</strong></summary>

Not by id — id references are scoped to the tree they are written in, so an attribute in the light DOM cannot name an element inside a shadow root, and vice versa. ElementInternals exposes ariaDescribedByElements, which takes element references rather than strings, and references cross the boundary. Where that is unavailable, the fallback is to keep the message inside the same tree as the control that references it.

</details>

<details>
<summary><strong>Why does my first-invalid query find nothing?</strong></summary>

Because querySelector does not descend into shadow roots, so an attribute selector on the form matches only light-DOM inputs. Iterate form.elements instead: form-associated custom elements are members of that collection, and each exposes its own validity through the API you gave it. That also avoids depending on aria-invalid being mirrored onto the host at all.

</details>

<details>
<summary><strong>Should the label live inside or outside the component?</strong></summary>

Inside, if the component is a whole field — then the label, the control and the message are one tree and every reference resolves. Outside, if the control is a leaf that a form composes with its own labels; in that case use label with a for attribute pointing at the host, and set delegatesFocus so the click reaches the inner input. Wrapping a custom element in a label does not create an association.

</details>

