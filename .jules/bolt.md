## 2025-05-18 - Optimize message tree building (`buildTree`)

**Learning:** `buildTree` in `packages/data-provider/src/messages.ts` is invoked on every streaming update and state change across conversations. Using indexed `for` loops, prototype-less dictionary maps (`Object.create(null)`), and conditional cycle-check array filtering reduces execution time by ~25% (604ms -> 455ms for 1000 messages x 1000 runs) without changing behavior or memory safety.
**Action:** When working on message-processing functions called repeatedly during streaming updates, avoid `for...of` iterator overhead and premature `.filter()` array allocations in tree walks.
