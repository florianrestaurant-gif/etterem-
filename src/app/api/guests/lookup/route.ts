import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizePhone(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/^0+/, ""); // pl. "0903 123 456" -> "903123456"
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get("phone");

    if (!phoneParam) {
      return NextResponse.json(
        { ok: false, error: "Hiányzik a telefonszám (phone)." },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phoneParam);

    // itt alkalmazkodunk a Prisma Guest modellhez:
    // ha nálad a mező neve phone2, akkor where: { phone2: normalized }
    const guest = await prisma.guest.findFirst({
      where: {
        phone: normalized, // vagy phone2: normalized
      },
      include: {
        deliveryOrders: {
          orderBy: { deliveryDate: "desc" },
          take: 5,
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ ok: true, guest: null });
    }

    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    console.error("GET /api/guests/lookup ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a vendég keresésekor." },
      { status: 500 }
    );
  }
}
