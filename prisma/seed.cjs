// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Itt vannak az Excel-ből átvett leltár sorok:
const inventoryTemplateItems = [
  { name: "kuracie prsia v obale", unit: "kg", sortOrder: 1 },
  { name: "kuracie prsia bez obalu", unit: "kg", sortOrder: 2 },
  { name: "kuracie prsia plnené", unit: "ks", sortOrder: 3 },
  { name: "karé v obale", unit: "kg", sortOrder: 4 },
  { name: "karé bez obalu", unit: "kg", sortOrder: 5 },
  { name: "karé XXL", unit: "ks", sortOrder: 6 },
  { name: "panenka v obale", unit: "kg", sortOrder: 7 },
  { name: "panenka bez obalu", unit: "kg", sortOrder: 8 },
  { name: "panenka plnená", unit: "ks", sortOrder: 9 },
  { name: "angus", unit: "ks", sortOrder: 10 },
  { name: "kačacie prsia", unit: "ks", sortOrder: 11 },
  { name: "kačacie stehno", unit: "ks", sortOrder: 12 },
  { name: "koleno", unit: "ks", sortOrder: 13 },
  { name: "krídla", unit: "ks", sortOrder: 14 },
  { name: "rebrá", unit: "ks", sortOrder: 15 },
  { name: "sumec", unit: "kg", sortOrder: 16 },
  { name: "zubáč", unit: "kg", sortOrder: 17 },
  { name: "losos", unit: "ks", sortOrder: 18 },
  { name: "mlieko", unit: "l", sortOrder: 19 },
  { name: "rama", unit: "l", sortOrder: 20 },
  { name: "hranolky", unit: "kg", sortOrder: 21 },
  { name: "batátové hranolky", unit: "kg", sortOrder: 22 },
  { name: "krokety", unit: "kg", sortOrder: 23 },
  { name: "zemiakové chipsy", unit: "kg", sortOrder: 24 },
  { name: "ryža", unit: "kg", sortOrder: 25 },
  { name: "fondán", unit: "ks", sortOrder: 26 },
];

async function main() {
  console.log("➡ Starting seed…");

  // 1. Étterem keresése vagy létrehozása
  let restaurant = await prisma.restaurant.findFirst();

  if (!restaurant) {
    console.log("➡ Nincs étterem, létrehozok egyet…");

    restaurant = await prisma.restaurant.create({
      data: {
        slug: "default-restaurant",
        name: "Szent Flórián",
        phone: "0918429207",
      },
    });

    console.log("➡ Új étterem létrehozva:", restaurant.id);
  } else {
    console.log("➡ Meglévő étterem:", restaurant.name);
  }

  // 2. Régi template törlése
  await prisma.inventoryTemplateItem.deleteMany({
    where: { restaurantId: restaurant.id },
  });

  console.log("➡ Régi inventory template törölve.");

  // 3. Új template beszúrása
  await prisma.inventoryTemplateItem.createMany({
    data: inventoryTemplateItems.map((item) => ({
      restaurantId: restaurant.id,
      name: item.name,
      unit: item.unit,
      sortOrder: item.sortOrder,
    })),
  });

  console.log("✅ Inventory template seed kész!");
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
