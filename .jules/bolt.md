# Bolt's Journal - Critical Learnings

## 2025-02-23 - `buildTree` Map & Single-Pass Depth Assignment Optimization
**Learning:** In hot streaming paths like `buildTree` (triggered on every incoming token update), using object dictionary lookups (`Record<string, T>`) for message indexing forces V8 into slow dictionary mode for string UUID keys. Furthermore, multi-pass depth-assignment using `.some()` and `.filter()` allocated temporary arrays on every node even when no cycles existed. Using `Map<string, T>` and a single-pass cycle check cut execution time by over 50%.
**Action:** Always prefer `Map` for dynamic string-key lookups and single-pass conditional array mutations in hot tree/graph traversal utilities.
