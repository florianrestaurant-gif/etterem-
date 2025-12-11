"use client";

import { useEffect, useState } from "react";

type TemplateItem = {
  id: string;
  name: string;
  unit: string;
  sortOrder: number;
};

type InventoryRow = {
  templateId: string;
  name: string;
  unit: string;
  quantity: string; // inputmezőhöz string
  note: string;
};

type Lang = "hu" | "sk";

const translations = {
  hu: {
    title: "Konyhai leltár",
    langHu: "Magyar",
    langSk: "Szlovák",
    dateLabel: "Dátum",
    noteLabel: "Megjegyzés (opcionális)",
    notePlaceholder: "pl. reggeli leltár, szállítás után",
    itemHeaderUnit: "Egység",
    itemHeaderQuantity: "Mennyiség",
    itemHeaderNote: "Megjegyzés",
    quantityPlaceholder: "0",
    notePlaceholderRow: "pl. 1 doboz bontva",
    saveButton: "Leltár mentése",
    saveButtonSaving: "Mentés…",
    loading: "Betöltés…",
    msgNeedDate: "Válassz dátumot.",
    msgNeedAtLeastOneItem: "Adj meg legalább egy mennyiséget.",
    msgLoadError: "Nem sikerült betölteni a leltár tételeket.",
    msgUnexpectedLoadError: "Váratlan hiba történt a leltár tételeinek betöltésekor.",
    msgSaveErrorGeneric: "Hiba történt a mentés közben.",
    msgUnexpectedSaveError: "Váratlan hiba történt mentés közben.",
    msgSaved: "Leltár sikeresen elmentve ✅",
  },
  sk: {
    title: "Kuchynská inventúra",
    langHu: "Maďarsky",
    langSk: "Slovensky",
    dateLabel: "Dátum inventúry",
    noteLabel: "Poznámka (nepovinné)",
    notePlaceholder: "napr. ranná inventúra, po dodávke",
    itemHeaderUnit: "Jednotka",
    itemHeaderQuantity: "Množstvo",
    itemHeaderNote: "Poznámka",
    quantityPlaceholder: "0",
    notePlaceholderRow: "napr. 1 krabica otvorená",
    saveButton: "Uložiť inventúru",
    saveButtonSaving: "Ukladám…",
    loading: "Načítavam…",
    msgNeedDate: "Vyber dátum.",
    msgNeedAtLeastOneItem: "Zadaj aspoň jedno množstvo.",
    msgLoadError: "Nepodarilo sa načítať inventúrne položky.",
    msgUnexpectedLoadError: "Nastala neočakávaná chyba pri načítavaní položiek.",
    msgSaveErrorGeneric: "Nastala chyba pri ukladaní.",
    msgUnexpectedSaveError: "Nastala neočakávaná chyba pri ukladaní.",
    msgSaved: "Inventúra úspešne uložená ✅",
  },
};

export default function NewInventoryPage() {
  const [lang, setLang] = useState<Lang>("hu");
  const t = (key: keyof (typeof translations)["hu"]) => translations[lang][key];

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await fetch("/api/inventory/template");
        const data = await res.json();

        if (data.error) {
          setMessage(data.error || t("msgLoadError"));
          return;
        }

        const templateItems: TemplateItem[] = data.items || [];
        const initialRows: InventoryRow[] = templateItems.map((tItem) => ({
          templateId: tItem.id,
          name: tItem.name,
          unit: tItem.unit,
          quantity: "",
          note: "",
        }));

        setRows(initialRows);
      } catch (err) {
        console.error(err);
        setMessage(t("msgUnexpectedLoadError"));
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowChange = (
    index: number,
    field: keyof InventoryRow,
    value: string
  ) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async () => {
    setMessage(null);

    const itemsToSend = rows
      .filter((r) => r.quantity.trim() !== "")
      .map((r) => ({
        templateId: r.templateId,
        quantity: Number(r.quantity.replace(",", ".")),
        note: r.note || undefined,
      }));

    if (!date) {
      setMessage(t("msgNeedDate"));
      return;
    }

    if (itemsToSend.length === 0) {
      setMessage(t("msgNeedAtLeastOneItem"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          note: note || null,
          items: itemsToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("msgSaveErrorGeneric"));
      } else {
        setMessage(t("msgSaved"));
        // mennyiségek és sor-megjegyzések nullázása
        setRows((prev) =>
          prev.map((r) => ({ ...r, quantity: "", note: "" }))
        );
      }
    } catch (err) {
      console.error(err);
      setMessage(t("msgUnexpectedSaveError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-xl mx-auto text-sm">{t("loading")}</div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Fejléc + nyelvválasztó */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold sm:text-xl">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLang("hu")}
            className={`px-3 py-1 border rounded text-xs sm:text-sm ${
              lang === "hu" ? "bg-gray-200 font-semibold" : ""
            }`}
          >
            HU – {t("langHu")}
          </button>
          <button
            type="button"
            onClick={() => setLang("sk")}
            className={`px-3 py-1 border rounded text-xs sm:text-sm ${
              lang === "sk" ? "bg-gray-200 font-semibold" : ""
            }`}
          >
            SK – {t("langSk")}
          </button>
        </div>
      </div>

      {message && (
        <div className="border px-3 py-2 rounded text-xs sm:text-sm">
          {message}
        </div>
      )}

      {/* Fejléc mezők */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            {t("dateLabel")}
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm mb-1">
            {t("noteLabel")}
          </label>
          <input
            type="text"
            className="border rounded px-2 py-1 w-full text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
          />
        </div>
      </div>

      {/* Tétellista – kártyák mobilra optimalizálva */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {rows.map((row, idx) => (
          <div
            key={row.templateId}
            className="border rounded-md px-3 py-2 space-y-1 bg-white"
          >
            {/* Név + egység egy sorban */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium text-sm">{row.name}</div>
              <div className="text-xs text-gray-500">
                {t("itemHeaderUnit")}: {row.unit}
              </div>
            </div>

            {/* Mennyiség */}
            <div className="mt-1">
              <label className="block text-[11px] text-gray-600 mb-0.5">
                {t("itemHeaderQuantity")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="border rounded px-2 py-1 w-full text-right text-sm"
                value={row.quantity}
                onChange={(e) =>
                  handleRowChange(idx, "quantity", e.target.value)
                }
                placeholder={t("quantityPlaceholder")}
              />
            </div>

            {/* Megjegyzés */}
            <div className="mt-1">
              <label className="block text-[11px] text-gray-600 mb-0.5">
                {t("itemHeaderNote")}
              </label>
              <input
                type="text"
                className="border rounded px-2 py-1 w-full text-sm"
                value={row.note}
                onChange={(e) =>
                  handleRowChange(idx, "note", e.target.value)
                }
                placeholder={t("notePlaceholderRow")}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mentés gomb – nagy, könnyen nyomható */}
      <div className="pt-1 pb-4 sticky bottom-0 bg-[rgba(255,255,255,0.95)] backdrop-blur">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full px-4 py-3 border rounded font-medium text-sm sm:text-base disabled:opacity-60"
        >
          {saving ? t("saveButtonSaving") : t("saveButton")}
        </button>
      </div>
    </div>
  );
}
