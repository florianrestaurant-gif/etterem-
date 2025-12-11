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
    "totalPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrder" ("address", "businessMenu", "createdAt", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "restaurantId", "soup", "timestamp", "totalPrice", "updatedAt") SELECT "address", "businessMenu", "createdAt", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "restaurantId", "soup", "timestamp", "totalPrice", "updatedAt" FROM "DeliveryOrder";
DROP TABLE "DeliveryOrder";
ALTER TABLE "new_DeliveryOrder" RENAME TO "DeliveryOrder";
CREATE INDEX "DeliveryOrder_restaurantId_deliveryDate_idx" ON "DeliveryOrder"("restaurantId", "deliveryDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
