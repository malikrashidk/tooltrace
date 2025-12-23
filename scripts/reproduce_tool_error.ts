
import { storage } from "../server/storage";
import { insertToolSchema } from "../shared/schema";

// Mock the DB if needed or run against the actual DB in dev
// We will try to call the storage method directly first to isolate if it's storage or route logic
// But the error is 500 on POST, so route is involved.
// However, since we can't easily spin up the full express app in this script without more setup,
// we will verify the storage logic first, which is the most likely failure point for 500s (db errors).

async function testCreateTool() {
  console.log("Starting Tool Creation Test...");

  // We need a user ID. Let's try to get one or create a dummy one.
  const users = await storage.getAllUsers();
  let userId;

  if (users.length > 0) {
    userId = users[0].id;
  } else {
    // Create a dummy user
    const user = await storage.createUser({
      name: "Test User",
      email: "test_tool_creation@example.com",
      password: "password123"
    });
    userId = user.id;
  }

  console.log("Using User ID:", userId);

  const toolData = {
    userId,
    name: "Test Tool",
    websiteUrl: "https://example.com",
    isPaid: true,
    billingAmount: "10.00",
    billingCycle: "monthly",
    usageFrequency: "daily",
    categories: ["Productivity"],
    // Optional fields
    notes: "This is a test note",
    logoUrl: "https://example.com/logo.png"
  };

  try {
    const tool = await storage.createTool(toolData);
    console.log("Tool Created Successfully:", tool);
  } catch (error) {
    console.error("Tool Creation Failed:", error);
    process.exit(1);
  }
}

testCreateTool().catch(console.error);
