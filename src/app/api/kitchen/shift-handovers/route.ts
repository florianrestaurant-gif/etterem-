// src/app/api/kitchen/shift-handovers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type ShiftType = "MORNING" | "AFTERNOON" | "EVENING" | "OTHER";
type WeekType = "SHORT" | "LONG";
type PrepStatusClient = "OK" | "LOW" | "OUT" | "DISCARD";

type FormState = {
  date: string;
  shiftType: ShiftType;
  miseEnPlace: string;
  tasksSummary: string;
  warnings: string;
  cleanliness: string;
  nextShiftExpectations: string;
  chefNote: string;
};

type MenuPrepRow = {
  code: "MENU1" | "MENU2" | "MENU3" | "MENU4" | "MENU5" | "SOUP" | "DESSERT";
  label: string;
  status: PrepStatusClient;
  note: string;
};

type HandoverRequestPayload = FormState & {
  prepForDate: string | null;
  weekType: WeekType;
  menus: MenuPrepRow[];
  alaCartePrep: string;
  specialsPrep: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Nincs bejelentkezett felhasználó." },
      { status: 401 },
    );
  }

  const body = (await req.json()) as HandoverRequestPayload;

  const {
    date,
    shiftType,
    tasksSummary,
    warnings,
    cleanliness,
    nextShiftExpectations,
    chefNote,
    prepForDate,
    menus,
    alaCartePrep,
    specialsPrep,
  } = body;

  // Aktuális étterem
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { restaurantId: true },
  });

  const restaurantId = membership?.restaurantId;
  if (!restaurantId) {
    return NextResponse.json(
      { ok: false, error: "Nincs étterem hozzárendelve a felhasználóhoz." },
      { status: 400 },
    );
  }

  const shiftDate = new Date(date);
  const prepDate = prepForDate ? new Date(prepForDate) : null;

  // 1) Műszak felkutatása / létrehozása
  const shift = await prisma.shift.upsert({
    where: {
      restaurantId_date_type: {
        restaurantId,
        date: shiftDate,
        type: shiftType,
      },
    },
    update: {},
    create: {
      restaurantId,
      date: shiftDate,
      type: shiftType,
      status: "OPEN", // vagy HANDOVER_PENDING / CLOSED, ahogy logikusan illik
      responsibleId: session.user.id,
    },
  });

  // 2) Menü alapú ShiftPrepItem-ek létrehozása
  const prepItemsData = menus.map((m) => ({
    shiftId: shift.id,
    name: m.label, // "Menü 1", "Leves", "Desszert"
    category: "OTHER" as const, // PrepCategory.OTHER
    status: m.status, // PrepStatus enum string (OK/LOW/OUT/DISCARD)
    quantity: null,
    location: null,
    expiryAt: prepDate ?? undefined,
    note: m.note.trim() || null,
  }));

  if (prepItemsData.length > 0) {
    await prisma.shiftPrepItem.createMany({
      data: prepItemsData,
    });
  }

  // á la carte + akciók külön tételekként (ha akarsz ilyet)
  const extraItems: { name: string; note: string }[] = [];
  if (alaCartePrep.trim().length > 0) {
    extraItems.push({ name: "Á la carte előkészítések", note: alaCartePrep });
  }
  if (specialsPrep.trim().length > 0) {
    extraItems.push({ name: "Akciók / speciálok", note: specialsPrep });
  }

  if (extraItems.length > 0) {
    await prisma.shiftPrepItem.createMany({
      data: extraItems.map((item) => ({
        shiftId: shift.id,
        name: item.name,
        category: "OTHER" as const,
        status: "OK" as const,
        quantity: null,
        location: null,
        expiryAt: prepDate ?? undefined,
        note: item.note,
      })),
    });
  }

  // 3) Automatikus mise en place összefoglaló
  const menuSummaryLines = menus.map((m) => {
    const shortStatus =
      m.status === "OK"
        ? "OK"
        : m.status === "LOW"
        ? "Kevés"
        : m.status === "OUT"
        ? "Nincs"
        : "Kidobandó";

    const notePart = m.note.trim().length > 0 ? ` – ${m.note.trim()}` : "";
    return `${m.label}: ${shortStatus}${notePart}`;
  });

  const miseEnPlace = [
    `Előkészítés dátuma (menük): ${
      prepForDate || "nincs megadva"
    }\n`,
    "=== MENÜK ===",
    ...menuSummaryLines,
    "",
    "=== Á LA CARTE ===",
    alaCartePrep.trim().length > 0 ? alaCartePrep.trim() : "-",
    "",
    "=== AKCIÓK / SPECIÁLOK ===",
    specialsPrep.trim().length > 0 ? specialsPrep.trim() : "-",
  ].join("\n");

  // 4) Műszakátadás rögzítése
  await prisma.shiftHandover.create({
    data: {
      shiftId: shift.id,
      restaurantId,
      outgoingUserId: session.user.id,
      status: "SUBMITTED",
      miseEnPlace,
      tasksSummary,
      warnings,
      cleanliness,
      nextShiftExpectations,
      chefNote,
    },
  });

  return NextResponse.json({ ok: true });
}
