"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays } from "date-fns";

export default function NewMenuPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(d, "yyyy-MM-dd");
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const start = new Date(weekStart);
    const end = addDays(start, 6);

    const res = await fetch("/api/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: start.toISOString(), endDate: end.toISOString() }),
    });

    let json: { ok: boolean; data?: { id: string }; error?: string } | null = null;
    try { json = await res.json(); } catch { /* fallback lentebb */ }

    setLoading(false);
    if (!json?.ok || !json.data) {
      const txt = json?.error || `Hiba (${res.status})`;
      setError(txt);
      return;
    }
    router.push(`/menus/${json.data.id}/edit`);
  }

  return (
    <main className="container">
      <div className="card mt-10 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-3">Új heti menü</h1>
        <form className="space-y-4" onSubmit={onCreate}>
          <div>
            <label className="label">Hét kezdete</label>
            <input className="input" type="date" value={weekStart} onChange={(e)=>setWeekStart(e.target.value)} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary" disabled={loading}>
            {loading ? "Létrehozás…" : "Létrehozás"}
          </button>
        </form>
      </div>
    </main>
  );
}
