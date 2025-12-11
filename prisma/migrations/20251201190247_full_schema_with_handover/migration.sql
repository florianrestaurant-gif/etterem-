-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "outgoingUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "miseEnPlace" TEXT NOT NULL,
    "tasksSummary" TEXT NOT NULL,
    "warnings" TEXT NOT NULL,
    "cleanliness" TEXT NOT NULL,
    "nextShiftExpectations" TEXT NOT NULL,
    "chefNote" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftHandover_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftHandover_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftHandover_outgoingUserId_fkey" FOREIGN KEY ("outgoingUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
