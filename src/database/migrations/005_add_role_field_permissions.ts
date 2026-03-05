import { sequelize } from "../../config/database";

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS role_field_permissions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role        VARCHAR(50)  NOT NULL,
      module      VARCHAR(100) NOT NULL,
      field       VARCHAR(100) NOT NULL,
      hidden      BOOLEAN      NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW(),
      CONSTRAINT uq_role_module_field UNIQUE (role, module, field)
    );
  `);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_rfp_role ON role_field_permissions(role)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_rfp_module ON role_field_permissions(module)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_rfp_role_module ON role_field_permissions(role, module)`);

  // Seed data matching current hardcoded rules from fieldAccess.ts
  await sequelize.query(`
    INSERT INTO role_field_permissions (role, module, field, hidden) VALUES
    -- PLAYER_HIDDEN_FIELDS: phone
    ('Scout',     'players', 'phone', true),
    ('Player',    'players', 'phone', true),
    ('Finance',   'players', 'phone', true),
    ('Media',     'players', 'phone', true),
    ('Executive', 'players', 'phone', true),
    -- PLAYER_HIDDEN_FIELDS: email
    ('Scout',     'players', 'email', true),
    ('Player',    'players', 'email', true),
    ('Finance',   'players', 'email', true),
    ('Media',     'players', 'email', true),
    ('Executive', 'players', 'email', true),
    -- PLAYER_HIDDEN_FIELDS: guardianPhone
    ('Scout',     'players', 'guardianPhone', true),
    ('Player',    'players', 'guardianPhone', true),
    ('Finance',   'players', 'guardianPhone', true),
    ('Media',     'players', 'guardianPhone', true),
    ('Executive', 'players', 'guardianPhone', true),
    -- PLAYER_HIDDEN_FIELDS: guardianName
    ('Scout',     'players', 'guardianName', true),
    ('Player',    'players', 'guardianName', true),
    ('Finance',   'players', 'guardianName', true),
    ('Media',     'players', 'guardianName', true),
    ('Executive', 'players', 'guardianName', true),
    -- CONTRACT_HIDDEN_FIELDS: baseSalary
    ('Scout',     'contracts', 'baseSalary', true),
    ('Player',    'contracts', 'baseSalary', true),
    ('Analyst',   'contracts', 'baseSalary', true),
    ('Coach',     'contracts', 'baseSalary', true),
    ('Media',     'contracts', 'baseSalary', true),
    ('Executive', 'contracts', 'baseSalary', true),
    -- CONTRACT_HIDDEN_FIELDS: commissionPct
    ('Scout',     'contracts', 'commissionPct', true),
    ('Player',    'contracts', 'commissionPct', true),
    ('Analyst',   'contracts', 'commissionPct', true),
    ('Legal',     'contracts', 'commissionPct', true),
    ('Coach',     'contracts', 'commissionPct', true),
    ('Media',     'contracts', 'commissionPct', true),
    ('Executive', 'contracts', 'commissionPct', true),
    -- CONTRACT_HIDDEN_FIELDS: totalCommission
    ('Scout',     'contracts', 'totalCommission', true),
    ('Player',    'contracts', 'totalCommission', true),
    ('Analyst',   'contracts', 'totalCommission', true),
    ('Legal',     'contracts', 'totalCommission', true),
    ('Coach',     'contracts', 'totalCommission', true),
    ('Media',     'contracts', 'totalCommission', true),
    ('Executive', 'contracts', 'totalCommission', true),
    -- CONTRACT_HIDDEN_FIELDS: signingBonus
    ('Scout',     'contracts', 'signingBonus', true),
    ('Player',    'contracts', 'signingBonus', true),
    ('Analyst',   'contracts', 'signingBonus', true),
    ('Coach',     'contracts', 'signingBonus', true),
    ('Media',     'contracts', 'signingBonus', true),
    ('Executive', 'contracts', 'signingBonus', true),
    -- CONTRACT_HIDDEN_FIELDS: releaseClause
    ('Scout',     'contracts', 'releaseClause', true),
    ('Player',    'contracts', 'releaseClause', true),
    ('Coach',     'contracts', 'releaseClause', true),
    ('Media',     'contracts', 'releaseClause', true),
    -- FINANCE_HIDDEN_FIELDS: amount
    ('Scout',     'finance', 'amount', true),
    ('Player',    'finance', 'amount', true),
    ('Coach',     'finance', 'amount', true),
    ('Media',     'finance', 'amount', true),
    -- FINANCE_HIDDEN_FIELDS: taxAmount
    ('Scout',     'finance', 'taxAmount', true),
    ('Player',    'finance', 'taxAmount', true),
    ('Coach',     'finance', 'taxAmount', true),
    ('Media',     'finance', 'taxAmount', true),
    -- FINANCE_HIDDEN_FIELDS: totalAmount
    ('Scout',     'finance', 'totalAmount', true),
    ('Player',    'finance', 'totalAmount', true),
    ('Coach',     'finance', 'totalAmount', true),
    ('Media',     'finance', 'totalAmount', true)
    ON CONFLICT (role, module, field) DO NOTHING;
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS role_field_permissions CASCADE`);
}
