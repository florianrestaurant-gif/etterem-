"use client";

import { useEffect, useState } from "react";

type Guest = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function NewDeliveryOrderPage() {
  const [phone, setPhone] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loadingGuest, setLoadingGuest] = useState(false);

  // 🔍 Amikor a telefonszám elég hosszú, automatikusan keresünk vendéget
  useEffect(() => {
    const trimmed = phone.replace(/\s+/g, "");

    if (trimmed.length < 7) {
      setGuest(null);
      return;
    }

    let cancelled = false;

    async function lookupGuest() {
      try {
        setLoadingGuest(true);
        const res = await fetch(`/api/guests/lookup?phone=${encodeURIComponent(phone)}`);
        const json = await res.json();
        if (!res.ok || !json.ok || cancelled) return;

        if (json.guest) {
          const g = json.guest as Guest;
          setGuest(g);
          setName(g.name ?? "");
          setEmail(g.email ?? "");
          setAddress(g.address ?? "");
        } else {
          // nincs ilyen vendég -> újként kezeljük
          setGuest(null);
          // név/email/cím maradnak úgy, ahogy a felhasználó elkezdte írni
        }
      } catch (err) {
        console.error("Vendég keresése sikertelen", err);
      } finally {
        if (!cancelled) setLoadingGuest(false);
      }
    }

    const timer = setTimeout(lookupGuest, 400); // kis debounce, hogy gépelés közben ne spam-eljen

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Itt elküldjük az új rendelést a backendnek.
    // Ha guest már létező (guest?.id van), akkor azt használjuk,
    // ha nem, a backend-ben létrehozunk egy új Guest rekordot ezekkel az adatokkal.
    const payload = {
      guestId: guest?.id ?? null,
      name,
      phone,
      email,
      address,
      // ide jönnek a rendelés mezői: menük, leves, ár, dátum, stb.
    };

    // pl. POST /api/delivery/orders
    // ...
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Új kiszállítás felvétele</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Telefon */}
        <div>
          <label className="block font-medium mb-1">Telefon</label>
          <input
            type="tel"
            className="border rounded px-3 py-2 w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {loadingGuest && <p className="text-sm text-gray-500">Vendég keresése...</p>}
          {guest && (
            <p className="text-sm text-green-600">
              Meglévő vendég: {guest.name || "név nélküli"} (#{guest.id.slice(0, 6)}…)
            </p>
          )}
        </div>

        {/* Név */}
        <div>
          <label className="block font-medium mb-1">Név</label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block font-medium mb-1">Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Cím */}
        <div>
          <label className="block font-medium mb-1">Cím</label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-full"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Ide jönnek a menük, ár, megjegyzés, stb. */}

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Rendelés mentése
        </button>
      </form>
    </div>
  );
}
