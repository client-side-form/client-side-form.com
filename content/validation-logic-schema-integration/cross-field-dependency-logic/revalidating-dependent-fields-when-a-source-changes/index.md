---
layout: page.njk
title: "Revalidating Dependent Fields When a Source Changes"
description: "When one field changes, fields whose rules depend on it must be revalidated too — but only those, only if the user has already seen their errors, and without cascades or loops. A dependency map, touched-aware revalidation and library equivalents."
slug: revalidating-dependent-fields-when-a-source-changes
type: howto
breadcrumb: "Revalidating Dependents"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Revalidating Dependent Fields When a Source Changes"
  parent: "Cross-Field Dependency Logic"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Revalidating Dependent Fields When a Source Changes",
      "description": "When one field changes, fields whose rules depend on it must be revalidated too — but only those, only if the user has already seen their errors, and without cascades or loops. A dependency map, touched-aware revalidation and library equivalents.",
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
          "name": "Cross-Field Dependency Logic",
          "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Revalidating Dependent Fields When a Source Changes",
          "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/revalidating-dependent-fields-when-a-source-changes/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Revalidate dependent fields when their source changes",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Declare dependencies next to the rule"
        },
        {
          "@type": "HowToStep",
          "name": "Invert them into a dependents map"
        },
        {
          "@type": "HowToStep",
          "name": "Collect affected fields breadth-first, visiting each once"
        },
        {
          "@type": "HowToStep",
          "name": "Recompute validity for every affected field"
        },
        {
          "@type": "HowToStep",
          "name": "Update visibility only where the error was already shown"
        },
        {
          "@type": "HowToStep",
          "name": "Use your library's equivalent where it exists"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I just revalidate the whole form on every change?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For small forms, yes, as long as visibility is still governed per field. It becomes wasteful with large forms or async validators, and it hides the dependency structure that makes rules understandable. A declared map scales better."
          }
        },
        {
          "@type": "Question",
          "name": "How does React Hook Form's deps option compare?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "register(\"confirm\", { deps: [\"password\"] }) triggers validation of confirm when password changes. It follows the library's own display rules for errors, which you should configure to avoid showing untouched errors; the concept is the same as this page's dependents map."
          }
        },
        {
          "@type": "Question",
          "name": "Should a dependent's value be cleared when its source changes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sometimes: a \"city\" select whose options depend on the country should reset if the chosen city is no longer an option. That is a value dependency, separate from validation; reset only values that became impossible, and tell the user if you do."
          }
        }
      ]
    }
  ]
}
</script>

# Revalidating Dependent Fields When a Source Changes

A "confirm password" error that stays after the user fixes the *password*, a postcode that stays invalid after the user changes the *country*, a maximum-quantity error that stays after the *product* changes — all the same bug: a field's validity depends on another field, and only the edited field was revalidated.

The fix is to record dependencies explicitly and, when a source changes, revalidate its dependents — carefully. Revalidating an untouched dependent would show errors the user has not earned yet; revalidating everything is wasteful; and dependencies can chain or loop. This page, within [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/), builds a dependency-driven revalidation step that respects the display timing rules from the rest of the form.

---

## Context and prerequisites

Two kinds of dependency show up in forms:

- **Validity dependencies** — a field's rule reads another field. Confirm password reads password; postcode format reads country; end date reads start date; quantity maximum reads the selected product's stock.
- **Relevance dependencies** — whether a field applies at all depends on another field (VAT number only for businesses). These change *which* fields are validated, covered in [conditional required fields without cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/).

This page handles validity dependencies. The key principle: **revalidate dependents, but let each dependent's own display state decide whether the new result is shown.** A dependent the user has not touched gets its validity recomputed (so submit and summaries are correct) but no new visible error.

<svg viewBox="0 0 680 85" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of a dependency map in which password is a source for confirm password, country is a source for postcode and phone, and product is a source for quantity." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A small dependency map</title>
  <desc>Password is a source for confirm password, so changing the password revalidates the confirmation. Country is a source for both postcode and phone, because their formats vary by country. Product is a source for quantity, because the maximum quantity depends on the product&#x27;s stock. Each arrow means that when the source changes, the dependent&#x27;s rule is re-run.</desc>
  <rect x="0" y="0" width="680" height="85" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">password → confirm</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Confirm must equal password.</text>
  <rect x="236.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">country → postcode, phone</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Formats vary by country.</text>
  <rect x="458.0" y="12.0" width="208.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">product → quantity</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Max depends on stock.</text>
</svg>

---

## The core pattern: declared dependencies and touched-aware revalidation

```typescript
type Values = Record<string, unknown>;
type Validator = (value: unknown, all: Values) => string | null;

export interface FieldDef { validate: Validator; dependsOn?: string[] }

export function createRevalidator(fields: Record<string, FieldDef>) {
  // Invert "dependsOn" into "dependents of": source -> fields that read it.
  const dependents = new Map<string, Set<string>>();
  for (const [name, def] of Object.entries(fields)) {
    for (const src of def.dependsOn ?? []) {
      if (!dependents.has(src)) dependents.set(src, new Set());
      dependents.get(src)!.add(name);
    }
  }

  /**
   * Fields to re-run after `changed` changes: the field itself plus every
   * transitive dependent, each once, in breadth-first order. The `seen` set
   * makes cycles harmless: a field is never visited twice.
   */
  function affected(changed: string): string[] {
    const order: string[] = [];
    const seen = new Set<string>();
    const queue = [changed];
    while (queue.length) {
      const f = queue.shift()!;
      if (seen.has(f)) continue;
      seen.add(f);
      order.push(f);
      for (const d of dependents.get(f) ?? []) queue.push(d);
    }
    return order;
  }

  return {
    onChange(changed: string, values: Values, state: { errors: Record<string, string | null>; shown: Record<string, boolean> }) {
      for (const f of affected(changed)) {
        const err = fields[f].validate(values[f], values);
        state.errors[f] = err;                       // validity always recomputed
        // Visibility: displayed = shown[f] && errors[f].
        // - A field already showing an error keeps showing, with the NEW
        //   message, or clears the moment it becomes valid (reward early).
        // - A field not showing an error is left silent; its own blur or the
        //   next submit decides when to reveal it (punish late).
        if (err === null) state.shown[f] = false;
      }
      return state;
    },
    affected,
  };
}
```

```typescript
const revalidate = createRevalidator({
  password: { validate: (v) => (String(v ?? "").length >= 12 ? null : "Use at least 12 characters.") },
  confirm: {
    dependsOn: ["password"],
    validate: (v, all) => (v === all.password ? null : "Passwords do not match."),
  },
  country: { validate: (v) => (v ? null : "Choose a country.") },
  postcode: {
    dependsOn: ["country"],
    validate: (v, all) => postcodeRule(String(all.country))(String(v ?? "")),
  },
});
declare function postcodeRule(country: string): (v: string) => string | null;
```

---

## Step-by-step walkthrough

1. **Declare dependencies next to the rule.** `dependsOn: ["password"]` on the confirm field makes the relationship visible and machine-readable.
2. **Invert them into a dependents map.** On change, you need "who reads this field?", not "what does this field read?".
3. **Collect affected fields breadth-first, visiting each once.** Chains (country → postcode → delivery estimate) are handled, and a `seen` set stops loops.
4. **Recompute validity for every affected field.** The submit gate and error summary must reflect the current truth, even for fields not yet touched.
5. **Update visibility only where the error was already shown.** If the confirm field was showing "Passwords do not match", changing the password updates it live — clearing it the moment they match. If the user has not reached the confirm field yet, nothing appears there. This is [reward early, punish late](https://www.client-side-form.com/form-state-fundamentals-architecture/form-validation-lifecycle/reward-early-punish-late-validation-timing/) applied across fields.
6. **Use your library's equivalent where it exists.** React Hook Form's `deps` option on `register`, VeeValidate's cross-field rules with dependent fields, and Angular's group validators all implement a version of this.

### Why validity and visibility are separate here

Merging "is it valid?" and "should the error be shown?" is what makes dependent revalidation go wrong in both directions. If revalidation also shows errors, changing the password flashes "Passwords do not match" on a confirm field the user has not reached yet. If revalidation is skipped for untouched fields to avoid that, the submit gate thinks the form is valid when it is not, and the summary misses a problem. Keeping the two concepts separate — validity always recomputed, visibility governed by each field's own interaction state — gives correct submit behaviour and polite live feedback at the same time.

<svg viewBox="0 0 680 147" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of three situations when the password field changes — confirm untouched, confirm showing a mismatch error, and confirm previously valid — with the recomputed validity and what is displayed." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Changing the password in three situations</title>
  <desc>When the confirm field has not been touched, changing the password recomputes confirm&#x27;s validity to mismatched but displays nothing. When the confirm field is showing passwords do not match and the new password now equals the confirmation, validity becomes valid and the error clears immediately. When confirm was valid and the password changes so they no longer match, validity becomes mismatched; the error is not shown until the user blurs confirm or submits.</desc>
  <rect x="0" y="0" width="680" height="147" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="118.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Confirm field state</text>
  <text x="236.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Validity after change</text>
  <text x="420.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Displayed</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">untouched</text>
  <text x="236.6" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">mismatch (recorded)</text>
  <text x="420.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">nothing</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">showing &quot;do not match&quot;</text>
  <text x="236.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">match</text>
  <text x="420.9" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">error cleared immediately</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">valid, previously touched</text>
  <text x="236.6" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">mismatch</text>
  <text x="420.9" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">shown on its blur or submit</text>
</svg>

---

## Failure modes and edge cases

### 1. Cascading visible errors

Changing the country re-runs postcode and phone. If both flash errors because their old values do not fit the new country, the user is scolded for something they have not done yet. Keep them silent until touched again or submitted, but mark them invalid so submit catches them.

### 2. Cycles

Two fields that constrain each other (min and max price) form a cycle. The `seen` set prevents infinite loops; make sure the rules themselves are symmetrical so the result does not depend on which field changed first.

### 3. Async dependents

If a dependent's validator is async (postcode lookup for the new country), revalidation starts a request; cancel the previous one per field, as in [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).

### 4. Server errors on dependents

A server error on confirm ("passwords do not match" from the server) must be cleared when either password field changes, not only when confirm changes. Apply the same dependency map when clearing server errors — the rules in [clearing server errors when a field changes](https://www.client-side-form.com/validation-logic-schema-integration/server-error-reconciliation/clearing-server-errors-when-a-field-changes/).

### 5. Large graphs

With hundreds of fields, recomputing transitive dependents on each keystroke is still cheap if the graph is sparse. If it is dense (totals depending on every row), debounce the dependent pass separately from the field's own validation.

<svg viewBox="0 0 680 269" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a country change passing through the revalidator — collecting affected fields, recomputing each validity, and deciding visibility per field based on whether its error was already shown." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One change, traced through the revalidator</title>
  <desc>The user changes the country from GB to US. The revalidator collects affected fields breadth first: country itself, then postcode and phone. It recomputes validity for all three. Country is valid and shown as such. Postcode, which the user had filled with a UK postcode and blurred, becomes invalid, but because its error was not showing it is recorded silently until the next blur or submit. Phone was showing an error, so its new result is displayed immediately.</desc>
  <rect x="0" y="0" width="680" height="269" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="372.5" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">country changes GB → US</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">affected: country, postcode, phone</text>
  <text x="416.5" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Breadth-first, each once.</text>
  <path d="M200.3,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="196.3,89.0 200.3,96.0 204.3,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="372.5" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Recompute validity</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">All three re-run.</text>
  <text x="416.5" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Submit gate and summary now correct.</text>
  <path d="M200.3,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="196.3,174.0 200.3,181.0 204.3,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="372.5" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Decide visibility per field</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Shown before? update live.</text>
  <text x="26.0" y="238.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never shown? stay silent.</text>
  <text x="416.5" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">No surprise errors on fields the user has not revisited.</text>
</svg>

---

## Verification checklist

- [ ] Fixing the password clears a visible "Passwords do not match" immediately.
- [ ] Changing the password does not show a new error on an untouched confirm field.
- [ ] Changing the country recomputes postcode validity; submit catches a now-invalid postcode.
- [ ] Dependency chains are followed, and cycles do not loop.
- [ ] Async dependents cancel their previous check when re-run.
- [ ] Server errors on dependents clear when any of their sources change.
- [ ] Dependencies are declared next to the rules that use them.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I just revalidate the whole form on every change?</strong></summary>

For small forms, yes, as long as visibility is still governed per field. It becomes wasteful with large forms or async validators, and it hides the dependency structure that makes rules understandable. A declared map scales better.

</details>

<details>
<summary><strong>How does React Hook Form's deps option compare?</strong></summary>

`register("confirm", { deps: ["password"] })` triggers validation of `confirm` when `password` changes. It follows the library's own display rules for errors, which you should configure to avoid showing untouched errors; the concept is the same as this page's dependents map.

</details>

<details>
<summary><strong>Should a dependent's value be cleared when its source changes?</strong></summary>

Sometimes: a "city" select whose options depend on the country should reset if the chosen city is no longer an option. That is a value dependency, separate from validation; reset only values that became impossible, and tell the user if you do.

</details>

---

## Related

- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
- [Building a Field Dependency Graph](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/building-a-field-dependency-graph/)
- [Password Confirmation Validation Pattern](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/)

← [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
