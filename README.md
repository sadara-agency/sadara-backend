<h1 align="center">sadara-backend</h1>

<p align="center">
  <strong>Sadara REST API — Node.js + Express</strong><br/>

</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Node.js-18+-5FA04E?style=flat-square&logo=node.js&logoColor=white" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" /></a>
  <a href="#"><img src="https://img.shields.io/badge/License-Proprietary-11132B?style=flat-square" /></a>
</p>

---

## Overview

The Sadara backend is a RESTful API that powers the Sadara sports player management platform. Built with Node.js, Express, and PostgreSQL, it handles authentication, business logic, automation rules, and data persistence for all platform modules.

## Features

- **Authentication** — JWT-based auth with refresh tokens, 2FA support, and role-based access control
- **Player Management** — CRUD for player profiles, documents, and development plans
- **Contract Engine** — Full contract lifecycle with commission schedules and milestone tracking
- **Finance Module** — Invoicing, payments, ledger entries, and market valuations
- **Scouting Pipeline** — Watchlist, screening cases, selection decisions with committee voting
- **Gate System** — 4-gate governance with checklists, approvals, and override protocols
- **Automation Engine** — 5 built-in rules (post-match, pre-match, contract expiry, payments, injury conflicts)
- **Referral System** — Trigger-based welfare referrals (performance, mental health, medical)
- **Audit Logging** — Immutable audit trail for every system action
- **Notifications** — Real-time WebSocket notifications + email via SMTP

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Node.js](https://nodejs.org) | Runtime environment |
| [Express](https://expressjs.com) | HTTP framework |
| [TypeScript](https://typescriptlang.org) | Type-safe development |
| [PostgreSQL](https://postgresql.org) | Primary database |
| [Sequelize](https://sequelize.org) | ORM with migrations |
| [JSON Web Tokens](https://jwt.io) | Authentication |
| [Zod](https://zod.dev) | Request validation |
| [Winston](https://github.com/winstonjs/winston) | Structured logging |
| [Helmet](https://helmetjs.github.io) | Security headers |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15+
- Redis (optional, for caching & sessions)

### Installation

```bash
# Clone the repository
git clone https://github.com/SadaraHQ/sadara-backend.git
cd sadara-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000`.

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sadara
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@sadara.com
SMTP_PASSWORD=your_smtp_password

# External Integrations
WYSCOUT_API_KEY=
INSTAT_API_KEY=
STATSBOMB_API_KEY=

# File Storage
S3_BUCKET=sadara-documents
S3_REGION=me-south-1
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

## Project Structure

```
sadara-backend/
├── src/
│   ├── config/
│   │   ├── database.ts           # Sequelize configuration
│   │   ├── redis.ts              # Redis client setup
│   │   └── env.ts                # Environment validation (Zod)
│   ├── models/
│   │   ├── Player.ts
│   │   ├── Club.ts
│   │   ├── Contract.ts
│   │   ├── Offer.ts
│   │   ├── Invoice.ts
│   │   ├── CommissionSchedule.ts
│   │   ├── Match.ts
│   │   ├── Gate.ts
│   │   ├── Referral.ts
│   │   ├── Task.ts
│   │   ├── AuditLog.ts
│   │   └── index.ts              # Model associations
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── player.routes.ts
│   │   ├── club.routes.ts
│   │   ├── contract.routes.ts
│   │   ├── offer.routes.ts
│   │   ├── finance.routes.ts
│   │   ├── match.routes.ts
│   │   ├── scouting.routes.ts
│   │   ├── gate.routes.ts
│   │   ├── referral.routes.ts
│   │   ├── task.routes.ts
│   │   ├── document.routes.ts
│   │   ├── audit.routes.ts
│   │   └── settings.routes.ts
│   ├── controllers/              # Route handlers
│   ├── services/                 # Business logic layer
│   ├── middleware/
│   │   ├── auth.ts               # JWT verification
│   │   ├── rbac.ts               # Role-based access control
│   │   ├── validate.ts           # Zod request validation
│   │   ├── audit.ts              # Automatic audit logging
│   │   └── errorHandler.ts       # Global error handler
│   ├── automation/
│   │   ├── engine.ts             # Rule evaluation engine
│   │   ├── rules/
│   │   │   ├── postMatchAnalysis.ts
│   │   │   ├── preMatchPrep.ts
│   │   │   ├── contractExpiry.ts
│   │   │   ├── paymentReminder.ts
│   │   │   └── injuryConflict.ts
│   │   └── scheduler.ts          # Cron-based rule triggers
│   ├── utils/
│   │   ├── logger.ts             # Winston logger config
│   │   ├── pagination.ts
│   │   ├── pdf.ts                # PDF generation (contracts, reports)
│   │   └── email.ts              # SMTP email sender
│   ├── types/                    # TypeScript interfaces & types
│   ├── validators/               # Zod schemas per entity
│   └── index.ts                  # App entry point
├── migrations/                   # Sequelize migrations
├── seeders/                      # Seed data (Saudi clubs, sample players)
├── tests/
│   ├── unit/
│   └── integration/
├── tsconfig.json
├── nodemon.json
├── .eslintrc.js
├── .prettierrc
└── package.json
```

## API Architecture

### Data Model

38 entities across 6 domains:

| Domain | Entities | Key Models |
|--------|----------|------------|
| **Core** | 4 | Player, PlayerAccount, Club, Contact |
| **Finance** | 8 | Contract, Offer, Invoice, CommissionSchedule, Milestone, Payment, Valuation, Ledger |
| **Scouting** | 3 | Watchlist, ScreeningCase, SelectionDecision |
| **Governance** | 10 | Gate, Checklist, Override, Consent, Guardian, Committee, Review, TriggerRule, AuditLog |
| **Performance** | 7 | Match, MatchPlayer, Performance, Injury, Training, RiskRadar, Referral |
| **Operations** | 6 | Task, Document, TechReport, IDP, IDPGoal, ShareLink |

### Role-Based Access Control

| Role | Level | Description |
|------|-------|-------------|
| `admin` | Full | All modules + system settings |
| `manager` | High | Player management, contracts, finance |
| `analyst` | Medium | Performance, scouting, read-only finance |
| `scout` | Medium | Watchlist, screening, scouting reports |
| `player` | Limited | Own profile, IDP, schedule (read-only) |

### API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/forgot-password

GET    /api/players
POST   /api/players
GET    /api/players/:id
PUT    /api/players/:id
DELETE /api/players/:id

GET    /api/clubs
GET    /api/contracts
GET    /api/offers
GET    /api/finance/invoices
GET    /api/finance/ledger
GET    /api/matches
GET    /api/scouting/watchlist
GET    /api/gates
GET    /api/referrals
GET    /api/tasks
GET    /api/documents
GET    /api/audit-log
GET    /api/settings
...
```

Full API documentation available at `/api/docs` (Swagger UI).

## Scripts

```bash
npm run dev          # Start with nodemon + ts-node
npm run build        # Compile TypeScript
npm run start        # Run compiled JS
npm run lint         # ESLint check
npm run format       # Prettier format
npm run db:migrate   # Run pending migrations
npm run db:seed      # Seed database
npm run test         # Run test suite
```

## Automation Engine

The platform includes 5 built-in automation rules:

| Rule | Trigger | Actions | Priority |
|------|---------|---------|----------|
| Post-Match Analysis | Match completed | Create analysis task, notify analyst | High |
| Pre-Match Prep | Match in 2 days | Create logistics tasks, check injuries | Medium |
| Contract Expiry | 30 days before expiry | Create renewal task, notify legal | High |
| Payment Reminder | 7 days before due | Create follow-up task, send notification | Medium |
| Injury-Match Conflict | Injured player + upcoming match | Create health check, critical alert | Critical |

## Contributing

This is a private repository. Please refer to our internal contribution guidelines.

## License

Proprietary — © 2025 Sadara. All rights reserved.

---

<p align="center">
  <em>⚡ Sadara — At the Forefront of Sports Player Management</em>
</p>
