## 2026-09-18 - Single-Pass Message Tree Back-Edge Pruning

**Learning:** `buildTree` in `packages/data-provider` is called on every streaming message update. Multi-pass child array operations (`.some()`, `.filter()`, and `for..of`) introduce redundant array passes and garbage collection overhead on frequent tree re-renders.
**Action:** Consolidate depth assignment, cycle checking, and array filtering into a single loop using two-pointer in-place array trimming (`children[validCount++] = child`).
