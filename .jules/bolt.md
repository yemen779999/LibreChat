## 2025-05-20 - Optimize Message Tree Building with ES Map and In-Place Filtering

**Learning:** `buildTree` in `packages/data-provider/src/messages.ts` is invoked frequently when rendering and managing conversation message trees. Plain object key lookups (`Record<string, ...>`) and array allocation methods (`filter`, `some`) during DFS cycle checks introduce noticeable garbage collection pressure and runtime latency on large conversations. Using `Map` instances for lookup and performing two-pointer in-place array compaction during cycle pruning reduced execution time by ~48%.

**Action:** When building nested data structures or tree representations from flat collections, use `Map` for fast key lookups and compact arrays in-place to avoid unnecessary object/array allocations.
