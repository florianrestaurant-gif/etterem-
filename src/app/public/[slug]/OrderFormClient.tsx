"use client";

import { useState } from "react";

type Props = {
  restaurantSlug: string;
  menuId: string;
  lang: "hu" | "sk";
};

export function OrderFormClient({ restaurantSlug, menuId, lang }: Props) {
  const [type, setType] = useState<"FOOD_ORDER" | "RESERVATION">(
    "FOOD_ORDER"
  );
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [peopleCount, setPeopleCount] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const t =
    lang === "hu"
      ? {
          cta: "Rendelést / foglalást szeretnék",
          title: "Rendelés / foglalás",
          name: "Név",
          phone: "Telefonszám",
          people: "Személyek száma (foglalásnál)",
          note: "Mit szeretnél rendelni / melyik napra?",
          send: "Küldés",
          success:
            "Köszönjük! Hamarosan felvesszük veled a kapcsolatot telefonon.",
          error: "Hiba történt a küldés közben.",
          orderLabel: "Ételrendelés",
          reservationLabel: "Asztalfoglalás",
        }
      : {
          cta: "Chcem objednať / rezervovať",
          title: "Objednávka / rezervácia",
          name: "Meno",
          phone: "Telefón",
          people: "Počet osôb (pri rezervácii)",
          note: "Čo si želáte objednať / na ktorý deň?",
          send: "Odoslať",
          success:
            "Ďakujeme! Čoskoro vás budeme kontaktovať telefonicky.",
          error: "Počas odosielania nastala chyba.",
          orderLabel: "Objednávka jedla",
          reservationLabel: "Rezervácia stola",
        };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!customerName.trim() || !phone.trim()) {
      setError(
        lang === "hu"
          ? "Név és telefonszám kötelező."
          : "Meno a telefón sú povinné."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug,
          menuId,
          type,
          customerName,
          phone,
          peopleCount:
            typeof peopleCount === "number" ? peopleCount : undefined,
          note,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Request failed");
      }

      setSuccess(t.success);
      setCustomerName("");
      setPhone("");
      setPeopleCount("");
      setNote("");
    } catch (e) {
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full md:w-auto px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
      >
        {t.cta}
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 border rounded-lg p-4 bg-white/90 dark:bg-neutral-900/70"
        >
          <h2 className="text-sm font-semibold mb-1">{t.title}</h2>

          <div className="flex gap-3 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                checked={type === "FOOD_ORDER"}
                onChange={() => setType("FOOD_ORDER")}
              />
              {t.orderLabel}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                checked={type === "RESERVATION"}
                onChange={() => setType("RESERVATION")}
              />
              {t.reservationLabel}
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.name}
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                {t.phone}
              </label>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t.people}
            </label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              type="number"
              min={1}
              value={peopleCount}
              onChange={(e) =>
                setPeopleCount(
                  e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                )
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {t.note}
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                lang === "hu"
                  ? "pl. Keddre 3× Business menü, 1× heti desszert, 12:30-ra."
                  : "napr. Na utorok 3× business menu, 1× týždenný dezert, o 12:30."
              }
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-600 mt-1">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "…" : t.send}
          </button>
        </form>
      )}
    </div>
  );
}
