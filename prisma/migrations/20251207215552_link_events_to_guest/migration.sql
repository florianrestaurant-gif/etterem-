-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RestaurantEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "guestId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INQUIRY',
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "guestsTotal" INTEGER NOT NULL,
    "guestsKids" INTEGER,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "pricePerPersonCents" INTEGER,
    "menuSubtotalCents" INTEGER,
    "drinksSubtotalCents" INTEGER,
    "otherSubtotalCents" INTEGER,
    "discountCents" INTEGER,
    "totalPriceCents" INTEGER,
    "depositCents" INTEGER,
    "depositPaidAt" DATETIME,
    "menuType" TEXT,
    "roomName" TEXT,
    "tableLayout" TEXT,
    "hasCake" BOOLEAN NOT NULL DEFAULT false,
    "cakeDetails" TEXT,
    "decorationNotes" TEXT,
    "musicNotes" TEXT,
    "allergyNotes" TEXT,
    "kitchenNotes" TEXT,
    "serviceNotes" TEXT,
    "generalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RestaurantEvent_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RestaurantEvent" ("allergyNotes", "cakeDetails", "contactEmail", "contactName", "contactPhone", "createdAt", "date", "decorationNotes", "depositCents", "depositPaidAt", "discountCents", "drinksSubtotalCents", "endTime", "generalNotes", "guestsKids", "guestsTotal", "hasCake", "id", "kitchenNotes", "menuSubtotalCents", "menuType", "musicNotes", "otherSubtotalCents", "pricePerPersonCents", "restaurantId", "roomName", "serviceNotes", "startTime", "status", "tableLayout", "title", "totalPriceCents", "type", "updatedAt") SELECT "allergyNotes", "cakeDetails", "contactEmail", "contactName", "contactPhone", "createdAt", "date", "decorationNotes", "depositCents", "depositPaidAt", "discountCents", "drinksSubtotalCents", "endTime", "generalNotes", "guestsKids", "guestsTotal", "hasCake", "id", "kitchenNotes", "menuSubtotalCents", "menuType", "musicNotes", "otherSubtotalCents", "pricePerPersonCents", "restaurantId", "roomName", "serviceNotes", "startTime", "status", "tableLayout", "title", "totalPriceCents", "type", "updatedAt" FROM "RestaurantEvent";
DROP TABLE "RestaurantEvent";
ALTER TABLE "new_RestaurantEvent" RENAME TO "RestaurantEvent";
CREATE INDEX "RestaurantEvent_restaurantId_date_idx" ON "RestaurantEvent"("restaurantId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
