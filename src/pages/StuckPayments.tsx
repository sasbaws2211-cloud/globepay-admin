import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { dateTime, ghs } from '../format';
import type { StuckTransaction } from '../types';
import { Alert, Empty, Modal, Spinner } from '../ui';

const KIND_LABEL: Record<string, string> = {
  crossborder_transfer: 'Go Global transfer',
  card_creation: 'Virtual card',
};

// Retry/refund routes per kind (all on the deployed backend).
function actionPath(t: StuckTransaction, action: 'retry' | 'refund'): string {
  return t.kind === 'card_creation'
    ? `/admin/cards/${t.id}/${action}`
    : `/admin/crossborder/transfers/${t.id}/${action}`;
}

export default function StuckPayments() {
  const [rows, setRows] = useState<StuckTransaction[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<{ t: StuckTransaction; action: 'retry' | 'refund' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await api<StuckTransaction[]>('/admin/stuck-transactions'));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    if (!confirm) return;
    const { t, action } = confirm;
    setBusy(true);
    setModalError('');
    try {
      const res = await api<{ status: string }>(actionPath(t, action), { method: 'POST' });
      setConfirm(null);
      setNotice(
        action === 'refund'
          ? `Refund of ${ghs(t.amount)} started. Paystack confirms it in the background.`
          : res.status === 'delivery_failed'
            ? "Retry didn't work. It's still stuck."
            : 'Retry succeeded.'
      );
      load();
    } catch (err) {
      setModalError(errorMessage(err)); // keep the dialog open so the reason is read in context
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Stuck payments</h1>
          <p className="muted">
            Go Global transfers and virtual cards the customer paid for but that were never delivered. Retry, or refund what they paid.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {notice && <Alert tone="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <section className="card card-flush">
        {!rows ? (
          !error && <Spinner />
        ) : rows.length === 0 ? (
          <Empty title="Nothing stuck" hint="Every paid transfer and card was delivered or refunded." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Customer</th>
                  <th className="num">Paid</th>
                  <th>Problem</th>
                  <th>Retries</th>
                  <th>Paid on</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={`${t.kind}-${t.id}`}>
                    <td className="nowrap">{KIND_LABEL[t.kind] || t.kind}</td>
                    <td>
                      <Link to={`/users/${t.user_id}`} className="mono">
                        {t.user_phone}
                      </Link>
                    </td>
                    <td className="num strong nowrap">{ghs(t.amount)}</td>
                    <td>
                      <span className="clamp-2 text-bad" title={t.failure_reason || undefined}>
                        {t.failure_reason || 'Delivery failed'}
                      </span>
                    </td>
                    <td>{t.retry_count}</td>
                    <td className="muted nowrap">{dateTime(t.created_at)}</td>
                    <td>
                      <div className="row gap-s">
                        <button className="btn btn-primary btn-sm" onClick={() => { setModalError(''); setConfirm({ t, action: 'retry' }); }}>
                          Retry
                        </button>
                        <button className="btn btn-danger-ghost btn-sm" onClick={() => { setModalError(''); setConfirm({ t, action: 'refund' }); }}>
                          Refund
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <Modal title={confirm.action === 'retry' ? 'Retry delivery?' : 'Refund the customer?'} onClose={() => !busy && setConfirm(null)}>
          {modalError && <Alert tone="error">{modalError}</Alert>}
          <p>
            {confirm.action === 'retry'
              ? 'GlobePay asks Bitnob to deliver it again. The customer is not charged again.'
              : "The customer's payment goes back through Paystack. This can't be undone, and it can't be retried after."}
          </p>
          <p className="strong">
            {KIND_LABEL[confirm.t.kind] || confirm.t.kind} · {ghs(confirm.t.amount)} · {confirm.t.user_phone}
          </p>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </button>
            <button className={`btn ${confirm.action === 'refund' ? 'btn-danger' : 'btn-primary'}`} onClick={run} disabled={busy}>
              {busy ? 'Working…' : confirm.action === 'retry' ? 'Retry' : 'Refund'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
