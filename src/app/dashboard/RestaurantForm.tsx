"use client";

import { useState } from "react";

export function RestaurantForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError("Név és slug kötelező.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, phone }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error);
      }

      // siker → reload
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ismeretlen hiba");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-xl p-4 mb-6 bg-white/80 dark:bg-neutral-900/60 space-y-3"
    >
      <h2 className="text-lg font-semibold">Új étterem létrehozása</h2>

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Étterem neve"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Slug (pl. florian-etterem)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Telefonszám (opcionális)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <button
        className="px-4 py-2 bg-neutral-900 text-white rounded"
        disabled={saving}
      >
        {saving ? "Mentés…" : "Hozzáadás"}
      </button>
    </form>
  );
}
