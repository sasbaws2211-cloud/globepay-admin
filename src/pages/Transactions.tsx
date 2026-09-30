import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage, qs } from '../api';
import { humanize, STATUS_OPTIONS } from '../format';
import { TransactionDetail, TransactionTable } from '../transactions';
import type { AdminTransaction, AdminTransactionPage, TxKind } from '../types';
import { Alert, Empty, Pager, Spinner } from '../ui';

const PAGE = 25;

const TABS: { key: '' | TxKind; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'local', label: 'Local' },
  { key: 'crossborder', label: 'Go Global' },
];

export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') || '') as '' | TxKind;
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 0);

  const [search, setSearch] = useState(q);
  const [data, setData] = useState<AdminTransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<AdminTransaction | null>(null);

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
      setData(await api<AdminTransactionPage>(`/admin/transactions${qs({ kind, status, q, limit: PAGE, offset: page * PAGE })}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [kind, status, q, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setSearch(q), [q]);

  // Status choices depend on the tab: the two kinds have different lifecycles.
  const statuses = kind ? STATUS_OPTIONS[kind] : Array.from(new Set([...STATUS_OPTIONS.local, ...STATUS_OPTIONS.crossborder]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: search.trim(), page: 0 });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p className="muted">Local (phone-to-phone mobile money) and Go Global (cross-border via Bitnob) transfers. Click a row for details.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={kind === t.key}
            className={`tab ${kind === t.key ? 'tab-active' : ''}`}
            onClick={() => update({ kind: t.key, status: t.key && status && !STATUS_OPTIONS[t.key].includes(status) ? '' : status, page: 0 })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="filters" onSubmit={submit}>
        <input
          className="search"
          type="search"
          placeholder="Sender/recipient name or phone, or payment reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search transactions"
        />
        <select value={status} onChange={(e) => update({ status: e.target.value, page: 0 })} aria-label="Status">
          <option value="">Any status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <button className="btn btn-primary">Search</button>
        {(q || status) && (
          <button type="button" className="btn btn-ghost" onClick={() => update({ q: '', status: '', page: 0 })}>
            Clear
          </button>
        )}
      </form>

      {status === 'delivery_failed' && (
        <Alert tone="info">
          These were paid but never delivered. Open each one to <strong>retry delivery</strong> or <strong>refund the sender</strong>.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <section className="card card-flush">
        {loading && !data ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <Empty title="No transactions match" hint={q || status ? 'Try clearing the filters.' : undefined} />
        ) : (
          <TransactionTable items={data.items} onOpen={setOpen} />
        )}
        {data && <Pager page={page} hasMore={data.has_more} count={data.items.length} onPage={(p) => update({ page: p })} />}
      </section>

      {open && <TransactionDetail tx={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
