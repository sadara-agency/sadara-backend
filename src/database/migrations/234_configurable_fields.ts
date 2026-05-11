import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

// Creates the `configurable_fields` lookup table — the admin-managed list of
// which fields per module can be hidden via field-level permissions. Seeded
// from the values that previously lived hardcoded in fieldPermission.config.ts.
// The TS constant is kept as a runtime fallback when this table is empty.

const SEED: ReadonlyArray<[module: string, field: string, label: string]> = [
  ["players", "phone", "Phone"],
  ["players", "email", "Email"],
  ["players", "guardianPhone", "Guardian Phone"],
  ["players", "guardianName", "Guardian Name"],
  ["players", "nationalId", "National ID"],
  ["contracts", "baseSalary", "Base Salary"],
  ["contracts", "commissionPct", "Commission %"],
  ["contracts", "totalCommission", "Total Commission"],
  ["contracts", "signingBonus", "Signing Bonus"],
  ["contracts", "releaseClause", "Release Clause"],
  ["contracts", "agentName", "Agent Name"],
  ["contracts", "agentLicense", "Agent License"],
  ["finance", "amount", "Amount"],
  ["finance", "taxAmount", "Tax Amount"],
  ["finance", "totalAmount", "Total Amount"],
  ["injuries", "diagnosis", "Diagnosis"],
  ["injuries", "treatment", "Treatment"],
  ["injuries", "treatmentPlan", "Treatment Plan"],
  ["injuries", "surgeon", "Surgeon"],
  ["injuries", "surgeonName", "Surgeon Name"],
  ["injuries", "facility", "Facility"],
  ["injuries", "medicalProvider", "Medical Provider"],
  ["injuries", "isSurgeryRequired", "Surgery Required"],
  ["injuries", "surgeryDate", "Surgery Date"],
  ["injuries", "cause", "Cause"],
  ["scouting", "fitAssessment", "Fit Assessment"],
  ["scouting", "riskAssessment", "Risk Assessment"],
  ["scouting", "medicalClearance", "Medical Clearance"],
  ["scouting", "identityCheck", "Identity Check"],
  ["scouting", "voteDetails", "Vote Details"],
  ["scouting", "dissentingOpinion", "Dissenting Opinion"],
  ["offers", "transferFee", "Transfer Fee"],
  ["offers", "salaryOffered", "Salary Offered"],
  ["offers", "agentFee", "Agent Fee"],
  ["offers", "counterOffer", "Counter Offer"],
  ["wellness", "targetCalories", "Target Calories"],
  ["wellness", "targetProteinG", "Target Protein"],
  ["wellness", "targetFatG", "Target Fat"],
  ["wellness", "targetCarbsG", "Target Carbs"],
  ["wellness", "bodyFatPct", "Body Fat %"],
  ["wellness", "notes", "Notes"],
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "configurable_fields"))) {
    await queryInterface.createTable("configurable_fields", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      module: { type: DataTypes.STRING(100), allowNull: false },
      field: { type: DataTypes.STRING(100), allowNull: false },
      label: { type: DataTypes.STRING(150), allowNull: false },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("configurable_fields", {
      fields: ["module", "field"],
      type: "unique",
      name: "configurable_fields_module_field_uq",
    });
    await queryInterface.addIndex("configurable_fields", ["module"]);
  }

  // Seed (idempotent) — sort_order is the per-module position in SEED.
  const counters: Record<string, number> = {};
  const rows = SEED.map(([module, field, label]) => {
    const sortOrder = counters[module] ?? 0;
    counters[module] = sortOrder + 1;
    return { module, field, label, sortOrder };
  });

  const values = rows
    .map(
      (_, i) =>
        `(gen_random_uuid(), :module${i}, :field${i}, :label${i}, :sort${i}, NOW(), NOW())`,
    )
    .join(", ");
  const replacements: Record<string, string | number> = {};
  rows.forEach((r, i) => {
    replacements[`module${i}`] = r.module;
    replacements[`field${i}`] = r.field;
    replacements[`label${i}`] = r.label;
    replacements[`sort${i}`] = r.sortOrder;
  });

  await queryInterface.sequelize.query(
    `INSERT INTO configurable_fields (id, module, field, label, sort_order, created_at, updated_at)
     VALUES ${values}
     ON CONFLICT (module, field) DO NOTHING;`,
    { replacements },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("configurable_fields");
}
