"use client";

import { useEffect, useState } from "react";

type DailyChecklistItem = {
  id: string;
  label: string;
  isDone: boolean;
  note: string | null;
};

type DailyChecklist = {
  id: string;
  date: string;
  type: "OPENING" | "CLOSING";
  items: DailyChecklistItem[];
};

// Takarítási feladat típus – CleaningLog alapján
type DailyCleaningItem = {
  logId: string;
  task: string;
  description: string | null;
  isDone: boolean;
  comment: string | null;
};

// HELYI dátum (nem UTC)
function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readApiError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error || `Hiba történt. (${res.status})`;
}

export default function DailyChecklistsPage() {
  const todayStr = formatDateInput(new Date());

  const [date, setDate] = useState<string>(todayStr);
  const [checklistType, setChecklistType] = useState<"OPENING" | "CLOSING">(
    "OPENING"
  );
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Takarítási feladatok state
  const [cleaningItems, setCleaningItems] = useState<DailyCleaningItem[]>([]);
  const [loadingCleaning, setLoadingCleaning] = useState(false);
  const [savingCleaningId, setSavingCleaningId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Betöltés – checklist
  // ---------------------------------------------------------------------------
  async function loadChecklist() {
    try {
      setLoading(true);
      setError(null);
      setChecklist(null);

      const params = new URLSearchParams({
        date,
        type: checklistType,
      });

      const res = await fetch(`/api/haccp/daily-checklists?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const data = (await res.json()) as { ok?: boolean; checklist?: DailyChecklist | null };
      setChecklist(data.checklist ?? null);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Nem sikerült betölteni a napi checklistet."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Betöltés – takarítási feladatok
  // ---------------------------------------------------------------------------
  async function loadCleaningItems() {
    try {
      setLoadingCleaning(true);
      setError(null);
      setCleaningItems([]);

      const params = new URLSearchParams({ date });

      const res = await fetch(`/api/haccp/daily-cleaning?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const data = await res.json();
      setCleaningItems(data.items || []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Nem sikerült betölteni a takarítási feladatokat."
      );
    } finally {
      setLoadingCleaning(false);
    }
  }

  useEffect(() => {
    loadChecklist();
    loadCleaningItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, checklistType]);

  // ---------------------------------------------------------------------------
  // Pipálás – checklist
  // ---------------------------------------------------------------------------
  async function toggleItem(item: DailyChecklistItem) {
    const next = !item.isDone;

    // Optimista UI (azonnal átállítjuk)
    setChecklist((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) =>
              it.id === item.id ? { ...it, isDone: next } : it
            ),
          }
        : prev
    );

    try {
      setSavingId(item.id);
      setError(null);

      const res = await fetch("/api/haccp/daily-checklists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          isDone: next,
          note: item.note,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const data = (await res.json()) as { ok?: boolean; item?: DailyChecklistItem };

      const updated = data.item;
      if (!updated) return;

      // szerver a forrás: szinkron
      setChecklist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) =>
                it.id === updated.id
                  ? { ...it, isDone: updated.isDone, note: updated.note }
                  : it
              ),
            }
          : prev
      );
    } catch (err) {
      console.error(err);

      // rollback optimista UI
      setChecklist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) =>
                it.id === item.id ? { ...it, isDone: item.isDone } : it
              ),
            }
          : prev
      );

      setError(
        err instanceof Error
          ? err.message
          : "Nem sikerült frissíteni a checklist pontot."
      );
    } finally {
      setSavingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Pipálás – takarítási feladat (CleaningLog alapján)
  // ---------------------------------------------------------------------------
  async function toggleCleaningItem(item: DailyCleaningItem) {
    const next = !item.isDone;

    // Optimista UI
    setCleaningItems((prev) =>
      prev.map((it) => (it.logId === item.logId ? { ...it, isDone: next } : it))
    );

    try {
      setSavingCleaningId(item.logId);
      setError(null);

      const res = await fetch("/api/haccp/daily-cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: item.logId,
          isDone: next,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const data = await res.json();
      const updated = data.item as DailyCleaningItem | undefined;

      if (updated) {
        setCleaningItems((prev) =>
          prev.map((it) => (it.logId === updated.logId ? updated : it))
        );
      }
    } catch (err) {
      console.error(err);

      // rollback
      setCleaningItems((prev) =>
        prev.map((it) =>
          it.logId === item.logId ? { ...it, isDone: item.isDone } : it
        )
      );

      setError(
        err instanceof Error
          ? err.message
          : "Nem sikerült frissíteni a takarítási feladatot."
      );
    } finally {
      setSavingCleaningId(null);
    }
  }

  const remainingCount = checklist?.items.filter((it) => !it.isDone).length ?? 0;
  const remainingCleaning = cleaningItems.filter((it) => !it.isDone).length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-2">Napi nyitás / zárás checklist</h1>
      <p className="text-sm text-gray-600">
        A pipált pontok automatikusan mentésre kerülnek az étterem HACCP
        naplójába.
      </p>

      {/* Fejléc: dátum, típus, státusz */}
      <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Dátum</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Checklist típusa</span>
          <div className="inline-flex border rounded overflow-hidden text-sm">
            <button
              type="button"
              className={`px-3 py-1 ${
                checklistType === "OPENING"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
              onClick={() => setChecklistType("OPENING")}
            >
              Nyitás
            </button>
            <button
              type="button"
              className={`px-3 py-1 ${
                checklistType === "CLOSING"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
              onClick={() => setChecklistType("CLOSING")}
            >
              Zárás
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Állapot</span>
            {loading ? (
              <span className="text-gray-500">Betöltés...</span>
            ) : checklist && checklist.items.length > 0 ? (
              remainingCount === 0 ? (
                <span className="text-green-600">Minden pont kipipálva.</span>
              ) : (
                <span className="text-orange-600">
                  Még {remainingCount} pont van hátra.
                </span>
              )
            ) : (
              <span className="text-gray-500">–</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold">Takarítás</span>
            {loadingCleaning ? (
              <span className="text-gray-500 text-xs">Betöltés...</span>
            ) : cleaningItems.length === 0 ? (
              <span className="text-gray-500 text-xs">
                Nincs meghatározott takarítási feladat.
              </span>
            ) : remainingCleaning === 0 ? (
              <span className="text-green-600 text-xs">
                Minden takarítási pont kész.
              </span>
            ) : (
              <span className="text-orange-600 text-xs">
                Még {remainingCleaning} takarítási pont van hátra.
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            loadChecklist();
            loadCleaningItems();
          }}
          className="ml-auto px-3 py-1 border rounded text-sm hover:bg-gray-50"
        >
          Frissítés
        </button>
      </div>

      {/* Hibaüzenet */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Checklist */}
      <div className="border rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-2 font-semibold text-sm">
          {checklistType === "OPENING"
            ? "Nyitás előtti checklist"
            : "Zárás előtti checklist"}
        </div>

        {loading ? (
          <div className="px-4 py-3 text-sm text-gray-500">Betöltés...</div>
        ) : !checklist || checklist.items.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            Ehhez a naphoz még nincs definiált checklist.
          </div>
        ) : (
          <ul className="divide-y">
            {checklist.items.map((item) => (
              <li key={item.id} className="px-4 py-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.isDone}
                  disabled={savingId === item.id}
                  onChange={() => toggleItem(item)}
                  className="w-4 h-4"
                />
                <span
                  className={`text-sm ${
                    item.isDone ? "line-through text-gray-500" : ""
                  }`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Takarítási feladatok */}
      <div className="border rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-2 font-semibold text-sm">
          Takarítási feladatok (sablon alapján)
        </div>

        {loadingCleaning ? (
          <div className="px-4 py-3 text-sm text-gray-500">Betöltés...</div>
        ) : cleaningItems.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            Ehhez a naphoz nincs takarítási sablon beállítva.
          </div>
        ) : (
          <ul className="divide-y">
            {cleaningItems.map((item) => (
              <li key={item.logId} className="px-4 py-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={item.isDone}
                    disabled={savingCleaningId === item.logId}
                    onChange={() => toggleCleaningItem(item)}
                  />
                  <span
                    className={`text-sm ${
                      item.isDone ? "line-through text-gray-500" : ""
                    }`}
                  >
                    {item.task}
                  </span>
                </div>
                {item.description && (
                  <div className="text-xs text-gray-500 ml-6 sm:ml-7">
                    {item.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
