"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Supplier = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  amount: number | null;
  supplier: Supplier;
};

type DailyFinance = {
  id: string;
  dayNumber: number | null;
  dayName: string | null;

  kassza: number | null;
  rozvoz: number | null;
  bistro: number | null;
  restaumatic: number | null;
  dochodca: number | null;
  faktura: number | null;
  zostatok: number | null;
  akcie: number | null;
  ubytovanie: number | null;

  kiadasok: number | null;

  expenses: Expense[];
};

type Props = {
  defaultYear: number;
  defaultMonth: number;
  defaultRestaurantId: string;
  restaurantName: string;
  isGlobalAdmin: boolean;
};

function safeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

export default function FinanceDashboardClient({
  defaultYear,
  defaultMonth,
  defaultRestaurantId,
  restaurantName,
  isGlobalAdmin,
}: Props) {
  const [year, setYear] = useState<number>(defaultYear);
  const [month, setMonth] = useState<number>(defaultMonth);
  const [data, setData] = useState<DailyFinance[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        restaurant: defaultRestaurantId,
      });

      const res = await fetch(`/api/daily-records?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          (body && (body.error as string)) ||
          `Hiba a lekérésben (HTTP ${res.status})`;
        setError(msg);
        return;
      }

      const json = (await res.json()) as DailyFinance[];
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült lekérni az adatokat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenueTotals = (data ?? []).reduce(
    (acc, day) => {
      acc.kassza += safeNumber(day.kassza);
      acc.rozvoz += safeNumber(day.rozvoz);
      acc.bistro += safeNumber(day.bistro);
      acc.restaumatic += safeNumber(day.restaumatic);
      acc.dochodca += safeNumber(day.dochodca);
      acc.faktura += safeNumber(day.faktura);
      acc.akcie += safeNumber(day.akcie);
      acc.zostatok += safeNumber(day.zostatok);
      acc.booking += safeNumber(day.ubytovanie);
      return acc;
    },
    {
      kassza: 0,
      rozvoz: 0,
      bistro: 0,
      restaumatic: 0,
      dochodca: 0,
      faktura: 0,
      akcie: 0,
      zostatok: 0,
      booking: 0,
    }
  );

  const totalRevenue =
    revenueTotals.kassza +
    revenueTotals.rozvoz +
    revenueTotals.bistro +
    revenueTotals.restaumatic +
    revenueTotals.dochodca +
    revenueTotals.faktura +
    revenueTotals.zostatok +
    revenueTotals.akcie +
    revenueTotals.booking;

  const totalExpensesByField = (data ?? []).reduce(
    (sum, day) => sum + safeNumber(day.kiadasok),
    0
  );

  const totalExpensesFromSuppliers = (data ?? []).reduce((sum, day) => {
    const daySum = day.expenses.reduce(
      (s, e) => s + safeNumber(e.amount),
      0
    );
    return sum + daySum;
  }, 0);

  //const selectedDay =
    //(data ?? []).find((d) => d.id === selectedDayId) ?? null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Pénzügyi áttekintés</h1>
            <p className="text-sm text-gray-600">
              Napi bevételek és beszállítói kiadások étterem szerint.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Aktív étterem:{" "}
              <span className="font-medium">{restaurantName}</span>
              {isGlobalAdmin && (
                <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200">
                  admin-mód
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href="/dashboard/finance/new"
              className="bg-green-600 text-white px-3 py-2 rounded text-xs md:text-sm"
            >
              Új napi zárás rögzítése
            </Link>
            <Link
              href="/dashboard/finance/import"
              className="bg-black text-white px-3 py-2 rounded text-xs md:text-sm"
            >
              Excel import
            </Link>
            {isGlobalAdmin && (
              <Link
                href="/dashboard"
                className="border border-gray-300 bg-white px-3 py-2 rounded text-xs md:text-sm"
              >
                Vissza az admin felületre
              </Link>
            )}
          </div>
        </header>

        {/* Szűrők */}
        <section className="border rounded-lg bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Év</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Hónap</label>
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Étterem
              </label>
              <input
                type="text"
                value={restaurantName}
                disabled
                className="w-full border rounded px-2 py-1 text-sm bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-60"
          >
            {loading ? "Betöltés..." : "Adatok lekérése"}
          </button>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </p>
          )}
        </section>

        {/* Összesítők */}
        {data && data.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded-lg bg-white p-3 text-sm space-y-1">
              <div className="text-gray-500">
                Összes bevétel (összes csatorna)
              </div>
              <div className="text-lg font-semibold">
                {totalRevenue.toFixed(2)} €
              </div>
            </div>

            <div className="border rounded-lg bg-white p-3 text-sm">
              <div className="text-gray-500">Kiadások (Kiadások oszlop)</div>
              <div className="text-lg font-semibold">
                {totalExpensesByField.toFixed(2)} €
              </div>
            </div>

            <div className="border rounded-lg bg-white p-3 text-sm">
              <div className="text-gray-500">
                Beszállítói kiadások (összesen)
              </div>
              <div className="text-lg font-semibold">
                {totalExpensesFromSuppliers.toFixed(2)} €
              </div>
            </div>
          </section>
        )}

        {/* Napi lista + részletező */}
        {/* (ide beteheted a már meglévő táblázatos + részletező kódodat, az változatlanul működni fog) */}
      </div>
    </main>
  );
}
