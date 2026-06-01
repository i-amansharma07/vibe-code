"use client";

import { useEffect, useState } from "react";
import { ProblemCard } from "./ProblemCard";
import type { ProblemSummary } from "@/types";

export function ProblemsList({ problems }: { problems: ProblemSummary[] }) {
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const uuid = localStorage.getItem("vibe_user_id");
    if (!uuid) return;
    fetch(`/api/user/solved?uuid=${uuid}`)
      .then((r) => r.json())
      .then((data) => setSolvedIds(new Set(data.solvedIds)))
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {problems.map((problem, i) => (
        <ProblemCard
          key={problem.id}
          problem={problem}
          index={i}
          solved={solvedIds.has(problem.id)}
        />
      ))}
    </div>
  );
}
