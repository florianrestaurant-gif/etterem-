import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type OrderType = "FOOD_ORDER" | "RESERVATION";

type CreateOrderBody = {
  restaurantSlug: string;
  menuId?: string;
  type: OrderType;
  customerName: string;
  phone: string;
  peopleCount?: number;
  note?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    if (!body.restaurantSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing restaurant slug" },
        { status: 400 }
      );
    }
    if (!body.customerName?.trim() || !body.phone?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Név és telefonszám kötelező." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: body.restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const order = await prisma.menuOrder.create({
      data: {
        restaurantId: restaurant.id,
        menuId: body.menuId ?? null,
        type: body.type,
        customerName: body.customerName.trim(),
        phone: body.phone.trim(),
        peopleCount: body.peopleCount ?? null,
        note: body.note ?? "",
      },
    });

    return NextResponse.json({ ok: true, data: order }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/orders] ERROR:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
