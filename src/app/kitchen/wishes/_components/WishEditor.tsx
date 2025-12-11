// src/app/kitchen/wishes/_components/WishEditor.tsx
"use client";

import { useState } from "react";

type ShiftWishStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type WishItem = {
  id: string;
  title: string;
  description: string;
  status: ShiftWishStatus;
  createdByEmail: string | null;
  createdAt: string;
};

type Props = {
  shiftId: string;
  initialWishes: WishItem[];
};

const STATUS_LABELS: Record<ShiftWishStatus, string> = {
  OPEN: "Nyitott",
  IN_PROGRESS: "Folyamatban",
  DONE: "Kész",
  CANCELLED: "Törölve",
};

export function WishEditor({ shiftId, initialWishes }: Props) {
  const [wishes, setWishes] = useState<WishItem[]>(initialWishes);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    title: string;
    description: string;
  }>({
    title: "",
    description: "",
  });

  function handleChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("Adj meg egy címet a kívánság tételnek.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/kitchen/shift-wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        wish?: {
          id: string;
          title: string;
          description: string | null;
          status: ShiftWishStatus;
          createdAt: string;
          createdBy?: { email?: string | null };
        };
      };

      if (!res.ok || !data.ok || !data.wish) {
        setErrorMsg(data.error ?? "Nem sikerült menteni a kívánságot.");
        setIsSaving(false);
        return;
      }

      const newWish: WishItem = {
        id: data.wish.id,
        title: data.wish.title,
        description: data.wish.description ?? "",
        status: data.wish.status,
        createdAt: data.wish.createdAt,
        createdByEmail: data.wish.createdBy?.email ?? null,
      };

      setWishes((prev) => [...prev, newWish]);
      setForm({ title: "", description: "" });
      setIsSaving(false);
    } catch (err) {
      console.error("WishEditor submit error", err);
      setErrorMsg("Hálózati hiba miatt nem sikerült menteni.");
      setIsSaving(false);
    }
  }

  // 🔹 Státusz pipálása: DONE ↔ OPEN
  async function toggleDone(wish: WishItem) {
    const newStatus: ShiftWishStatus =
      wish.status === "DONE" ? "OPEN" : "DONE";

    // optimista frissítés
    setWishes((prev) =>
      prev.map((w) =>
        w.id === wish.id
          ? {
              ...w,
              status: newStatus,
            }
          : w
      )
    );

    try {
      const res = await fetch(`/api/kitchen/shift-wishes/${wish.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        // visszaállítjuk, ha hiba volt
        setWishes((prev) =>
          prev.map((w) =>
            w.id === wish.id
              ? {
                  ...w,
                  status: wish.status,
                }
              : w
          )
        );
        setErrorMsg(data.error ?? "Nem sikerült frissíteni a státuszt.");
      }
    } catch (err) {
      console.error("toggleDone error", err);
      setWishes((prev) =>
        prev.map((w) =>
          w.id === wish.id
            ? {
                ...w,
                status: wish.status,
              }
            : w
        )
      );
      setErrorMsg("Hálózati hiba miatt nem sikerült frissíteni a státuszt.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start"
      >
        <div className="space-y-1 md:col-span-1">
          <label className="block text-xs font-medium text-gray-700">
            Kívánság címe
          </label>
          <input
            type="text"
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Pl. Előkészített köretek 18:00-ra"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-700">
            Részletek (mit vártok az előző műszaktól)
          </label>
          <textarea
            className="w-full rounded-md border px-2 py-1.5 text-sm min-h-[70px]"
            placeholder={`Pl.:
• Holnapi esti műszakra kérlek készítsetek elő:
  - 2 GN burgonyapüré
  - 1 GN grillezett zöldség
  - 20 adag desszert tálalásra kész állapotban`}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-black text-white disabled:opacity-60"
          >
            {isSaving ? "Mentés..." : "Kívánság hozzáadása"}
          </button>
        </div>
      </form>

      {errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
          {errorMsg}
        </div>
      )}

      <div className="border-t pt-3">
        {wishes.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs felvitt kívánság ehhez a műszakhoz.
          </p>
        ) : (
          <div className="space-y-2">
            {wishes.map((w) => (
              <div
                key={w.id}
                className="border rounded-lg px-3 py-2 bg-gray-50 flex flex-col gap-1"
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={w.status === "DONE"}
                      onChange={() => toggleDone(w)}
                    />
                    <div className="font-medium text-sm">{w.title}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-700">
                    {STATUS_LABELS[w.status]}
                  </span>
                </div>
                {w.description && (
                  <div className="text-xs text-gray-700 whitespace-pre-line">
                    {w.description}
                  </div>
                )}
                <div className="text-[11px] text-gray-400 flex justify-between">
                  <span>
                    Rögzítve:{" "}
                    {new Intl.DateTimeFormat("hu-SK", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(w.createdAt))}
                  </span>
                  {w.createdByEmail && <span>{w.createdByEmail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
