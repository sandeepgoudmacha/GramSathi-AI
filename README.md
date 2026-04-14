# 🌱 GramSathi AI — Production-Ready Rural Empowerment Platform

> Full-stack, real-time AI platform for rural Self-Help Groups (SHGs) — 100% working, every button functional.

---

## ⚡ Quick Start

### Mac / Linux
```bash
chmod +x start.sh && ./start.sh
```

### Windows
```
Double-click start.bat
```

### Manual
```bash
# Terminal 1 — Backend
cd backend && npm install && cp .env.example .env && npm start

# Terminal 2 — Frontend
cd frontend && npm install --legacy-peer-deps && npm run dev
```

Open **http://localhost:5173**

---

## 🔐 Demo Accounts

| Role | Phone | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | 9000000000 | Admin@123 | Full platform |
| **SHG Member** | 9111111111 | Member@123 | All member features |
| **Coordinator** | 9222222222 | Coord@123 | Group management |
| **Bank Officer** | 9333333333 | Bank@123 | Loan approvals |

> More demo members: 9444444444, 9555555555, 9666666666, 9777777777 (all: Member@123)

---

## 👥 Roles

- **SHG Member:** Can manage savings and apply for loans.
- **Coordinator:** Reviews and verifies loan applications.
- **Bank Officer:** Approves or rejects loans.
- **Admin:** Monitors system-level financial analytics and manages platform users.


## 🤖 AI Setup (Optional — Works Without Keys)

The platform has a smart fallback system and works offline. For full Groq AI:

1. Get free API key at [console.groq.com](https://console.groq.com)
2. Open `backend/.env`
3. Set: `GROQ_API_KEY=gsk_your_key_here`
4. Restart backend

---

## ✅ All Working Features

### 🔐 Authentication
- Register new SHG member account (3-step form)
- Login with phone + password
- JWT access + refresh tokens
- Role-based route protection
- Demo quick-login buttons
- Profile edit page

### 📊 Member Dashboard (Real-Time)
- Live savings balance from database
- AI credit score with breakdown bars
- Active loan timeline with current status
- Unread notification count
- Savings growth area chart
- My products list

### 💰 Financial Module
- Complete savings transaction history with chart
- Loan application with AI credit scoring
- Repayment schedule (reducing balance EMI)
- **Mark EMI payments as paid** (coordinator)
- Credit score gauge with breakdown

### 📋 Government Schemes
- 10 real government schemes (MUDRA, PMJDY, NRLM, PMAY, etc.)
- Search + category filter
- **One-click scheme application** (prevents duplicate)
- My applications tab with status tracking
- AI eligibility scoring per scheme
- External links to official portals

### 🎓 Skills & Training
- Add skills from 21 skill options (grouped by category)
- Set proficiency level and years of experience
- **Remove skills**
- **Enroll in training programs** (real DB + seat tracking)
- Enrollment notifications sent automatically
- 6 real training programs seeded

### 💼 Livelihood AI Planner
- 8 livelihood opportunities
- Match score based on actual user skills
- Clickable cards → detail modal
- Links to loan application and training
- "Add skills for better matching" prompt

### 🏥 Health Guidance
- 6 topic quick-select buttons
- Real AI health responses (Groq → Gemini → fallback)
- Query history per user (clickable to revisit)
- Nearby health facilities list

### 🛒 Marketplace
- Browse/search/filter products (4 categories)
- **Add to cart with quantity controls** (+/−)
- **Place orders** with buyer details form
- **Seller views their orders** in real-time
- **Confirm → Ship → Deliver workflow** (each step sends notification)
- **Cancel orders**
- **List new products** (AI description generated)
- **Deactivate/activate own products**
- Real stock management (decrements on order)

### 💬 AI Assistant (Floating Chat)
- Loads conversation history from DB on open
- Groq LLaMA 3 → Gemini fallback → rule-based
- Quick chip prompts
- Saves all conversations to database

### 👥 Coordinator Dashboard
- Members list with credit scores, occupations
- **Record savings deposits/withdrawals** (sends member notification)
- **Forward pending loans to Bank Officer** (sends notifications both ways)
- **Create training programs** (notifies all members)
- Recent transactions view
- Training programs management

### 🏦 Bank Officer Dashboard
- All loan applications with AI scores
- Risk classification (Low/Medium/High)
- **Approve loans** with optional interest rate override
- **Reject loans** with reason (member notified)
- Full audit trail
- Real-time refetch every 30 seconds

### ⚙️ Admin Dashboard
- Platform-wide stats (live from DB)
- **Change any user's role** (live select box)
- **Activate/deactivate users**
- All loans view
- Complete audit log with timestamps
- ML model status display
- Users by role bar chart

### 🔔 Real-Time Notifications
- WebSocket connection (auto-reconnects on disconnect)
- **Bell icon** with unread count badge
- **Click notification → mark as read**
- **Mark all read** button
- Notification dropdown with timestamp
- Events: loan applied/forwarded/approved/rejected, savings recorded, order placed/shipped/delivered, training enrollment, scheme application, role change, welcome message

---

## 🏗️ Architecture

```
gramsathi/
├── backend/                    # Node.js + Express + SQLite
│   ├── server.js               # Entry point + middleware
│   ├── db/database.js          # Complete schema + seed data
│   ├── middleware/auth.js      # JWT + RBAC
│   ├── routes/api.js           # All 50+ API endpoints
│   └── services/
│       ├── aiService.js        # Groq + Gemini + fallback
│       ├── mlService.js        # Credit scoring + livelihood AI
│       └── wsService.js        # WebSocket real-time
│
└── frontend/                   # React 18 + Vite + TailwindCSS
    └── src/
        ├── App.tsx             # Router + React Query
        ├── pages/
        │   ├── Public.tsx      # Landing, Login, Register
        │   ├── Core.tsx        # Dashboard, Financial, Schemes, Skills, Livelihood
        │   └── Management.tsx  # Health, Marketplace, Coordinator, Bank, Admin, Profile
        ├── components/
        │   ├── AIAssistant.tsx # Floating AI chat
        │   ├── layout/         # Sidebar + Topbar (real-time notifications)
        │   └── ui/             # Reusable components
        ├── services/api.ts     # Complete Axios client (all endpoints)
        └── store/index.ts      # Zustand + WebSocket stores
```

---

## 📡 Key API Endpoints

```
POST /auth/register    POST /auth/login
GET  /dashboard/member GET  /dashboard/coordinator
GET  /dashboard/bank   GET  /dashboard/admin
GET  /savings          POST /savings
POST /loans/apply      GET  /loans/my
GET  /loans            POST /loans/:id/review
POST /loans/:id/repayment
GET  /credit-score
GET  /skills           POST /skills/my
GET  /training         POST /training/enroll/:id
GET  /schemes          POST /schemes/apply
GET  /schemes/my-applications
GET  /marketplace/products   POST /marketplace/products
POST /marketplace/orders     PUT  /marketplace/orders/:id/status
POST /ai/chat          POST /ai/health
GET  /ai/livelihoods
GET  /notifications    PUT  /notifications/read-all
GET  /users/all        PUT  /users/:id/role
WS   /ws?token=<jwt>
```

---

## 🗄️ Database

SQLite (`backend/gramsathi.db`) auto-created on first run with all tables and seed data.

**Tables:** users, member_profiles, shg_groups, loans, repayments, savings, skills, member_skills, training_programs, training_enrollments, government_schemes, scheme_applications, health_queries, products, orders, order_items, notifications, audit_logs, ai_conversations, shg_meetings, meeting_attendance

To reset DB: `rm backend/gramsathi.db` and restart backend.

---

*GramSathi AI v2.0 · Node.js + React + SQLite · No Docker Required*
