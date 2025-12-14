// prisma/seed.ts
import { PrismaClient, MembershipRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { inventoryTemplateItems } from "./inventoryTemplateData";

const prisma = new PrismaClient();

async function main() {
  console.log("➡ Starting seed…");

  // 1) Egyetlen alap étterem
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "default-restaurant" },
    update: {},
    create: {
      name: "Szent Flórián",
      slug: "default-restaurant",
      phone: "0918429207",
    },
  });

  console.log("➡ Restaurant ready:", restaurant.name, restaurant.id);

  // 2) Global admin user
  const adminEmail = "admin@local";
  const adminPassword = "admin1234"; // később cseréld!
  const hash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hash,
      isGlobalAdmin: true,
    },
    create: {
      email: adminEmail,
      password: hash,
      isGlobalAdmin: true,
      preferredLanguage: "HU",
    },
  });

  console.log("➡ Global admin ready:", admin.email, admin.id);

  // 3) Membership (nincs @@unique, ezért findFirst + create)
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: admin.id },
    select: { id: true, restaurantId: true, role: true },
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
    console.log("➡ Membership already exists:", existingMembership.id);
  }

  // 4) Inventory template seed (a te meglévő logikád)
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

  console.log("✅ Seed completed!");
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
