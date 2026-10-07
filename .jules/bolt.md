# Bolt Journal - Critical Learnings

## 2026-03-31 - Cache Intl Formatters in Client Utilities
**Learning:** Constructing `Intl.RelativeTimeFormat`, `Intl.DateTimeFormat`, and `Intl.NumberFormat` instances in frequently executed utility functions (`getMessageTimestamp`, `formatTokens`) on every call creates substantial synchronous overhead (~200μs/call vs ~4μs/call cached).
**Action:** Always reuse cached `Intl` formatters keyed by locale/options across client-side utility functions.
