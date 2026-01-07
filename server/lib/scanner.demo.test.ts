
import { describe, it, expect } from "vitest";
import { analyzeEmail } from "./gmail-scanner";

// Demo suite to show the user the scanner working on "real" examples
describe("Scanner Demo Run", () => {

    console.log("\n--- STARTING SCANNER DEMO ---\n");

    it("DEMO: Detects Netflix (Known Tool + Price)", () => {
        const result = analyzeEmail(
            "Netflix <info@mailer.netflix.com>",
            "We have received payment",
            "Hi there, your monthly payment of $15.49 was successfully processed.",
            new Date()
        );

        console.log("1. Netflix Scan Result:");
        console.log(JSON.stringify(result, null, 2));

        expect(result).not.toBeNull();
        expect(result?.vendorName).toBe("Netflix");
        expect(result?.billingAmount).toBe(15.49);
        expect(result?.confidence).toBeGreaterThanOrEqual(80); // Known tool
    });

    it("DEMO: Detects Hulu (New Expanded List)", () => {
        const result = analyzeEmail(
            "Hulu <billing@hulu.com>",
            "Your Subscription Updated",
            "Thanks for staying with us. You were charged $7.99 for your plan.",
            new Date()
        );

        console.log("\n2. Hulu Scan Result (From Expanded List):");
        console.log(JSON.stringify(result, null, 2));

        expect(result?.vendorName).toBe("Hulu"); // Should be found in expanded list
        expect(result?.confidence).toBeGreaterThanOrEqual(80);
    });

    it("DEMO: Detects 'Invoice' from Unknown Tool", () => {
        const result = analyzeEmail(
            "billing@random-saas-tool.io",
            "Your Invoice #12345 is ready",
            "Total amount due: $29.00. Please pay by Friday.",
            new Date()
        );

        console.log("\n3. Generic Invoice Scan Result:");
        console.log(JSON.stringify(result, null, 2));

        expect(result).not.toBeNull();
        expect(result?.billingAmount).toBe(29.00);
        // Should have confidence from keywords (Inbox + $)
        expect(result?.confidence).toBeGreaterThanOrEqual(40);
    });

    it("DEMO: Filters out Amazon Delivery (False Positive)", () => {
        const result = analyzeEmail(
            "Amazon.com <shipment-tracking@amazon.com>",
            "Your order has shipped",
            "Hello, your package is out for delivery. Track it here.",
            new Date()
        );

        console.log("\n4. Amazon Delivery Scan Result:");
        console.log(result ? "FAILED: Should be filtered" : "SUCCESS: Filtered out null (Correctly ignored)");

        expect(result).toBeNull();
    });

    it("DEMO: Detects Yearly Plan with Euros", () => {
        const result = analyzeEmail(
            "Spotify <no-reply@spotify.com>",
            "Your Annual Receipt",
            "We charged €99.00 for your default yearly plan.",
            new Date()
        );

        console.log("\n5. Spotify Yearly Euro Result:");
        console.log(JSON.stringify(result, null, 2));

        expect(result?.currency).toBe("EUR");
        expect(result?.paymentPeriod).toBe("yearly");
        expect(result?.renewalDate).toBeDefined();
    });

    console.log("\n--- END DEMO ---\n");
});
