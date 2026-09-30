import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from './api';
import { dateTime, ghs, humanize, statusTone } from './format';
import type { AdminTransaction, AdminTransactionDetail } from './types';
import { Alert, Badge, Modal, Spinner } from './ui';

export function KindTag({ kind }: { kind: AdminTransaction['kind'] }) {
  return <span className={`kind kind-${kind}`}>{kind === 'local' ? 'Local' : 'Go Global'}</span>;
}

export function TransactionTable({
  items,
  onOpen,
  hideSender,
}: {
  items: AdminTransaction[];
  onOpen: (t: AdminTransaction) => void;
  hideSender?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th className="num">Amount</th>
            {!hideSender && <th>From</th>}
            <th>To</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={`${t.kind}-${t.id}`} className="row-link" onClick={() => onOpen(t)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}>
              <td>
                <KindTag kind={t.kind} />
              </td>
              <td className="num strong nowrap">{ghs(t.amount_ghs)}</td>
              {!hideSender && (
                <td>
                  <span className="strong">{t.sender_name}</span>
                  <span className="sub mono">{t.sender_phone}</span>
                </td>
              )}
              <td>
                <span className="strong">{t.recipient_name || '—'}</span>
                {t.recipient_detail && <span className="sub">{t.recipient_detail}</span>}
              </td>
              <td>
                <Badge tone={statusTone(t.status)}>{humanize(t.status)}</Badge>
                {t.failure_reason && <span className="sub text-bad clamp">{t.failure_reason}</span>}
              </td>
              <td className="muted nowrap">{dateTime(t.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  // Callers pass `cond && value`, so false means "nothing to show" too.
  if (children === null || children === undefined || children === '' || children === false) return null;
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// What each action does, spelled out before the admin commits to it.
const CONFIRM = {
  retry: {
    title: 'Retry delivery?',
    body: 'GlobePay will ask Bitnob to send this payout again. The sender is not charged again.',
    button: 'Retry delivery',
  },
  refund: {
    title: 'Refund the sender?',
    body: "The sender's full GHS payment goes back through Paystack. This can't be undone, and the transfer can't be retried after it.",
    button: 'Refund sender',
  },
} as const;

export function TransactionDetail({
  tx,
  onClose,
  onChanged,
}: {
  tx: Pick<AdminTransaction, 'kind' | 'id'>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [d, setD] = useState<AdminTransactionDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'retry' | 'refund' | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<AdminTransactionDetail>(`/admin/transactions/${tx.kind}/${tx.id}`)
      .then((r) => !cancelled && setD(r))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [tx.kind, tx.id]);

  const refresh = async () => {
    setBusy('refresh');
    setError('');
    setNotice('');
    try {
      const before = d?.status;
      const next = await api<AdminTransactionDetail>(`/admin/transactions/${tx.kind}/${tx.id}/refresh`, { method: 'POST' });
      setD(next);
      setNotice(next.status === before ? 'Checked with the provider. No change yet.' : `Updated: now ${humanize(next.status)}.`);
      if (next.status !== before) onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const act = async (action: 'retry' | 'refund') => {
    setConfirm(null);
    setBusy(action);
    setError('');
    setNotice('');
    try {
      await api(`/admin/crossborder/transfers/${tx.id}/${action}`, { method: 'POST' });
      const next = await api<AdminTransactionDetail>(`/admin/transactions/${tx.kind}/${tx.id}`);
      setD(next);
      setNotice(action === 'retry' ? `Retry sent. Status: ${humanize(next.status)}.` : 'Refund started. Paystack confirms it in the background.');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title={tx.kind === 'local' ? 'Local transfer' : 'Go Global transfer'} onClose={onClose} wide>
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!d ? (
        !error && <Spinner />
      ) : confirm ? (
        <div className="confirm">
          <h3>{CONFIRM[confirm].title}</h3>
          <p>{CONFIRM[confirm].body}</p>
          <p className="strong">
            {ghs(d.amount_ghs)} · {d.sender_name}
          </p>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className={`btn ${confirm === 'refund' ? 'btn-danger' : 'btn-primary'}`} onClick={() => act(confirm)}>
              {CONFIRM[confirm].button}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="tx-hero">
            <div>
              <div className="tx-amount">{ghs(d.amount_ghs)}</div>
              {d.destination_amount && (
                <div className="muted">
                  → {d.destination_currency} {parseFloat(d.destination_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} to {d.destination_country}
                </div>
              )}
            </div>
            <Badge tone={statusTone(d.status)}>{humanize(d.status)}</Badge>
          </div>
          {d.failure_reason && <Alert tone="error">{d.failure_reason}</Alert>}

          <dl className="kvs">
            <Row label="From">
              <Link to={`/users/${d.sender_id}`} onClick={onClose}>
                {d.sender_name}
              </Link>{' '}
              <span className="mono muted">{d.sender_phone}</span>
            </Row>
            <Row label="To">
              {d.recipient_id ? (
                <>
                  <Link to={`/users/${d.recipient_id}`} onClick={onClose}>
                    {d.recipient_name}
                  </Link>{' '}
                  <span className="mono muted">{d.recipient_detail}</span>
                </>
              ) : (
                d.recipient_name || d.beneficiary_bank || '—'
              )}
            </Row>
            <Row label="Paid out via">{d.destination_type && humanize(d.destination_type)}</Row>
            <Row label="Bank">{d.beneficiary_bank}</Row>
            <Row label="Account">{d.beneficiary_account && <span className="mono">{d.beneficiary_account}</span>}</Row>
            <Row label="Platform fee">{d.fee_ghs !== null && ghs(d.fee_ghs)}</Row>
            <Row label="Recipient gets">{d.net_amount_ghs && ghs(d.net_amount_ghs)}</Row>
            <Row label="Round-up saved">{d.roundup_ghs && parseFloat(d.roundup_ghs) > 0 && ghs(d.roundup_ghs)}</Row>
            <Row label="Note">{d.note}</Row>
            <Row label="Created">{dateTime(d.created_at)}</Row>
            <Row label="Completed">{d.completed_at && dateTime(d.completed_at)}</Row>
            <Row label="Refunded">{d.refunded_at && dateTime(d.refunded_at)}</Row>
            <Row label="Bitnob status">{d.bitnob_status}</Row>
            <Row label="Delivery retries">{d.retry_count ? String(d.retry_count) : null}</Row>
            <Row label="Payment ref">{d.payment_reference && <span className="mono">{d.payment_reference}</span>}</Row>
            <Row label="Payout ref">{d.payout_reference && <span className="mono">{d.payout_reference}</span>}</Row>
            <Row label="Refund ref">{d.refund_reference && <span className="mono">{d.refund_reference}</span>}</Row>
          </dl>

          {(d.can_refresh || d.can_retry || d.can_refund) && (
            <div className="actions">
              {d.can_refresh && (
                <button className="btn btn-ghost" onClick={refresh} disabled={!!busy}>
                  {busy === 'refresh' ? 'Checking…' : 'Check status now'}
                </button>
              )}
              {d.can_retry && (
                <button className="btn btn-primary" onClick={() => setConfirm('retry')} disabled={!!busy}>
                  {busy === 'retry' ? 'Retrying…' : 'Retry delivery'}
                </button>
              )}
              {d.can_refund && (
                <button className="btn btn-danger" onClick={() => setConfirm('refund')} disabled={!!busy}>
                  {busy === 'refund' ? 'Refunding…' : 'Refund sender'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
