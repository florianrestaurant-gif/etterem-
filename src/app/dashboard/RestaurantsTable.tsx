import type { Restaurant } from "@prisma/client";

type RestaurantsTableProps = {
  restaurants: Restaurant[];
};

export function RestaurantsTable({ restaurants }: RestaurantsTableProps) {
  if (restaurants.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Még nincs étterem.</p>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-100 dark:bg-neutral-800">
          <tr>
            <th className="px-3 py-2 text-left">Név</th>
            <th className="px-3 py-2 text-left">Slug</th>
            <th className="px-3 py-2 text-left">Telefon</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2">{r.slug}</td>
              <td className="px-3 py-2">{r.phone ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
