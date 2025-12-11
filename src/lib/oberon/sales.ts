// src/lib/oberon/sales.ts
import { getOberonClient } from "./client";

export type SaleSummary = {
  date: string;        // pl. "2025-11-18"
  totalAmount: number; // összeg
  totalItems: number;  // tételszám
};

// minimális Oberon válasz típus, hogy ne kelljen any-t használni
type OberonSalesRecord = {
  Date?: string;
  TotalAmount?: number | string;
  ItemCount?: number | string;
  // ha van benne más is, az mehet ide:
  [key: string]: unknown;
};

type OberonSalesResponse = {
  SalesRecords?: {
    Record?: OberonSalesRecord[] | OberonSalesRecord;
  };
};
type SalesIntervalArgs = {
  FromDate: string;
  ToDate: string;
};


// from / to: "YYYY-MM-DD"
export async function getSalesSummary(from: string, to: string): Promise<SaleSummary[]> {
  const client = await getOberonClient();

  const args = {
    FromDate: from,
    ToDate: to,
  };

  // NINCS any, csak unknown
  const result = await new Promise<unknown>((resolve, reject) => {
  (client as unknown as {
    GetSalesByDateInterval: (
      args: SalesIntervalArgs,
      cb: (err: unknown, res: unknown) => void
    ) => void;
  }).GetSalesByDateInterval(
    args,
    (err: unknown, res: unknown) => {
      if (err) return reject(err);
      resolve(res);
    }
  );
});


  const typed = result as OberonSalesResponse;

  // lehet, hogy 1 elem vagy tömb, ezért normalizálunk tömbbé
  const raw = typed.SalesRecords?.Record;
  const records: OberonSalesRecord[] = Array.isArray(raw)
    ? raw
    : raw
    ? [raw]
    : [];

  const map = new Map<string, { totalAmount: number; totalItems: number }>();

  for (const r of records) {
    const date = r.Date;
    if (!date) continue;

    const amount = Number(r.TotalAmount ?? 0);
    const items = Number(r.ItemCount ?? 0);

    if (!map.has(date)) {
      map.set(date, { totalAmount: 0, totalItems: 0 });
    }

    const current = map.get(date)!;
    current.totalAmount += amount;
    current.totalItems += items;
  }

  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    totalAmount: v.totalAmount,
    totalItems: v.totalItems,
  }));
}
