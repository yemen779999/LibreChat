## 2026-09-29 - Single-Pass In-Place Array Traversal for Tree Traversal Hot Paths

**Learning:** `buildTree` in `packages/data-provider/src/messages.ts` is called continuously on every SSE token update during chat streaming. The depth assignment and cycle-guard loop previously used `.some()` and `.filter()` array passes for every node. Because corrupt parent cycles are extremely rare (99.99%+ clean trees), performing `.some()` checks and `.filter()` allocations for every node added ~10% runtime overhead and unnecessary GC pressure.

**Action:** In tree building and traversal algorithms that execute on high-frequency streaming paths, perform cycle checks and depth assignment in a single linear pass, pruning invalid/visited child references in-place without extra array allocations.
