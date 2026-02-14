#!/bin/bash
# ══════════════════════════════════════════════════════════════
# SADARA — Database Migration Runner
# ══════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Git Bash Path Conversion Fix
export MSYS_NO_PATHCONV=1

# Load .env if exists (Optional)
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# ── Updated Defaults to match your Docker Compose ──
DB_HOST=${POSTGRES_HOST:-127.0.0.1}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-SadaraDB}
DB_USER=${POSTGRES_USER:-admin}
DB_PASS=${POSTGRES_PASSWORD:-admin1234}

MIGRATIONS_DIR="$(dirname "$0")/migrations"
SEEDS_DIR="$(dirname "$0")/seeds"

export PGPASSWORD="$DB_PASS"

# We use -w to never prompt for password (since we exported it)
PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -w -v ON_ERROR_STOP=1"

# ── Functions ──

run_migrations() {
    echo -e "${BLUE}⚡ Running migrations...${NC}"
    if [ ! -d "$MIGRATIONS_DIR" ]; then echo -e "${RED}Directory $MIGRATIONS_DIR not found!${NC}"; return; fi
    for file in "$MIGRATIONS_DIR"/*.sql; do
        [ -e "$file" ] || continue
        filename=$(basename "$file")
        echo -e "${YELLOW}  → $filename${NC}"
        $PSQL_CMD -f "$file"
        echo -e "${GREEN}  ✅ $filename completed${NC}"
    done
}

run_seeds() {
    echo -e "${BLUE}🌱 Running seed data...${NC}"
    if [ ! -d "$SEEDS_DIR" ]; then echo -e "${RED}Directory $SEEDS_DIR not found!${NC}"; return; fi
    for file in "$SEEDS_DIR"/*.sql; do
        [ -e "$file" ] || continue
        filename=$(basename "$file")
        echo -e "${YELLOW}  → $filename${NC}"
        $PSQL_CMD -f "$file"
        echo -e "${GREEN}  ✅ $filename completed${NC}"
    done
}

reset_database() {
    echo -e "${RED}⚠️  WARNING: This will DROP and recreate the database '${DB_NAME}'${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Cancelled."
        exit 0
    fi

    echo -e "${YELLOW}Dropping and Recreating database...${NC}"
    # Connect to 'postgres' system db to drop the target db
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -w -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -w -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
    
    run_migrations
    run_seeds
}

check_connection() {
    echo -e "${BLUE}Testing connection to $DB_HOST:$DB_PORT...${NC}"
    if $PSQL_CMD -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected successfully!${NC}"
    else
        echo -e "${RED}❌ Connection Failed!${NC}"
        echo -e "${YELLOW}Troubleshooting Tips:${NC}"
        echo -e "1. Ensure 'postgres_db' is running in Docker."
        echo -e "2. Check if you have 'PostgreSQL' installed locally on Windows."
        echo -e "3. Try running: psql -h 127.0.0.1 -U admin -d SadaraDB"
        exit 1
    fi
}

show_stats() {
    echo -e "${BLUE}📊 Stats:${NC}"
    $PSQL_CMD -c "SELECT count(*) as total_tables FROM pg_tables WHERE schemaname = 'public';"
}

# ── Main ──
case "${1:-all}" in
    --migrate-only) check_connection; run_migrations ;;
    --seed-only)    check_connection; run_seeds ;;
    --reset)        reset_database; show_stats ;;
    all|*)          check_connection; run_migrations; run_seeds; show_stats ;;
esac

echo -e "${GREEN}⚡ Sadara database ready!${NC}"