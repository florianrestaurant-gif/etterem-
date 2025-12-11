"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      <Link
        href="/dashboard"
        className="px-3 py-1 rounded bg-black text-white text-sm"
      >
        ← Vissza a főmenübe
      </Link>

      {/* Opció: highlighting a jelenlegi modul szerint */}
      {pathname.startsWith("/dashboard/delivery") && (
        <Link
          href="/dashboard/delivery"
          className="px-3 py-1 rounded border text-sm"
        >
          Kiszállítási áttekintés
        </Link>
      )}

      {pathname.startsWith("/dashboard/finance") && (
        <Link
          href="/dashboard/finance"
          className="px-3 py-1 rounded border text-sm"
        >
          Pénzügyek áttekintése
        </Link>
      )}

      {pathname.startsWith("/dashboard/inventory") && (
        <Link
          href="/dashboard/inventory"
          className="px-3 py-1 rounded border text-sm"
        >
          Készletek áttekintése
        </Link>
      )}
    </div>
  );
}
