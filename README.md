# CRM Pro v2 — MERN + Vite

Organization-isolated CRM with role-based access, call tracking, and reports.

---

## 🗂 Project Structure

```
crm-v2/
├── backend/
│   ├── config/db.js
│   ├── models/
│   │   ├── Organization.js   ← Institution/org model
│   │   ├── User.js           ← Users with org + role
│   │   ├── Lead.js           ← Leads with C1/C2/Final calls
│   │   └── Activity.js       ← Audit log
│   ├── middleware/auth.js     ← JWT + role guards
│   ├── controllers/
│   │   ├── authController.js
│   │   └── leadController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── leadRoutes.js
│   └── server.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── context/AuthContext.jsx
        ├── components/layout/Layout.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx    ← Register with org/institution name
            ├── DashboardPage.jsx   ← Stats + charts + period selector
            ├── LeadsPage.jsx       ← C1/C2(optional)/Final call flow
            ├── ReportsPage.jsx     ← Week/Quarter/Half/Year + image download
            └── UsersPage.jsx       ← Org owner adds team members
```

---

## ⚡ Setup

### Prerequisites
- Node.js v18+
- MongoDB (local) or Atlas URI

### Step 1 — Install
```bash
# Install root concurrently
npm install

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### Step 2 — Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/crm_v2
#   JWT_SECRET=your_long_secret_here
```

### Step 3 — Run Both Servers
```bash
# From root (runs both concurrently):
npm run dev

# OR separately:
# Terminal 1:
cd backend && npm run dev    # → http://localhost:5000

# Terminal 2:
cd frontend && npm run dev   # → http://localhost:3000
```

---

## 🏢 Registration Flow

### First time (System Admin)
1. Go to `http://localhost:3000/register`
2. First registration → auto **super_admin**

### Organization Owner
1. Go to `/register`
2. Fill **Institution / Organization Name** (required)
3. Role → **org_owner** automatically
4. Gets their own isolated data space

### Adding Team Members (by org_owner, sub_business_owner, or sub_admin)
1. Go to **Team** page in sidebar
2. Click **Add Member**
3. Assign role: C1 / C2 / Final / Ops Lead / Ops Manager / Sub Business Owner

---

## 🔐 Role Hierarchy

| Role | Upload | Download | C1 | C2 | Final | Reports | Team |
|------|:------:|:--------:|:--:|:--:|:-----:|:-------:|:----:|
| super_admin        | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| org_owner          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sub_business_owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sub_admin          | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ➕ add C1/C2/Final |
| c1                 | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| c2                 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| final              | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 📞 Call Flow

```
Upload (org_owner)
  ↓
C1 Agent → marks outcome: Interested / Not Interested / Call Back / No Answer
  ↓
[Optional] C2 call enabled by sub_admin/org_owner if needed
  ↓
Final Agent → marks final outcome → Lead becomes Converted or Lost
```

**Outcomes (short codes):**
- `I`  = Interested
- `NI` = Not Interested  
- `CB` = Call Back
- `NA` = No Answer

---

## 📊 Reports

Available periods: **Week / Month / Quarter / Half Year / Year**

Each report shows:
- Upload trend chart (line)
- Status breakdown (horizontal bar)
- C1 outcomes (donut)
- Final outcomes (donut)
- Worker performance table
- Daily upload report table

**Download options:**
- Individual chart → `.png` image
- Full report page → `.png` image
- All lead data → `.xlsx` Excel

---

## 🔒 Security Features

- **Upload data locked** — Name, Email, Address, Contact never editable after upload
- **Copy/paste disabled** — `user-select: none` prevents data copying
- **Screenshot blocked** — `@media print { display:none }`
- **Org isolation** — Each org sees only their own data
- **Role-based API guards** — Every endpoint checked server-side
- **JWT expiry** — Tokens expire after 7 days

---

## 📋 Excel Upload Format

```
| Name     | Address | Email          | Contact    |
|----------|---------|----------------|------------|
| John Doe | Delhi   | john@email.com | 9876543210 |
```

---

## 🌐 API Reference

### Auth
```
POST /api/auth/register       Public / Authenticated
POST /api/auth/login          Public
GET  /api/auth/me             Private
GET  /api/auth/users          org_owner / sub_admin / super_admin
PUT  /api/auth/users/:id      org_owner / super_admin
GET  /api/auth/orgs           super_admin only
```

### Leads
```
GET  /api/leads               All org members
POST /api/leads               org_owner only
PUT  /api/leads/:id           c1/c2/final/sub_admin/org_owner (role-gated fields)
DEL  /api/leads/:id           super_admin only
POST /api/leads/upload        org_owner only
GET  /api/leads/download      org_owner / super_admin
GET  /api/leads/analytics     org members (period=week|month|quarter|half|year)
GET  /api/leads/activities    org members
GET  /api/leads/daily-report  org members
```
