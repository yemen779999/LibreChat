## 2025-05-18 - Single-Pass Tree Traversal in `buildTree`
**Learning:** `buildTree` in `@librechat/data-provider` executes on every streaming message update to compute depth and sibling indexes for message trees. Sequential array calls (`.some()`, `.filter()`, `for...of`) in recursive tree walks create redundant iterations and array allocations on hot rendering paths.
**Action:** Consolidate array filter checks, visited set operations, depth setting, and stack operations into single-pass `for (let i = 0)` loops during tree depth assignments.
