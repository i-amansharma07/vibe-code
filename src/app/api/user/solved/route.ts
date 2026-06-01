import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const uuid = req.nextUrl.searchParams.get("uuid");

  if (!uuid) {
    return NextResponse.json({ solvedIds: [] });
  }

  const user = await prisma.user.findUnique({
    where: { uuid },
    include: {
      submissions: {
        where: { passed: true },
        select: { problemId: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ solvedIds: [] });
  }

  const solvedIds = [...new Set(user.submissions.map((s) => s.problemId))];
  return NextResponse.json({ solvedIds });
}
