-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "DailyFinance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
    "date" DATETIME,
    "dayNumber" INTEGER,
    "dayName" TEXT,
    "month" INTEGER,
    "year" INTEGER,
    "plan" REAL,
    "kassza" REAL,
    "rozvoz" REAL,
    "bistro" REAL,
    "restaumatic" REAL,
    "dochodca" REAL,
    "faktura" REAL,
    "zostatok" REAL,
    "akcie" REAL,
    "listkyKupeneEur" REAL,
    "darcekovyPoukaz" REAL,
    "listkyOdovzdaneKs" INTEGER,
    "ubytovanie" REAL,
    "naMieste" INTEGER,
    "osszes" REAL,
    "restauraciaMenuKs" INTEGER,
    "rozvozMenuKs" INTEGER,
    "dochodcovMenuKs" INTEGER,
    "zostatokMenuKs" INTEGER,
    "pocetMenuKs" INTEGER,
    "summary1" REAL,
    "summary2" REAL,
    "kiadasok" REAL,
    "vydavkySpolu" REAL,
    "tovarTyzden" REAL,
    "elektrina" REAL,
    "plyn" REAL,
    "vyplaty" REAL,
    "najom" REAL,
    "odvody" REAL,
    "booking" REAL,
    "spolu" REAL,
    "extraDiff" REAL,
    "vsetkyVydavkyTyzden" REAL,
    "vyplatyTyzden" REAL,
    CONSTRAINT "DailyFinance_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "Expense_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DailyFinance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT,
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
    CONSTRAINT "DeliveryOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "responsibleId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shift_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ShiftChecklistItem_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftChecklistItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftChecklistPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftChecklistPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShiftChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftTask_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_phone_key" ON "Guest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_restaurantId_date_type_key" ON "Shift"("restaurantId", "date", "type");
