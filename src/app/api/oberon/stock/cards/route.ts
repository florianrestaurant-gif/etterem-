import { NextResponse } from "next/server";
import { getOberonClient } from "@/lib/oberon/client";

// --- Típusok a LoadSettings-hez (nincs sehol any!) ---

type ConditionType =
  | "None"
  | "IsEqual"
  | "NotEqual"
  | "IsGreater"
  | "IsSmaller"
  | "InRange"
  | "NotInRange"
  | "Contains"
  | "NotContains"
  | "StartsWith"
  | "EndsWith"
  | "InList"
  | "NotInList";

type FiltersMergeTypes = "AND" | "OR";

type SortingDirection = "Asc" | "Desc";

interface LoadFilterItem {
  BookColumnID: number;
  ConditionType: ConditionType;
  Values: string[];
}

interface SortItem {
  BookColumnID: number;
  SortingDirection: SortingDirection;
}

interface LoadSettings {
  Filters?: {
    LoadFilterItem: LoadFilterItem[];
  };
  FiltersMergeTypes: FiltersMergeTypes;
  PageIndex: number;
  PageSize: number;
  Sort?: {
    SortItem: SortItem[];
  };
}

interface StockCardsInventoryListArg {
  StockName: string; // üres string = minden raktár
  LoadSettings: LoadSettings;
}

interface StockCardsInventoryListRequest {
  stockCardsInventoryListArg: StockCardsInventoryListArg;
}

// A kliens csak azt tudja, hogy van egy ilyen metódusa – nem használunk any-t
interface OberonStockCardsInventoryClient {
  Stock_StockCardsInventory_List(
    args: StockCardsInventoryListRequest
  ): Promise<{
    Stock_StockCardsInventory_ListResult: {
      data: unknown;          // majd debug route-tal pontosítjuk
      description: string;
      errNumber: number;
      result: boolean;
    };
  }>;
}

export async function GET() {
  try {
    const client = (await getOberonClient()) as unknown as OberonStockCardsInventoryClient;

    const args: StockCardsInventoryListRequest = {
      stockCardsInventoryListArg: {
        StockName: "", // ha csak konkrét raktárt akarsz: pl. "Hlavný sklad"
        LoadSettings: {
          PageIndex: 0,
          PageSize: 200,
          FiltersMergeTypes: "AND",
          Filters: {
            // egyelőre nem szűrünk semmire
            LoadFilterItem: [],
          },
          Sort: {
            // egyelőre nem rendezünk semmire
            SortItem: [],
          },
        },
      },
    };

    const soapResponse = await client.Stock_StockCardsInventory_List(args);
    const result = soapResponse.Stock_StockCardsInventory_ListResult;

    if (!result.result) {
      return NextResponse.json(
        {
          ok: false,
          description: result.description,
          errNumber: result.errNumber,
        },
        { status: 500 }
      );
    }

    // egyelőre az egész data-t visszaadjuk – ebből látjuk majd a pontos struktúrát
    return NextResponse.json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ismeretlen hiba a SOAP hívás közben";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
