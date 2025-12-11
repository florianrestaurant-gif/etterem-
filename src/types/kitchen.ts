import type {
  ChecklistTemplate,
  Restaurant,
  Shift,
  ShiftChecklistItem,
} from "@prisma/client";

export type { Restaurant, Shift, ChecklistTemplate, ShiftChecklistItem };

export type ChecklistItemWithTemplate = ShiftChecklistItem & {
  template: ChecklistTemplate;
};

export type TodayShiftResponse = {
  shift: Shift;
  checklistItems: ChecklistItemWithTemplate[];
};
