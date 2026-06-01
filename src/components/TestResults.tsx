import { CheckCircle2, XCircle } from "lucide-react";
import type { TestResult } from "@/types";

interface Props {
  results: TestResult[];
  passedCount: number;
  totalCount: number;
  mode: "run" | "submit";
  message?: string;
  allPassed?: boolean;
}

export function TestResults({
  results,
  passedCount,
  totalCount,
  mode,
  message,
  allPassed,
}: Props) {
  return (
    <div className="space-y-3">
      {mode === "submit" && message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium border ${
            allPassed
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">
          {mode === "run" ? "Visible test cases:" : "All test cases:"}
        </span>
        <span
          className={`font-semibold ${
            passedCount === totalCount ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {passedCount}/{totalCount} passed
        </span>
      </div>

      {mode === "run" && (
        <div className="space-y-2">
          {results.map((result, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 text-xs font-mono ${
                result.passed
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-red-500/20 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.passed ? (
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={13} className="text-red-400 shrink-0" />
                )}
                <span
                  className={`font-semibold text-xs ${
                    result.passed ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {result.passed ? "Passed" : "Failed"} — Case {i + 1}
                </span>
              </div>
              <div className="space-y-1 text-zinc-400 pl-5">
                <div>
                  <span className="text-zinc-500">Input: </span>
                  <span className="text-zinc-300">
                    {JSON.stringify(result.input)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Expected: </span>
                  <span className="text-zinc-300">
                    {JSON.stringify(result.expected)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Got: </span>
                  <span
                    className={result.passed ? "text-emerald-300" : "text-red-300"}
                  >
                    {result.error
                      ? `Error: ${result.error}`
                      : JSON.stringify(result.output)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
