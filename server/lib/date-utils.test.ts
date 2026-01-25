import { describe, it, expect } from "vitest";
import { calculateNextRenewalDate } from "./date-utils";
import { addMonths, subMonths, subWeeks } from "date-fns";

describe("calculateNextRenewalDate", () => {
    it("should return the same date if it is in the future", () => {
        const futureDate = addMonths(new Date(), 1);
        const result = calculateNextRenewalDate(futureDate, "monthly");
        expect(result.getTime()).toBe(futureDate.getTime());
    });

    it("should roll over a past monthly date correctly", () => {
        const pastDate = subMonths(new Date(), 1);
        const result = calculateNextRenewalDate(pastDate, "monthly");
        // Result should be roughly "today" or exactly one month after pastDate
        // depends on the day of the month.
        expect(result.getTime()).toBeGreaterThan(new Date().getTime() - 1000 * 60 * 60 * 24);
    });

    it("should handle multiple monthly rollovers", () => {
        const distantPast = subMonths(new Date(), 3);
        const result = calculateNextRenewalDate(distantPast, "monthly");
        expect(result.getTime()).toBeGreaterThanOrEqual(new Date().getTime() - 1000);
    });

    it("should roll over a past weekly date correctly", () => {
        const pastDate = subWeeks(new Date(), 1);
        const result = calculateNextRenewalDate(pastDate, "weekly");
        expect(result.getTime()).toBeGreaterThanOrEqual(new Date().getTime() - 1000);
    });

    it("should handle invalid cycles by returning the original date", () => {
        const pastDate = subMonths(new Date(), 1);
        const result = calculateNextRenewalDate(pastDate, "invalid");
        expect(result.getTime()).toBe(pastDate.getTime());
    });
});
