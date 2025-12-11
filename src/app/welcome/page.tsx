"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ugyanaz a slugify logika a UX miatt (a szerver úgyis újraszámolja)
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [name, setName] = useState("");
  const suggestedSlug = useMemo(() => slugify(name), [name]);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = (slug || suggestedSlug);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name, slug: effectiveSlug }),
      });

      let json: { ok: boolean; data?: { id: string; slug: string }; error?: string } | null = null;
      try { json = await res.json(); } catch { /* fallback */ }

      if (!json?.ok || !json.data) {
        setError(json?.error || `Hiba (${res.status})`);
        setLoading(false);
        return;
      }

      // siker: mehetsz dashboardra vagy közvetlenül a menükre
      router.push("/menus");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hálózati hiba");
      setLoading(false);
    }
  }

  // ha még nincs session betöltve
  if (status === "loading") {
    return <p className="p-6 text-center">Betöltés…</p>;
  }

  // ha nincs bejelentkezve
  if (!session?.user?.id) {
    return (
      <main className="container">
        <div className="card mt-16 max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Üdv!</h1>
          <p className="mb-4">Kérlek, jelentkezz be először.</p>
          <a href="/login" className="btn-primary">Bejelentkezés</a>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card mt-16 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Első étterem létrehozása</h1>
        <p className="text-sm opacity-80 mb-4">
          Adj nevet az éttermednek. A slug az URL-ben fog megjelenni (pl. <code>/florian</code>).
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Éttermem neve</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Szent Flórián Étterem"
              required
            />
          </div>

          <div>
            <label className="label">
              URL azonosító (slug) <span className="opacity-60 text-xs">(opcionális)</span>
            </label>
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={suggestedSlug || "pl. szent-florian"}
            />
            {suggestedSlug && !slug && (
              <p className="text-xs opacity-70 mt-1">Javasolt: <code>{suggestedSlug}</code></p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary" disabled={loading || !name}>
            {loading ? "Létrehozás…" : "Létrehozás"}
          </button>
        </form>
      </div>
    </main>
  );
}
