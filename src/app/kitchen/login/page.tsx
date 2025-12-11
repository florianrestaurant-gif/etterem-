"use client";

import { useState } from "react";

export default function KitchenLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/kitchen/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Hibás PIN.");
      } else {
        // ha ok, menjünk a leltár listára vagy az új leltárra
        window.location.href = "/kitchen/inventory/new";
      }
    } catch (e) {
      console.error(e);
      setError("Váratlan hiba történt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white border rounded-lg shadow px-6 py-5 w-full max-w-xs space-y-3">
        <h1 className="text-lg font-semibold text-center">
          Konyhai leltár – belépés
        </h1>
        {error && (
          <div className="border border-red-300 text-red-700 px-2 py-1 rounded text-xs">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs mb-1">PIN kód</label>
          <input
            type="password"
            className="border rounded px-2 py-1 w-full text-center tracking-[0.3em]"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading || !pin.trim()}
          className="w-full px-3 py-2 border rounded font-medium text-sm disabled:opacity-60"
        >
          {loading ? "Ellenőrzés…" : "Belépés"}
        </button>
      </div>
    </div>
  );
}
