// prisma/seed-inventory.ts
import { prisma } from "@/lib/prisma";
import { inventoryTemplateItems } from "./inventoryTemplateData";

async function main() {
  // Itt döntöd el, melyik étteremhez tartozzon ez a template
  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    throw new Error("Nincs restaurant a DB-ben.");
  }

  await prisma.inventoryTemplateItem.createMany({
    data: inventoryTemplateItems.map((item) => ({
      restaurantId: restaurant.id,
      name: item.name,
      unit: item.unit,
      sortOrder: item.sortOrder,
    })),
  });

  console.log("Inventory template seed kész ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
