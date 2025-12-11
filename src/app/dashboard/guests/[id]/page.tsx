"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Lang = "hu" | "sk";

type DeliveryOrder = {
  id: string;
  deliveryDate: string | null;
  totalPrice: number | null;
  place: string | null;
  address: string | null;
  note: string | null;
  soup: number | null;
  menu1: number | null;
  menu2: number | null;
  menu3: number | null;
  menu4: number | null;
  businessMenu: number | null;
  dessert: number | null;
  delivered: boolean;
  createdAt: string;
};

type Guest = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
};

/**
 * Egységes válasz típus.
 * GET esetén: ok=true + guest + stats + orders
 * Hiba esetén: ok=false + error
 * PATCH esetén: ok=true + guest (frissített) vagy ok=false + error
 */
type GuestDetailResponse = {
  ok: boolean;
  error?: string;
  guest?: Guest;
  stats?: Stats;
  orders?: DeliveryOrder[];
};

export default function GuestDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [lang, setLang] = useState<Lang>("hu");

  const [guest, setGuest] = useState<Guest | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // form mezők
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  // --- vendég betöltése ---

  useEffect(() => {
    if (!id) return;

    async function loadGuest() {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch(`/api/guests/${id}`);
        const data = (await res.json()) as GuestDetailResponse;

        if (!res.ok || !data.ok || !data.guest) {
          setError(
            !res.ok
              ? lang === "hu"
                ? "Hiba történt a vendég adatainak lekérésekor."
                : "Pri načítaní údajov hosťa došlo k chybe."
              : data.error ??
                (lang === "hu"
                  ? "Hiba történt a vendég adatainak lekérésekor."
                  : "Pri načítaní údajov hosťa došlo k chybe.")
          );
          setGuest(null);
          setStats(null);
          setOrders([]);
        } else {
          setGuest(data.guest);
          setStats(data.stats ?? null);
          setOrders(data.orders ?? []);

          setName(data.guest.name ?? "");
          setEmail(data.guest.email ?? "");
          setAddress(data.guest.address ?? "");
          setNote(data.guest.note ?? "");
        }
      } catch (err) {
        console.error(err);
        setError(
          lang === "hu"
            ? "Nem sikerült kommunikálni a szerverrel."
            : "Nepodarilo sa komunikovať so serverom."
        );
        setGuest(null);
        setStats(null);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    void loadGuest();
  }, [id, lang]);

  // --- mentés ---

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          email: email || null,
          address: address || null,
          note: note || null,
        }),
      });

      const data = (await res.json()) as GuestDetailResponse;

      if (!res.ok || !data.ok) {
        setError(
          !res.ok
            ? lang === "hu"
              ? "Nem sikerült menteni a vendég adatait."
              : "Údaje hosťa sa nepodarilo uložiť."
            : data.error ??
              (lang === "hu"
                ? "Nem sikerült menteni a vendég adatait."
                : "Údaje hosťa sa nepodarilo uložiť.")
        );
      } else {
        setMessage(
          lang === "hu"
            ? "Vendég adatai sikeresen mentve."
            : "Údaje hosťa boli uložené."
        );
        if (data.guest) {
          setGuest(data.guest);
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        lang === "hu"
          ? "Nem sikerült kommunikálni a szerverrel."
          : "Nepodarilo sa komunikovať so serverom."
      );
    } finally {
      setSaving(false);
    }
  }

  // --- állapotok ---

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p>{lang === "hu" ? "Betöltés…" : "Načítava sa…"}</p>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <p className="text-red-600 text-sm">
          {error ??
            (lang === "hu"
              ? "Hiba történt a vendég adatainak lekérésekor."
              : "Pri načítaní údajov hosťa došlo k chybe.")}
        </p>
        <Link
          href="/dashboard/guests"
          className="text-sm underline text-blue-600"
        >
          {lang === "hu" ? "Vissza a vendéglistához" : "Späť na zoznam hostí"}
        </Link>
      </div>
    );
  }

  const t = {
    title: lang === "hu" ? "Vendég adatlapja" : "Profil hosťa",
    back: lang === "hu" ? "Vissza a listához" : "Späť na zoznam",
    statsOrders: lang === "hu" ? "Összes rendelés" : "Počet objednávok",
    statsRevenue: lang === "hu" ? "Összes költés" : "Celkové útraty",
    statsLast: lang === "hu" ? "Utolsó rendelés" : "Posledná objednávka",
    noData: lang === "hu" ? "nincs adat" : "bez údajov",
    basics: lang === "hu" ? "Alapadatok" : "Základné údaje",
    name: lang === "hu" ? "Név" : "Meno",
    phone: "Telefon",
    email: "Email",
    emailPlaceholder: lang === "hu" ? "opcionális" : "nepovinné",
    addressLabel: lang === "hu" ? "Cím" : "Adresa",
    noteLabel: lang === "hu" ? "Megjegyzés (belső)" : "Poznámka (interná)",
    save: lang === "hu" ? "Mentés" : "Uložiť",
    historyTitle:
      lang === "hu"
        ? "Rendeléstörténet (kiszállítás)"
        : "História objednávok (donáška)",
  };

  const lastOrderText =
    stats && stats.lastOrderDate
      ? new Date(stats.lastOrderDate).toLocaleDateString("hu-HU")
      : t.noData;

  const totalOrders = stats?.totalOrders ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* fejléc + nyelvváltó */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.title}</h1>
          <p className="text-sm text-gray-600">
            {guest.phone || ""}{" "}
            {guest.name ? (
              <span className="text-gray-500">• {guest.name}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setLang("hu")}
              className={`px-3 py-1 ${
                lang === "hu" ? "bg-black text-white" : "bg-white text-gray-700"
              }`}
            >
              HU
            </button>
            <button
              type="button"
              onClick={() => setLang("sk")}
              className={`px-3 py-1 ${
                lang === "sk" ? "bg-black text-white" : "bg-white text-gray-700"
              }`}
            >
              SK
            </button>
          </div>
          <Link
            href="/dashboard/guests"
            className="text-xs sm:text-sm underline text-gray-700"
          >
            ← {t.back}
          </Link>
        </div>
      </header>

      {/* üzenetek */}
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-2 bg-green-100 text-green-700 rounded text-sm">
          {message}
        </div>
      )}

      {/* stat kártyák */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 text-sm space-y-1">
          <div className="text-gray-500">{t.statsOrders}</div>
          <div className="text-lg font-semibold">{totalOrders}</div>
        </div>
        <div className="border rounded-lg p-3 text-sm space-y-1">
          <div className="text-gray-500">{t.statsRevenue}</div>
          <div className="text-lg font-semibold">
            {totalRevenue.toFixed(2)} €
          </div>
        </div>
        <div className="border rounded-lg p-3 text-sm space-y-1">
          <div className="text-gray-500">{t.statsLast}</div>
          <div className="text-sm">{lastOrderText}</div>
        </div>
      </section>

      {/* alapadatok űrlap */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold mb-1">{t.basics}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.name}
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.phone}
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full bg-gray-100"
                value={guest.phone ?? ""}
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.email}
              </label>
              <input
                type="email"
                className="border rounded px-2 py-1 text-sm w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.addressLabel}
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t.noteLabel}
            </label>
            <textarea
              className="border rounded px-2 py-1 text-sm w-full min-h-[80px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-60"
          >
            {saving
              ? lang === "hu"
                ? "Mentés…"
                : "Ukladá sa…"
              : t.save}
          </button>
        </form>
      </section>

      {/* rendeléstörténet */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-semibold mb-1">{t.historyTitle}</h2>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">
            {lang === "hu"
              ? "Még nincs kiszállítás a vendégtől."
              : "Zatiaľ nemá žiadne donášky."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 border-b">
                    {lang === "hu" ? "Dátum" : "Dátum"}
                  </th>
                  <th className="px-2 py-1 border-b">
                    {lang === "hu" ? "Hely" : "Miesto"}
                  </th>
                  <th className="px-2 py-1 border-b">
                    {lang === "hu" ? "Megjegyzés" : "Poznámka"}
                  </th>
                  <th className="px-2 py-1 border-b text-right">
                    {lang === "hu" ? "Ár (€)" : "Cena (€)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-2 py-1 border-b whitespace-nowrap">
                      {o.deliveryDate
                        ? new Date(o.deliveryDate).toLocaleDateString("hu-HU")
                        : "-"}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {o.place ?? "-"}
                    </td>
                    <td className="px-2 py-1 border-b max-w-[260px] truncate">
                      {o.note ?? ""}
                    </td>
                    <td className="px-2 py-1 border-b text-right whitespace-nowrap">
                      {o.totalPrice != null ? o.totalPrice.toFixed(2) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
