## 2026-10-17 - O(N) Map lookups for message tree traversal in conversation forking
**Learning:** In `api/server/utils/import/fork.js`, functions like `getAllMessagesUpToParent` and `cloneMessagesWithTimestamps` iteratively look up parent messages using `messages.find((msg) => msg.messageId === parentId)`. On long conversation threads ($N > 500$), linear searches per node lead to $O(N^2)$ time complexity.
**Action:** Always construct a `Map<string, TMessage>` index by `messageId` before traversing or cloning message hierarchies to keep parent lookups $O(1)$.
