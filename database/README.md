# ⚡ Sadara Database Schema

## Overview

PostgreSQL 16 database with **39 tables** across **7 domains**, covering the complete Sadara sports player management platform.

## Quick Start

```bash
# With Docker (recommended)
docker compose up db -d
cd database && chmod +x run-migrations.sh
./run-migrations.sh

# Options
./run-migrations.sh --migrate-only     # Migrations only
./run-migrations.sh --seed-only        # Seed data only
./run-migrations.sh --reset            # Drop & recreate everything
./run-migrations.sh --stats            # Show table stats
```

## Migration Files

| File | Domain | Tables | Description |
|------|--------|--------|-------------|
| `001_extensions_enums_core.sql` | Core | 4 | Extensions, 30+ enums, users, clubs, contacts, players, player_accounts |
| `002_contracts_offers_finance.sql` | Finance | 8 | Contracts, commission_schedules, milestones, offers, invoices, payments, valuations, ledger_entries |
| `003_matches_performance_health.sql` | Performance | 7 | Matches, match_players, performances, injuries, trainings, risk_radars |
| `004_scouting_pipeline.sql` | Scouting | 3 | Watchlists, screening_cases, selection_decisions |
| `005_governance_compliance.sql` | Governance | 9 | Gates, gate_checklists, gate_overrides, guardians, consent_records, committees, quarterly_reviews, trigger_rules, referrals |
| `006_operations_audit.sql` | Operations | 8 | Tasks, documents, tech_reports, idps, idp_goals, share_links, notifications, audit_logs, automation_logs |
| `007_triggers_functions_views.sql` | System | — | Auto-update triggers, audit helper, contract status trigger, invoice/case number generators, 5 useful views |

## Entity Relationship Summary

```
                    ┌──────────┐
                    │  USERS   │──── Authentication & RBAC
                    └────┬─────┘
                         │ manages
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌─────────┐ ┌───────┐ ┌───────┐
         │ PLAYERS │ │ CLUBS │ │ TASKS │
         └────┬────┘ └───┬───┘ └───────┘
              │          │
    ┌─────────┼──────────┼──────────┐
    ▼         ▼          ▼          ▼
┌────────┐┌───────┐┌────────┐┌──────────┐
│CONTRACT││OFFERS ││MATCHES ││INJURIES  │
└───┬────┘└───────┘└───┬────┘└──────────┘
    │                   │
    ▼                   ▼
┌────────┐        ┌───────────┐
│FINANCE │        │PERFORMANCE│
│(Invoice│        │(Stats,    │
│Payment)│        │ Ratings)  │
└────────┘        └───────────┘
```

**Player** is the central hub connecting to 20+ other entities.

## Key Design Decisions

### Immutable Records
- `selection_decisions` — committee votes cannot be modified
- `quarterly_reviews` — review outcomes are permanent
- `audit_logs` — complete action history, no updates/deletes

### Auto-generated Fields
- `invoices.invoice_number` → `INV-YYYYMM-XXXX`
- `screening_cases.case_number` → `SC-YYYYMM-XXXX`
- `contracts.status` → auto-updates based on `end_date`
- All `updated_at` fields → auto-set via triggers

### Views
| View | Purpose |
|------|---------|
| `vw_player_overview` | Player with club, agent, active contracts, injuries, risk |
| `vw_expiring_contracts` | Contracts expiring in next 90 days |
| `vw_overdue_payments` | All overdue or late payments |
| `vw_dashboard_kpis` | Single-row KPI summary for the dashboard |
| `vw_injury_match_conflicts` | Injured players with upcoming matches |

### Access Control
- Mental health referrals have `is_restricted` flag with `restricted_to` user list
- Gate overrides require dual approval
- Youth players require guardian consent records

## Seed Data

The seed includes realistic Saudi Pro League data:
- **5 users** (Admin, 2 Managers, Analyst, Scout)
- **8 clubs** (Al-Hilal, Al-Nassr, Al-Ittihad, Al-Ahli, Al-Shabab, Al-Ettifaq, Al-Fateh, Al-Raed)
- **2 sponsors** (Nike, Adidas)
- **10 players** (7 Pro + 3 Youth) with Arabic names
- **7 contracts** (5 club + 2 sponsorship)
- **3 offers** (Transfer + Loan)
- **5 matches** (2 completed + 3 upcoming)
- **3 injuries**, **5 tasks**, **5 trigger rules**, **3 guardians**, **5 risk radars**

## Currency

Default currency is SAR (Saudi Riyal). All monetary fields use `DECIMAL(15,2)` with a `currency` VARCHAR(3) field supporting SAR, USD, EUR.
