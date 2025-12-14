import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

/**
 * RestaurantId feloldás:
 * - Global admin: query ?restaurantId=...
 * - Normál user: első membership restaurantId
 */
async function resolveRestaurantId(req: Request): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGlobalAdmin: true },
  });
  if (!user) return null;

  const { searchParams } = new URL(req.url);
  const restaurantIdFromQuery = searchParams.get("restaurantId");

  if (user.isGlobalAdmin && restaurantIdFromQuery) {
    return restaurantIdFromQuery;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, restaurantId: { not: null } },
    select: { restaurantId: true },
    orderBy: { id: "asc" },
  });

  return membership?.restaurantId ?? null;
}

/**
 * DELETE /api/haccp/fridges/[id]
 * - törli a hűtőt
 * - törli az összes hozzá tartozó FridgeLog-ot
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fridgeId = params.id;

    if (!fridgeId) {
      return NextResponse.json(
        { error: "Hiányzó hűtő azonosító (id)." },
        { status: 400 }
      );
    }

    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔎 Megnézzük, hogy a hűtő ehhez az étteremhez tartozik-e
    const fridge = await prisma.fridgeDevice.findUnique({
      where: { id: fridgeId },
      select: { id: true, restaurantId: true },
    });

    if (!fridge || fridge.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "A hűtő nem található ennél az étteremnél." },
        { status: 404 }
      );
    }

    // 🧹 Először töröljük a hozzá tartozó méréseket
    await prisma.fridgeLog.deleteMany({
      where: { fridgeDeviceId: fridgeId },
    });

    // 🗑️ Majd magát a hűtőt
    await prisma.fridgeDevice.delete({
      where: { id: fridgeId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[FRIDGES_DELETE]", error);
    return NextResponse.json(
      { error: "Nem sikerült törölni a hűtőt." },
      { status: 500 }
    );
  }
}
