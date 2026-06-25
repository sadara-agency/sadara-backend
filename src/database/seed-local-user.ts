/**
 * One-off local dev script — seeds mkaawaja5000@gmail.com as Admin.
 * Run: npx ts-node -r tsconfig-paths/register src/database/seed-local-user.ts
 * Delete this file after use or keep for local convenience.
 */
import bcrypt from "bcryptjs";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { User } from "@modules/users/user.model";

async function run() {
  await sequelize.authenticate();

  const hash = await bcrypt.hash("Sadara2025!", env.bcrypt.saltRounds);

  const [user, created] = await User.findOrCreate({
    where: { email: "mkaawaja5000@gmail.com" },
    defaults: {
      email: "mkaawaja5000@gmail.com",
      passwordHash: hash,
      fullName: "Mohammed Kaawaja",
      fullNameAr: "محمد كعوجة",
      role: "Admin",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  if (created) {
    console.log("✅ User created:", user.id);
  } else {
    // Update password and ensure active + admin
    await user.update({
      passwordHash: hash,
      role: "Admin",
      isActive: true,
      emailVerifiedAt: new Date(),
    });
    console.log(
      "✅ User already existed — password reset + ensured Admin:",
      user.id,
    );
  }

  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
