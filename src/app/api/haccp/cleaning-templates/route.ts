import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Ugyanaz a minta, mint a cleaning-lognál
async function resolveRestaurantId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGlobalAdmin: true },
  });
  if (!user) return null;

  const restaurantIdFromQuery = req.nextUrl.searchParams.get("restaurantId");

  // Global admin: ha adsz restaurantId-t query-ben, azt használjuk
  if (user.isGlobalAdmin && restaurantIdFromQuery) return restaurantIdFromQuery;

  // Egyébként: első membership étterem
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, restaurantId: { not: null } },
    select: { restaurantId: true },
    orderBy: { id: "asc" },
  });

  return membership?.restaurantId ?? null;
}

// ─────────────────────────────────────────────
// GET – sablonok listázása
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.cleaningTemplate.findMany({
      where: { restaurantId },
      orderBy: [{ isActive: "desc" }, { task: "asc" }],
    });

    return NextResponse.json({ items: templates });
  } catch (error) {
    console.error("[CLEANING_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási sablonok lekérése során." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST – új sablon létrehozása
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      task?: string;
      description?: string;
      monday?: boolean;
      tuesday?: boolean;
      wednesday?: boolean;
      thursday?: boolean;
      friday?: boolean;
      saturday?: boolean;
      sunday?: boolean;
      isActive?: boolean;
    };

    const task = (body.task ?? "").trim();
    if (!task) {
      return NextResponse.json(
        { error: "A feladat megadása kötelező." },
        { status: 400 }
      );
    }

    const anyDay =
      !!body.monday ||
      !!body.tuesday ||
      !!body.wednesday ||
      !!body.thursday ||
      !!body.friday ||
      !!body.saturday ||
      !!body.sunday;

    if (!anyDay) {
      return NextResponse.json(
        { error: "Legalább egy napot ki kell választani." },
        { status: 400 }
      );
    }

    const created = await prisma.cleaningTemplate.create({
      data: {
        restaurantId,
        task,
        description: body.description?.trim() ? body.description.trim() : null,
        monday: !!body.monday,
        tuesday: !!body.tuesday,
        wednesday: !!body.wednesday,
        thursday: !!body.thursday,
        friday: !!body.friday,
        saturday: !!body.saturday,
        sunday: !!body.sunday,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (error) {
    console.error("[CLEANING_TEMPLATES_POST]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási sablon létrehozása során." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// PATCH – aktiválás / tiltás
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { id?: string; isActive?: boolean };

    if (!body.id) {
      return NextResponse.json(
        { error: "Hiányzó azonosító (id) a frissítéshez." },
        { status: 400 }
      );
    }

    const existing = await prisma.cleaningTemplate.findFirst({
      where: { id: body.id, restaurantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "A sablon nem található." }, { status: 404 });
    }

    const updated = await prisma.cleaningTemplate.update({
      where: { id: existing.id },
      data: {
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    console.error("[CLEANING_TEMPLATES_PATCH]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási sablon frissítése során." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// DELETE – sablon törlése
// (itt checklist-template mintára: id query param)
// ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó id paraméter." },
        { status: 400 }
      );
    }

    const existing = await prisma.cleaningTemplate.findFirst({
      where: { id, restaurantId },
    });

    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.cleaningTemplate.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CLEANING_TEMPLATES_DELETE]", error);
    return NextResponse.json(
      { error: "Hiba történt a takarítási sablon törlése során." },
      { status: 500 }
    );
  }
}
