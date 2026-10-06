## 2025-05-18 - Fast-path template/special variable parsing
**Learning:** `replaceSpecialVars` was instantiating Day.js, parsing timezones, formatting dates, and running multiple global regex replacements on every string input (messages, prompt prefixes, model specs) even when no `{{` template tags were present, causing >200x slowdown on standard text inputs.
**Action:** Always check string membership (`text.includes('{{')`) before executing date/timezone instantiation and regex replacements in template processors.
