-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT,
    "restaurantId" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "place" TEXT,
    "note" TEXT,
    "timestamp" DATETIME,
    "deliveryDate" DATETIME,
    "soup" INTEGER,
    "menu1" INTEGER,
    "menu2" INTEGER,
    "menu3" INTEGER,
    "menu4" INTEGER,
    "businessMenu" INTEGER,
    "dessert" INTEGER,
    "routeOrder" INTEGER,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "isSenior" BOOLEAN NOT NULL DEFAULT false,
    "packagingCount" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrder" ("address", "businessMenu", "createdAt", "delivered", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "restaurantId", "routeOrder", "soup", "timestamp", "totalPrice", "updatedAt") SELECT "address", "businessMenu", "createdAt", "delivered", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "restaurantId", "routeOrder", "soup", "timestamp", "totalPrice", "updatedAt" FROM "DeliveryOrder";
DROP TABLE "DeliveryOrder";
ALTER TABLE "new_DeliveryOrder" RENAME TO "DeliveryOrder";
CREATE INDEX "DeliveryOrder_restaurantId_deliveryDate_idx" ON "DeliveryOrder"("restaurantId", "deliveryDate");
CREATE TABLE "new_DeliveryPriceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soupPrice" REAL NOT NULL DEFAULT 0,
    "menu1Price" REAL NOT NULL DEFAULT 0,
    "menu2Price" REAL NOT NULL DEFAULT 0,
    "menu3Price" REAL NOT NULL DEFAULT 0,
    "menu4Price" REAL NOT NULL DEFAULT 0,
    "businessMenuPrice" REAL NOT NULL DEFAULT 0,
    "dessertPrice" REAL NOT NULL DEFAULT 0,
    "packagingPrice" REAL NOT NULL DEFAULT 0,
    "seniorDiscountPercent" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryPriceConfig_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryPriceConfig" ("businessMenuPrice", "createdAt", "dessertPrice", "id", "menu1Price", "menu2Price", "menu3Price", "menu4Price", "restaurantId", "soupPrice", "updatedAt", "validFrom") SELECT coalesce("businessMenuPrice", 0) AS "businessMenuPrice", "createdAt", coalesce("dessertPrice", 0) AS "dessertPrice", "id", coalesce("menu1Price", 0) AS "menu1Price", coalesce("menu2Price", 0) AS "menu2Price", coalesce("menu3Price", 0) AS "menu3Price", coalesce("menu4Price", 0) AS "menu4Price", "restaurantId", coalesce("soupPrice", 0) AS "soupPrice", "updatedAt", "validFrom" FROM "DeliveryPriceConfig";
DROP TABLE "DeliveryPriceConfig";
ALTER TABLE "new_DeliveryPriceConfig" RENAME TO "DeliveryPriceConfig";
CREATE INDEX "DeliveryPriceConfig_restaurantId_validFrom_idx" ON "DeliveryPriceConfig"("restaurantId", "validFrom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
