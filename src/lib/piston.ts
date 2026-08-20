interface PistonFile {
  name?: string;
  content: string;
  encoding?: string;
}

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonStageResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  signal: string | null;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: PistonStageResult;
  compile?: PistonStageResult;
}

interface SandboxExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
}

const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";

const RUNTIME_CONFIG = {
  javascript: {
    language: "javascript",
    version: "18.15.0",
    filename: "index.js",
  },
  python: {
    language: "python",
    version: "3.10.0",
    filename: "main.py",
  },
} as const;

async function executeInPiston(
  language: "javascript" | "python",
  code: string,
): Promise<SandboxExecutionResponse> {
  const config = RUNTIME_CONFIG[language];

  const payload: PistonExecuteRequest = {
    language: config.language,
    version: config.version,
    files: [{ name: config.filename, content: code }],
    run_timeout: 3000,
    compile_timeout: 3000,
  };

  let res: Response;
  try {
    res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      `Failed to reach Piston execution service at ${PISTON_URL}. Is Docker running? 
      (${error instanceof Error ? error.message : "Network error"})`,
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Piston API error 
      (${res.status} ${res.statusText}): ${errorText}`);
  }

  const data: PistonExecuteResponse = await res.json();

  //if code crashes and dont get executed
  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: data.compile.stdout || "",
      stderr: data.compile.stderr || data.compile.output || "Compilation Error",
      exitCode: data.compile.code,
      signal: data.compile.signal,
    };
  }

  return {
    stdout: data.run.stdout || "",
    stderr: data.run.stderr || "",
    exitCode: data.run.code,
    signal: data.run.signal,
  };
}

function buildJsDriver(
  userCode: string, //source code
  fnName: string, //function name which will be called by our driver
  testCases: { input: unknown[]; expected: unknown }[],
): string {
  const testData = JSON.stringify(testCases);
  return `
${userCode}

const __testCases = ${testData};
const __results = __testCases.map(__tc => {
  try {
    const __output = ${fnName}(...__tc.input);
    const __passed = JSON.stringify(__output) === JSON.stringify(__tc.expected);
    return { passed: __passed, input: __tc.input, expected: __tc.expected, output: __output };
  } catch (__e) {
    return { passed: false, input: __tc.input, expected: __tc.expected, output: null, error: __e.message };
  }
});
process.stdout.write(JSON.stringify(__results));
`;
}

function buildPyDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[],
): string {
  const testData = JSON.stringify(testCases);
  return `
import json as __json, sys as __sys

${userCode}

__test_cases = ${testData}
__results = []
for __tc in __test_cases:
    try:
        __output = ${fnName}(*__tc["input"])
        __passed = __output == __tc["expected"]
        __results.append({"passed": __passed, "input": __tc["input"], "expected": __tc["expected"], "output": __output})
    except Exception as __e:
        __results.append({"passed": False, "input": __tc["input"], "expected": __tc["expected"], "output": None, "error": str(__e)})

__sys.stdout.write(__json.dumps(__results))
`;
}

function cleanErrorMessage(
  stderr: string,
  language: "javascript" | "python",
  userCodeLineOffset: number,
): string {
  const lines = stderr.trim().split("\n");

  if (language === "javascript") {
    // Extract line number from the leading "filepath:LINE" or "filepath:LINE:COL" header
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/^.*\.js:(\d+)(?::\d+)?$/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    // Find the typed error message, e.g. "SyntaxError: Unexpected token '{'"
    const errorLine = lines.find((l) => /^\w+Error:/.test(l.trim()));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    // Fallback: drop internal "at ..." stack frames, return first meaningful lines
    const meaningful = lines
      .filter((l) => l.trim() && !/^\s+at\s/.test(l))
      .slice(0, 4)
      .join("\n");
    return meaningful || stderr.trim();
  } else {
    // Python: "  File "...", line X"
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/File ".*", line (\d+)/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    // Last non-indented line is the error message
    const errorLine = [...lines]
      .reverse()
      .find((l) => l.trim() && !/^\s/.test(l));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    return stderr.trim();
  }
}

export async function executeCode(
  language: "javascript" | "python",
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[],
): Promise<{
  results: {
    passed: boolean;
    input: unknown[];
    expected: unknown;
    output: unknown;
    error?: string;
  }[];
}> {
  const isJs = language === "javascript";
  const fullCode = isJs
    ? buildJsDriver(userCode, fnName, testCases)
    : buildPyDriver(userCode, fnName, testCases);

  const { stdout, stderr, signal, exitCode } = await executeInPiston(
    language,
    fullCode,
  );

  // OS stop the program mainly due to exceed execution time
  //SIGKILL -> immediately stop, SIGTERM -> stop gracefully(take your time)
  if (signal === "SIGKILL" || signal === "SIGTERM") {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: "Execution Timed Out (Time Limit Exceeded)",
      })),
    };
  }

  //when there are output errors and no output received
  if (stderr && !stdout) {
    const lineOffset = isJs ? 1 : 3;
    const errorMsg = cleanErrorMessage(stderr, language, lineOffset);
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: errorMsg,
      })),
    };
  }

  try {
    const results = JSON.parse(stdout || "[]");
    return { results };
  } catch {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: stderr
          ? cleanErrorMessage(stderr, language, isJs ? 1 : 3)
          : "Could not parse output",
      })),
    };
  }
}