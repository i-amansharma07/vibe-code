import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Path to Node.js installed via NVM (falls back to system node)
const NVM_NODE =
  process.env.NVM_NODE_PATH ||
  join(process.env.HOME || "", ".nvm/versions/node/v20.20.2/bin/node");

function buildJsDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
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
  testCases: { input: unknown[]; expected: unknown }[]
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

export async function executeCode(
  language: "javascript" | "python",
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
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
  const ext = isJs ? "js" : "py";
  const tmpFile = join(tmpdir(), `vibe-exec-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

  const fullCode = isJs
    ? buildJsDriver(userCode, fnName, testCases)
    : buildPyDriver(userCode, fnName, testCases);

  try {
    await writeFile(tmpFile, fullCode, "utf8");

    let stdout: string;
    let stderr: string;

    if (isJs) {
      // Use NVM node if available, otherwise system node
      const nodeCmd = await checkFile(NVM_NODE) ? NVM_NODE : "node";
      ({ stdout, stderr } = await execFileAsync(nodeCmd, [tmpFile], {
        timeout: 5000,
        env: { ...process.env, NODE_PATH: "" },
      }).catch((e) => ({ stdout: e.stdout || "", stderr: e.stderr || e.message })));
    } else {
      ({ stdout, stderr } = await execFileAsync("python3", [tmpFile], {
        timeout: 5000,
      }).catch((e) => ({ stdout: e.stdout || "", stderr: e.stderr || e.message })));
    }

    if (stderr && !stdout) {
      const lastLine = stderr.trim().split("\n").pop() || stderr;
      return {
        results: testCases.map((tc) => ({
          passed: false,
          input: tc.input,
          expected: tc.expected,
          output: null,
          error: lastLine,
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
          error: "Could not parse output",
        })),
      };
    }
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

async function checkFile(path: string): Promise<boolean> {
  try {
    const { access } = await import("fs/promises");
    await access(path);
    return true;
  } catch {
    return false;
  }
}
