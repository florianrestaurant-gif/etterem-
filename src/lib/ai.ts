// src/lib/ai.ts
import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Hiányzik az OPENAI_API_KEY az .env-ből.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type ParsedGoodsItem = {
  supplier: string;
  productName: string;
  quantity: number | null;
  unit: string | null;
  batchNumber: string | null;
  expiryDate: string | null; // "2025-11-29" vagy null
  deliveryTemp: number | null; // °C
};

export type ParsedGoodsReceipt = {
  items: ParsedGoodsItem[];
};

/**
 * Kép → OpenAI vision → struktúrált JSON
 * @param localPath pl. "public/uploads/goods-receipts/123.jpg"
 */
export async function parseGoodsReceiptFromImage(
  localPath: string
): Promise<ParsedGoodsReceipt> {
  // Abszolút elérési út
  const absPath = path.isAbsolute(localPath)
    ? localPath
    : path.join(process.cwd(), localPath);

  const fileBuffer = await fs.readFile(absPath);
  const base64 = fileBuffer.toString("base64");
  const imageUrl = `data:image/jpeg;base64,${base64}`;

  // 🔥 A TypeScript hibák elkerülésére a hívást any-re castoljuk
  const response = (await openai.responses.create(
    {
      model: "gpt-4.1-mini", // használhatsz nagyobbat is: gpt-4.1
      input: [
        {
          role: "system",
          content:
            "Te egy HACCP szakértő asszisztens vagy. Felismered az élelmiszer-áruszállító szállítóleveleket (dodací list) fotóról, " +
            "és a tételeket strukturált JSON formában adod vissza.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Olvasd ki a szállítólevél táblázatából a tételeket. " +
                "Minden sorhoz add vissza: supplier, productName, quantity, unit, batchNumber, expiryDate (ISO pl. 2025-11-29), deliveryTemp (Celsius). " +
                "Ha valami nem látszik vagy nincs rajta, állítsd null-ra.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "goods_receipt",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    supplier: { type: "string" },
                    productName: { type: "string" },
                    quantity: { type: ["number", "null"] },
                    unit: { type: ["string", "null"] },
                    batchNumber: { type: ["string", "null"] },
                    expiryDate: { type: ["string", "null"] },
                    deliveryTemp: { type: ["number", "null"] },
                  },
                  // NINCS required lista -> minden mező opcionális
                  additionalProperties: false,
                },
              },
            },
            // csak az items kötelező
            required: ["items"],
            additionalProperties: false,
          },
          // ⚠ lazább ellenőrzés, ne dobjon hibát apróságokra
          strict: false,
        },
      },
    } as any
  )) as any;

  const raw = response.output_text || "{}";
  let parsed: ParsedGoodsReceipt;

  try {
    parsed = JSON.parse(raw) as ParsedGoodsReceipt;
  } catch (e) {
    console.error("AI JSON parse error, raw output:", raw);
    throw new Error("Nem sikerült az AI válaszát JSON-ná alakítani.");
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    return { items: [] };
  }

  return parsed;
}
