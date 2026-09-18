---
layout: page.njk
title: "Resumable Chunked Uploads for Large Files"
description: "Upload large files in chunks so a dropped connection costs seconds, not the whole transfer: slicing with File.slice, a server-side offset handshake, per-chunk retry with backoff, resuming after reload from IndexedDB, and how tus and S3 multipart fit."
slug: resumable-chunked-uploads-for-large-files
type: howto
breadcrumb: "Resumable Uploads"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Resumable Chunked Uploads for Large Files"
  parent: "File Upload Fields and Binary State"
  order: 4
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Resumable Chunked Uploads for Large Files",
      "description": "Upload large files in chunks so a dropped connection costs seconds, not the whole transfer: slicing with File.slice, a server-side offset handshake, per-chunk retry with backoff, resuming after reload from IndexedDB, and how tus and S3 multipart fit.",
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
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Resumable Chunked Uploads for Large Files",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/resumable-chunked-uploads-for-large-files/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Upload large files in resumable chunks",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Decide the threshold"
        },
        {
          "@type": "HowToStep",
          "name": "Create a session with the total size"
        },
        {
          "@type": "HowToStep",
          "name": "Always resume from the server's offset"
        },
        {
          "@type": "HowToStep",
          "name": "Retry chunks with backoff and jitter"
        },
        {
          "@type": "HowToStep",
          "name": "Resume after reload"
        },
        {
          "@type": "HowToStep",
          "name": "Handle expiry"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I use tus or S3 multipart?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use whatever your storage supports natively. tus has mature client and server libraries and a simple offset model; S3-compatible storage supports multipart directly with presigned part URLs, so the browser can upload to storage without your servers carrying the bytes. The client logic is similar: track committed parts or offsets, retry individually, and complete at the end."
          }
        },
        {
          "@type": "Question",
          "name": "What chunk size should I use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Between 5 and 10 MB works well for most connections: large enough that per-request overhead is small, small enough that a lost chunk costs seconds. S3 multipart requires parts of at least 5 MB (except the last). Go smaller on very unreliable mobile networks."
          }
        },
        {
          "@type": "Question",
          "name": "How do I show time remaining?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Compute throughput from committed bytes over a moving window of the last 10–20 seconds and divide the remaining bytes by it. Round generously (\"about 3 minutes left\") and hide the estimate for the first few seconds, when it is least accurate."
          }
        }
      ]
    }
  ]
}
</script>

# Resumable Chunked Uploads for Large Files

A single-request upload of a 2 GB video on a train fails at 93% when the connection drops, and starts again from zero — the user tries twice more and gives up; the same file sent in 8 MB chunks loses at most one chunk to each drop and resumes from where it stopped, even after the tab is closed and reopened.

The [file upload fields](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/) lifecycle treats an upload as one `uploading` state. For large files, that state needs internal structure: an upload session on the server, an offset the client and server agree on, and a loop that sends one chunk at a time, retrying individual chunks and asking the server where to resume after any interruption.

---

## Context and prerequisites

A resumable upload protocol has three operations, whatever the vendor:

1. **Create a session.** The client tells the server the file's size (and name, type, checksum if used); the server returns an upload URL or id.
2. **Send a chunk at an offset.** The client sends bytes `[offset, offset + chunkSize)`; the server appends them and returns the new offset.
3. **Query the offset.** After any failure, the client asks how many bytes the server has, and continues from there — never from its own belief.

The open **tus** protocol standardises exactly this over HTTP (`POST` to create, `PATCH` with `Upload-Offset`, `HEAD` to query). **S3 multipart uploads** use a different shape — independently uploaded numbered parts, then a complete call — with the same effect. The client code below uses the tus-style shape because it maps directly onto the three operations.

<svg viewBox="0 0 680 243" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sequence diagram of the client creating an upload session, sending chunks at increasing offsets, losing the connection mid-chunk, querying the offset, and resuming from the server&#x27;s offset." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A chunked upload that survives a dropped connection</title>
  <desc>The client creates an upload session for a 40 megabyte file and receives an upload URL. It sends the first chunk at offset zero and the server confirms offset 8 megabytes, then the second chunk, confirmed at 16 megabytes. The third chunk fails when the connection drops. After a backoff delay the client asks the server for the current offset, which is 16 megabytes because the partial chunk was not committed, and resends the third chunk from 16 megabytes, continuing to completion.</desc>
  <rect x="0" y="0" width="680" height="243" fill="#f9f5fb"/>
  <rect x="22.0" y="12.0" width="310.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="177.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Client</text>
  <rect x="348.0" y="12.0" width="310.0" height="29.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="503.0" y="30.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit" text-anchor="middle">Server</text>
  <path d="M177.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <path d="M503.0,41.0 V227.0" stroke="#cbb8d9" stroke-width="1.2" fill="none" stroke-dasharray="4 3"/>
  <text x="185.0" y="65.0" font-size="9.5" fill="#6b5f75" font-family="inherit">create: size 40 MB → upload URL</text>
  <path d="M177.0,69.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,65.0 502.0,69.0 495.0,73.0" fill="#7b4f8a"/>
  <text x="185.0" y="93.0" font-size="9.5" fill="#2d6342" font-family="inherit">PATCH offset 0 (8 MB) → offset 8 MB</text>
  <path d="M177.0,97.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,93.0 502.0,97.0 495.0,101.0" fill="#7b4f8a"/>
  <text x="185.0" y="121.0" font-size="9.5" fill="#2d6342" font-family="inherit">PATCH offset 8 MB → offset 16 MB</text>
  <path d="M177.0,125.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,121.0 502.0,125.0 495.0,129.0" fill="#7b4f8a"/>
  <text x="185.0" y="149.0" font-size="9.5" fill="#a63d6f" font-family="inherit">PATCH offset 16 MB: connection dropped</text>
  <path d="M177.0,153.0 H495.0" stroke="#a63d6f" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,149.0 502.0,153.0 495.0,157.0" fill="#7b4f8a"/>
  <text x="185.0" y="177.0" font-size="9.5" fill="#7b4f8a" font-family="inherit">HEAD after backoff → offset 16 MB</text>
  <path d="M177.0,181.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,177.0 502.0,181.0 495.0,185.0" fill="#7b4f8a"/>
  <text x="185.0" y="205.0" font-size="9.5" fill="#2d6342" font-family="inherit">PATCH offset 16 MB again → continue</text>
  <path d="M177.0,209.0 H495.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="495.0,205.0 502.0,209.0 495.0,213.0" fill="#7b4f8a"/>
</svg>

---

## The core pattern: an offset-driven chunk loop

```typescript
export interface ResumableOptions {
  createUrl: string;
  file: File;
  chunkBytes?: number;                 // 5–10 MB is a good default
  signal?: AbortSignal;
  onProgress?: (sent: number, total: number) => void;
  loadSession?: () => Promise<string | null>;   // e.g. from IndexedDB, keyed by file fingerprint
  saveSession?: (uploadUrl: string) => Promise<void>;
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); rej(signal.reason); }, { once: true });
});

export async function resumableUpload(o: ResumableOptions): Promise<string> {
  const chunk = o.chunkBytes ?? 8 * 1024 * 1024;
  const total = o.file.size;

  // 1. Reuse a saved session (reload/resume) or create a new one.
  let uploadUrl = (await o.loadSession?.()) ?? null;
  if (!uploadUrl) {
    const res = await fetch(o.createUrl, {
      method: "POST", signal: o.signal,
      headers: { "Upload-Length": String(total), "Upload-Metadata": `filename ${btoa(encodeURIComponent(o.file.name))}` },
    });
    if (!res.ok) throw new Error(`create failed: ${res.status}`);
    uploadUrl = new URL(res.headers.get("Location")!, o.createUrl).toString();
    await o.saveSession?.(uploadUrl);
  }

  // 2. Always start from the SERVER's offset, never from local belief.
  const serverOffset = async () => {
    const r = await fetch(uploadUrl!, { method: "HEAD", signal: o.signal });
    if (r.status === 404 || r.status === 410) throw new Error("session expired");
    return Number(r.headers.get("Upload-Offset") ?? 0);
  };

  let offset = await serverOffset();
  let failures = 0;
  while (offset < total) {
    try {
      // File.slice creates a view; no bytes are read until the request sends them.
      const body = o.file.slice(offset, Math.min(offset + chunk, total));
      const r = await fetch(uploadUrl, {
        method: "PATCH", body, signal: o.signal,
        headers: { "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream" },
      });
      if (r.status === 409) { offset = await serverOffset(); continue; }  // offset mismatch: resync
      if (!r.ok) throw new Error(`chunk failed: ${r.status}`);
      offset = Number(r.headers.get("Upload-Offset"));
      failures = 0;
      o.onProgress?.(offset, total);
    } catch (err) {
      if (o.signal?.aborted) throw err;
      if (++failures > 6) throw err;                       // give up; the item goes to "failed"
      await sleep(Math.min(30_000, 500 * 2 ** failures) * (0.5 + Math.random()), o.signal);
      offset = await serverOffset();                        // resync after any failure
    }
  }
  return uploadUrl;   // the server identifies the finished file by this URL/id
}
```

Progress here is chunk-granular — it advances every 8 MB. For a smoother bar within each chunk, send each chunk with the XHR helper from [upload progress and cancellation](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/upload-progress-and-cancellation/) and add its `loaded` to the committed offset.

---

## Step-by-step walkthrough

1. **Decide the threshold.** Chunk only files that are slow to upload: above roughly 20–50 MB, or anything on mobile. Small files are faster as one request.
2. **Create a session with the total size.** The server allocates storage and returns an upload URL; persist it with a fingerprint of the file (name, size, `lastModified`) so a reload can find it.
3. **Always resume from the server's offset.** After any error, `HEAD` the session and continue from what the server committed. Local counters can be wrong after a partial chunk.
4. **Retry chunks with backoff and jitter.** A failed chunk retries alone; several consecutive failures move the item to `failed` with a Retry button that resumes rather than restarts — the same retry policy as [retrying failed submissions with backoff](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/retrying-failed-submissions-with-backoff/).
5. **Resume after reload.** Store the `File` in IndexedDB alongside the session URL, following [storing large drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/); on restore, call the same function and it continues from the server's offset.
6. **Handle expiry.** Servers expire incomplete sessions. A 404 or 410 on `HEAD` means start over with a new session — tell the user the upload restarted.

<svg viewBox="0 0 680 102" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing the bytes that must be re-sent after a connection drop at 93 percent of a 2 gigabyte upload, for a single request versus 8 megabyte chunks." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Bytes re-sent after one connection drop at 93%</title>
  <desc>Worked arithmetic for a 2 gigabyte file with the connection dropping at 93 percent. A single-request upload must re-send the whole file, about 2048 megabytes. With 8 megabyte chunks, at most the one in-flight chunk is lost, so at most 8 megabytes are re-sent.</desc>
  <rect x="0" y="0" width="680" height="102" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="64.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">single request</text>
  <rect x="204.0" y="16.0" width="352.0" height="14" rx="3" fill="#a63d6f"/>
  <text x="564.0" y="26.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">2048 MB</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">8 MB chunks</text>
  <rect x="204.0" y="42.0" width="2.0" height="14" rx="3" fill="#2d6342"/>
  <text x="214.0" y="52.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">≤ 8 MB</text>
  <text x="14.0" y="90.0" font-size="10" fill="#6b5f75" font-family="inherit">Arithmetic, not a benchmark: the chunk size bounds the cost of any single failure.</text>
</svg>

---

## Failure modes and edge cases

### 1. Trusting the local offset

If a chunk's response is lost after the server committed it, the client believes the offset is lower than it is and re-sends — and the server rejects with 409 or, worse, appends twice. Always resync with `HEAD` after an error, and let the server reject mismatched offsets.

### 2. The file changed on disk

A user may edit and re-save a file between sessions. Store `size` and `lastModified` with the session, and if they differ on resume, discard the session and start again; optionally compute a hash of the first and last chunks to be sure.

### 3. Chunk size and proxies

Some proxies and serverless platforms cap request bodies (often a few MB to tens of MB). Choose a chunk size below the smallest limit on the path, and make it configurable per environment.

### 4. Parallel chunks

S3-style multipart allows uploading parts in parallel, which improves throughput on fast links. tus-style offset protocols are sequential by design (there is a concatenation extension for parallel partial uploads). Parallelism complicates resume bookkeeping; add it only when measurements show single-stream throughput is the bottleneck.

### 5. Completing the form before the upload finishes

A 2 GB upload may outlast the rest of the form. Let the user submit; the form sends a reference to the upload session and the server links the file when the upload completes — or, simpler, keep the submit gated and show clear remaining-time progress. Either way, never submit a reference to an upload the server has not finished.

<svg viewBox="0 0 680 113" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three cards describing what must be persisted to resume an upload after the page reloads — the file itself, the session URL, and a fingerprint of the file." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What to persist to resume after a reload</title>
  <desc>The file itself must be stored in IndexedDB as a File or Blob, because the browser cannot reopen the original file from disk without the user picking it again. The upload session URL must be stored so the client can ask the server for the committed offset. A fingerprint of name, size and last-modified time must be stored so a changed file is detected and not resumed onto the wrong session.</desc>
  <rect x="0" y="0" width="680" height="113" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">The File</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">In IndexedDB.</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The page cannot reopen it from disk</text>
  <text x="26.0" y="82.0" font-size="9.5" fill="#6b5f75" font-family="inherit">without the user.</text>
  <rect x="236.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="248.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">The session URL</text>
  <text x="248.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Where to HEAD for the offset.</text>
  <rect x="458.0" y="12.0" width="208.0" height="85.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="470.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">A fingerprint</text>
  <text x="470.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">name + size + lastModified.</text>
  <text x="470.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Mismatch → start over.</text>
</svg>

---

## Verification checklist

- [ ] Killing the network mid-upload and restoring it resumes from the last committed chunk.
- [ ] Reloading the page during an upload resumes after restore without re-sending committed bytes.
- [ ] After any error the client resyncs its offset from the server before continuing.
- [ ] A 409 offset mismatch is resolved by resync, not by failure.
- [ ] An expired session starts a new upload and tells the user.
- [ ] A modified file is not resumed onto its old session.
- [ ] Chunk size is below every body-size limit between client and storage.
- [ ] Cancel aborts the in-flight chunk and stops the loop.

---

## Frequently Asked Questions

<details>
<summary><strong>Should I use tus or S3 multipart?</strong></summary>

Use whatever your storage supports natively. tus has mature client and server libraries and a simple offset model; S3-compatible storage supports multipart directly with presigned part URLs, so the browser can upload to storage without your servers carrying the bytes. The client logic is similar: track committed parts or offsets, retry individually, and complete at the end.

</details>

<details>
<summary><strong>What chunk size should I use?</strong></summary>

Between 5 and 10 MB works well for most connections: large enough that per-request overhead is small, small enough that a lost chunk costs seconds. S3 multipart requires parts of at least 5 MB (except the last). Go smaller on very unreliable mobile networks.

</details>

<details>
<summary><strong>How do I show time remaining?</strong></summary>

Compute throughput from committed bytes over a moving window of the last 10–20 seconds and divide the remaining bytes by it. Round generously ("about 3 minutes left") and hide the estimate for the first few seconds, when it is least accurate.

</details>

---

## Related

- [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
- [Queueing Form Submissions While Offline](https://www.client-side-form.com/form-state-fundamentals-architecture/submission-state-and-optimistic-updates/queueing-form-submissions-while-offline/)
- [Upload Progress and Cancellation With XHR and Fetch](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/upload-progress-and-cancellation/)

← [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
