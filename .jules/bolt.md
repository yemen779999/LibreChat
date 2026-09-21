## 2025-05-18 - JSON Deep Cloning in React Query Cache Helpers

**Learning:** `JSON.parse(JSON.stringify(data))` in collection helper functions (`addData`, `updateData`, `deleteData`, `normalizeData`, `updateFields`) was re-serializing large nested TanStack Query `InfiniteData` structures on every cache write, causing needless garbage collection pressure and main thread blockages.

**Action:** Replace `JSON.parse(JSON.stringify)` in cache updater helpers with structural sharing (shallow array and object spread copies) to update target items and pages in $O(1)$ object allocations rather than deep copies of the whole page tree.
