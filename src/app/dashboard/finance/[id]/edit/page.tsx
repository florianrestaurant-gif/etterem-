"use client";

import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  amount: number | null;
  supplierId: string;
  supplier: Supplier;
};

type ExpenseInput = {
  supplierId: string;
  amount: string;
};

type DailyFinanceApi = {
  id: string;
  date: string | null;
  year: number | null;
  month: number | null;
  dayNumber: number | null;

  kassza: number | null;
  rozvoz: number | null;
  bistro: number | null;
  restaumatic: number | null;
  dochodca: number | null;
  faktura: number | null;
  zostatok: number | null;
  ubytovanie: number | null;

  restaurant: {
    id: string;
    slug: string | null;
  } | null;

  expenses: Expense[];
};

type ApiErrorResponse = {
  error?: string;
};

export default function EditDailyFinancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dailyId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [restaurantIdentifier, setRestaurantIdentifier] =
    useState<string>("");
  const [date, setDate] = useState<string>("");

  // bevételi mezők
  const [kassza, setKassza] = useState<string>("");
  const [rozvoz, setRozvoz] = useState<string>("");
  const [bistro, setBistro] = useState<string>("");
  const [restaumatic, setRestaumatic] = useState<string>("");
  const [dochodca, setDochodca] = useState<string>("");
  const [faktura, setFaktura] = useState<string>("");
  const [zostatok, setZostatok] = useState<string>("");
  const [ubytovanie, setUbytovanie] = useState<string>("");

  const [expenses, setExpenses] = useState<ExpenseInput[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revenueFields: {
    label: string;
    value: string;
    setter: Dispatch<SetStateAction<string>>;
  }[] = [
    { label: "Kassza", value: kassza, setter: setKassza },
    { label: "Rozvoz", value: rozvoz, setter: setRozvoz },
    { label: "Bistro", value: bistro, setter: setBistro },
    { label: "Restaumatic", value: restaumatic, setter: setRestaumatic },
    { label: "Dôchodca", value: dochodca, setter: setDochodca },
    { label: "Faktúra", value: faktura, setter: setFaktura },
    { label: "Zostatok", value: zostatok, setter: setZostatok },
    {
      label: "Booking (ubytovanie)",
      value: ubytovanie,
      setter: setUbytovanie,
    },
  ];

  async function loadSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      if (!res.ok) {
        setError("Nem sikerült lekérni a beszállítókat.");
        return;
      }
      const json = (await res.json()) as Supplier[];
      setSuppliers(json);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült lekérni a beszállítókat.");
    }
  }

  async function loadDaily() {
    try {
      const res = await fetch(`/api/daily-finance/${dailyId}`);
      const json = (await res.json()) as DailyFinanceApi | ApiErrorResponse;

      if (!res.ok || !("id" in json)) {
        setError(
          ("error" in json && json.error) ||
            "Nem sikerült betölteni a napi adatot."
        );
        setLoading(false);
        return;
      }

      const daily = json as DailyFinanceApi;

      // 👉 Dátum: ha van date mező, azt használjuk, ha nincs,
      // akkor year + month + dayNumber alapján számolunk.
      let iso = "";
      if (daily.date) {
        iso = new Date(daily.date).toISOString().slice(0, 10);
      } else if (daily.year && daily.month && daily.dayNumber) {
        iso = new Date(
          daily.year,
          daily.month - 1,
          daily.dayNumber
        )
          .toISOString()
          .slice(0, 10);
      }
      setDate(iso);

      const restaurantIdent =
        daily.restaurant?.slug ?? daily.restaurant?.id ?? "";
      setRestaurantIdentifier(restaurantIdent);

      setKassza(daily.kassza?.toString() ?? "");
      setRozvoz(daily.rozvoz?.toString() ?? "");
      setBistro(daily.bistro?.toString() ?? "");
      setRestaumatic(daily.restaumatic?.toString() ?? "");
      setDochodca(daily.dochodca?.toString() ?? "");
      setFaktura(daily.faktura?.toString() ?? "");
      setZostatok(daily.zostatok?.toString() ?? "");
      setUbytovanie(daily.ubytovanie?.toString() ?? "");

      setExpenses(
        daily.expenses.map((e) => ({
          supplierId: e.supplierId,
          amount: e.amount?.toString() ?? "",
        }))
      );

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült lekérni a napi adatot.");
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadSuppliers(), loadDaily()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyId]);

  function addExpenseRow() {
    setExpenses((prev) => [...prev, { supplierId: "", amount: "" }]);
  }

  function removeExpenseRow(index: number) {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const body = {
      id: dailyId,
      restaurantIdentifier,
      date,
      kassza: kassza === "" ? null : Number(kassza),
      rozvoz: rozvoz === "" ? null : Number(rozvoz),
      bistro: bistro === "" ? null : Number(bistro),
      restaumatic: restaumatic === "" ? null : Number(restaumatic),
      dochodca: dochodca === "" ? null : Number(dochodca),
      faktura: faktura === "" ? null : Number(faktura),
      zostatok: zostatok === "" ? null : Number(zostatok),
      ubytovanie: ubytovanie === "" ? null : Number(ubytovanie),
      expenses: expenses
        .filter((e) => e.supplierId && e.amount !== "")
        .map((e) => ({
          supplierId: e.supplierId,
          amount: Number(e.amount),
        })),
    };

    try {
      const res = await fetch("/api/daily-finance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiErrorResponse;

      if (!res.ok) {
        setError(json.error ?? "Hiba történt a mentés során.");
        setSaving(false);
        return;
      }

      setMessage("Sikeresen mentve.");
      setSaving(false);

      setTimeout(() => {
        router.push("/dashboard/finance");
      }, 800);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni a mentési kérést.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p>Betöltés…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">
        Napi zárás szerkesztése
      </h1>

      {error && (
        <div className="p-2 rounded bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="p-2 rounded bg-green-100 text-green-700 text-sm">
          {message}
        </div>
      )}

      <section className="border rounded-lg p-4 space-y-4">
        {/* Alap adatok */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Dátum</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Étterem azonosító vagy slug
            </label>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm w-full"
              value={restaurantIdentifier}
              onChange={(e) => setRestaurantIdentifier(e.target.value)}
            />
          </div>
        </div>

        {/* Bevételi csatornák */}
        <div>
          <h2 className="font-semibold text-sm mb-2">
            Bevételi csatornák (napi bevétel)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {revenueFields.map(({ label, value, setter }, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Beszállítók */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-sm">
              Beszállítói kiadások (ehhez a naphoz)
            </h2>
            <button
              type="button"
              onClick={addExpenseRow}
              className="px-2 py-1 bg-black text-white text-xs rounded"
            >
              + Sor hozzáadása
            </button>
          </div>

          <div className="space-y-2">
            {expenses.length === 0 && (
              <p className="text-xs text-gray-500">
                Még nincs beszállítói sor, add hozzá a + gombbal.
              </p>
            )}

            {expenses.map((exp, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
              >
                <select
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={exp.supplierId}
                  onChange={(e) => {
                    const { value } = e.target;
                    setExpenses((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, supplierId: value } : row
                      )
                    );
                  }}
                >
                  <option value="">Válassz beszállítót…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Összeg (€)"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={exp.amount}
                  onChange={(e) => {
                    const { value } = e.target;
                    setExpenses((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, amount: value } : row
                      )
                    );
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeExpenseRow(index)}
                  className="text-red-600 text-xs"
                >
                  Sor törlése
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
        >
          {saving ? "Mentés..." : "Mentés"}
        </button>
      </section>
    </div>
  );
}
