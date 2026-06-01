"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Play, Send, Wand2, ChevronDown, Save } from "lucide-react";
import { TestResults } from "./TestResults";
import type { ProblemDetail, RunResponse, SubmitResponse, DraftResponse } from "@/types";
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

// localStorage cache — instant reads, no network
const lsKey = (id: string, lang: Language) => `vibe_code_${id}_${lang}`;
const lsSave = (id: string, lang: Language, val: string) =>
  localStorage.setItem(lsKey(id, lang), val);
const lsLoad = (id: string, lang: Language, fallback: string) =>
  localStorage.getItem(lsKey(id, lang)) ?? fallback;

// DB helpers — fire-and-forget saves, awaitable loads
const dbSave = (userUuid: string, problemId: string, lang: Language, code: string) =>
  fetch("/api/draft", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userUuid, problemId, language: lang, code }),
  }).catch(() => {});

const dbLoad = async (
  userUuid: string,
  problemId: string,
  lang: Language
): Promise<string | null> => {
  try {
    const res = await fetch(
      `/api/draft?uuid=${userUuid}&problemId=${problemId}&language=${lang}`
    );
    const data: DraftResponse = await res.json();
    return data.code;
  } catch {
    return null;
  }
};

export function ProblemWorkspace({ problem }: Props) {
  const { resolvedTheme } = useTheme();
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(() =>
    lsLoad(problem.id, "javascript", problem.starterJs)
  );
  const [autoSave, setAutoSave] = useState<boolean>(() =>
    localStorage.getItem("vibe_autosave") !== "false"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | null>(null);
  const [userUuid, setUserUuid] = useState<string>("");
  const [resultsHeight, setResultsHeight] = useState(220);
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  const resizingResults = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  const isDirty = useRef(false);
  const flushInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCode = useRef(code);
  const latestLang = useRef<Language>(language);

  useEffect(() => { latestCode.current = code; }, [code]);
  useEffect(() => { latestLang.current = language; }, [language]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingResults.current) return;
      const delta = resizeStartY.current - e.clientY;
      setResultsHeight(Math.min(500, Math.max(80, resizeStartHeight.current + delta)));
    };
    const onUp = () => {
      if (!resizingResults.current) return;
      resizingResults.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Resolve userUuid and load authoritative draft from DB
  useEffect(() => {
    let uuid = localStorage.getItem("vibe_user_id");
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem("vibe_user_id", uuid);
    }
    setUserUuid(uuid);

    dbLoad(uuid, problem.id, "javascript").then((saved) => {
      if (saved !== null) {
        setCode(saved);
        lsSave(problem.id, "javascript", saved);
      }
    });
  }, [problem.id]);

  // Flush to DB on a fixed 30s interval when dirty — caps DB writes to ~2/min
  useEffect(() => {
    if (!autoSave) {
      if (flushInterval.current) clearInterval(flushInterval.current);
      flushInterval.current = null;
      return;
    }
    flushInterval.current = setInterval(() => {
      if (isDirty.current) {
        const uuid = localStorage.getItem("vibe_user_id");
        if (uuid) {
          dbSave(uuid, problem.id, latestLang.current, latestCode.current);
          isDirty.current = false;
        }
      }
    }, 30_000);
    return () => {
      if (flushInterval.current) clearInterval(flushInterval.current);
    };
  }, [autoSave, problem.id]);

  // Save to both layers on unmount (handles navigation away)
  useEffect(() => {
    return () => {
      if (flushInterval.current) clearInterval(flushInterval.current);
      lsSave(problem.id, latestLang.current, latestCode.current);
      const uuid = localStorage.getItem("vibe_user_id");
      if (uuid) dbSave(uuid, problem.id, latestLang.current, latestCode.current);
    };
  }, [problem.id]);

  const persist = (uuid: string, lang: Language, value: string) => {
    lsSave(problem.id, lang, value);
    dbSave(uuid, problem.id, lang, value);
    isDirty.current = false;
  };

  const handleLanguageChange = (lang: Language) => {
    if (userUuid) persist(userUuid, language, code);

    const fallback = lang === "javascript" ? problem.starterJs : problem.starterPy;
    const cached = lsLoad(problem.id, lang, fallback);
    setLanguage(lang);
    setCode(cached);

    if (userUuid) {
      dbLoad(userUuid, problem.id, lang).then((saved) => {
        if (saved !== null) {
          setCode(saved);
          lsSave(problem.id, lang, saved);
        }
      });
    }

    setRunResult(null);
    setSubmitResult(null);
    setActiveTab(null);
  };

  const handlePrettify = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const toggleAutoSave = () => {
    setAutoSave((prev) => {
      const next = !prev;
      localStorage.setItem("vibe_autosave", String(next));
      return next;
    });
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
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAutoSave}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              autoSave
                ? "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
            title={autoSave ? "Auto-save on — click to disable" : "Auto-save off — click to enable"}
          >
            <Save size={13} />
            {autoSave ? "Auto-save on" : "Auto-save off"}
          </button>
          <button
            onClick={handlePrettify}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Wand2 size={13} />
            Prettify
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={monacoLang}
          theme={editorTheme}
          value={code}
          onChange={(val) => {
            const v = val ?? "";
            setCode(v);
            lsSave(problem.id, language, v);
            isDirty.current = true;
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              const uuid = localStorage.getItem("vibe_user_id");
              if (uuid) persist(uuid, latestLang.current, latestCode.current);
            });
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
        <>
          {/* Vertical drag handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              resizingResults.current = true;
              resizeStartY.current = e.clientY;
              resizeStartHeight.current = resultsHeight;
              document.body.style.userSelect = "none";
              document.body.style.cursor = "row-resize";
            }}
            onDoubleClick={() => setResultsHeight(220)}
            title="Drag to resize · Double-click to reset"
            className="h-1 shrink-0 cursor-row-resize group relative bg-zinc-800 hover:bg-indigo-500 transition-colors border-t border-zinc-800 z-10"
          >
            <div className="absolute -top-1.5 -bottom-1.5 inset-x-0" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.75 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="block w-0.75 h-0.75 rounded-full bg-indigo-300" />
              ))}
            </div>
          </div>

          <div
            style={{ height: resultsHeight }}
            className="overflow-y-auto shrink-0 p-4"
          >
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
        </>
      )}
    </div>
  );
}
