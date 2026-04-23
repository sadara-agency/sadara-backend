import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  // Idempotent: a partially-succeeded previous run may have added some of
  // these columns/indexes already. Check before creating.
  const table = (await queryInterface.describeTable("users")) as Record<
    string,
    unknown
  >;

  if (!table.email_verified_at) {
    await queryInterface.addColumn("users", "email_verified_at", {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.email_verification_token) {
    await queryInterface.addColumn("users", "email_verification_token", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.email_verification_token_expiry) {
    await queryInterface.addColumn("users", "email_verification_token_expiry", {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }

  // Grandfather existing users — they pre-date the verification system
  // and were already admin-approved via is_active, so mark them verified
  // as of their created_at timestamp. New users will have NULL until they verify.
  // The WHERE clause makes this safe to re-run.
  await queryInterface.sequelize.query(
    `UPDATE users
     SET email_verified_at = created_at
     WHERE email_verified_at IS NULL`,
  );

  // Index on the token for fast lookup during verification.
  // Check existence first so reruns don't fail.
  const indexes = (await queryInterface.showIndex("users")) as Array<{
    name: string;
  }>;
  const hasIndex = indexes.some(
    (i) => i.name === "users_email_verification_token_idx",
  );
  if (!hasIndex) {
    await queryInterface.addIndex("users", ["email_verification_token"], {
      name: "users_email_verification_token_idx",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;

  const indexes = (await queryInterface.showIndex("users")) as Array<{
    name: string;
  }>;
  if (indexes.some((i) => i.name === "users_email_verification_token_idx")) {
    await queryInterface.removeIndex(
      "users",
      "users_email_verification_token_idx",
    );
  }

  const table = (await queryInterface.describeTable("users")) as Record<
    string,
    unknown
  >;
  if (table.email_verification_token_expiry) {
    await queryInterface.removeColumn(
      "users",
      "email_verification_token_expiry",
    );
  }
  if (table.email_verification_token) {
    await queryInterface.removeColumn("users", "email_verification_token");
  }
  if (table.email_verified_at) {
    await queryInterface.removeColumn("users", "email_verified_at");
  }
}
