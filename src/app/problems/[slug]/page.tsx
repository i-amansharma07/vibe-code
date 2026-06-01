import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { ProblemWorkspace } from "@/components/ProblemWorkspace";
import { ResizableLayout } from "@/components/ResizableLayout";
import type { Difficulty, Example } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProblemPage({ params }: Props) {
  const { slug } = await params;

  const problem = await prisma.problem.findUnique({
    where: { slug },
    include: {
      hints: { orderBy: { order: "asc" } },
      testCases: {
        where: { isVisible: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!problem) notFound();

  const problemDetail = {
    id: problem.id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty as Difficulty,
    tags: problem.tags,
    description: problem.description,
    examples: problem.examples as Example[],
    constraints: problem.constraints,
    starterJs: problem.starterJs,
    starterPy: problem.starterPy,
    fnNameJs: problem.fnNameJs,
    fnNamePy: problem.fnNamePy,
    hints: problem.hints,
    testCases: problem.testCases.map((tc) => ({
      id: tc.id,
      input: tc.input as unknown[],
      expected: tc.expected,
      isVisible: tc.isVisible,
    })),
  };

  const descriptionPanel = (
    <div className="overflow-y-auto flex-1 p-6 space-y-6">
      {/* Back + title */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-4 transition-colors"
        >
          <ArrowLeft size={12} />
          All problems
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight flex-1">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty as Difficulty} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Description
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
          {problem.description}
        </p>
      </div>

      {/* Examples */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Examples
        </h2>
        <div className="space-y-3">
          {(problem.examples as Example[]).map((ex, i) => (
            <div
              key={i}
              className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-sm font-mono"
            >
              <div className="text-zinc-500 text-xs mb-2 font-sans font-semibold">
                Example {i + 1}
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-zinc-500">Input: </span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {ex.input}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Output: </span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {ex.output}
                  </span>
                </div>
                {ex.explanation && (
                  <div className="text-xs text-zinc-500 font-sans mt-1">
                    {ex.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Constraints
        </h2>
        <ul className="space-y-1">
          {problem.constraints.map((c, i) => (
            <li
              key={i}
              className="text-sm font-mono text-zinc-700 dark:text-zinc-400 flex items-start gap-2"
            >
              <span className="text-zinc-600 mt-0.5">·</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Hints */}
      <HintsSection hints={problem.hints} />
    </div>
  );

  return (
    <ResizableLayout
      left={descriptionPanel}
      right={<ProblemWorkspace problem={problemDetail} />}
      defaultLeftPercent={42}
    />
  );
}

function HintsSection({
  hints,
}: {
  hints: { order: number; body: string }[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        Hints
      </h2>
      <HintsClient hints={hints} />
    </div>
  );
}

// This is a client component embedded in a server component file
// via a workaround — we'll keep it simple as a server-rendered component
// with JS-only progressive enhancement for the toggle behavior.
// For MVP, using a details/summary HTML element is the cleanest zero-JS solution.
function HintsClient({
  hints,
}: {
  hints: { order: number; body: string }[];
}) {
  return (
    <div className="space-y-2">
      {hints.map((hint) => (
        <details
          key={hint.order}
          className="group rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 select-none list-none">
            <span>Hint {hint.order}</span>
            <span className="text-xs text-zinc-500 group-open:hidden">
              Show
            </span>
            <span className="text-xs text-zinc-500 hidden group-open:block">
              Hide
            </span>
          </summary>
          <div className="px-3 pb-3 pt-1 text-sm text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800">
            {hint.body}
          </div>
        </details>
      ))}
    </div>
  );
}
