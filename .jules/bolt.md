# Bolt's Journal - Critical Learnings

## 2025-05-18 - [Message Tree Processing in buildTree]
**Learning:** `buildTree` in `packages/data-provider/src/messages.ts` is executed frequently during live streaming cache updates and React rendering passes. Using `.some()` and `.filter()` during depth-first traversal caused multiple passes over child arrays and unnecessary object/array allocations on every node.
**Action:** Use single-pass in-place array filtering during depth assignment traversal to eliminate redundant array traversals and heap allocations.
