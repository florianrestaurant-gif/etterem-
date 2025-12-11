// src/app/api/checklists/[itemId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    itemId: string;
  };
};

type PatchBody = {
  isDone: boolean;
  note?: string;
  doneById?: string | null;
};

export async function PATCH(req: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;

  if (!itemId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const updatedItem = await prisma.shiftChecklistItem.update({
      where: { id: itemId },
      data: {
        isDone: body.isDone,
        note: body.note,
        doneById: body.doneById,
        doneAt: body.doneAt,
      },
      include: {
        template: true,
        doneBy: true,
      },
    });

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error("PATCH /api/checklists/[itemId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
