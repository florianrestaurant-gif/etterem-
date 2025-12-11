"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventType = "BIRTHDAY" | "WEDDING" | "CHRISTENING" | "CORPORATE" | "OTHER";

interface FormState {
  title: string;
  type: EventType;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestsTotal: number;
  guestsKids: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  roomName: string;
  tableLayout: string;
  hasCake: boolean;
  cakeDetails: string;
  allergyNotes: string;
  notes: string;
}

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

export function NewEventForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    type: "BIRTHDAY",
    eventDate: "",
    startTime: "",
    endTime: "",
    guestsTotal: 20,
    guestsKids: 0,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    roomName: "",
    tableLayout: "",
    hasCake: false,
    cakeDetails: "",
    allergyNotes: "",
    notes: "",
  });

  // --- CRM vendég állapot (ugyanaz a logika, mint a deliveryben) ---
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestInfoMessage, setGuestInfoMessage] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Telefonszám alapján CRM-ből vendég betöltése
  async function handlePhoneBlur() {
    const phone = form.contactPhone.trim();
    if (!phone) {
      setGuestId(null);
      setGuestInfoMessage(null);
      return;
    }

    try {
      setGuestLoading(true);
      setGuestInfoMessage(null);

      const res = await fetch(
        `/api/guests/find-by-phone?phone=${encodeURIComponent(phone)}`
      );
      const json = (await res.json()) as GuestLookupResponse | { error?: string };

      if (!res.ok || ("error" in json && json.error)) {
        const msg =
          "error" in json && json.error
            ? json.error
            : "Nem sikerült lekérdezni a vendég adatait.";
        console.error("Guest lookup error:", msg);
        setGuestId(null);
        setGuestInfoMessage(
          "Nem sikerült vendéget keresni ehhez a telefonszámhoz."
        );
        return;
      }

      const dataResp = json as GuestLookupResponse;

      if (dataResp.guest) {
        // Meglévő vendég a CRM-ben
        setGuestId(dataResp.guest.id);

        setForm((prev) => ({
          ...prev,
          contactName:
            prev.contactName || dataResp.guest?.name || "",
          contactEmail:
            prev.contactEmail || dataResp.guest?.email || "",
          // telefon mezőt nem írjuk felül, mert abból kerestünk
        }));

        setGuestInfoMessage("Meglévő vendég a CRM-ben.");
      } else {
        // Új vendég lesz létrehozva
        setGuestId(null);
        setGuestInfoMessage("Új vendég lesz létrehozva mentéskor.");
      }
    } catch (err) {
      console.error("Guest lookup error", err);
      setGuestId(null);
      setGuestInfoMessage(
        "Nem sikerült vendéget keresni ehhez a telefonszámhoz."
      );
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          eventDate: form.eventDate,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          guestsTotal: Number(form.guestsTotal),
          guestsKids: Number(form.guestsKids) || 0,
          roomName: form.roomName || null,
          tableLayout: form.tableLayout || null,
          hasCake: form.hasCake,
          cakeDetails: form.cakeDetails || null,
          allergyNotes: form.allergyNotes || null,
          notes: form.notes || null,

          // CRM adatok
          guestId: guestId, // ha null → backend létrehozhat újat
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail || null,
        }),
      });

      const data: { ok: boolean; error?: string } = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(
          data.error === "MISSING_FIELDS"
            ? "Kérlek töltsd ki a kötelező mezőket (cím, típus, dátum, létszám, név, telefon)."
            : "Nem sikerült elmenteni az eseményt."
        );
        setIsSaving(false);
        return;
      }

      router.push("/events");
      router.refresh();
    } catch (err) {
      console.error("NewEventForm submit error", err);
      setErrorMsg("Váratlan hiba történt a mentés közben.");
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold mb-1">Új esemény rögzítése</h1>
        <p className="text-sm text-gray-500">
          Születésnapok, esküvők, keresztelők és egyéb akciók alapadatainak
          felvétele. A részletes menü és italok később is hozzáadhatók.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Alapadatok */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Alapadatok
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Esemény címe *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Pl. Kovács Anna 50. születésnapja"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Esemény típusa *
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                updateField("type", e.target.value as EventType)
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="BIRTHDAY">Születésnap</option>
              <option value="WEDDING">Esküvő</option>
              <option value="CHRISTENING">Keresztelő</option>
              <option value="CORPORATE">Céges rendezvény</option>
              <option value="OTHER">Egyéb</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Dátum *
            </label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => updateField("eventDate", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Kezdés (opcionális)
            </label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => updateField("startTime", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Zárás (opcionális)
            </label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => updateField("endTime", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Összlétszám *
            </label>
            <input
              type="number"
              min={1}
              value={form.guestsTotal}
              onChange={(e) =>
                updateField("guestsTotal", Number(e.target.value) || 0)
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Gyerekek száma
            </label>
            <input
              type="number"
              min={0}
              value={form.guestsKids}
              onChange={(e) =>
                updateField("guestsKids", Number(e.target.value) || 0)
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Kapcsolattartó + CRM lookup */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Kapcsolattartó (CRM)
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Név *
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => updateField("contactName", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Telefon *
            </label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => {
                updateField("contactPhone", e.target.value);
                setGuestId(null);
                setGuestInfoMessage(null);
              }}
              onBlur={handlePhoneBlur}
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
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
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField("contactEmail", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Terem, torta, allergének */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Terem, torta, különleges igények
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Terem / helyszín
            </label>
            <input
              type="text"
              value={form.roomName}
              onChange={(e) => updateField("roomName", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Pl. Nagyterem, különterem"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ültetés
            </label>
            <input
              type="text"
              value={form.tableLayout}
              onChange={(e) => updateField("tableLayout", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Pl. 3×10 fős asztal"
            />
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            id="hasCake"
            type="checkbox"
            checked={form.hasCake}
            onChange={(e) => updateField("hasCake", e.target.checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor="hasCake"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Lesz torta?
            </label>
            <textarea
              value={form.cakeDetails}
              onChange={(e) => updateField("cakeDetails", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              rows={2}
              placeholder="Ki hozza, mikor érkezik, hűtés, szikrák, felirat, stb."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Allergének, különleges kérések
          </label>
          <textarea
            value={form.allergyNotes}
            onChange={(e) => updateField("allergyNotes", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={2}
            placeholder="Pl. gluténmentes, laktózmentes, vegetáriánus vendégek száma..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Egyéb megjegyzés magadnak
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={3}
            placeholder="Pl. ár-elképzelések, előzetes megállapodások, fontos infók."
          />
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/events")}
          className="px-4 py-2 rounded-md border text-sm"
        >
          Mégse
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
        >
          {isSaving ? "Mentés..." : "Esemény mentése"}
        </button>
      </div>
    </form>
  );
}
