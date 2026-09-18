---
layout: page.njk
title: "Autocomplete Tokens for Autofill-Friendly Forms"
description: "Use the HTML autocomplete attribute correctly so browsers and password managers fill forms reliably: the tokens for names, contact details, addresses, payment and credentials, section and shipping/billing prefixes, and why WCAG 1.3.5 requires them."
slug: autocomplete-tokens-for-autofill-friendly-forms
type: howto
breadcrumb: "Autocomplete Tokens"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Autocomplete Tokens for Autofill-Friendly Forms"
  parent: "Keyboard Navigation Patterns"
  order: 7
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Autocomplete Tokens for Autofill-Friendly Forms",
      "description": "Use the HTML autocomplete attribute correctly so browsers and password managers fill forms reliably: the tokens for names, contact details, addresses, payment and credentials, section and shipping/billing prefixes, and why WCAG 1.3.5 requires them.",
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
          "name": "Accessibility & Error UX for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Keyboard Navigation Patterns for Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Autocomplete Tokens for Autofill-Friendly Forms",
          "item": "https://client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/autocomplete-tokens-for-autofill-friendly-forms/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Add correct autocomplete tokens to form fields",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Give every personal-data field a token"
        },
        {
          "@type": "HowToStep",
          "name": "Use the exact spec tokens"
        },
        {
          "@type": "HowToStep",
          "name": "Match field granularity to the token"
        },
        {
          "@type": "HowToStep",
          "name": "Prefix with shipping/billing when both appear"
        },
        {
          "@type": "HowToStep",
          "name": "Use section-* for repeated blocks"
        },
        {
          "@type": "HowToStep",
          "name": "Pair credential tokens with the right input types"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does autocomplete affect validation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No — it only guides filling. Autofilled values still need validation, and some arrive without the input events your code expects; reconcile at submit."
          }
        },
        {
          "@type": "Question",
          "name": "Should the name attribute match the token?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It helps browsers' heuristics but is not required; the autocomplete token is authoritative. Use clear, stable name values for your server and correct tokens for autofill."
          }
        },
        {
          "@type": "Question",
          "name": "What about passkeys?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Add webauthn to the username field's token (autocomplete=\"username webauthn\") to enable conditional passkey UI, where the browser offers saved passkeys in the autofill menu. Keep the password field for users without passkeys."
          }
        }
      ]
    }
  ]
}
</script>

# Autocomplete Tokens for Autofill-Friendly Forms

Autofill is the biggest single accessibility and speed improvement most forms can get for free — and most forms get it wrong: fields without `autocomplete`, invented values like `autocomplete="email-address"`, `autocomplete="off"` on a login, or a shipping and billing address that browsers fill with the same data because nothing tells them apart.

The `autocomplete` attribute takes a defined set of tokens from the HTML specification. Correct tokens let browsers and password managers fill fields accurately, let people with motor and cognitive disabilities avoid retyping personal data, and satisfy WCAG 2.1's "Identify Input Purpose" criterion (1.3.5, AA). This page, part of [keyboard navigation patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/), lists the tokens forms need and how to combine them.

---

## Context and prerequisites

The attribute's grammar, in order:

1. **Optional section:** `section-<name>` — groups fields that belong together when a page has several of the same kind (two addresses in different blocks).
2. **Optional group:** `shipping` or `billing` — distinguishes addresses and contact details by purpose.
3. **Optional contact type** (for contact fields): `home`, `work`, `mobile`, `fax`, `pager`.
4. **The field name token** (required): `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, `current-password`, …
5. **Optional `webauthn`** — appended for passkey conditional UI on username or password fields.

Example: `autocomplete="shipping postal-code"`, `autocomplete="work email"`, `autocomplete="section-guest2 shipping address-line1"`.

`autocomplete="off"` asks the browser not to store or suggest; browsers largely ignore it for login fields, and it should be used only for fields where suggestions are genuinely wrong (a one-time search box, a CAPTCHA answer).

<svg viewBox="0 0 680 324" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common form fields and the correct autocomplete token for each, grouped by category." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The tokens most forms need</title>
  <desc>For identity, full name uses name, and given and family names use given-name and family-name. For contact, email uses email and phone uses tel. For addresses, the first and second lines use address-line1 and address-line2, the town uses address-level2, the postcode uses postal-code and the country uses country-name or country. For organisations, company uses organization. For credentials, the login username uses username, the login password uses current-password and a new password uses new-password, with one-time-code for verification codes. For payment, card number uses cc-number, name on card uses cc-name, expiry uses cc-exp and the security code uses cc-csc. Date of birth uses bday.</desc>
  <rect x="0" y="0" width="680" height="324" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="295.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Field</text>
  <text x="340.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Token</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Full name / given / family</text>
  <text x="340.7" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">name / given-name / family-name</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Email / phone</text>
  <text x="340.7" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">email / tel</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Address lines</text>
  <text x="340.7" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">address-line1, address-line2</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Town / postcode / country</text>
  <text x="340.7" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">address-level2 / postal-code / country-name</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Company</text>
  <text x="340.7" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">organization</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Login username / password</text>
  <text x="340.7" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">username / current-password</text>
  <line x1="14" y1="219.0" x2="666" y2="219.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="238.5" font-size="9.5" fill="#1e1a24" font-family="inherit">New password / verification code</text>
  <text x="340.7" y="238.5" font-size="9.5" fill="#6b5f75" font-family="inherit">new-password / one-time-code</text>
  <line x1="14" y1="248.5" x2="666" y2="248.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="268.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Card number, name, expiry, CVC</text>
  <text x="340.7" y="268.0" font-size="9.5" fill="#6b5f75" font-family="inherit">cc-number, cc-name, cc-exp, cc-csc</text>
  <line x1="14" y1="278.0" x2="666" y2="278.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="297.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Date of birth</text>
  <text x="340.7" y="297.5" font-size="9.5" fill="#6b5f75" font-family="inherit">bday (or bday-day, bday-month, bday-year)</text>
</svg>

---

## The core pattern: a checkout form with correct tokens

```html
<form>
  <fieldset>
    <legend>Contact details</legend>
    <label for="c-name">Full name</label>
    <input id="c-name" name="name" autocomplete="name">
    <label for="c-email">Email address</label>
    <input id="c-email" name="email" type="email" autocomplete="email">
    <label for="c-tel">Mobile number</label>
    <input id="c-tel" name="tel" type="tel" autocomplete="mobile tel">
  </fieldset>

  <fieldset>
    <legend>Delivery address</legend>
    <label for="s-line1">Address line 1</label>
    <input id="s-line1" name="ship-line1" autocomplete="shipping address-line1">
    <label for="s-line2">Address line 2 (optional)</label>
    <input id="s-line2" name="ship-line2" autocomplete="shipping address-line2">
    <label for="s-town">Town or city</label>
    <input id="s-town" name="ship-town" autocomplete="shipping address-level2">
    <label for="s-postcode">Postcode</label>
    <input id="s-postcode" name="ship-postcode" autocomplete="shipping postal-code">
    <label for="s-country">Country</label>
    <select id="s-country" name="ship-country" autocomplete="shipping country"><!-- ISO codes as values --></select>
  </fieldset>

  <fieldset>
    <legend>Payment</legend>
    <label for="cc-name">Name on card</label>
    <input id="cc-name" name="cc-name" autocomplete="cc-name">
    <label for="cc-number">Card number</label>
    <input id="cc-number" name="cc-number" inputmode="numeric" autocomplete="cc-number">
    <label for="cc-exp">Expiry date (MM/YY)</label>
    <input id="cc-exp" name="cc-exp" inputmode="numeric" autocomplete="cc-exp">
    <label for="cc-csc">Security code</label>
    <input id="cc-csc" name="cc-csc" inputmode="numeric" autocomplete="cc-csc">
  </fieldset>
</form>
```

---

## Step-by-step walkthrough

1. **Give every personal-data field a token.** WCAG 1.3.5 applies to fields collecting information about the user; a correct token is how you meet it.
2. **Use the exact spec tokens.** `email`, not `e-mail` or `emailAddress`; `postal-code`, not `zip`. Unknown values are ignored as if no attribute were present.
3. **Match field granularity to the token.** One "Full name" field gets `name`; separate fields get `given-name` and `family-name`. A single address textarea gets `street-address`; separate lines get `address-line1`/`address-line2`.
4. **Prefix with `shipping`/`billing` when both appear.** Otherwise browsers may fill both blocks with the same saved address.
5. **Use `section-*` for repeated blocks.** Multiple guests' names on one page: `section-guest1 name`, `section-guest2 name`.
6. **Pair credential tokens with the right input types.** `username` + `current-password` on login; `new-password` on sign-up and password change, which triggers password generation. Reconcile filled values at submit, as in [handling browser autofill in controlled inputs](https://www.client-side-form.com/form-state-fundamentals-architecture/controlled-vs-uncontrolled-forms/handling-browser-autofill-in-controlled-inputs/).

### Why autofill is an accessibility feature

For a person using a switch, a head pointer or voice control, every character typed costs time and effort; filling a full address by hand can take minutes. For people with memory or cognitive impairments, recalling a postcode or card expiry may be genuinely hard. Correct autocomplete tokens turn those minutes into one selection from the browser's suggestion list. They also allow assistive technologies to present fields with familiar icons or symbols — the "input purpose" WCAG 1.3.5 is named for. None of this requires JavaScript or design changes; it is one attribute per field, and it is one of the highest-value accessibility fixes available in most forms.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing the parts of an autocomplete attribute value in order — optional section, optional shipping or billing group, optional contact type, and the required field token — with an example." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Building an autocomplete value</title>
  <desc>An autocomplete value is built from an optional section name such as section-guest2, an optional group such as shipping or billing, an optional contact type such as work or mobile for contact fields, and the required field token such as tel or postal-code. For example, section-guest2 shipping tel, or work email.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">section-*</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Optional.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">section-guest2</text>
  <path d="M156.0,47.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,43.5 183.0,47.5 176.0,51.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">shipping | billing</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Optional.</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Tells addresses apart.</text>
  <path d="M326.0,47.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,43.5 353.0,47.5 346.0,51.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">home | work | mobile</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Optional, contact fields.</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">mobile tel</text>
  <path d="M496.0,47.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,43.5 523.0,47.5 516.0,51.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">field token</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Required.</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">postal-code, email…</text>
</svg>

### Designing fields so autofill has something to match

Tokens only help when the form's structure matches the data browsers store. Browsers keep addresses as a small set of parts — lines, town, region, postcode, country — and names as given, additional and family names. A form that asks for "House number" and "Street" separately, or "First name" and "Surname" when the audience includes people with a single name, forces the browser to guess, and it often guesses wrong or not at all. Where you can, follow the stored shape: address lines rather than house number and street, a single "Full name" field unless you genuinely need the parts, and a country select whose values are ISO codes.

When business requirements do demand unusual granularity, keep autofill working for the fields that do match and accept that the rest will be typed. Do not reuse a token on a field that means something different — marking "House name" as `address-line1` fills it with a street address, which is worse than filling nothing.

Order matters too. Browsers fill a whole group at once when the user selects a saved address, and they use the relative position of fields as a hint. Grouping all address fields together, in the conventional order, inside one `fieldset` with a clear legend, makes a single autofill selection complete the whole block, which is the experience that saves users the most effort.

Finally, test autofill in the browsers your users have. Save a test profile with a name, email, phone and two addresses in Chrome, Safari and Firefox, fill the form from each, and check that every field receives the right part — and that shipping and billing blocks receive the addresses you chose for them.

---

## Failure modes and edge cases

### 1. `autocomplete="off"` on login forms

Browsers ignore it for credentials to protect password-manager users, and where it is honoured it pushes people toward weak, memorable passwords. Leave credential fields fillable.

### 2. Invented tokens

`autocomplete="address"` or `"postcode"` do nothing. Validators such as the W3C HTML checker and axe flag invalid tokens; include one in CI.

### 3. Hidden fields that get filled

Browsers may fill hidden address fields (address line 2, company) that your form hides behind a toggle. Decide what happens to hidden-but-filled values with the relevance rules from [what happens to errors when a field is hidden](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/errors-for-conditionally-hidden-fields/).

### 4. Country as free text

Browsers fill `country` with an ISO code and `country-name` with a localised name. Use a select with ISO codes as values and `autocomplete="country"`, or accept the name with `country-name` and normalise server-side.

### 5. Custom components

Autocomplete only works on native form controls the browser recognises. A custom select or a web component must render a native input (or be form-associated with an inner input carrying the token) to be fillable, as in [building Lit form controls with ElementInternals](https://www.client-side-form.com/framework-adapters-custom-hooks/web-components-and-form-association/building-lit-form-controls-with-elementinternals/).

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common autocomplete mistakes with the effect and the correct replacement." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Common mistakes and their fixes</title>
  <desc>autocomplete email-address is invalid and ignored; use email. autocomplete zip is invalid; use postal-code. autocomplete off on a password field is ignored and discourages password managers; remove it or use current-password. The same token on shipping and billing addresses causes both to be filled identically; prefix with shipping and billing. A new password field marked current-password prevents password generation; use new-password.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Mistake</text>
  <text x="251.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Effect</text>
  <text x="463.7" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Fix</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;email-address&quot;</text>
  <text x="251.4" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">ignored</text>
  <text x="463.7" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">email</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;zip&quot;</text>
  <text x="251.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">ignored</text>
  <text x="463.7" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">postal-code</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">&quot;off&quot; on password</text>
  <text x="251.4" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">ignored / harmful</text>
  <text x="463.7" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">current-password</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">same tokens on both addresses</text>
  <text x="251.4" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">both filled alike</text>
  <text x="463.7" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">shipping / billing prefixes</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">sign-up uses current-password</text>
  <text x="251.4" y="179.5" font-size="9.5" fill="#a63d6f" font-family="inherit">no password generation</text>
  <text x="463.7" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">new-password</text>
</svg>

---

## Verification checklist

- [ ] Every field collecting personal data has a valid `autocomplete` token.
- [ ] Tokens match field granularity (full name vs given/family, lines vs street-address).
- [ ] Shipping and billing blocks use their prefixes.
- [ ] Repeated blocks use `section-*` names.
- [ ] Login uses `username` + `current-password`; sign-up uses `new-password`.
- [ ] Verification code fields use `one-time-code`.
- [ ] No `autocomplete="off"` on credential or address fields.
- [ ] An automated check flags invalid tokens.

---

## Frequently Asked Questions

<details>
<summary><strong>Does autocomplete affect validation?</strong></summary>

No — it only guides filling. Autofilled values still need validation, and some arrive without the input events your code expects; reconcile at submit.

</details>

<details>
<summary><strong>Should the name attribute match the token?</strong></summary>

It helps browsers' heuristics but is not required; the `autocomplete` token is authoritative. Use clear, stable `name` values for your server and correct tokens for autofill.

</details>

<details>
<summary><strong>What about passkeys?</strong></summary>

Add `webauthn` to the username field's token (`autocomplete="username webauthn"`) to enable conditional passkey UI, where the browser offers saved passkeys in the autofill menu. Keep the password field for users without passkeys.

</details>

---

## Related

- [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
- [One-Time Code Inputs: Keyboard, Paste and Autofill](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/one-time-code-inputs-keyboard-paste-and-autofill/)
- [Validating International Phone Numbers](https://www.client-side-form.com/validation-logic-schema-integration/input-masking-and-formatting/validating-international-phone-numbers/)

← [Keyboard Navigation Patterns](https://www.client-side-form.com/accessibility-and-error-ux/keyboard-navigation-patterns/)
