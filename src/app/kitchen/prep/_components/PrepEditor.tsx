// src/app/kitchen/prep/_components/PrepEditor.tsx
"use client";

import { useState } from "react";

type PrepCategory = "SAUCE" | "STOCK" | "SIDE" | "GARNISH" | "DESSERT_BASE" | "OTHER";
type PrepStatus = "OK" | "LOW" | "OUT" | "DISCARD";

// 🔹 exportáljuk, hogy a server component is használhassa a típust
export type PrepItem = {
  id: string;
  name: string;
  category: PrepCategory;
  status: PrepStatus;
  quantity: string | null;
  location: string | null;
  expiryAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  shiftId: string;
  initialItems: PrepItem[];
};

const CATEGORY_LABELS: Record<PrepCategory, string> = {
  SAUCE: "Mártás",
  STOCK: "Alaplé",
  SIDE: "Köret",
  GARNISH: "Díszítés",
  DESSERT_BASE: "Desszert alap",
  OTHER: "Egyéb",
};

const STATUS_LABELS: Record<PrepStatus, string> = {
  OK: "OK",
  LOW: "Kevés",
  OUT: "Elfogyott",
  DISCARD: "Kidobandó",
};

export function PrepEditor({ shiftId, initialItems }: Props) {
  const [items, setItems] = useState<PrepItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    category: PrepCategory;
    status: PrepStatus;
    quantity: string;
    location: string;
    expiryAt: string;
    note: string;
  }>({
    name: "",
    category: "SAUCE",
    status: "OK",
    quantity: "",
    location: "",
    expiryAt: "",
    note: "",
  });

  function handleFormChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg("Adj meg egy nevet a tételnek.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/kitchen/prep-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          name: form.name.trim(),
          category: form.category,
          status: form.status,
          quantity: form.quantity || null,
          location: form.location || null,
          expiryAt: form.expiryAt || null,
          note: form.note || null,
        }),
      });

           const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        item?: PrepItem;
      };

      if (!res.ok || !data.ok || !data.item) {
        setErrorMsg(data.error ?? "Nem sikerült menteni a tételt.");
        setIsSaving(false);
        return;
      }

      const newItem: PrepItem = data.item; // itt már biztosan nem undefined

      setItems((prev) => [...prev, newItem]);


      setForm({
        name: "",
        category: "SAUCE",
        status: "OK",
        quantity: "",
        location: "",
        expiryAt: "",
        note: "",
      });

      setIsSaving(false);
    } catch (err) {
      console.error("PrepEditor add error", err);
      setErrorMsg("Hálózati hiba miatt nem sikerült menteni.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
      >
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Tétel neve
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Pl. Barna mártás"
            value={form.name}
            onChange={(e) => handleFormChange("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Kategória
          </label>
          <select
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.category}
            onChange={(e) =>
              handleFormChange("category", e.target.value as PrepCategory)
            }
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Mennyiség
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Pl. 2 GN, 3 liter"
            value={form.quantity}
            onChange={(e) => handleFormChange("quantity", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Lejárat
          </label>
          <input
            type="date"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.expiryAt}
            onChange={(e) => handleFormChange("expiryAt", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Státusz
          </label>
          <select
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.status}
            onChange={(e) =>
              handleFormChange("status", e.target.value as PrepStatus)
            }
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-2 lg:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Hely / megjegyzés
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Pl. Hűtő 1 felső polc, kicsit sűrű"
            value={form.location}
            onChange={(e) => handleFormChange("location", e.target.value)}
          />
        </div>

        <div className="space-y-1 md:col-span-1 lg:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Egyéb megjegyzés
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.note}
            onChange={(e) => handleFormChange("note", e.target.value)}
          />
        </div>

        <div className="md:col-span-1 lg:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium bg-black text-white disabled:opacity-60"
          >
            {isSaving ? "Mentés..." : "Hozzáadás"}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
          {errorMsg}
        </div>
      )}

      <div className="border-t pt-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs felvitt előkészített tétel ehhez a műszakhoz.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 border-b text-left">Név</th>
                  <th className="px-2 py-1 border-b text-left">Kategória</th>
                  <th className="px-2 py-1 border-b text-left">Mennyiség</th>
                  <th className="px-2 py-1 border-b text-left">Státusz</th>
                  <th className="px-2 py-1 border-b text-left">Lejárat</th>
                  <th className="px-2 py-1 border-b text-left">Hely</th>
                  <th className="px-2 py-1 border-b text-left">Megjegyzés</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-2 py-1 border-b">{item.name}</td>
                    <td className="px-2 py-1 border-b">
                      {CATEGORY_LABELS[item.category]}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {item.quantity ?? "-"}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {STATUS_LABELS[item.status]}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {item.expiryAt
                        ? new Intl.DateTimeFormat("hu-SK", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }).format(new Date(item.expiryAt))
                        : "-"}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {item.location ?? "-"}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {item.note ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
