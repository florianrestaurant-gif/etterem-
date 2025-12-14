import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ──────────────────────────────
// GET – meglévő sablonok listázása
// ──────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    // FONTOS: ne req-ből, hanem session/membership alapján
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Nincs étterem kapcsolva a felhasználóhoz." },
        { status: 401 }
      );
    }

    const items = await prisma.checklistTemplate.findMany({
      where: { restaurantId },
      orderBy: [{ checklistType: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[CHECKLIST_TEMPLATES_GET]", error);
    return NextResponse.json(
      { error: "Hiba történt a sablonok betöltésekor." },
      { status: 500 }
    );
  }
}

// ──────────────────────────────
// POST – új sablon(ok) mentése
// (több nap = több sor a táblában)
// ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "Nincs étterem." }, { status: 401 });
    }

    const body = (await req.json()) as {
      label: string;
      type: "OPENING" | "CLOSING";
      group: string;
      zone: string;
      role: string;
      days: number[];
      sortOrder?: number;
      isActive?: boolean;
    };

    const label = (body.label ?? "").trim();
    const days = Array.isArray(body.days) ? body.days : [];

    if (!label || days.length === 0) {
      return NextResponse.json(
        { error: "A megnevezés és legalább egy nap kötelező." },
        { status: 400 }
      );
    }

    // nap validálás (0..6)
    const invalidDay = days.find((d) => typeof d !== "number" || d < 0 || d > 6);
    if (invalidDay != null) {
      return NextResponse.json(
        { error: "Érvénytelen nap (csak 0..6 elfogadott)." },
        { status: 400 }
      );
    }

    const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    // Több nap = több sor
    const dataToCreate: Prisma.ChecklistTemplateCreateInput[] = days.map((d) => ({
      restaurant: { connect: { id: restaurantId } },
      label,
      // ezek nálad enumok a Prisma-ban, de a UI stringet ad:
      // ha szeretnéd, itt később tudunk szigorú validálást is csinálni.
      group: body.group as any,
      zone: body.zone as any,
      role: body.role as any,
      checklistType: body.type as any,
      dayOfWeek: d,
      sortOrder,
      isActive,
    }));

    const created = await prisma.$transaction(
      dataToCreate.map((data) =>
        prisma.checklistTemplate.create({
          data,
        })
      )
    );

    return NextResponse.json({ ok: true, items: created });
  } catch (error) {
    console.error("[CHECKLIST_TEMPLATES_POST]", error);
    return NextResponse.json(
      { error: "Hiba történt a mentés során." },
      { status: 500 }
    );
  }
}

// ──────────────────────────────
// DELETE – sablon törlése
// Azonos label+type+group+zone+role összes napját töröljük
// ──────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId();
    if (!restaurantId) {
      return NextResponse.json({ error: "Nincs étterem." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Hiányzó id paraméter." },
        { status: 400 }
      );
    }

    const template = await prisma.checklistTemplate.findFirst({
      where: { id, restaurantId },
    });

    if (!template) {
      return NextResponse.json({ ok: true });
    }

    await prisma.checklistTemplate.deleteMany({
      where: {
        restaurantId,
        label: template.label,
        group: template.group,
        zone: template.zone,
        role: template.role,
        checklistType: template.checklistType,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CHECKLIST_TEMPLATES_DELETE]", error);
    return NextResponse.json(
      { error: "Hiba történt a törlés során." },
      { status: 500 }
    );
  }
}
