import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ⬅️ EZ A LÉNYEG: NEM default!
import { ChecklistGroup, KitchenZone, StaffRole } from "@prisma/client";

const BASE_TEMPLATES = [
  // === PREP group ===
  {
    group: ChecklistGroup.PREP,
    zone: KitchenZone.COLD,
    role: StaffRole.COOK,
    label: "Zöldség előkészítés elvégezve",
  },
  {
    group: ChecklistGroup.PREP,
    zone: KitchenZone.HOT,
    role: StaffRole.COOK,
    label: "Köretek előkészítve",
  },
  {
    group: ChecklistGroup.PREP,
    zone: KitchenZone.HOT,
    role: StaffRole.COOK,
    label: "Mártások előkészítése",
  },

  // === CLEANING group ===
  {
    group: ChecklistGroup.CLEANING,
    zone: KitchenZone.HOT,
    role: StaffRole.COOK,
    label: "Sütősor tiszta",
  },
  {
    group: ChecklistGroup.CLEANING,
    zone: KitchenZone.DISHWASH,
    role: StaffRole.HELPER,
    label: "Mosogató pult rendben",
  },
  {
    group: ChecklistGroup.CLEANING,
    zone: KitchenZone.STORAGE,
    role: StaffRole.BOTH,
    label: "Hűtők rendszerezve",
  },
  {
    group: ChecklistGroup.CLEANING,
    zone: KitchenZone.COMMON,
    role: StaffRole.BOTH,
    label: "Padló felmosva",
  },

  // === ADMIN group ===
  {
    group: ChecklistGroup.ADMIN,
    zone: KitchenZone.SERVICE,
    role: StaffRole.COOK,
    label: "Allergén információ frissítve",
  },
  {
    group: ChecklistGroup.ADMIN,
    zone: KitchenZone.SERVICE,
    role: StaffRole.COOK,
    label: "Átadás a következő műszaknak",
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const restaurantId: string | undefined = body.restaurantId;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    // 1) Régi sablonok törlése
    await prisma.checklistTemplate.deleteMany({
      where: { restaurantId },
    });

    // 2) Új sablonok felvitele
    const data = BASE_TEMPLATES.map((t, index) => ({
      restaurantId,
      group: t.group,
      label: t.label,
      zone: t.zone,
      role: t.role,
      dayOfWeek: null,
      sortOrder: index,
      isActive: true,
    }));

    await prisma.checklistTemplate.createMany({ data });

    return NextResponse.json({
      ok: true,
      created: data.length,
    });
  } catch (error) {
    console.error("POST /api/debug/checklist/seed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
