"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function HaccpLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const restaurantId = searchParams.get("restaurantId") ?? "";

  const linkClass = (href: string) => {
    const isActive = pathname.startsWith(href);

    return (
      "rounded-md px-3 py-1 text-sm border " +
      (isActive
        ? "bg-blue-600 text-white border-blue-600"
        : "border-gray-300 hover:bg-gray-100")
    );
  };

  const linkHref = (pathname: string) => {
    if (restaurantId) {
      return {
        pathname,
        query: { restaurantId },
      };
    }
    return pathname;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <nav className="flex flex-wrap gap-2 text-sm mb-2">
        <Link href={linkHref("/dashboard/haccp/goods-receipts")} className={linkClass("/dashboard/haccp/goods-receipts")}>
          Áruátvételi napló
        </Link>

        <Link href={linkHref("/dashboard/haccp/fridge-log")} className={linkClass("/dashboard/haccp/fridge-log")}>
          Hűtő / fagyasztó napló
        </Link>

        <Link href={linkHref("/dashboard/haccp/daily-checklists")} className={linkClass("/dashboard/haccp/daily-checklists")}>
          Napi nyitás / zárás
        </Link>

        <Link href={linkHref("/dashboard/haccp/cleaning-templates")} className={linkClass("/dashboard/haccp/cleaning-templates")}>
          Takarítási sablonok
        </Link>

        <Link href={linkHref("/dashboard/haccp/checklist-templates")} className={linkClass("/dashboard/haccp/checklist-templates")}>
          Checklist sablonok
        </Link>

        <Link href={linkHref("/dashboard/haccp/heat-treatment")} className={linkClass("/dashboard/haccp/heat-treatment")}>
          Hőkezelési napló
        </Link>

        <Link href={linkHref("/dashboard/haccp/cooling-logs")} className={linkClass("/dashboard/haccp/cooling-logs")}>
          Visszahűtési napló
        </Link>
      </nav>

      <div>{children}</div>
    </div>
  );
}
