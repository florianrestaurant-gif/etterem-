"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminSubNav from "@/components/AdminSubNav";

type Guest = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note?: string | null;
};

type GuestsApiResponse = {
  ok: boolean;
  guests: Guest[];
  error?: string;
};

type Lang = "hu" | "sk";

const TEXTS: Record<Lang, Record<string, string>> = {
  hu: {
    title: "Vendég-CRM",
    subtitle:
      "Vendégek elérhetőségei, megjegyzések, rendeléstörténet – egy helyen.",
    searchLabel: "Keresés (név, email, telefonszám, cím…)",
    searchButton: "Keresés",
    searching: "Keresés…",
    clearFilter: "Szűrés törlése",
    totalResults: "Találatok (szűrés után)",
    noResults: "Nincs találat.",
    guestsWithPhone: "Telefonszámmal rendelkezők",
    guestsInfoHint: "Minél több kitöltött adat → annál jobb CRM.",
    listTitle: "Vendéglista",
    name: "Név",
    phone: "Telefon",
    email: "Email",
    address: "Cím",
    notes: "Megjegyzés",
    details: "Részletek",
    lastUpdatedPrefix: "Utoljára frissítve:",
  },
  sk: {
    title: "Klientsky CRM",
    subtitle:
      "Kontakty hostí, poznámky a história objednávok – na jednom mieste.",
    searchLabel: "Hľadanie (meno, email, telefón, adresa…)",
    searchButton: "Hľadať",
    searching: "Hľadám…",
    clearFilter: "Zrušiť filter",
    totalResults: "Počet výsledkov (po filtrovaní)",
    noResults: "Žiadne výsledky.",
    guestsWithPhone: "Hostia s telefónnym číslom",
    guestsInfoHint: "Čím viac vyplnených údajov → tým lepší CRM.",
    listTitle: "Zoznam hostí",
    name: "Meno",
    phone: "Telefón",
    email: "Email",
    address: "Adresa",
    notes: "Poznámka",
    details: "Detail",
    lastUpdatedPrefix: "Naposledy aktualizované:",
  },
};

export default function GuestsPage() {
  const [lang] = useState<Lang>("hu"); // később jöhet user-választás / beállítás
  const t = TEXTS[lang];

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const hasGuests = guests.length > 0;

  const guestsWithPhoneCount = useMemo(
    () => guests.filter((g) => g.phone && g.phone.trim() !== "").length,
    [guests]
  );

  const formattedLastLoaded = useMemo(() => {
    if (!lastLoadedAt) return "";
    return lastLoadedAt.toLocaleTimeString(lang === "hu" ? "hu-HU" : "sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastLoadedAt, lang]);

  async function loadGuests(term: string) {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/guests?search=${encodeURIComponent(term)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as GuestsApiResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Hiba történt a vendégek lekérésekor.");
        setGuests([]);
      } else {
        setGuests(Array.isArray(data.guests) ? data.guests : []);
        setLastLoadedAt(new Date());
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült kommunikálni a szerverrel.");
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }

  // első betöltés – üres kereséssel (összes / alap lista)
  useEffect(() => {
    void loadGuests("");
  }, []);

  function handleSearchClick() {
    void loadGuests(search);
  }

  function handleClear() {
    setSearch("");
    setGuests([]);
    setError(null);
    setLastLoadedAt(null);
  }

  return (
    <main className="container py-6 space-y-6">
      {/* Felső admin navigáció, mint a többi dashboardon */}
      <AdminSubNav />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Fejléc + kereső */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">{t.title}</h1>
            <p className="text-sm text-gray-600">{t.subtitle}</p>
            {formattedLastLoaded && (
              <p className="text-[11px] text-gray-500 mt-1">
                {t.lastUpdatedPrefix} {formattedLastLoaded}
              </p>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col gap-2 sm:items-end">
            <label className="text-xs font-medium text-gray-600">
              {t.searchLabel}
            </label>
            <div className="flex gap-2 w-full sm:w-80">
              <input
                className="border px-3 py-2 rounded text-sm flex-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kovács, 0918…, utca…"
              />
              <button
                onClick={handleSearchClick}
                className="bg-black text-white rounded px-3 py-2 text-sm whitespace-nowrap disabled:opacity-60"
                disabled={loading}
              >
                {loading ? t.searching : t.searchButton}
              </button>
            </div>

            {search && (
              <button
                onClick={handleClear}
                className="text-xs underline text-gray-500 self-start sm:self-end"
              >
                {t.clearFilter}
              </button>
            )}
          </div>
        </section>

        {/* Összefoglaló kártyák */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">{t.totalResults}</div>
            <div className="text-lg font-semibold">{guests.length}</div>
          </div>

          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">{t.guestsWithPhone}</div>
            <div className="text-lg font-semibold">
              {guestsWithPhoneCount}
            </div>
            <div className="text-[11px] text-gray-500">{t.guestsInfoHint}</div>
          </div>

          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">Státusz</div>
            <div className="text-sm">
              {loading
                ? lang === "hu"
                  ? "Adatok betöltése…"
                  : "Načítavam dáta…"
                : hasGuests
                ? lang === "hu"
                  ? "Lista kész a munkához."
                  : "Zoznam pripravený."
                : lang === "hu"
                ? "Nincs aktív lista."
                : "Zatiaľ žiadny zoznam."}
            </div>
          </div>
        </section>

        {/* Hibaüzenet */}
        {error && (
          <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* Nincs találat */}
        {!loading && !hasGuests && !error && (
          <div className="border rounded-lg p-4 text-sm text-gray-500">
            {t.noResults}
          </div>
        )}

        {/* Mobil: kártyák */}
        {!loading && hasGuests && (
          <section className="grid gap-3 sm:hidden">
            {guests.map((g) => (
              <article
                key={g.id}
                className="border rounded-lg p-3 text-sm space-y-1"
              >
                <div className="font-semibold">
                  {g.name || (lang === "hu" ? "Névtelen vendég" : "Hosť bez mena")}
                </div>
                <div className="space-y-0.5 text-xs text-gray-700">
                  {g.phone && <div>📞 {g.phone}</div>}
                  {g.email && <div>✉️ {g.email}</div>}
                  {g.address && <div>📍 {g.address}</div>}
                  {g.note && (
                    <div className="text-gray-500 text-[11px]">
                      {t.notes}: {g.note}
                    </div>
                  )}
                </div>
                <div className="pt-1 flex justify-end">
                  <Link
                    href={`/dashboard/guests/${g.id}`}
                    className="text-xs underline text-blue-600"
                  >
                    {t.details}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Desktop / tablet: táblázat */}
        {!loading && hasGuests && (
          <section className="border rounded-lg overflow-hidden hidden sm:block">
            <div className="px-3 py-2 border-b text-sm font-medium">
              {t.listTitle}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 border-b text-left">{t.name}</th>
                    <th className="px-3 py-2 border-b text-left">
                      {t.phone}
                    </th>
                    <th className="px-3 py-2 border-b text-left">
                      {t.email}
                    </th>
                    <th className="px-3 py-2 border-b text-left">
                      {t.address}
                    </th>
                    <th className="px-3 py-2 border-b text-left">
                      {t.notes}
                    </th>
                    <th className="px-3 py-2 border-b text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b max-w-[160px] truncate">
                        {g.name || "-"}
                      </td>
                      <td className="px-3 py-2 border-b whitespace-nowrap">
                        {g.phone ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b max-w-[180px] truncate">
                        {g.email ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b max-w-[220px] truncate">
                        {g.address ?? "-"}
                      </td>
                      <td className="px-3 py-2 border-b max-w-[200px] truncate text-gray-500">
                        {g.note ?? ""}
                      </td>
                      <td className="px-3 py-2 border-b text-right whitespace-nowrap">
                        <Link
                          href={`/dashboard/guests/${g.id}`}
                          className="text-xs underline text-blue-600"
                        >
                          {t.details}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
