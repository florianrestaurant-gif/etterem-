import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET – összes étterem listázása
export async function GET() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ ok: true, data: restaurants });
}

// POST – új étterem létrehozása
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, phone } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { ok: false, error: "Név és slug kötelező." },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        phone: phone ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: restaurant });
  } catch (e) {
    console.error("POST /api/restaurants error:", e);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
