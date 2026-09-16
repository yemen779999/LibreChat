## 2025-05-18 - `buildTree` Message Tree Reconstruction Overhead During Streaming

**Learning:** `buildTree` in `packages/data-provider` is invoked on every single streaming token update across the entire conversation history. The depth assignment and cycle severing step previously allocated arrays via `node.children.filter(...)` and performed 3 iterations (`.some`, `.filter`, `for..of`) per tree node.
**Action:** Single-pass in-place array modification (`node.children[validCount++] = child`) eliminates per-token GC pressure and $O(3K)$ array iterations during streaming.
