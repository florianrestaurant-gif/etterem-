// src/lib/shifts.ts
import { prisma } from "@/lib/prisma";
import { ShiftType } from "@/types/shift";

function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOrCreateTodayShift(
  restaurantId: string,
  type: ShiftType = "MORNING",
) {
  const today = getStartOfDay();

  const shift = await prisma.shift.upsert({
    where: {
      restaurantId_date_type: {
        restaurantId,
        date: today,
        type,
      },
    },
    update: {},
    create: {
      restaurantId,
      date: today,
      type,
    },
  });

  const itemsCount = await prisma.shiftChecklistItem.count({
    where: { shiftId: shift.id },
  });

  if (itemsCount === 0) {
    const templates = await prisma.checklistTemplate.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: "asc" },
    });

    if (templates.length > 0) {
      await prisma.$transaction(
        templates.map((t) =>
          prisma.shiftChecklistItem.create({
            data: {
              shiftId: shift.id,
              templateId: t.id,
            },
          }),
        ),
      );
    }
  }

  // 🔽 IDE jön az új include: doneBy
  const checklistItems = await prisma.shiftChecklistItem.findMany({
    where: { shiftId: shift.id },
    include: {
      template: true,
      doneBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      template: {
        sortOrder: "asc",
      },
    },
  });

  return { shift, checklistItems };
}
