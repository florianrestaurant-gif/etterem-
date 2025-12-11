import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

interface OberonStockCardsInventoryClient {
  Stock_StockCardsInventory_List(
    args: {
      stockCardsInventoryListArg: {
        StockName: string;
        LoadSettings: {
          PageIndex: number;
          PageSize: number;
          FiltersMergeTypes: "AND" | "OR";
          Filters?: { LoadFilterItem: unknown[] };
          Sort?: { SortItem: unknown[] };
        };
      };
    }
  ): Promise<unknown>;
}

export async function GET() {
  try {
    const client = (await getOberonClient()) as unknown as OberonStockCardsInventoryClient;

    const response = await client.Stock_StockCardsInventory_List({
      stockCardsInventoryListArg: {
        StockName: "",
        LoadSettings: {
          PageIndex: 0,
          PageSize: 20,
          FiltersMergeTypes: "AND",
          Filters: { LoadFilterItem: [] },
          Sort: { SortItem: [] },
        },
      },
    });

    return NextResponse.json({ ok: true, response });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ismeretlen hiba a debug hívásnál";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
