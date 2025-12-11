import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/db";

//
// TYPES
//
type RouteParams = {
  params: Promise<{ id: string }>;
};

type CreateItemBody = {
  dayIndex: number;      // 0–6
  titleHU: string;
  titleSK: string;
  descHU?: string;
  descSK?: string;
  priceCents: number;
  allergens?: string;

  // ÚJ:
  menuLabel?: string;
  courseType?: "soup" | "main" | "dessert" | "other";
  allWeek?: boolean;
};

// POST – Menü tétel létrehozása
//
export async function POST(req: Request, { params }: RouteParams) {
  try {
    //
    // 1) Session ellenőrzés
    //
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    //
    // 2) Paraméter kinyerése (Next.js 15-ben Promise!)
    //
    const { id } = await params;
    const menuId = id;

    //
    // 3) Body feldolgozása
    //
    const body = (await req.json()) as CreateItemBody;

    if (!body.titleHU || !body.dayIndex.toString()) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    //
    // 4) Ellenőrizzük, hogy a MENU létezik-e
    //
    const menu = await prisma.menuWeek.findUnique({
      where: { id: menuId },
      include: { restaurant: true },
    });

    if (!menu) {
      return NextResponse.json(
        { ok: false, error: "Menu not found" },
        { status: 404 }
      );
    }

    //
    // 5) (opcionális) jogosultság-ellenőrzés
    // TODO: Ha kell, megnézzük, hogy a user tagja-e a restaurantnak
    //

    //
    // 6) Új tétel mentése
    //
    const newItem = await prisma.menuItem.create({
  data: {
    menuId: menu.id,
    dayIndex: body.dayIndex,
    titleHU: body.titleHU,
    titleSK: body.titleSK ?? "",
    descHU: body.descHU ?? "",
    descSK: body.descSK ?? "",
    priceCents: body.priceCents,
    allergens: body.allergens ?? "",

    menuLabel: body.menuLabel ?? null,
    courseType: body.courseType ?? null,
    allWeek: body.allWeek ?? false,
  },
});


    //
    // 7) Sikeres válasz
    //
    return NextResponse.json({ ok: true, data: newItem }, { status: 201 });

  } catch (error) {
    console.error("[POST /api/menus/[id]/items] ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
