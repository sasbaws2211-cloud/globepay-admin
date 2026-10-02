// Mirrors backend/src/admin/schemas.py. Decimals arrive as strings.

export type KycTier = 'unverified' | 'phone_verified' | 'id_verified';
export type TxKind = 'local' | 'crossborder';

export interface Me {
  id: string;
  full_name: string;
  phone_number: string;
  is_admin: boolean;
}

export interface AdminUserSummary {
  id: string;
  phone_number: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  is_admin: boolean;
  kyc_tier: KycTier;
  is_phone_verified: boolean;
  closed_at: string | null;
  created_at: string;
}

export interface AdminUserLimits {
  enforced: boolean;
  kyc_tier: KycTier;
  daily_limit: string | null;
  daily_used: string;
  daily_remaining: string | null;
  monthly_limit: string | null;
  monthly_used: string;
  monthly_remaining: string | null;
}

export interface KycChange {
  admin_name: string;
  from_tier: string | null;
  to_tier: string | null;
  reason: string | null;
  created_at: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  vault_count: number;
  total_vault_balance: string;
  default_momo_number: string | null;
  default_momo_bank_code: string | null;
  default_account_name: string | null;
  local_sent_count: number;
  local_received_count: number;
  crossborder_count: number;
  total_sent_ghs: string;
  limits: AdminUserLimits | null;
  kyc_history: KycChange[];
}

export interface AdminTransaction {
  kind: TxKind;
  id: string;
  status: string;
  amount_ghs: string;
  fee_ghs: string | null;
  sender_id: string;
  sender_name: string;
  sender_phone: string;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_detail: string | null;
  payment_reference: string | null;
  failure_reason: string | null;
  expired: boolean; // unpaid 24h+ checkout (status stays pending_payment)
  created_at: string;
  completed_at: string | null;
}

export interface AdminTransactionDetail extends AdminTransaction {
  net_amount_ghs: string | null;
  roundup_ghs: string | null;
  note: string | null;
  payout_reference: string | null;
  destination_country: string | null;
  destination_currency: string | null;
  destination_amount: string | null;
  destination_type: string | null;
  beneficiary_bank: string | null;
  beneficiary_account: string | null;
  bitnob_status: string | null;
  retry_count: number | null;
  refund_reference: string | null;
  refunded_at: string | null;
  can_retry: boolean;
  can_refund: boolean;
  can_refresh: boolean;
}

export interface AdminTransactionPage {
  items: AdminTransaction[];
  has_more: boolean;
}

export interface DailyVolume {
  day: string;
  local_ghs: string;
  crossborder_ghs: string;
  local_count: number;
  crossborder_count: number;
}

export interface AdminDashboard {
  total_users: number;
  new_users_7d: number;
  suspended_users: number;
  users_by_tier: Record<KycTier, number>;
  local_volume_30d: string;
  local_count_30d: number;
  crossborder_volume_30d: string;
  crossborder_count_30d: number;
  fees_30d: string;
  stuck_transaction_count: number;
  stuck_card_count: number;
  in_flight_count: number;
  daily: DailyVolume[];
}

export interface AdminStuckCard {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  status: 'delivery_failed' | 'refund_pending';
  load_ghs: string;
  charged_ghs: string;
  currency: string;
  failure_reason: string | null;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
  can_refund: boolean;
  payment_reference: string | null;
  refund_reference: string | null;
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
