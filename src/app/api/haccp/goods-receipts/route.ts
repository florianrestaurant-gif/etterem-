import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getRestaurantId } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

function toBool(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}

function parseOptionalFloat(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function parseOptionalDate(v: unknown): Date | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeExt(originalName: string): string {
  const ext = path.extname(originalName || "").toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

/**
 * GET /api/haccp/goods-receipts?date=YYYY-MM-DD
 * Adott napi áruátvételi bejegyzések az aktuális étteremhez.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Nincs étterem kapcsolva a felhasználóhoz." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó dátum paraméter (date=YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // YYYY-MM-DD → helyi nap 00:00..+1nap
    const base = new Date(dateStr);
    if (Number.isNaN(base.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen dátum formátum." },
        { status: 400 }
      );
    }

    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 0, 0, 0, 0);

    const receipts = await prisma.goodsReceipt.findMany({
      where: {
        restaurantId,
        date: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { ok: true, date: start.toISOString(), receipts },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/haccp/goods-receipts ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az áruátvételi napló lekérésekor." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/haccp/goods-receipts
 * Új áruátvétel mentése (multipart/form-data).
 * Dokumentum/fotó opcionális – AI-t NEM hívunk itt.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Nincs jogosultság (nem vagy bejelentkezve)." },
        { status: 401 }
      );
    }

    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Nincs étterem kapcsolva a felhasználóhoz." },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const date = formData.get("date"); // string
    const supplier = formData.get("supplier");
    const productName = formData.get("productName");

    const quantityRaw = formData.get("quantity");
    const unit = formData.get("unit");
    const batchNumber = formData.get("batchNumber");
    const expiryDateRaw = formData.get("expiryDate");
    const deliveryTempRaw = formData.get("deliveryTemp");

    const tempOkRaw = formData.get("tempOk");
    const packagingOkRaw = formData.get("packagingOk");
    const appearanceOkRaw = formData.get("appearanceOk");
    const documentsOkRaw = formData.get("documentsOk");
    const rejectedRaw = formData.get("rejected");

    const correctiveAction = formData.get("correctiveAction");
    const note = formData.get("note");

    const document = formData.get("document");

    const dateStr = String(date ?? "").trim();
    const supplierStr = String(supplier ?? "").trim();
    const productNameStr = String(productName ?? "").trim();

    if (!dateStr || !supplierStr || !productNameStr) {
      return NextResponse.json(
        { ok: false, error: "A dátum, szállító és terméknév kötelező mezők." },
        { status: 400 }
      );
    }

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen dátum formátum." },
        { status: 400 }
      );
    }

    const quantity = parseOptionalFloat(quantityRaw);
    if (Number.isNaN(quantity as any)) {
      return NextResponse.json(
        { ok: false, error: "A mennyiségnek számnak kell lennie." },
        { status: 400 }
      );
    }

    const deliveryTemp = parseOptionalFloat(deliveryTempRaw);
    if (Number.isNaN(deliveryTemp as any)) {
      return NextResponse.json(
        { ok: false, error: "A hőmérsékletnek számnak kell lennie." },
        { status: 400 }
      );
    }

    const expiryDate = parseOptionalDate(expiryDateRaw);
    if (expiryDateRaw && String(expiryDateRaw).trim() !== "" && !expiryDate) {
      return NextResponse.json(
        { ok: false, error: "Érvénytelen lejárati dátum (expiryDate)." },
        { status: 400 }
      );
    }

    const tempOk = toBool(tempOkRaw);
    const packagingOk = toBool(packagingOkRaw);
    const appearanceOk = toBool(appearanceOkRaw);
    const documentsOk = toBool(documentsOkRaw);
    const rejected = toBool(rejectedRaw);

    // 📎 Dokumentum mentése (opcionális)
    let documentUrl: string | null = null;

    if (document && document instanceof File) {
      if (typeof document.size === "number" && document.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: `A dokumentum túl nagy (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB).` },
          { status: 400 }
        );
      }

      const ext = safeExt(document.name);
      if (!ext) {
        return NextResponse.json(
          { ok: false, error: "Csak JPG/JPEG/PNG/WEBP/PDF fájlt tölthetsz fel." },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "goods-receipts");
      await fs.mkdir(uploadDir, { recursive: true });

      const randomName = crypto.randomBytes(12).toString("hex");
      const fileName = `${Date.now()}_${randomName}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const bytes = await document.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(filePath, buffer);

      documentUrl = `/uploads/goods-receipts/${fileName}`;
    }

    const receipt = await prisma.goodsReceipt.create({
      data: {
        restaurantId,
        date: d,

        supplier: supplierStr,
        productName: productNameStr,

        quantity: quantity ?? null,
        unit: String(unit ?? "").trim() ? String(unit).trim() : null,
        batchNumber: String(batchNumber ?? "").trim() ? String(batchNumber).trim() : null,
        expiryDate,
        deliveryTemp: deliveryTemp ?? null,

        tempOk,
        packagingOk,
        appearanceOk,
        documentsOk,

        rejected,
        correctiveAction: String(correctiveAction ?? "").trim()
          ? String(correctiveAction).trim()
          : null,
        note: String(note ?? "").trim() ? String(note).trim() : null,

        documentUrl,

        createdById: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, receipt }, { status: 201 });
  } catch (error) {
    console.error("POST /api/haccp/goods-receipts ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Hiba történt az áruátvétel mentésekor." },
      { status: 500 }
    );
  }
}
