import { prisma } from "@/lib/prisma";
import { ProblemsList } from "@/components/ProblemsList";
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      tags: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={20} className="text-indigo-400" />
          <span className="text-sm font-medium text-indigo-400 uppercase tracking-widest">
            Problems
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Pick a problem. Go cook. 🔥
        </h1>
        <p className="text-zinc-500 text-sm">
          {problems.length} problems · no pressure · just vibes
        </p>
      </div>

      <ProblemsList problems={problems} />
    </div>
  );
}
