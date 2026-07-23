export type AppRole = "admin" | "supervisor" | "employee";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
};

export type Profile = {
  id: string;
  full_name: string;
  role: AppRole;
  employee_id: string | null;
  company_id: string | null;
  is_active: boolean;
};
