"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MenuWeek {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  _count?: { items: number };
}

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  async function loadMenus() {
    try {
      const res = await fetch("/api/menus", { cache: "no-store" });

      type MenuWeek = { id: string; startDate: string; endDate: string; status: string; _count?: { items: number } };
      type ApiResp = { ok: boolean; data?: MenuWeek[]; error?: string };

      // Biztonságos parse, explicit típusokkal – nincs 'any'
      const text = await res.text();
      let json: ApiResp;
      try {
        json = JSON.parse(text) as ApiResp;
      } catch {
        throw new Error(`Nem JSON válasz a szervertől (${res.status}): ${text.slice(0, 100)}`);
      }

      if (!json.ok) throw new Error(json.error || `Hiba (${res.status})`);
      setMenus(json.data ?? []);
    } catch (e: unknown) {                            // ⬅️ nincs any
      const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }
  loadMenus();
}, []);


  if (loading) return <p className="p-6 text-center">Betöltés...</p>;
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Heti menük</h1>
        <Link href="/menus/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Új heti menü
        </Link>
      </div>

      {menus.length === 0 ? (
        <p className="text-gray-600">Még nincs létrehozott heti menü.</p>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => (
            <Link
              key={menu.id}
              href={`/menus/${menu.id}/edit`}
              className="block border rounded-md p-4 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    {new Date(menu.startDate).toLocaleDateString("hu-HU")} –{" "}
                    {new Date(menu.endDate).toLocaleDateString("hu-HU")}
                  </p>
                  <p className="text-sm text-gray-600">Állapot: {menu.status}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {menu._count?.items ?? 0} tétel
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
