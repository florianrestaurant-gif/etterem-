"use client";

import { useState } from "react";

type RestaurantOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  restaurants: RestaurantOption[];
};

type ApiCreateMenuResp =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export function CreateMenuForm({ restaurants }: Props) {
  const [restaurantId, setRestaurantId] = useState(
    restaurants[0]?.id ?? ""
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRestaurants = restaurants.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasRestaurants) {
      setError("Nincs még étterem létrehozva.");
      return;
    }
    if (!restaurantId) {
      setError("Válaszd ki az éttermet.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Add meg a hét időszakát.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          startDate,
          endDate,
        }),
      });

      const txt = await res.text();
      let json: ApiCreateMenuResp;
      try {
        json = JSON.parse(txt) as ApiCreateMenuResp;
      } catch {
        throw new Error(
          `Nem JSON válasz a szervertől (${res.status}): ${
            txt.slice(0, 120) || "üres"
          }`
        );
      }

      if (!json.ok) {
        throw new Error(json.error || `Hiba (${res.status})`);
      }

      // Siker → menjünk át a tétel-szerkesztő oldalra
      const newId = json.data.id;
      window.location.href = `/menus/${encodeURIComponent(
        newId
      )}/edit`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-xl p-4 bg-white/80 dark:bg-neutral-900/60 space-y-4"
    >
      <h3 className="text-lg font-semibold">
        Új heti menü létrehozása
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Válaszd ki az éttermet és a hét időszakát. Mentés után rögtön
        a tételek szerkesztésére jutsz.
      </p>

      {!hasRestaurants ? (
        <p className="text-sm text-red-600">
          Nincs még étterem a rendszerben, először hozz létre egyet.
        </p>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Étterem */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Étterem
              </label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (slug: {r.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Kezdődátum */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Kezdő dátum
              </label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Záró dátum */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Záró dátum
              </label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !hasRestaurants}
            className="px-4 py-2 text-sm rounded bg-neutral-900 text-white disabled:opacity-60"
          >
            {saving ? "Létrehozás…" : "Heti menü létrehozása"}
          </button>
        </>
      )}
    </form>
  );
}
