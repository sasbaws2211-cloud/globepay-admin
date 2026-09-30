import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorMessage, qs } from '../api';
import { date, TIER_LABEL } from '../format';
import type { AdminUserSummary, KycTier } from '../types';
import { Alert, Badge, Empty, Pager, Spinner } from '../ui';

const PAGE = 25;

export function UserStatusBadge({ u }: { u: Pick<AdminUserSummary, 'is_active' | 'closed_at'> }) {
  if (u.closed_at) return <Badge tone="muted">Closed</Badge>;
  return u.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Suspended</Badge>;
}

export function TierBadge({ tier }: { tier: KycTier }) {
  return <Badge tone={tier === 'id_verified' ? 'good' : tier === 'phone_verified' ? 'info' : 'warn'}>{TIER_LABEL[tier]}</Badge>;
}

export default function Users() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const tier = params.get('kyc_tier') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 0);

  const [search, setSearch] = useState(q);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const update = (next: Record<string, string | number>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === 0) p.delete(k);
      else p.set(k, String(v));
    }
    setParams(p);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Ask for one extra row to know whether there's a next page.
      const rows = await api<AdminUserSummary[]>(
        `/admin/users${qs({ q, kyc_tier: tier, status, limit: PAGE + 1, offset: page * PAGE })}`
      );
      setHasMore(rows.length > PAGE);
      setUsers(rows.slice(0, PAGE));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, tier, status, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setSearch(q), [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: search.trim(), page: 0 });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Users & KYC</h1>
          <p className="muted">Find a customer, check their verification tier and limits, suspend or reactivate them.</p>
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
        <select value={tier} onChange={(e) => update({ kyc_tier: e.target.value, page: 0 })} aria-label="Verification tier">
          <option value="">All tiers</option>
          {(Object.keys(TIER_LABEL) as KycTier[]).map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: 0 })} aria-label="Account status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed by user</option>
        </select>
        <button className="btn btn-primary">Search</button>
        {(q || tier || status) && (
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
          <Empty title="No users match" hint="Try a different search or clear the filters." />
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
        <Pager page={page} hasMore={hasMore} count={users.length} onPage={(p) => update({ page: p })} />
      </section>
    </div>
  );
}
