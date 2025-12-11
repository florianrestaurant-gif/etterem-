// src/app/dashboard/delivery/pricing/DeliveryPricingClient.tsx
"use client";

import { useState } from "react";

type PriceConfig = {
  soupPrice: number | null;
  menu1Price: number | null;
  menu2Price: number | null;
  menu3Price: number | null;
  menu4Price: number | null;
  businessMenuPrice: number | null;
  dessertPrice: number | null;
};

type Props = {
  restaurantId: string;
  restaurantName: string;
  initialConfig: PriceConfig;
};

type FieldKey = keyof PriceConfig;

const FIELD_DEFS: { key: FieldKey; labelHu: string }[] = [
  { key: "soupPrice", labelHu: "Leves ára (€ / adag)" },
  { key: "menu1Price", labelHu: "1. menü ára (€ / adag)" },
  { key: "menu2Price", labelHu: "2. menü ára (€ / adag)" },
  { key: "menu3Price", labelHu: "3. menü ára (€ / adag)" },
  { key: "menu4Price", labelHu: "4. menü ára (€ / adag)" },
  { key: "businessMenuPrice", labelHu: "Business menü ára (€ / adag)" },
  { key: "dessertPrice", labelHu: "Desszert ára (€ / adag)" },
];

export default function DeliveryPricingClient({
  initialConfig,
}: Props) {
  // stringes state, hogy az üres érték is működjön
  const [form, setForm] = useState<Record<FieldKey, string>>({
    soupPrice:
      initialConfig.soupPrice != null ? String(initialConfig.soupPrice) : "",
    menu1Price:
      initialConfig.menu1Price != null ? String(initialConfig.menu1Price) : "",
    menu2Price:
      initialConfig.menu2Price != null ? String(initialConfig.menu2Price) : "",
    menu3Price:
      initialConfig.menu3Price != null ? String(initialConfig.menu3Price) : "",
    menu4Price:
      initialConfig.menu4Price != null ? String(initialConfig.menu4Price) : "",
    businessMenuPrice:
      initialConfig.businessMenuPrice != null
        ? String(initialConfig.businessMenuPrice)
        : "",
    dessertPrice:
      initialConfig.dessertPrice != null
        ? String(initialConfig.dessertPrice)
        : "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    // string -> number | null
   // string -> number | null
const payload: Partial<PriceConfig> = {};

FIELD_DEFS.forEach(({ key }) => {
  const raw = form[key].trim();

  let value: number | null;
  if (raw === "") {
    value = null;
  } else {
    const num = Number(raw.replace(",", "."));
    value = Number.isFinite(num) ? num : null;
  }

  payload[key] = value;
});

    try {
      const res = await fetch("/api/delivery/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error || "Nem sikerült menteni az árlistát.");
      } else {
        setMessage("Árlista sikeresen mentve.");
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni a kérést.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="border rounded-xl p-4 sm:p-5 space-y-4 bg-white shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Egységárak megadása</h2>
          <p className="text-xs text-neutral-600">
            Add meg, hogy egy adag leves, menü vagy desszert mennyibe kerül.
            Az új futár rendeléseknél a rendszer automatikusan kiszámolja a
            végösszeget a darabszámok alapján.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_DEFS.map(({ key, labelHu }) => (
            <div key={key} className="space-y-1">
              <label className="block text-xs font-medium">{labelHu}</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-black text-white disabled:opacity-60 w-full sm:w-auto"
        >
          {saving ? "Mentés…" : "Árlista mentése"}
        </button>

        <p className="text-[11px] text-neutral-500 mt-1">
          Tippet: ha egy mezőt üresen hagysz, azt a csatornát nem veszi figyelembe
          az automatikus kalkuláció.
        </p>
      </form>
    </section>
  );
}
