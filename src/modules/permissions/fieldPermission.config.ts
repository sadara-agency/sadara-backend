export interface ConfigurableFieldDef {
  field: string;
  label: string;
}

/**
 * Fields that can be configured for field-level visibility per role.
 * Keyed by module name matching the permission system's module identifiers.
 *
 * NOTE: this is now the seed source for the `configurable_fields` DB table
 * (migration 234) and the runtime fallback when that table is empty. Day-to-day
 * changes go through the admin API (POST/DELETE /permissions/fields/config),
 * not by editing this file.
 */
export const CONFIGURABLE_FIELDS: Record<string, ConfigurableFieldDef[]> = {
  players: [
    { field: "phone", label: "Phone" },
    { field: "email", label: "Email" },
    { field: "guardianPhone", label: "Guardian Phone" },
    { field: "guardianName", label: "Guardian Name" },
    { field: "nationalId", label: "National ID" },
  ],
  contracts: [
    { field: "baseSalary", label: "Base Salary" },
    { field: "commissionPct", label: "Commission %" },
    { field: "totalCommission", label: "Total Commission" },
    { field: "signingBonus", label: "Signing Bonus" },
    { field: "releaseClause", label: "Release Clause" },
    { field: "agentName", label: "Agent Name" },
    { field: "agentLicense", label: "Agent License" },
  ],
  finance: [
    { field: "amount", label: "Amount" },
    { field: "taxAmount", label: "Tax Amount" },
    { field: "totalAmount", label: "Total Amount" },
  ],
  injuries: [
    { field: "diagnosis", label: "Diagnosis" },
    { field: "treatment", label: "Treatment" },
    { field: "treatmentPlan", label: "Treatment Plan" },
    { field: "surgeon", label: "Surgeon" },
    { field: "surgeonName", label: "Surgeon Name" },
    { field: "facility", label: "Facility" },
    { field: "medicalProvider", label: "Medical Provider" },
    { field: "isSurgeryRequired", label: "Surgery Required" },
    { field: "surgeryDate", label: "Surgery Date" },
    { field: "cause", label: "Cause" },
  ],
  scouting: [
    { field: "fitAssessment", label: "Fit Assessment" },
    { field: "riskAssessment", label: "Risk Assessment" },
    { field: "medicalClearance", label: "Medical Clearance" },
    { field: "identityCheck", label: "Identity Check" },
    { field: "voteDetails", label: "Vote Details" },
    { field: "dissentingOpinion", label: "Dissenting Opinion" },
  ],
  offers: [
    { field: "transferFee", label: "Transfer Fee" },
    { field: "salaryOffered", label: "Salary Offered" },
    { field: "agentFee", label: "Agent Fee" },
    { field: "counterOffer", label: "Counter Offer" },
  ],
  wellness: [
    { field: "targetCalories", label: "Target Calories" },
    { field: "targetProteinG", label: "Target Protein" },
    { field: "targetFatG", label: "Target Fat" },
    { field: "targetCarbsG", label: "Target Carbs" },
    { field: "bodyFatPct", label: "Body Fat %" },
    { field: "notes", label: "Notes" },
  ],
};
