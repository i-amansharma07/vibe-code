import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types";

const config: Record<Difficulty, { label: string; className: string }> = {
  BEGINNER: {
    label: "Beginner",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  AMATEUR: {
    label: "Amateur",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  SEMI_PRO: {
    label: "Semi-Pro",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  PROFESSIONAL: {
    label: "Professional",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  LEGENDARY: {
    label: "Legendary",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, className } = config[difficulty];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        className
      )}
    >
      {label}
    </span>
  );
}
