import { NextRequest, NextResponse } from "next/server";
import { SHIFT_TYPES, ShiftType } from "@/types/shift";
import { getOrCreateTodayShift } from "@/lib/shifts";

type RouteContext = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    // 🔑 Itt bontjuk ki a Promise-t
    const { restaurantId } = await ctx.params;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Missing restaurantId in URL." },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type") as ShiftType | null;

    const type: ShiftType =
      typeParam && SHIFT_TYPES.includes(typeParam)
        ? typeParam
        : "MORNING";

    const { shift, checklistItems } = await getOrCreateTodayShift(
      restaurantId,
      type
    );

    return NextResponse.json({ shift, checklistItems });
  } catch (error) {
    console.error(
      'GET /api/restaurants/[restaurantId]/shifts/today error',
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
