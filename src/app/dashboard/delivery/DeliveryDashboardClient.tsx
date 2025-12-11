"use client";

import React, { useEffect, useMemo, useState, FormEvent } from "react";

type EditFormState = {
  phone: string;
  address: string;
  place: string;
  note: string;
  soup: string;
  menu1: string;
  menu2: string;
  menu3: string;
  menu4: string;
  businessMenu: string;
  dessert: string;
  packagingCount: string;
  isSenior: boolean;
};

type EditNumericFieldKey =
  | "soup"
  | "menu1"
  | "menu2"
  | "menu3"
  | "menu4"
  | "businessMenu"
  | "dessert";

const NUMERIC_EDIT_FIELDS: { label: string; key: EditNumericFieldKey }[] = [
  { label: "Leves", key: "soup" },
  { label: "1.", key: "menu1" },
  { label: "2.", key: "menu2" },
  { label: "3.", key: "menu3" },
  { label: "4.", key: "menu4" },
  { label: "Biz.", key: "businessMenu" },
  { label: "Dessz.", key: "dessert" },
];

type GuestInfo = {
  id: string;
  name: string | null;
  phone: string | null;
};

export type DeliveryOrderDto = {
  id: string;
  phone: string | null;
  address: string | null;
  place: string | null;
  note: string | null;
  soup: number | null;
  menu1: number | null;
  menu2: number | null;
  menu3: number | null;
  menu4: number | null;
  businessMenu: number | null;
  dessert: number | null;
  totalPrice: number | null;
  routeOrder: number | null;
  delivered: boolean;
  guest: GuestInfo | null;
  packagingCount: number | null;
  isSenior: boolean;
};

type TotalsByItem = {
  soup: number;
  menu1: number;
  menu2: number;
  menu3: number;
  menu4: number;
  businessMenu: number;
  dessert: number;
};

type DayResponse = {
  date: string;
  totalCount: number;
  totalRevenue: number;
  totalsByItem?: TotalsByItem;
  orders: DeliveryOrderDto[];
  totalPackagingCount?: number;
};

type Props = {
  initialDate: string;
  restaurantId: string;
  restaurantName: string;
  lang: "hu" | "sk";
  isGlobalAdmin: boolean;
};

type GuestLookupResponse = {
  ok: boolean;
  guest: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  error?: string;
};

function parseIntOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : Math.round(n);
}

function parseFloatOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default function DeliveryDashboardClient({
  initialDate,
  restaurantName,
}: Props) {
  const [date, setDate] = useState<string>(initialDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<DayResponse | null>(null);

  // Szűrés
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">(
    "all"
  );
  const [placeFilter, setPlaceFilter] = useState("");

  // Új rendelés űrlap
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newSoup, setNewSoup] = useState("");
  const [newMenu1, setNewMenu1] = useState("");
  const [newMenu2, setNewMenu2] = useState("");
  const [newMenu3, setNewMenu3] = useState("");
  const [newMenu4, setNewMenu4] = useState("");
  const [newBusinessMenu, setNewBusinessMenu] = useState("");
  const [newDessert, setNewDessert] = useState("");
  const [newTotalPrice, setNewTotalPrice] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [newPackagingCount, setNewPackagingCount] = useState("");
  const [newIsSenior, setNewIsSenior] = useState(false);

  // CRM / vendég adatok az új rendeléshez
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestInfoMessage, setGuestInfoMessage] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Szerkesztés
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  async function loadDay(selectedDate: string) {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch(`/api/delivery?date=${selectedDate}`);
      const json = (await res.json()) as DayResponse | { error?: string };

      if (!res.ok || "error" in json) {
        setError(
          ("error" in json && json.error) ||
            "Nem sikerült lekérni a napi rendeléseket."
        );
        setData(null);
        setLoading(false);
        return;
      }

      setData(json as DayResponse);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült lekérni a napi rendeléseket.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDay(date);
  }, [date]);

  // Telefonszám alapján vendég betöltése a CRM-ből
  async function handlePhoneBlur() {
    const phone = newPhone.trim();
    if (!phone) {
      setGuestId(null);
      setGuestName("");
      setGuestEmail("");
      setGuestInfoMessage(null);
      return;
    }

    try {
      setGuestLoading(true);
      setGuestInfoMessage(null);

      const res = await fetch(
        `/api/guests/find-by-phone?phone=${encodeURIComponent(phone)}`
      );
      const json = (await res.json()) as GuestLookupResponse | {
        error?: string;
      };

      if (!res.ok || ("error" in json && json.error)) {
        const msg =
          "error" in json && json.error
            ? json.error
            : "Nem sikerült lekérdezni a vendég adatait.";
        console.error("Guest lookup error:", msg);
        setGuestId(null);
        setGuestName("");
        setGuestEmail("");
        setGuestInfoMessage(
          "Nem sikerült vendéget keresni ehhez a telefonszámhoz."
        );
        return;
      }

      const dataResp = json as GuestLookupResponse;

      if (dataResp.guest) {
        setGuestId(dataResp.guest.id);
        setGuestName(dataResp.guest.name ?? "");
        setGuestEmail(dataResp.guest.email ?? "");

        if (!newAddress && dataResp.guest.address) {
          setNewAddress(dataResp.guest.address);
        }

        setGuestInfoMessage("Meglévő vendég a CRM-ben.");
      } else {
        setGuestId(null);
        setGuestName("");
        setGuestEmail("");
        setGuestInfoMessage("Új vendég lesz létrehozva mentéskor.");
      }
    } catch (err) {
      console.error(err);
      setGuestInfoMessage("Nem sikerült vendéget keresni ehhez a telefonszámhoz.");
      setGuestId(null);
      setGuestName("");
      setGuestEmail("");
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleNewOrder(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Először válassz dátumot.");
      return;
    }

    setSavingNew(true);
    setError(null);
    setMessage(null);

    const body = {
      date,
      guestId: guestId ?? null,
      name: guestName || undefined,
      email: guestEmail || undefined,
      phone: newPhone || undefined,
      address: newAddress || undefined,
      place: newPlace || undefined,
      note: newNote || undefined,
      soup: parseIntOrNull(newSoup),
      menu1: parseIntOrNull(newMenu1),
      menu2: parseIntOrNull(newMenu2),
      menu3: parseIntOrNull(newMenu3),
      menu4: parseIntOrNull(newMenu4),
      businessMenu: parseIntOrNull(newBusinessMenu),
      dessert: parseIntOrNull(newDessert),
      packagingCount: parseIntOrNull(newPackagingCount),
      isSenior: newIsSenior,
    };

    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as { error?: string; ok?: boolean };

      if (!res.ok || json.error) {
        setError(json.error || "Nem sikerült menteni a rendelést.");
        setSavingNew(false);
        return;
      }

      setMessage("Rendelés sikeresen rögzítve.");
      setSavingNew(false);

      // Mezők nullázása
      setNewPhone("");
      setNewAddress("");
      setNewPlace("");
      setNewNote("");
      setNewSoup("");
      setNewMenu1("");
      setNewMenu2("");
      setNewMenu3("");
      setNewMenu4("");
      setNewBusinessMenu("");
      setNewDessert("");
      setNewTotalPrice("");
      setNewPackagingCount("");
      setNewIsSenior(false);
      setGuestId(null);
      setGuestName("");
      setGuestEmail("");
      setGuestInfoMessage(null);

      void loadDay(date);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült elküldeni a mentési kérést.");
      setSavingNew(false);
    }
  }

  // ----- szűrt rendeléslista -----

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((o) => {
      if (statusFilter === "pending" && o.delivered) return false;
      if (statusFilter === "done" && !o.delivered) return false;

      if (placeFilter.trim()) {
        const needle = placeFilter.trim().toLowerCase();
        const hay =
          (o.place || "") +
          " " +
          (o.address || "") +
          " " +
          (o.phone || "") +
          " " +
          (o.guest?.name || "");
        if (!hay.toLowerCase().includes(needle)) return false;
      }

      return true;
    });
  }, [data, statusFilter, placeFilter]);

  // ----- sorrend mentése -----

  async function persistReorder(orderedIds: string[]) {
    try {
      await fetch("/api/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", orderedIds }),
      });
    } catch (err) {
      console.error("Reorder error", err);
      setError("Nem sikerült menteni az új kiszállítási sorrendet.");
    }
  }

  function moveOrder(orderId: string, direction: "up" | "down") {
    if (statusFilter !== "all" || placeFilter.trim()) return;

    setData((prev) => {
      if (!prev) return prev;
      const orders = [...prev.orders];
      const index = orders.findIndex((o) => o.id === orderId);
      if (index === -1) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= orders.length) return prev;

      const tmp = orders[index];
      orders[index] = orders[newIndex];
      orders[newIndex] = tmp;

      const updated: DayResponse = { ...prev, orders };
      void persistReorder(orders.map((o) => o.id));
      return updated;
    });
  }

  // ----- Delivered toggle -----

  async function toggleDelivered(orderId: string, delivered: boolean) {
    setData((prev) => {
      if (!prev) return prev;
      const orders = prev.orders.map((o) =>
        o.id === orderId ? { ...o, delivered } : o
      );
      return { ...prev, orders };
    });

    try {
      await fetch("/api/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleDelivered", id: orderId, delivered }),
      });
    } catch (err) {
      console.error(err);
      setError("Nem sikerült frissíteni a kiszállítás státuszát.");
    }
  }

  // ----- szerkesztés -----

  function startEdit(order: DeliveryOrderDto) {
    setEditingOrderId(order.id);
    setEditForm({
      phone: order.phone || order.guest?.phone || "",
      address: order.address || "",
      place: order.place || "",
      note: order.note || "",
      soup: order.soup != null ? String(order.soup) : "",
      menu1: order.menu1 != null ? String(order.menu1) : "",
      menu2: order.menu2 != null ? String(order.menu2) : "",
      menu3: order.menu3 != null ? String(order.menu3) : "",
      menu4: order.menu4 != null ? String(order.menu4) : "",
      businessMenu:
        order.businessMenu != null ? String(order.businessMenu) : "",
      dessert: order.dessert != null ? String(order.dessert) : "",
      packagingCount:
        order.packagingCount != null ? String(order.packagingCount) : "",
      isSenior: order.isSenior,
    });
  }

  function cancelEdit() {
    setEditingOrderId(null);
    setEditForm(null);
  }

  async function saveEdit(orderId: string) {
    if (!editForm) return;

    try {
      const body = {
        action: "update" as const,
        id: orderId,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        place: editForm.place || undefined,
        note: editForm.note || undefined,
        soup: parseIntOrNull(editForm.soup),
        menu1: parseIntOrNull(editForm.menu1),
        menu2: parseIntOrNull(editForm.menu2),
        menu3: parseIntOrNull(editForm.menu3),
        menu4: parseIntOrNull(editForm.menu4),
        businessMenu: parseIntOrNull(editForm.businessMenu),
        dessert: parseIntOrNull(editForm.dessert),
        packagingCount: parseIntOrNull(editForm.packagingCount),
        isSenior: editForm.isSenior,
      };

      await fetch("/api/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      await loadDay(date);

      setEditingOrderId(null);
      setEditForm(null);
      setMessage("Rendelés frissítve.");
    } catch (err) {
      console.error(err);
      setError("Nem sikerült menteni a módosítást.");
    }
  }

  const totalsFromClient = useMemo(() => {
    if (!data) return null;
    return data.orders.reduce(
      (acc, o) => {
        acc.soup += o.soup ?? 0;
        acc.menu1 += o.menu1 ?? 0;
        acc.menu2 += o.menu2 ?? 0;
        acc.menu3 += o.menu3 ?? 0;
        acc.menu4 += o.menu4 ?? 0;
        acc.businessMenu += o.businessMenu ?? 0;
        acc.dessert += o.dessert ?? 0;
        return acc;
      },
      {
        soup: 0,
        menu1: 0,
        menu2: 0,
        menu3: 0,
        menu4: 0,
        businessMenu: 0,
        dessert: 0,
      }
    );
  }, [data]);

  const totals = data?.totalsByItem ?? totalsFromClient;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Fejléc + dátum + nyomtatás */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            Kiszállítási rendelés dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Étterem: <span className="font-medium">{restaurantName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Rendelés rögzítés, szűrés, kiszállítási sorrend, „kész” jelölés,
            szerkesztés – mind egy helyen.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <div className="flex gap-2 items-center">
            <label className="block text-sm font-medium">Dátum</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs border rounded px-3 py-1 bg-white hover:bg-gray-50"
          >
            Nyomtatható lista
          </button>
        </div>
      </div>

      {/* Szűrő sor */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded border ${
              statusFilter === "all"
                ? "bg-black text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Mind
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded border ${
              statusFilter === "pending"
                ? "bg-black text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Folyamatban
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("done")}
            className={`px-3 py-1 rounded border ${
              statusFilter === "done"
                ? "bg-black text-white"
                : "bg-white text-gray-700"
            }`}
          >
            Kész
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 whitespace-nowrap">
            Hely / cím / név:
          </span>
          <input
            type="text"
            className="border rounded px-2 py-1 text-xs w-full sm:w-64"
            placeholder="pl. DS, Nyék, utca, név…"
            value={placeFilter}
            onChange={(e) => setPlaceFilter(e.target.value)}
          />
        </div>
      </div>

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

      {loading && <p>Betöltés…</p>}

      {/* Új rendelés felvétele – LEGELŐL */}
      <section className="border rounded-lg p-4 space-y-3 bg-gray-50/40">
        <h2 className="text-sm font-semibold mb-1">
          Új rendelés rögzítése ehhez a naphoz
        </h2>

        <form onSubmit={handleNewOrder} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Telefon</label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setGuestId(null);
                  setGuestName("");
                  setGuestEmail("");
                  setGuestInfoMessage(null);
                }}
                onBlur={handlePhoneBlur}
              />
              {guestLoading && (
                <div className="text-[11px] text-gray-500 mt-1">
                  Vendég keresése…
                </div>
              )}
              {guestInfoMessage && !guestLoading && (
                <div className="text-[11px] text-gray-600 mt-1">
                  {guestInfoMessage}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Cím</label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </div>
          </div>

          {/* CRM vendég adatok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Vendég neve (CRM)
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Pl. Kovács Béla"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Email (CRM)
              </label>
              <input
                type="email"
                className="border rounded px-2 py-1 text-sm w-full"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="opcionális"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Hely (DS, NYÉK…)
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={newPlace}
                onChange={(e) => setNewPlace(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Megjegyzés
              </label>
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
            {[
              ["Leves", newSoup, setNewSoup],
              ["1. Menü", newMenu1, setNewMenu1],
              ["2. Menü", newMenu2, setNewMenu2],
              ["3. Menü", newMenu3, setNewMenu3],
              ["4. Menü", newMenu4, setNewMenu4],
              ["Business", newBusinessMenu, setNewBusinessMenu],
              ["Desszert", newDessert, setNewDessert],
            ].map(([label, value, setter]) => (
              <div key={label as string}>
                <label className="block text-xs font-medium mb-1">
                  {label as string}
                </label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm w-full"
                  value={value as string}
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium mb-1">
                Összeg (szerver számolja)
              </label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full bg-gray-50"
                value={newTotalPrice}
                onChange={(e) => setNewTotalPrice(e.target.value)}
                placeholder="mentés után jelenik meg"
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">
                Csomagolás (db)
              </label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full"
                value={newPackagingCount}
                onChange={(e) => setNewPackagingCount(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 mt-2 sm:mt-0">
              <input
                id="is-senior"
                type="checkbox"
                className="h-4 w-4"
                checked={newIsSenior}
                onChange={(e) => setNewIsSenior(e.target.checked)}
              />
              <label
                htmlFor="is-senior"
                className="text-xs font-medium text-gray-700"
              >
                Nyugdíjas kedvezmény
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingNew}
            className="bg-black text-white px-4 py-2 rounded text-sm mt-2 disabled:opacity-60"
          >
            {savingNew ? "Mentés…" : "Rendelés mentése"}
          </button>
        </form>
      </section>

      {/* Összesítések */}
      {data && !loading && (
        <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">Rendelések száma</div>
            <div className="text-lg font-semibold">
              {data.totalCount || 0}
            </div>
          </div>
          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">Teljes bevétel (rendelések)</div>
            <div className="text-lg font-semibold">
              {data.totalRevenue.toFixed(2)} €
            </div>
          </div>
          <div className="border rounded-lg p-3 text-sm space-y-1">
            <div className="text-gray-500">Dátum</div>
            <div className="text-sm">
              {new Date(data.date).toLocaleDateString("hu-HU")}
            </div>
          </div>
          {totals && (
            <div className="border rounded-lg p-3 text-xs space-y-1">
              <div className="text-gray-500 mb-1">Napi menü darabszámok</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>Leves: {totals.soup}</span>
                <span>1. menü: {totals.menu1}</span>
                <span>2. menü: {totals.menu2}</span>
                <span>3. menü: {totals.menu3}</span>
                <span>4. menü: {totals.menu4}</span>
                <span>Business: {totals.businessMenu}</span>
                <span>Desszert: {totals.dessert}</span>
                <span>
                  Csomagolás: {data.totalPackagingCount ?? 0} db
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Napi lista */}
      {data && !loading && (
        <section className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center justify-between">
            <span>Napi rendeléslista</span>
            <span className="text-xs text-gray-500 hidden sm:inline">
              Sorok sorrendje = kiszállítási sorrend (csak teljes listán
              módosítható)
            </span>
          </div>
          {filteredOrders.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              Nincs rendelés a megadott szűrőkkel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-2 py-1 border-b">#</th>
                    <th className="px-2 py-1 border-b">Kész</th>
                    <th className="px-2 py-1 border-b">Tel.</th>
                    <th className="px-2 py-1 border-b">Cím</th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      Hely
                    </th>
                    <th className="px-2 py-1 border-b">L</th>
                    <th className="px-2 py-1 border-b">1.</th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      2.
                    </th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      3.
                    </th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      4.
                    </th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      Biz.
                    </th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      Dessz.
                    </th>
                    <th className="px-2 py-1 border-b">Csom.</th>
                    <th className="px-2 py-1 border-b">Nyugd.</th>
                    <th className="px-2 py-1 border-b text-right">Ár (€)</th>
                    <th className="px-2 py-1 border-b hidden sm:table-cell">
                      Megjegyzés
                    </th>
                    <th className="px-2 py-1 border-b text-right hidden sm:table-cell">
                      Sorrend
                    </th>
                    <th className="px-2 py-1 border-b text-right">Szerk.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const rowIndex = data.orders.findIndex(
                      (x) => x.id === o.id
                    );
                    const isEditing = editingOrderId === o.id;

                    const rowClasses = [
                      "border-b align-top",
                      o.delivered ? "bg-green-50 text-gray-500" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <React.Fragment key={o.id}>
                        <tr className={rowClasses}>
                          <td className="px-2 py-1 whitespace-nowrap">
                            {rowIndex + 1}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={o.delivered}
                              onChange={(e) =>
                                toggleDelivered(o.id, e.target.checked)
                              }
                            />
                          </td>
                          <td className="px-2 py-1 max-w-[90px] truncate">
                            {o.phone || o.guest?.phone || "-"}
                          </td>
                          <td className="px-2 py-1 max-w-[160px] truncate">
                            {o.address || "-"}
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.place || "-"}
                          </td>
                          <td className="px-2 py-1">{o.soup ?? ""}</td>
                          <td className="px-2 py-1">{o.menu1 ?? ""}</td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.menu2 ?? ""}
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.menu3 ?? ""}
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.menu4 ?? ""}
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.businessMenu ?? ""}
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            {o.dessert ?? ""}
                          </td>
                          <td className="px-2 py-1">
                            {o.packagingCount ?? ""}
                          </td>
                          <td className="px-2 py-1">
                            {o.isSenior ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-yellow-100 text-[10px] font-medium">
                                NY
                              </span>
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {o.totalPrice != null
                              ? o.totalPrice.toFixed(2)
                              : ""}
                          </td>
                          <td className="px-2 py-1 max-w-[200px] truncate hidden sm:table-cell">
                            {o.note || ""}
                          </td>
                          <td className="px-2 py-1 text-right hidden sm:table-cell">
                            <button
                              type="button"
                              className="text-[10px] px-1"
                              onClick={() => moveOrder(o.id, "up")}
                              disabled={
                                statusFilter !== "all" ||
                                placeFilter.trim() !== "" ||
                                rowIndex === 0
                              }
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="text-[10px] px-1"
                              onClick={() => moveOrder(o.id, "down")}
                              disabled={
                                statusFilter !== "all" ||
                                placeFilter.trim() !== "" ||
                                rowIndex === data.orders.length - 1
                              }
                            >
                              ▼
                            </button>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <button
                              type="button"
                              className="text-xs text-blue-700 underline"
                              onClick={() =>
                                isEditing ? cancelEdit() : startEdit(o)
                              }
                            >
                              {isEditing ? "Bezár" : "Szerk."}
                            </button>
                          </td>
                        </tr>

                        {isEditing && editForm && (
                          <tr className="border-b bg-gray-50/60">
                            <td colSpan={17} className="px-2 py-2">
                              <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block font-medium mb-1">
                                      Telefon
                                    </label>
                                    <input
                                      className="border rounded px-2 py-1 w-full"
                                      value={editForm.phone}
                                      onChange={(e) =>
                                        setEditForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                phone: e.target.value,
                                              }
                                            : prev
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block font-medium mb-1">
                                      Cím
                                    </label>
                                    <input
                                      className="border rounded px-2 py-1 w-full"
                                      value={editForm.address}
                                      onChange={(e) =>
                                        setEditForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                address: e.target.value,
                                              }
                                            : prev
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block font-medium mb-1">
                                      Hely (DS, NYÉK…)
                                    </label>
                                    <input
                                      className="border rounded px-2 py-1 w-full"
                                      value={editForm.place}
                                      onChange={(e) =>
                                        setEditForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                place: e.target.value,
                                              }
                                            : prev
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block font-medium mb-1">
                                      Megjegyzés
                                    </label>
                                    <input
                                      className="border rounded px-2 py-1 w-full"
                                      value={editForm.note}
                                      onChange={(e) =>
                                        setEditForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                note: e.target.value,
                                              }
                                            : prev
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                  {NUMERIC_EDIT_FIELDS.map(
                                    ({ label, key }) => (
                                      <div key={key}>
                                        <label className="block font-medium mb-1">
                                          {label}
                                        </label>
                                        <input
                                          type="number"
                                          className="border rounded px-2 py-1 w-full"
                                          value={editForm ? editForm[key] : ""}
                                          onChange={(e) =>
                                            setEditForm((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    [key]: e.target.value,
                                                  }
                                                : prev
                                            )
                                          }
                                        />
                                      </div>
                                    )
                                  )}
                                  <div>
                                    <label className="block font-medium mb-1">
                                      Csomagolás (db)
                                    </label>
                                    <input
                                      type="number"
                                      className="border rounded px-2 py-1 w-full"
                                      value={editForm?.packagingCount ?? ""}
                                      onChange={(e) =>
                                        setEditForm((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                packagingCount: e.target.value,
                                              }
                                            : prev
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    id={`edit-senior-${o.id}`}
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={editForm.isSenior}
                                    onChange={(e) =>
                                      setEditForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              isSenior: e.target.checked,
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`edit-senior-${o.id}`}
                                    className="text-xs font-medium text-gray-700"
                                  >
                                    Nyugdíjas kedvezmény
                                  </label>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="px-3 py-1 rounded border text-xs"
                                  >
                                    Mégse
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void saveEdit(o.id)}
                                    className="px-3 py-1 rounded bg-black text-white text-xs"
                                  >
                                    Mentés
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
