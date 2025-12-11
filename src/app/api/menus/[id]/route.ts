// src/app/api/menus/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Next 16-ban a context.params egy Promise lehet → await-oljuk
type RouteParams = {
  params: Promise<{ id: string }>;
};

// Heti menü lekérése ID alapján
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params; // 🔴 EZ VOLT A LÉNYEG
    const menuId = id;

    const menu = await prisma.menuWeek.findUnique({
      where: { id: menuId },
      include: {
        items: {
          orderBy: { dayIndex: "asc" },
        },
        restaurant: true,
      },
    });

    if (!menu) {
      return NextResponse.json(
        { ok: false, error: "Menu not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: menu }, { status: 200 });
  } catch (e) {
    console.error("[GET /api/menus/[id]] error:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
