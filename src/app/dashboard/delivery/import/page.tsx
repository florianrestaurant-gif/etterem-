"use client";

import React, { useState } from "react";

export default function DeliveryImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Kérlek válaszd ki az Excel fájlt.");
      return;
    }
    if (!date) {
      setError("Kérlek válassz dátumot.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("date", date);

      const res = await fetch("/api/import-delivery", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || "Hiba történt az import során.");
      } else {
        setMessage(
          json.inserted
            ? `Sikeres import: ${json.inserted} sor.`
            : "Sikeres import."
        );
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni az import kérést.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">
        Kiszállítás importálása
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

      <div className="space-y-4 border rounded-lg p-4">
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
            Excel fájl
          </label>
          <input
            type="file"
            accept=".xlsx"
            className="border rounded px-2 py-1 text-sm w-full"
            onChange={(e) =>
              setFile(e.target.files && e.target.files[0]
                ? e.target.files[0]
                : null)
            }
          />
        </div>

        <button
          type="button"
          onClick={() => void handleImport()}
          className="bg-black text-white px-4 py-2 rounded text-sm"
          disabled={loading}
        >
          {loading ? "Importálás..." : "Import indítása"}
        </button>
      </div>
    </div>
  );
}
