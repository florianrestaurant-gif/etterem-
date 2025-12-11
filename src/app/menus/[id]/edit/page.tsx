"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type CourseType = "soup" | "main" | "dessert" | "other";

type Item = {
  id: string;
  dayIndex: number;
  titleHU: string;
  titleSK: string | null;
  descHU?: string | null;
  descSK?: string | null;
  priceCents?: number | null;
  allergens?: string | null;

  menuLabel?: string | null;
  courseType?: CourseType | null;
  allWeek: boolean;
};

type DraftItem = {
  dayIndex: number;
  titleHU: string;
  titleSK?: string;
  descHU?: string;
  descSK?: string;
  price?: number;
  allergens?: string;

  menuLabel?: string;
  courseType?: CourseType;
  allWeek?: boolean;
};

type ApiMenuResp = {
  ok: boolean;
  data?: { items: Item[] };
  error?: string;
};

type ApiItemResp =
  | { ok: true; data: Item }
  | { ok: false; error: string };

const days = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
] as const;

export default function EditMenuPage() {
  const params = useParams<{ id: string }>();
  const menuId = params.id;

  const [draft, setDraft] = useState<DraftItem>({
    dayIndex: 0,
    titleHU: "",
    allWeek: false,
  });

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MENÜ BETÖLTÉSE
  useEffect(() => {
    if (!menuId) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/menus/${encodeURIComponent(menuId)}`, {
          cache: "no-store",
        });

        const txt = await res.text();
        let json: ApiMenuResp;
        try {
          json = JSON.parse(txt) as ApiMenuResp;
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

        setItems(json.data?.items ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ismeretlen hiba");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [menuId]);

  // TÉTEL HOZZÁADÁSA
  const addItem = async () => {
    setError(null);

    if (!menuId) {
      setError("Hiányzik a menü azonosító az URL-ből.");
      return;
    }
    if (!draft.titleHU.trim()) {
      setError("Az étel magyar neve kötelező.");
      return;
    }

    const priceCents =
      typeof draft.price === "number"
        ? Math.round(draft.price * 100)
        : 0;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/menus/${encodeURIComponent(menuId)}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayIndex: draft.dayIndex,
            titleHU: draft.titleHU,
            titleSK: draft.titleSK ?? "",
            descHU: draft.descHU ?? "",
            descSK: draft.descSK ?? "",
            priceCents,
            allergens: draft.allergens ?? "",
            menuLabel: draft.menuLabel ?? "",
            courseType: draft.courseType ?? null,
            allWeek: draft.allWeek ?? false,
          }),
        }
      );

      const txt = await res.text();
      let json: ApiItemResp;
      try {
        json = JSON.parse(txt) as ApiItemResp;
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

      setItems((prev) => [...prev, json.data]);
      setDraft({
        dayIndex: 0,
        titleHU: "",
        titleSK: "",
        descHU: "",
        descSK: "",
        price: undefined,
        allergens: "",
        menuLabel: "",
        courseType: undefined,
        allWeek: false,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-center">Betöltés…</p>;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Tétel hozzáadása</h1>

        {/* ÚJ TÉTEL ŰRLAP – HU + SK + csoportosítás */}
        <div className="grid md:grid-cols-2 gap-4 border rounded-lg p-4 bg-white">
          {/* Nap */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nap {draft.dayIndex} — {days[draft.dayIndex]}
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={draft.dayIndex}
              onChange={(e) =>
                setDraft({ ...draft, dayIndex: Number(e.target.value) })
              }
              disabled={draft.allWeek}
            >
              {days.map((d, i) => (
                <option key={i} value={i}>
                  {i} — {d}
                </option>
              ))}
            </select>
            <label className="mt-2 inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={draft.allWeek ?? false}
                onChange={(e) =>
                  setDraft({ ...draft, allWeek: e.target.checked })
                }
              />
              Ugyanaz egész héten
            </label>
          </div>

          {/* Magyar név */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Étel neve (HU)
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={draft.titleHU}
              onChange={(e) =>
                setDraft({ ...draft, titleHU: e.target.value })
              }
              placeholder="pl. Sült tarja, paprikás krumpli"
            />
          </div>

          {/* Menü címke */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Menü címke (opcionális)
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={draft.menuLabel ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, menuLabel: e.target.value })
              }
              placeholder='pl. "Menü 1", "Business menü", "Heti ajánlat"'
            />
          </div>

          {/* Fogás típusa */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Fogás típusa
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={draft.courseType ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  courseType: (e.target.value || undefined) as
                    | CourseType
                    | undefined,
                })
              }
            >
              <option value="">– nincs megadva –</option>
              <option value="soup">Leves</option>
              <option value="main">Főétel</option>
              <option value="dessert">Desszert</option>
              <option value="other">Egyéb</option>
            </select>
          </div>

          {/* Magyar leírás */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Leírás (HU)
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={draft.descHU ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, descHU: e.target.value })
              }
              placeholder="opcionális"
            />
          </div>

          {/* Ár EUR-ban */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ár (EUR)
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              type="number"
              step="0.01"
              value={draft.price ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  price:
                    e.target.value === ""
                      ? undefined
                      : Number(e.target.value),
                })
              }
              placeholder="pl. 6.90"
            />
            <p className="mt-1 text-xs text-neutral-500">
              A szerverre centben kerül mentésre (6.90 → 690).
            </p>
          </div>

          {/* Allergének + SK mezők */}
          <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
            {/* Allergének */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Allergének (pl. 1,3,7)
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={draft.allergens ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, allergens: e.target.value })
                }
                placeholder="opcionális"
              />
            </div>

            {/* SK név + leírás */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Názov jedla (SK) – opcionális
              </label>
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                value={draft.titleSK ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, titleSK: e.target.value })
                }
                placeholder="pl. Vyprážaná krkovička"
              />
              <label className="block text-sm font-medium mb-1">
                Popis (SK) – opcionálny
              </label>
              <input
                className="w-full border rounded px-3 py-2"
                value={draft.descSK ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, descSK: e.target.value })
                }
                placeholder="opcionálne"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 mt-4"
          onClick={addItem}
          disabled={saving}
        >
          {saving ? "Mentés…" : "Hozzáadás"}
        </button>
      </section>

      {/* FELVITT TÉTELEK + SZERKESZTÉS */}
      <section>
        <h2 className="text-xl font-semibold mb-2">
          Felvitt tételek
        </h2>

        {items.length === 0 ? (
          <p className="opacity-70">Még nincs tétel.</p>
        ) : (
          <ul className="space-y-2">
            {items
              .slice()
              .sort((a, b) => a.dayIndex - b.dayIndex)
              .map((it) => (
                <EditableItem
                  key={it.id}
                  menuId={menuId}
                  item={it}
                  onUpdated={(updated) =>
                    setItems((prev) =>
                      prev.map((p) => (p.id === updated.id ? updated : p))
                    )
                  }
                />
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// ---- EGY TÉTEL SZERKESZTHETŐ BLOKKJA ----

type EditableItemProps = {
  menuId: string;
  item: Item;
  onUpdated: (item: Item) => void;
};

function EditableItem({ menuId, item, onUpdated }: EditableItemProps) {
  const [editMode, setEditMode] = useState(false);

  const [dayIndex, setDayIndex] = useState(item.dayIndex);
  const [titleHU, setTitleHU] = useState(item.titleHU);
  const [titleSK, setTitleSK] = useState(item.titleSK ?? "");
  const [descHU, setDescHU] = useState(item.descHU ?? "");
  const [descSK, setDescSK] = useState(item.descSK ?? "");
  const [allergens, setAllergens] = useState(item.allergens ?? "");
  const [priceCents, setPriceCents] = useState(item.priceCents ?? 0);

  const [menuLabel, setMenuLabel] = useState(item.menuLabel ?? "");
  const [courseType, setCourseType] = useState<CourseType | "" | null>(
    item.courseType ?? ""
  );
  const [allWeek, setAllWeek] = useState<boolean>(item.allWeek ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceEur = (priceCents || 0) / 100;

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(
        `/api/menus/${encodeURIComponent(
          menuId
        )}/items/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayIndex,
            titleHU,
            titleSK,
            descHU,
            descSK,
            allergens,
            priceCents,
            menuLabel,
            courseType: courseType || null,
            allWeek,
          }),
        }
      );

      const txt = await res.text();
      let json: ApiItemResp;
      try {
        json = JSON.parse(txt) as ApiItemResp;
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

      onUpdated(json.data);
      setEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setSaving(false);
    }
  };

  if (!editMode) {
    return (
      <li className="border rounded px-3 py-2 bg-white">
        <div className="text-xs opacity-70">
          {allWeek ? "Egész hét" : `${dayIndex} — ${days[dayIndex]}`}
          {menuLabel && ` · ${menuLabel}`}
        </div>
        <div className="font-medium flex justify-between gap-2">
          <span>{titleHU}</span>
          {typeof priceCents === "number" && priceCents > 0 && (
            <span className="opacity-70">
              {(priceCents / 100).toFixed(2)} €
            </span>
          )}
        </div>
        {titleSK && (
          <div className="text-xs opacity-70">SK: {titleSK}</div>
        )}
        {descHU && (
          <div className="text-sm opacity-80 mt-1">{descHU}</div>
        )}
        {descSK && (
          <div className="text-xs opacity-70">SK: {descSK}</div>
        )}
        {courseType && (
          <div className="text-[10px] uppercase tracking-wide opacity-60 mt-1">
            {courseType === "soup"
              ? "Leves"
              : courseType === "main"
              ? "Főétel"
              : courseType === "dessert"
              ? "Desszert"
              : "Egyéb"}
          </div>
        )}
        {allergens && (
          <div className="text-xs opacity-60 mt-1">
            Allergének: {allergens}
          </div>
        )}
        <button
          className="mt-2 text-xs px-3 py-1 border rounded"
          onClick={() => setEditMode(true)}
        >
          Szerkesztés
        </button>
      </li>
    );
  }

  // szerkesztő mód
  return (
    <li className="border rounded px-3 py-2 bg-neutral-50 space-y-2">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">
            Nap
          </label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={dayIndex}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            disabled={allWeek}
          >
            {days.map((d, i) => (
              <option key={i} value={i}>
                {i} — {d}
              </option>
            ))}
          </select>
          <label className="mt-2 inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allWeek}
              onChange={(e) => setAllWeek(e.target.checked)}
            />
            Ugyanaz egész héten
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Ár (centben)
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            type="number"
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value))}
          />
          <p className="text-[10px] text-neutral-500 mt-1">
            Jelenlegi ár: {priceEur.toFixed(2)} €
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Név (HU)
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={titleHU}
            onChange={(e) => setTitleHU(e.target.value)}
          />
          <label className="block text-xs font-medium mb-1 mt-2">
            Leírás (HU)
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={descHU}
            onChange={(e) => setDescHU(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Név (SK)
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={titleSK}
            onChange={(e) => setTitleSK(e.target.value)}
          />
          <label className="block text-xs font-medium mb-1 mt-2">
            Popis (SK)
          </label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={2}
            value={descSK}
            onChange={(e) => setDescSK(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Menü címke
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={menuLabel}
            onChange={(e) => setMenuLabel(e.target.value)}
          />
          <label className="block text-xs font-medium mb-1 mt-2">
            Fogás típusa
          </label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={courseType ?? ""}
            onChange={(e) =>
              setCourseType(
                (e.target.value || "") as CourseType | "" | null
              )
            }
          >
            <option value="">– nincs –</option>
            <option value="soup">Leves</option>
            <option value="main">Főétel</option>
            <option value="dessert">Desszert</option>
            <option value="other">Egyéb</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">
            Allergének
          </label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={allergens}
            onChange={(e) => setAllergens(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          className="text-xs px-3 py-1 border rounded"
          onClick={() => setEditMode(false)}
          disabled={saving}
        >
          Mégse
        </button>
        <button
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Mentés…" : "Mentés"}
        </button>
      </div>
    </li>
  );
}
