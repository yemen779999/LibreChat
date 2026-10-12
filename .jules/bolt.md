## 2025-02-23 - Fast path guards for string template parsers

**Learning:** Hot-path helper functions like `replaceSpecialVars` and `extractEnvVariable` in `librechat-data-provider` are invoked frequently on plain text strings. Running date/time object instantiation (Day.js), timezone calculations, string trimming, and multiple RegExp match/replace calls on every string creates significant CPU overhead when >95% of strings do not contain template tags. Fast-path guards using `String.prototype.includes('{{')` and `includes('${')` reduce plain string processing latency by up to ~200x.

**Action:** Look for string parsing, date formatting, and template replacement utilities in hot paths, and add cheap string inclusion checks (`includes()`) prior to expensive regex or object instantiation logic.
