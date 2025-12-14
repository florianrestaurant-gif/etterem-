// prisma/seed.cjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient, MembershipRole } = require("@prisma/client");
const bcrypt = require("bcrypt");

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

  // 1) Étterem: legyen pontosan 1 alap (slug unique, ezért upsert a legstabilabb)
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "default-restaurant" },
    update: {
      name: "Szent Flórián",
      phone: "0918429207",
    },
    create: {
      slug: "default-restaurant",
      name: "Szent Flórián",
      phone: "0918429207",
    },
  });

  console.log("➡ Restaurant ready:", restaurant.name, restaurant.id);

  // 2) Global admin user
  const adminEmail = "admin@local";
  const adminPassword = "admin1234"; // később cseréld!
  const hash = await bcrypt.hash(adminPassword, 10);

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hash,
        isGlobalAdmin: true,
        // preferredLanguage: alapból HU a schema-ban, nem kötelező megadni
      },
    });
    console.log("➡ Global admin created:", admin.email, admin.id);
  } else {
    // frissítsük, hogy biztos global admin legyen és a jelszó is ismert
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { password: hash, isGlobalAdmin: true },
    });
    console.log("➡ Global admin updated:", admin.email, admin.id);
  }

  // 3) Membership: A variáció (1 admin = 1 étterem)
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: admin.id },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: admin.id,
        restaurantId: restaurant.id,
        role: MembershipRole.RESTAURANT_OWNER,
      },
    });
    console.log("➡ Membership created (RESTAURANT_OWNER)");
  } else {
    // ha valamiért már van, legyen hozzárendelve az étteremhez és legyen OWNER
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: {
        restaurantId: restaurant.id,
        role: MembershipRole.RESTAURANT_OWNER,
      },
    });
    console.log("➡ Membership updated to default restaurant + OWNER");
  }

  // 4) Inventory template seed
  await prisma.inventoryTemplateItem.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  console.log("➡ Régi inventory template törölve.");

  await prisma.inventoryTemplateItem.createMany({
    data: inventoryTemplateItems.map((item) => ({
      restaurantId: restaurant.id,
      name: item.name,
      unit: item.unit,
      sortOrder: item.sortOrder,
    })),
  });

  console.log("✅ Inventory template seed kész!");
  console.log(`✅ Login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
