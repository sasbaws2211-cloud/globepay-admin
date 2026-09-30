# GlobePay Admin console

A separate web app for GlobePay staff: **Users & KYC** and **Transactions**
(local + Go Global), plus a dashboard and the admin audit log. It talks to the
same backend as the customer app, through the `/admin/*` routes, which reject
anyone without `is_admin`.

## Run locally

```bash
npm install
cp .env.example .env      # set VITE_API_URL to your backend
npm run dev               # http://localhost:3002
```

Sign in with a GlobePay phone number and password. The account must be an admin:

```bash
python -m scripts.promote_admin +233XXXXXXXXX     # run inside backend/
```

## What admins can do

| Screen | Actions |
|---|---|
| Dashboard | 30-day volume (local / Go Global), fees, users by tier, 14-day chart, alert when paid transfers failed to deliver |
| Users & KYC | Search by name/phone/email, filter by tier/status, view profile + limit usage, **change verification tier** (reason required, audited), **suspend / reactivate** (audited) |
| Transactions | All local + Go Global transfers, filter by type/status, search by person or payment reference. Detail panel: **check status now** (asks Paystack/Bitnob), **retry delivery** / **refund sender** for Go Global transfers that were paid but not delivered |
| Stuck cards | Virtual cards paid for but never created by Bitnob: **retry** (up to 3 times) or **refund** the full charge; refunds still waiting on Paystack listed below |
| Audit log | Every admin action with who, when and why |

Guard rails (enforced by the backend, not just the UI): an admin can't change
their own tier or suspend themselves.

## Deploy (e.g. Render static site)

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Env var: `VITE_API_URL=https://<your-backend>` (read at **build** time)
- Add a rewrite `/* → /index.html` so deep links like `/users/<id>` work.

The backend currently allows all CORS origins. Once the admin URL is fixed,
consider restricting `allow_origins` in `backend/src/main.py`.
