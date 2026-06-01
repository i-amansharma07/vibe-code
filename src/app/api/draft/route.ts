import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get("uuid");
  const problemId = searchParams.get("problemId");
  const language = searchParams.get("language");

  if (!uuid || !problemId || !language) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { uuid } });
  if (!user) return NextResponse.json({ code: null });

  const draft = await prisma.draft.findUnique({
    where: { userId_problemId_language: { userId: user.id, problemId, language } },
  });

  return NextResponse.json({ code: draft?.code ?? null });
}

export async function PUT(req: NextRequest) {
  try {
    const { userUuid, problemId, language, code } = await req.json();

    if (!userUuid || !problemId || !language || code === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { uuid: userUuid },
      update: {},
      create: { uuid: userUuid },
    });

    await prisma.draft.upsert({
      where: { userId_problemId_language: { userId: user.id, problemId, language } },
      update: { code },
      create: { userId: user.id, problemId, language, code },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Draft save error:", err);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
