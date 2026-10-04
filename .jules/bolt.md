# Bolt's Journal - Critical Learnings

## 2025-02-17 - Caching Intl Formatters and Locale Validation in Timestamp Helpers
**Learning:** Re-instantiating `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` on every message timestamp render incurs high C++/ICU initialization overhead in V8 (taking ~1.8s for 10,000 calls unoptimized vs ~67ms cached—a 26x speedup).
**Action:** Always cache `Intl` formatter instances and `supportedLocalesOf` validation results in module-level `Map`s indexed by locale string when formatting dates/numbers in frequent loop or list operations.
