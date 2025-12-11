// src/app/api/delivery/pricing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

type PriceBody = {
  soupPrice?: number | null;
  menu1Price?: number | null;
  menu2Price?: number | null;
  menu3Price?: number | null;
  menu4Price?: number | null;
  businessMenuPrice?: number | null;
  dessertPrice?: number | null;
};

async function getRestaurantIdForUser(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
  });
  return membership?.restaurantId ?? null;
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Nem vagy bejelentkezve." },
        { status: 401 }
      );
    }

    const { id: userId } = session.user as { id: string };

    const restaurantId = await getRestaurantIdForUser(userId);
    if (!restaurantId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nem található étterem a felhasználóhoz.",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as PriceBody;

    const clean = (value: number | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      if (!Number.isFinite(value)) return null;
      return value;
    };

    const data = {
      soupPrice: clean(body.soupPrice ?? null),
      menu1Price: clean(body.menu1Price ?? null),
      menu2Price: clean(body.menu2Price ?? null),
      menu3Price: clean(body.menu3Price ?? null),
      menu4Price: clean(body.menu4Price ?? null),
      businessMenuPrice: clean(body.businessMenuPrice ?? null),
      dessertPrice: clean(body.dessertPrice ?? null),
    };

    const existing = await prisma.deliveryPriceConfig.findFirst({
      where: { restaurantId },
    });

    if (existing) {
      await prisma.deliveryPriceConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.deliveryPriceConfig.create({
        data: {
          restaurantId,
          ...data,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/delivery/pricing ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az árlista mentésekor." },
      { status: 500 }
    );
  }
}
