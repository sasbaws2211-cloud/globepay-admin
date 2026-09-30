import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { dateTime, humanize, tierLabel } from '../format';
import type { AuditLogEntry } from '../types';
import { Alert, Empty, Spinner } from '../ui';

const ACTION_LABEL: Record<string, string> = {
  set_kyc_tier: 'Changed verification tier',
  suspend_user: 'Suspended user',
  reactivate_user: 'Reactivated user',
  retry_crossborder_transfer: 'Retried Go Global delivery',
  refund_crossborder_transfer: 'Refunded Go Global transfer',
  retry_card_creation: 'Retried card creation',
  refund_card_creation: 'Refunded card creation',
};

function describe(a: AuditLogEntry): string | null {
  const d = a.details || {};
  if (a.action === 'set_kyc_tier') {
    return `${tierLabel(d.from as string)} → ${tierLabel(d.to as string)}${d.reason ? ` · “${d.reason}”` : ''}`;
  }
  if (d.resulting_status) return `Result: ${humanize(String(d.resulting_status))}`;
  if (d.amount) return `GHS ${d.amount}`;
  return null;
}

export default function AuditLog() {
  const [rows, setRows] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AuditLogEntry[]>('/admin/audit-log')
      .then(setRows)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p className="muted">Every admin action, newest first (last 100).</p>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <section className="card card-flush">
        {!rows ? (
          !error && <Spinner />
        ) : rows.length === 0 ? (
          <Empty title="No admin actions yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="muted nowrap">{dateTime(a.created_at)}</td>
                    <td className="strong">{a.admin_name}</td>
                    <td>
                      {ACTION_LABEL[a.action] || humanize(a.action)}
                      {a.target_type === 'user' ? (
                        <Link to={`/users/${a.target_id}`} className="sub">
                          View user →
                        </Link>
                      ) : (
                        <span className="sub mono">{a.target_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td>{describe(a) || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
