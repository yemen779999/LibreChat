# Bolt's Journal - Critical Performance Learnings

## 2026-10-11 - Cache Intl.DateTimeFormat & RelativeTimeFormat Instances
**Learning:** Re-instantiating `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` on every message render / timestamp format call adds significant CPU overhead (~90x slower) due to locale resolution and option normalization.
**Action:** Always cache `Intl` formatter instances and locale resolution using `Map<string, Intl.*>` keyed by locale when formatting dates, times, or currencies repeatedly across UI renders.
