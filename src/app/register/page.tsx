"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, email, password }),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok || !json.ok) {
        setError(json?.error || "Hiba történt a regisztráció során.");
        return;
      }

      // Sikeres regisztráció után irány a login
      router.push("/login");
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Váratlan hiba történt. Próbáld meg később újra.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          Új fiók létrehozása
        </h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Hozd létre az első éttermi fiókodat, és lépj be az admin felületre.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label text-sm font-medium">Étterem neve</label>
            <input
              className="input input-bordered w-full"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Pl. Szent Flórián Étterem"
              required
            />
          </div>
          <div>
            <label className="label text-sm font-medium">E-mail</label>
            <input
              className="input input-bordered w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="te@etterem.hu"
              required
            />
          </div>
          <div>
            <label className="label text-sm font-medium">Jelszó</label>
            <input
              className="input input-bordered w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Legalább 8 karakter"
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            className="btn btn-primary w-full"
            disabled={loading}
            type="submit"
          >
            {loading ? "Fiók létrehozása…" : "Fiók létrehozása"}
          </button>
        </form>

        <p className="text-sm mt-6 text-center">
          Van már fiókod?{" "}
          <a className="link link-primary font-medium" href="/login">
            Jelentkezz be
          </a>
        </p>
      </div>
    </main>
  );
}
