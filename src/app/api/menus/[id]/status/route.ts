import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type UpdateStatusBody = {
  status: "draft" | "scheduled" | "published" | "archived";
};

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await req.json()) as UpdateStatusBody;

    if (!body.status) {
      return NextResponse.json(
        { ok: false, error: "Missing status" },
        { status: 400 }
      );
    }

    const menu = await prisma.menuWeek.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json({ ok: true, data: menu });
  } catch (error) {
    console.error("[PATCH /api/menus/[id]/status] ERROR:", error);
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
