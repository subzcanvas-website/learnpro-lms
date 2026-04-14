# 🚀 LearnPro LMS — Production Deployment Guide

---

## Option A — Railway (Backend) + Vercel (Frontend) ← Recommended

### 1. Database — Railway PostgreSQL

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create project
railway init learnpro

# Add PostgreSQL plugin
railway add postgresql

# Copy the DATABASE_URL from Railway dashboard
# Format: postgresql://user:pass@host:port/dbname
```

Run schema + seed:
```bash
railway run --service learnpro-api psql $DATABASE_URL -f backend/schema.sql
railway run --service learnpro-api node backend/seed.js
```

### 2. Backend — Railway

```bash
cd backend
railway link   # select your project
railway up     # deploys automatically

# Set environment variables in Railway dashboard:
DATABASE_URL        = (auto-set from PostgreSQL plugin)
JWT_SECRET          = (run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET  = (different 64-char hex)
MOCK_OTP            = false
FRONTEND_URL        = https://your-vercel-app.vercel.app
RAZORPAY_KEY_ID     = rzp_live_xxxx
RAZORPAY_KEY_SECRET = xxxx
NODE_ENV            = production
```

Railway auto-detects Node.js and uses `railway.json` for config.

### 3. Frontend — Vercel

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod

# When prompted:
# - Link to existing project? No
# - Project name: learnpro-frontend
# - Root directory: ./  (you're already in frontend/)
# - Override build settings? No
```

Set these in Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL      = https://your-railway-backend.railway.app/api
NEXT_PUBLIC_RAZORPAY_KEY = rzp_live_xxxx
```

---

## Option B — Render (both frontend + backend)

The `render.yaml` at the project root handles everything:

```bash
# Push to GitHub, then:
# 1. Go to render.com → New → Blueprint
# 2. Connect your repo
# 3. Render reads render.yaml and deploys everything
# 4. Set secrets (JWT_SECRET, RAZORPAY keys) in Render dashboard
```

---

## Option C — Docker + VPS (AWS EC2, DigitalOcean, Hetzner)

```bash
# On your server:
git clone your-repo
cd lms-platform

# Edit docker-compose.yml — set real values:
# - JWT_SECRET
# - RAZORPAY keys
# - FRONTEND_URL

docker-compose up -d

# Run migrations
docker exec lms_api psql $DATABASE_URL -f /app/schema.sql
docker exec lms_api node seed.js

# Setup Nginx reverse proxy (see nginx.conf below)
```

---

## Nginx Config (VPS deployments)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   Host $host;
        proxy_read_timeout 60s;
    }
}
```

Install SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables Checklist

### Backend (required for production)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `JWT_SECRET` | ✅ | 64-char random hex |
| `JWT_REFRESH_SECRET` | ✅ | Different 64-char random hex |
| `FRONTEND_URL` | ✅ | Your frontend domain |
| `NODE_ENV` | ✅ | `production` |
| `RAZORPAY_KEY_ID` | ✅ for payments | `rzp_live_xxx` |
| `RAZORPAY_KEY_SECRET` | ✅ for payments | From Razorpay dashboard |
| `MOCK_OTP` | ❌ | Set `false` in production |
| `PORT` | ❌ | Defaults to 5000 |

### Frontend (required)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Your backend URL + `/api` |
| `NEXT_PUBLIC_RAZORPAY_KEY` | ✅ for payments | `rzp_live_xxx` |

---

## Post-Deploy Checklist

```bash
# 1. Health check
curl https://your-backend.railway.app/health

# 2. Create super admin
psql $DATABASE_URL << 'SQL'
-- Insert super admin (change email/password)
INSERT INTO organizations (name, slug) VALUES ('Your Company', 'your-company');
INSERT INTO users (org_id, name, email, password_hash, role_id)
VALUES (
  (SELECT id FROM organizations WHERE slug='your-company'),
  'Admin',
  'admin@yourcompany.com',
  -- bcrypt hash of 'ChangeMe123!' — change immediately after login
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKxcSzVQjqK5y2e',
  '00000000-0000-0000-0000-000000000002'
);
SQL

# 3. Test login
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"ChangeMe123!"}'

# 4. Verify frontend loads
open https://your-frontend.vercel.app
```

---

## GitHub Secrets Required for CI/CD

Go to GitHub → Repo → Settings → Secrets → Actions:

```
RAILWAY_TOKEN        ← from railway.app/account/tokens
VERCEL_TOKEN         ← from vercel.com/account/tokens
VERCEL_ORG_ID        ← from vercel.com/account → Settings
VERCEL_PROJECT_ID    ← from Vercel project → Settings
```

---

## Scaling Notes

- **Database**: Add `PgBouncer` connection pooling for >100 concurrent users
- **Backend**: Railway/Render auto-scale handles bursts; for 1000+ RPS use multiple instances
- **File uploads**: Add AWS S3 — `npm install @aws-sdk/client-s3 multer-s3`
- **Email**: Add `nodemailer` with SES or SendGrid for notifications
- **Real SMS OTP**: Add Twilio — `npm install twilio`
