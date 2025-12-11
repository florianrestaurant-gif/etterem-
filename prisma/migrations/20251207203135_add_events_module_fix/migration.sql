-- CreateTable
CREATE TABLE "RestaurantEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
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
    CONSTRAINT "RestaurantEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventMenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "courseType" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allergens" TEXT,
    "portionsPlanned" INTEGER NOT NULL,
    "portionsReserve" INTEGER,
    "pricePerPortionCents" INTEGER,
    "notes" TEXT,
    CONSTRAINT "EventMenuItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventDrinkItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "quantityPlanned" REAL NOT NULL,
    "pricePerUnitCents" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "EventDrinkItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventTimelineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "time" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "EventTimelineItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueAt" DATETIME,
    "doneAt" DATETIME,
    CONSTRAINT "EventTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TableReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "guests" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "occasion" TEXT,
    "notes" TEXT,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableReservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TableReservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RestaurantEvent_restaurantId_date_idx" ON "RestaurantEvent"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "EventMenuItem_eventId_idx" ON "EventMenuItem"("eventId");

-- CreateIndex
CREATE INDEX "EventDrinkItem_eventId_idx" ON "EventDrinkItem"("eventId");

-- CreateIndex
CREATE INDEX "EventTimelineItem_eventId_time_idx" ON "EventTimelineItem"("eventId", "time");

-- CreateIndex
CREATE INDEX "EventTask_eventId_role_idx" ON "EventTask"("eventId", "role");

-- CreateIndex
CREATE INDEX "TableReservation_restaurantId_dateTime_idx" ON "TableReservation"("restaurantId", "dateTime");
