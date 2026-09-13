## 2025-05-18 - Keyboard Focus Indicators on Expand/Collapse Content Buttons
**Learning:** Interactive expand/collapse trigger buttons on reasoning/thinking headers and AskUserQuestion prompt cards lacked explicit `focus-visible` ring indicators, making keyboard navigation difficult to track for screen reader and keyboard-only users.
**Action:** Always ensure `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy` or similar focus rings are applied to custom interactive button triggers in message content blocks.
