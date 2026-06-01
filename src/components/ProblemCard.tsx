import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { DifficultyBadge } from "./DifficultyBadge";
import type { ProblemSummary, Difficulty } from "@/types";

interface Props {
  problem: ProblemSummary;
  index: number;
  solved: boolean;
}

export function ProblemCard({ problem, index, solved }: Props) {
  return (
    <Link href={`/problems/${problem.slug}`}>
      <div className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 p-5 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-zinc-600 shrink-0">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-zinc-100 group-hover:text-white truncate">
              {problem.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {solved && (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            <DifficultyBadge difficulty={problem.difficulty as Difficulty} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500 border border-zinc-700/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
