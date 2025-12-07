import { storage } from "./storage";
import { hashPassword } from "./auth";

/**
 * Initialize Admin User
 * Creates the default admin account with specified credentials
 */
async function initializeAdmin() {
  const ADMIN_EMAIL = "malikrashidk55@gmail.com";
  const ADMIN_PASSWORD = "TTAdmin@231!";
  const ADMIN_NAME = "Admin";

  console.log("🔧 Initializing admin user...");

  try {
    // Check if admin already exists
    const existingUser = await storage.getUserByEmail(ADMIN_EMAIL);
    if (existingUser) {
      console.log("✅ Admin user already exists");
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Plan: ${existingUser.plan}`);
      console.log(`   Is Admin: ${existingUser.isAdmin}`);
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

    console.log("✅ Admin user created successfully!");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log(`   Plan: premium`);
    console.log(`   Tools Limit: Unlimited`);
    console.log("");
    console.log("⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Failed to initialize admin user:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  initializeAdmin()
    .then(() => {
      console.log("✅ Admin initialization complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export { initializeAdmin };
