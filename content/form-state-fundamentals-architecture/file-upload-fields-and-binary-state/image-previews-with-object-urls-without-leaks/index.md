---
layout: page.njk
title: "Image Previews With Object URLs Without Leaks"
description: "Show instant previews of selected images with URL.createObjectURL instead of base64 data URLs, and revoke every URL at the right moment — on remove, replace, unmount and undo — so a photo-heavy form does not hold hundreds of megabytes."
slug: image-previews-with-object-urls-without-leaks
type: howto
breadcrumb: "Object URL Previews"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Image Previews With Object URLs Without Leaks"
  parent: "File Upload Fields and Binary State"
  order: 3
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Image Previews With Object URLs Without Leaks",
      "description": "Show instant previews of selected images with URL.createObjectURL instead of base64 data URLs, and revoke every URL at the right moment — on remove, replace, unmount and undo — so a photo-heavy form does not hold hundreds of megabytes.",
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
          "name": "Image Previews With Object URLs Without Leaks",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/image-previews-with-object-urls-without-leaks/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Show image previews with object URLs and revoke them correctly",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Create URLs through one owner"
        },
        {
          "@type": "HowToStep",
          "name": "Make creation idempotent"
        },
        {
          "@type": "HowToStep",
          "name": "Revoke on replace"
        },
        {
          "@type": "HowToStep",
          "name": "Revoke on remove — unless undo is pending"
        },
        {
          "@type": "HowToStep",
          "name": "Dispose on unmount"
        },
        {
          "@type": "HowToStep",
          "name": "Write useful alt text"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do object URLs leak across page loads?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Object URLs are scoped to the document that created them and are all released when it unloads. The leak is within a long-lived page — a single-page app where users stay for an hour adding and removing files."
          }
        },
        {
          "@type": "Question",
          "name": "Can I send an object URL to the server or store it in a draft?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. A blob: URL is meaningful only inside the document that created it. Store and send the File itself (or the server id after upload), and create a new object URL whenever a preview is needed."
          }
        },
        {
          "@type": "Question",
          "name": "Are object URLs safe to use in img src under a strict CSP?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Only if your Content Security Policy allows blob: in img-src. Add img-src 'self' blob: for previews; you do not need to allow data: if you avoid data URLs."
          }
        }
      ]
    }
  ]
}
</script>

# Image Previews With Object URLs Without Leaks

Previewing a selected image with `FileReader.readAsDataURL` copies the whole file into a base64 string a third larger than the original, on the main thread, and keeps it alive as long as any `<img>` or state references it — a form where users pick twenty 8 MB phone photos can easily hold several hundred megabytes of strings.

`URL.createObjectURL(file)` is the better tool: it returns a short `blob:` URL that points at the file without copying it, instantly. Its one cost is ownership — the browser keeps the file's data alive until you call `URL.revokeObjectURL`, or the page unloads. In a [file upload field](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/) where files are added, replaced and removed, every one of those events must revoke exactly the URLs it no longer needs.

---

## Context and prerequisites

The two approaches compared:

- **Data URL** (`FileReader.readAsDataURL`): asynchronous read of the entire file, base64 encoding (+33% size), the string lives in JavaScript memory and can be stored, serialised or sent anywhere. Garbage-collected when unreferenced.
- **Object URL** (`URL.createObjectURL`): synchronous, constant time, no copy. The URL is only valid in the current document. The underlying data is kept alive by the URL registry until revoked — *not* garbage-collected when your code forgets the string.

That last point is the leak. Removing the `<img>` from the DOM and dropping the string from state does nothing; only `revokeObjectURL` releases it. And revoking too early breaks the preview (the image shows as broken if it has not finished decoding, and any later re-render with the same URL fails).

<svg viewBox="0 0 680 176" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of data URLs and object URLs for image previews across creation cost, memory, lifetime and the mistake that leaks or breaks each." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Data URL and object URL for previews</title>
  <desc>A data URL is created by reading and base64-encoding the whole file, uses about one and a third times the file size in string memory, lives as long as any reference, and is freed by the garbage collector. An object URL is created instantly without copying, adds no copy of the data, lives until revokeObjectURL or page unload, and leaks if never revoked or breaks if revoked while still displayed.</desc>
  <rect x="0" y="0" width="680" height="176" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="148.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Aspect</text>
  <text x="174.5" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Data URL</text>
  <text x="425.2" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Object URL</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Create</text>
  <text x="174.5" y="61.5" font-size="9.5" fill="#a63d6f" font-family="inherit">read + encode whole file</text>
  <text x="425.2" y="61.5" font-size="9.5" fill="#2d6342" font-family="inherit">instant, no copy</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Memory</text>
  <text x="174.5" y="91.0" font-size="9.5" fill="#a63d6f" font-family="inherit">about 1.33× file size as a string</text>
  <text x="425.2" y="91.0" font-size="9.5" fill="#2d6342" font-family="inherit">references the original data</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">Freed when</text>
  <text x="174.5" y="120.5" font-size="9.5" fill="#2d6342" font-family="inherit">unreferenced (GC)</text>
  <text x="425.2" y="120.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">revokeObjectURL or page unload</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">Typical bug</text>
  <text x="174.5" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">slow and memory-heavy</text>
  <text x="425.2" y="150.0" font-size="9.5" fill="#a63d6f" font-family="inherit">never revoked, or revoked too early</text>
</svg>

---

## The core pattern: a preview registry that owns its URLs

```typescript
/**
 * Owns every object URL a file field creates. One URL per item id; creating
 * a new URL for an id revokes the old one; disposing revokes everything.
 */
export class PreviewRegistry {
  private urls = new Map<string, string>();

  urlFor(itemId: string, file: Blob): string {
    const existing = this.urls.get(itemId);
    if (existing) return existing;               // idempotent: re-renders reuse the URL
    const url = URL.createObjectURL(file);
    this.urls.set(itemId, url);
    return url;
  }

  replace(itemId: string, file: Blob): string {
    this.release(itemId);                         // revoke the previous file's URL first
    return this.urlFor(itemId, file);
  }

  release(itemId: string): void {
    const url = this.urls.get(itemId);
    if (!url) return;
    URL.revokeObjectURL(url);
    this.urls.delete(itemId);
  }

  /** Revoke everything except ids still in use (e.g. after a list change). */
  retainOnly(liveIds: Iterable<string>): void {
    const keep = new Set(liveIds);
    for (const id of [...this.urls.keys()]) if (!keep.has(id)) this.release(id);
  }

  dispose(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
```

```tsx
// React: one registry per field, disposed on unmount.
function FilePreviews({ items }: { items: { id: string; file: File }[] }) {
  const registry = useMemo(() => new PreviewRegistry(), []);
  useEffect(() => () => registry.dispose(), [registry]);
  // After every list change, drop URLs for items that are gone.
  useEffect(() => { registry.retainOnly(items.map((i) => i.id)); }, [items, registry]);
  return (
    <ul>
      {items.filter((i) => i.file.type.startsWith("image/")).map((i) => (
        <li key={i.id}><img src={registry.urlFor(i.id, i.file)} alt={`Preview of ${i.file.name}`} width={96} /></li>
      ))}
    </ul>
  );
}
```

---

## Step-by-step walkthrough

1. **Create URLs through one owner.** A registry keyed by item id guarantees at most one live URL per item and gives you a single place to revoke from.
2. **Make creation idempotent.** Components re-render; calling `createObjectURL` in render without caching creates a new URL — and a new leak — on every render.
3. **Revoke on replace.** When a single-file field gets a new file, the old file's URL is released before the new one is created.
4. **Revoke on remove — unless undo is pending.** If removal is undoable, as in [undoing row deletion in repeatable groups](https://www.client-side-form.com/form-state-fundamentals-architecture/dynamic-field-arrays-and-repeatable-groups/undoing-row-deletion-in-repeatable-groups/), keep the URL until the removal expires so a restored item's preview still works.
5. **Dispose on unmount.** Everything the field created is revoked when the field goes away.
6. **Write useful `alt` text.** "Preview of receipt-march.jpg" identifies which file the image represents; an empty `alt` hides the preview from screen-reader users who may want to confirm they picked the right photo.

<svg viewBox="0 0 680 425" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vertical list of file field events — add, re-render, replace, remove with undo, undo expiry and unmount — with what each does to object URLs." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Every event that must touch the registry</title>
  <desc>When a file is added, a URL is created for its item id. When the component re-renders, the existing URL is reused rather than creating a new one. When the file in a single-file field is replaced, the old URL is revoked and a new one created. When an item is removed with undo pending, its URL is kept. When the undo window expires, its URL is revoked. When the field unmounts, every remaining URL is revoked.</desc>
  <rect x="0" y="0" width="680" height="425" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Add</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">createObjectURL for the item id.</text>
  <text x="466.0" y="34.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Instant; no copy of the file.</text>
  <path d="M225.0,69.0 V89.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,89.0 225.0,96.0 229.0,89.0" fill="#7b4f8a"/>
  <rect x="14.0" y="97.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="120.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Re-render</text>
  <text x="26.0" y="139.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Reuse the cached URL.</text>
  <text x="466.0" y="119.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Never create in render without the cache.</text>
  <path d="M225.0,154.0 V174.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,174.0 225.0,181.0 229.0,174.0" fill="#7b4f8a"/>
  <rect x="14.0" y="182.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="205.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">Replace</text>
  <text x="26.0" y="224.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Revoke old, create new.</text>
  <text x="466.0" y="204.0" font-size="9.5" fill="#6b5f75" font-family="inherit">The old file&#x27;s data is released immediately.</text>
  <path d="M225.0,239.0 V259.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,259.0 225.0,266.0 229.0,259.0" fill="#7b4f8a"/>
  <rect x="14.0" y="267.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#b07a55" stroke-width="1.5"/>
  <text x="26.0" y="290.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Remove / undo expires</text>
  <text x="26.0" y="309.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Keep while undo is possible, then revoke.</text>
  <text x="466.0" y="289.0" font-size="9.5" fill="#6b5f75" font-family="inherit">A restored item&#x27;s preview must still work.</text>
  <path d="M225.0,324.0 V344.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="221.0,344.0 225.0,351.0 229.0,344.0" fill="#7b4f8a"/>
  <rect x="14.0" y="352.0" width="422.0" height="57.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="26.0" y="375.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Unmount</text>
  <text x="26.0" y="394.0" font-size="9.5" fill="#6b5f75" font-family="inherit">dispose(): revoke everything.</text>
  <text x="466.0" y="374.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Nothing outlives the field.</text>
</svg>

---

## Failure modes and edge cases

### 1. Creating URLs in render

`<img src={URL.createObjectURL(file)} />` creates a fresh URL on every render and never revokes any. In a form that re-renders per keystroke, that is a new registry entry per keystroke per image.

### 2. Revoking in `onload`

A common "fix" is revoking the URL as soon as the image loads. That works for a one-shot display but breaks when the component re-renders and the `<img>` needs the URL again, or when the image is shown in two places (thumbnail and lightbox). Revoke on ownership events, not on load.

### 3. Strict Mode and effects

React Strict Mode runs effect cleanups and re-runs effects in development. A registry created with `useMemo` survives, and `dispose` in cleanup followed by `urlFor` in the next render re-creates URLs lazily — which is why `urlFor` is called during render rather than in an effect.

### 4. Large images decoded at full size

A 48-megapixel photo previewed at 96 pixels wide still decodes at full resolution unless you downscale. For grids of many photos, create a thumbnail with `createImageBitmap(file, { resizeWidth: 192 })` and draw it to a canvas, or `decode` it at a smaller size, and preview that instead.

### 5. Previews for restored drafts

Files restored from IndexedDB come back as `File` or `Blob` objects, so previews work the same way. Files restored as server ids (already uploaded) need a server URL for the preview instead; do not try to create object URLs from ids. See [storing large drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/).

<svg viewBox="0 0 680 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing memory still held after a user picks and then removes twenty 8 megabyte photos, for data URL previews still referenced, object URLs never revoked, and object URLs revoked on remove." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Memory held after picking and removing 20 photos</title>
  <desc>Worked arithmetic for twenty photos of 8 megabytes each. Data URL previews still referenced from state hold about 213 megabytes of base64 strings. Object URLs that were never revoked hold the original 160 megabytes of file data until the page unloads. Object URLs revoked on remove hold nothing once the photos are removed.</desc>
  <rect x="0" y="0" width="680" height="128" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="90.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">data URLs still referenced</text>
  <rect x="204.0" y="16.0" width="340.8" height="14" rx="3" fill="#a63d6f"/>
  <text x="552.8" y="26.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">213 MB</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">object URLs never revoked</text>
  <rect x="204.0" y="42.0" width="256.0" height="14" rx="3" fill="#a63d6f"/>
  <text x="468.0" y="52.5" font-size="9.5" font-weight="700" fill="#a63d6f" font-family="inherit">160 MB</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">object URLs revoked on remove</text>
  <rect x="204.0" y="68.0" width="2.0" height="14" rx="3" fill="#2d6342"/>
  <text x="214.0" y="78.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">0 MB</text>
  <text x="14.0" y="116.0" font-size="10" fill="#6b5f75" font-family="inherit">Arithmetic, not a measurement: 20 × 8 MB = 160 MB of file data; base64 adds a third, about 213 MB.</text>
</svg>

---

## Verification checklist

- [ ] Previews appear instantly on selection, even for large photos.
- [ ] Re-rendering the form does not create new `blob:` URLs (check with a counter in development).
- [ ] Replacing the file in a single-file field revokes the previous URL.
- [ ] Removing an item revokes its URL once undo is no longer possible.
- [ ] Unmounting the field revokes every URL it created.
- [ ] A heap snapshot after adding and removing twenty photos shows no retained Blob data.
- [ ] Every preview image has `alt` text naming its file.
- [ ] Previews in large grids use downscaled thumbnails.

---

## Frequently Asked Questions

<details>
<summary><strong>Do object URLs leak across page loads?</strong></summary>

No. Object URLs are scoped to the document that created them and are all released when it unloads. The leak is within a long-lived page — a single-page app where users stay for an hour adding and removing files.

</details>

<details>
<summary><strong>Can I send an object URL to the server or store it in a draft?</strong></summary>

No. A `blob:` URL is meaningful only inside the document that created it. Store and send the `File` itself (or the server id after upload), and create a new object URL whenever a preview is needed.

</details>

<details>
<summary><strong>Are object URLs safe to use in img src under a strict CSP?</strong></summary>

Only if your Content Security Policy allows `blob:` in `img-src`. Add `img-src 'self' blob:` for previews; you do not need to allow `data:` if you avoid data URLs.

</details>

---

## Related

- [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
- [Validating File Type and Size Before Upload](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/validating-file-type-and-size-before-upload/)
- [Rendering 100-Plus Field Forms Without Jank](https://www.client-side-form.com/form-state-fundamentals-architecture/performance-and-scale-for-large-forms/rendering-100-plus-field-forms-without-jank/)

← [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
