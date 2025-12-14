import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { parseGoodsReceiptFromImage } from "@/lib/ai";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function safeExt(originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

export async function POST(req: NextRequest) {
  let filePathToCleanup: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Hiányzik a fájl (file)." },
        { status: 400 }
      );
    }

    if (typeof file.size === "number" && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `A fájl túl nagy (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB).` },
        { status: 400 }
      );
    }

    const ext = safeExt(file.name);
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Csak JPG/JPEG/PNG/WEBP képet tölthetsz fel." },
        { status: 400 }
      );
    }

    // mentés temp mappába a public alatt (ha kell frontend preview)
    // ha nem kell preview, mehetne simán /tmp is, de nodejs runtime + portability miatt maradunk itt.
    const uploadDir = path.join(process.cwd(), "public", "uploads", "goods-receipts-ai");
    await fs.mkdir(uploadDir, { recursive: true });

    const randomName = crypto.randomBytes(12).toString("hex");
    const fileName = `${Date.now()}_${randomName}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    filePathToCleanup = filePath;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // AI feldolgozás – csak parse, nincs DB
    const parsed: any = await parseGoodsReceiptFromImage(filePath);

    // parser kompatibilitás: items tömböt várunk
    const items = Array.isArray(parsed?.items) ? parsed.items : [];

    return NextResponse.json(
      {
        ok: true,
        items,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/haccp/goods-receipts/ai-upload ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az AI feldolgozás közben." },
      { status: 500 }
    );
  } finally {
    // takarítás: ne hagyjunk tele fájlokat
    if (filePathToCleanup) {
      try {
        await fs.unlink(filePathToCleanup);
      } catch {
        // szándékosan csendben
      }
    }
  }
}
