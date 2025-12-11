"use client";

import { useEffect, useState } from "react";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type SeedResult = {
  ok?: boolean;
  created?: number;
  error?: string;
};

export default function ChecklistSeedPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Éttermek betöltése debug endpointból
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRestaurants(true);
        setError(null);
        setMessage(null);

        const res = await fetch("/api/debug/restaurants");
        if (!res.ok) {
          throw new Error(`Hiba: ${res.status}`);
        }
        const data = (await res.json()) as Restaurant[];

        setRestaurants(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err: unknown) {
        setError("Nem sikerült betölteni az éttermeket.");
        console.error(err);
      } finally {
        setLoadingRestaurants(false);
      }
    };

    load();
  }, []);

  const handleSeed = async () => {
    if (!selectedId) {
      setError("Válassz egy éttermet!");
      return;
    }

    try {
      setSeeding(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/debug/checklist/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: selectedId }),
      });

      const data = (await res.json()) as SeedResult;

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Ismeretlen hiba");
      }

      setMessage(
        `Siker! ${data.created ?? "?"} checklist sablon frissítve / létrehozva.`
      );
  }  catch (err) {
  console.error(err);
  setError("Nem sikerült betölteni az éttermeket.");
} finally {
  setLoadingRestaurants(false);
}

  };

  return (
    <main className="min-h-screen bg-slate-100 flex justify-center items-start py-10">
      <div className="w-full max-w-xl bg-white shadow-md rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold mb-2">
          Checklist sablonok frissítése
        </h1>
        <p className="text-sm text-slate-600">
          Itt tudod újragenerálni a konyhai checklist sablonokat az adott
          étteremhez. A meglévő sablonokat előtte töröljük, majd az új
          „alapcsomagot” töltjük fel.
        </p>

        {/* Étterem választó */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Étterem</label>
          {loadingRestaurants ? (
            <div className="text-sm text-slate-500">Étterem lista betöltése…</div>
          ) : restaurants.length === 0 ? (
            <div className="text-sm text-red-600">
              Nem találtam egy éttermet sem. Először hozz létre egyet.
            </div>
          ) : (
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.slug})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Gomb */}
        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding || !selectedId}
          className={`mt-2 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white ${
            seeding || !selectedId
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {seeding ? "Futtatás…" : "Checklist sablonok frissítése"}
        </button>

        {/* Üzenetek */}
        {message && (
          <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4">
          Ez csak belső admin oldal, éles használóknak nem kell látniuk. 🙂
        </p>
      </div>
    </main>
  );
}
