// src/app/api/haccp/daily-checklists/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/auth";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

export const runtime = "nodejs"; // fs miatt fontos (ne edge runtime legyen)

function safeExt(fileName: string) {
  const ext = (path.extname(fileName) || "").toLowerCase();

  // engedélyezett kiterjesztések (biztonság)
  const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  return allowed.has(ext) ? ext : ".jpg";
}

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const itemId = formData.get("itemId");
    const file = formData.get("file");

    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId kötelező." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Hiányzik a fotó (file)." }, { status: 400 });
    }

    // ownership check (a tétel a saját étteremhez tartozik-e)
    const item = await prisma.dailyChecklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: true },
    });

    if (!item || item.checklist.restaurantId !== restaurantId) {
      return NextResponse.json(
        { error: "A tétel nem található ennél az étteremnél." },
        { status: 404 }
      );
    }

    // fájl beolvasás
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // mentési könyvtár
    const uploadDir = path.join(process.cwd(), "public", "uploads", "daily-checklists");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = safeExt(file.name);
    const randomName = crypto.randomBytes(8).toString("hex");
    const fileName = `${Date.now()}_${randomName}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/daily-checklists/${fileName}`;

    // photoUrls frissítés (CSV string)
    const existing = item.photoUrls
      ? item.photoUrls.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    existing.push(publicUrl);

    const updated = await prisma.dailyChecklistItem.update({
      where: { id: itemId },
      data: {
        photoUrls: existing.join(","),
      },
      select: {
        id: true,
        photoUrls: true,
      },
    });

    return NextResponse.json(
      { ok: true, url: publicUrl, item: updated },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/haccp/daily-checklists/upload-photo ERROR", error);
    return NextResponse.json(
      { error: "Hiba történt a fotó feltöltésekor." },
      { status: 500 }
    );
  }
}
