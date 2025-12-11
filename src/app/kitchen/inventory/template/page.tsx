"use client";

import { useEffect, useState } from "react";

type TemplateItem = {
  id: string;
  name: string;
  unit: string;
  sortOrder: number;
};

type Lang = "hu" | "sk";

const translations = {
  hu: {
    title: "Leltár tételek – admin",
    langHu: "Magyar",
    langSk: "Szlovák",
    newItemTitle: "Új alapanyag felvétele",
    nameLabel: "Megnevezés",
    namePlaceholder: "pl. kuracie prsia v obale",
    unitLabel: "Egység",
    unitPlaceholder: "kg / ks / l",
    addButton: "Hozzáadás",
    tableIndex: "#",
    tableName: "Alapanyag",
    tableUnit: "Egység",
    tableActions: "Műveletek",
    delete: "Törlés",
    loading: "Betöltés…",
    empty: "Még nincs leltár tétel.",
    saveOrder: "Sorrend mentése",
    saveOrderSaving: "Sorrend mentése…",
    confirmDelete: "Biztosan törlöd ezt a tételt?",
    errorLoad: "Nem sikerült betölteni a tételeket.",
    errorCreate: "Nem sikerült létrehozni az új tételt.",
    errorDelete: "Nem sikerült törölni a tételt.",
    errorOrder: "Nem sikerült menteni az új sorrendet.",
    missingNameUnit: "Név és egység megadása kötelező.",
    orderSaved: "Sorrend elmentve ✅",
    unexpectedErrorLoad: "Váratlan hiba történt betöltés közben.",
    unexpectedErrorCreate: "Váratlan hiba történt létrehozás közben.",
    unexpectedErrorDelete: "Váratlan hiba történt törlés közben.",
    unexpectedErrorOrder: "Váratlan hiba történt sorrend mentésekor.",
  },
  sk: {
    title: "Inventúrne položky – admin",
    langHu: "Maďarsky",
    langSk: "Slovensky",
    newItemTitle: "Pridanie novej položky",
    nameLabel: "Názov",
    namePlaceholder: "napr. kuracie prsia v obale",
    unitLabel: "Jednotka",
    unitPlaceholder: "kg / ks / l",
    addButton: "Pridať",
    tableIndex: "Č.",
    tableName: "Položka",
    tableUnit: "Jednotka",
    tableActions: "Akcie",
    delete: "Zmazať",
    loading: "Načítavam…",
    empty: "Zatiaľ nie sú žiadne inventúrne položky.",
    saveOrder: "Uložiť poradie",
    saveOrderSaving: "Ukladám poradie…",
    confirmDelete: "Naozaj chceš zmazať túto položku?",
    errorLoad: "Nepodarilo sa načítať položky.",
    errorCreate: "Nepodarilo sa vytvoriť novú položku.",
    errorDelete: "Nepodarilo sa zmazať položku.",
    errorOrder: "Nepodarilo sa uložiť nové poradie.",
    missingNameUnit: "Názov a jednotka sú povinné.",
    orderSaved: "Poradie uložené ✅",
    unexpectedErrorLoad: "Nastala neočakávaná chyba pri načítavaní.",
    unexpectedErrorCreate: "Nastala neočakávaná chyba pri vytváraní.",
    unexpectedErrorDelete: "Nastala neočakávaná chyba pri mazaní.",
    unexpectedErrorOrder: "Nastala neočakávaná chyba pri ukladaní poradia.",
  },
};

export default function InventoryTemplateAdminPage() {
  const [lang, setLang] = useState<Lang>("hu");
  const t = (key: keyof (typeof translations)["hu"]) =>
    translations[lang][key];

  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/inventory/template");
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("errorLoad"));
      } else {
        setItems((data.items || []) as TemplateItem[]);
      }
    } catch (err) {
      console.error(err);
      setMessage(t("unexpectedErrorLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    setMessage(null);
    if (!newName.trim() || !newUnit.trim()) {
      setMessage(t("missingNameUnit"));
      return;
    }

    try {
      const res = await fetch("/api/inventory/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("errorCreate"));
      } else {
        setItems((prev) => [...prev, data.item as TemplateItem]);
        setNewName("");
        setNewUnit("");
      }
    } catch (err) {
      console.error(err);
      setMessage(t("unexpectedErrorCreate"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    setMessage(null);
    try {
      const res = await fetch(`/api/inventory/template/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("errorDelete"));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error(err);
      setMessage(t("unexpectedErrorDelete"));
    }
  };

  // Drag&drop logika – egyszerű, HTML5-s
  const onDragStart = (id: string) => {
    setDraggedId(id);
  };

  const onDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    event.preventDefault();
  };

  const onDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    setItems((prev) => {
      const arr = [...prev];
      const fromIndex = arr.findIndex((i) => i.id === draggedId);
      const toIndex = arr.findIndex((i) => i.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });

    setDraggedId(null);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    setMessage(null);
    try {
      const orderedIds = items.map((i) => i.id);

      const res = await fetch("/api/inventory/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("errorOrder"));
      } else {
        setMessage(t("orderSaved"));
      }
    } catch (err) {
      console.error(err);
      setMessage(t("unexpectedErrorOrder"));
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Fejléc + nyelvválasztó */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLang("hu")}
            className={`px-3 py-1 border rounded text-sm ${
              lang === "hu" ? "bg-gray-200 font-semibold" : ""
            }`}
          >
            HU – {t("langHu")}
          </button>
          <button
            type="button"
            onClick={() => setLang("sk")}
            className={`px-3 py-1 border rounded text-sm ${
              lang === "sk" ? "bg-gray-200 font-semibold" : ""
            }`}
          >
            SK – {t("langSk")}
          </button>
        </div>
      </div>

      {message && (
        <div className="border px-3 py-2 rounded text-sm">{message}</div>
      )}

      {/* Új tétel felvétele */}
      <div className="border rounded p-3 space-y-2">
        <div className="font-medium text-sm mb-1">{t("newItemTitle")}</div>
        <div className="grid gap-2 md:grid-cols-3 items-end">
          <div>
            <label className="block text-sm mb-1">{t("nameLabel")}</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">{t("unitLabel")}</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder={t("unitPlaceholder")}
            />
          </div>
          <div>
            <button
              onClick={handleAdd}
              className="px-4 py-2 border rounded font-medium w-full"
            >
              {t("addButton")}
            </button>
          </div>
        </div>
      </div>

      {/* Drag&drop lista */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-1 w-10">{t("tableIndex")}</th>
              <th className="text-left px-2 py-1">{t("tableName")}</th>
              <th className="text-left px-2 py-1">{t("tableUnit")}</th>
              <th className="text-left px-2 py-1">{t("tableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-2" colSpan={4}>
                  {t("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-2 py-2" colSpan={4}>
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(item.id)}
                  className="border-b last:border-0 cursor-move"
                >
                  <td className="px-2 py-1 text-center">{index + 1}</td>
                  <td className="px-2 py-1">{item.name}</td>
                  <td className="px-2 py-1">{item.unit}</td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSaveOrder}
        disabled={savingOrder || items.length === 0}
        className="px-4 py-2 border rounded font-medium disabled:opacity-60"
      >
        {savingOrder ? t("saveOrderSaving") : t("saveOrder")}
      </button>
    </div>
  );
}
