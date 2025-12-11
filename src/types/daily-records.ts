// Egy napi rekord mentése után ezt kapod vissza az API-ból
export type DailyRecordResponse = {
  ok: boolean;
  data?: {
    id: string;
    restaurantId: string;
    date: string;

    guestsCount?: number;
    menusSoldCount?: number;
    deliveryOrdersCount?: number;
    openingBalanceCents?: number;
    closingBalanceCents?: number;
    notes?: string;

    createdAt: string;
    updatedAt: string;
  };
  error?: string;
};
