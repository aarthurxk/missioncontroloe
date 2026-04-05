

## Fix: Prevent horizontal swipe from moving the entire screen

### Problem
On iOS Safari/PWA, swiping horizontally drags the entire page (elastic overscroll). The user wants pages to stay fixed — navigation should only happen by tapping the bottom tab bar buttons.

### Root Cause
There is no `overflow-x: hidden` on the root containers (`html`, `body`, or the main page wrappers). iOS Safari allows elastic horizontal scrolling by default. Additionally, some content (like the Settings page tabs, buttons, or cards) may overflow the viewport width, triggering the horizontal scroll.

### Fix

**1. `src/index.css`** — Add `overflow-x: hidden` to `html` and `body` to kill horizontal scroll globally, and add `overscroll-behavior-x: none` to prevent the iOS rubber-band effect:

```css
html, body {
  overflow-x: hidden;
  overscroll-behavior-x: none;
}
```

**2. `src/pages/SettingsPage.tsx`** — The Settings page content (buttons "Remover Todos" + "Novo Robô", robot cards with edit/delete icons) overflows horizontally on small screens (visible in the screenshots). Fix by:
- Wrapping the action buttons in a responsive flex container that wraps on mobile
- Ensuring robot list items don't overflow (truncate text, constrain icon buttons)

**3. `src/pages/Index.tsx`** — Add `overflow-x: hidden` to the main wrapper to prevent any internal horizontal scroll leaking out.

### Files to Edit
| File | Change |
|------|--------|
| `src/index.css` | Add `overflow-x: hidden` and `overscroll-behavior-x: none` to html/body |
| `src/pages/SettingsPage.tsx` | Fix button row overflow, constrain robot cards |
| `src/pages/Index.tsx` | Add `overflow-x: hidden` to main container |

