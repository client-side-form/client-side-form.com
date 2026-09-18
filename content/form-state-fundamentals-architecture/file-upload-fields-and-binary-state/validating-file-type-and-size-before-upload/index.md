---
layout: page.njk
title: "Validating File Type and Size Before Upload"
description: "Reject oversized and wrong-type files the moment they are chosen: check size, declared type and extension, sniff magic bytes to catch renamed files, read image dimensions, and write messages that name the file and the limit."
slug: validating-file-type-and-size-before-upload
type: howto
breadcrumb: "File Type & Size Checks"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Validating File Type and Size Before Upload"
  parent: "File Upload Fields and Binary State"
  order: 1
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Validating File Type and Size Before Upload",
      "description": "Reject oversized and wrong-type files the moment they are chosen: check size, declared type and extension, sniff magic bytes to catch renamed files, read image dimensions, and write messages that name the file and the limit.",
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
          "name": "Validating File Type and Size Before Upload",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/validating-file-type-and-size-before-upload/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Validate file type, size and content before uploading",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Set accept for the picker, but do not rely on it"
        },
        {
          "@type": "HowToStep",
          "name": "Check size before reading anything"
        },
        {
          "@type": "HowToStep",
          "name": "Check the extension against an allow-list"
        },
        {
          "@type": "HowToStep",
          "name": "Read the first bytes and match signatures"
        },
        {
          "@type": "HowToStep",
          "name": "Decode image headers only when dimensions matter"
        },
        {
          "@type": "HowToStep",
          "name": "Return one specific message naming the file"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is checking magic bytes a security measure?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is a usability measure that happens to stop accidental mistakes. A malicious user controls the bytes and can bypass your JavaScript altogether. The server must validate content again, ideally by decoding the file in a sandbox, as the file upload fields topic describes."
          }
        },
        {
          "@type": "Question",
          "name": "Should size limits use 1000 or 1024?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use the same base the server enforces and display the limit in the same unit, so \"20 MB\" means the same number on both sides. Operating systems disagree (macOS shows decimal megabytes, Windows binary), so a message that says \"31 MB, limit 20 MB\" is clear even if the user's file manager shows a slightly different figure."
          }
        },
        {
          "@type": "Question",
          "name": "Can I compress images on the client instead of rejecting them?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, and for avatars and photos it is often kinder: draw the image to a canvas at a smaller size and export it with canvas.toBlob(cb, \"image/jpeg\", 0.85). Tell the user it was resized, and keep the original if the resized version is still too large."
          }
        }
      ]
    }
  ]
}
</script>

# Validating File Type and Size Before Upload

A size or type limit enforced only by the server is discovered after the upload — which for a 150 MB phone video on a mobile connection means minutes of waiting followed by "File too large", and for a `.pdf` that is really a renamed Word document means a confusing processing failure an hour later.

The [file upload fields](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/) lifecycle puts local validation between `selected` and `uploading`. Everything about a file that matters for acceptance — its size, its real format, an image's pixel dimensions — can be read locally in milliseconds. This page implements those checks in order of cost, with messages that tell the user exactly which file failed and what to do.

---

## Context and prerequisites

Three sources of type information exist, with very different reliability:

- **The `accept` attribute** on the input filters the file picker. It is a hint to the picker, not a validation: users can switch the picker to "All files", and drag-and-drop ignores it entirely.
- **`file.type`** is the MIME type the browser *guessed from the file name extension* (and the operating system's registry). A file renamed from `.docx` to `.pdf` reports `application/pdf`. Some files report an empty string.
- **The first bytes of the file** — its "magic number" — identify most formats reliably: `%PDF-` for PDF, `89 50 4E 47` for PNG, `FF D8 FF` for JPEG, `50 4B 03 04` for ZIP-based formats (including DOCX and XLSX).

Size is exact (`file.size` in bytes) and free. Image dimensions require decoding the header, which `createImageBitmap` does quickly without drawing anything. Run the checks cheapest first and stop at the first failure.

<svg viewBox="0 0 680 154" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Horizontal bar chart comparing the relative cost of file checks in order — reading file.size, comparing the extension and declared type, reading the first 16 bytes for a signature, and decoding image dimensions." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Cost of each check on a 12 MB photo</title>
  <desc>Reading file.size and comparing extension and declared type are effectively free because they read metadata only. Reading the first sixteen bytes to check the signature requires one small asynchronous read. Decoding the image header with createImageBitmap to get dimensions is the most expensive step, and is still fast compared with uploading. The ordering runs the cheap checks first and stops at the first failure.</desc>
  <rect x="0" y="0" width="680" height="154" fill="#f9f5fb"/>
  <rect x="10.0" y="4.0" width="660.0" height="116.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1"/>
  <text x="20.0" y="25.5" font-size="10" fill="#1e1a24" font-family="inherit">file.size</text>
  <rect x="204.0" y="16.0" width="17.6" height="14" rx="3" fill="#2d6342"/>
  <text x="229.6" y="26.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">metadata only</text>
  <text x="20.0" y="51.5" font-size="10" fill="#1e1a24" font-family="inherit">extension + file.type</text>
  <rect x="204.0" y="42.0" width="26.4" height="14" rx="3" fill="#2d6342"/>
  <text x="238.4" y="52.5" font-size="9.5" font-weight="700" fill="#2d6342" font-family="inherit">metadata only</text>
  <text x="20.0" y="77.5" font-size="10" fill="#1e1a24" font-family="inherit">first 16 bytes (signature)</text>
  <rect x="204.0" y="68.0" width="105.6" height="14" rx="3" fill="#7b4f8a"/>
  <text x="317.6" y="78.5" font-size="9.5" font-weight="700" fill="#7b4f8a" font-family="inherit">one tiny read</text>
  <text x="20.0" y="103.5" font-size="10" fill="#1e1a24" font-family="inherit">image dimensions</text>
  <rect x="204.0" y="94.0" width="308.0" height="14" rx="3" fill="#b07a55"/>
  <text x="520.0" y="104.5" font-size="9.5" font-weight="700" fill="#1e1a24" font-family="inherit">header decode</text>
  <text x="14.0" y="142.0" font-size="10" fill="#6b5f75" font-family="inherit">Relative ordering, not measured timings: all four together are negligible next to even a second of upload.</text>
</svg>

---

## The core pattern: ordered checks returning a specific reason

```typescript
export interface FileRules {
  maxBytes: number;
  types: { mime: string; ext: string[]; magic: number[][] }[];   // allowed formats
  image?: { minWidth?: number; minHeight?: number; maxPixels?: number };
}

export const PDF = { mime: "application/pdf", ext: [".pdf"], magic: [[0x25, 0x50, 0x44, 0x46, 0x2d]] };
export const PNG = { mime: "image/png", ext: [".png"], magic: [[0x89, 0x50, 0x4e, 0x47]] };
export const JPEG = { mime: "image/jpeg", ext: [".jpg", ".jpeg"], magic: [[0xff, 0xd8, 0xff]] };

const fmtBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.ceil(n / 1024)} KB`;

export async function checkFile(file: File, rules: FileRules): Promise<string | null> {
  // 1. Size: exact and free. Check first so a huge file is never read.
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > rules.maxBytes) {
    return `${file.name} is ${fmtBytes(file.size)}. Files must be ${fmtBytes(rules.maxBytes)} or smaller.`;
  }

  // 2. Extension and declared type: cheap, catches most honest mistakes.
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const byExt = rules.types.find((t) => t.ext.includes(ext));
  const allowedList = rules.types.map((t) => t.ext[0].slice(1).toUpperCase()).join(", ");
  if (!byExt) return `${file.name} is not a supported file type. Use ${allowedList}.`;

  // 3. Signature: read only the first bytes; slice() does not load the file.
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = (sig: number[]) => sig.every((b, i) => head[i] === b);
  if (!byExt.magic.some(matches)) {
    return `${file.name} does not look like a ${byExt.ext[0].slice(1).toUpperCase()} file. It may have been renamed; open and re-save it, then try again.`;
  }

  // 4. Image dimensions: decode the header only when rules ask for it.
  if (rules.image && byExt.mime.startsWith("image/")) {
    let bmp: ImageBitmap | undefined;
    try {
      bmp = await createImageBitmap(file);
      const { width, height } = bmp;
      const r = rules.image;
      if ((r.minWidth && width < r.minWidth) || (r.minHeight && height < r.minHeight)) {
        return `${file.name} is ${width}×${height} pixels. Images must be at least ${r.minWidth ?? 0}×${r.minHeight ?? 0}.`;
      }
      if (r.maxPixels && width * height > r.maxPixels) {
        return `${file.name} is too large in dimensions (${width}×${height}). Resize it and try again.`;
      }
    } catch {
      return `${file.name} could not be read as an image. It may be damaged.`;
    } finally {
      bmp?.close();   // release decoded memory immediately
    }
  }
  return null;
}
```

---

## Step-by-step walkthrough

1. **Set `accept` for the picker, but do not rely on it.** `accept=".pdf,image/png,image/jpeg"` narrows the default view; drag-and-drop and "All files" bypass it, so the same rules run in code.
2. **Check size before reading anything.** `file.size` is exact and costs nothing; a 2 GB file should be rejected before a single byte is read.
3. **Check the extension against an allow-list.** This catches the common mistake (a `.heic` photo where JPEG is needed) with a message that lists what *is* accepted.
4. **Read the first bytes and match signatures.** `file.slice(0, 16)` creates a view without loading the file; `arrayBuffer()` on the slice reads 16 bytes.
5. **Decode image headers only when dimensions matter.** `createImageBitmap` is fast and off-main-thread in most browsers; always `close()` the bitmap.
6. **Return one specific message naming the file.** "photo.heic is not a supported file type. Use PDF, PNG, JPG." Put it on the file's item in the list, and in the error summary, following [writing error messages that tell the reader what to do](https://www.client-side-form.com/accessibility-and-error-ux/error-summary-and-messaging/writing-error-messages-that-tell-the-reader-what-to-do/).

<svg viewBox="0 0 680 235" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Table of common upload formats with their extensions, the declared MIME type and the leading bytes that identify them." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>File signatures worth checking</title>
  <desc>PDF files start with the bytes for percent PDF dash. PNG files start with hex 89 followed by PNG. JPEG files start with FF D8 FF. GIF files start with GIF87a or GIF89a. DOCX and XLSX files are ZIP archives and start with PK followed by 03 04, so a signature check confirms ZIP but not which Office format. WebP files start with RIFF and have WEBP at offset eight.</desc>
  <rect x="0" y="0" width="680" height="235" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="652.0" height="207.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <rect x="14.0" y="12.0" width="652.0" height="30.0" rx="8" fill="#e2d6ec"/>
  <rect x="14.0" y="34.0" width="652.0" height="8.0" rx="0" fill="#e2d6ec"/>
  <text x="24.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Format</text>
  <text x="187.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Extension</text>
  <text x="350.0" y="32.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Leading bytes</text>
  <text x="24.0" y="61.5" font-size="9.5" fill="#1e1a24" font-family="inherit">PDF</text>
  <text x="187.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.pdf</text>
  <text x="350.0" y="61.5" font-size="9.5" fill="#6b5f75" font-family="inherit">25 50 44 46 2D (%PDF-)</text>
  <line x1="14" y1="71.5" x2="666" y2="71.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="91.0" font-size="9.5" fill="#1e1a24" font-family="inherit">PNG</text>
  <text x="187.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">.png</text>
  <text x="350.0" y="91.0" font-size="9.5" fill="#6b5f75" font-family="inherit">89 50 4E 47 0D 0A 1A 0A</text>
  <line x1="14" y1="101.0" x2="666" y2="101.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="120.5" font-size="9.5" fill="#1e1a24" font-family="inherit">JPEG</text>
  <text x="187.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.jpg .jpeg</text>
  <text x="350.0" y="120.5" font-size="9.5" fill="#6b5f75" font-family="inherit">FF D8 FF</text>
  <line x1="14" y1="130.5" x2="666" y2="130.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="150.0" font-size="9.5" fill="#1e1a24" font-family="inherit">GIF</text>
  <text x="187.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">.gif</text>
  <text x="350.0" y="150.0" font-size="9.5" fill="#6b5f75" font-family="inherit">47 49 46 38 37|39 61 (GIF87a / GIF89a)</text>
  <line x1="14" y1="160.0" x2="666" y2="160.0" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="179.5" font-size="9.5" fill="#1e1a24" font-family="inherit">DOCX / XLSX</text>
  <text x="187.0" y="179.5" font-size="9.5" fill="#6b5f75" font-family="inherit">.docx .xlsx</text>
  <text x="350.0" y="179.5" font-size="9.5" fill="#7b4f8a" font-family="inherit">50 4B 03 04 (ZIP; format not distinguished)</text>
  <line x1="14" y1="189.5" x2="666" y2="189.5" stroke="#cbb8d9" stroke-width="1"/>
  <text x="24.0" y="209.0" font-size="9.5" fill="#1e1a24" font-family="inherit">WebP</text>
  <text x="187.0" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">.webp</text>
  <text x="350.0" y="209.0" font-size="9.5" fill="#6b5f75" font-family="inherit">52 49 46 46 … 57 45 42 50 at offset 8</text>
</svg>

---

## Failure modes and edge cases

### 1. `file.type` is empty

Files with unusual extensions, and some files from cloud-storage pickers, report `type === ""`. Do not reject on an empty type; rely on the extension and signature instead.

### 2. HEIC photos from iPhones

iOS may convert HEIC to JPEG when a web page's `accept` lists only JPEG, but not in every picker path, and files transferred to a desktop stay HEIC. Either accept HEIC and convert server-side, or reject with a message that explains how to export as JPEG.

### 3. Multiple files, one failure

When five files are dropped and one fails, keep the four that pass and show the one failure on its own item. Rejecting the whole drop makes the user re-select four good files.

### 4. The same message for every limit

"Invalid file" tells the user nothing. Size, type, damage and dimensions each need their own sentence, and each should include the actual value and the limit, so the user knows how far off they are.

### 5. Validation that blocks the main thread

Reading a whole large file with `FileReader.readAsDataURL` to "check" it can freeze the page and multiply memory use. Read only the bytes you need with `slice`, and never base64-encode a file just to validate it — previews are covered in [image previews with object URLs without leaks](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/image-previews-with-object-urls-without-leaks/).

<svg viewBox="0 0 680 413" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow of file checks in order of cost — size, extension, signature and image dimensions — each producing a specific message on failure, ending in accepted." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>The check order, stopping at the first failure</title>
  <desc>If the file is empty or over the size limit, reject it with its actual size and the limit. If its extension is not in the allow-list, reject it listing the accepted types. If its leading bytes do not match the expected signature, reject it saying it may have been renamed. If it is an image and its dimensions are outside the rules, reject it with its dimensions and the requirement. Otherwise accept it and start the upload.</desc>
  <rect x="0" y="0" width="680" height="413" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Size: empty or over the limit?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;report.pdf is 31 MB. Files must be 20 MB or smaller.&quot;</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Extension not in the allow-list?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;photo.heic is not supported. Use PDF, PNG, JPG.&quot;</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="162.0" width="270.0" height="56.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="193.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Signature does not match?</text>
  <rect x="340.0" y="162.0" width="326.0" height="56.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;scan.pdf does not look like a PDF. It may have been</text>
  <text x="352.0" y="200.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">renamed.&quot;</text>
  <path d="M284.0,190.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,186.0 339.0,190.0 332.0,194.0" fill="#7b4f8a"/>
  <text x="312.0" y="184.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,218.0 V244.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,244.0 149.0,251.0 153.0,244.0" fill="#7b4f8a"/>
  <text x="159.0" y="236.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="252.0" width="270.0" height="56.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="283.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Image dimensions outside the rules?</text>
  <rect x="340.0" y="252.0" width="326.0" height="56.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="275.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">&quot;avatar.png is 64×64. Images must be at least</text>
  <text x="352.0" y="290.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">200×200.&quot;</text>
  <path d="M284.0,280.0 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,276.0 339.0,280.0 332.0,284.0" fill="#7b4f8a"/>
  <text x="312.0" y="274.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">fails</text>
  <path d="M149.0,308.0 V334.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,334.0 149.0,341.0 153.0,334.0" fill="#7b4f8a"/>
  <text x="159.0" y="326.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">passes</text>
  <rect x="14.0" y="342.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="365.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Accept and upload</text>
  <text x="26.0" y="383.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Move to uploading.</text>
</svg>

---

## Verification checklist

- [ ] A file one byte over the limit is rejected before any network request, with its size and the limit.
- [ ] Dragging a file of the wrong type onto the field is rejected even though the picker's `accept` would have hidden it.
- [ ] A PNG renamed to `.pdf` is rejected with the "may have been renamed" message.
- [ ] Files with an empty `file.type` are judged by extension and signature, not rejected outright.
- [ ] An image below the minimum dimensions reports its actual size.
- [ ] When several files are chosen, valid ones proceed and each invalid one shows its own message.
- [ ] No check reads more than the bytes it needs; the page stays responsive with very large files.
- [ ] The server enforces the same limits and its rejections use the same wording.

---

## Frequently Asked Questions

<details>
<summary><strong>Is checking magic bytes a security measure?</strong></summary>

It is a usability measure that happens to stop accidental mistakes. A malicious user controls the bytes and can bypass your JavaScript altogether. The server must validate content again, ideally by decoding the file in a sandbox, as the [file upload fields](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/) topic describes.

</details>

<details>
<summary><strong>Should size limits use 1000 or 1024?</strong></summary>

Use the same base the server enforces and display the limit in the same unit, so "20 MB" means the same number on both sides. Operating systems disagree (macOS shows decimal megabytes, Windows binary), so a message that says "31 MB, limit 20 MB" is clear even if the user's file manager shows a slightly different figure.

</details>

<details>
<summary><strong>Can I compress images on the client instead of rejecting them?</strong></summary>

Yes, and for avatars and photos it is often kinder: draw the image to a canvas at a smaller size and export it with `canvas.toBlob(cb, "image/jpeg", 0.85)`. Tell the user it was resized, and keep the original if the resized version is still too large.

</details>

---

## Related

- [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
- [Upload Progress and Cancellation With XHR and Fetch](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/upload-progress-and-cancellation/)
- [Mapping Validation Errors to UI Components](https://www.client-side-form.com/form-state-fundamentals-architecture/error-state-mapping-patterns/mapping-validation-errors-to-ui-components/)

← [File Upload Fields and Binary State](https://www.client-side-form.com/form-state-fundamentals-architecture/file-upload-fields-and-binary-state/)
