// ================================
// Checklist típusok
// ================================

export type ChecklistTemplate = {
  id: string;
  restaurantId: string;

  group: string;       // PREP | CLEANING | ADMIN | OTHER
  zone: string;        // HOT | COLD | DISHWASH | STORAGE | SERVICE | COMMON
  role: string;        // COOK | HELPER | BOTH
  label: string;

  sortOrder: number;
  isActive: boolean;
  dayOfWeek?: number | null;
};

// ================================
// A műszakhoz generált checklist tételek
// ================================

export type ShiftChecklistItem = {
  id: string;
  shiftId: string;
  templateId: string;

  isDone: boolean;
  note?: string | null;        // dolgozó megjegyzése
  hasPhoto: boolean;

  doneById?: string | null;
  doneAt?: string | null | Date;

  template: ChecklistTemplate;
  doneBy?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
};

// ================================
// Teljes válasz a backendtől
// ================================

export type ShiftWithItems = {
  shift: {
    id: string;
    restaurantId: string;
    date: string | Date;
    type: string;  // MORNING
    status: string;
    responsibleId?: string | null;
    notes?: string | null;
  };
  checklistItems: ShiftChecklistItem[];
};
