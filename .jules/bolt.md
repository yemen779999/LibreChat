## 2025-05-20 - In-place cycle pruning and single-pass tree traversal in buildTree
**Learning:** `buildTree` in `packages/data-provider` is invoked on every incoming SSE chunk during chat streaming to rebuild the conversation tree. Traversing message `children` using `.some()` + `.filter()` + `for...of` in `assignDepths` creates heavy iterator/allocation overhead across streaming cycles.
**Action:** Consolidate cycle checking, back-edge pruning, depth assignment, and stack pushing into a single in-place indexed loop over `node.children` without allocating intermediate arrays.
