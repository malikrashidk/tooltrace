
import { generateQRCode } from "../server/twoFactor";

async function testQRCode() {
  try {
    const { qrCode } = await generateQRCode("test@example.com", "SECRET123");
    console.log("QR Code generated successfully.");
    if (qrCode.startsWith("data:image/png;base64,")) {
        console.log("Format is correct (data URL).");
    } else {
        console.error("Format is incorrect:", qrCode.substring(0, 50));
    }
  } catch (error) {
    console.error("QR Code generation failed:", error);
  }
}

testQRCode();
