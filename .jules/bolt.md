## 2025-05-18 - Single-Pass Tree Traversal for Live Message Trees

**Learning:** `buildTree` runs on every streaming response token and cache update across all conversation messages. The depth-assignment and cycle-severing walk previously invoked `.some()`, `.filter()`, and `for...of` loops for every node, allocating closures and temporary arrays even when no cycles existed (the common path).

**Action:** Prefer single-pass array walks with conditional shallow copy on anomaly detection (e.g., cycle back-edge) instead of chained higher-order array methods (`.some()`, `.filter()`) in hot render tree generators.
