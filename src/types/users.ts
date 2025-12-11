export type User = {
  id: string;
  email: string;
  name?: string | null;
  role?: "ADMIN" | "COOK" | "HELPER";
  createdAt?: string | Date;
};
