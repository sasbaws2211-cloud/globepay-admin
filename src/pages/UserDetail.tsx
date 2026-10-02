import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { date, ghs, TIER_LABEL } from '../format';
import type { AdminUserDetail, KycTier } from '../types';
import { Alert, Field, Modal, Spinner } from '../ui';
import { TierBadge, UserStatusBadge } from './Users';

const TIER_HELP: Record<KycTier, string> = {
  unverified: 'GHS 500 a day, GHS 2,000 a month',
  phone_verified: 'GHS 50,000 a day, no monthly limit',
  id_verified: 'No limits',
};

function KycModal({ user, onClose, onSaved }: { user: AdminUserDetail; onClose: () => void; onSaved: (msg: string) => void }) {
  const [tier, setTier] = useState<KycTier>(user.kyc_tier);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${user.id}/kyc-tier`, { method: 'PATCH', json: { kyc_tier: tier, reason: reason.trim() } });
      onSaved(`${user.full_name} is now ${TIER_LABEL[tier]}.`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Change verification tier" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">
          The tier sets {user.full_name}'s transaction limits. The change and your reason are saved in the audit log.
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="tier-options" role="radiogroup" aria-label="Verification tier">
          {(Object.keys(TIER_LABEL) as KycTier[]).map((t) => (
            <label key={t} className={`tier-option ${tier === t ? 'selected' : ''}`}>
              <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} />
              <span>
                <span className="strong">{TIER_LABEL[t]}</span>
                {t === user.kyc_tier && <span className="tag">current</span>}
                <span className="sub">{TIER_HELP[t]}</span>
              </span>
            </label>
          ))}
        </div>
        <Field label="Reason" hint="e.g. “Ghana Card GHA-… checked in person”. At least 3 characters.">
          <textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy || tier === user.kyc_tier || reason.trim().length < 3}>
            {busy ? 'Saving…' : 'Save tier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatusModal({ user, onClose, onSaved }: { user: AdminUserDetail; onClose: () => void; onSaved: (msg: string) => void }) {
  const suspending = user.is_active;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${user.id}/status`, { method: 'PATCH', json: { is_active: !suspending } });
      onSaved(suspending ? `${user.full_name} is suspended.` : `${user.full_name} is active again.`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Modal title={suspending ? 'Suspend this account?' : 'Reactivate this account?'} onClose={onClose}>
      {error && <Alert tone="error">{error}</Alert>}
      <p>
        {suspending
          ? `${user.full_name} will be signed out everywhere and won't be able to sign in, send money or receive transfers until reactivated.`
          : `${user.full_name} will be able to sign in and use GlobePay again.`}
      </p>
      <div className="actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className={`btn ${suspending ? 'btn-danger' : 'btn-primary'}`} onClick={submit} disabled={busy}>
          {busy ? 'Saving…' : suspending ? 'Suspend account' : 'Reactivate account'}
        </button>
      </div>
    </Modal>
  );
}

export default function UserDetail() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'kyc' | 'status' | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setUser(await api<AdminUserDetail>(`/admin/users/${id}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saved = (msg: string) => {
    setModal(null);
    setNotice(msg);
    load();
  };

  if (!user) return error ? <div className="page"><Alert tone="error">{error}</Alert></div> : <Spinner label="Loading user…" />;

  // Also blocked server-side on newer backends; the deployed one doesn't check yet.
  const isSelf = me?.id === user.id;
  const closed = !!user.closed_at;

  return (
    <div className="page">
      <Link to="/users" className="back">
        ← Users
      </Link>
      <div className="page-head">
        <div>
          <h1>
            {user.full_name} {user.is_admin && <span className="tag">admin</span>}
          </h1>
          <div className="row gap-s wrap">
            <span className="mono">{user.phone_number}</span>
            {user.email && <span className="muted">· {user.email}</span>}
            <span className="muted">· joined {date(user.created_at)}</span>
          </div>
        </div>
        <div className="row gap-s wrap">
          <UserStatusBadge u={user} />
          <TierBadge tier={user.kyc_tier} />
        </div>
      </div>

      {notice && <Alert tone="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {isSelf && <Alert tone="info">This is your own account. Another admin has to change its tier or status.</Alert>}
      {closed && <Alert tone="info">The user closed this account themselves on {date(user.closed_at)}. It can't be reopened from here.</Alert>}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Verification</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('kyc')} disabled={isSelf || closed}>
              Change tier
            </button>
          </div>
          <dl className="kvs">
            <div className="kv">
              <dt>Tier</dt>
              <dd>{TIER_LABEL[user.kyc_tier] ?? user.kyc_tier}</dd>
            </div>
            <div className="kv">
              <dt>Limits</dt>
              <dd>{TIER_HELP[user.kyc_tier] ?? '—'}</dd>
            </div>
          </dl>
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Tier changes are listed in the <Link to="/audit">audit log</Link>.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Account</h2>
            {!closed && (
              <button className={`btn btn-sm ${user.is_active ? 'btn-danger-ghost' : 'btn-primary'}`} onClick={() => setModal('status')} disabled={isSelf}>
                {user.is_active ? 'Suspend' : 'Reactivate'}
              </button>
            )}
          </div>
          <dl className="kvs">
            <div className="kv">
              <dt>Vaults</dt>
              <dd>
                {user.vault_count} · {ghs(user.total_vault_balance)} saved
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {modal === 'kyc' && <KycModal user={user} onClose={() => setModal(null)} onSaved={saved} />}
      {modal === 'status' && <StatusModal user={user} onClose={() => setModal(null)} onSaved={saved} />}
    </div>
  );
}
