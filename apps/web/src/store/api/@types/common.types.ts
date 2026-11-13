export type ApiResponse<T> = { success: boolean; data: T; count?: number; message?: string };

export type Role = "ADMIN" | "MANAGER" | "SALES";

export type UserSummary = { id: string; name: string; email: string; color: string; role: Role };
