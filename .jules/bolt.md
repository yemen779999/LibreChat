## 2025-02-28 - Single-Pass Traversal in Message Tree Construction

**Learning:** In `@librechat/data-provider`, `buildTree` is called on every SSE message chunk and conversation render. Using multi-pass array methods (`.some()`, `.filter()`, `for...of`) inside recursive or stack-based tree walks adds significant overhead (~2x slowdown). Map lookups and single-pass depth/cycle checks reduce execution time by over 50%.

**Action:** Prefer `Map` over dynamic object key lookups and consolidate multiple array passes into single loops for hot data transformation utilities like `buildTree`.
