import type { KycTier } from './types';

export function ghs(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return `GHS ${(Number.isFinite(n) ? n : 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function compactGhs(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return `GHS ${(Number.isFinite(n) ? n : 0).toLocaleString('en-GH', { notation: 'compact', maximumFractionDigits: 1 })}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "delivery_failed" -> "Delivery failed"
export function humanize(s: string | null | undefined): string {
  const t = (s || '').replaceAll('_', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const TIER_LABEL: Record<KycTier, string> = {
  unverified: 'Unverified',
  phone_verified: 'Phone verified',
  id_verified: 'ID verified',
};

export function tierLabel(t: string | null | undefined): string {
  return t ? TIER_LABEL[t as KycTier] ?? humanize(t) : '—';
}

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'muted';

// Status -> colour, shared by local and Go Global transfers.
export function statusTone(status: string): Tone {
  switch (status) {
    case 'completed':
    case 'refunded':
      return 'good';
    case 'failed':
    case 'delivery_failed':
      return 'bad';
    case 'payout_pending':
    case 'processing':
    case 'refund_pending':
      return 'info';
    case 'awaiting_recipient_payout_info':
      return 'warn';
    default:
      return 'muted';
  }
}

export const STATUS_OPTIONS: Record<'local' | 'crossborder', string[]> = {
  local: ['pending_payment', 'awaiting_recipient_payout_info', 'payout_pending', 'completed', 'failed'],
  crossborder: ['pending_payment', 'processing', 'completed', 'failed', 'delivery_failed', 'refund_pending', 'refunded'],
};
