# Bolt's Journal - Critical Learnings

## 2026-09-13 - Message Tree Traversals in `buildTree`
**Learning:** `buildTree` in `packages/data-provider/src/messages.ts` is invoked frequently during streaming and conversation rendering. Doing cycle-checking via `.some()` followed by `.filter()` and a separate `for...of` loop causes 3 array passes and unnecessary intermediate array allocations per tree node.
**Action:** Always consolidate cycle back-edge detection, in-place array compaction, and DFS depth tagging into a single linear loop over `children` to keep streaming and tree rendering fast.
