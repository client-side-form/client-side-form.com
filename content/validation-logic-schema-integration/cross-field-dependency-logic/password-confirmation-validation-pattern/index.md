---
layout: page.njk
title: "Password Confirmation Validation Pattern"
description: "Validate confirmPassword against password: correct cross-field dependency, revalidation when password changes, and accessible error announcement."
slug: password-confirmation-validation-pattern
type: long_tail
breadcrumb: "Password Confirmation"
datePublished: "2026-07-09"
dateModified: "2026-07-09"
eleventyNavigation:
  key: "Password Confirmation Validation Pattern"
  parent: "Cross-Field Dependency Logic"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Password Confirmation Validation Pattern",
      "description": "Validate confirmPassword against password: correct cross-field dependency, revalidation when password changes, and accessible error announcement.",
      "datePublished": "2026-07-09",
      "dateModified": "2026-07-09",
      "author": { "@type": "Organization", "name": "client-side-form.com" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://client-side-form.com/" },
        { "@type": "ListItem", "position": 2, "name": "Validation Logic & Schema Integration", "item": "https://client-side-form.com/validation-logic-schema-integration/" },
        { "@type": "ListItem", "position": 3, "name": "Cross-Field Dependency Logic", "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/" },
        { "@type": "ListItem", "position": 4, "name": "Password Confirmation Validation Pattern", "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/password-confirmation-validation-pattern/" }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Implement a Password Confirmation Validation Pattern",
      "step": [
        { "@type": "HowToStep", "name": "Attach the equality check at the object level and target its error onto the confirm field path" },
        { "@type": "HowToStep", "name": "Revalidate the confirm field whenever the password field changes, not only when confirm changes" },
        { "@type": "HowToStep", "name": "Suppress the mismatch error until the confirm field has been touched to avoid premature errors" },
        { "@type": "HowToStep", "name": "Wire aria-invalid and aria-describedby so the mismatch is announced to assistive technology" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Why does the mismatch error not clear when I fix the password field?",
          "acceptedAnswer": { "@type": "Answer", "text": "Because you only revalidate the field that changed. Editing password does not re-run the rule that lives on confirm, so its stale error persists. Register password as a trigger that revalidates confirm, so any change to either field re-evaluates the equality rule." }
        },
        {
          "@type": "Question",
          "name": "Should the error attach to password or confirm?",
          "acceptedAnswer": { "@type": "Answer", "text": "To confirm. The confirm field is where the user is asked to reconcile the values, so that is where the message belongs and where focus and aria-describedby should point. Attaching it to password, or to the form root, leaves the announced error disconnected from the input the user must fix." }
        },
        {
          "@type": "Question",
          "name": "How do I stop the mismatch error showing before the user has finished typing?",
          "acceptedAnswer": { "@type": "Answer", "text": "Gate the message on the confirm field being touched or blurred. Compute the equality rule continuously so state is correct, but only surface it once the user has committed to the confirm field, which avoids flashing a mismatch on every intermediate keystroke." }
        }
      ]
    }
  ]
}
</script>

# Password Confirmation Validation Pattern

Confirming a password is the canonical cross-field rule, and the bug it produces is always the same: the user fixes the password, the confirm field still reads "passwords do not match," and nothing clears it. The rule is trivial (`password === confirm`); the correct part is the dependency wiring — which field owns the error, which changes trigger revalidation, and how the mismatch is announced accessibly.

---

## Problem Scope

Validate that `confirm` equals `password`, keep the result correct when either field changes after the other was filled, and announce the mismatch on the field the user must fix.

---

## Context and Prerequisites

This is a specific case of the ordering and trigger problem covered in [cross-field dependency logic](/validation-logic-schema-integration/cross-field-dependency-logic/): a rule whose result depends on two fields must re-run when *either* input changes, and its error must land on a chosen field path rather than the form root. The equality itself is expressed with a schema refinement, so the setup in [integrating Zod for schema validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) is the foundation this builds on. The whole pattern hinges on one asymmetry: the rule lives on `confirm`, but `password` is a co-trigger for it.

---

## Core Pattern

Express the equality at the object level and re-target its error onto `confirm` with `path`. Then wire the form layer so that editing `password` revalidates `confirm`.

```typescript
import { z } from "zod";

export const passwordForm = z
  .object({
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  // Attach the cross-field check at the object level so it can see both values,
  // then route the issue to the confirm path — that is the field the user fixes.
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"], // without this, the error lands on the form root
  });

export type PasswordForm = z.infer<typeof passwordForm>;
```

The schema is only half the pattern. The other half is the trigger graph in the form layer. A field-scoped validator that only re-runs the rule for the field that changed will never clear the mismatch when `password` is edited — because the rule is registered on `confirm`.

```typescript
// A minimal, framework-agnostic validator with a dependency trigger map.
// The key idea: some fields, when changed, must revalidate OTHER fields.
type Values = { password: string; confirm: string };

// When the key field changes, also revalidate every field in its list.
const revalidateTriggers: Record<keyof Values, (keyof Values)[]> = {
  password: ["confirm"], // editing password must re-check confirm's equality rule
  confirm: [],           // editing confirm only re-checks itself
};

function validateFields(values: Values, changed: keyof Values): Record<string, string> {
  // Always revalidate the changed field plus everything that depends on it.
  const toCheck = new Set<keyof Values>([changed, ...revalidateTriggers[changed]]);
  const result = passwordForm.safeParse(values);
  const errors: Record<string, string> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Values | undefined;
      // Only surface errors for fields in the revalidation set so untouched
      // fields are not flagged by an unrelated keystroke.
      if (field && toCheck.has(field)) {
        errors[field] = issue.message;
      }
    }
  }
  return errors;
}
```

### Accessible announcement

The mismatch must reach assistive technology. Set `aria-invalid` on the confirm input and point `aria-describedby` at a live error node, following the conventions in [accessibility and error UX](/accessibility-and-error-ux/).

```typescript
// Reflect the confirm error into the DOM accessibly.
// aria-live="assertive" on the error node makes the mismatch announced the
// moment it appears, so a screen reader user is not left guessing.
function renderConfirmError(input: HTMLInputElement, message: string | undefined): void {
  const errorId = `${input.id}-error`;
  let node = document.getElementById(errorId);

  if (message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", errorId);
    if (!node) {
      node = document.createElement("p");
      node.id = errorId;
      node.setAttribute("role", "alert"); // assertive announcement of the mismatch
      input.insertAdjacentElement("afterend", node);
    }
    node.textContent = message;
  } else {
    input.setAttribute("aria-invalid", "false");
    input.removeAttribute("aria-describedby");
    node?.remove();
  }
}
```

### Wiring the trigger into a form hook

The trigger map is framework-agnostic, but each adapter expresses "revalidate this other field" differently. In React Hook Form the mechanism is the `trigger` API called from the password field's change handler; in a custom reducer it is an explicit dependency lookup on every dispatch.

```typescript
// React Hook Form: revalidate confirm whenever password changes.
// Without this, editing password leaves confirm's stale error in place, because
// RHF only revalidates the field that fired unless you tell it otherwise.
const { register, trigger, getFieldState } = useForm<PasswordForm>({
  resolver: zodResolver(passwordForm),
  mode: "onBlur",
});

const passwordProps = register("password", {
  onChange: () => {
    // Only re-run confirm's rule once confirm has been touched, so we do not
    // flash a mismatch before the user has even reached the confirm field.
    if (getFieldState("confirm").isTouched) {
      void trigger("confirm");
    }
  },
});
```

The `getFieldState("confirm").isTouched` guard is what implements the "compute always, reveal on touch" rule at the framework layer: the resolver still evaluates the schema on every change, but the visible revalidation of `confirm` is deferred until the user has committed to it. A custom hook built on the [React form hook architecture](/framework-adapters-custom-hooks/react-form-hook-architecture/) applies the same idea by consulting the `revalidateTriggers` map inside its dispatch reducer.

---

## Step-by-Step Walkthrough

1. **Define the schema** with `password` and `confirm` fields and a `.refine` equality check targeting `path: ["confirm"]`.
2. **Build the trigger map** so a change to `password` revalidates `confirm`. This is the single line that fixes the "error won't clear" bug.
3. **Validate on change** by re-running the affected field set: the changed field plus its dependents.
4. **Gate visibility on touched** — compute the error always, but only render it once `confirm` has been blurred or touched, so the mismatch does not flash on every intermediate keystroke.
5. **Announce accessibly** by setting `aria-invalid` and `aria-describedby` on `confirm`, and rendering the message into a `role="alert"` node.
6. **Clear on match** — when the values agree, remove `aria-invalid`, drop `aria-describedby`, and remove the error node.

---

## Failure Modes and Edge Cases

**Mismatch error survives a password edit.** The classic bug: the rule is on `confirm`, so editing `password` never re-runs it. Fix with the trigger map.

```typescript
// WRONG: only revalidate the field that changed.
const errors = validateOnly(changedField, values); // password edit never re-checks confirm

// RIGHT: revalidate the changed field AND its dependents.
const errors = validateFields(values, changedField); // password -> also checks confirm
```

**Error flashes on the first keystroke of confirm.** Rendering the mismatch before the user has finished typing is noise. Gate rendering on a touched flag while still computing the rule.

**Trailing-whitespace false mismatch.** A trailing space from autofill or paste makes visually identical values compare unequal. Decide the policy explicitly — for passwords, usually do *not* trim, since whitespace is a legitimate password character, but be aware that autofill can introduce it.

**Password manager fills confirm before password.** Some managers populate `confirm` first, momentarily producing a mismatch. Debounce the visible error briefly on programmatic fills, or suppress until both fields are non-empty.

**Announcement storms on every keystroke.** If the `role="alert"` node's text is rewritten on each character, screen readers re-announce repeatedly. Only update the node when the message string actually changes, not on every validation pass.

```typescript
// Guard the announcement: only touch the DOM node when the message differs,
// so an unchanged mismatch is not re-announced on every keystroke.
let lastMessage: string | undefined;
function announceIfChanged(input: HTMLInputElement, message: string | undefined): void {
  if (message === lastMessage) return; // no-op keeps the live region quiet
  lastMessage = message;
  renderConfirmError(input, message);
}
```

**Three-field change-password forms.** A change-password form adds a current-password field, and the equality rule still only concerns the new pair. Do not let the current-password field participate in the match rule or trigger `confirm` revalidation — scope the trigger map so only the new password co-triggers confirm, or the current-password field will spuriously re-run the mismatch check.

**Submit bypasses the touched gate.** A user can submit via keyboard without ever blurring `confirm`, leaving the touched flag false and the mismatch hidden. On submit, force every field to touched before rendering errors so the mismatch surfaces even when the field was never individually blurred.

---

## Verification Checklist

- [ ] Equality rule targets path: ["confirm"], not the form root
- [ ] Editing password revalidates and clears the confirm mismatch
- [ ] Mismatch is suppressed until confirm is touched or blurred
- [ ] aria-invalid toggles correctly and is removed when values match
- [ ] aria-describedby points at the live error node while the error is present
- [ ] Error node uses role="alert" and updates only when the message changes
- [ ] Whitespace/trim policy is decided and documented
- [ ] Keyboard-only submission surfaces and clears the error correctly

---

## Frequently Asked Questions

<details>
<summary><strong>Why does the mismatch error not clear when I fix the password field?</strong></summary>

Because you only revalidate the field that changed. Editing `password` does not re-run the rule that lives on `confirm`, so its stale error persists. Register `password` as a trigger that revalidates `confirm`, so any change to either field re-evaluates the equality rule.

</details>

<details>
<summary><strong>Should the error attach to password or confirm?</strong></summary>

To `confirm`. The confirm field is where the user is asked to reconcile the values, so that is where the message belongs and where focus and `aria-describedby` should point. Attaching it to `password`, or to the form root, leaves the announced error disconnected from the input the user must fix.

</details>

<details>
<summary><strong>How do I stop the mismatch error showing before the user has finished typing?</strong></summary>

Gate the message on the `confirm` field being touched or blurred. Compute the equality rule continuously so state is correct, but only surface it once the user has committed to the confirm field, which avoids flashing a mismatch on every intermediate keystroke.

</details>

---

## Related

- [Cross-Field Dependency Logic](/validation-logic-schema-integration/cross-field-dependency-logic/)
- [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/)
- [How to Validate Dependent Fields with Zod](/validation-logic-schema-integration/integrating-zod-for-schema-validation/how-to-validate-dependent-fields-with-zod/)

← [Cross-Field Dependency Logic](/validation-logic-schema-integration/cross-field-dependency-logic/)
