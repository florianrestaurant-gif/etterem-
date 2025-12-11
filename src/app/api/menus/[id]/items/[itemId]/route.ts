import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string; itemId: string }>;
};

type UpdateItemBody = {
  dayIndex?: number;
  titleHU?: string;
  titleSK?: string;
  descHU?: string;
  descSK?: string;
  priceCents?: number;
  allergens?: string;

  // ÚJ MEZŐK:
  menuLabel?: string;
  courseType?: "soup" | "main" | "dessert" | "other" | null;
  allWeek?: boolean;
};

// PATCH – menü tétel módosítása
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: menuId, itemId } = await params;

    const body = (await req.json()) as UpdateItemBody;

    // Ellenőrizzük, hogy a tétel tényleg ehhez a menühöz tartozik
    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { menu: true },
    });

    if (!existing || existing.menuId !== menuId) {
      return NextResponse.json(
        { ok: false, error: "Menu item not found for this menu" },
        { status: 404 }
      );
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        dayIndex: body.dayIndex ?? existing.dayIndex,
        titleHU: body.titleHU ?? existing.titleHU,
        titleSK: body.titleSK ?? existing.titleSK,
        descHU: body.descHU ?? existing.descHU,
        descSK: body.descSK ?? existing.descSK,
        priceCents: body.priceCents ?? existing.priceCents,
        allergens: body.allergens ?? existing.allergens,

        // ÚJ MEZŐK KEZELÉSE:
        menuLabel:
          body.menuLabel !== undefined
            ? body.menuLabel
            : existing.menuLabel,
        courseType:
          body.courseType !== undefined
            ? body.courseType
            : existing.courseType,
        allWeek:
          body.allWeek !== undefined
            ? body.allWeek
            : existing.allWeek,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error(
      "[PATCH /api/menus/[id]/items/[itemId]] ERROR:",
      error
    );
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// DELETE – (következő lépésnél jól fog jönni)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: menuId, itemId } = await params;

    const existing = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.menuId !== menuId) {
      return NextResponse.json(
        { ok: false, error: "Menu item not found for this menu" },
        { status: 404 }
      );
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[DELETE /api/menus/[id]/items/[itemId]] ERROR:",
      error
    );
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
