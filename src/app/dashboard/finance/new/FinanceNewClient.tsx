// src/app/dashboard/finance/new/FinanceNewClient.tsx
"use client";

import React, {
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { useRouter } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
};

type ExpenseInput = {
  supplierId: string;
  amount: string;
};

type ApiErrorResponse = {
  error?: string;
};

type LanguageCode = "hu" | "sk";

const TEXTS: Record<
  LanguageCode,
  {
    title: string;
    subtitle: string;
    dateLabel: string;
    restaurantLabel: string;
    restaurantReadonlyPrefix: string;
    revenueSectionTitle: string;
    suppliersSectionTitle: string;
    addRow: string;
    noSupplierRows: string;
    saveButton: string;
    savingButton: string;
    errorLoadingSuppliers: string;
    savedMessage: string;
  }
> = {
  hu: {
    title: "Új napi zárás rögzítése",
    subtitle:
      "Itt tudod Excel nélkül, közvetlenül a rendszerbe beírni a napi bevételeket és beszállítói kiadásokat.",
    dateLabel: "Dátum",
    restaurantLabel: "Étterem",
    restaurantReadonlyPrefix: "Aktív étterem:",
    revenueSectionTitle: "Bevételi csatornák (napi bevétel)",
    suppliersSectionTitle: "Beszállítói kiadások (az adott napra)",
    addRow: "+ Sor hozzáadása",
    noSupplierRows:
      "Még nincs egyetlen beszállítói sor sem. Kattints a „+ Sor hozzáadása” gombra.",
    saveButton: "Mentés",
    savingButton: "Mentés...",
    errorLoadingSuppliers: "Nem sikerült lekérni a beszállítókat.",
    savedMessage: "Sikeresen rögzítve!",
  },
  sk: {
    // később ide jöhetnek a szlovák fordítások
    title: "Új napi zárás rögzítése",
    subtitle:
      "Itt tudod Excel nélkül, közvetlenül a rendszerbe beírni a napi bevételeket és beszállítói kiadásokat.",
    dateLabel: "Dátum",
    restaurantLabel: "Étterem",
    restaurantReadonlyPrefix: "Aktív étterem:",
    revenueSectionTitle: "Bevételi csatornák (napi bevétel)",
    suppliersSectionTitle: "Beszállítói kiadások (az adott napra)",
    addRow: "+ Sor hozzáadása",
    noSupplierRows:
      "Még nincs egyetlen beszállítói sor sem. Kattints a „+ Sor hozzáadása” gombra.",
    saveButton: "Mentés",
    savingButton: "Mentés...",
    errorLoadingSuppliers: "Nem sikerült lekérni a beszállítókat.",
    savedMessage: "Sikeresen rögzítve!",
  },
};

type Props = {
  defaultDate: string;
  defaultRestaurantId: string;
  restaurantName: string;
  isGlobalAdmin: boolean;
  restaurantsForAdmin: { id: string; name: string; slug: string }[] | null;
  lang?: LanguageCode;
};

export default function FinanceNewClient({
  defaultDate,
  defaultRestaurantId,
  restaurantName,
  isGlobalAdmin,
  restaurantsForAdmin,
  lang = "hu",
}: Props) {
  const router = useRouter();
  const t = TEXTS[lang];

  const [date, setDate] = useState(defaultDate);
  const [restaurantId, setRestaurantId] = useState(defaultRestaurantId);

  // Bevételi mezők (string formában az inputokhoz)
  const [kassza, setKassza] = useState<string>("");
  const [rozvoz, setRozvoz] = useState<string>("");
  const [bistro, setBistro] = useState<string>("");
  const [restaumatic, setRestaumatic] = useState<string>("");
  const [dochodca, setDochodca] = useState<string>("");
  const [faktura, setFaktura] = useState<string>("");
  const [zostatok, setZostatok] = useState<string>("");
  const [ubytovanie, setUbytovanie] = useState<string>(""); // Booking bevétel

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<ExpenseInput[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revenueFields: {
    key: string;
    label: string;
    value: string;
    setter: Dispatch<SetStateAction<string>>;
  }[] = [
    { key: "kassza", label: "Kassza", value: kassza, setter: setKassza },
    { key: "rozvoz", label: "Rozvoz", value: rozvoz, setter: setRozvoz },
    { key: "bistro", label: "Bistro", value: bistro, setter: setBistro },
    {
      key: "restaumatic",
      label: "Restaumatic",
      value: restaumatic,
      setter: setRestaumatic,
    },
    {
      key: "dochodca",
      label: "Dôchodca",
      value: dochodca,
      setter: setDochodca,
    },
    {
      key: "faktura",
      label: "Faktúra",
      value: faktura,
      setter: setFaktura,
    },
    {
      key: "zostatok",
      label: "Zostatok",
      value: zostatok,
      setter: setZostatok,
    },
    {
      key: "ubytovanie",
      label: "Booking (ubytovanie)",
      value: ubytovanie,
      setter: setUbytovanie,
    },
  ];

  // Beszállítók betöltése
  async function loadSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      if (!res.ok) {
        setError(t.errorLoadingSuppliers);
        return;
      }
      const json = (await res.json()) as Supplier[];
      setSuppliers(json);
    } catch (err) {
      console.error(err);
      setError(t.errorLoadingSuppliers);
    }
  }

  useEffect(() => {
    void loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addExpenseRow() {
    setExpenses((prev) => [...prev, { supplierId: "", amount: "" }]);
  }

  function removeExpenseRow(index: number) {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!restaurantId) {
      setError("Válassz éttermet a mentéshez.");
      setSaving(false);
      return;
    }

    const body = {
      restaurantIdentifier: restaurantId, // ID-t küldünk, nem kell slug
      date,
      kassza: kassza === "" ? null : Number(kassza),
      rozvoz: rozvoz === "" ? null : Number(rozvoz),
      bistro: bistro === "" ? null : Number(bistro),
      restaumatic: restaumatic === "" ? null : Number(restaumatic),
      dochodca: dochodca === "" ? null : Number(dochodca),
      faktura: faktura === "" ? null : Number(faktura),
      zostatok: zostatok === "" ? null : Number(zostatok),
      ubytovanie: ubytovanie === "" ? null : Number(ubytovanie),
      expenses: expenses
        .filter((e) => e.supplierId && e.amount !== "")
        .map((e) => ({
          supplierId: e.supplierId,
          amount: Number(e.amount),
        })),
    };

    try {
      const res = await fetch("/api/daily-finance/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiErrorResponse;

      if (!res.ok) {
        setError(json.error ?? "Hiba történt a mentés során.");
        setSaving(false);
        return;
      }

      setMessage(t.savedMessage);
      setSaving(false);

      // Mezők nullázása
      setKassza("");
      setRozvoz("");
      setBistro("");
      setRestaumatic("");
      setDochodca("");
      setFaktura("");
      setZostatok("");
      setUbytovanie("");
      setExpenses([]);

      // Néhány száz ms után vissza a pénzügyi listára
      setTimeout(() => {
        router.push("/dashboard/finance");
      }, 600);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni a mentési kérést.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="text-sm text-gray-600">{t.subtitle}</p>
      </header>

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

      <section className="border rounded-lg p-4 space-y-4 bg-white">
        {/* Alap adatok */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t.dateLabel}
            </label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t.restaurantLabel}
            </label>

            {isGlobalAdmin ? (
              <select
                className="border rounded px-2 py-1 text-sm w-full"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              >
                <option value="">Válassz éttermet…</option>
                {(restaurantsForAdmin ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-800">
                <span className="text-gray-500 mr-1">
                  {t.restaurantReadonlyPrefix}
                </span>
                <span className="font-medium">{restaurantName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bevételi mezők */}
        <div>
          <h2 className="font-semibold text-sm mb-2">
            {t.revenueSectionTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {revenueFields.map(({ key, label, value, setter }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Beszállítók */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
            <h2 className="font-semibold text-sm">
              {t.suppliersSectionTitle}
            </h2>
            <button
              type="button"
              onClick={addExpenseRow}
              className="px-2 py-1 bg-black text-white text-xs rounded self-start sm:self-auto"
            >
              {t.addRow}
            </button>
          </div>

          <div className="space-y-2">
            {expenses.length === 0 && (
              <p className="text-xs text-gray-500">{t.noSupplierRows}</p>
            )}

            {expenses.map((exp, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
              >
                <select
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={exp.supplierId}
                  onChange={(e) => {
                    const { value } = e.target;
                    setExpenses((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, supplierId: value } : row
                      )
                    );
                  }}
                >
                  <option value="">Válassz beszállítót…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Összeg (€)"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={exp.amount}
                  onChange={(e) => {
                    const { value } = e.target;
                    setExpenses((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, amount: value } : row
                      )
                    );
                  }}
                />

                <button
                  type="button"
                  onClick={() => removeExpenseRow(index)}
                  className="text-red-600 text-xs"
                >
                  Sor törlése
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
        >
          {saving ? t.savingButton : t.saveButton}
        </button>
      </section>
    </div>
  );
}
