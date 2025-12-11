"use client";

import React from "react";
import { DailyRecordResponse } from "@/types/daily-records";

export default function DailyRecordsPage() {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = e.target as HTMLFormElement;

    const payload = {
      restaurantId: (form.elements.namedItem("restaurantId") as HTMLInputElement).value,
      date: (form.elements.namedItem("date") as HTMLInputElement).value,
      guestsCount: Number((form.elements.namedItem("guestsCount") as HTMLInputElement).value || 0),
      menusSoldCount: Number((form.elements.namedItem("menusSoldCount") as HTMLInputElement).value || 0),
      deliveryOrdersCount: Number((form.elements.namedItem("deliveryOrdersCount") as HTMLInputElement).value || 0),
      openingBalanceCents: Number((form.elements.namedItem("openingBalanceCents") as HTMLInputElement).value || 0),
      closingBalanceCents: Number((form.elements.namedItem("closingBalanceCents") as HTMLInputElement).value || 0),
      notes: (form.elements.namedItem("notes") as HTMLInputElement).value || "",
    };

    const res = await fetch("/api/daily-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    let json: DailyRecordResponse;
    try {
      json = JSON.parse(text) as DailyRecordResponse;
    } catch {
      setMessage(`Hibás válasz a szervertől (${res.status}): ${text.slice(0, 80)}`);
      setLoading(false);
      return;
    }

    if (!json.ok) {
      setMessage(`Hiba: ${json.error}`);
    } else {
      setMessage("Sikeres mentés ✔");
      form.reset();
    }

    setLoading(false);
  };

  return (
    <main className="container mx-auto max-w-xl py-10">
      <h1 className="text-2xl font-semibold mb-6">Napi rekord rögzítése</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="restaurantId" type="text" placeholder="Étterem ID" className="border p-2 w-full" required />
        <input name="date" type="date" className="border p-2 w-full" required />

        <input name="guestsCount" type="number" placeholder="Vendégek száma" className="border p-2 w-full" />
        <input name="menusSoldCount" type="number" placeholder="Eladott menük" className="border p-2 w-full" />
        <input name="deliveryOrdersCount" type="number" placeholder="Házhozszállítás" className="border p-2 w-full" />

        <input name="openingBalanceCents" type="number" placeholder="Nyitó kassza (cent)" className="border p-2 w-full" />
        <input name="closingBalanceCents" type="number" placeholder="Záró kassza (cent)" className="border p-2 w-full" />

        <input name="notes" type="text" placeholder="Megjegyzés" className="border p-2 w-full" />

        <button
          disabled={loading}
          className="bg-neutral-900 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Mentés..." : "Mentés"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-neutral-700 bg-neutral-100 p-3 rounded-md">
          {message}
        </p>
      )}
    </main>
  );
}
