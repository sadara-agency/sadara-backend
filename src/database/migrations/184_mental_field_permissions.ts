import { QueryInterface, QueryTypes } from "sequelize";

async function tableExists(
  queryInterface: QueryInterface,
  table: string,
): Promise<boolean> {
  const [row] = await queryInterface.sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    { type: QueryTypes.SELECT, bind: [table] },
  );
  return row?.exists === true;
}

// Roles that are NOT MentalCoach or Admin — these get the clinical fields hidden
const NON_MENTAL_ROLES = [
  "Manager",
  "Analyst",
  "Scout",
  "Player",
  "Legal",
  "Finance",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "Media",
  "Executive",
  "GoalkeeperCoach",
  "SportingDirector",
];

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "role_field_permissions"))) return;

  const fields = ["clinicalNotes", "clinicalNotesAr", "responses"];

  const rows = NON_MENTAL_ROLES.flatMap((role) =>
    fields.map((field) => `('${role}', 'mental', '${field}', true)`),
  ).join(",\n    ");

  await queryInterface.sequelize.query(`
    INSERT INTO role_field_permissions (role, module, field, hidden) VALUES
    ${rows}
    ON CONFLICT (role, module, field) DO UPDATE SET hidden = true;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "role_field_permissions"))) return;

  await queryInterface.sequelize.query(`
    DELETE FROM role_field_permissions
    WHERE module = 'mental'
      AND field IN ('clinicalNotes', 'clinicalNotesAr', 'responses');
  `);
}
