# Bolt's Journal - Critical Learnings

## 2026-03-31 - Precomputed Date Boundaries for Array Grouping
**Learning:** Re-evaluating date-fns intervals (`isWithinInterval`, `subDays`, `startOfDay`) and instantiating `new Date()` inside iteration loops or sort comparators on large arrays (such as sidebar conversation lists) causes heavy GC pressure and unnecessary operations. Precomputing relative boundary timestamps once per call and sorting on primitive numeric timestamps eliminates object allocation overhead entirely.
**Action:** Always precompute boundary timestamps outside array loops and store primitive numeric timestamps when sorting collections by date.
