"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftPercent?: number;
}

export function ResizableLayout({ left, right, defaultLeftPercent = 42 }: Props) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftPercent);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = leftWidth;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [leftWidth]
  );

  const onDoubleClick = useCallback(() => {
    setLeftWidth(defaultLeftPercent);
  }, [defaultLeftPercent]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      const pct = startWidth.current + ((e.clientX - startX.current) / width) * 100;
      setLeftWidth(Math.min(75, Math.max(20, pct)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
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

  if (!isDesktop) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full">
        <div className="border-b border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          {left}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {right}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-row h-full min-h-0 w-full">
      {/* Left panel */}
      <div
        style={{ width: `${leftWidth}%`, minWidth: 280 }}
        className="flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800"
      >
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        title="Drag to resize · Double-click to reset"
        className="w-1 shrink-0 cursor-col-resize group relative bg-zinc-800 hover:bg-indigo-500 transition-colors z-10"
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.75 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="block w-0.75 h-0.75 rounded-full bg-indigo-300" />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {right}
      </div>
    </div>
  );
}
