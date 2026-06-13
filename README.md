# Mini ERP - Developer Guide

Welcome to the **Mini ERP** codebase! This system is a production-grade Demand-to-Delivery ERP tailored for furniture manufacturing. It is built around an **inventory-first design** where every business action produces stock ledger events.

---

## 🚀 Tech Stack

* **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Zustand (Global state), React Query (Server state).
* **Backend**: Node.js, Express, TypeScript, Prisma ORM v7, PostgreSQL.

---

## 👥 Team Work Division

We have divided the team into two streams of 2 developers (1 Frontend + 1 Backend) to prevent blockers and minimize merge conflicts.

```
                  ┌────────────────────────────────────────┐
                  │              STREAM A                  │
                  │   Demand, Products & Foundations      │
                  │   Backend (B1)  <───>  Frontend (F1)   │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │              STREAM B                  │
                  │   Supply, Manufacturing & Automation  │
                  │   Backend (B2)  <───>  Frontend (F2)   │
                  └────────────────────────────────────────┘
```

### Stream A: Foundations & Demand
* **Developer B1 (Backend)**:
  * Authentication, JWT sessions, and RBAC middlewares (`/api/auth`).
  * Product catalog CRUD (`/api/products`).
  * Sales Orders (`/api/sales`).
  * Inventory Reservations & Deliveries.
* **Developer F1 (Frontend)**:
  * Global Layout UI (Sidebar, Navbar shell).
  * Auth pages & Session storage (Zustand state integration).
  * Product catalog lists, forms, and BoM editing screens.
  * Sales Orders Dashboard (Drafting, confirmation, delivery action workflows).

### Stream B: Supply & Production
* **Developer B2 (Backend)**:
  * Purchase Orders & Incoming Goods Receiving (`/api/purchase`).
  * Bill of Materials (BoMs) configuration.
  * Manufacturing Orders (MO start component consumption & MO finish production).
  * Procurement MTO/MTS automated engine (`/api/procurement/run`).
  * Audit logs logging middleware & Dashboard stats.
* **Developer F2 (Frontend)**:
  * Inventory levels Grid (On Hand, Reserved, Free quantities) & Stock Ledger logs view.
  * Purchase Orders Dashboard (Drafting, confirming, receiving goods).
  * Manufacturing console (Viewing checklist, starting MOs, completing MOs).
  * Admin / Business Dashboard charts & Audit trail lookup UI.

---

## 🛠️ Step-by-Step Developer Setup

### Step 1: Clone & Configure Database
1. Make sure you have **PostgreSQL** running locally on port `5432`.
2. Configure your database credentials in the backend environment file:
   * Copy the values from [backend/.env](file:///Users/akhilnair/misc/odoo-mini-erp/backend/.env) (e.g. `DATABASE_URL`).
3. Set up the database tables and generate your Prisma Client types:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```

### Step 2: Running the Apps Locally

#### Run Backend Dev Server (Port 5001)
```bash
cd backend
npm run dev
```

#### Run Frontend Dev Server (Port 3000)
```bash
cd frontend
npm run dev
```

---

## 📝 Coding Standards & Patterns

### 1. Backend: Modular Domain Architecture
Do **NOT** use standard MVC folders. Put all logic inside specific domain directories under `backend/src/modules/`:
```
backend/src/modules/<module_name>/
├── <module_name>.controller.ts   # Express request/response handles
├── <module_name>.service.ts      # Domain Business logic
├── <module_name>.repository.ts   # Prisma database queries
├── <module_name>.routes.ts       # Express router definitions
└── <module_name>.types.ts        # TypeScript definitions
```

### 2. Frontend: Feature-Based Architecture
Group components, hooks, services, and types by feature under `frontend/features/`:
```
frontend/features/<feature_name>/
├── components/                  # Feature specific UI components
├── hooks/                       # Feature specific queries/mutations
├── services/                    # API request functions
├── store/                       # Zustand store (if feature-specific)
└── types/                       # Feature specific TypeScript types
```

### 3. Prisma 7 Core Guidelines
We are running **Prisma v7**. Note these differences:
* Do **NOT** put `url` in `schema.prisma`. It is managed inside `prisma.config.ts`.
* At runtime, `PrismaClient` uses a **driver adapter** (`@prisma/adapter-pg` + `pg` connection pool) inside [prisma.ts](file:///Users/akhilnair/misc/odoo-mini-erp/backend/src/config/prisma.ts) for execution compatibility. Do not bypass the pool wrapper.

---

## 🤝 Collaboration Guidelines

1. **Mock Endpoints**: Frontend devs should use [API_DESIGN.md](file:///Users/akhilnair/misc/odoo-mini-erp/API_DESIGN.md) to mock all React Query hooks. You can build out all UI interactions before the backend endpoints are completed.
2. **Git Branching**:
   * Create branches off `main` for your features: `git checkout -b feat/sales-order-ui`.
   * Create small, frequent Pull Requests.
3. **Database Changes**: If you need to make changes to the database structure, coordinate with the DB lead to modify [schema.prisma](file:///Users/akhilnair/misc/odoo-mini-erp/backend/prisma/schema.prisma) and generate migrations.
