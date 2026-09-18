---
layout: page.njk
title: "File Upload Fields and Binary State"
description: "Architecture for file inputs inside client-side forms: modelling a file field as a state machine, validating type and size before upload, progress and cancellation, previews without memory leaks, resumable uploads, and how uploads interact with submit, drafts and errors."
slug: file-upload-fields-and-binary-state
type: topic
breadcrumb: "File Uploads"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "File Upload Fields and Binary State"
  parent: "Form State Fundamentals"
  order: 10
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "File Upload Fields and Binary State",
      "description": "Architecture for file inputs inside client-side forms: modelling a file field as a state machine, validating type and size before upload, progress and cancellation, previews without memory leaks, resumable uploads, and how uploads interact with submit, drafts and errors.",
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
          "name": "File Upload Fields and Binary State",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Build a file field with its own upload lifecycle",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Problem statement"
        },
        {
          "@type": "HowToStep",
          "name": "State machine specification"
        },
        {
          "@type": "HowToStep",
          "name": "Core implementation"
        },
        {
          "@type": "HowToStep",
          "name": "Integration guidance"
        },
        {
          "@type": "HowToStep",
          "name": "Security boundaries: what the client can and cannot promise"
        },
        {
          "@type": "HowToStep",
          "name": "Edge cases and failure modes"
        },
        {
          "@type": "HowToStep",
          "name": "Testing and QA hooks"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I make a file input controlled like a text input?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not in the usual sense: script cannot set an arbitrary file into an input for security reasons. Keep the file input uncontrolled as a picker, read the File objects on change, store them in your own state as items, and render the list from state. The input's own value can be cleared after each pick."
          }
        },
        {
          "@type": "Question",
          "name": "Should uploads start immediately on selection?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Usually yes, for upload-first designs: by the time the user finishes the rest of the form, the files are ready, and failures surface while they can still act on them. Start only after local validation passes, and make it cancellable. If files are sensitive and the user may abandon the form, consider deferring until submit and accept the slower final step."
          }
        },
        {
          "@type": "Question",
          "name": "How should upload progress be announced to screen readers?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Do not announce every percentage. Expose a progress element with an accessible name that screen-reader users can query, and announce only start, completion and failure through a polite live region (\"report.pdf uploaded\", \"photo.jpg failed to upload, retry available\")."
          }
        },
        {
          "@type": "Question",
          "name": "Who deletes files that were uploaded but never submitted?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The server. Uploaded-but-unreferenced files should expire after a period (a day is common) unless a submitted record references them. The client can also send a delete request when the user removes an uploaded file, but it cannot be relied on — tabs close."
          }
        }
      ]
    }
  ]
}
</script>

# File Upload Fields and Binary State

A file field is the one input whose value is not a string, cannot be set by script, may take minutes to "finish", and can fail halfway — so treating it like a text input produces forms that submit before uploads complete, lose attachments on reload, leak memory on every preview and report a 413 from the server as "something went wrong".

Most of [form state fundamentals and architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/) assumes that a field's value changes instantly when the user acts and that validation is cheap. Files break both assumptions. Choosing a file is instant; making it *usable* by the server — uploading it, having it scanned, receiving an id back — is a long-running process with its own states, its own failures and its own progress. This topic models that process explicitly and shows how it plugs into validation, submission, drafts and accessibility, with guides for each part.

---

## Problem statement

Four properties set file fields apart:

1. **The value is a handle to binary data.** A `File` object references bytes on disk. You can read, slice and upload it, but you cannot put a file *into* an `<input type="file">` from script (only by assigning a `FileList` obtained from another input or a `DataTransfer`), which rules out the "controlled input" model.
2. **Most validation can and should happen before upload.** Size, type, image dimensions and page count are all knowable locally. Uploading a 200 MB video to be told the limit is 20 MB wastes minutes and data.
3. **Upload is asynchronous and long.** It needs progress, cancellation, retry and — for large files — resumption.
4. **The form's submit depends on it.** Either the files travel with the submit (one big multipart request), or they are uploaded first and the submit carries references. Each has consequences for errors and for what happens when the user presses Submit mid-upload.

The pattern applies to any form with attachments: document uploads in applications, avatars in profiles, receipts in expense forms, media in content editors.

<svg viewBox="0 0 680 224" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of sending files inside the form submit as multipart data versus uploading files first and submitting references, across progress, failure scope, retry, draft support and server design." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Two ways to submit a form with files</title>
  <desc>Sending files inside the submit as multipart form data is simple and atomic but gives one progress bar for everything, fails the whole submit if any file fails, retries by resending every file, and cannot support drafts that include files without re-uploading. Uploading files first to a separate endpoint and submitting only their ids gives per-file progress and errors, retries only the failed file, lets drafts store the ids, and requires the server to clean up orphaned uploads.</desc>
  <rect x="0" y="0" width="680" height="224" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Aspect</text>
  <text x="179.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Files inside submit</text>
  <text x="427.6" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Upload first, submit ids</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Progress</text>
  <text x="179.2" y="61.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">one bar for everything</text>
  <text x="427.6" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">per file</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">A file fails</text>
  <text x="179.2" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">whole submit fails</text>
  <text x="427.6" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">only that file</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Retry</text>
  <text x="179.2" y="120.5" font-size="9.5" fill="#a63d6f" font-family="inherit">resend every file</text>
  <text x="427.6" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">resend one file</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Drafts</text>
  <text x="179.2" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">files lost or re-uploaded</text>
  <text x="427.6" y="150.0" font-size="9.5" fill="#2d6342" font-family="inherit">store ids</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Server work</text>
  <text x="179.2" y="179.5" font-size="9.5" fill="#2d6342" font-family="inherit">one endpoint</text>
  <text x="427.6" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">upload endpoint + orphan cleanup</text>
  <text x="14.0" y="211.5" font-size="10" fill="#6b5f75" font-family="inherit">For anything beyond a single small attachment, upload-first is the architecture that keeps errors and retries per file.</text>
</svg>

---

## State machine specification

Each file in a file field is its own item with its own lifecycle. The field's validity is derived from its items.

| State | Entered by | Leaves on |
|---|---|---|
| `selected` | User chooses or drops a file | Local validation passes → `uploading`; fails → `rejected` |
| `rejected` | Type, size or content check failed locally | User removes it or replaces it |
| `uploading` | Upload request started | Progress events; success → `uploaded`; network error → `failed`; cancel → removed |
| `failed` | Network or 5xx error | Retry → `uploading`; remove |
| `uploaded` | Server returned an id | Server-side scan pending → `processing`, or ready |
| `processing` | Server is scanning or transcoding | Poll/push → `ready` or `rejected` (e.g. malware, unreadable) |
| `ready` | Server confirmed the file is usable | Remove |

The field is **valid for submit** only when every item is `ready` (or `uploaded` if your server does not process files) and count limits are met. It is **busy** while any item is `uploading` or `processing` — which determines what pressing Submit does.

<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical flow of a single file item from selected through local validation, uploading, uploaded, server processing and ready, with the rejected and failed branches described alongside." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>One file&#x27;s lifecycle</title>
  <desc>A file enters as selected when the user chooses or drops it. Local validation checks type, size and content; failures go to rejected with a specific message and never upload. Passing files start uploading with progress and a cancel control; network failures go to failed with a retry option. On success the server returns an id and the file is uploaded. If the server scans or transcodes, the item is processing until it is ready or rejected by the server. Only ready items count toward a valid submit.</desc>
  <rect x="0" y="0" width="680" height="340" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="343.7" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">selected</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">File object held in state.</text>
  <text x="387.7" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Local checks run immediately: type, size, content.</text>
  <path d="M185.8,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="181.8,89.0 185.8,96.0 189.8,89.0" fill="#7b4f8a"/>
  <text x="195.8" y="86.0" font-size="9" fill="#6b5f75" font-family="inherit">checks pass</text>
  <rect x="14.0" y="97.0" width="343.7" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">uploading</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Progress and a Cancel button.</text>
  <text x="387.7" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Network error → failed (Retry). Cancel → removed.</text>
  <path d="M185.8,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="181.8,174.0 185.8,181.0 189.8,174.0" fill="#7b4f8a"/>
  <text x="195.8" y="171.0" font-size="9" fill="#6b5f75" font-family="inherit">server returns id</text>
  <rect x="14.0" y="182.0" width="343.7" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">uploaded → processing</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Server scans or transcodes.</text>
  <text x="387.7" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Server may still reject: malware, unreadable, wrong content.</text>
  <path d="M185.8,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="181.8,259.0 185.8,266.0 189.8,259.0" fill="#7b4f8a"/>
  <text x="195.8" y="256.0" font-size="9" fill="#6b5f75" font-family="inherit">server confirms</text>
  <rect x="14.0" y="267.0" width="343.7" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">ready</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The id is safe to submit.</text>
  <text x="387.7" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Only ready items make the field valid.</text>
</svg>

---

## Core implementation

```typescript
export type FileItemState =
  | { kind: "selected" }
  | { kind: "rejected"; reason: string }
  | { kind: "uploading"; loaded: number; total: number; abort: () => void }
  | { kind: "failed"; reason: string }
  | { kind: "processing"; serverId: string }
  | { kind: "ready"; serverId: string };

export interface FileItem {
  id: string;                    // client id, stable across state changes
  file: File;
  previewUrl?: string;           // object URL, revoked when the item is removed
  state: FileItemState;
}

export interface FileFieldRules {
  accept: string[];              // MIME types or extensions: ["image/png", ".pdf"]
  maxBytes: number;
  maxFiles: number;
}

export function fieldStatus(items: FileItem[], rules: FileFieldRules) {
  const busy = items.some((i) => i.state.kind === "uploading" || i.state.kind === "processing");
  const problems = items.filter((i) => i.state.kind === "rejected" || i.state.kind === "failed");
  const ready = items.filter((i) => i.state.kind === "ready");
  return {
    busy,
    // Valid for submit: nothing pending, nothing broken, count within limits.
    valid: !busy && problems.length === 0 && ready.length <= rules.maxFiles,
    serverIds: ready.map((i) => (i.state as { serverId: string }).serverId),
    problems,
  };
}

// Submit handler: never submit while busy; say what is happening instead.
export async function onSubmit(items: FileItem[], rules: FileFieldRules,
  announce: (msg: string) => void, send: (ids: string[]) => Promise<void>) {
  const s = fieldStatus(items, rules);
  if (s.busy) {
    announce("Your files are still uploading. The form will be ready to send when they finish.");
    return;
  }
  if (!s.valid) {
    announce(`${s.problems.length} file(s) need attention before you can send the form.`);
    return;
  }
  await send(s.serverIds);
}
```

The field component owns a list of `FileItem`s keyed by client id — the same identity-over-position rule as [dynamic field arrays and repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/), because users add and remove files in any order. The upload itself is a separate module that moves items between states; the guides below implement each transition.

---

## Integration guidance

**Local validation.** Check size and declared type immediately on selection, then sniff the real type from the file's first bytes, and for images check dimensions — all before any byte is uploaded. [Validating file type and size before upload](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/validating-file-type-and-size-before-upload/) implements the checks and their messages.

**Upload and progress.** `fetch` does not report upload progress in current browsers; `XMLHttpRequest` does via `xhr.upload.onprogress`. Use XHR (or a library over it) for any file large enough to need a progress bar, with `AbortController`-style cancellation wired to `xhr.abort()`. See [upload progress and cancellation with XHR and fetch](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/upload-progress-and-cancellation/).

**Previews.** Image previews via `URL.createObjectURL(file)` are instant and cheap — provided every URL is revoked when its item is removed or replaced. Otherwise each preview pins the file's memory until the page unloads; [image previews with object URLs without leaks](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/image-previews-with-object-urls-without-leaks/) shows the ownership model.

**Large files.** Anything that takes more than a minute to upload on a typical connection needs resumption: chunking, server-side offsets and retry of individual chunks — covered in [resumable chunked uploads for large files](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/resumable-chunked-uploads-for-large-files/).

**Drafts.** With upload-first, a draft stores server ids plus file names and sizes, and restoring a draft shows those items as `ready` without re-uploading. Files still `uploading` when the draft is saved can be stored as `File` objects in IndexedDB, per [storing large drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/), and resumed on restore.

**Errors and summaries.** Rejected and failed items are field errors on the file field; name the file in the message ("report.docx is 31 MB; the limit is 20 MB") and list each in the error summary with a link to the item's Remove or Retry button.

**Offline.** Queued submissions that include file references depend on the uploads having completed; if files are still local, queue the uploads themselves, as in [queueing form submissions while offline](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/queueing-form-submissions-while-offline/).

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four cards describing the modules that cooperate in a file field — local validation, the uploader, previews and the submit gate." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The modules around a file field</title>
  <desc>Local validation runs on selection and rejects files by size, declared type, sniffed type and image dimensions with messages naming the file. The uploader moves items through uploading, failed, processing and ready, with progress, cancel and retry. The preview module creates object URLs and revokes them when items are removed or the field unmounts. The submit gate refuses to submit while any item is busy, lists items needing attention, and sends only ready server ids.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Local validation</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Size, type, sniffed bytes,</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">dimensions.</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Messages name the file.</text>
  <rect x="180.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="192.5" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Uploader</text>
  <text x="192.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Progress, cancel, retry.</text>
  <text x="192.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Resumable for large files.</text>
  <rect x="347.0" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="359.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Previews</text>
  <text x="359.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Object URLs.</text>
  <text x="359.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Revoked on remove and</text>
  <text x="359.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">unmount.</text>
  <rect x="513.5" y="12.0" width="152.5" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="525.5" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Submit gate</text>
  <text x="525.5" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Busy? explain and wait.</text>
  <text x="525.5" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Send ready ids only.</text>
</svg>

---

## Security boundaries: what the client can and cannot promise

Client-side checks on files are a usability feature, not a security control. Everything the browser tells you about a file — its name, its `type`, even its bytes — is under the control of whoever supplies it, and a determined user can bypass your JavaScript entirely and post directly to the upload endpoint. That does not make client checks pointless; it defines their job. They exist so that honest users learn about problems in milliseconds instead of minutes, and so that the upload endpoint receives far fewer obviously wrong files.

The server must therefore repeat every check: size limits enforced while streaming the body (not after buffering it), content-type determined from the bytes, image decoding in a sandbox, archive contents inspected before extraction, and malware scanning where the files will be opened by other people. The `processing` state in the lifecycle above is where those server checks surface in the UI, and the client should treat a server rejection exactly like a local one: the item shows the reason, the field is invalid, and the user can remove or replace it.

Two further boundaries matter for forms. First, **file names are untrusted display text** — render them as text, never as HTML, and truncate very long names in the middle so the extension stays visible. Second, **uploaded files are not yet part of the record**. Until the form is submitted and the server links the file ids to a record, uploaded files are provisional; the server should refuse to link ids that belong to another user's session, which prevents one user from attaching someone else's upload by guessing ids.

Keeping these boundaries explicit also simplifies the client. It does not need to be perfect at type detection or exhaustive about formats; it needs to catch the common mistakes quickly and present the server's verdict clearly when the server knows better.

---

## Edge cases and failure modes

**Selecting the same file twice.** An `<input type="file">` does not fire `change` if the user picks the same file again, because the value did not change. Reset `input.value = ""` after reading the selection so re-picking a file (for example after removing it) works.

**Drag and drop.** Dropped items can include directories and non-file entries. Filter `dataTransfer.files`, and treat a drop of ten files onto a single-file field as a validation error rather than silently keeping the first.

**Mobile camera capture.** `accept="image/*"` with `capture` opens the camera. Photos from phone cameras are large (several MB) and may be HEIC on iOS, which many servers do not accept; decide whether to convert on the client or accept HEIC.

**Replacing a file.** In a single-file field, choosing a new file while the old one is uploading must abort the old upload and revoke its preview, not leave an orphaned request running.

**Server rejects after upload.** Malware scanning or content checks can reject a file that uploaded successfully. The item moves to `rejected` with the server's reason, the same as a local rejection, so the UI has one error path.

**Hidden input styling.** Custom-styled upload buttons that hide the native input with `display: none` make it unreachable by keyboard. Visually hide it instead and style its `label`, or trigger it from a real `<button>` with `input.click()`.

---

## Troubleshooting reference

| Symptom | Diagnostic step | Recovery |
|---|---|---|
| Form submits without the attachment | Check whether submit waited for uploads; log the field status at submit | Gate submit on `busy` and send only `ready` ids |
| Memory grows with every image picked | Heap snapshot: look for detached `Blob`s held by object URLs | Revoke each URL on remove, replace and unmount |
| Progress bar jumps from 0 to 100% | Check whether the upload uses `fetch` | Use XHR's `upload.onprogress` for progress |
| Re-picking the same file does nothing | Check whether `input.value` is still set | Clear `input.value` after handling `change` |
| 413 shown as a generic error | Inspect the response status of the upload | Validate size locally; map 413 to the size message |

---

## Testing and QA hooks

Give each file item a `data-file-id` with its client id and a `data-file-state` mirroring the state machine, so end-to-end tests can wait for `[data-file-state="ready"]` rather than sleeping. Playwright's `setInputFiles` accepts in-memory buffers, which makes size-limit and type-sniffing tests fast: construct a buffer with a PNG signature but a `.pdf` name, and assert the type-mismatch message.

For accessibility, assert that progress is exposed through a `progress` element or `role="progressbar"` with an accessible name that includes the file name, that completion and failure are announced through a polite live region, and that Remove and Retry buttons have names such as "Remove report.pdf". [End-to-end form error tests with Playwright](https://www.client-side-form.com/validation-logic-schema-integration/testing-form-validation/end-to-end-form-error-tests-with-playwright/) covers the live-region assertions.

<svg viewBox="0 0 680 206" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of five test cases for a file field with the setup and the expected result." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to test for every file field</title>
  <desc>A file over the size limit is rejected locally with a message naming the file and no upload request is made. A file whose bytes do not match its extension is rejected with a type message. Pressing submit while an upload is in progress does not submit and announces that files are still uploading. Removing a file mid-upload aborts its request and revokes its preview. A server-side rejection after upload shows the same error treatment as a local rejection.</desc>
  <rect x="0" y="0" width="680" height="206" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="177.5" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Case</text>
  <text x="168.9" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Setup</text>
  <text x="386.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Expect</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">too large</text>
  <text x="168.9" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">buffer of limit + 1 byte</text>
  <text x="386.2" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">rejected locally; no request sent</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">wrong content</text>
  <text x="168.9" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">PNG bytes named .pdf</text>
  <text x="386.2" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">type message naming the file</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">submit while busy</text>
  <text x="168.9" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">slow upload, press Submit</text>
  <text x="386.2" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">no submit; &quot;still uploading&quot; announced</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">remove mid-upload</text>
  <text x="168.9" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">remove during progress</text>
  <text x="386.2" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">request aborted; URL revoked</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">server rejects</text>
  <text x="168.9" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">upload ok, scan fails</text>
  <text x="386.2" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">item rejected with server reason</text>
</svg>

---

## Common pitfalls

- **Submitting while uploads are still running.** The form sends before the file ids exist; gate submit on the field's busy state.
- **Validating only on the server.** A 20 MB limit discovered after a 3-minute upload is a failure of the client.
- **Trusting the extension or the browser's `file.type`.** Both come from the file name; sniff the bytes for anything security- or processing-sensitive (and validate on the server regardless).
- **Leaking object URLs.** Every `createObjectURL` needs a matching `revokeObjectURL`.
- **Hiding the native input with `display: none`.** It removes the control from the keyboard and accessibility tree.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I make a file input controlled like a text input?</strong></summary>

Not in the usual sense: script cannot set an arbitrary file into an input for security reasons. Keep the file input uncontrolled as a picker, read the `File` objects on `change`, store them in your own state as items, and render the list from state. The input's own value can be cleared after each pick.

</details>

<details>
<summary><strong>Should uploads start immediately on selection?</strong></summary>

Usually yes, for upload-first designs: by the time the user finishes the rest of the form, the files are ready, and failures surface while they can still act on them. Start only after local validation passes, and make it cancellable. If files are sensitive and the user may abandon the form, consider deferring until submit and accept the slower final step.

</details>

<details>
<summary><strong>How should upload progress be announced to screen readers?</strong></summary>

Do not announce every percentage. Expose a `progress` element with an accessible name that screen-reader users can query, and announce only start, completion and failure through a polite live region ("report.pdf uploaded", "photo.jpg failed to upload, retry available").

</details>

<details>
<summary><strong>Who deletes files that were uploaded but never submitted?</strong></summary>

The server. Uploaded-but-unreferenced files should expire after a period (a day is common) unless a submitted record references them. The client can also send a delete request when the user removes an uploaded file, but it cannot be relied on — tabs close.

</details>

---

## Related

- [Validating File Type and Size Before Upload](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/validating-file-type-and-size-before-upload/)
- [Upload Progress and Cancellation With XHR and Fetch](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/upload-progress-and-cancellation/)
- [Image Previews With Object URLs Without Leaks](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/image-previews-with-object-urls-without-leaks/)
- [Resumable Chunked Uploads for Large Files](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/resumable-chunked-uploads-for-large-files/)

← [Form State Fundamentals & Architecture](https://www.client-side-form.com/form-state-fundamentals-architecture/)
