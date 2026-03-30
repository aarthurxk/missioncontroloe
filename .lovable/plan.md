

## Edit Roadmap Items + Add Steps/Checklist

### Overview
Two features: (1) click a roadmap card to edit its fields, and (2) add "etapas" (steps/checklist) to each card that appear as a progress indicator on the card.

### Database Change
Create a `roadmap_steps` table to store steps per roadmap item:
- `id` (uuid PK)
- `roadmap_id` (uuid FK -> roadmap.id ON DELETE CASCADE)
- `title` (text)
- `done` (boolean, default false)
- `position` (integer, default 0)
- `created_at` (timestamptz)

RLS: authenticated can read; admins can insert/update/delete. Enable realtime.

### Hook Changes — `src/hooks/useRoadmap.ts`
- Add `updateMutation` for editing all fields (name, description, category, priority)
- Add `RoadmapStep` interface
- Add queries/mutations for steps: fetch steps per item, insert step, toggle step done, delete step
- Include steps in realtime subscription

### Page Changes — `src/pages/RoadmapPage.tsx`

**Card click to edit:**
- Click on a `RoadmapCard` (admin only) opens a detail/edit dialog
- Reuse the same form layout as "Nova Ideia" but pre-populated with current values
- Add a "Steps" section below the form fields

**Steps section inside the edit dialog:**
- List of steps with checkboxes (toggle done)
- Input + "Add" button to add a new step
- Delete button per step
- Progress bar or "2/5 etapas concluídas" indicator

**Card visual update:**
- Show a small progress indicator on each card: e.g. "3/5 ✓" or a mini progress bar below the badges
- Only show if the item has steps

### Files to Edit
- Migration: create `roadmap_steps` table
- `src/hooks/useRoadmap.ts` — add update mutation + steps CRUD
- `src/pages/RoadmapPage.tsx` — add edit dialog, steps UI, progress on cards

