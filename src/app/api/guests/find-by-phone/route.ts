import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";

  // 00421..., +421..., 421..., 09...
  if (digits.startsWith("421")) {
    return digits.slice(3); // 4219xxxxx -> 9xxxxx
  }
  if (digits.startsWith("0")) {
    return digits.replace(/^0+/, ""); // 0918... -> 918...
  }
  return digits;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get("phone");

    if (!phoneParam) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó telefonszám paraméter." },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phoneParam);

    const guest = await prisma.guest.findFirst({
      where: {
        OR: [
          { phone: phoneParam },
          { phone: normalizePhone(phoneParam) },
          { phone: normalized },
        ],
      },
    });

    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    console.error("GET /api/guests/find-by-phone ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a vendég keresésekor." },
      { status: 500 }
    );
  }
}
