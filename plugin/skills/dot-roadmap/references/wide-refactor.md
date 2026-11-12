# Wide refactors

A **wide refactor**, one mechanical change that breaks many call sites at once, cannot land as one green slice. Order it as **expand and contract**: add the new form beside the old, migrate callers in batches (one task each, blocked by the expand), then delete the old form in a task blocked by every batch.
