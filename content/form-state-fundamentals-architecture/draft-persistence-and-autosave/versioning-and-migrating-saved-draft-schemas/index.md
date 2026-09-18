---
layout: page.njk
title: "Versioning and Migrating Saved Draft Schemas"
description: "A deploy that renames a field or splits a name into first and last breaks every draft saved under the old shape. How to stamp drafts with a schema version, run ordered migrations on restore, and discard safely when a migration cannot succeed."
slug: versioning-and-migrating-saved-draft-schemas
type: howto
breadcrumb: "Draft Migrations"
datePublished: "2026-09-18"
dateModified: "2026-09-18"
eleventyNavigation:
  key: "Versioning and Migrating Saved Draft Schemas"
  parent: "Draft Persistence and Autosave"
  order: 5
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Versioning and Migrating Saved Draft Schemas",
      "description": "A deploy that renames a field or splits a name into first and last breaks every draft saved under the old shape. How to stamp drafts with a schema version, run ordered migrations on restore, and discard safely when a migration cannot succeed.",
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
          "name": "Draft Persistence and Autosave",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Versioning and Migrating Saved Draft Schemas",
          "item": "https://client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/versioning-and-migrating-saved-draft-schemas/"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "Version and migrate saved form drafts",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Stamp every stored draft with schemaVersion"
        },
        {
          "@type": "HowToStep",
          "name": "Write one migration per version step"
        },
        {
          "@type": "HowToStep",
          "name": "Never edit a shipped migration"
        },
        {
          "@type": "HowToStep",
          "name": "Validate the migrated result against a partial schema"
        },
        {
          "@type": "HowToStep",
          "name": "Fail safe and say so"
        },
        {
          "@type": "HowToStep",
          "name": "Re-save in the current version"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can I just discard drafts whenever the form changes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can, and for low-value forms that is reasonable — bump a key prefix and old drafts are ignored. For anything a user spends more than a minute on, discarding their work because you renamed a field is a poor trade when a migration is a few lines."
          }
        },
        {
          "@type": "Question",
          "name": "How is this different from server-side database migrations?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The logic is the same, but client migrations run lazily, on each device, whenever an old draft is read — possibly months later. That is why they must be pure, ordered and never edited after shipping, and why a failed migration must leave the original intact."
          }
        },
        {
          "@type": "Question",
          "name": "Where should the schema version number come from?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A hand-maintained integer next to the migrations table, incremented in the same commit as the migration. Do not derive it from the app version or a build hash; those change on every release, while the draft shape changes rarely."
          }
        }
      ]
    }
  ]
}
</script>

# Versioning and Migrating Saved Draft Schemas

Drafts outlive deployments: a user starts a form on Monday, you ship a release on Tuesday that renames `phone` to `phoneNumber`, and on Wednesday their restored draft silently drops the phone number — or crashes the form because a field that is now an array was saved as a string.

[Draft persistence and autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/) treats a stored draft as data about the user's intent. Like any persisted data it has a schema, and the schema changes. This page applies the discipline of database migrations to client-side drafts: version every record, migrate step by step on read, validate the result, and fail safe.

---

## Context and prerequisites

Form changes that break old drafts are routine:

- **Renames** — `phone` becomes `phoneNumber`.
- **Splits and merges** — `name` becomes `firstName` and `lastName`.
- **Type changes** — a single `tag` string becomes a `tags` array; a free-text country becomes an ISO code.
- **Removed fields** — the "fax" field is gone.
- **New required fields** — the old draft simply lacks them; that is normal and not a migration problem.

Without a version stamp you can only guess which shape a stored draft has. With one, restore becomes deterministic: read the version, apply every migration from that version up to the current one in order, then validate against the current schema before the values reach the form.

<svg viewBox="0 0 680 99" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four connected cards showing a draft stored at schema version 1 passing through migration 1 to 2 and migration 2 to 3, and then through validation before reaching the form." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>A draft saved at version 1 restored by version 3 code</title>
  <desc>A draft stored at version 1 has name and phone fields. Migration 1 to 2 renames phone to phoneNumber. Migration 2 to 3 splits name into firstName and lastName. The result is validated against the current partial draft schema, and only then loaded into the form.</desc>
  <rect x="0" y="0" width="680" height="99" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#cbb8d9" stroke-width="1.5"/>
  <text x="26.0" y="35.0" font-size="10.5" font-weight="700" fill="#1e1a24" font-family="inherit">Stored v1</text>
  <text x="26.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">name: &quot;Ada Lovelace&quot;</text>
  <text x="26.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">phone: &quot;+44 20…&quot;</text>
  <path d="M156.0,47.5 H176.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="176.0,43.5 183.0,47.5 176.0,51.5" fill="#7b4f8a"/>
  <rect x="184.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="196.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">v1 → v2</text>
  <text x="196.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">rename phone to</text>
  <text x="196.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">phoneNumber</text>
  <path d="M326.0,47.5 H346.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="346.0,43.5 353.0,47.5 346.0,51.5" fill="#7b4f8a"/>
  <rect x="354.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="366.0" y="35.0" font-size="10.5" font-weight="700" fill="#7b4f8a" font-family="inherit">v2 → v3</text>
  <text x="366.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">split name into firstName,</text>
  <text x="366.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">lastName</text>
  <path d="M496.0,47.5 H516.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="516.0,43.5 523.0,47.5 516.0,51.5" fill="#7b4f8a"/>
  <rect x="524.0" y="12.0" width="142.0" height="71.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="536.0" y="35.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Validate, then load</text>
  <text x="536.0" y="54.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Current draft schema.</text>
  <text x="536.0" y="68.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Unknown keys dropped.</text>
</svg>

---

## The core pattern: ordered migrations with a validation gate

```typescript
import { z } from "zod";

export const CURRENT_VERSION = 3;

type Json = Record<string, unknown>;
type Migration = (draft: Json) => Json;

// migrations[n] upgrades a draft FROM version n TO version n + 1.
// Never edit a migration after it has shipped: drafts in the wild depend on it.
const migrations: Record<number, Migration> = {
  1: ({ phone, ...rest }) => ({ ...rest, phoneNumber: phone }),
  2: ({ name, ...rest }) => {
    const full = typeof name === "string" ? name.trim() : "";
    const cut = full.lastIndexOf(" ");
    return cut === -1
      ? { ...rest, firstName: full, lastName: "" }
      : { ...rest, firstName: full.slice(0, cut), lastName: full.slice(cut + 1) };
  },
};

// The CURRENT shape, all optional: a draft is by definition incomplete.
const DraftSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
}).partial().strip();   // strip() drops keys from removed fields

export type Draft = z.infer<typeof DraftSchema>;

export type RestoreResult =
  | { ok: true; values: Draft; migratedFrom: number }
  | { ok: false; reason: "future-version" | "migration-failed" | "invalid" };

export function restoreDraft(stored: { schemaVersion?: number; values: Json }): RestoreResult {
  // Drafts saved before versioning existed are treated as version 1.
  const from = stored.schemaVersion ?? 1;
  if (from > CURRENT_VERSION) return { ok: false, reason: "future-version" }; // rolled-back deploy

  let values = stored.values;
  try {
    for (let v = from; v < CURRENT_VERSION; v++) {
      const step = migrations[v];
      if (!step) throw new Error(`missing migration ${v}→${v + 1}`);
      values = step(values);
    }
  } catch {
    return { ok: false, reason: "migration-failed" };
  }
  const parsed = DraftSchema.safeParse(values);
  return parsed.success
    ? { ok: true, values: parsed.data, migratedFrom: from }
    : { ok: false, reason: "invalid" };
}
```

Saving always writes `schemaVersion: CURRENT_VERSION`, so a draft migrated on restore is stored in the new shape at the next autosave and never migrated again.

---

## Step-by-step walkthrough

1. **Stamp every stored draft with `schemaVersion`.** Treat unstamped legacy drafts as version 1 so the first release that adds versioning can still read them.
2. **Write one migration per version step.** Each is a pure function from the old shape to the next. Chaining small steps is far easier to review and test than one function that knows every historical shape.
3. **Never edit a shipped migration.** Fix a mistake with a new migration. A draft saved at version 2 must go through exactly the code that produced version 3 for everyone else.
4. **Validate the migrated result against a partial schema.** Use the same schema you use for step or draft validation — see [partial Zod schemas for drafts and wizard steps](https://www.client-side-form.com/validation-logic-schema-integration/integrating-zod-for-schema-validation/partial-schemas-for-drafts-and-steps/) — with unknown keys stripped.
5. **Fail safe and say so.** If the version is from the future, a migration throws, or validation fails, do not load a half-migrated draft. Keep the stored copy, start a fresh form, and tell the user their earlier draft could not be restored.
6. **Re-save in the current version.** The next autosave writes the migrated values with the new version stamp.

<svg viewBox="0 0 680 308" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decision flow for restoring a stored draft — whether its version is newer than the code, whether every migration step succeeds, and whether the result validates — with the action taken at each outcome." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>What restore does with a stored draft</title>
  <desc>If the stored version is newer than the running code, which happens after a rolled-back deployment, keep the draft untouched and start fresh. If any migration step throws, keep the stored draft and start fresh with a notice. If the migrated values fail validation, do the same. Otherwise load the values into the form and re-save them at the current version on the next autosave.</desc>
  <rect x="0" y="0" width="680" height="308" fill="#f9f5fb"/>
  <rect x="14.0" y="12.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="35.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Stored version newer than code?</text>
  <rect x="340.0" y="12.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="35.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Keep stored draft, start fresh</text>
  <path d="M284.0,32.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,28.5 339.0,32.5 332.0,36.5" fill="#7b4f8a"/>
  <text x="312.0" y="26.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,53.0 V79.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,79.0 149.0,86.0 153.0,79.0" fill="#7b4f8a"/>
  <text x="159.0" y="71.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="87.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="110.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Did a migration step throw?</text>
  <rect x="340.0" y="87.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="110.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Keep stored draft, notify user</text>
  <path d="M284.0,107.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,103.5 339.0,107.5 332.0,111.5" fill="#7b4f8a"/>
  <text x="312.0" y="101.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,128.0 V154.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,154.0 149.0,161.0 153.0,154.0" fill="#7b4f8a"/>
  <text x="159.0" y="146.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="162.0" width="270.0" height="41.0" rx="8" fill="#e2d6ec" stroke="#7b4f8a" stroke-width="1.5"/>
  <text x="26.0" y="185.5" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Does the result fail validation?</text>
  <rect x="340.0" y="162.0" width="326.0" height="41.0" rx="8" fill="#ede5f2" stroke="#a63d6f" stroke-width="1.5"/>
  <text x="352.0" y="185.0" font-size="10.5" font-weight="700" fill="#a63d6f" font-family="inherit">Keep stored draft, notify user</text>
  <path d="M284.0,182.5 H332.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="332.0,178.5 339.0,182.5 332.0,186.5" fill="#7b4f8a"/>
  <text x="312.0" y="176.5" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit" text-anchor="middle">yes</text>
  <path d="M149.0,203.0 V229.0" stroke="#7b4f8a" stroke-width="1.4" fill="none"/>
  <polygon points="145.0,229.0 149.0,236.0 153.0,229.0" fill="#7b4f8a"/>
  <text x="159.0" y="221.0" font-size="9.5" font-weight="700" fill="#6b5f75" font-family="inherit">no</text>
  <rect x="14.0" y="237.0" width="270.0" height="55.0" rx="8" fill="#ede5f2" stroke="#2d6342" stroke-width="1.5"/>
  <text x="26.0" y="260.0" font-size="10.5" font-weight="700" fill="#2d6342" font-family="inherit">Load and re-save at v3</text>
  <text x="26.0" y="278.0" font-size="9.5" fill="#6b5f75" font-family="inherit">Next autosave stores the current shape.</text>
</svg>

---

## Failure modes and edge cases

### 1. Rollbacks

If you roll back a release, the older code finds drafts stamped with a version it has never heard of. It must not attempt to read them as its own version. Returning `future-version` and leaving the draft untouched means that when the fix is redeployed, the draft is still there.

### 2. Migrations that lose information

Splitting a full name on the last space mangles "Jean de la Fontaine". When a migration cannot be exact, prefer putting the whole value in the first field and flagging the draft for review, and let the restored form show an info message on those fields asking the user to check them.

### 3. Changed option lists

A select whose options changed — a plan called "pro" is now "professional", or was retired — needs a mapping migration. For retired values, drop the field so it validates as missing and the user chooses again, rather than loading a value the select cannot display.

### 4. Drafts containing files

Migrations run on the values object; `File` entries pass through untouched as long as migrations spread the rest of the object rather than rebuilding it from a list of known keys. See [storing large drafts in IndexedDB](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/storing-large-drafts-in-indexeddb/).

### 5. Testing migrations

Keep a fixture of a real stored draft for every historical version and assert that each restores to the expected current shape. Those fixtures are the only way a future refactor of the migration table cannot quietly break old drafts.

<svg viewBox="0 0 680 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Timeline of four releases over two weeks showing draft schema versions 1, 2 and 3, a rollback, and which versions each release can restore." style="max-width:100%;height:auto;display:block;margin:1.5rem 0;">
  <title>Draft versions across a sequence of releases</title>
  <desc>Release A on day one writes version 1 drafts. Release B on day four renames phone and writes version 2. Release C on day eight splits name and writes version 3. On day nine release C is rolled back to B, which finds version 3 drafts, treats them as from the future, and leaves them alone. On day ten C is redeployed and restores the version 3 drafts normally.</desc>
  <rect x="0" y="0" width="680" height="140" fill="#f9f5fb"/>
  <text x="14.0" y="24.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">Release in prod</text>
  <rect x="134.0" y="14.0" width="174.0" height="14" rx="3" fill="#c9a0dc"/>
  <text x="134.0" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">A writes v1</text>
  <rect x="308.0" y="14.0" width="174.0" height="14" rx="3" fill="#7b4f8a"/>
  <text x="308.0" y="40.0" font-size="9" fill="#6b5f75" font-family="inherit">B writes v2</text>
  <rect x="482.0" y="14.0" width="43.5" height="14" rx="3" fill="#2d6342"/>
  <text x="482.0" y="40.0" font-size="9" fill="#2d6342" font-family="inherit">C</text>
  <rect x="525.5" y="14.0" width="43.5" height="14" rx="3" fill="#a63d6f"/>
  <text x="525.5" y="40.0" font-size="9" fill="#a63d6f" font-family="inherit">B</text>
  <rect x="569.0" y="14.0" width="87.0" height="14" rx="3" fill="#2d6342"/>
  <text x="569.0" y="40.0" font-size="9" fill="#2d6342" font-family="inherit">C again</text>
  <text x="14.0" y="66.0" font-size="10" font-weight="700" fill="#1e1a24" font-family="inherit">v3 drafts</text>
  <rect x="482.0" y="56.0" width="43.5" height="14" rx="3" fill="#2d6342"/>
  <rect x="525.5" y="56.0" width="43.5" height="14" rx="3" fill="#b07a55"/>
  <rect x="569.0" y="56.0" width="87.0" height="14" rx="3" fill="#2d6342"/>
  <text x="569.0" y="82.0" font-size="9" fill="#2d6342" font-family="inherit">restored</text>
  <text x="134.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">0d</text>
  <text x="221.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">2d</text>
  <text x="308.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">4d</text>
  <text x="395.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">6d</text>
  <text x="482.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">8d</text>
  <text x="569.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">10d</text>
  <text x="656.0" y="106.0" font-size="9" fill="#6b5f75" font-family="inherit" text-anchor="middle">12d</text>
  <text x="14.0" y="128.0" font-size="10" fill="#6b5f75" font-family="inherit">During the one-day rollback, release B leaves v3 drafts untouched instead of misreading them, so nothing is lost when C returns.</text>
</svg>

---

## Verification checklist

- [ ] Every saved draft carries `schemaVersion`.
- [ ] A fixture draft from each historical version restores to the correct current shape in tests.
- [ ] A draft with a version higher than the code is left in storage and not loaded.
- [ ] A migration that throws results in a fresh form, a visible notice, and the stored draft kept.
- [ ] Keys for removed fields are stripped before values reach the form.
- [ ] Restored drafts are re-saved with the current version on the next autosave.
- [ ] File attachments survive every migration step.
- [ ] Fields whose values were changed by a lossy migration show a "please check" note.

---

## Frequently Asked Questions

<details>
<summary><strong>Can I just discard drafts whenever the form changes?</strong></summary>

You can, and for low-value forms that is reasonable — bump a key prefix and old drafts are ignored. For anything a user spends more than a minute on, discarding their work because you renamed a field is a poor trade when a migration is a few lines.

</details>

<details>
<summary><strong>How is this different from server-side database migrations?</strong></summary>

The logic is the same, but client migrations run lazily, on each device, whenever an old draft is read — possibly months later. That is why they must be pure, ordered and never edited after shipping, and why a failed migration must leave the original intact.

</details>

<details>
<summary><strong>Where should the schema version number come from?</strong></summary>

A hand-maintained integer next to the migrations table, incremented in the same commit as the migration. Do not derive it from the app version or a build hash; those change on every release, while the draft shape changes rarely.

</details>

---

## Related

- [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
- [Resolving Conflicts When Restoring a Draft](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/resolving-conflicts-when-restoring-a-draft/)
- [Persisting Wizard Progress Across Reloads](https://www.client-side-form.com/form-state-fundamentals-architecture/multi-step-form-state-machines/persisting-wizard-progress-across-reloads/)

← [Draft Persistence and Autosave](https://www.client-side-form.com/form-state-fundamentals-architecture/draft-persistence-and-autosave/)
