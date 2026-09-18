---
layout: page.njk
title: "Labels and delegatesFocus for Shadow DOM Inputs"
description: "Why aria-labelledby and aria-describedby cannot cross shadow roots, how form-associated hosts become labelable, when delegatesFocus is the right tool, and patterns for wiring labels, hints and errors to inputs inside shadow DOM."
slug: labels-and-delegatesfocus-for-shadow-dom-inputs
type: howto
breadcrumb: "Shadow DOM Labels"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Labels and delegatesFocus for Shadow DOM Inputs"
  parent: "Web Components and Form Association"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Labels and delegatesFocus for Shadow DOM Inputs",
      "description": "Why aria-labelledby and aria-describedby cannot cross shadow roots, how form-associated hosts become labelable, when delegatesFocus is the right tool, and patterns for wiring labels, hints and errors to inputs inside shadow DOM.",
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
          "name": "Framework Adapters & Custom Hooks for Form State",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Web Components and Form Association",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Labels and delegatesFocus for Shadow DOM Inputs",
          "item": "https://client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/labels-and-delegatesfocus-for-shadow-dom-inputs/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Label and describe inputs that live inside shadow DOM",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Prefer Pattern A for design-system fields"
        },
        {
          "@type": "HowToStep",
          "name": "Pass text in, not references"
        },
        {
          "@type": "HowToStep",
          "name": "Order aria-describedby error-first"
        },
        {
          "@type": "HowToStep",
          "name": "Use delegatesFocus for focus, not names"
        },
        {
          "@type": "HowToStep",
          "name": "If the label must stay outside, label the host"
        },
        {
          "@type": "HowToStep",
          "name": "Test with a screen reader, not just the accessibility tree"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I use aria-label on the inner input instead of a visible label?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only when there is genuinely no visible label, which is rare in forms. Visible labels help everyone, including speech-input users who say \"click Email address\"; an aria-label that differs from visible text breaks that. Render a visible label inside the component."
          }
        },
        {
          "@type": "Question",
          "name": "Does delegatesFocus affect tab order?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The host becomes part of the sequential focus order and forwards focus to its first focusable descendant, so Tab reaches the inner input once. Avoid putting tabindex on the host as well, which can create an extra stop."
          }
        },
        {
          "@type": "Question",
          "name": "Will cross-root ARIA eventually make this simpler?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Proposals such as Reference Target aim to let hosts forward relationships to inner elements, which would allow light-DOM labels and descriptions to reach shadow inputs. Until support is broad and stable, design components so they do not need it."
          }
        }
      ]
    }
  ]
}
</script>

# Labels and delegatesFocus for Shadow DOM Inputs

The most common accessibility failure in web-component form controls is an input with no accessible name: the page has a perfectly good `<label>` and error message, but they live in the light DOM while the `<input>` lives in a shadow root, and IDREF attributes such as `for`, `aria-labelledby` and `aria-describedby` do not cross that boundary.

Screen readers then announce "edit text, blank", and the error message that visually sits under the field is never read. [Web components and form association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/) explains how custom elements join forms; this page solves naming and description — which patterns work today across browsers, and what `delegatesFocus` does and does not fix.

---

## Context and prerequisites

The rules that constrain you:

- **IDREFs resolve within one tree.** `aria-describedby="err-1"` on an input inside a shadow root looks for `id="err-1"` inside the *same* shadow root. A light-DOM element with that id is invisible to it.
- **`<label for>` targets labelable elements** in the same tree. A form-associated custom element (`static formAssociated = true`) *is* labelable, so `<label for="host-id">` names the host — not the inner input.
- **`delegatesFocus: true`** makes focusing the host (by click, label click, `host.focus()`, or Tab) forward focus to the first focusable element in its shadow root. It does not transfer names or descriptions.
- **Reference Target** is a proposal to let a shadow host forward IDREF-based relationships to an inner element; it is not something to depend on today without checking current browser support.

So in practice you choose between two architectures: put the label, hint and error **inside** the shadow root with the input, or make the **host** the accessible control through `ElementInternals` ARIA properties.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of label and ARIA relationships showing whether each works from the light DOM to an input inside a shadow root, and what to do instead." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which relationships cross the shadow boundary</title>
  <desc>A label with for pointing to the inner input&#x27;s id does not work across the boundary. A label with for pointing to a form-associated host works and names the host. aria-labelledby and aria-describedby from the inner input to light DOM ids do not work. ElementInternals aria properties such as ariaLabel and ariaDescription on the host work for string values. Keeping label, hint and error inside the same shadow root as the input works fully.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Relationship</text>
  <text x="290.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Works?</text>
  <text x="409.3" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Instead</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&lt;label for&gt; → inner input id</text>
  <text x="290.7" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="409.3" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">label the host, or label inside</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">&lt;label for&gt; → form-associated host</text>
  <text x="290.7" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="409.3" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">names the host</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">aria-describedby → light DOM id</text>
  <text x="290.7" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no</text>
  <text x="409.3" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">describe inside the shadow root</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">internals.ariaLabel / ariaDescription</text>
  <text x="290.7" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="409.3" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">string values only</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">label, hint, error all inside</text>
  <text x="290.7" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">yes</text>
  <text x="409.3" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">the most robust option</text>
</svg>

---

## The core pattern: everything inside, attributes in

```typescript
// Pattern A (recommended): the component renders label, hint, input and error
// in ONE shadow root, so every IDREF resolves within the same tree.
class DsField extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ["label", "hint", "error", "required"];
  #internals = this.attachInternals();
  #root = this.attachShadow({ mode: "open", delegatesFocus: true });

  connectedCallback() { this.#render(); }
  attributeChangedCallback() { this.#render(); }

  #render() {
    const label = this.getAttribute("label") ?? "";
    const hint = this.getAttribute("hint");
    const error = this.getAttribute("error");
    const required = this.hasAttribute("required");
    const describedBy = [error && "err", hint && "hint"].filter(Boolean).join(" ");
    const current = this.#root.querySelector("input")?.value ?? "";
    this.#root.innerHTML = `
      <label for="in">${escapeHtml(label)}${required ? ' <span aria-hidden="true">*</span>' : ""}</label>
      ${hint ? `<p id="hint">${escapeHtml(hint)}</p>` : ""}
      <input id="in" ${required ? "required" : ""} ${error ? 'aria-invalid="true"' : ""}
             ${describedBy ? `aria-describedby="${describedBy}"` : ""}>
      ${error ? `<p id="err">${escapeHtml(error)}</p>` : ""}`;
    const input = this.#root.querySelector("input")!;
    input.value = current;                                   // keep typed text across re-render
    input.addEventListener("input", () => this.#internals.setFormValue(input.value));
    this.#internals.setValidity(error ? { customError: true } : {}, error ?? "", input);
  }
}
customElements.define("ds-field", DsField);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
```

```html
<!-- Usage: text passed as attributes; no cross-boundary IDREFs needed. -->
<ds-field name="email" label="Email address" hint="We'll send the receipt here." required></ds-field>
```

```typescript
// Pattern B: the host is the control. Useful when the design system's label
// must stay in light DOM (e.g. a shared <ds-form-row> layout).
// <label for="email-host">Email address</label>
// <ds-input id="email-host"></ds-input>
// Inside ds-input: delegatesFocus so clicking the label focuses the inner input,
// and mirror a string description onto the host for the error:
//   this.#internals.ariaDescription = errorText;   // read when the host is announced
```

---

## Step-by-step walkthrough

1. **Prefer Pattern A for design-system fields.** The component owns label, hint, input and error, so `for`, `aria-describedby` and `aria-invalid` all resolve inside one tree and work in every browser.
2. **Pass text in, not references.** Labels, hints and errors enter as attributes or properties (or slotted content the component copies), never as ids pointing across the boundary.
3. **Order `aria-describedby` error-first.** Screen readers read descriptions in order; the error should be heard before the hint, as recommended in [wiring aria-describedby for multiple errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/wiring-aria-describedby-for-multiple-errors/).
4. **Use `delegatesFocus` for focus, not names.** It makes label clicks, `host.focus()` and error-summary links land in the inner input.
5. **If the label must stay outside, label the host.** Make the element form-associated so `<label for="host">` names it, and mirror descriptions with `ElementInternals` string ARIA properties.
6. **Test with a screen reader, not just the accessibility tree.** Chrome's accessibility pane shows the computed name, but announcement order and description reading differ between NVDA, JAWS and VoiceOver.

### Why slots do not solve it

A natural idea is to slot the light-DOM label into the component (`<slot name="label">`) so it *appears* next to the input. Slotting changes rendering, not tree membership: the slotted label is still a light-DOM node, and an input inside the shadow root still cannot reference it by id. Some teams work around this by having the component read the slotted text and copy it into an internal label or `aria-label` — which works, but it is Pattern A with extra steps and a synchronisation risk when the slotted content changes. If the design system needs slotted rich content in labels, copy it deliberately on `slotchange` and treat the copy as the source for the accessible name.

<svg viewBox="0 0 680 242" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for labelling inputs inside shadow DOM based on whether the component can render its own label and error, and whether the label must remain in the light DOM." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Choosing a labelling pattern</title>
  <desc>If the component can render its own label, hint and error, keep everything in one shadow root and pass text in through attributes. If the label must remain in the light DOM for layout reasons, make the host form-associated and label the host with label for, use delegatesFocus so focus reaches the inner input, and mirror the error as a string description through ElementInternals. Otherwise, as a last resort, copy slotted label content into the shadow root on slotchange.</desc>
  <rect x="0" y="0" width="680" height="242" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="50.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="33.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Can the component render its own label and</text>
  <text x="26.0" y="47.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">error?</text>
  <rect x="340.0" y="12.0" width="326.0" height="50.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Pattern A: all inside</text>
  <path d="M284.0,37.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,33.0 339.0,37.0 332.0,41.0" fill="#7b4f8a"/>
  <text x="312.0" y="31.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,62.0 V88.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,88.0 149.0,95.0 153.0,88.0" fill="#7b4f8a"/>
  <text x="159.0" y="80.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="96.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="119.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Must the label stay in light DOM?</text>
  <rect x="340.0" y="96.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="352.0" y="119.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Pattern B: label the host</text>
  <path d="M284.0,116.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,112.5 339.0,116.5 332.0,120.5" fill="#7b4f8a"/>
  <text x="312.0" y="110.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,137.0 V163.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,163.0 149.0,170.0 153.0,163.0" fill="#7b4f8a"/>
  <text x="159.0" y="155.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="171.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="194.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Copy slotted content</text>
  <text x="26.0" y="212.0" font-size="9.5" fill="#6b5f75" font-family="inherit">On slotchange; keep it in sync.</text>
</svg>

---

## Failure modes and edge cases

### 1. Re-rendering destroys the input

Rebuilding `innerHTML` on every attribute change, as in the simple example, recreates the input and loses focus and selection. Production components should update text nodes and attributes in place (or use a rendering library such as Lit) and only create the input once.

### 2. Error messages that are not announced

Changing the error text inside the shadow root updates the description, but screen readers read descriptions on focus, not on change. Announce new errors through a live region — inside the component or at page level — following [ARIA live regions for form errors](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/).

### 3. Duplicate names

With Pattern B, if the component also renders an internal label, the host's label and the internal label can combine into a doubled name ("Email Email"). Pick one source of the name.

### 4. Nested shadow roots

A field inside a card component inside a form-layout component has several boundaries between the page's label and the input. Each boundary blocks IDREFs; Pattern A remains the robust answer because it does not rely on any.

### 5. Focus from the error summary

Summary links (`href="#email"`) target the host id; the browser scrolls to the host, but focus goes to the inner input only if `delegatesFocus` is set. Test that activating the link lands in the input, as in [moving focus to the first invalid field](https://www.client-side-form.com/accessibility-and-error-ux/focus-management-after-validation/moving-focus-to-first-invalid-field/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing what delegatesFocus, ElementInternals ARIA properties and rendering everything inside the shadow root each accomplish." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What each tool does and does not do</title>
  <desc>delegatesFocus forwards focus from the host to the inner input on clicks, label activation and host.focus, but does not carry names or descriptions. ElementInternals ARIA properties give the host a role, name and string description, but cannot reference other elements by id across the boundary. Rendering label, hint, input and error in the same shadow root makes every relationship work but means the component must own that markup.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">delegatesFocus</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Moves focus inside.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Does not carry names or descriptions.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Internals ARIA</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Role, name, string description on the</text>
  <text x="248.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">host.</text>
  <text x="248.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No cross-boundary IDREFs.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">All inside one root</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Every relationship works.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The component owns the markup.</text>
</svg>

---

## Verification checklist

- [ ] The input's computed accessible name matches the visible label.
- [ ] The error message is read when the input receives focus, before the hint.
- [ ] Clicking the label focuses the inner input.
- [ ] Error-summary links move focus into the inner input.
- [ ] New errors are announced once through a live region.
- [ ] Re-rendering on attribute changes does not lose focus or typed text.
- [ ] No doubled accessible names when labels exist both outside and inside.
- [ ] Tested with at least one screen reader on each target platform.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I use aria-label on the inner input instead of a visible label?</strong></summary>

Only when there is genuinely no visible label, which is rare in forms. Visible labels help everyone, including speech-input users who say "click Email address"; an `aria-label` that differs from visible text breaks that. Render a visible label inside the component.

</details>

<details>
<summary><strong>Does delegatesFocus affect tab order?</strong></summary>

The host becomes part of the sequential focus order and forwards focus to its first focusable descendant, so Tab reaches the inner input once. Avoid putting `tabindex` on the host as well, which can create an extra stop.

</details>

<details>
<summary><strong>Will cross-root ARIA eventually make this simpler?</strong></summary>

Proposals such as Reference Target aim to let hosts forward relationships to inner elements, which would allow light-DOM labels and descriptions to reach shadow inputs. Until support is broad and stable, design components so they do not need it.

</details>

---

## Related

- [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
- [Validating Inputs Across Shadow DOM Boundaries](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/validating-inputs-across-shadow-dom-boundaries/)
- [Building Lit Form Controls With ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/building-lit-form-controls-with-elementinternals/)

← [Web Components and Form Association](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/)
