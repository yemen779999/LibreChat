## 2025-05-18 - Avoid closure and array allocations in tree traversals (`buildTree`)

**Learning:** `buildTree` in `@librechat/data-provider` runs frequently during streaming SSE updates and UI tree re-renders. Using `.some()` and `.filter()` inside tree walk functions (like `assignDepths`) allocates function closures and arrays for every node in the message tree on every invocation.
**Action:** Use fast indexed `for` loops and in-place array compaction (`writeIdx` pattern) when traversing tree children to avoid GC pressure and allocation overhead during message tree construction.
