-- CreateTable
CREATE TABLE "DeliveryPriceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soupPrice" REAL,
    "menu1Price" REAL,
    "menu2Price" REAL,
    "menu3Price" REAL,
    "menu4Price" REAL,
    "businessMenuPrice" REAL,
    "dessertPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryPriceConfig_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeliveryPriceConfig_restaurantId_validFrom_idx" ON "DeliveryPriceConfig"("restaurantId", "validFrom");
