"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Play, Send, Wand2, ChevronDown } from "lucide-react";
import { TestResults } from "./TestResults";
import type { ProblemDetail, RunResponse, SubmitResponse } from "@/types";
import type * as MonacoType from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
      Loading editor...
    </div>
  ),
});

type Language = "javascript" | "python";

interface Props {
  problem: ProblemDetail;
}

export function ProblemWorkspace({ problem }: Props) {
  const { resolvedTheme } = useTheme();
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(problem.starterJs);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | null>(null);
  const [userUuid, setUserUuid] = useState<string>("");
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    let uuid = localStorage.getItem("vibe_user_id");
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem("vibe_user_id", uuid);
    }
    setUserUuid(uuid);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(lang === "javascript" ? problem.starterJs : problem.starterPy);
    setRunResult(null);
    setSubmitResult(null);
    setActiveTab(null);
  };

  const handlePrettify = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, language, code }),
      });
      const data: RunResponse = await res.json();
      setRunResult(data);
      setActiveTab("results");
    } catch {
      alert("Run failed. Is Piston running? Check docker compose up.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!userUuid) return;
    setIsSubmitting(true);
    setRunResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          code,
          userUuid,
        }),
      });
      const data: SubmitResponse = await res.json();
      setSubmitResult(data);
      setActiveTab("results");
    } catch {
      alert("Submit failed. Is Piston running? Check docker compose up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const monacoLang = language === "javascript" ? "javascript" : "python";
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="relative">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
        </div>
        <button
          onClick={handlePrettify}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Wand2 size={13} />
          Prettify
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={monacoLang}
          theme={editorTheme}
          value={code}
          onChange={(val) => setCode(val ?? "")}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-zinc-800 shrink-0">
        <button
          onClick={handleRun}
          disabled={isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={13} />
          {isRunning ? "Running..." : "Run"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isRunning || isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={13} />
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      {/* Results panel */}
      {activeTab === "results" && (runResult || submitResult) && (
        <div className="border-t border-zinc-800 p-4 max-h-64 overflow-y-auto shrink-0">
          {runResult && (
            <TestResults
              results={runResult.results}
              passedCount={runResult.passedCount}
              totalCount={runResult.totalCount}
              mode="run"
            />
          )}
          {submitResult && (
            <TestResults
              results={submitResult.results}
              passedCount={submitResult.passedCount}
              totalCount={submitResult.totalCount}
              mode="submit"
              message={submitResult.message}
              allPassed={submitResult.passed}
            />
          )}
        </div>
      )}
    </div>
  );
}
