# Client-Side Form State &amp; Validation Architecture

> Production-grade patterns and runnable reference implementations for building robust client-side forms — deterministic state lifecycles, schema-driven validation, cross-framework adapters, and accessible error UX.

**🔗 Live site: [www.client-side-form.com](https://www.client-side-form.com)**

![Built with Eleventy](https://img.shields.io/badge/built%20with-Eleventy-2e3440)
![Deployed on Cloudflare Pages](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-f38020)
![Language: TypeScript-first](https://img.shields.io/badge/code-TypeScript--first-3178c6)

---

## What this is

[**client-side-form.com**](https://www.client-side-form.com) is a deep technical reference for
frontend, UX, and design-system engineers who build and debug real forms in production. Every page
assumes you are fixing a concrete failure — a stale async validation result overwriting fresh state,
an SSR hydration mismatch, a focus trap after a failed submit, a form that re-renders 200 fields on
every keystroke — not learning forms for the first time. All code is **TypeScript-first** and runnable,
not pseudo-code.

If you have ever shipped a form that showed validation errors before the user typed anything, kept a
submit button disabled after a programmatic reset, or announced the wrong error to a screen reader,
this is written for you.

## What you'll find

Four interconnected knowledge areas, **50+ in-depth guides**:

- 📐 **Form State Fundamentals &amp; Architecture** — lifecycle state machines, dirty/pristine tracking,
  controlled vs uncontrolled ownership, error-state mapping, performance at 100+ fields, and the
  submit/optimistic-update lifecycle.
- 🔌 **Framework Adapters &amp; Custom Hooks** — framework-agnostic adapter contracts with concrete
  implementations for **React, Vue, Svelte, and Angular**, custom hooks, SSR hydration sync, and store
  integration.
- ✅ **Validation Logic &amp; Schema Integration** — synchronous and async validation pipelines,
  `AbortController` cancellation, cross-field dependency graphs, and choosing between **Zod, Yup, and
  Valibot**.
- ♿ **Accessibility &amp; Error UX** — ARIA live regions, `aria-invalid`/`aria-describedby` wiring, focus
  management after failed validation, and keyboard-navigation patterns.

Every guide carries hand-authored diagrams, typed code, failure-mode walkthroughs, and a verification
checklist.

## About

Production-grade patterns for **client-side form state, schema validation, framework adapters
(React / Vue / Svelte / Angular), and accessible error UX** — a TypeScript-first engineering reference.

- **Website:** https://www.client-side-form.com
- **Topics:** `forms` · `form-validation` · `form-state` · `state-management` · `react` · `vue` ·
  `svelte` · `angular` · `typescript` · `accessibility` · `zod` · `frontend` · `web-development` ·
  `eleventy` · `design-systems`

## Tech &amp; build

- Static site generated with [Eleventy (11ty)](https://www.11ty.dev/).
- Vanilla CSS and progressive-enhancement JavaScript — **no framework runtime is shipped to the browser**.
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com/).

```bash
npm install       # install dev dependencies
npm start         # local dev server with live reload
npm run build     # build the static site into _site/
npm run deploy    # build and deploy to Cloudflare Pages
```

## Contributing

Issues and suggestions are welcome — open an issue describing the pattern, failure mode, or correction.
Content favours production-tested, framework-honest guidance over trends.

---

Made for engineers who take forms seriously · [www.client-side-form.com](https://www.client-side-form.com)
