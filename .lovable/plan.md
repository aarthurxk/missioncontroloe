

## Mobile UX/UI Overhaul — Apple-quality polish

### Current Issues
1. **Header is cramped** — nav icons + bridge status + user info all squeezed into 48px, no room to breathe
2. **Navigation is icon-only** — hard to know which page you're on; no labels, no bottom tab bar (the iOS standard)
3. **KPI cards are dense** — 2x2 grid with small text, no visual hierarchy
4. **Agents list** — Play button uses `opacity-0 group-hover:opacity-100` which is invisible on touch (no hover)
5. **Tab switcher (Agents/Missions)** — small pill inside the header area, doesn't feel native
6. **RobotDetailDrawer** — Sheet slides from right (desktop pattern); on mobile should be a bottom sheet taking ~90% height
7. **No haptic spacing** — everything feels tight with px-3/py-2 everywhere

### Plan

#### 1. iOS-style Bottom Tab Bar (new component)
Create a `BottomTabBar.tsx` with 5 tabs: Dashboard, Logs, Analytics, Agenda, Config (admin-only). Fixed to bottom, 56px height, with icon + label, active state uses primary color with subtle glow. Remove the inline `<nav>` from Header on mobile.

#### 2. Simplified Mobile Header
- Keep only: logo icon, "MISSION CONTROL" text (truncated), running badge, and bridge status dot
- Remove nav links, clock, user info on mobile (user info moves to a Settings/Profile tab or stays behind a tap on avatar)
- Height stays 48px but feels spacious

#### 3. Better KPI Cards
- Horizontal scrolling row (single row, swipeable) instead of 2x2 grid
- Each card is a compact pill: icon + value + short label
- Feels like iOS widget summaries

#### 4. Agents List — Touch-optimized
- Make Play button always visible (remove hover dependency) with a subtle ghost bg
- Increase touch target to 44px minimum (Apple HIG)
- Add swipe-to-run gesture hint (subtle right-chevron)
- Larger robot icon (24px) and better vertical spacing

#### 5. Segmented Control for Agents/Missions
- Replace the `TabsList` with an iOS-style segmented control (rounded-full, animated sliding indicator)
- Slightly larger, centered in its own row

#### 6. Bottom Sheet Drawer for Robot Detail
- On mobile, `RobotDetailDrawer` renders as a bottom sheet (side="bottom") instead of right
- Rounded top corners, drag handle, max 85vh height
- Content stays the same

#### 7. Global mobile spacing and safe areas
- Add `pb-[env(safe-area-inset-bottom)]` to bottom tab bar for iPhone notch/home indicator
- Increase general padding from px-3 to px-4
- Ensure all interactive elements are >= 44x44px touch targets

### Files to Edit
| File | Changes |
|------|---------|
| `src/components/BottomTabBar.tsx` | **New** — iOS-style bottom navigation |
| `src/components/Header.tsx` | Strip nav + user details on mobile, keep minimal top bar |
| `src/pages/Index.tsx` | Add BottomTabBar, change KPI to horizontal scroll, segmented control |
| `src/components/KpiCards.tsx` | Add horizontal scroll variant for mobile |
| `src/components/AgentsList.tsx` | Always-visible action buttons, larger touch targets |
| `src/components/NavLink.tsx` | Minor — export active detection for reuse |
| `src/components/RobotDetailDrawer.tsx` | Bottom sheet on mobile |
| `src/index.css` | Safe area utilities, segmented control animation |
| `src/App.tsx` | Wrap mobile layout with BottomTabBar on all pages |

### Technical Details
- Bottom tab bar uses `react-router-dom`'s `useLocation` for active state
- Segmented control is a styled `TabsList` with `before:` pseudo-element sliding indicator via CSS translate
- KPI horizontal scroll uses `overflow-x-auto snap-x snap-mandatory` with `scroll-snap-align: start` on each card
- Bottom sheet uses existing `Sheet` component with `side="bottom"` and custom rounded styling
- Safe area insets via `env(safe-area-inset-bottom)` in Tailwind arbitrary values

