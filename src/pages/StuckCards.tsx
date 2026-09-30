import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { dateTime, ghs } from '../format';
import type { AdminStuckCard } from '../types';
import { Alert, Badge, Empty, Modal, Spinner } from '../ui';

type Action = { card: AdminStuckCard; kind: 'retry' | 'refund' };

export default function StuckCards() {
  const [cards, setCards] = useState<AdminStuckCard[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setCards(await api<AdminStuckCard[]>('/admin/cards/stuck'));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    if (!confirm) return;
    const { card, kind } = confirm;
    setBusy(true);
    setModalError('');
    try {
      const res = await api<{ status: string }>(`/admin/cards/${card.id}/${kind}`, { method: 'POST' });
      setConfirm(null);
      setNotice(
        kind === 'refund'
          ? `Refund of ${ghs(card.charged_ghs)} to ${card.user_name} started. Paystack confirms it in the background.`
          : res.status === 'delivery_failed'
            ? `Retry for ${card.user_name}'s card didn't work. It's still stuck.`
            : `${card.user_name}'s card was created.`
      );
      load();
    } catch (err) {
      // Keep the dialog open so the reason (e.g. "3-card limit reached") is read in context.
      setModalError(errorMessage(err));
      load();
    } finally {
      setBusy(false);
    }
  };

  const stuck = cards?.filter((c) => c.status === 'delivery_failed') ?? [];
  const refunding = cards?.filter((c) => c.status === 'refund_pending') ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Stuck cards</h1>
          <p className="muted">
            Virtual cards the customer paid for that Bitnob didn't create. Retry creating the card, or refund what the customer paid.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {notice && <Alert tone="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <section className="card card-flush">
        {!cards ? (
          !error && <Spinner />
        ) : stuck.length === 0 ? (
          <Empty title="No stuck cards" hint="Every paid card was created or refunded." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Paid</th>
                  <th>Problem</th>
                  <th>Retries</th>
                  <th>Paid on</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stuck.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/users/${c.user_id}`} className="strong">
                        {c.user_name}
                      </Link>
                      <span className="sub mono">{c.user_phone}</span>
                    </td>
                    <td className="num nowrap">
                      <span className="strong">{ghs(c.charged_ghs)}</span>
                      {c.load_ghs !== c.charged_ghs && <span className="sub">{ghs(c.load_ghs)} card load + fee</span>}
                    </td>
                    <td>
                      <span className="clamp-2 text-bad" title={c.failure_reason || undefined}>
                        {c.failure_reason || 'Card creation failed'}
                      </span>
                    </td>
                    <td className="nowrap">
                      {c.retry_count} of {c.max_retries}
                    </td>
                    <td className="muted nowrap">{dateTime(c.created_at)}</td>
                    <td>
                      <div className="row gap-s">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!c.can_retry}
                          title={c.can_retry ? undefined : 'Retry limit reached. Refund instead.'}
                          onClick={() => {
                            setModalError('');
                            setConfirm({ card: c, kind: 'retry' });
                          }}
                        >
                          Retry
                        </button>
                        <button
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => {
                            setModalError('');
                            setConfirm({ card: c, kind: 'refund' });
                          }}
                        >
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

      {refunding.length > 0 && (
        <section className="card card-flush">
          <div className="card-head card-pad">
            <h2>Refunds in progress</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Refund</th>
                  <th>Status</th>
                  <th>Refund ref</th>
                </tr>
              </thead>
              <tbody>
                {refunding.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/users/${c.user_id}`} className="strong">
                        {c.user_name}
                      </Link>
                      <span className="sub mono">{c.user_phone}</span>
                    </td>
                    <td className="num strong nowrap">{ghs(c.charged_ghs)}</td>
                    <td>
                      <Badge tone="info">Waiting for Paystack</Badge>
                    </td>
                    <td className="mono muted">{c.refund_reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {confirm && (
        <Modal title={confirm.kind === 'retry' ? 'Retry creating this card?' : 'Refund this card?'} onClose={() => !busy && setConfirm(null)}>
          {modalError && <Alert tone="error">{modalError}</Alert>}
          <p>
            {confirm.kind === 'retry'
              ? `GlobePay will ask Bitnob to create ${confirm.card.user_name}'s card again. They won't be charged again. This is attempt ${confirm.card.retry_count + 1} of ${confirm.card.max_retries}.`
              : `${confirm.card.user_name} gets back everything they paid, including the fee, through Paystack. This can't be undone, and the card can't be retried after it.`}
          </p>
          <p className="strong">
            {ghs(confirm.card.charged_ghs)} · {confirm.card.user_phone}
          </p>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </button>
            <button className={`btn ${confirm.kind === 'refund' ? 'btn-danger' : 'btn-primary'}`} onClick={run} disabled={busy}>
              {busy ? 'Working…' : confirm.kind === 'retry' ? 'Retry card' : `Refund ${ghs(confirm.card.charged_ghs)}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
