import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildPhoneVariantsFromQuery(raw: string): string[] {
  const v = new Set<string>();
  const trimmed = raw.trim();
  if (trimmed) v.add(trimmed);

  const noSpaces = trimmed.replace(/\s+/g, "");
  if (noSpaces) v.add(noSpaces);

  const digitsOnly = noSpaces.replace(/[^\d]/g, "");
  if (digitsOnly) {
    v.add(digitsOnly);
    if (digitsOnly.startsWith("421")) v.add(digitsOnly.slice(3));
    if (digitsOnly.startsWith("0")) v.add(digitsOnly.replace(/^0+/, ""));
  }

  return Array.from(v).filter(Boolean);
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    let where: any = {};

    if (search) {
      const variants = buildPhoneVariantsFromQuery(search);

      where = {
        OR: [
          { name: { contains: search } },      // ❌ mode törölve
          { email: { contains: search } },
          { address: { contains: search } },
          {
            OR: variants.map((p) => ({
              phone: { contains: p },          // ❌ mode törölve
            })),
          },
        ],
      };
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, guests });

  } catch (error) {
    console.error("GET /api/guests ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a vendégek lekérésekor." },
      { status: 500 }
    );
  }
}
