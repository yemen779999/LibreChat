## 2026-03-31 - Single-pass tree depth assignment & cycle severance in `buildTree`
**Learning:** `buildTree` in `librechat-data-provider` is invoked on every streaming token update in active chats. Using nested `.some()` and `.filter()` calls during depth assignment created high closure and array allocation overhead for every node on every stream chunk.
**Action:** Replace multi-pass array helper chains in hot path tree walkers with single-pass indexed `for` loops using in-place write pointer compaction (`writeIdx`).
