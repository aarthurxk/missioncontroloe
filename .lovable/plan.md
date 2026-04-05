

## Fix: Scheduler button + Settings tabs

### 1. Scheduler — Smaller "Novo Agendamento" button
**File: `src/pages/SchedulerPage.tsx`** (line ~400)

Change the button from default size to `size="sm"` and shorten the label on mobile:
```tsx
<Button onClick={openCreate} size="sm" className="gap-1.5 text-xs">
  <Plus className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Novo Agendamento</span>
  <span className="sm:hidden">Novo</span>
</Button>
```

Also reduce the stats cards padding and font size for a more compact mobile feel (lines 408-430): smaller `text-xl` instead of `text-2xl`, tighter `p-2`.

### 2. Settings tabs — "Geral" tab fully visible
**File: `src/pages/SettingsPage.tsx`** (line 339)

The problem: `min-w-max` forces the TabsList to be wider than the screen but it doesn't scroll because the parent has `overflow-x: hidden`. Fix by removing `min-w-max` from the TabsList and instead making each tab shrink gracefully, or wrapping the TabsList in a scrollable container that isn't blocked by the global overflow rule:

```tsx
<div className="overflow-x-auto no-scrollbar -mx-4 px-4">
  <TabsList className="bg-muted w-max justify-start">
    ...
  </TabsList>
</div>
```

This wraps the tabs in a dedicated scroll container with negative margin to bleed edge-to-edge, ensuring all tabs (including "Geral") are reachable by swiping.

### Files
| File | Change |
|------|--------|
| `src/pages/SchedulerPage.tsx` | Smaller button, compact stats cards |
| `src/pages/SettingsPage.tsx` | Fix tabs scroll container so "Geral" is accessible |

