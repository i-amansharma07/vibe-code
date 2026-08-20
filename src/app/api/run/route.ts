import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeCode } from "@/lib/piston";

export async function POST(req: NextRequest) {
  try {
    const { problemId, language, code } = await req.json();

    if (!problemId || !language || !code) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          where: { isVisible: true },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const fnName =
      language === "javascript" ? problem.fnNameJs : problem.fnNamePy;

    const testCases = problem.testCases.map((tc) => ({
      input: tc.input as unknown[],
      expected: tc.expected,
    }));

    const { results } = await executeCode(language, code, fnName, testCases);    

    const passedCount = results.filter((r) => r.passed).length;

    return NextResponse.json({
      results,
      passedCount,
      totalCount: results.length,
    });
  } catch (err) {
    console.error("Run error:", err);
    return NextResponse.json(
      { error: "Execution failed. Is Piston running?" },
      { status: 500 }
    );
  }
}
