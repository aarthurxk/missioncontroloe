

## Fix: Settings tabs not scrollable on mobile

### Problem
The `TabsList` in the Settings page contains 4 tabs (Robôs, Usuários, Infraestrutura, Geral) that overflow the screen width on mobile. The container doesn't allow horizontal scrolling, so the last tab ("Geral") is cut off and unreachable.

### Fix

**`src/pages/SettingsPage.tsx`** — Make the `TabsList` horizontally scrollable on mobile:
- Add `overflow-x-auto` and `w-full justify-start` to the `TabsList`
- Add `flex-nowrap` so tabs stay in a single row
- Add the `scrollbar-hide` class (already defined in `index.css`) to hide the scrollbar while keeping scroll functionality
- Add `min-w-max` to prevent tabs from shrinking

This is a single-line className change on the `TabsList` element (line 339).

