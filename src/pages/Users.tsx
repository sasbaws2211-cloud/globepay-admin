import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage, qs } from '../api';
import { date, TIER_LABEL } from '../format';
import type { AdminUserSummary, KycTier } from '../types';
import { Alert, Badge, Empty, Spinner } from '../ui';

export function UserStatusBadge({ u }: { u: Pick<AdminUserSummary, 'is_active' | 'closed_at'> }) {
  if (u.closed_at) return <Badge tone="muted">Closed</Badge>;
  return u.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Suspended</Badge>;
}

export function TierBadge({ tier }: { tier: KycTier }) {
  return <Badge tone={tier === 'id_verified' ? 'good' : tier === 'phone_verified' ? 'info' : 'warn'}>{TIER_LABEL[tier] ?? tier}</Badge>;
}

export default function Users() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';

  const [search, setSearch] = useState(q);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The deployed /admin/users supports only `q` and returns the newest 50.
      setUsers(await api<AdminUserSummary[]>(`/admin/users${qs({ q })}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setSearch(q), [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (search.trim()) p.set('q', search.trim());
    setParams(p);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Users & KYC</h1>
          <p className="muted">Find a customer, check their verification tier, suspend or reactivate them.</p>
        </div>
      </div>

      <form className="filters" onSubmit={submit}>
        <input
          className="search"
          type="search"
          placeholder="Search name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <button className="btn btn-primary">Search</button>
        {q && (
          <button type="button" className="btn btn-ghost" onClick={() => setParams(new URLSearchParams())}>
            Clear
          </button>
        )}
      </form>

      {error && <Alert tone="error">{error}</Alert>}

      <section className="card card-flush">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <Empty title="No users match" hint="Try a different search." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="row-link">
                    <td>
                      <Link to={`/users/${u.id}`} className="cell-link">
                        <span className="strong">{u.full_name}</span>
                        {u.is_admin && <span className="tag">admin</span>}
                        {u.email && <span className="sub">{u.email}</span>}
                      </Link>
                    </td>
                    <td className="mono">{u.phone_number}</td>
                    <td>
                      <TierBadge tier={u.kyc_tier} />
                    </td>
                    <td>
                      <UserStatusBadge u={u} />
                    </td>
                    <td className="muted nowrap">{date(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length >= 50 && (
          <div className="pager">
            <span className="muted">Showing the newest 50. Search to find someone specific.</span>
          </div>
        )}
      </section>
    </div>
  );
}
