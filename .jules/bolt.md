# Bolt's Journal - Performance Learnings & Bottlenecks

## 2025-05-20 - Message Tree Construction (`buildTree`)

**Learning:** `buildTree` in `@librechat/data-provider` is executed frequently on every streaming chunk, conversation selection, export, and chat render walk. Using plain objects as dictionaries (`Record<string, T>`) in tree-construction functions causes V8 hidden class churn and object prototype lookup overhead on large message arrays.

**Action:** Prefer `Map<string, T>` over `{}` for key-value indexing inside data-processing utilities that run repeatedly during UI updates. Combine indexed `for` loops instead of `for...of` iterators or array helper closures (`.some()`) in hot data processing loops to minimize allocation churn.
