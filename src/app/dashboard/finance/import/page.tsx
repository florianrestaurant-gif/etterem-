// app/dashboard/import/page.tsx
"use client";

import React, { useState } from "react";

const SHEET_DEFAULT = "November 2025"; // alapértelmezett – átírható

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState(SHEET_DEFAULT);
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(11); // 1–12
  const [restaurantId, setRestaurantId] = useState<string>(""); // később legördülőből

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Válassz ki egy Excel fájlt!");
      return;
    }

    if (!restaurantId) {
      setError("Válaszd ki az éttermet (restaurantId)!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sheetName", sheetName);
    formData.append("year", String(year));
    formData.append("month", String(month));
    formData.append("restaurantId", restaurantId);

    try {
      setIsLoading(true);
      const res = await fetch("/api/import-daily-finance", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ismeretlen hiba történt.");
      } else {
        setMessage(
          `Sikeres import: ${data.insertedDays} nap, ${data.insertedExpenses} kiadás.`
        );
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni az import kérést.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Napi pénzügyek importja</h1>
      <p className="text-sm text-gray-600">
        Töltsd fel az Excel fájlt (pl. <strong>Florian Restaurant.xlsx</strong>),
        válaszd ki a hónapot, évet, munkalap nevét, és az import betölti az adatokat
        a <code>DailyFinance</code> és <code>Expense</code> táblákba.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Excel fájl</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Étterem ID (restaurantId)</label>
          <input
            type="text"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            placeholder="pl. a Szent Flórián étterem id-je"
            className="block w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Év</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="block w-full border rounded px-2 py-1 text-sm"
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
              className="block w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Munkalap neve</label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="block w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-60"
        >
          {isLoading ? "Importálás..." : "Import indítása"}
        </button>

        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
            {message}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
