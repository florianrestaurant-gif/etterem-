"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sheet = {
  id: string;
  date: string;
  note: string | null;
  _count: {
    items: number;
  };
};

type Lang = "hu" | "sk";

const translations = {
  hu: {
    title: "Leltárívek",
    langHu: "Magyar",
    langSk: "Szlovák",
    fromLabel: "Dátumtól",
    toLabel: "Dátumig",
    filterButton: "Szűrés",
    newInventory: "Új leltár felvitele",
    adminTemplate: "Leltár tételek admin",
    loading: "Betöltés…",
    noData: "Nincs leltár a megadott időszakban.",
    msgErrorList: "Nem sikerült betölteni a leltáríveket.",
    msgUnexpectedErrorList:
      "Váratlan hiba történt a leltárívek betöltésekor.",
    colDate: "Dátum",
    colNote: "Megjegyzés",
    colItemsCount: "Tételek száma",
    colDetails: "Részletek",
    openDetails: "Megnyitás",
    emptyNote: "–",
  },
  sk: {
    title: "Inventúrne hárky",
    langHu: "Maďarsky",
    langSk: "Slovensky",
    fromLabel: "Dátum od",
    toLabel: "Dátum do",
    filterButton: "Filtrovať",
    newInventory: "Nová inventúra",
    adminTemplate: "Inventúrne položky – admin",
    loading: "Načítavam…",
    noData: "V danom období nie je žiadna inventúra.",
    msgErrorList: "Nepodarilo sa načítať inventúrne hárky.",
    msgUnexpectedErrorList:
      "Nastala neočakávaná chyba pri načítavaní inventúrnych hárkov.",
    colDate: "Dátum",
    colNote: "Poznámka",
    colItemsCount: "Počet položiek",
    colDetails: "Detail",
    openDetails: "Otvoriť",
    emptyNote: "–",
  },
};

function formatDate(dateStr: string, lang: Lang) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === "hu" ? "hu-HU" : "sk-SK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function InventoryListPage() {
  const [lang, setLang] = useState<Lang>("hu");
  const t = (key: keyof (typeof translations)["hu"]) =>
    translations[lang][key];

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async (opts?: { from?: string; to?: string }) => {
    setLoading(true);
    setMessage(null);

    const params = new URLSearchParams();
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);

    try {
      const res = await fetch(
        "/api/inventory" + (params.toString() ? `?${params.toString()}` : "")
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage(data.error || t("msgErrorList"));
        setSheets([]);
      } else {
        setSheets(data.sheets || []);
      }
    } catch (err) {
      console.error(err);
      setMessage(t("msgUnexpectedErrorList"));
      setSheets([]);
    } finally {
      setLoading(false);
    }
  };

  // első betöltés – utolsó 7 nap
  useEffect(() => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - 7);
    const fromStr = fromDate.toISOString().slice(0, 10);

    setFrom(fromStr);
    setTo(toStr);
    loadData({ from: fromStr, to: toStr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    loadData({ from: from || undefined, to: to || undefined });
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Fejléc + nyelvválasztó + gombok */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold sm:text-xl">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
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

          <Link
            href="/kitchen/inventory/template"
            className="px-3 py-1 border rounded text-xs sm:text-sm ml-0 md:ml-2"
          >
            {t("adminTemplate")}
          </Link>
          <Link
            href="/kitchen/inventory/new"
            className="px-3 py-1 border rounded text-xs sm:text-sm"
          >
            {t("newInventory")}
          </Link>
        </div>
      </div>

      {message && (
        <div className="border px-3 py-2 rounded text-xs sm:text-sm">
          {message}
        </div>
      )}

      {/* Szűrők */}
      <div className="grid gap-3 md:grid-cols-4 items-end">
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            {t("fromLabel")}
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm mb-1">
            {t("toLabel")}
          </label>
          <input
            type="date"
            className="border rounded px-2 py-1 w-full text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <button
            onClick={handleFilter}
            className="px-4 py-2 border rounded font-medium text-sm w-full md:w-auto"
          >
            {t("filterButton")}
          </button>
        </div>
      </div>

      {/* Mobil: kártyák */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="text-sm">{t("loading")}</div>
        ) : sheets.length === 0 ? (
          <div className="text-sm">{t("noData")}</div>
        ) : (
          sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="border rounded-md px-3 py-2 bg-white space-y-1"
            >
              <div className="flex justify-between gap-2">
                <div className="text-sm font-medium">
                  {formatDate(sheet.date, lang)}
                </div>
                <div className="text-xs text-gray-500">
                  {t("colItemsCount")}: {sheet._count.items}
                </div>
              </div>
              <div className="text-xs text-gray-700">
                {sheet.note || t("emptyNote")}
              </div>
              <div className="pt-1">
                <Link
                  href={`/kitchen/inventory/${sheet.id}`}
                  className="inline-block px-3 py-1 border rounded text-xs"
                >
                  {t("openDetails")}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: táblázat */}
      <div className="border rounded overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-2 py-1">{t("colDate")}</th>
              <th className="text-left px-2 py-1">{t("colNote")}</th>
              <th className="text-right px-2 py-1">{t("colItemsCount")}</th>
              <th className="text-left px-2 py-1">{t("colDetails")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-2 py-2" colSpan={4}>
                  {t("loading")}
                </td>
              </tr>
            ) : sheets.length === 0 ? (
              <tr>
                <td className="px-2 py-2" colSpan={4}>
                  {t("noData")}
                </td>
              </tr>
            ) : (
              sheets.map((sheet) => (
                <tr key={sheet.id} className="border-b last:border-0">
                  <td className="px-2 py-1">
                    {formatDate(sheet.date, lang)}
                  </td>
                  <td className="px-2 py-1">
                    {sheet.note || t("emptyNote")}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {sheet._count.items}
                  </td>
                  <td className="px-2 py-1">
                    <Link
                      href={`/kitchen/inventory/${sheet.id}`}
                      className="underline"
                    >
                      {t("openDetails")}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
