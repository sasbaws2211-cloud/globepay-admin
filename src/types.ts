// Mirrors the admin endpoints currently deployed on the backend
// (backend/src/admin/schemas.py). Decimals arrive as strings.

export type KycTier = 'unverified' | 'phone_verified' | 'id_verified';

export interface Me {
  id: string;
  full_name: string;
  phone_number: string;
  is_admin?: boolean; // older backends don't send it - see auth.tsx
}

export interface AdminUserSummary {
  id: string;
  phone_number: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  kyc_tier: KycTier;
  created_at: string;
  closed_at?: string | null; // newer backends only
}

export interface AdminUserDetail extends AdminUserSummary {
  vault_count: number;
  total_vault_balance: string;
}

/** GET /admin/stats */
export interface PlatformStats {
  total_users: number;
  total_vaults: number;
  total_vault_balance: string;
  total_fees_collected: string;
  stuck_transaction_count: number;
}

/** GET /admin/stuck-transactions - paid but never delivered. */
export interface StuckTransaction {
  kind: 'crossborder_transfer' | 'card_creation' | string;
  id: string;
  user_id: string;
  user_phone: string;
  amount: string;
  status: string;
  failure_reason: string | null;
  retry_count: number;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
