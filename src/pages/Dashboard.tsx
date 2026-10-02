import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { ghs } from '../format';
import type { PlatformStats } from '../types';
import { Alert, Spinner, Stat } from '../ui';

export default function Dashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await api<PlatformStats>('/admin/stats'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) return <Spinner label="Loading dashboard…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Platform totals, all time.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {stats && (
        <>
          {stats.stuck_transaction_count > 0 && (
            <div className="attention">
              <div>
                <strong>
                  {stats.stuck_transaction_count} paid payment{stats.stuck_transaction_count === 1 ? '' : 's'} not delivered.
                </strong>{' '}
                The customer was charged but the Go Global transfer or card didn't go through. Each one needs a retry or a refund.
              </div>
              <Link className="btn btn-danger btn-sm" to="/stuck">
                Review
              </Link>
            </div>
          )}
          <div className="stats">
            <Stat label="Users" value={stats.total_users.toLocaleString()} />
            <Stat label="Vaults" value={stats.total_vaults.toLocaleString()} />
            <Stat label="Saved in vaults" value={ghs(stats.total_vault_balance)} />
            <Stat label="Fees earned" value={ghs(stats.total_fees_collected)} sub="Transfers + vault withdrawals" />
          </div>
        </>
      )}
    </div>
  );
}
