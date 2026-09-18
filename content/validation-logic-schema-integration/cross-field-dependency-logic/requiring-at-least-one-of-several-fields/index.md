---
layout: page.njk
title: "Requiring At Least One of Several Fields"
description: "Implement 'provide a phone number or an email address' and 'choose at least one option': a group rule over several fields, where the error lives, how each member communicates it is part of the requirement, and why none of them should be marked required individually."
slug: requiring-at-least-one-of-several-fields
type: howto
breadcrumb: "At Least One Of"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Requiring At Least One of Several Fields"
  parent: "Cross-Field Dependency Logic"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Requiring At Least One of Several Fields",
      "description": "Implement 'provide a phone number or an email address' and 'choose at least one option': a group rule over several fields, where the error lives, how each member communicates it is part of the requirement, and why none of them should be marked required individually.",
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
          "name": "Requiring At Least One of Several Fields",
          "item": "https://client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/requiring-at-least-one-of-several-fields/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Require at least one of several form fields",
      "step": [
        {
          "@type": "HowToStep",
          "name": "State the requirement in the group, up front"
        },
        {
          "@type": "HowToStep",
          "name": "Do not mark members required"
        },
        {
          "@type": "HowToStep",
          "name": "Validate each member's format only when filled"
        },
        {
          "@type": "HowToStep",
          "name": "Evaluate the group rule over all members"
        },
        {
          "@type": "HowToStep",
          "name": "Show the group error on the group"
        },
        {
          "@type": "HowToStep",
          "name": "Clear it when any member is filled"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I ask users which contact method they prefer instead?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Often that is better: a radio group \"How should we contact you?\" with the matching field revealed makes one field conditionally required, which is simpler to understand and validate. Use \"at least one of\" when you genuinely want any combination."
          }
        },
        {
          "@type": "Question",
          "name": "How should \"at least two of\" work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The same way, with a count: filled members must be at least two, and the message states the number (\"Choose at least two topics\"). Keep the per-member format rules unchanged."
          }
        },
        {
          "@type": "Question",
          "name": "Does aria-required help on the group?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "aria-required is not supported on fieldset or group roles in a way screen readers reliably announce. State the requirement in the legend or hint text instead, which every user can see and hear."
          }
        }
      ]
    }
  ]
}
</script>

# Requiring At Least One of Several Fields

"Give us at least one way to contact you" is a common rule that forms usually implement badly: both the phone and email fields are marked with a required asterisk (so users fill in both), or neither is, and the error appears on whichever field the developer picked, reading "Phone is required" to someone who deliberately chose email.

"At least one of" is a group rule: no single member is required, but the group is. This page, within [cross-field dependency logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/), implements it for text fields and checkbox groups, with markup that tells users about the requirement before they make a mistake and an error that names the group rather than one field.

---

## Context and prerequisites

Where "at least one" appears:

- **Alternative contact methods** — phone *or* email *or* postal address.
- **Checkbox groups** — "choose at least one topic", "select the days you are available".
- **Alternative identifiers** — passport number *or* national ID number.
- **Optional pairs with a floor** — "at least one reference" when references are free text fields.

The design points:

- **No member is individually required.** Marking both as `required` changes the rule to "all of", and assistive technology will announce each as required.
- **The requirement is stated once, on the group.** In the `legend` or a hint: "Provide at least one way for us to contact you."
- **The error is about the group.** "Enter a phone number or an email address", shown on the group and linked from each member.
- **Each member still validates its own format when filled.** An email that is filled in must be a valid email, even though email itself is optional.

<svg viewBox="0 0 680 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of combinations of phone and email inputs and the validation outcome under an at least one of rule with per-field format checks." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Inputs and outcomes for &quot;phone or email&quot;</title>
  <desc>With both empty the group error enter a phone number or an email address appears after submit. With a valid phone and empty email the form is valid. With empty phone and a valid email it is valid. With both valid it is valid. With empty phone and an invalid email the group rule is satisfied in principle but the email&#x27;s own format error appears, enter an email like name at example dot com, and the group error is not shown.</desc>
  <rect x="0" y="0" width="680" height="224" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Phone</text>
  <text x="168.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Email</text>
  <text x="357.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Result</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">(empty)</text>
  <text x="168.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">(empty)</text>
  <text x="357.2" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">Enter a phone number or an email address.</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">07700 900123</text>
  <text x="168.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">(empty)</text>
  <text x="357.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">(empty)</text>
  <text x="168.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">ada@example.com</text>
  <text x="357.2" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">07700 900123</text>
  <text x="168.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">ada@example.com</text>
  <text x="357.2" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">valid</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">(empty)</text>
  <text x="168.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">ada@</text>
  <text x="357.2" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">email: Enter an email like name@example.com.</text>
  <text x="14.0" y="211.5" font-size="10" fill="#6b5f75" font-family="inherit">The group error only concerns emptiness. A filled but malformed member gets its own field error instead.</text>
</svg>

---

## The core pattern: a group rule plus per-member format rules

```typescript
type Values = Record<string, string | string[] | undefined>;

const filled = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";

export interface AtLeastOne {
  group: string;                 // id of the group, used for the error slot
  members: string[];             // field names
  message: string;               // names the alternatives
}

export function checkAtLeastOne(values: Values, rule: AtLeastOne) {
  return rule.members.some((m) => filled(values[m])) ? null : { group: rule.group, message: rule.message };
}

// Member format rules run ONLY when the member is filled.
const formatRules: Record<string, (v: string) => string | null> = {
  phone: (v) => (/^[+\d][\d\s()-]{6,}$/.test(v.trim()) ? null : "Enter a phone number, like 07700 900123."),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(v.trim()) ? null : "Enter an email like name@example.com."),
};

export function validateContact(values: Values) {
  const fieldErrors: Record<string, string> = {};
  for (const [name, rule] of Object.entries(formatRules)) {
    const v = values[name];
    if (typeof v === "string" && filled(v)) {
      const e = rule(v);
      if (e) fieldErrors[name] = e;
    }
  }
  // Only report the group rule if no member has its own error: a malformed
  // email already tells the user what to fix.
  const group = Object.keys(fieldErrors).length ? null : checkAtLeastOne(values, {
    group: "contact", members: ["phone", "email"],
    message: "Enter a phone number or an email address.",
  });
  return { fieldErrors, groupError: group };
}
```

```html
<fieldset aria-describedby="contact-hint contact-error">
  <legend>How can we contact you?</legend>
  <p id="contact-hint">Provide at least one. We'll only use it about your order.</p>
  <p id="contact-error" class="group-error" hidden></p>
  <label for="phone">Phone number (optional)</label>
  <input id="phone" name="phone" type="tel" autocomplete="tel">
  <label for="email">Email address (optional)</label>
  <input id="email" name="email" type="email" autocomplete="email">
</fieldset>
```

---

## Step-by-step walkthrough

1. **State the requirement in the group, up front.** The `legend` asks the question and a hint says "Provide at least one", linked to the `fieldset` with `aria-describedby` so screen readers hear it on entering the group.
2. **Do not mark members required.** Label them as optional, or leave them unmarked, depending on your convention — see [indicating required and optional fields](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/indicating-required-and-optional-fields/).
3. **Validate each member's format only when filled.** Optional does not mean unchecked; a filled field must be valid.
4. **Evaluate the group rule over all members.** It passes if any member is filled — for checkbox groups, if any box is checked.
5. **Show the group error on the group.** Unhide the error paragraph inside the `fieldset` and list it in the error summary, linking to the first member.
6. **Clear it when any member is filled.** Re-run the rule on every member's change, using the dependency approach from [revalidating dependent fields when a source changes](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/revalidating-dependent-fields-when-a-source-changes/).

### Why "optional" labels matter here

With no required markers on either field, users need another signal that the group as a whole is not optional. The legend and hint provide it, but labelling each member "(optional)" strengthens it further: it tells users they do not have to fill in both, which is the most common misreading of these groups. Forms that mark *all* optional fields as "optional" (rather than marking required ones with an asterisk) handle this case naturally, because the group-level instruction is the only statement of requirement on the page and it stands out.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of what a screen-reader user hears when tabbing into the contact group, skipping both fields and submitting, and then filling one field." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What a screen-reader user hears</title>
  <desc>On tabbing into the phone field, the user hears the group legend How can we contact you, the hint provide at least one, and the phone label marked optional. They skip both fields and submit; focus moves to the error summary, which says enter a phone number or an email address, linking to the phone field. Following the link, they hear the group again with the error included in its description. After typing an email, the error is removed on the next change.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="370.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Tab into the group</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Legend + hint, then &quot;Phone number (optional)&quot;.</text>
  <text x="414.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The requirement is heard before any mistake is made.</text>
  <path d="M199.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.0,89.0 199.0,96.0 203.0,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="370.0" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Submit with both empty</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Summary: &quot;Enter a phone number or an email address.&quot;</text>
  <text x="414.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">One message about the group, not &quot;Phone is required&quot;.</text>
  <path d="M199.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.0,174.0 199.0,181.0 203.0,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="370.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Follow the summary link</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Focus to phone; group error in its description.</text>
  <text x="414.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Either field satisfies it.</text>
  <path d="M199.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="195.0,259.0 199.0,266.0 203.0,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="370.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Type an email</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Group rule passes; error removed.</text>
  <text x="414.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Email&#x27;s own format rule now applies.</text>
</svg>

---

## Failure modes and edge cases

### 1. Both fields marked required

`required` on both inputs makes native validation (and screen readers) demand both. The group rule belongs in code; the members stay optional in markup.

### 2. Error attached to one member

"Phone is required" on the phone field tells an email-preferring user they must give a phone number. The message must name the alternatives and live on the group.

### 3. Group error plus member error

If the email is malformed and the phone empty, showing both "Enter a phone number or an email address" and "Enter a valid email" is confusing. Suppress the group error when a member has its own error, as the code above does.

### 4. Checkbox groups

For "choose at least one", the members are checkboxes sharing a name; the rule checks the array's length. Put the error on the `fieldset`, per [accessible errors for radio and checkbox groups](https://www.client-side-form.com/accessibility-and-error-ux/aria-live-regions-for-form-errors/accessible-errors-for-radio-and-checkbox-groups/).

### 5. Schemas

In Zod, express the rule with `superRefine` on the object, adding the issue at a group path such as `["contact"]` and mapping it to the group slot. A `z.union` of "has phone" and "has email" objects technically works but produces unhelpful union errors.

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for the contact group — whether any filled member has a format error, whether any member is filled — resulting in a member error, no error or the group error." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Which error to show for the contact group</title>
  <desc>If any filled member has a format problem, show that member&#x27;s own error and suppress the group error. If at least one member is filled and valid, show no error. Otherwise, when all members are empty, show the group error naming the alternatives, after submit or after the group is touched.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">A filled member has a format error?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Show that member&#x27;s error</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">At least one member filled?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">No error</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Group error</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">&quot;Enter a phone number or an email address.&quot;</text>
</svg>

---

## Verification checklist

- [ ] The group states "provide at least one" before the user interacts.
- [ ] No member is marked or announced as required.
- [ ] Submitting with all members empty shows one group error naming the alternatives.
- [ ] Filling any one member clears the group error.
- [ ] A filled but malformed member shows its own error, without the group error.
- [ ] The error summary links the group error to the first member.
- [ ] Checkbox-group variants put the error on the `fieldset`.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I ask users which contact method they prefer instead?</strong></summary>

Often that is better: a radio group "How should we contact you?" with the matching field revealed makes one field conditionally required, which is simpler to understand and validate. Use "at least one of" when you genuinely want any combination.

</details>

<details>
<summary><strong>How should "at least two of" work?</strong></summary>

The same way, with a count: filled members must be at least two, and the message states the number ("Choose at least two topics"). Keep the per-member format rules unchanged.

</details>

<details>
<summary><strong>Does aria-required help on the group?</strong></summary>

`aria-required` is not supported on `fieldset` or `group` roles in a way screen readers reliably announce. State the requirement in the legend or hint text instead, which every user can see and hear.

</details>

---

## Related

- [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
- [Conditional Required Fields Without Cycles](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/conditional-required-fields-without-cycles/)
- [Modelling Form-Level vs Field-Level Errors](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/form-level-vs-field-level-errors/)

← [Cross-Field Dependency Logic](https://www.client-side-form.com/validation-logic-schema-integration/cross-field-dependency-logic/)
