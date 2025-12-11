"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Hibás belépési adatok");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Bejelentkezés</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Lépj be az étterem admin felületére.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
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
              placeholder="••••••••"
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
            type="submit"
            disabled={loading}
          >
            {loading ? "Belépés…" : "Belépés"}
          </button>
        </form>

        <p className="text-sm mt-6 text-center">
          Nincs fiókod?{" "}
          <a className="link link-primary font-medium" href="/register">
            Regisztrálj
          </a>
        </p>
      </div>
    </main>
  );
}
