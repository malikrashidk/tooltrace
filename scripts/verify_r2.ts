import "dotenv/config";
import { uploadToR2, getR2DownloadUrl, deleteFromR2 } from "../server/lib/r2";

async function verifyR2() {
  console.log("ðŸš€ Starting R2 Verification...");

  const requiredVars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME"
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error("âŒ Missing environment variables:", missing.join(", "));
    process.exit(1);
  }

  const testFileName = `test-upload-${Date.now()}.txt`;
  const fileContent = Buffer.from("Hello, this is a test file from ToolTrace verification script.");

  try {
    // 1. Upload
    console.log(`\n1. Uploading ${testFileName}...`);
    const key = await uploadToR2(testFileName, fileContent, "text/plain");
    console.log("âœ… Upload successful. Key:", key);

    // 2. Generate URL
    console.log(`\n2. Generating Signed URL...`);
    const url = await getR2DownloadUrl(key);
    console.log("âœ… URL generated:", url);
    console.log("   (You can paste this URL in your browser to verify content)");

    // 3. Delete
    console.log(`\n3. Deleting file...`);
    await deleteFromR2(key);
    console.log("âœ… Deletion successful.");

    console.log("\nâœ¨ R2 Configuration is VALID!");
  } catch (error: any) {
    console.error("\nâŒ R2 Verification FAILED:");
    console.error(error.message);
    if (error.name === "InvalidAccessKeyId") {
      console.error("-> Check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
    } else if (error.name === "NoSuchBucket") {
      console.error(`-> Bucket '${process.env.R2_BUCKET_NAME}' does not exist.`);
    } else if (error.code === "ENOTFOUND") {
      console.error("-> Could not resolve endpoint. Check R2_ACCOUNT_ID.");
    }
    process.exit(1);
  }
}

verifyR2();
