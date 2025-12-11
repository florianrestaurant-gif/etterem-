// src/types/shift.ts

// Ezeknek egyezniük kell a Prisma enum értékeivel (ShiftType)
export const SHIFT_TYPES = ["MORNING", "AFTERNOON", "EVENING", "OTHER"] as const;

export type ShiftType = (typeof SHIFT_TYPES)[number];
