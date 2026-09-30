import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { compactGhs, ghs, TIER_LABEL } from '../format';
import type { AdminDashboard, DailyVolume, KycTier } from '../types';
import { Alert, Spinner, Stat } from '../ui';

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

function VolumeChart({ days }: { days: DailyVolume[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const values = days.map((d) => parseFloat(d.local_ghs) + parseFloat(d.crossborder_ghs));
  const rawMax = Math.max(...values, 0);
  // Round the axis up to a tidy number so gridlines land on readable values.
  const step = rawMax > 0 ? Math.pow(10, Math.floor(Math.log10(rawMax))) : 100;
  const max = rawMax > 0 ? Math.ceil(rawMax / step) * step : 100;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bw = iw / days.length;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Transfer volume per day, last 14 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {compactGhs(t).replace('GHS ', '')}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const local = parseFloat(d.local_ghs);
          const xb = parseFloat(d.crossborder_ghs);
          const x = pad.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              {local > 0 && <rect x={x} y={y(local)} width={w} height={ih + pad.t - y(local)} className="bar-local" rx={2} />}
              {xb > 0 && <rect x={x} y={y(local + xb)} width={w} height={y(local) - y(local + xb)} className="bar-xb" rx={2} />}
              {/* Every other day, counted back from today so the latest day is always labelled. */}
              {((days.length - 1 - i) % 2 === 0 || days.length <= 7) && (
                <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="axis">
                  {new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-foot">
        <div className="legend">
          <span><i className="swatch swatch-local" /> Local</span>
          <span><i className="swatch swatch-xb" /> Go Global</span>
        </div>
        <div className="chart-readout" aria-live="polite">
          {h ? (
            <>
              <strong>{new Date(h.day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</strong>
              {' · '}Local {ghs(h.local_ghs)} ({h.local_count}) · Go Global {ghs(h.crossborder_ghs)} ({h.crossborder_count})
            </>
          ) : (
            <span className="muted">Hover a day for details</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api<AdminDashboard>('/admin/dashboard'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Spinner label="Loading dashboard…" />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Paid transfers only. Unpaid checkouts and refunds are left out. Last 30 days unless noted.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {data && (
        <>
          {data.stuck_transaction_count - data.stuck_card_count > 0 && (
            <div className="attention">
              <div>
                <strong>{plural(data.stuck_transaction_count - data.stuck_card_count, 'Go Global transfer')} failed to deliver.</strong>{' '}
                The sender was charged but the money didn't arrive. Each one needs a retry or a refund.
              </div>
              <Link className="btn btn-danger btn-sm" to="/transactions?status=delivery_failed">
                Review
              </Link>
            </div>
          )}
          {data.stuck_card_count > 0 && (
            <div className="attention">
              <div>
                <strong>
                  {plural(data.stuck_card_count, 'paid card')} {data.stuck_card_count === 1 ? "wasn't" : "weren't"} created.
                </strong>{' '}
                The customer was charged but has no card. Each one needs a retry or a refund.
              </div>
              <Link className="btn btn-danger btn-sm" to="/cards">
                Review
              </Link>
            </div>
          )}
          <div className="stats">
            <Stat label="Local transfers" value={compactGhs(data.local_volume_30d)} sub={plural(data.local_count_30d, 'transfer')} />
            <Stat label="Go Global" value={compactGhs(data.crossborder_volume_30d)} sub={plural(data.crossborder_count_30d, 'transfer')} />
            <Stat label="Fees earned" value={ghs(data.fees_30d)} sub="Transfers + vault withdrawals" />
            <Stat label="In delivery now" value={data.in_flight_count} sub="Paid, payout in progress" />
          </div>

          <div className="grid-2">
            <section className="card">
              <h2>Volume, last 14 days</h2>
              <VolumeChart days={data.daily} />
            </section>
            <section className="card">
              <h2>Users</h2>
              <div className="user-stats">
                <div>
                  <div className="big">{data.total_users.toLocaleString()}</div>
                  <div className="muted">total · +{data.new_users_7d} this week</div>
                </div>
                {data.suspended_users > 0 && (
                  <Link to="/users?status=suspended" className="pill pill-bad">
                    {data.suspended_users} suspended
                  </Link>
                )}
              </div>
              <h3 className="subhead">By verification tier</h3>
              <div className="tiers">
                {(Object.keys(TIER_LABEL) as KycTier[]).map((t) => {
                  const n = data.users_by_tier[t] ?? 0;
                  const pct = data.total_users ? (n / data.total_users) * 100 : 0;
                  return (
                    <Link key={t} to={`/users?kyc_tier=${t}`} className="tier-row">
                      <span className="tier-name">{TIER_LABEL[t]}</span>
                      <span className="tier-bar">
                        <span className={`tier-fill tier-${t}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="tier-n">{n}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
