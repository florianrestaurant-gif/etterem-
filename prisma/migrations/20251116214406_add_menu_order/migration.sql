-- CreateTable
CREATE TABLE "MenuOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "menuId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "peopleCount" INTEGER,
    "note" TEXT,
    CONSTRAINT "MenuOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MenuOrder_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "MenuWeek" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "titleHU" TEXT NOT NULL,
    "descHU" TEXT,
    "titleSK" TEXT,
    "descSK" TEXT,
    "priceCents" INTEGER,
    "allergens" TEXT,
    "imageUrl" TEXT,
    "menuLabel" TEXT,
    "courseType" TEXT,
    "allWeek" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "MenuWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("allergens", "dayIndex", "descHU", "descSK", "id", "imageUrl", "menuId", "priceCents", "titleHU", "titleSK") SELECT "allergens", "dayIndex", "descHU", "descSK", "id", "imageUrl", "menuId", "priceCents", "titleHU", "titleSK" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
