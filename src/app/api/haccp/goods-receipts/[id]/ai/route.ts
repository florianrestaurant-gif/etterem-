import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { promises as fs } from "fs";

import { prisma } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { parseGoodsReceiptFromImage } from "@/lib/ai";

export const runtime = "nodejs";

type RouteParams = {
  params: { id: string };
};

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

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Nincs étterem kapcsolva a felhasználóhoz." },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó áruátvétel azonosító (id)." },
        { status: 400 }
      );
    }

    const receipt = await prisma.goodsReceipt.findUnique({
      where: { id },
      select: {
        id: true,
        restaurantId: true,
        documentUrl: true,
      },
    });

    if (!receipt || receipt.restaurantId !== restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Nem található ilyen áruátvétel ennél az étteremnél." },
        { status: 404 }
      );
    }

    if (!receipt.documentUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ehhez az áruátvételhez nincs feltöltött dokumentum (dodací list fotó).",
        },
        { status: 400 }
      );
    }

    // documentUrl pl. "/uploads/goods-receipts/123.jpg"
    // => abs: "<project>/public/uploads/goods-receipts/123.jpg"
    const relative = receipt.documentUrl.replace(/^\/+/, ""); // remove leading /
    const absPath = path.join(process.cwd(), "public", relative);
    const normalized = path.normalize(absPath);

    // extra safety: csak public alól engedjük
    const publicRoot = path.join(process.cwd(), "public") + path.sep;
    if (!normalized.startsWith(publicRoot)) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen documentUrl útvonal." },
        { status: 400 }
      );
    }

    // fájl létezik?
    try {
      await fs.access(normalized);
    } catch {
      return NextResponse.json(
        { ok: false, error: "A feltöltött dokumentum fájl nem található a szerveren." },
        { status: 404 }
      );
    }

    // 🔍 AI feldolgozás
    const aiResult = await parseGoodsReceiptFromImage(normalized);

    // mentés
    const updated = await prisma.goodsReceipt.update({
      where: { id },
      data: {
        documentParsed: true,
        parsedJson: aiResult as any,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, aiResult, receiptId: updated.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/haccp/goods-receipts/[id]/ai ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt a dokumentum AI feldolgozása közben." },
      { status: 500 }
    );
  }
}
