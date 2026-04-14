# 🎓 LearnPro LMS — Enterprise SaaS Training Platform

A fully featured, production-ready Learning Management System built with Next.js, Node.js, and PostgreSQL.

---

## ✨ Features

| Feature | Status |
|---|---|
| Multi-tenant organizations | ✅ |
| OTP + Email authentication | ✅ |
| Role-based access (5 roles) | ✅ |
| Course builder (modules + lessons) | ✅ |
| YouTube & video lesson player | ✅ |
| Course progress tracking | ✅ |
| Auto-certificate on completion | ✅ |
| Quiz engine with timer + auto-submit | ✅ |
| SOP system with versioning | ✅ |
| Live class scheduling | ✅ |
| Gamification (points, levels, badges, leaderboard) | ✅ |
| KPI & performance dashboard | ✅ |
| CRM / lead management | ✅ |
| Subscription plans + Razorpay integration | ✅ |
| Admin org management | ✅ |
| Certificate PDF download | ✅ |
| Personal profile dashboard | ✅ |

---

## 🚀 Quick Start (3 options)

### Option 1 — Docker (Recommended, zero setup)

```bash
git clone / unzip lms-platform
cd lms-platform

docker-compose up -d
# App: http://localhost:3000
# API: http://localhost:5000
```

Then seed demo data:
```bash
docker exec lms_api node seed.js
```

---

### Option 2 — Manual (Node + Postgres)

**1. Database**
```bash
createdb lms_platform
cd backend
cp .env.example .env          # edit DATABASE_URL etc.
npm run db:setup               # migrate + seed
```

**2. Backend**
```bash
cd backend
npm install
npm run dev                    # http://localhost:5000
```

**3. Frontend**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                    # http://localhost:3000
```

---

## 🔑 Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | admin123 |
| Manager | manager@demo.com | admin123 |
| Trainer | trainer@demo.com | admin123 |
| Staff | priya@demo.com | staff123 |

**OTP login:** any 10-digit number → OTP is always `123456`

---

## 📁 Project Structure

```
lms-platform/
├── docker-compose.yml
├── backend/
│   ├── schema.sql              ← Full DB schema (16 tables)
│   ├── seed.js                 ← Demo data seeder
│   ├── Dockerfile
│   ├── src/
│   │   ├── app.js              ← Express server
│   │   ├── config/db.js
│   │   ├── middleware/
│   │   │   ├── auth.js         ← JWT authentication
│   │   │   └── roles.js        ← Role-based guards
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── courseController.js
│   │   │   ├── quizController.js
│   │   │   ├── userController.js
│   │   │   ├── otherControllers.js    ← Gamification, SOPs, KPI, CRM, Subs
│   │   │   ├── extendedControllers.js ← Live classes, modules, lessons, certs
│   │   │   └── progressController.js  ← Auto-cert on course completion
│   │   └── routes/index.js
│
└── frontend/
    ├── app/
    │   ├── page.tsx              ← Redirect to /dashboard or /login
    │   ├── login/               ← OTP + email login
    │   ├── dashboard/           ← Role-aware dashboard
    │   ├── courses/             ← Course library
    │   ├── courses/[id]/        ← Course player with lesson sidebar
    │   ├── courses/create/      ← Course builder
    │   ├── quiz/                ← Quiz engine with timer
    │   ├── sops/                ← SOP library
    │   ├── sops/[id]/           ← Step-by-step SOP viewer
    │   ├── leaderboard/         ← Gamification leaderboard
    │   ├── kpi/                 ← KPI & performance dashboard
    │   ├── live-classes/        ← Live class scheduling
    │   ├── certificates/        ← Printable certificates
    │   ├── subscription/        ← Plans & Razorpay checkout
    │   ├── crm/                 ← Lead management
    │   ├── admin/               ← User management
    │   ├── admin/orgs/          ← Organization management (super admin)
    │   └── profile/             ← Personal profile
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   ├── DashboardLayout.tsx
    │   ├── Modal.tsx            ← Reusable modal
    │   ├── DataTable.tsx        ← Reusable table
    │   ├── EmptyState.tsx
    │   └── PageLoader.tsx
    └── lib/
        ├── api.ts               ← Full Axios API client
        └── store.ts             ← Zustand auth store
```

---

## 🌐 API Reference

### Auth
```
POST /api/auth/send-otp      → Send OTP (mock: always 123456)
POST /api/auth/verify-otp    → Login with OTP
POST /api/auth/login         → Login with email + password
POST /api/auth/refresh       → Refresh access token
POST /api/auth/logout
```

### Courses & Content
```
GET    /api/courses                    → List courses
GET    /api/courses/:id                → Course detail + modules + progress
POST   /api/courses                    → Create course
PUT    /api/courses/:id                → Update course
POST   /api/courses/:id/enroll         → Enroll user
POST   /api/courses/:id/progress       → Update lesson progress (auto-certs)
POST   /api/modules                    → Create module
POST   /api/lessons                    → Create lesson
```

### Quizzes
```
GET    /api/quizzes                    → List quizzes
GET    /api/quizzes/:id               → Quiz + questions (shuffled if set)
POST   /api/quizzes                   → Create quiz
POST   /api/quizzes/:id/submit        → Submit + auto-grade
GET    /api/quizzes/:id/results       → All attempts
```

### Live Classes
```
GET    /api/live-classes              → List classes
POST   /api/live-classes              → Schedule class
POST   /api/live-classes/:id/attend   → Mark attendance (+20 pts)
```

### Gamification
```
GET    /api/gamification/leaderboard  → Org rankings
GET    /api/gamification/profile      → My points, level, badges
GET    /api/gamification/badges       → All badges
```

### SOPs
```
GET    /api/sops                      → List SOPs
GET    /api/sops/:id                  → SOP detail + version history
POST   /api/sops                      → Create SOP
PUT    /api/sops/:id                  → Update SOP (creates new version)
```

### Certificates
```
GET    /api/certificates              → My certificates
POST   /api/certificates/issue        → Issue certificate (admin)
GET    /api/certificates/verify/:num  → Verify certificate (public)
```

### KPI
```
GET    /api/kpis                      → KPI library
POST   /api/kpis                      → Create KPI
POST   /api/kpis/entries              → Add KPI entry
GET    /api/kpis/scorecard/:userId    → User scorecard
```

### Others
```
GET    /api/plans                     → Subscription plans
POST   /api/subscriptions/order       → Create Razorpay order
POST   /api/subscriptions/verify      → Verify payment
GET    /api/crm/leads                 → List leads
POST   /api/crm/leads                 → Create lead
GET    /api/admin/dashboard           → Admin stats
GET    /api/admin/orgs                → All organizations (super admin)
```

---

## 🔧 Environment Variables

### Backend `.env`
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/lms_platform
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
MOCK_OTP=true
MOCK_OTP_VALUE=123456
FRONTEND_URL=http://localhost:3000
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_xxx
```

---

## 🛣️ Roadmap / Next Steps

| Feature | Effort |
|---|---|
| Real SMS OTP via Twilio | Low |
| Real Razorpay signature verification | Low |
| Email notifications | Medium |
| S3 file uploads for course content | Medium |
| Mobile app (React Native) | High |
| AI-powered quiz generation | Medium |
| White-label custom domains | High |
| Advanced analytics & reporting | Medium |
