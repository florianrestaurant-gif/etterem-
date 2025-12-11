/*
  Warnings:

  - Added the required column `restaurantId` to the `DeliveryOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantId` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "supplierName" TEXT,
    "productName" TEXT NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "quantity" REAL,
    "unit" TEXT,
    "temperature" REAL,
    "qualityOK" BOOLEAN NOT NULL,
    "packagingOK" BOOLEAN,
    "comment" TEXT,
    "createdById" TEXT,
    CONSTRAINT "GoodsReceipt_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsComplaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "productName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "quantity" REAL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "GoodsComplaint_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsComplaint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FridgeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "fridgeName" TEXT NOT NULL,
    "temperature" REAL NOT NULL,
    "humidity" REAL,
    "location" TEXT,
    "actionTaken" TEXT,
    "createdById" TEXT,
    CONSTRAINT "FridgeLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FridgeLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dishName" TEXT NOT NULL,
    "batchCode" TEXT,
    "coreTemp" REAL,
    "oilTemp" REAL,
    "servingTemp" REAL,
    "ccpOk" BOOLEAN,
    "actionTaken" TEXT,
    "createdById" TEXT,
    CONSTRAINT "CookingLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CookingLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SampleLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "dateTaken" DATETIME NOT NULL,
    "dishName" TEXT NOT NULL,
    "portionSize" REAL,
    "storageFridgeName" TEXT,
    "disposalDue" DATETIME NOT NULL,
    "disposed" BOOLEAN NOT NULL DEFAULT false,
    "disposedAt" DATETIME,
    "createdById" TEXT,
    CONSTRAINT "SampleLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SampleLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CleaningLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "area" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "productUsed" TEXT,
    "method" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "comment" TEXT,
    "createdById" TEXT,
    CONSTRAINT "CleaningLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CleaningLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PestControlLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "baitNumber" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "pestsFound" TEXT,
    "baitLossPct" REAL,
    "baitReplaced" BOOLEAN,
    "notes" TEXT,
    "performedBy" TEXT,
    "createdById" TEXT,
    CONSTRAINT "PestControlLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PestControlLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrepChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "area" TEXT NOT NULL,
    "separateAreaUsed" BOOLEAN NOT NULL,
    "separateSinkUsed" BOOLEAN NOT NULL,
    "toolsCleanAndMarked" BOOLEAN NOT NULL,
    "expiredItemsRemoved" BOOLEAN NOT NULL,
    "maxTimeRespected" BOOLEAN,
    "comment" TEXT,
    "createdById" TEXT,
    CONSTRAINT "PrepChecklist_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrepChecklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "auditNumber" TEXT,
    "date" DATETIME NOT NULL,
    "area" TEXT NOT NULL,
    "auditors" TEXT,
    "auditees" TEXT,
    "scope" TEXT,
    "documents" TEXT,
    "issuesFound" TEXT,
    "correctiveActions" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    CONSTRAINT "Audit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Audit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DishProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT,
    "allergens" TEXT,
    "storageTemp" TEXT,
    "shelfLifeInfo" TEXT,
    "servingTemp" TEXT,
    "reheatingRules" TEXT,
    CONSTRAINT "DishProfile_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "module" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdById" TEXT,
    CONSTRAINT "CorrectiveAction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorrectiveAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "labName" TEXT,
    "resultSummary" TEXT NOT NULL,
    "actionTaken" TEXT,
    "createdById" TEXT,
    CONSTRAINT "LabTest_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasuringDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "range" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "lastCalibration" DATETIME,
    "calibrationDue" DATETIME,
    CONSTRAINT "MeasuringDevice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "totalPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryOrder" ("address", "businessMenu", "createdAt", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "soup", "timestamp", "totalPrice", "updatedAt") SELECT "address", "businessMenu", "createdAt", "deliveryDate", "dessert", "guestId", "id", "menu1", "menu2", "menu3", "menu4", "note", "phone", "place", "soup", "timestamp", "totalPrice", "updatedAt" FROM "DeliveryOrder";
DROP TABLE "DeliveryOrder";
ALTER TABLE "new_DeliveryOrder" RENAME TO "DeliveryOrder";
CREATE INDEX "DeliveryOrder_restaurantId_deliveryDate_idx" ON "DeliveryOrder"("restaurantId", "deliveryDate");
CREATE TABLE "new_Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guest_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Guest" ("address", "createdAt", "email", "id", "name", "note", "phone", "updatedAt") SELECT "address", "createdAt", "email", "id", "name", "note", "phone", "updatedAt" FROM "Guest";
DROP TABLE "Guest";
ALTER TABLE "new_Guest" RENAME TO "Guest";
CREATE INDEX "Guest_restaurantId_idx" ON "Guest"("restaurantId");
CREATE UNIQUE INDEX "Guest_restaurantId_phone_key" ON "Guest"("restaurantId", "phone");
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "role" TEXT NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("id", "restaurantId", "role", "userId") SELECT "id", "restaurantId", "role", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_restaurantId_idx" ON "Membership"("restaurantId");
CREATE TABLE "new_Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'HU',
    "timeZone" TEXT
);
INSERT INTO "new_Restaurant" ("createdAt", "id", "name", "phone", "slug") SELECT "createdAt", "id", "name", "phone", "slug" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("active", "id", "name") SELECT "active", "id", "name" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE INDEX "Supplier_restaurantId_idx" ON "Supplier"("restaurantId");
CREATE UNIQUE INDEX "Supplier_restaurantId_name_key" ON "Supplier"("restaurantId", "name");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'HU'
);
INSERT INTO "new_User" ("createdAt", "email", "id", "password") SELECT "createdAt", "email", "id", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GoodsReceipt_restaurantId_date_idx" ON "GoodsReceipt"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "GoodsComplaint_restaurantId_date_idx" ON "GoodsComplaint"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "FridgeLog_restaurantId_date_idx" ON "FridgeLog"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "FridgeLog_restaurantId_fridgeName_idx" ON "FridgeLog"("restaurantId", "fridgeName");

-- CreateIndex
CREATE INDEX "CookingLog_restaurantId_date_idx" ON "CookingLog"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "SampleLog_restaurantId_dateTaken_idx" ON "SampleLog"("restaurantId", "dateTaken");

-- CreateIndex
CREATE INDEX "SampleLog_restaurantId_disposalDue_idx" ON "SampleLog"("restaurantId", "disposalDue");

-- CreateIndex
CREATE INDEX "CleaningLog_restaurantId_date_idx" ON "CleaningLog"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "CleaningLog_restaurantId_area_idx" ON "CleaningLog"("restaurantId", "area");

-- CreateIndex
CREATE INDEX "PestControlLog_restaurantId_date_idx" ON "PestControlLog"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "PrepChecklist_restaurantId_date_idx" ON "PrepChecklist"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "Audit_restaurantId_date_idx" ON "Audit"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "DishProfile_restaurantId_group_idx" ON "DishProfile"("restaurantId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "DishProfile_restaurantId_name_key" ON "DishProfile"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "CorrectiveAction_restaurantId_date_idx" ON "CorrectiveAction"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "CorrectiveAction_module_referenceId_idx" ON "CorrectiveAction"("module", "referenceId");

-- CreateIndex
CREATE INDEX "LabTest_restaurantId_date_idx" ON "LabTest"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "MeasuringDevice_restaurantId_name_idx" ON "MeasuringDevice"("restaurantId", "name");
