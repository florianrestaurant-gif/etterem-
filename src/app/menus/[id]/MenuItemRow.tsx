"use client";

import { useState } from "react";

type MenuItemRowProps = {
  menuId: string;
  item: {
    id: string;
    dayIndex: number;
    titleHU: string;
    titleSK: string | null;
    descHU: string | null;
    descSK: string | null;
    priceCents: number;
    allergens: string | null;
  };
};

const dayLabels = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek"];

export function MenuItemRow({ menuId, item }: MenuItemRowProps) {
  const [editMode, setEditMode] = useState(false);

  const [dayIndex, setDayIndex] = useState(item.dayIndex);
  const [titleHU, setTitleHU] = useState(item.titleHU);
  const [titleSK, setTitleSK] = useState(item.titleSK ?? "");
  const [descHU, setDescHU] = useState(item.descHU ?? "");
  const [descSK, setDescSK] = useState(item.descSK ?? "");
  const [priceCents, setPriceCents] = useState(item.priceCents);
  const [allergens, setAllergens] = useState(item.allergens ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(
        `/api/menus/${menuId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayIndex,
            titleHU,
            titleSK,
            descHU,
            descSK,
            priceCents,
            allergens,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Mentési hiba");
      }

      // egyszerű megoldás: frissítjük az oldalt
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setSaving(false);
    }
  }

  if (!editMode) {
    // CSAK megjelenítés nézet
    return (
      <tr className="border-b">
        <td className="px-2 py-1 text-sm">{dayLabels[item.dayIndex]}</td>
        <td className="px-2 py-1 text-sm">
          <div className="font-medium">{item.titleHU}</div>
          {item.titleSK && (
            <div className="text-xs text-neutral-500">
              {item.titleSK}
            </div>
          )}
        </td>
        <td className="px-2 py-1 text-sm">
          {(item.priceCents / 100).toFixed(2)} €
        </td>
        <td className="px-2 py-1 text-right">
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="text-xs px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100"
          >
            Szerkesztés
          </button>
        </td>
      </tr>
    );
  }

  // SZERKESZTŐ nézet
  return (
    <tr className="border-b bg-neutral-50">
      <td className="px-2 py-2 align-top">
        <select
          value={dayIndex}
          onChange={(e) => setDayIndex(Number(e.target.value))}
          className="border rounded px-1 py-0.5 text-xs"
        >
          <option value={0}>Hétfő</option>
          <option value={1}>Kedd</option>
          <option value={2}>Szerda</option>
          <option value={3}>Csütörtök</option>
          <option value={4}>Péntek</option>
        </select>
      </td>
      <td className="px-2 py-2 align-top">
        <div className="space-y-1">
          <input
            value={titleHU}
            onChange={(e) => setTitleHU(e.target.value)}
            placeholder="Magyar név"
            className="w-full border rounded px-1 py-0.5 text-xs"
          />
          <input
            value={titleSK}
            onChange={(e) => setTitleSK(e.target.value)}
            placeholder="Szlovák név"
            className="w-full border rounded px-1 py-0.5 text-xs"
          />
          <textarea
            value={descHU}
            onChange={(e) => setDescHU(e.target.value)}
            placeholder="Magyar leírás"
            className="w-full border rounded px-1 py-0.5 text-xs"
            rows={2}
          />
          <textarea
            value={descSK}
            onChange={(e) => setDescSK(e.target.value)}
            placeholder="Szlovák leírás"
            className="w-full border rounded px-1 py-0.5 text-xs"
            rows={2}
          />
          <input
            value={allergens}
            onChange={(e) => setAllergens(e.target.value)}
            placeholder="Allergének (pl. 1,3,7)"
            className="w-full border rounded px-1 py-0.5 text-xs"
          />
        </div>
      </td>
      <td className="px-2 py-2 align-top">
        <input
          type="number"
          step={1}
          value={priceCents}
          onChange={(e) => setPriceCents(Number(e.target.value))}
          className="w-full border rounded px-1 py-0.5 text-xs"
        />
        <div className="text-[10px] text-neutral-500 mt-1">
          centben (690 = 6.90 €)
        </div>
      </td>
      <td className="px-2 py-2 align-top text-right space-y-1">
        {error && (
          <div className="text-[10px] text-red-600 mb-1">{error}</div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-2 py-1 rounded bg-neutral-900 text-white disabled:opacity-60"
        >
          {saving ? "Mentés..." : "Mentés"}
        </button>
        <button
          type="button"
          onClick={() => setEditMode(false)}
          className="ml-2 text-xs px-2 py-1 rounded border border-neutral-300"
        >
          Mégse
        </button>
      </td>
    </tr>
  );
}
