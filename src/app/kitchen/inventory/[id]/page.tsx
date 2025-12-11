"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

type TemplateInfo = {
  name: string;
  unit: string;
  sortOrder: number;
};

type Item = {
  id: string;
  quantity: number | null;
  note: string | null;
  template: TemplateInfo;
};

type Sheet = {
  id: string;
  date: string;
  note: string | null;
  items: Item[];
};

type PreviousSheet = {
  id: string;
  date: string;
  items: Item[];
};

type Lang = "hu" | "sk";

const translations = {
  hu: {
    back: "← Vissza a leltárlistához",
    langHu: "Magyar",
    langSk: "Szlovák",
    titlePrefix: "Leltár – ",
    noteLabel: "Megjegyzés:",
    noPrevious:
      "Nincs korábbi leltár ehhez az étteremhez, nincs összehasonlítás.",
    comparePrefix: "Összehasonlítva ezzel az előző leltárral:",
    tableHeaderName: "Alapanyag",
    tableHeaderUnit: "Egység",
    tableHeaderCurrent: "Most",
    tableHeaderPrevious: "Előző",
    tableHeaderDiff: "Különbség",
    tableHeaderNote: "Megjegyzés",
    loading: "Betöltés…",
    noSheet: "Nincs ilyen leltár.",
    msgError: "Nem sikerült betölteni a leltárt.",
    msgUnexpectedError: "Váratlan hiba történt a leltár betöltésekor.",
    emptyItems: "Ehhez a leltárhoz nincs rögzített tétel.",
    emptyNote: "–",
    exportButton: "Excel export",
  },
  sk: {
    back: "← Späť na zoznam inventúr",
    langHu: "Maďarsky",
    langSk: "Slovensky",
    titlePrefix: "Inventúra – ",
    noteLabel: "Poznámka:",
    noPrevious:
      "Pre túto reštauráciu nie je staršia inventúra, porovnanie nie je dostupné.",
    comparePrefix: "Porovnanie s predchádzajúcou inventúrou:",
    tableHeaderName: "Položka",
    tableHeaderUnit: "Jednotka",
    tableHeaderCurrent: "Teraz",
    tableHeaderPrevious: "Predchádzajúca",
    tableHeaderDiff: "Rozdiel",
    tableHeaderNote: "Poznámka",
    loading: "Načítavam…",
    noSheet: "Takáto inventúra neexistuje.",
    msgError: "Nepodarilo sa načítať inventúru.",
    msgUnexpectedError:
      "Nastala neočakávaná chyba pri načítavaní inventúry.",
    emptyItems: "Pre túto inventúru nie sú žiadne položky.",
    emptyNote: "–",
    exportButton: "Excel export",
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

export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [lang, setLang] = useState<Lang>("hu");
  const t = (key: keyof (typeof translations)["hu"]) =>
    translations[lang][key];

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [previousSheet, setPreviousSheet] = useState<PreviousSheet | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/inventory/${id}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setMessage(data.error || t("msgError"));
        } else {
          setSheet(data.sheet);
          setPreviousSheet(data.previousSheet || null);
        }
      } catch (err) {
        console.error(err);
        setMessage(t("msgUnexpectedError"));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // map: templateKey -> előző mennyiség
  const previousQuantities = useMemo(() => {
    const map = new Map<string, number>();
    if (!previousSheet) return map;
    for (const item of previousSheet.items) {
      const key = item.template?.name + "|" + (item.template?.unit || "");
      map.set(key, item.quantity ?? 0);
    }
    return map;
  }, [previousSheet]);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Felső sáv: vissza + export + nyelvválasztó */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/kitchen/inventory")}
            className="px-3 py-1 border rounded text-xs sm:text-sm"
          >
            {t("back")}
          </button>

          {sheet && (
            <a
              href={`/api/inventory/${sheet.id}/export`}
              className="px-3 py-1 border rounded text-xs sm:text-sm"
            >
              {t("exportButton")}
            </a>
          )}
        </div>

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

      {loading ? (
        <div className="text-sm">{t("loading")}</div>
      ) : message ? (
        <div className="border px-3 py-2 rounded text-xs sm:text-sm">
          {message}
        </div>
      ) : !sheet ? (
        <div className="text-sm">{t("noSheet")}</div>
      ) : (
        <>
          <h1 className="text-lg font-semibold sm:text-xl">
            {t("titlePrefix")}
            {formatDate(sheet.date, lang)}
          </h1>

          {sheet.note && (
            <div className="text-xs sm:text-sm mb-2">
              {t("noteLabel")} {sheet.note}
            </div>
          )}

          {previousSheet ? (
            <div className="text-[11px] sm:text-xs text-gray-600 mb-1">
              {t("comparePrefix")} {formatDate(previousSheet.date, lang)}
            </div>
          ) : (
            <div className="text-[11px] sm:text-xs text-gray-400 mb-1">
              {t("noPrevious")}
            </div>
          )}

          {/* Mobil: kártyák */}
          <div className="space-y-2 md:hidden">
            {sheet.items.length === 0 ? (
              <div className="text-xs sm:text-sm">{t("emptyItems")}</div>
            ) : (
              sheet.items.map((item) => {
                const key =
                  item.template.name + "|" + (item.template.unit || "");
                const prevQty = previousQuantities.get(key) ?? 0;
                const current = item.quantity ?? 0;
                const diff = current - prevQty;

                return (
                  <div
                    key={item.id}
                    className="border rounded-md px-3 py-2 bg-white space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="text-sm font-medium">
                        {item.template.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.template.unit || t("emptyNote")}
                      </div>
                    </div>

                    <div className="flex justify-between gap-2 text-xs sm:text-sm mt-1">
                      <div>
                        <div className="text-[11px] text-gray-600">
                          {t("tableHeaderCurrent")}
                        </div>
                        <div className="font-medium">{current}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-600">
                          {t("tableHeaderPrevious")}
                        </div>
                        <div>{previousSheet ? prevQty : t("emptyNote")}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-600">
                          {t("tableHeaderDiff")}
                        </div>
                        <div>{previousSheet ? diff : t("emptyNote")}</div>
                      </div>
                    </div>

                    <div className="mt-1 text-xs sm:text-sm">
                      <span className="text-[11px] text-gray-600 mr-1">
                        {t("tableHeaderNote")}:
                      </span>
                      {item.note || (
                        <span className="text-gray-400">
                          {t("emptyNote")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: táblázat */}
          <div className="border rounded overflow-x-auto hidden md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-2 py-1">
                    {t("tableHeaderName")}
                  </th>
                  <th className="text-left px-2 py-1">
                    {t("tableHeaderUnit")}
                  </th>
                  <th className="text-right px-2 py-1">
                    {t("tableHeaderCurrent")}
                  </th>
                  <th className="text-right px-2 py-1">
                    {t("tableHeaderPrevious")}
                    {previousSheet
                      ? ` (${formatDate(previousSheet.date, lang)})`
                      : ""}
                  </th>
                  <th className="text-right px-2 py-1">
                    {t("tableHeaderDiff")}
                  </th>
                  <th className="text-left px-2 py-1">
                    {t("tableHeaderNote")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.items.length === 0 ? (
                  <tr>
                    <td className="px-2 py-2" colSpan={6}>
                      {t("emptyItems")}
                    </td>
                  </tr>
                ) : (
                  sheet.items.map((item) => {
                    const key =
                      item.template.name + "|" + (item.template.unit || "");
                    const prevQty = previousQuantities.get(key) ?? 0;
                    const current = item.quantity ?? 0;
                    const diff = current - prevQty;

                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-2 py-1">{item.template.name}</td>
                        <td className="px-2 py-1 w-20">
                          {item.template.unit || t("emptyNote")}
                        </td>
                        <td className="px-2 py-1 text-right">{current}</td>
                        <td className="px-2 py-1 text-right">
                          {previousSheet ? prevQty : t("emptyNote")}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {previousSheet ? diff : t("emptyNote")}
                        </td>
                        <td className="px-2 py-1">
                          {item.note || (
                            <span className="text-gray-400">
                              {t("emptyNote")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
