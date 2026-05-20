---
layout: page.njk
title: "How to Validate Dependent Fields with Zod"
description: "Use Zod .refine() and .superRefine() to implement cross-field validation constraints with full type safety."
eleventyNavigation:
  key: "How to Validate Dependent Fields with Zod"
  parent: "Integrating Zod for Schema Validation"
  order: 1
---
# How to Validate Dependent Fields with Zod

Cross-field validation requires schema-level coordination rather than isolated field checks. When architecting [Validation Logic & Schema Integration](/validation-logic-schema-integration/), developers must account for state dependencies that trigger conditional rules. This guide details the exact `superRefine` workflow for synchronizing dependent inputs without breaking type safety or causing render loops.

## Define the Base Schema with Strict Typing

Establish a foundational object schema that declares all dependent fields. Use `z.object()` to enforce baseline types before applying conditional logic. This prevents runtime coercion errors and aligns with established [Integrating Zod for Schema Validation](/validation-logic-schema-integration/integrating-zod-for-schema-validation/) best practices.

Follow this sequence to guarantee strict type inference:
- Declare base types for all interdependent fields using explicit Zod primitives.
- Apply `.strict()` to reject extraneous keys, or `.passthrough()` when bridging uncontrolled form libraries.
- Export the base schema for downstream refinement and component-level type consumption.

## Implement Cross-Field Validation via superRefine

Replace `.refine()` with `.superRefine()` to attach multiple, targeted error paths. This method allows granular error mapping to specific field keys, enabling precise UI feedback without triggering full schema re-evaluation.

Execute the refinement chain using these steps:
- Chain `.superRefine()` directly to the base object schema.
- Extract dependent values from the parsed context object, ensuring null/undefined guards are in place.
- Apply conditional logic and invoke `ctx.addIssue()` with exact field paths.
- Return `z.NEVER` to halt execution on critical failure, or allow the chain to continue for compound rules.

```typescript
import { z } from 'zod';

export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).superRefine((data, ctx) => {
  // Edge case: Guard against undefined or invalid dates before comparison
  if (!data.startDate || !data.endDate) return;

  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be strictly after start date',
      path: ['endDate'],
    });
  }
});
```

## Map Validation Errors to UI State and A11y Attributes

Translate Zod's `ZodError` format into accessible form state. Map `path` arrays to input `aria-invalid` and `aria-describedby` attributes to maintain WCAG compliance during dynamic validation cycles.

Implement the error synchronization workflow:
- Parse the `ZodError` using `.format()` or `.flatten()` for predictable key access.
- Sync error paths with React Hook Form or native state management to trigger re-renders.
- Attach `aria-live="polite"` to error containers for dynamic screen reader updates.
- Clear dependent field values when parent state resets to prevent stale validation flags.

```typescript
import { z } from 'zod';

export function mapZodErrorsToFormState(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    // Flatten nested paths (e.g., ['address', 'street'] -> 'address.street')
    const fieldPath = issue.path.join('.');
    fieldErrors[fieldPath] = issue.message;
  });

  return fieldErrors;
}
```

## Common Pitfalls

Avoid these architectural missteps when implementing dependent validation:
- **Using `.refine()` instead of `.superRefine()` for multi-field errors:** Prevents targeted path mapping, forcing generic error banners instead of inline field feedback.
- **Failing to clear dependent field state on parent reset:** Leaves stale validation flags in the UI, causing confusing user experiences and QA failures.
- **Overusing `.transform()` inside validation chains:** Breaks type inference for downstream error handling and complicates state reconciliation.
- **Blocking form submission without updating `aria-invalid` states:** Degrades screen reader accessibility and violates WCAG 2.1 AA compliance.

## FAQ

**How do I target a specific field in a `superRefine` callback?**
Use `ctx.addIssue({ path: ['fieldName'], message: '...', code: z.ZodIssueCode.custom })` to attach the error directly to the dependent input's validation state. The `path` array dictates exactly which form control receives the error message.

**Does `superRefine` run synchronously or asynchronously?**
It runs synchronously during the `.safeParse()` or `.parse()` execution phase. This ensures deterministic validation before state updates propagate to the UI, eliminating race conditions in client-side form state.

**How do I handle optional dependent fields?**
Apply `.optional()` to the base schema and explicitly check for `undefined` values before executing cross-field logic within the refinement step. Zod will skip validation for missing keys, but your guard clauses must handle partial data structures gracefully.