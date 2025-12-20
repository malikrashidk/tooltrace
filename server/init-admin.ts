import { storage } from "./storage";
import { hashPassword } from "./auth";
import { sql } from "./db";

/**
 * Initialize Admin User
 * Creates the default admin account with specified credentials
 */
async function initializeAdmin() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "malikrashidk55@gmail.com";
  // In production, require ADMIN_PASSWORD env var. In dev, fall back to default.
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? undefined : "TTAdmin@231!");
  const ADMIN_NAME = "Admin";

  if (!ADMIN_PASSWORD) {
    console.warn("⚠️  ADMIN_PASSWORD not set. Skipping admin initialization.");
    return;
  }

  console.log("ðŸ”§ Initializing admin user...");

  try {
    // Check if admin already exists
    const existingUser = await storage.getUserByEmail(ADMIN_EMAIL);
    if (existingUser) {
      // Ensure admin user has correct flags set
      if (!existingUser.isAdmin || existingUser.plan !== "premium") {
        console.log("ðŸ”„ Fixing admin user permissions...");
        await sql`UPDATE users SET is_admin = true, plan = 'premium', updated_at = NOW() WHERE email = ${ADMIN_EMAIL}`;
        console.log("âœ… Admin permissions fixed");
      }
      console.log("âœ… Admin user already exists");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Plan: premium`);
      console.log(`   Is Admin: true`);
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    const admin = await storage.createUser({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
    });

    // Update to admin and premium plan
    await storage.updateUser(admin.id, {
      isAdmin: true,
      plan: "premium",
    });

    // Create premium subscription
    await storage.createSubscription({
      userId: admin.id,
      plan: "premium",
      toolsLimit: "999999", // Unlimited
      status: "active",
    });

    console.log("âœ… Admin user created successfully!");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log(`   Plan: premium`);
    console.log(`   Tools Limit: Unlimited`);
    console.log("");
    console.log("âš ï¸  Please change the password after first login!");
  } catch (error) {
    console.error("âŒ Failed to initialize admin user:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAdmin()
    .then(() => {
      console.log("âœ… Admin initialization complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("âŒ Error:", error);
      process.exit(1);
    });
}

export { initializeAdmin };

