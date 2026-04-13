import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // ── Add email verification columns to users ──
  await queryInterface.addColumn("users", "email_verified_at", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });

  await queryInterface.addColumn("users", "email_verification_token", {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  });

  await queryInterface.addColumn("users", "email_verification_token_expiry", {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  });

  // Grandfather all existing users — they pre-date the verification system
  // and were already admin-approved via is_active, so mark them verified
  // as of their created_at timestamp. New users will have NULL until they verify.
  await queryInterface.sequelize.query(
    `UPDATE users
     SET email_verified_at = created_at
     WHERE email_verified_at IS NULL`,
  );

  // Index on the token for fast lookup during verification
  await queryInterface.addIndex("users", ["email_verification_token"], {
    name: "users_email_verification_token_idx",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.removeIndex(
    "users",
    "users_email_verification_token_idx",
  );
  await queryInterface.removeColumn("users", "email_verification_token_expiry");
  await queryInterface.removeColumn("users", "email_verification_token");
  await queryInterface.removeColumn("users", "email_verified_at");
}
