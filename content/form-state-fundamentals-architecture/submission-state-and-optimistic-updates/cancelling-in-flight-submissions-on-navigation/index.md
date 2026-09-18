---
layout: page.njk
title: "Cancelling In-Flight Submissions on Navigation"
description: "What should happen to a pending form request when the user navigates away, closes the tab or unmounts the form: when to abort with AbortController, when to let it finish with keepalive, and how to avoid state updates on unmounted components."
slug: cancelling-in-flight-submissions-on-navigation
type: howto
breadcrumb: "In-Flight Cancellation"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Cancelling In-Flight Submissions on Navigation"
  parent: "Submission State and Optimistic Updates"
  order: 6
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Cancelling In-Flight Submissions on Navigation",
      "description": "What should happen to a pending form request when the user navigates away, closes the tab or unmounts the form: when to abort with AbortController, when to let it finish with keepalive, and how to avoid state updates on unmounted components.",
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
          "name": "Submission State and Optimistic Updates",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Cancelling In-Flight Submissions on Navigation",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/cancelling-in-flight-submissions-on-navigation/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Decide and implement what happens to pending submissions on navigation",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Classify every request the form makes"
        },
        {
          "@type": "HowToStep",
          "name": "Link cancellable requests to a form-scoped AbortController"
        },
        {
          "@type": "HowToStep",
          "name": "Detach saves and submits from the form"
        },
        {
          "@type": "HowToStep",
          "name": "Warn before leaving during a submit"
        },
        {
          "@type": "HowToStep",
          "name": "Use keepalive for small final writes on tab close"
        },
        {
          "@type": "HowToStep",
          "name": "Never navigate from a detached callback"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does navigating in a single-page app cancel fetch requests?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Client-side routing only swaps components; fetch promises keep running and their callbacks still execute. Only a full page unload (reload, close, cross-document navigation) cancels ordinary requests. That is why form-scoped aborting is explicit."
          }
        },
        {
          "@type": "Question",
          "name": "If I abort a POST, did the server receive it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Possibly. Aborting stops the client waiting and may close the connection, but the server may already have processed the request. Treat an aborted mutation as \"unknown outcome\" and design with idempotency keys so a retry is safe."
          }
        },
        {
          "@type": "Question",
          "name": "Should I use beforeunload to block tab close during a submit?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A beforeunload prompt during a pending submit is one of the few justified uses, and it is only shown if the user has interacted with the page. Remove the listener as soon as the submit settles, because it prevents the page from entering the back/forward cache while registered."
          }
        }
      ]
    }
  ]
}
</script>

# Cancelling In-Flight Submissions on Navigation

When a user submits and immediately clicks a link, the pending request is either killed halfway (the save never happens but the user thinks it did), or it completes and its callback updates a component that no longer exists — setting state, showing a toast on the wrong page, or redirecting the user a second time.

[Submission state and optimistic updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/) covers the request's lifecycle while the form is on screen. This page covers the moment the form stops being on screen. The right answer depends on the request: a search or validation request should be aborted; a save should usually be allowed to finish; and neither should touch UI that has gone.

---

## Context and prerequisites

Three separate things happen to a request when its form goes away, and they are often confused:

- **The request itself** — does it keep going? In a single-page app, navigating to another route does *not* cancel `fetch`; the request continues unless you abort it. Closing or reloading the tab *does* cancel ordinary requests, unless they use `keepalive`.
- **The response handling** — the `.then` callbacks still run when the response arrives, even if the component is unmounted, and may update state or trigger navigation.
- **The server's work** — aborting on the client does not undo work the server already did. An aborted save may still have been committed.

So the design question per request is: *should this outcome still happen if the user leaves?* Saves, payments and submissions: yes — let them finish, detach the UI. Validation, search, previews: no — abort them.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of pending request kinds — async validation, search or preview, draft autosave, final submit and analytics beacon — with whether to abort on route change, what to do on tab close, and what to do with the response." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to do with each kind of pending request</title>
  <desc>Async validation and search requests should be aborted on route change and on tab close, and their responses ignored. A draft autosave should be allowed to finish on route change and sent with keepalive on tab close, with the response updating only storage. A final submit should be allowed to finish on route change, which may warn before leaving, and its response should update a global store or notification rather than the unmounted form. An analytics beacon should use sendBeacon.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Request</text>
  <text x="173.4" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Route change</text>
  <text x="322.8" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Tab close</text>
  <text x="472.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Response handling</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">async validation</text>
  <text x="173.4" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">abort</text>
  <text x="322.8" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">lost (fine)</text>
  <text x="472.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">ignore</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">search / preview</text>
  <text x="173.4" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">abort</text>
  <text x="322.8" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">lost (fine)</text>
  <text x="472.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">ignore</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">draft autosave</text>
  <text x="173.4" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">let finish</text>
  <text x="322.8" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">keepalive</text>
  <text x="472.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">storage only</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">final submit</text>
  <text x="173.4" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">let finish</text>
  <text x="322.8" y="150.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">warn before unload</text>
  <text x="472.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">global store, not the form</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">analytics</text>
  <text x="173.4" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">let finish</text>
  <text x="322.8" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">sendBeacon</text>
  <text x="472.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">none</text>
</svg>

---

## The core pattern: scope requests to the form, and decide per request

```typescript
export class FormRequestScope {
  // Aborted when the form unmounts. Every cancellable request links to it.
  private controller = new AbortController();
  private mounted = true;

  get signal(): AbortSignal { return this.controller.signal; }

  /** For requests that should die with the form (validation, search). */
  cancellable<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    return run(this.controller.signal).catch((err) => {
      // AbortError is expected on unmount: swallow it, rethrow everything else.
      if (err?.name === "AbortError") return undefined;
      throw err;
    });
  }

  /**
   * For requests that must complete even if the user leaves (saves, submits).
   * The request is NOT linked to the scope's signal. Its UI callback runs only
   * while mounted; the durable callback always runs.
   */
  detached<T>(
    run: () => Promise<T>,
    onDurable: (r: T) => void,        // e.g. update a global store / show a global toast
    onUi?: (r: T) => void,            // e.g. clear this form's pending state
  ): Promise<T> {
    return run().then((r) => {
      onDurable(r);
      if (this.mounted) onUi?.(r);
      return r;
    });
  }

  dispose() {
    this.mounted = false;
    // reason gives aborted requests a recognisable cause in logs
    this.controller.abort(new DOMException("form unmounted", "AbortError"));
  }
}
```

```typescript
// React usage
function useFormRequestScope() {
  const scopeRef = useRef<FormRequestScope>();
  scopeRef.current ??= new FormRequestScope();
  useEffect(() => () => scopeRef.current!.dispose(), []);
  return scopeRef.current;
}
```

For the tab-close case, send autosave with `fetch(url, { method: "POST", body, keepalive: true })` from a `pagehide` handler; `keepalive` lets the request outlive the page, with a combined body limit of 64 KiB for in-flight keepalive requests.

---

## Step-by-step walkthrough

1. **Classify every request the form makes.** Does its outcome matter if the user leaves? That single question sorts requests into cancellable and detached.
2. **Link cancellable requests to a form-scoped `AbortController`.** Abort it in the unmount cleanup; swallow `AbortError` and nothing else. The same technique protects validators, as in [cancelling stale async validation with AbortController](https://www.client-side-form.com/validation-logic-schema-integration/asynchronous-validation-strategies/cancelling-stale-async-validation-with-abortcontroller/).
3. **Detach saves and submits from the form.** Their results go to something that outlives the form — a global store, a notification centre, the router cache — and only touch the form's own UI if it is still mounted.
4. **Warn before leaving during a submit.** While a final submit is pending, the unsaved-changes guard from [warning before leaving a form with unsaved changes](https://www.client-side-form.com/form-state-fundamentals-architecture/dirty-and-pristine-state-tracking/warning-before-leaving-a-form-with-unsaved-changes/) can say "Your application is still sending" for in-app navigation.
5. **Use `keepalive` for small final writes on tab close.** Flush autosave on `pagehide`, not `beforeunload` or `unload`, which are unreliable on mobile and block the back/forward cache.
6. **Never navigate from a detached callback.** "Redirect to the confirmation page on success" must check that the user is still on the form's route; otherwise a completed save yanks them away from wherever they went.

<svg viewBox="0 0 680 217" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of the form sending a submit, the user navigating to another page which unmounts the form, the request completing, and the result going to a global notification instead of the unmounted form." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A submit that outlives its form</title>
  <desc>The form sends the submit as a detached request. The user clicks a link and the router unmounts the form, which disposes the scope and aborts only cancellable requests, such as a pending address lookup. The submit continues. When it succeeds, the durable callback records the result in a global store and shows a global notification saying the application was sent. The form&#x27;s UI callback is skipped because the form is unmounted, and no redirect happens.</desc>
  <rect x="0" y="0" width="680" height="217" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="95.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Form</text>
  <rect x="185.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="258.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Router</text>
  <rect x="348.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="421.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <rect x="511.0" y="12.0" width="147.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="584.5" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Global store</text>
  <path d="M95.5,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M258.5,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M421.5,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M584.5,41.0 V183.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="103.5" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">POST /applications (detached)</text>
  <path d="M95.5,69.0 H413.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="413.5,65.0 420.5,69.0 413.5,73.0" fill="#7b4f8a"/>
  <text x="103.5" y="93.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">navigate away: unmount, abort</text>
  <text x="103.5" y="105.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">lookups</text>
  <path d="M258.5,109.0 H103.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="103.5,105.0 96.5,109.0 103.5,113.0" fill="#7b4f8a"/>
  <text x="429.5" y="133.0" font-size="9.5" fill="#2d6342" font-family="inherit">201 Created → durable callback</text>
  <path d="M421.5,137.0 H576.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="576.5,133.0 583.5,137.0 576.5,141.0" fill="#7b4f8a"/>
  <text x="266.5" y="161.0" font-size="9.5" fill="#2d6342" font-family="inherit">global toast: application sent</text>
  <path d="M584.5,165.0 H266.5" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="266.5,161.0 259.5,165.0 266.5,169.0" fill="#7b4f8a"/>
  <text x="14.0" y="205.0" font-size="10" fill="#6b5f75" font-family="inherit">The form&#x27;s own success handler (clear fields, redirect) is skipped because the form is gone; the user stays on the page they chose.</text>
</svg>

---

## Failure modes and edge cases

### 1. "Can't perform a state update on an unmounted component"

Older React versions warned about this; newer ones stay silent, but the bug remains — a callback updating state that nobody renders, or worse, a callback that navigates. Route detached results through a store and guard UI callbacks with a mounted check, as above.

### 2. Aborting a save you meant to keep

Linking every request to one unmount signal is tempting and wrong for saves. An aborted POST may or may not have reached the server; the user sees no confirmation and may redo the work, creating a duplicate. Detach saves and rely on [idempotency](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/handling-double-submit-and-idempotency/).

### 3. React Strict Mode double effects

In development, React mounts, unmounts and remounts components, which disposes the first scope immediately. Create the scope in a way that survives this — the lazy `useRef` above plus disposal in cleanup works, as long as nothing started in the first mount is expected to succeed.

### 4. `keepalive` limits

Keepalive requests share a 64 KiB in-flight body budget per page; larger bodies make `fetch` reject. Keep flushes small (a diff, not the whole draft), or save the draft locally and let the next visit sync it.

### 5. Router-level cancellation

Some frameworks abort loader and action requests on navigation automatically (React Router passes a `request.signal` that aborts when a navigation is interrupted). That is correct for data loading and must be considered carefully for mutations; see [form validation with React Router actions](https://www.client-side-form.com/framework-adapters-custom-hooks/hydration-sync-for-ssr-forms/form-validation-with-react-router-actions/).

<svg viewBox="0 0 680 233" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for a pending request when its form goes away — whether its outcome still matters to the user, whether the tab is closing, and the resulting technique." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Abort, detach or keepalive?</title>
  <desc>If the request&#x27;s outcome does not matter once the user leaves, as with validation, search and previews, abort it with the form&#x27;s AbortController. If it matters and the user is navigating within the app, detach it so it completes and reports to a global store. If it matters and the tab is closing, send a small final write with keepalive from a pagehide handler, or rely on the locally saved draft being synced on the next visit.</desc>
  <rect x="0" y="0" width="680" height="233" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Outcome irrelevant once the user leaves?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Abort</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">User navigating within the app?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Detach</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Tab closing: keepalive</text>
  <text x="26.0" y="203.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Small write from pagehide, or sync next visit.</text>
</svg>

---

## Verification checklist

- [ ] Navigating away while an async validator is pending aborts it with no console error.
- [ ] Navigating away during a submit lets it finish, and a global confirmation appears.
- [ ] No completed request redirects the user off a page they navigated to.
- [ ] No state is set on unmounted form components.
- [ ] Autosave flushes on `pagehide` with `keepalive`, within the size limit.
- [ ] In-app navigation during a final submit shows a clear warning.
- [ ] Strict Mode development double-mounts do not break submissions.

---

## Frequently Asked Questions

<details>
<summary><strong>Does navigating in a single-page app cancel fetch requests?</strong></summary>

No. Client-side routing only swaps components; `fetch` promises keep running and their callbacks still execute. Only a full page unload (reload, close, cross-document navigation) cancels ordinary requests. That is why form-scoped aborting is explicit.

</details>

<details>
<summary><strong>If I abort a POST, did the server receive it?</strong></summary>

Possibly. Aborting stops the client waiting and may close the connection, but the server may already have processed the request. Treat an aborted mutation as "unknown outcome" and design with idempotency keys so a retry is safe.

</details>

<details>
<summary><strong>Should I use beforeunload to block tab close during a submit?</strong></summary>

A `beforeunload` prompt during a pending submit is one of the few justified uses, and it is only shown if the user has interacted with the page. Remove the listener as soon as the submit settles, because it prevents the page from entering the back/forward cache while registered.

</details>

---

## Related

- [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)
- [Queueing Form Submissions While Offline](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/queueing-form-submissions-while-offline/)
- [Rolling Back Optimistic Updates on Failure](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/rolling-back-optimistic-updates-on-failure/)

← [Submission State and Optimistic Updates](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/)
