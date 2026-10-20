## 2026-10-20 - Tree depth assignment and cycle edge pruning in `buildTree`

**Learning:** `buildTree` in `data-provider/src/messages.ts` ran `.some()`, `.filter()`, and `for..of` over `node.children` per node, causing up to 3 array iterations and double `visited.has()` lookups per child.
**Action:** Combine cycle edge detection, filtering, depth assignment, and stack traversal into a single indexed loop pass per node, lazily pruning valid children only when a cycle back-edge is encountered.
