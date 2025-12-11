import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Telefonszám normalizálása (szóközök törlése, vezető 0 levágása)
function normalizePhone(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, "").replace(/^\+?421/, "").replace(/^0+/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      guestId?: string | null;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      place?: string | null;
      note?: string | null;
      soup?: number | null;
      menu1?: number | null;
      menu2?: number | null;
      menu3?: number | null;
      menu4?: number | null;
      businessMenu?: number | null;
      dessert?: number | null;
      totalPrice?: number | null;
      deliveryDate?: string | null;
    };

    // --------------------------------------
    // 1) Vendég ID / keresés / létrehozás
    // --------------------------------------
    let guestId = body.guestId ?? null;

    if (!guestId && body.phone) {
      const normalizedPhone = normalizePhone(body.phone);

      // Vendég keresése telefon alapján
      let guest = await prisma.guest.findFirst({
        where: { phone: normalizedPhone },
      });

      // Ha nincs → létrehozzuk
      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            name: body.name || null,
            phone: normalizedPhone,
            email: body.email || null,
            address: body.address || null,
          },
        });
      }

      guestId = guest.id;
    }

    // --------------------------------------
    // 2) Rendelés mentése
    // --------------------------------------
    const deliveryDate = body.deliveryDate
      ? new Date(body.deliveryDate)
      : new Date();

    const order = await prisma.deliveryOrder.create({
      data: {
        guestId: guestId ?? undefined,

        phone: body.phone ?? null,
        address: body.address ?? null,
        place: body.place ?? null,
        note: body.note ?? null,

        soup: body.soup ?? null,
        menu1: body.menu1 ?? null,
        menu2: body.menu2 ?? null,
        menu3: body.menu3 ?? null,
        menu4: body.menu4 ?? null,
        businessMenu: body.businessMenu ?? null,
        dessert: body.dessert ?? null,

        totalPrice: body.totalPrice ?? null,
        deliveryDate,
      },
    });

    return NextResponse.json({ ok: true, order });

  } catch (error) {
    console.error("POST /api/delivery/orders ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Hiba történt a rendelés mentésekor. (API error)",
      },
      { status: 500 }
    );
  }
}
