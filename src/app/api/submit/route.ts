import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeCode } from "@/lib/piston";
import { randomMessage } from "@/lib/messages";

export async function POST(req: NextRequest) {
  try {
    const { problemId, language, code, userUuid } = await req.json();

    if (!problemId || !language || !code || !userUuid) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: { orderBy: { id: "asc" } },
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
    const allPassed = passedCount === results.length;

    const user = await prisma.user.upsert({
      where: { uuid: userUuid },
      update: {},
      create: { uuid: userUuid },
    });

    await prisma.submission.create({
      data: {
        userId: user.id,
        problemId: problem.id,
        language,
        code,
        passed: allPassed,
        passedAt: allPassed ? new Date() : null,
      },
    });

    return NextResponse.json({
      passed: allPassed,
      results,
      message: randomMessage(allPassed),
      passedCount,
      totalCount: results.length,
    });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Submission failed. Is Piston running?" },
      { status: 500 }
    );
  }
}
