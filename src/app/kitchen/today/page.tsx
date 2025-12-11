"use client";

import { useEffect, useState } from "react";
import type { ShiftChecklistItem, ShiftWithItems } from "@/types/checklists";
import type { User } from "@/types/users";

type RestaurantOption = {
  id: string;
  name: string;
};

export default function KitchenTodayChecklistPage() {
  // Éttermek
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");

  // Műszak + checklist
  const [shiftData, setShiftData] = useState<ShiftWithItems | null>(null);

  // Betöltési állapotok
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Jelenlegi felhasználó (ki pipálta ki)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ===== 1) Éttermek + jelenlegi user betöltése =====
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setError("");

        // Éttermek
        const resRestaurants = await fetch("/api/debug/restaurants");
        if (!resRestaurants.ok) {
          throw new Error("Nem sikerült betölteni az éttermeket.");
        }
        const restaurantJson: RestaurantOption[] = await resRestaurants.json();
        setRestaurants(restaurantJson);

        if (restaurantJson.length > 0) {
          setSelectedRestaurantId(restaurantJson[0].id);
        }

        // Jelenlegi felhasználó (ha van session)
        try {
          const resUser = await fetch("/api/auth/session");
          if (resUser.ok) {
            const sessionJson = await resUser.json();
            // igazítsd a key-eket a saját /api/auth/session válaszodhoz
            if (sessionJson?.user) {
              setCurrentUser(sessionJson.user as User);
            }
          }
        } catch {
          // ha nincs auth, csak csendben elnyeljük
        }
      } catch (err) {
        console.error(err);
        setError("Nem sikerült betölteni a kezdő adatokat.");
      }
    };

    loadInitialData().catch(() => {
      setError("Ismeretlen hiba történt az induláskor.");
    });
  }, []);

  // ===== 2) Mai műszak betöltése =====
  const handleLoadToday = async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/restaurants/${selectedRestaurantId}/shifts/today`
      );

      if (!res.ok) {
        throw new Error(`Hiba: ${res.status}`);
      }

      const data: ShiftWithItems = await res.json();
      setShiftData(data);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült betölteni a mai checklistet.");
    } finally {
      setLoading(false);
    }
  };

  // ===== 3) Egy checklist tétel frissítése (pipa + megjegyzés) =====
  const handleToggleItem = async (item: ShiftChecklistItem) => {
    if (!shiftData) return;

    const newIsDone = !item.isDone;

    // Optimista frissítés a frontenden
    const optimisticallyUpdatedItem: ShiftChecklistItem = {
      ...item,
      isDone: newIsDone,
      doneAt: newIsDone ? new Date().toISOString() : null,
      // doneBy-t a backend fogja beállítani a session alapján
    };

    setShiftData({
      ...shiftData,
      checklistItems: shiftData.checklistItems.map((i) =>
        i.id === item.id ? optimisticallyUpdatedItem : i
      ),
    });

    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/checklists/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isDone: newIsDone,
          note: item.note ?? "",
        }),
      });

      if (!res.ok) {
        throw new Error(`Hiba frissítéskor: ${res.status}`);
      }

      const updatedFromServer: ShiftChecklistItem = await res.json();

      // Visszaírjuk a szerver által visszaadott állapotot
      setShiftData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: prev.checklistItems.map((i) =>
            i.id === updatedFromServer.id ? updatedFromServer : i
          ),
        };
      });
    } catch (err) {
      console.error(err);
      setError("Nem sikerült frissíteni a tételt.");
      // itt akár vissza is lehetne vonni az optimista módosítást,
      // de nem kötelező, így egyszerűbb marad a kód
    } finally {
      setSaving(false);
    }
  };

  // Megjegyzés módosítása (csak a frontend state-ben, opcionálisan küldhetjük külön PATCH-ben is)
  const handleNoteChange = (itemId: string, note: string) => {
    setShiftData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((i) =>
          i.id === itemId ? { ...i, note } : i
        ),
      };
    });
  };

  // ===== 4) Checklistek csoportosítása (ADMIN / CLEANING stb.) =====
  const groupedItems = (() => {
    if (!shiftData) return [];

    const groups: Record<
      string,
      {
        key: string;
        title: string;
        items: ShiftChecklistItem[];
      }
    > = {};

    for (const item of shiftData.checklistItems) {
      const groupKey = item.template.group;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          title: groupKey, // ha szebb címeket szeretnél, itt lehet mappelni
          items: [],
        };
      }
      groups[groupKey]!.items.push(item);
    }

    return Object.values(groups);
  })();

  const restaurantLabel = restaurants.find(
    (r) => r.id === selectedRestaurantId
  )?.name;

  const shiftDate =
    shiftData?.shift?.date != null
      ? new Date(shiftData.shift.date).toLocaleDateString("hu-HU")
      : "";

  const shiftTypeLabel = shiftData?.shift?.type ?? "";

  // ===== Render =====
  return (
    <main className="min-h-screen bg-slate-100 flex justify-center items-start py-10">
      <div className="w-full max-w-3xl bg-white shadow-md rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Konyhai checklist – mai nap
        </h1>

        {/* Étterem választó */}
        <section className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Étterem
          </label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleLoadToday}
            disabled={!selectedRestaurantId || loading}
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2 rounded-md"
          >
            {loading ? "Betöltés..." : "Mai checklist betöltése"}
          </button>

          {error && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
              {error}
            </p>
          )}
        </section>

        {/* Fejléc – aktuális műszak adatai */}
        {shiftData && (
          <section className="border rounded-md px-4 py-3 bg-slate-50 text-sm space-y-1">
            <div>
              <span className="font-semibold">Étterem: </span>
              <span>{restaurantLabel}</span>
            </div>
            <div>
              <span className="font-semibold">Dátum: </span>
              <span>{shiftDate}</span>
            </div>
            <div>
              <span className="font-semibold">Műszak típusa: </span>
              <span>{shiftTypeLabel}</span>
            </div>
            {currentUser && (
              <div>
                <span className="font-semibold">Bejelentkezve: </span>
                <span>{currentUser.name ?? currentUser.email}</span>
              </div>
            )}
          </section>
        )}

        {/* Checklist csoportok */}
        {shiftData && (
          <section className="space-y-6">
            {groupedItems.map((group) => (
              <div key={group.key} className="border rounded-md">
                <div className="px-4 py-2 border-b bg-slate-100 flex justify-between items-center">
                  <div className="font-semibold">
                    {group.title === "ADMIN"
                      ? "ADMIN"
                      : group.title === "CLEANING"
                      ? "CLEANING"
                      : group.title === "PREP"
                      ? "PREP"
                      : group.title}
                  </div>
                </div>

                <div className="divide-y">
                  {group.items.map((item) => {
                    const isDone = item.isDone;
                    const doneByName =
                      item.doneBy?.name ??
                      item.doneBy?.email ??
                      (isDone ? "Ismeretlen dolgozó" : null);

                    return (
                      <div
                        key={item.id}
                        className="px-4 py-3 flex flex-col gap-2 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item)}
                            disabled={saving}
                            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border bg-white flex items-center justify-center"
                          >
                            {isDone && (
                              <span className="block h-3 w-3 rounded bg-emerald-500" />
                            )}
                          </button>

                          <div className="flex-1">
                            <div
                              className={
                                isDone
                                  ? "text-slate-500 line-through"
                                  : "text-slate-800"
                              }
                            >
                              {item.template.label}
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-500">
                              Szerep: {item.template.role} • Zóna:{" "}
                              {item.template.zone}
                            </div>

                            {/* Megjegyzés */}
                            <div className="mt-2">
                              <input
                                type="text"
                                value={item.note ?? ""}
                                onChange={(e) =>
                                  handleNoteChange(item.id, e.target.value)
                                }
                                placeholder="Megjegyzés (opcionális)"
                                className="w-full border rounded-md px-3 py-1 text-sm"
                              />
                            </div>

                            {/* Ki pipálta ki + mikor */}
                            {isDone && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                <span className="block">
                                  Kész:{" "}
                                  {item.doneAt
                                    ? new Date(
                                        item.doneAt
                                      ).toLocaleTimeString("hu-HU", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </span>
                                {doneByName && (
                                  <span className="block">
                                    Dolgozó: {doneByName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {!shiftData && (
          <p className="text-center text-sm text-slate-500">
            Válaszd ki az éttermet, majd kattints a{" "}
            <span className="font-semibold">„Mai checklist betöltése”</span>{" "}
            gombra.
          </p>
        )}
      </div>
    </main>
  );
}
