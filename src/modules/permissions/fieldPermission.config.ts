export interface ConfigurableField {
  field: string;
  label: string;
}

/**
 * Fields that can be configured for field-level visibility per role.
 * Keyed by module name matching the permission system's module identifiers.
 */
export const CONFIGURABLE_FIELDS: Record<string, ConfigurableField[]> = {
  players: [
    { field: "phone", label: "Phone" },
    { field: "email", label: "Email" },
    { field: "guardianPhone", label: "Guardian Phone" },
    { field: "guardianName", label: "Guardian Name" },
  ],
  contracts: [
    { field: "baseSalary", label: "Base Salary" },
    { field: "commissionPct", label: "Commission %" },
    { field: "totalCommission", label: "Total Commission" },
    { field: "signingBonus", label: "Signing Bonus" },
    { field: "releaseClause", label: "Release Clause" },
  ],
  finance: [
    { field: "amount", label: "Amount" },
    { field: "taxAmount", label: "Tax Amount" },
    { field: "totalAmount", label: "Total Amount" },
  ],
};
