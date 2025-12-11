// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { inventoryTemplateItems } from "./inventoryTemplateData";

const prisma = new PrismaClient();

async function main() {
  console.log("➡ Starting seed…");

  const restaurant = await prisma.restaurant.findFirst();
  if (!restaurant) {
    throw new Error("❌ Nincs restaurant a DB-ben! Előbb hozz létre egyet.");
  }

  console.log("➡ Found restaurant:", restaurant.name);

  await prisma.inventoryTemplateItem.deleteMany({
    where: { restaurantId: restaurant.id },
  });

  await prisma.inventoryTemplateItem.createMany({
    data: inventoryTemplateItems.map((item) => ({
      restaurantId: restaurant.id,
      name: item.name,
      unit: item.unit,
      sortOrder: item.sortOrder,
    })),
  });

  console.log("✅ Inventory template seed completed!");
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
