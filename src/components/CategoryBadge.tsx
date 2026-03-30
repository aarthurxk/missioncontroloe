import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  "Clínica": "bg-sky-500/15 text-sky-400 border-sky-500/20",
  "Cases": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "BRAVEA": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Pessoal": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export function CategoryBadge({ category }: { category: string }) {
  const color = categoryColors[category] || categoryColors["Pessoal"];
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium", color)}>
      {category}
    </span>
  );
}
